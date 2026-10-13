import { randomBytes } from "node:crypto";
import { evaluate, type Evaluation } from "../evaluator/evaluator";
import { CHALLENGES, findChallenge } from "../challenges/catalog";
import type { Challenge } from "../challenges/types";
import { ATTEMPT_LIMIT, CHARACTER_LIMIT } from "../limits";
import { validateNickname } from "../nickname";
import type { PrismaClient } from "../../generated/prisma/client";
import { achievementsForAttempt, type AchievementType } from "./achievements";
import {
  groupByPlayer,
  compareMarks,
  scoreboardMark,
  roundRanking,
  type AttemptRecord,
  type RoundRanking,
} from "./scoring";

// Only door to change the Room state. Receives commands and returns results.
export type Player = { id: string; nickname: string; initials: string };

// Player data everyone can see in the feed: no id and no token.
export type PublicPlayer = { nickname: string; initials: string };

export type PublicAchievement = { type: AchievementType; roundId: string };

export type RevealEntry = {
  position: number;
  nickname: string;
  initials: string;
  score: number;
  prompt: string;
};

export type Reveal = {
  challenge: { title: string; referencePrompt: string };
  top3: RevealEntry[];
};

// Match facts for the live feed. No event carries prompt text.
export type Event =
  | { type: "player-joined"; player: PublicPlayer }
  | { type: "round-opened"; title: string }
  | { type: "attempt-submitted"; player: PublicPlayer; number: number }
  | { type: "max-score"; player: PublicPlayer; number: number }
  | { type: "achievement-earned"; player: PublicPlayer; achievement: AchievementType }
  | { type: "round-closed"; title: string; reveal: Reveal }
  | { type: "player-removed"; player: PublicPlayer }
  | { type: "match-reset" };

export type EnterResult = { ok: true; token: string; player: Player } | { ok: false; error: string };

export type ResumeResult = { ok: true; player: Player } | { ok: false; error: string };

export type ChallengeSummary = Pick<Challenge, "id" | "order" | "title" | "scenario">;

export type PublicRound = {
  id: string;
  challenge: ChallengeSummary;
  openedAt: string;
  deadline: string | null;
  closedAt: string | null;
};

export type PublicAttempt = {
  number: number;
  prompt: string;
  score: number;
  evaluation: Evaluation;
  createdAt: string;
};

export type PlayerState =
  | {
      ok: true;
      player: Player;
      round: PublicRound | null;
      attempts: PublicAttempt[];
      attemptsLeft: number;
      // Reveal of the last closed round; disappears when the Facilitator opens the next one.
      reveal: Reveal | null;
      now: string;
    }
  | { ok: false; error: string };

export type ScoreboardEntry = Player & {
  position: number;
  points: number;
  sentInRound: boolean;
  attemptsInRound: number;
  achievements: PublicAchievement[];
};

export type AttemptResult =
  | { ok: true; attempt: PublicAttempt; attemptsLeft: number }
  | { ok: false; error: string };

const SESSION_INVALID = "Sessão inválida. Entre novamente.";
const NICKNAME_IN_USE = "Nickname já em uso";

type Options = { challenges?: Challenge[]; now?: () => Date };

type RoundRow = {
  id: string;
  challengeId: string;
  openedAt: Date;
  deadline: Date | null;
  closedAt: Date | null;
};

type AttemptRow = {
  number: number;
  prompt: string;
  score: number;
  evaluation: string;
  createdAt: Date;
};

// Attempt with the name of who sent it, to build the round's rankings and reveal.
type AttemptOfRound = AttemptRecord & {
  prompt: string;
  player: { nickname: string; initials: string };
};

function toPlayer(row: { id: string; nickname: string; initials: string }): Player {
  return { id: row.id, nickname: row.nickname, initials: row.initials };
}

function toPublicPlayer(row: { nickname: string; initials: string }): PublicPlayer {
  return { nickname: row.nickname, initials: row.initials };
}

function summarize(challenge: Challenge): ChallengeSummary {
  return {
    id: challenge.id,
    order: challenge.order,
    title: challenge.title,
    scenario: challenge.scenario,
  };
}

