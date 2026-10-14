import { NextResponse } from "next/server";
import { getEngine } from "@/lib/engine/service";
import { liveScoreboard } from "@/lib/live";

// Everything a Player's screen needs, read on each poll: own state, Scoreboard and feed.
// Also records that the Player is online, and closes the Round if its deadline has passed.
export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const engine = await getEngine();

  await engine.checkDeadline(new Date());
  const state = await engine.playerState(token);
  if (!state.ok) return NextResponse.json(state, { status: 401 });
  await engine.touch(token);

  const [players, feed] = await Promise.all([liveScoreboard(engine), engine.liveFeed()]);
  return NextResponse.json({ state, players, feed }, { headers: { "cache-control": "no-store" } });
}
