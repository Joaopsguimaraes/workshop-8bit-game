import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createEngine, type Event, type Engine } from "./engine";
import { createTestDatabase } from "./test-database";
import { createPrismaClient } from "./prisma";
import type { Challenge } from "../challenges/types";
import { CHALLENGES_SEED } from "../challenges/seed";

// Test catalog with two challenges, to test the rule that a challenge cannot be reopened.
const ALFA: Challenge = {
  id: "alfa",
  order: 1,
  title: "Trabalho remoto",
  scenario: "Cenário alfa.",
  keywords: [
    ["trabalho remoto", "home office"],
    ["vantagens", "prós"],
  ],
  referencePrompt: "Referência alfa.",
};

const BETA: Challenge = {
  id: "beta",
  order: 2,
  title: "E-mail de reunião",
  scenario: "Cenário beta.",
  keywords: [
    ["e-mail", "email"],
    ["reunião", "reuniao"],
  ],
  referencePrompt: "Referência beta.",
};

// Score 29 on challenge alfa: Role (15) and Task (14: a verb and a Keywords group, 70% of 20).
const PROMPT_ALFA = "Papel: você é um consultor de RH experiente. Liste as vantagens do trabalho remoto.";
// Score 14 on challenge beta: a verb and a Keywords group, 70% of the Task.
const PROMPT_BETA = "Escreva um e-mail sobre a reunião de alinhamento.";

let database: ReturnType<typeof createTestDatabase>;
let engine: ReturnType<typeof createEngine>;
let now: Date;

function advance(seconds: number) {
  now = new Date(now.getTime() + seconds * 1000);
}

beforeEach(() => {
  database = createTestDatabase();
  now = new Date("2026-10-13T12:00:00.000Z");
  engine = createEngine(database.prisma, { challenges: [ALFA, BETA], now: () => now });
});

afterEach(async () => {
  await database.close();
});

async function enterAs(nickname: string) {
  const result = await engine.enter(nickname);
  if (!result.ok) throw new Error(`expected successful enter: ${result.error}`);
  return result;
}

describe("enter", () => {
  it("creates the player with an avatar and returns the token", async () => {
    const result = await engine.enter("Élio");

    expect(result).toMatchObject({
      ok: true,
      player: { nickname: "Élio", initials: "EL" },
    });
    if (!result.ok) throw new Error("expected success");
    expect(result.token.length).toBeGreaterThanOrEqual(20);
  });

  it("rejects an invalid nickname with the rule's message", async () => {
    expect(await engine.enter("a")).toEqual({
      ok: false,
      error: "O Nickname precisa ter pelo menos 2 caracteres.",
    });
  });

  it("treats 'João' and 'JOAO' as the same nickname", async () => {
    await engine.enter("João");

    expect(await engine.enter("JOAO")).toEqual({ ok: false, error: "Nickname já em uso" });
  });

  it("does not let two players enter at the same time with the same nickname", async () => {
    const results = await Promise.all([engine.enter("Ana"), engine.enter("ANA")]);

    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results).toContainEqual({ ok: false, error: "Nickname já em uso" });
  });

  it("generates different tokens for different players", async () => {
    const a = await engine.enter("Ana");
    const b = await engine.enter("Bia");

    if (!a.ok || !b.ok) throw new Error("expected success");
    expect(a.token).not.toBe(b.token);
  });
});

describe("resume", () => {
  it("returns the same player by token", async () => {
    const entry = await enterAs("Ana");

    expect(await engine.resume(entry.token)).toEqual({
      ok: true,
      player: entry.player,
    });
  });

  it("rejects a token that does not exist", async () => {
    expect(await engine.resume("token-inventado")).toEqual({
      ok: false,
      error: "Sessão inválida. Entre novamente.",
    });
  });
});

describe("playerState", () => {
  it("with no open round, returns the player with no round and no attempts", async () => {
    const entry = await enterAs("Ana");

    expect(await engine.playerState(entry.token)).toEqual({
      ok: true,
      player: entry.player,
      round: null,
      attempts: [],
      attemptsLeft: 0,
      reveal: null,
      now: now.toISOString(),
    });
  });

  it("rejects an invalid token", async () => {
    expect(await engine.playerState("token-inventado")).toEqual({
      ok: false,
      error: "Sessão inválida. Entre novamente.",
    });
  });

  it("with an open round, shows the challenge, the deadline and the 3 attempts left", async () => {
    const ana = await enterAs("Ana");
    await engine.openRound("alfa", 600);

    expect(await engine.playerState(ana.token)).toMatchObject({
      ok: true,
      round: {
        challenge: { id: "alfa", title: "Trabalho remoto", scenario: "Cenário alfa." },
        deadline: new Date(now.getTime() + 600_000).toISOString(),
      },
      attempts: [],
      attemptsLeft: 3,
    });
  });

  it("shows only the player's own attempts, never another player's prompt", async () => {
    const ana = await enterAs("Ana");
    const bia = await enterAs("Bia");
    await engine.openRound("alfa");
    await engine.submitAttempt(ana.token, `${PROMPT_ALFA} SEGREDO-DA-ANA`);

    const biaState = await engine.playerState(bia.token);

    expect(JSON.stringify(biaState)).not.toContain("SEGREDO-DA-ANA");
    expect(biaState).toMatchObject({ attempts: [], attemptsLeft: 3 });
  });
});

