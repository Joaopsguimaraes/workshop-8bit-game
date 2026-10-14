import { NextResponse } from "next/server";
import { isFacilitatorAuthenticated } from "@/lib/facilitator/guard";
import { getEngine } from "@/lib/engine/service";
import { liveScoreboard } from "@/lib/live";

// Everything the Facilitator panel and the Big screen show, read on each poll.
export async function GET() {
  if (!(await isFacilitatorAuthenticated())) {
    return NextResponse.json({ ok: false, error: "Sessão do Facilitador inválida." }, { status: 401 });
  }
  const engine = await getEngine();

  await engine.checkDeadline(new Date());
  const [state, players, feed] = await Promise.all([
    engine.facilitatorState(),
    liveScoreboard(engine),
    engine.liveFeed(),
  ]);
  return NextResponse.json({ state, players, feed }, { headers: { "cache-control": "no-store" } });
}