export function createEngine(prisma: PrismaClient, options: Options = {}) {
  const challenges = options.challenges ?? CHALLENGES;
  const clock = options.now ?? (() => new Date());
  const listeners = new Set<(event: Event) => void>();

  function emit(event: Event) {
    for (const listener of listeners) listener(event);
  }

  // State-changing commands run one at a time, so the invariants hold even with
  // simultaneous submissions (e.g. 5 quick clicks on a single attempt).
  let queue: Promise<unknown> = Promise.resolve();
  function exclusive<T>(task: () => Promise<T>): Promise<T> {
    const run = queue.then(task);
    queue = run.catch(() => undefined);
    return run;
  }

  async function findByToken(token: string) {
    return prisma.player.findUnique({ where: { token } });
  }

  async function findOpenRound(): Promise<RoundRow | null> {
    return prisma.round.findFirst({
      where: { closedAt: null },
      orderBy: { openedAt: "desc" },
    });
  }

  async function latestRound(): Promise<RoundRow | null> {
    return prisma.round.findFirst({ orderBy: { openedAt: "desc" } });
  }

  function challengeOfRound(round: RoundRow): Challenge {
    const challenge = findChallenge(round.challengeId, challenges);
    if (!challenge) throw new Error(`Desafio ${round.challengeId} não está no catálogo`);
    return challenge;
  }

  function toPublicRound(round: RoundRow): PublicRound {
    return {
      id: round.id,
      challenge: summarize(challengeOfRound(round)),
      openedAt: round.openedAt.toISOString(),
      deadline: round.deadline?.toISOString() ?? null,
      closedAt: round.closedAt?.toISOString() ?? null,
    };
  }

  function toPublicAttempt(attempt: AttemptRow): PublicAttempt {
    return {
      number: attempt.number,
      prompt: attempt.prompt,
      score: attempt.score,
      evaluation: JSON.parse(attempt.evaluation) as Evaluation,
      createdAt: attempt.createdAt.toISOString(),
    };
  }

  async function attemptsOfRound(roundId: string): Promise<AttemptOfRound[]> {
    return prisma.attempt.findMany({
      where: { roundId },
      select: {
        id: true,
        playerId: true,
        roundId: true,
        number: true,
        score: true,
        createdAt: true,
        prompt: true,
        player: { select: { nickname: true, initials: true } },
      },
    });
  }

  // Reveal: the challenge's reference prompt and the three best attempts with a score above zero.
  function buildReveal(round: RoundRow, rankings: RoundRanking<AttemptOfRound>[]): Reveal {
    const challenge = challengeOfRound(round);
    return {
      challenge: { title: challenge.title, referencePrompt: challenge.referencePrompt },
      top3: rankings.slice(0, 3).map((ranking, index) => ({
        position: index + 1,
        nickname: ranking.best.player.nickname,
        initials: ranking.best.player.initials,
        score: ranking.best.score,
        prompt: ranking.best.prompt,
      })),
    };
  }

  // Grants only the achievements the player does not have yet in this round, and emits each one.
  async function grant(
    player: PublicPlayer & { id: string },
    roundId: string,
    types: AchievementType[],
    instant: Date,
  ) {
    const already = await prisma.achievement.findMany({
      where: { playerId: player.id, roundId },
      select: { type: true },
    });
    const owned = new Set(already.map((achievement) => achievement.type));

    for (const type of types) {
      if (owned.has(type)) continue;
      await prisma.achievement.create({
        data: { playerId: player.id, roundId, type, createdAt: instant },
      });
      owned.add(type);
      emit({ type: "achievement-earned", player: toPublicPlayer(player), achievement: type });
    }
  }

  // Closes the round, emits the reveal and grants the round champion to the 1st place.
  async function closeRecord(round: RoundRow, instant: Date): Promise<RoundRow> {
    const closed = await prisma.round.update({
      where: { id: round.id },
      data: { closedAt: instant },
    });

    const rankings = roundRanking(await attemptsOfRound(round.id));
    emit({
      type: "round-closed",
      title: challengeOfRound(round).title,
      reveal: buildReveal(round, rankings),
    });

    const champion = rankings[0];
    if (champion) {
      await grant(
        { id: champion.playerId, ...toPublicPlayer(champion.best.player) },
        round.id,
        ["round-champion"],
        instant,
      );
    }
    return closed;
  }

  // Reveal of the last closed round; only exists while no round is open.
  async function revealOfLatestRound(): Promise<Reveal | null> {
    const latest = await latestRound();
    if (!latest) return null;
    return buildReveal(latest, roundRanking(await attemptsOfRound(latest.id)));
  }

  // Closes the open round if its deadline has passed. Without a deadline, it never closes.
  async function closeIfDeadlinePassed(now: Date): Promise<boolean> {
    const open = await findOpenRound();
    if (!open?.deadline || open.deadline > now) return false;

    await closeRecord(open, open.deadline);
    return true;
  }

  return {
    // Subscribes a listener to the feed. Returns the function that cancels the subscription.
    subscribe(listener: (event: Event) => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    async enter(nickname: string): Promise<EnterResult> {
      const validation = validateNickname(nickname);
      if (!validation.ok) return validation;

      const token = randomBytes(24).toString("base64url");

      try {
        const row = await prisma.player.create({
          data: {
            nickname: validation.nickname,
            normalizedNickname: validation.normalized,
            initials: validation.initials,
            token,
          },
        });
        emit({ type: "player-joined", player: toPublicPlayer(row) });
        return { ok: true, token, player: toPlayer(row) };
      } catch (error) {
        if (isUniqueViolation(error)) return { ok: false, error: NICKNAME_IN_USE };
        throw error;
      }
    },

    async resume(token: string): Promise<ResumeResult> {
      const row = await findByToken(token);
      if (!row) return { ok: false, error: SESSION_INVALID };
      return { ok: true, player: toPlayer(row) };
    },

    async playerState(token: string): Promise<PlayerState> {
      const row = await findByToken(token);
      if (!row) return { ok: false, error: SESSION_INVALID };

      const round = await findOpenRound();
      const attempts = round
        ? await prisma.attempt.findMany({
            where: { playerId: row.id, roundId: round.id },
            orderBy: { number: "asc" },
          })
        : [];

      return {
        ok: true,
        player: toPlayer(row),
        round: round ? toPublicRound(round) : null,
        attempts: attempts.map(toPublicAttempt),
        attemptsLeft: round ? ATTEMPT_LIMIT - attempts.length : 0,
        // With no open round, the last one (already closed) stays in the reveal until the next opens.
        reveal: round ? null : await revealOfLatestRound(),
        now: clock().toISOString(),
      };
    },

    async openRound(challengeId: string, durationSeconds?: number) {
      return exclusive(async () => {
        const challenge = findChallenge(challengeId, challenges);
        if (!challenge) return { ok: false as const, error: "Desafio não encontrado." };

        if (
          durationSeconds !== undefined &&
          (!Number.isInteger(durationSeconds) || durationSeconds < 1)
        ) {
          return { ok: false as const, error: "A duração precisa ser de pelo menos 1 segundo." };
        }

        const instant = clock();
        await closeIfDeadlinePassed(instant);

        if (await findOpenRound()) {
          return {
            ok: false as const,
            error: "Já existe uma Rodada aberta. Encerre-a antes de abrir outra.",
          };
        }

        const alreadyPlayed = await prisma.round.findFirst({ where: { challengeId } });
        if (alreadyPlayed) {
          return { ok: false as const, error: "Este Desafio já foi jogado nesta Sala." };
        }

        const created = await prisma.round.create({
          data: {
            challengeId,
            openedAt: instant,
            deadline:
              durationSeconds === undefined
                ? null
                : new Date(instant.getTime() + durationSeconds * 1000),
          },
        });
        emit({ type: "round-opened", title: challenge.title });
        return { ok: true as const, round: toPublicRound(created) };
      });
    },

    async closeRound() {
      return exclusive(async () => {
        const open = await findOpenRound();
        if (!open) return { ok: false as const, error: "Não há Rodada aberta." };

        const closed = await closeRecord(open, clock());
        return { ok: true as const, round: toPublicRound(closed) };
      });
    },

    async checkDeadline(now: Date): Promise<{ closed: boolean }> {
      return exclusive(async () => ({ closed: await closeIfDeadlinePassed(now) }));
    },

    async submitAttempt(token: string, rawPrompt: string): Promise<AttemptResult> {
      return exclusive(async () => {
        const player = await findByToken(token);
        if (!player) return { ok: false as const, error: SESSION_INVALID };

        const instant = clock();
        await closeIfDeadlinePassed(instant);

        const round = await findOpenRound();
        if (!round) {
          const latest = await latestRound();
          return {
            ok: false as const,
            error: latest ? "A Rodada foi encerrada." : "Nenhuma Rodada aberta no momento.",
          };
        }

        const prompt = rawPrompt.trim();
        if (prompt.length === 0) {
          return { ok: false as const, error: "Escreva um prompt antes de enviar." };
        }
        if ([...prompt].length > CHARACTER_LIMIT) {
          return {
            ok: false as const,
            error: `O prompt pode ter no máximo ${CHARACTER_LIMIT.toLocaleString("pt-BR")} caracteres.`,
          };
        }

        const ofPlayer = await prisma.attempt.findMany({
          where: { playerId: player.id, roundId: round.id },
          select: { number: true, score: true },
        });
        if (ofPlayer.length >= ATTEMPT_LIMIT) {
          return {
            ok: false as const,
            error: `Você já usou as ${ATTEMPT_LIMIT} Tentativas desta Rodada.`,
          };
        }

        const firstOfRound = (await prisma.attempt.count({ where: { roundId: round.id } })) === 0;
        const number = ofPlayer.length + 1;
        const evaluation = evaluate(prompt, challengeOfRound(round));
        const created = await prisma.attempt.create({
          data: {
            playerId: player.id,
            roundId: round.id,
            number,
            prompt,
            score: evaluation.score,
            evaluation: JSON.stringify(evaluation),
            createdAt: instant,
          },
        });

        const publicPlayer = toPublicPlayer(player);
        emit({ type: "attempt-submitted", player: publicPlayer, number });
        if (evaluation.score === 100) emit({ type: "max-score", player: publicPlayer, number });

        await grant(
          { id: player.id, ...publicPlayer },
          round.id,
          achievementsForAttempt({
            number,
            score: evaluation.score,
            firstScore: ofPlayer.find((attempt) => attempt.number === 1)?.score,
            firstOfRound,
          }),
          instant,
        );

        return {
          ok: true as const,
          attempt: toPublicAttempt(created),
          attemptsLeft: ATTEMPT_LIMIT - number,
        };
      });
    },

    // Scoreboard: points from the best attempt of each round, fair tie-break and achievements.
    // Never includes prompt text.
    async scoreboard(): Promise<ScoreboardEntry[]> {
      const players = await prisma.player.findMany({
        select: { id: true, nickname: true, initials: true },
        orderBy: { createdAt: "asc" },
      });
      const attempts = await prisma.attempt.findMany({
        select: { id: true, playerId: true, roundId: true, number: true, score: true, createdAt: true },
      });
      const achievements = await prisma.achievement.findMany({
        select: { playerId: true, roundId: true, type: true },
        orderBy: { createdAt: "asc" },
      });
      const open = await findOpenRound();

      const byPlayer = groupByPlayer(attempts);
      const achievementsByPlayer = new Map<string, PublicAchievement[]>();
      for (const achievement of achievements) {
        const list = achievementsByPlayer.get(achievement.playerId) ?? [];
        // The database only stores known types, so the text comes back as AchievementType.
        list.push({ type: achievement.type as AchievementType, roundId: achievement.roundId });
        achievementsByPlayer.set(achievement.playerId, list);
      }

      const rows = players.map((player) => {
        const ofPlayer = byPlayer.get(player.id) ?? [];
        const inRound = open ? ofPlayer.filter((a) => a.roundId === open.id).length : 0;
        return {
          mark: scoreboardMark(ofPlayer),
          entry: {
            ...toPlayer(player),
            points: 0,
            sentInRound: inRound > 0,
            attemptsInRound: inRound,
            achievements: achievementsByPlayer.get(player.id) ?? [],
          },
        };
      });

      // Array.prototype.sort is stable: a full tie keeps the order of entry into the Room.
      rows.sort((a, b) => compareMarks(a.mark, b.mark));
      return rows.map(({ mark, entry }, index) => ({
        ...entry,
        position: index + 1,
        points: mark.points,
      }));
    },

    // Removes the player: deletes their attempts and achievements and frees the nickname and token.
    async removePlayer(playerId: string) {
      return exclusive(async () => {
        const player = await prisma.player.findUnique({ where: { id: playerId } });
        if (!player) return { ok: false as const, error: "Jogador não encontrado." };

        await prisma.$transaction([
          prisma.achievement.deleteMany({ where: { playerId } }),
          prisma.attempt.deleteMany({ where: { playerId } }),
          prisma.player.delete({ where: { id: playerId } }),
        ]);
        emit({ type: "player-removed", player: toPublicPlayer(player) });
        return { ok: true as const };
      });
    },

    // Resets the Room for a new workshop. Closes the open round too, since it disappears.
    async resetMatch() {
      return exclusive(async () => {
        await prisma.$transaction([
          prisma.achievement.deleteMany(),
          prisma.attempt.deleteMany(),
          prisma.round.deleteMany(),
          prisma.player.deleteMany(),
        ]);
        emit({ type: "match-reset" });
        return { ok: true as const };
      });
    },

    async facilitatorState() {
      const round = await findOpenRound();
      const playedIds = new Set(
        (await prisma.round.findMany({ select: { challengeId: true } })).map((r) => r.challengeId),
      );
      const sent = round
        ? new Set(
            (
              await prisma.attempt.findMany({
                where: { roundId: round.id },
                select: { playerId: true },
              })
            ).map((a) => a.playerId),
          ).size
        : 0;

      const players = await prisma.player.findMany({
        select: { id: true, nickname: true, initials: true },
        orderBy: { createdAt: "asc" },
      });

      return {
        challenges: [...challenges]
          .sort((a, b) => a.order - b.order)
          .map((challenge) => ({ ...summarize(challenge), played: playedIds.has(challenge.id) })),
        round: round ? toPublicRound(round) : null,
        sent,
        players: players.map(toPlayer),
        reveal: round ? null : await revealOfLatestRound(),
        now: clock().toISOString(),
      };
    },
  };
}

export type Engine = ReturnType<typeof createEngine>;

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export type FacilitatorState = Awaited<ReturnType<Engine["facilitatorState"]>>;