describe("openRound", () => {
  it("opens the round with the chosen challenge and no deadline when there is no duration", async () => {
    const result = await engine.openRound("alfa");

    expect(result).toMatchObject({
      ok: true,
      round: { challenge: { id: "alfa" }, openedAt: now.toISOString(), deadline: null },
    });
  });

  it("computes the deadline from the duration in seconds", async () => {
    const result = await engine.openRound("alfa", 90);

    expect(result).toMatchObject({
      ok: true,
      round: { deadline: new Date(now.getTime() + 90_000).toISOString() },
    });
  });

  it("refuses to open another round while one is open", async () => {
    await engine.openRound("alfa");

    expect(await engine.openRound("beta")).toEqual({
      ok: false,
      error: "Já existe uma Rodada aberta. Encerre-a antes de abrir outra.",
    });
  });

  it("refuses a challenge that does not exist in the catalog", async () => {
    expect(await engine.openRound("nao-existe")).toEqual({
      ok: false,
      error: "Desafio não encontrado.",
    });
  });

  it("does not reopen a challenge already played in this room", async () => {
    await engine.openRound("alfa");
    await engine.closeRound();

    expect(await engine.openRound("alfa")).toEqual({
      ok: false,
      error: "Este Desafio já foi jogado nesta Sala.",
    });
  });

  it("refuses a duration that is not a positive whole number of seconds", async () => {
    expect(await engine.openRound("alfa", 0)).toEqual({
      ok: false,
      error: "A duração precisa ser de pelo menos 1 segundo.",
    });
    expect(await engine.openRound("alfa", 1.5)).toEqual({
      ok: false,
      error: "A duração precisa ser de pelo menos 1 segundo.",
    });
  });
});

describe("closeRound", () => {
  it("closes the open round and blocks new submissions", async () => {
    const ana = await enterAs("Ana");
    await engine.openRound("alfa");

    const result = await engine.closeRound();
    expect(result).toMatchObject({ ok: true, round: { closedAt: now.toISOString() } });
    expect(await engine.submitAttempt(ana.token, PROMPT_ALFA)).toEqual({
      ok: false,
      error: "A Rodada foi encerrada.",
    });
  });

  it("refuses to close when no round is open", async () => {
    expect(await engine.closeRound()).toEqual({
      ok: false,
      error: "Não há Rodada aberta.",
    });
  });
});

describe("checkDeadline", () => {
  it("closes the round when the deadline has passed", async () => {
    await engine.openRound("alfa", 60);
    advance(61);

    expect(await engine.checkDeadline(now)).toEqual({ closed: true });
    expect(await engine.facilitatorState()).toMatchObject({ round: null });
  });

  it("does not close the round before the deadline", async () => {
    await engine.openRound("alfa", 60);
    advance(59);

    expect(await engine.checkDeadline(now)).toEqual({ closed: false });
    expect(await engine.facilitatorState()).toMatchObject({ round: { challenge: { id: "alfa" } } });
  });

  it("never closes a round without a deadline", async () => {
    await engine.openRound("alfa");
    advance(60 * 60 * 24);

    expect(await engine.checkDeadline(now)).toEqual({ closed: false });
  });
});

