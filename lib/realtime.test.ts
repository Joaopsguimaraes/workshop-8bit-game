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
