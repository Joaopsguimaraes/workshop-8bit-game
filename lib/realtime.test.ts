import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { io as connect, type Socket as ClientSocket } from "socket.io-client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CHALLENGES } from "./challenges/catalog";
import { createEngine, type Engine } from "./engine/engine";
import { createPresence } from "./presence";
import { installRealtime } from "./realtime";
import { createFacilitatorSession, FACILITATOR_COOKIE_NAME, processSecret } from "./facilitator/session";
import { createTestDatabase } from "./engine/test-database";

const PROMPT = "Escreva um e-mail sobre a reunião de alinhamento.";

type Client = { socket: ClientSocket; playerStates: unknown[] };

let database: ReturnType<typeof createTestDatabase>;
let httpServer: Server;
let engine: Engine;
let clock: Date;
let url: string;
const clients: ClientSocket[] = [];

function pause(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(condition: () => boolean, timeoutMs = 2000) {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() > deadline) throw new Error("timed out waiting for condition");
    await pause(10);
  }
}

// Connects a Player and waits for their first state, so each test starts counting from zero.
async function connectPlayer(token: string): Promise<Client> {
  const socket = connect(url, { auth: { token }, forceNew: true, transports: ["websocket"] });
  clients.push(socket);
  const playerStates: unknown[] = [];
  socket.on("player:state", (state) => playerStates.push(state));
  await waitFor(() => playerStates.length === 1);
  playerStates.length = 0;
  return { socket, playerStates };
}

async function connectFacilitator(): Promise<ClientSocket> {
  const cookie = `${FACILITATOR_COOKIE_NAME}=${createFacilitatorSession(processSecret(), new Date())}`;
  const socket = connect(url, { extraHeaders: { cookie }, forceNew: true, transports: ["websocket"] });
  clients.push(socket);
  await waitFor(() => socket.connected);
  return socket;
}

// Connects a Facilitator and records every state they receive, starting with the one sent on connection.
async function connectFacilitatorRecording() {
  const cookie = `${FACILITATOR_COOKIE_NAME}=${createFacilitatorSession(processSecret(), new Date())}`;
  const socket = connect(url, { extraHeaders: { cookie }, forceNew: true, transports: ["websocket"] });
  clients.push(socket);
  const states: FacilitatorState[] = [];
  socket.on("facilitator:state", (state: FacilitatorState) => states.push(state));
  await waitFor(() => socket.connected);
  return { socket, states };
}

type FacilitatorState = { players: { nickname: string }[] };

function listedNicknames(state: FacilitatorState | undefined) {
  return state?.players.map((player) => player.nickname) ?? [];
}

function submit(client: ClientSocket, prompt: string) {
  return new Promise((resolve) => client.emit("attempt:submit", prompt, resolve));
}

async function enterAs(nickname: string) {
  const result = await engine.enter(nickname);
  if (!result.ok) throw new Error(`expected successful enter: ${result.error}`);
  return result.token;
}

beforeEach(async () => {
  database = createTestDatabase();
  // The clock sits an hour ahead of the real one, so the server tick never closes a Round on its own.
  clock = new Date(Date.now() + 60 * 60 * 1000);
  engine = createEngine(database.prisma, { now: () => clock });

  httpServer = createServer();
  installRealtime({ httpServer, engine, presence: createPresence() });
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  url = `http://localhost:${(httpServer.address() as AddressInfo).port}`;
});

afterEach(async () => {
  for (const client of clients.splice(0)) client.disconnect();
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  await database.close();
});

describe("Attempt broadcasts", () => {
  it("refreshes only the state of the Player who sent the Attempt", async () => {
    const ana = await connectPlayer(await enterAs("Ana"));
    const bruno = await connectPlayer(await enterAs("Bruno"));
    await engine.openRound(CHALLENGES[0].id);

    await submit(ana.socket, PROMPT);
    await waitFor(() => ana.playerStates.length === 1);
    await pause(100);

    expect(ana.playerStates).toHaveLength(1);
    expect(bruno.playerStates).toHaveLength(0);
  });

  it("refreshes every tab of the Player who sent the Attempt", async () => {
    const token = await enterAs("Ana");
    const firstTab = await connectPlayer(token);
    const secondTab = await connectPlayer(token);
    const other = await connectPlayer(await enterAs("Bruno"));
    await engine.openRound(CHALLENGES[0].id);

    await submit(firstTab.socket, PROMPT);
    await waitFor(() => secondTab.playerStates.length === 1);
    await pause(100);

    expect(firstTab.playerStates).toHaveLength(1);
    expect(secondTab.playerStates).toHaveLength(1);
    expect(other.playerStates).toHaveLength(0);
  });

  it("refreshes every Player when a refused Attempt closes the Round by its deadline", async () => {
    const ana = await connectPlayer(await enterAs("Ana"));
    const bruno = await connectPlayer(await enterAs("Bruno"));
    await engine.openRound(CHALLENGES[0].id, 60);

    // The deadline passes before Ana sends; the server closes the Round and refuses the Attempt.
    clock = new Date(clock.getTime() + 120 * 1000);
    const result = (await submit(ana.socket, PROMPT)) as { ok: boolean };
    await waitFor(() => ana.playerStates.length === 1 && bruno.playerStates.length === 1);

    expect(result.ok).toBe(false);
    expect(ana.playerStates).toHaveLength(1);
    expect(bruno.playerStates).toHaveLength(1);
  });
});