describe("submitAttempt", () => {
  it("returns the attempt with the score and the evaluation of the prompt", async () => {
    const ana = await enterAs("Ana");
    await engine.openRound("alfa");

    const result = await engine.submitAttempt(ana.token, PROMPT_ALFA);

    expect(result).toMatchObject({
      ok: true,
      attempt: { number: 1, prompt: PROMPT_ALFA, score: 29 },
      attemptsLeft: 2,
    });
    if (!result.ok) throw new Error("expected success");
    expect(result.attempt.evaluation.criteria.map((c) => c.id)).toEqual([
      "role",
      "context",
      "task",
      "format",
      "constraints",
      "examples",
    ]);
  });

  it("refuses without an open round", async () => {
    const ana = await enterAs("Ana");

    expect(await engine.submitAttempt(ana.token, PROMPT_ALFA)).toEqual({
      ok: false,
      error: "Nenhuma Rodada aberta no momento.",
    });
  });

  it("refuses an empty prompt or one with only spaces", async () => {
    const ana = await enterAs("Ana");
    await engine.openRound("alfa");

    expect(await engine.submitAttempt(ana.token, "   \n  ")).toEqual({
      ok: false,
      error: "Escreva um prompt antes de enviar.",
    });
  });

  it("refuses a prompt over 4,000 characters and accepts exactly 4,000", async () => {
    const ana = await enterAs("Ana");
    await engine.openRound("alfa");

    expect(await engine.submitAttempt(ana.token, "a".repeat(4001))).toEqual({
      ok: false,
      error: "O prompt pode ter no máximo 4.000 caracteres.",
    });
    expect(await engine.submitAttempt(ana.token, "a".repeat(4000))).toMatchObject({ ok: true });
  });

  it("refuses the player's 4th attempt in the same round", async () => {
    const ana = await enterAs("Ana");
    await engine.openRound("alfa");
    for (let i = 0; i < 3; i++) {
      expect(await engine.submitAttempt(ana.token, PROMPT_ALFA)).toMatchObject({ ok: true });
    }

    expect(await engine.submitAttempt(ana.token, PROMPT_ALFA)).toEqual({
      ok: false,
      error: "Você já usou as 3 Tentativas desta Rodada.",
    });
  });

  it("does not let more than 3 attempts through even with simultaneous submissions", async () => {
    const ana = await enterAs("Ana");
    await engine.openRound("alfa");

    const results = await Promise.all(
      Array.from({ length: 5 }, () => engine.submitAttempt(ana.token, PROMPT_ALFA)),
    );

    expect(results.filter((r) => r.ok)).toHaveLength(3);
    expect(await engine.playerState(ana.token)).toMatchObject({ attemptsLeft: 0 });
  });

  it("refuses an invalid prompt without consuming an attempt", async () => {
    const ana = await enterAs("Ana");
    await engine.openRound("alfa");

    await engine.submitAttempt(ana.token, "   ");
    await engine.submitAttempt(ana.token, "a".repeat(4001));

    expect(await engine.playerState(ana.token)).toMatchObject({ attemptsLeft: 3 });
  });

  it("each player has their own 3 attempts in the round", async () => {
    const ana = await enterAs("Ana");
    const bia = await enterAs("Bia");
    await engine.openRound("alfa");
    for (let i = 0; i < 3; i++) await engine.submitAttempt(ana.token, PROMPT_ALFA);

    expect(await engine.submitAttempt(bia.token, PROMPT_ALFA)).toMatchObject({
      ok: true,
      attempt: { number: 1 },
    });
  });

  it("an expired deadline closes the round and refuses the submission", async () => {
    const ana = await enterAs("Ana");
    await engine.openRound("alfa", 60);
    advance(61);

    expect(await engine.submitAttempt(ana.token, PROMPT_ALFA)).toEqual({
      ok: false,
      error: "A Rodada foi encerrada.",
    });
    expect(await engine.facilitatorState()).toMatchObject({ round: null });
  });
});

describe("scoreboard", () => {
  it("lists all players, with avatar and nickname", async () => {
    await engine.enter("Zoe");
    await engine.enter("Ana Maria");

    expect(await engine.scoreboard()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ nickname: "Zoe", initials: "ZO" }),
        expect.objectContaining({ nickname: "Ana Maria", initials: "AN" }),
      ]),
    );
    expect(await engine.scoreboard()).toHaveLength(2);
  });

  it("does not expose the players' tokens", async () => {
    await engine.enter("Zoe");

    const [entry] = await engine.scoreboard();
    expect(entry).not.toHaveProperty("token");
  });

  it("counts only the player's best attempt in each round", async () => {
    const ana = await enterAs("Ana");
    await engine.openRound("alfa");
    await engine.submitAttempt(ana.token, "Liste as vantagens do trabalho remoto.");
    await engine.submitAttempt(ana.token, "oi");
    await engine.submitAttempt(ana.token, PROMPT_ALFA);
    await engine.closeRound();

    expect(await engine.scoreboard()).toEqual([
      expect.objectContaining({ nickname: "Ana", points: 29 }),
    ]);
  });

  it("sums the best score of each round and sorts by total", async () => {
    const ana = await enterAs("Ana");
    const bia = await enterAs("Bia");
    await engine.openRound("alfa");
    await engine.submitAttempt(ana.token, PROMPT_ALFA);
    await engine.submitAttempt(bia.token, "oi");
    await engine.closeRound();
    await engine.openRound("beta");
    await engine.submitAttempt(bia.token, PROMPT_BETA);
    await engine.closeRound();

    const scoreboard = await engine.scoreboard();
    expect(scoreboard.map((j) => [j.nickname, j.points])).toEqual([
      ["Ana", 29],
      ["Bia", 14],
    ]);
  });

  it("never carries prompt text, even with attempts submitted", async () => {
    const ana = await enterAs("Ana");
    await engine.openRound("alfa");
    await engine.submitAttempt(ana.token, `${PROMPT_ALFA} SEGREDO-DO-PLACAR`);

    expect(JSON.stringify(await engine.scoreboard())).not.toContain("SEGREDO-DO-PLACAR");
  });
});

