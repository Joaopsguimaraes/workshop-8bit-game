// Summarizes a .cpuprofile (from node --cpu-prof) into time shares for the submission path.
// Inclusive shares count a sample under every matching caller, so the rows overlap; the
// "self time" list gives the exclusive view. Time per sample = gap to the next sample.
// Usage: node analisar-perfil.mjs <profile.cpuprofile>
import { readFileSync } from "node:fs";

const profile = JSON.parse(readFileSync(process.argv[2], "utf8"));
const nodes = new Map(profile.nodes.map((node) => [node.id, node]));
const parentOf = new Map();
for (const node of profile.nodes) for (const child of node.children ?? []) parentOf.set(child, node.id);

const IDLE = new Set(["(idle)", "(program)", "(root)"]);
const GC = "(garbage collector)";

// Each row: a label and a test on one frame of the call stack.
const MATCHERS = [
  ["updateAll(): refresh after every accepted or refused Attempt", (f) => f.name === "updateAll" && f.url.includes("lib/realtime")],
  ["  sendScoreboard()", (f) => f.name === "sendScoreboard" && f.url.includes("lib/realtime")],
  ["    engine.scoreboard() (reads all Players, Attempts, Achievements)", (f) => f.name === "scoreboard" && f.url.includes("lib/engine/engine")],
  ["  sendPlayerState() (one per connected Player socket)", (f) => f.name === "sendPlayerState" && f.url.includes("lib/realtime")],
  ["    engine.playerState() (per-Player reads)", (f) => f.name === "playerState" && f.url.includes("lib/engine/engine")],
  ["  sendFacilitatorState()", (f) => f.name === "sendFacilitatorState" && f.url.includes("lib/realtime")],
  ["engine exclusive() queue: all state-changing commands", (f) => f.name === "exclusive" && f.url.includes("lib/engine/engine")],
  ["  engine.submitAttempt()", (f) => f.name === "submitAttempt" && f.url.includes("lib/engine/engine")],
  ["  engine.checkDeadline() (1 s server tick)", (f) => f.name === "checkDeadline" && f.url.includes("lib/engine/engine")],
  ["socket.io / engine.io (encoding and writes, any caller)", (f) => /socket\.io|engine\.io/.test(f.url)],
  ["Prisma / better-sqlite3 (all queries, any caller)", (f) => /prisma|better-sqlite3/i.test(f.url)],
];

// Memoized: the set of matcher indexes that match anywhere on the stack of a node.
const memo = new Map();
function matchesOf(id) {
  if (memo.has(id)) return memo.get(id);
  const node = nodes.get(id);
  const frame = { name: node.callFrame.functionName, url: node.callFrame.url ?? "" };
  const set = new Set(MATCHERS.flatMap(([, test], index) => (test(frame) ? [index] : [])));
  const parent = parentOf.get(id);
  if (parent !== undefined) for (const index of matchesOf(parent)) set.add(index);
  memo.set(id, set);
  return set;
}

const inclusive = MATCHERS.map(() => 0);
const selfTime = new Map();
let total = 0;
let idle = 0;
let gc = 0;
let busy = 0;
for (let i = 0; i < profile.samples.length; i++) {
  const id = profile.samples[i];
  const duration = profile.timeDeltas[i + 1] ?? 0;
  const node = nodes.get(id);
  const name = node.callFrame.functionName || "(anonymous)";
  total += duration;
  if (IDLE.has(name)) { idle += duration; continue; }
  busy += duration;
  if (name === GC) { gc += duration; }
  for (const index of matchesOf(id)) inclusive[index] += duration;
  const key = `${name} ${(node.callFrame.url ?? "").split("/").slice(-3).join("/")}`;
  selfTime.set(key, (selfTime.get(key) ?? 0) + duration);
}

const pct = (value, of) => ((100 * value) / of).toFixed(1).padStart(5);
const seconds = (us) => (us / 1e6).toFixed(2);

console.log(`Profile: ${seconds(total)} s recorded, ${seconds(busy)} s busy (${pct(busy, total)}% of wall time)`);
console.log(`Idle: ${seconds(idle)} s   Garbage collector: ${seconds(gc)} s (${pct(gc, total)}% of wall time)\n`);
console.log("Inclusive share (rows overlap)");
console.log("| share of busy | share of wall | seconds | caller |");
console.log("|---:|---:|---:|---|");
MATCHERS.forEach(([label], index) => {
  console.log(`| ${pct(inclusive[index], busy)}% | ${pct(inclusive[index], total)}% | ${seconds(inclusive[index])} | ${label} |`);
});

console.log("\nSelf time, top 20 (leaf frame)");
console.log("| share of busy | seconds | function (file) |");
console.log("|---:|---:|---|");
for (const [key, value] of [...selfTime].sort((a, b) => b[1] - a[1]).slice(0, 20)) {
  console.log(`| ${pct(value, busy)}% | ${seconds(value)} | ${key} |`);
}