describe("Round broadcasts", () => {
  it("refreshes every Player when the Facilitator opens and closes a Round", async () => {
    const ana = await connectPlayer(await enterAs("Ana"));
    const bruno = await connectPlayer(await enterAs("Bruno"));
    const facilitator = await connectFacilitator();

    await new Promise((resolve) =>
      facilitator.emit("facilitator:openRound", { challengeId: CHALLENGES[0].id }, resolve),
    );
    await waitFor(() => ana.playerStates.length === 1 && bruno.playerStates.length === 1);

    ana.playerStates.length = 0;
    bruno.playerStates.length = 0;
    await new Promise((resolve) => facilitator.emit("facilitator:closeRound", resolve));
    await waitFor(() => ana.playerStates.length === 1 && bruno.playerStates.length === 1);

    expect(ana.playerStates).toHaveLength(1);
    expect(bruno.playerStates).toHaveLength(1);
  });
});

describe("Facilitator broadcasts", () => {
  it("lists a Player as soon as they enter, without any other action", async () => {
    const facilitator = await connectFacilitatorRecording();
    await pause(100);

    await enterAs("Ana");

    await waitFor(() => listedNicknames(facilitator.states.at(-1)).includes("Ana"));
    expect(listedNicknames(facilitator.states.at(-1))).toEqual(["Ana"]);
  });

  it("lists all 12 Players when they enter in a row", async () => {
    const facilitator = await connectFacilitatorRecording();
    const nicknames = Array.from({ length: 12 }, (_, index) => `Jogadora${index}`);

    for (const nickname of nicknames) await enterAs(nickname);

    await waitFor(() => listedNicknames(facilitator.states.at(-1)).length === 12);
    expect(listedNicknames(facilitator.states.at(-1))).toEqual(nicknames);
  });

  it("sends a new list when a Player's connection drops", async () => {
    const ana = await connectPlayer(await enterAs("Ana"));
    const facilitator = await connectFacilitatorRecording();
    await waitFor(() => facilitator.states.length >= 1);
    const sentBefore = facilitator.states.length;

    ana.socket.disconnect();

    await waitFor(() => facilitator.states.length > sentBefore);
    expect(listedNicknames(facilitator.states.at(-1))).toEqual(["Ana"]);
  });

  it("drops a removed Player from the list", async () => {
    await enterAs("Ana");
    const facilitator = await connectFacilitatorRecording();
    await enterAs("Bruno");
    await waitFor(() => listedNicknames(facilitator.states.at(-1)).includes("Bruno"));
    const bruno = (await engine.facilitatorState()).players.find((p) => p.nickname === "Bruno");

    await new Promise((resolve) =>
      facilitator.socket.emit("facilitator:removePlayer", { playerId: bruno?.id }, resolve),
    );

    await waitFor(() => !listedNicknames(facilitator.states.at(-1)).includes("Bruno"));
    expect(listedNicknames(facilitator.states.at(-1))).toEqual(["Ana"]);
  });
});

describe("Scoreboard broadcasts", () => {
  type ScoreboardPlayer = { nickname: string; sentInRound: boolean };

  // Records the Scoreboard each Player's socket receives.
  function listenScoreboards(client: ClientSocket) {
    const scoreboards: ScoreboardPlayer[][] = [];
    client.on("scoreboard", (data: { players: ScoreboardPlayer[] }) => scoreboards.push(data.players));
    return scoreboards;
  }

  it("sends the Scoreboard a few times during a burst, and the last send has every change", async () => {
    const nicknames = Array.from({ length: 10 }, (_, index) => `Jogadora${index}`);
    const players = [];
    for (const nickname of nicknames) players.push(await connectPlayer(await enterAs(nickname)));
    await engine.openRound(CHALLENGES[0].id);
    // Let the Scoreboard sent on connection settle, so only the burst is counted.
    await pause(600);

    const scoreboards = listenScoreboards(players[0].socket);
    await Promise.all(players.map((player) => submit(player.socket, PROMPT)));
    await waitFor(() => scoreboards.at(-1)?.every((player) => player.sentInRound) ?? false);
    await pause(600);

    // Ten Attempts in one burst would be ten sends without coalescing; at most one now starts immediately,
    // and at most one more waits for the interval.
    expect(scoreboards.length).toBeLessThanOrEqual(3);
    expect(scoreboards.at(-1)?.every((player) => player.sentInRound)).toBe(true);
  });

  it("sends a single change promptly when traffic is low", async () => {
    const ana = await connectPlayer(await enterAs("Ana"));
    await engine.openRound(CHALLENGES[0].id);
    await pause(600);

    const scoreboards = listenScoreboards(ana.socket);
    const sentAt = Date.now();
    await submit(ana.socket, PROMPT);
    await waitFor(() => scoreboards.length === 1);

    expect(Date.now() - sentAt).toBeLessThan(250);
  });
});