describe("facilitatorState", () => {
  it("marks the challenges already played and counts how many players sent", async () => {
    const ana = await enterAs("Ana");
    const bia = await enterAs("Bia");
    await engine.openRound("alfa");
    await engine.submitAttempt(ana.token, PROMPT_ALFA);
    await engine.submitAttempt(ana.token, PROMPT_ALFA);
    await engine.submitAttempt(bia.token, PROMPT_ALFA);

    // A challenge with an open round already counts as played: it cannot be reopened.
    expect(await engine.facilitatorState()).toMatchObject({
      challenges: [
        { id: "alfa", played: true },
        { id: "beta", played: false },
      ],
      round: { challenge: { id: "alfa" } },
      sent: 2,
    });

    await engine.closeRound();
    expect(await engine.facilitatorState()).toMatchObject({
      challenges: [
        { id: "alfa", played: true },
        { id: "beta", played: false },
      ],
      round: null,
    });
  });
});

describe("restart", () => {
  it("keeps the open round, the deadline and the attempts after restarting the engine", async () => {
    const ana = await enterAs("Ana");
    await engine.openRound("alfa", 600);
    await engine.submitAttempt(ana.token, PROMPT_ALFA);

    const freshPrisma = createPrismaClient(database.url);
    try {
      const restarted = createEngine(freshPrisma, { challenges: [ALFA, BETA], now: () => now });

      expect(await restarted.playerState(ana.token)).toMatchObject({
        round: { deadline: new Date(now.getTime() + 600_000).toISOString() },
        attempts: [{ number: 1, score: 29 }],
        attemptsLeft: 2,
      });
    } finally {
      await freshPrisma.$disconnect();
    }
  });
});

describe("removePlayer", () => {
  it("frees the nickname for another player to enter", async () => {
    const ana = await enterAs("Ana");
    expect(await engine.removePlayer(ana.player.id)).toEqual({ ok: true });

    expect(await engine.enter("ANA")).toMatchObject({ ok: true, player: { nickname: "ANA" } });
  });

  it("removes the player from the scoreboard and the round counts, without touching the others", async () => {
    const ana = await enterAs("Ana");
    const bia = await enterAs("Bia");
    await engine.openRound("alfa");
    await engine.submitAttempt(ana.token, PROMPT_ALFA);
    await engine.submitAttempt(bia.token, PROMPT_ALFA);

    await engine.removePlayer(ana.player.id);

    expect((await engine.scoreboard()).map((player) => player.nickname)).toEqual(["Bia"]);
    expect(await engine.facilitatorState()).toMatchObject({ sent: 1 });
    expect(await entryOf(engine, "Bia")).toMatchObject({ points: 29, attemptsInRound: 1 });
  });

  it("the token of the removed player stops working", async () => {
    const ana = await enterAs("Ana");
    await engine.openRound("alfa");
    await engine.removePlayer(ana.player.id);

    expect(await engine.resume(ana.token)).toEqual({
      ok: false,
      error: "Sessão inválida. Entre novamente.",
    });
    expect(await engine.submitAttempt(ana.token, PROMPT_ALFA)).toEqual({
      ok: false,
      error: "Sessão inválida. Entre novamente.",
    });
  });

  it("refuses to remove a player who does not exist", async () => {
    expect(await engine.removePlayer("nao-existe")).toEqual({
      ok: false,
      error: "Jogador não encontrado.",
    });
  });

  it("notifies the feed with the avatar and nickname of who left, without internal data", async () => {
    const received: Event[] = [];
    engine.subscribe((event) => received.push(event));
    const ana = await enterAs("Ana");

    await engine.removePlayer(ana.player.id);

    expect(received).toContainEqual({
      type: "player-removed",
      player: { nickname: "Ana", initials: "AN" },
    });
    expect(JSON.stringify(received)).not.toContain(ana.token);
  });
});

