import type { Engine, ScoreboardEntry } from "./engine/engine";

export type LiveScoreboardEntry = ScoreboardEntry & { online: boolean };

// The Scoreboard reads every Attempt of the Room, so every poll in the same window shares one read.
// The cache lives in each serverless instance, and a change made here is forgotten at once.
const SCOREBOARD_TTL_MS = 1000;
let cachedScoreboard: { readAt: number; players: ScoreboardEntry[] } | null = null;

export function forgetScoreboard() {
  cachedScoreboard = null;
}

// Scoreboard with the online flag of each Player, from the last poll each one made.
export async function liveScoreboard(engine: Engine): Promise<LiveScoreboardEntry[]> {
  const now = Date.now();
  if (!cachedScoreboard || now - cachedScoreboard.readAt >= SCOREBOARD_TTL_MS) {
    cachedScoreboard = { readAt: now, players: await engine.scoreboard() };
  }
  const online = await engine.onlinePlayerIds();
  return cachedScoreboard.players.map((player) => ({ ...player, online: online.has(player.id) }));
}
