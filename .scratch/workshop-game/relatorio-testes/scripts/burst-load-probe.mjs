// Burst load: N virtual Players (REST + Socket.IO, like the browser) each send ATTEMPTS prompts into
// one Round opened by the Facilitator. Prints one JSON result to stdout.
// Usage: node burst-load-probe.mjs <players> <attempts> <burst|spread> <challenge-id>
// Env: PROBE=1 also sends one probe per second. A probe is a non-string payload: the server refuses it
// without evaluating anything, but still runs the full per-Player refresh afterwards.
// RESET=1 resets the match before the run.
import { monitorEventLoopDelay } from "node:perf_hooks";
import { io } from "socket.io-client";

const [PLAYERS = "60", ATTEMPTS = "3", MODE = "spread", CHALLENGE = "trabalho-remoto"] = process.argv.slice(2);
const BASE = "http://localhost:3100";
const FACILITATOR_PIN = "4321";
const PROMPTS = [
  "Liste as vantagens e desvantagens do trabalho remoto.",
  "Papel: Você é um consultor de RH. Tarefa: liste as vantagens e desvantagens do trabalho remoto. Formato: tópicos curtos.",
  "You are an HR consultant. Task: list the advantages and disadvantages of remote work. Format: bullets.",
];

const letters = (n) => {
  let s = "";
  for (let i = 0; i < 4; i++) {
    s = String.fromCharCode(97 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
};
const nicknameOf = (i) => "Load" + letters(i);
const percentile = (values, p) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const startedAt = Date.now();
const loopLag = monitorEventLoopDelay({ resolution: 5 });
loopLag.enable();

// Facilitator: PIN -> cookie -> socket
const login = await fetch(`${BASE}/api/facilitator/session`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ pin: FACILITATOR_PIN }),
});
const cookie = login.headers.getSetCookie()[0].split(";")[0];
const facilitator = io(BASE, { extraHeaders: { cookie }, transports: ["websocket"], forceNew: true });
await new Promise((resolve, reject) => {
  facilitator.on("connect", resolve);
  facilitator.on("facilitator:invalid", () => reject(new Error("facilitator refused")));
  setTimeout(() => reject(new Error("facilitator timeout")), 8000);
});
if (process.env.RESET === "1") await new Promise((resolve) => facilitator.emit("facilitator:resetMatch", resolve));

// Players: REST entry in batches of 25
const players = [];
const entryStartedAt = Date.now();
for (let i = 0; i < Number(PLAYERS); i += 25) {
  const batch = await Promise.all(
    Array.from({ length: Math.min(25, Number(PLAYERS) - i) }, async (_, k) => {
      const response = await fetch(`${BASE}/api/enter`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nickname: nicknameOf(i + k) }),
      });
      const json = await response.json();
      return { nickname: nicknameOf(i + k), ok: response.ok, token: json.token, error: json.error };
    }),
  );
  players.push(...batch);
}
const entryFailures = players.filter((player) => !player.ok);
const valid = players.filter((player) => player.ok);

// Player sockets, and a count of the broadcasts each one receives
const received = { scoreboard: 0, playerState: 0, feed: 0, sessionInvalid: 0 };
const connections = await Promise.all(
  valid.map(
    (player) =>
      new Promise((resolve) => {
        const socket = io(BASE, { auth: { token: player.token }, transports: ["websocket"], forceNew: true, reconnection: false });
        socket.on("scoreboard", () => received.scoreboard++);
        socket.on("player:state", () => received.playerState++);
        socket.on("feed:event", () => received.feed++);
        socket.on("session:invalid", () => received.sessionInvalid++);
        const timer = setTimeout(() => resolve({ ...player, socket, connected: false }), 10000);
        socket.on("connect", () => {
          clearTimeout(timer);
          resolve({ ...player, socket, connected: true });
        });
        socket.on("connect_error", () => {
          clearTimeout(timer);
          resolve({ ...player, socket, connected: false });
        });
      }),
  ),
);
const connected = connections.filter((connection) => connection.connected);
const entryAndConnectMs = Date.now() - entryStartedAt;

// Open the Round
const openStartedAt = Date.now();
const opened = await new Promise((resolve) => facilitator.emit("facilitator:openRound", { challengeId: CHALLENGE }, resolve));
const openRoundMs = Date.now() - openStartedAt;
if (!opened?.ok) {
  console.log(JSON.stringify({ openRoundError: opened }));
  process.exit(1);
}

// Probe (optional): a non-string payload, refused by the server without evaluation.
const probeRttMs = [];
const probeTimer =
  process.env.PROBE === "1" && connected.length > 0
    ? setInterval(() => {
        const sentAt = Date.now();
        connected[0].socket.emit("attempt:submit", 12345, () => probeRttMs.push(Date.now() - sentAt));
      }, 1000)
    : null;

// Sends
const ackRtt = [];
const responses = { ok: 0, refused: 0, noResponse: 0 };
const refusalReasons = {};
const sendStartedAt = Date.now();
await Promise.all(
  connected.map(async (connection, index) => {
    for (let k = 0; k < Number(ATTEMPTS); k++) {
      if (MODE === "spread") await sleep(300 + Math.random() * 1500);
      const prompt = PROMPTS[(index + k) % PROMPTS.length];
      const sentAt = Date.now();
      const result = await new Promise((resolve) => {
        const timer = setTimeout(() => resolve({ timeout: true }), 15000);
        connection.socket.emit("attempt:submit", prompt, (reply) => {
          clearTimeout(timer);
          resolve(reply);
        });
      });
      if (result?.timeout) {
        responses.noResponse++;
        continue;
      }
      ackRtt.push(Date.now() - sentAt);
      if (result.ok) responses.ok++;
      else {
        responses.refused++;
        refusalReasons[result.error] = (refusalReasons[result.error] ?? 0) + 1;
      }
    }
  }),
);
const sendPhaseMs = Date.now() - sendStartedAt;
if (probeTimer) clearInterval(probeTimer);

// Close the Round
const closeStartedAt = Date.now();
const closed = await new Promise((resolve) => facilitator.emit("facilitator:closeRound", resolve));
const closeRoundMs = Date.now() - closeStartedAt;
await sleep(1500);

const result = {
  playersRequested: Number(PLAYERS),
  entryFailures: entryFailures.length,
  connected: connected.length,
  entryAndConnectMs,
  openRoundMs,
  attemptsSent: connected.length * Number(ATTEMPTS),
  responses,
  refusalReasons,
  ackLatencyMs: { p50: percentile(ackRtt, 50), p95: percentile(ackRtt, 95), p99: percentile(ackRtt, 99), max: Math.max(...ackRtt) },
  sendPhaseMs,
  closeRoundMs,
  roundClosed: closed?.ok,
  broadcastsReceived: received,
  broadcastsPerSocket: {
    scoreboard: +(received.scoreboard / connected.length).toFixed(1),
    playerState: +(received.playerState / connected.length).toFixed(1),
  },
  clientLoopLagMs: { p50: loopLag.percentile(50) / 1e6, p95: loopLag.percentile(95) / 1e6, max: loopLag.max / 1e6 },
  probeRttMs,
  durationS: Math.round((Date.now() - startedAt) / 1000),
};
loopLag.disable();
console.log(JSON.stringify(result, null, 2));
for (const connection of connections) connection.socket.close();
facilitator.close();
process.exit(0);