describe("resetMatch", () => {
  it("deletes players, rounds, attempts and achievements: the state goes back to the initial one", async () => {
    const ana = await enterAs("Ana");
    await engine.openRound("alfa", 600);
    await engine.submitAttempt(ana.token, PROMPT_ALFA);
    await engine.closeRound();

    expect(await engine.resetMatch()).toEqual({ ok: true });

    expect(await engine.scoreboard()).toEqual([]);
    expect(await engine.facilitatorState()).toMatchObject({
      challenges: [
        { id: "alfa", played: false },
        { id: "beta", played: false },
      ],
      round: null,
      sent: 0,
      players: [],
      reveal: null,
    });
  });

  it("the old token stops working and the nickname can be used again", async () => {
    const ana = await enterAs("Ana");
    await engine.resetMatch();

    expect(await engine.resume(ana.token)).toEqual({
      ok: false,
      error: "Sessão inválida. Entre novamente.",
    });
    expect(await engine.enter("Ana")).toMatchObject({ ok: true, player: { nickname: "Ana" } });
  });

  it("all challenges become playable again", async () => {
    await engine.openRound("alfa");
    await engine.closeRound();
    await engine.openRound("beta");
    await engine.closeRound();

    await engine.resetMatch();

    expect(await engine.openRound("alfa")).toMatchObject({ ok: true });
    expect(await engine.closeRound()).toMatchObject({ ok: true });
    expect(await engine.openRound("beta")).toMatchObject({ ok: true });
  });

  it("closes the open round together with the rest", async () => {
    await engine.openRound("alfa");

    await engine.resetMatch();

    expect(await engine.closeRound()).toEqual({ ok: false, error: "Não há Rodada aberta." });
  });

  it("notifies the feed that the match was reset", async () => {
    const received: Event[] = [];
    engine.subscribe((event) => received.push(event));

    await engine.resetMatch();

    expect(received).toContainEqual({ type: "match-reset" });
  });
});

describe("facilitatorState: players and reveal", () => {
  it("lists the players with id, for the remove button", async () => {
    const ana = await enterAs("Ana");
    const bia = await enterAs("Bia");

    expect((await engine.facilitatorState()).players).toEqual([
      { id: ana.player.id, nickname: "Ana", initials: "AN" },
      { id: bia.player.id, nickname: "Bia", initials: "BI" },
    ]);
  });

  it("shows the reveal of the last closed round, and nothing while another one is open", async () => {
    const ana = await enterAs("Ana");
    await engine.openRound("alfa");
    await engine.submitAttempt(ana.token, PROMPT_ALFA);
    await engine.closeRound();

    expect(await engine.facilitatorState()).toMatchObject({
      reveal: {
        challenge: { title: ALFA.title, referencePrompt: ALFA.referencePrompt },
        top3: [{ nickname: "Ana", score: 29, prompt: PROMPT_ALFA }],
      },
    });

    await engine.openRound("beta");
    expect((await engine.facilitatorState()).reveal).toBeNull();
  });

  it("informs the server time, for the Big Screen timer", async () => {
    expect(await engine.facilitatorState()).toMatchObject({
      now: now.toISOString(),
    });
  });
});

// Reads the scoreboard as the player's screen does; the tests do not look at tables.
async function entryOf(e: Engine, nickname: string) {
  const entry = (await e.scoreboard()).find((player) => player.nickname === nickname);
  if (!entry) throw new Error(`${nickname} is not on the scoreboard`);
  return entry;
}

async function typesOf(e: Engine, nickname: string) {
  return (await entryOf(e, nickname)).achievements.map((achievement) => achievement.type).sort();
}

async function enterIn(e: Engine, nickname: string) {
  const result = await e.enter(nickname);
  if (!result.ok) throw new Error(`expected successful enter: ${result.error}`);
  return result;
}

describe("scoreboard: tie-break and status", () => {
  it("tied points: whoever used fewer attempts in the rounds they scored in is ahead", async () => {
    const bia = await enterAs("Bia");
    const ana = await enterAs("Ana");
    await engine.openRound("alfa");
    await engine.submitAttempt(bia.token, "oi");
    await engine.submitAttempt(bia.token, PROMPT_ALFA);
    advance(5);
    await engine.submitAttempt(ana.token, PROMPT_ALFA);
    await engine.closeRound();

    expect((await engine.scoreboard()).map((j) => j.nickname)).toEqual(["Ana", "Bia"]);
  });

  it("attempts from rounds without points do not count in the tie-break", async () => {
    const bia = await enterAs("Bia");
    const ana = await enterAs("Ana");
    await engine.openRound("alfa");
    await engine.submitAttempt(bia.token, "oi");
    await engine.submitAttempt(bia.token, PROMPT_ALFA);
    advance(5);
    await engine.submitAttempt(ana.token, PROMPT_ALFA);
    await engine.closeRound();
    await engine.openRound("beta");
    await engine.submitAttempt(ana.token, "oi");
    await engine.submitAttempt(ana.token, "oi");
    await engine.submitAttempt(ana.token, "oi");
    await engine.closeRound();

    // Ana: 29 with 1 attempt in the round that scored (the 3 in beta do not count).
    // Bia: 29 with 2 attempts. Without the rule, Bia would be ahead with 2 against 4.
    expect((await engine.scoreboard()).map((j) => j.nickname)).toEqual(["Ana", "Bia"]);
  });

  it("with the same points and the same number of attempts, whoever reached the points first wins", async () => {
    // Bia entered the room first, so the creation order must not decide the tie.
    const bia = await enterAs("Bia");
    const ana = await enterAs("Ana");
    await engine.openRound("alfa");
    await engine.submitAttempt(ana.token, PROMPT_ALFA);
    advance(5);
    await engine.submitAttempt(bia.token, PROMPT_ALFA);
    await engine.closeRound();

    expect((await engine.scoreboard()).map((j) => j.nickname)).toEqual(["Ana", "Bia"]);
  });

  it("shows position, whether the player sent in the current round and how many attempts were used in it", async () => {
    const ana = await enterAs("Ana");
    const bia = await enterAs("Bia");
    await engine.openRound("alfa");
    await engine.submitAttempt(ana.token, PROMPT_ALFA);
    await engine.submitAttempt(bia.token, "oi");

    expect(await entryOf(engine, "Ana")).toMatchObject({
      position: 1,
      points: 29,
      sentInRound: true,
      attemptsInRound: 1,
    });
    expect(await entryOf(engine, "Bia")).toMatchObject({
      position: 2,
      points: 0,
      sentInRound: true,
      attemptsInRound: 1,
    });
  });
});

describe("achievements", () => {
  // Engine with the real seed, so the reference prompts really score 100.
  let seed: Engine;
  const REMOTE = "trabalho-remoto";
  const ALIGNMENT = "reuniao-alinhamento";
  const REF_REMOTE = CHALLENGES_SEED[0].referencePrompt;
  const REF_ALIGNMENT = CHALLENGES_SEED[1].referencePrompt;
  // Same reference prompt without the last criterion (Examples): score 90.
  const REF_REMOTE_SCORE_90 = REF_REMOTE.split("\n").slice(0, -1).join("\n");

  beforeEach(() => {
    seed = createEngine(database.prisma, { challenges: CHALLENGES_SEED, now: () => now });
  });

  it("Bullseye: awarded to whoever scores 100", async () => {
    const ana = await enterIn(seed, "Ana");
    await seed.openRound(REMOTE);
    await seed.submitAttempt(ana.token, REF_REMOTE);

    expect(await typesOf(seed, "Ana")).toEqual(["bullseye", "first-blood", "first-try"]);
  });

  it("Bullseye is not awarded with score 90", async () => {
    const ana = await enterIn(seed, "Ana");
    await seed.openRound(REMOTE);
    await seed.submitAttempt(ana.token, REF_REMOTE_SCORE_90);

    expect(await typesOf(seed, "Ana")).toEqual(["first-blood"]);
  });

  it("First try only counts when the 100 comes on the 1st attempt", async () => {
    const ana = await enterIn(seed, "Ana");
    await seed.openRound(REMOTE);
    await seed.submitAttempt(ana.token, "oi");
    await seed.submitAttempt(ana.token, REF_REMOTE);

    expect(await typesOf(seed, "Ana")).toEqual(["bullseye", "evolution", "first-blood"]);
  });

  it("First blood goes only to the first accepted attempt of the round", async () => {
    const ana = await enterIn(seed, "Ana");
    const bia = await enterIn(seed, "Bia");
    await seed.openRound(REMOTE);
    await seed.submitAttempt(ana.token, "oi");
    await seed.submitAttempt(bia.token, "oi");

    expect(await typesOf(seed, "Ana")).toContain("first-blood");
    expect(await typesOf(seed, "Bia")).not.toContain("first-blood");
  });

  it("First blood is not given to a refused submission", async () => {
    const ana = await enterIn(seed, "Ana");
    const bia = await enterIn(seed, "Bia");
    await seed.openRound(REMOTE);
    expect((await seed.submitAttempt(ana.token, "   ")).ok).toBe(false);
    await seed.submitAttempt(bia.token, "oi");

    expect(await typesOf(seed, "Bia")).toContain("first-blood");
    expect(await typesOf(seed, "Ana")).not.toContain("first-blood");
  });

  it("Evolution: the later attempt must beat the first one by 30 points", async () => {
    const ana = await enterIn(seed, "Ana");
    await seed.openRound(REMOTE);
    await seed.submitAttempt(ana.token, "oi");
    await seed.submitAttempt(ana.token, REF_REMOTE);

    expect(await typesOf(seed, "Ana")).toContain("evolution");
  });

  it("Evolution is not awarded when the improvement is below 30 points", async () => {
    const ana = await enterIn(seed, "Ana");
    await seed.openRound(REMOTE);
    await seed.submitAttempt(ana.token, REF_REMOTE_SCORE_90);
    await seed.submitAttempt(ana.token, REF_REMOTE);

    expect(await typesOf(seed, "Ana")).not.toContain("evolution");
  });

  it("each achievement is worth at most once per player per round", async () => {
    const ana = await enterIn(seed, "Ana");
    await seed.openRound(REMOTE);
    await seed.submitAttempt(ana.token, "oi");
    await seed.submitAttempt(ana.token, REF_REMOTE);
    await seed.submitAttempt(ana.token, REF_REMOTE);

    const types = await typesOf(seed, "Ana");
    expect(types.filter((type) => type === "bullseye")).toHaveLength(1);
    expect(types.filter((type) => type === "evolution")).toHaveLength(1);
  });

  it("the same achievement can be earned again in another round", async () => {
    const ana = await enterIn(seed, "Ana");
    await seed.openRound(REMOTE);
    await seed.submitAttempt(ana.token, REF_REMOTE);
    await seed.closeRound();
    await seed.openRound(ALIGNMENT);
    await seed.submitAttempt(ana.token, REF_ALIGNMENT);

    expect((await typesOf(seed, "Ana")).filter((type) => type === "bullseye")).toHaveLength(2);
  });

  it("Round champion goes to 1st place when the round closes", async () => {
    const ana = await enterIn(seed, "Ana");
    const bia = await enterIn(seed, "Bia");
    await seed.openRound(REMOTE);
    await seed.submitAttempt(ana.token, REF_REMOTE);
    await seed.submitAttempt(bia.token, REF_REMOTE_SCORE_90);
    await seed.closeRound();

    expect(await typesOf(seed, "Ana")).toContain("round-champion");
    expect(await typesOf(seed, "Bia")).not.toContain("round-champion");
  });

  it("Round champion uses the same tie-break: same score, fewer attempts", async () => {
    const ana = await enterIn(seed, "Ana");
    const bia = await enterIn(seed, "Bia");
    await seed.openRound(REMOTE);
    await seed.submitAttempt(ana.token, REF_REMOTE_SCORE_90);
    advance(5);
    await seed.submitAttempt(bia.token, "oi");
    await seed.submitAttempt(bia.token, REF_REMOTE_SCORE_90);
    await seed.closeRound();

    expect(await typesOf(seed, "Ana")).toContain("round-champion");
    expect(await typesOf(seed, "Bia")).not.toContain("round-champion");
  });

  it("Round champion is not awarded when the best score of the round is zero", async () => {
    const ana = await enterIn(seed, "Ana");
    const bia = await enterIn(seed, "Bia");
    await seed.openRound(REMOTE);
    await seed.submitAttempt(ana.token, "oi");
    await seed.submitAttempt(bia.token, "oi");
    await seed.closeRound();

    expect(await typesOf(seed, "Ana")).not.toContain("round-champion");
    expect(await typesOf(seed, "Bia")).not.toContain("round-champion");
  });

  it("Round champion is also awarded when the deadline expires", async () => {
    const ana = await enterIn(seed, "Ana");
    await seed.openRound(REMOTE, 60);
    await seed.submitAttempt(ana.token, REF_REMOTE);
    advance(61);
    await seed.checkDeadline(now);

    expect(await typesOf(seed, "Ana")).toContain("round-champion");
  });
});

describe("events", () => {
  let seed: Engine;
  let received: Event[];
  const REMOTE = "trabalho-remoto";
  const REF_REMOTE = CHALLENGES_SEED[0].referencePrompt;

  beforeEach(() => {
    seed = createEngine(database.prisma, { challenges: CHALLENGES_SEED, now: () => now });
    received = [];
    seed.subscribe((event) => received.push(event));
  });

  it("notifies when a player enters", async () => {
    await seed.enter("Ana Maria");

    expect(received).toContainEqual({
      type: "player-joined",
      player: { nickname: "Ana Maria", initials: "AN" },
    });
  });

  it("notifies when the round opens and when it closes, with the challenge title", async () => {
    await seed.openRound(REMOTE);
    await seed.closeRound();

    expect(received).toContainEqual({
      type: "round-opened",
      title: CHALLENGES_SEED[0].title,
    });
    expect(received).toContainEqual(
      expect.objectContaining({ type: "round-closed", title: CHALLENGES_SEED[0].title }),
    );
  });

  it("notifies the submission with the attempt number, without the prompt text", async () => {
    const ana = await enterIn(seed, "Ana");
    await seed.openRound(REMOTE);
    await seed.submitAttempt(ana.token, `oi SEGREDO-DA-ANA`);

    expect(received).toContainEqual({
      type: "attempt-submitted",
      player: { nickname: "Ana", initials: "AN" },
      number: 1,
    });
    expect(JSON.stringify(received)).not.toContain("SEGREDO-DA-ANA");
  });

  it("notifies when an attempt scores 100 and when an achievement is earned", async () => {
    const ana = await enterIn(seed, "Ana");
    await seed.openRound(REMOTE);
    await seed.submitAttempt(ana.token, REF_REMOTE);

    expect(received).toContainEqual(
      expect.objectContaining({ type: "max-score", number: 1 }),
    );
    expect(received).toContainEqual({
      type: "achievement-earned",
      player: { nickname: "Ana", initials: "AN" },
      achievement: "bullseye",
    });
  });

  it("before the reveal, no event nor snapshot of a player carries another player's prompt", async () => {
    const ana = await enterIn(seed, "Ana");
    const bia = await enterIn(seed, "Bia");
    await seed.openRound(REMOTE);
    await seed.submitAttempt(bia.token, `${REF_REMOTE} SEGREDO-DA-BIA`);
    await seed.submitAttempt(ana.token, "oi");

    expect(JSON.stringify(received)).not.toContain("SEGREDO-DA-BIA");
    expect(JSON.stringify(await seed.playerState(ana.token))).not.toContain("SEGREDO-DA-BIA");
    expect(JSON.stringify(await seed.scoreboard())).not.toContain("SEGREDO-DA-BIA");
  });

  it("on close, the reveal event carries the reference prompt and the top 3", async () => {
    const ana = await enterIn(seed, "Ana");
    await seed.openRound(REMOTE);
    await seed.submitAttempt(ana.token, REF_REMOTE);
    await seed.closeRound();

    expect(received).toContainEqual(
      expect.objectContaining({
        type: "round-closed",
        reveal: expect.objectContaining({
          challenge: expect.objectContaining({ referencePrompt: REF_REMOTE }),
          top3: [expect.objectContaining({ nickname: "Ana", score: 100, prompt: REF_REMOTE })],
        }),
      }),
    );
  });
});

describe("reveal", () => {
  let seed: Engine;
  const REMOTE = "trabalho-remoto";
  const ALIGNMENT = "reuniao-alinhamento";
  const REF_REMOTE = CHALLENGES_SEED[0].referencePrompt;
  const REF_REMOTE_SCORE_90 = REF_REMOTE.split("\n").slice(0, -1).join("\n");

  beforeEach(() => {
    seed = createEngine(database.prisma, { challenges: CHALLENGES_SEED, now: () => now });
  });

  it("without a closed round, there is no reveal", async () => {
    const ana = await enterIn(seed, "Ana");
    await seed.openRound(REMOTE);

    expect(await seed.playerState(ana.token)).toMatchObject({ ok: true, reveal: null });
  });

  it("after closing, carries the reference prompt and the top 3 with avatar, nickname, score and prompt", async () => {
    const ana = await enterIn(seed, "Ana");
    const bia = await enterIn(seed, "Bia");
    const cy = await enterIn(seed, "Cy");
    await seed.openRound(REMOTE);
    await seed.submitAttempt(ana.token, REF_REMOTE);
    await seed.submitAttempt(bia.token, REF_REMOTE_SCORE_90);
    await seed.submitAttempt(cy.token, "oi");
    await seed.closeRound();

    const state = await seed.playerState(ana.token);
    expect(state).toMatchObject({
      ok: true,
      reveal: {
        challenge: { title: CHALLENGES_SEED[0].title, referencePrompt: REF_REMOTE },
        top3: [
          { position: 1, nickname: "Ana", initials: "AN", score: 100, prompt: REF_REMOTE },
          { position: 2, nickname: "Bia", initials: "BI", score: 90, prompt: REF_REMOTE_SCORE_90 },
        ],
      },
    });
  });

  it("stays visible until the Facilitator opens the next round", async () => {
    const ana = await enterIn(seed, "Ana");
    await seed.openRound(REMOTE);
    await seed.submitAttempt(ana.token, REF_REMOTE);
    await seed.closeRound();
    advance(600);

    expect(await seed.playerState(ana.token)).toMatchObject({
      reveal: { top3: [expect.anything()] },
    });

    await seed.openRound(ALIGNMENT);
    expect(await seed.playerState(ana.token)).toMatchObject({ reveal: null });
  });
});
