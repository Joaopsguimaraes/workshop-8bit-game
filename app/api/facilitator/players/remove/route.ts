import { NextResponse } from "next/server";
import { isFacilitatorAuthenticated } from "@/lib/facilitator/guard";
import { getEngine } from "@/lib/engine/service";
import { forgetScoreboard } from "@/lib/live";

// Removes a Player. Their token stops working, so their screen goes back to the login on its next poll.
export async function POST(request: Request) {
  if (!(await isFacilitatorAuthenticated())) {
    return NextResponse.json({ ok: false, error: "Sessão do Facilitador inválida." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { playerId?: unknown } | null;

  const result = await (await getEngine()).removePlayer(String(body?.playerId ?? ""));
  forgetScoreboard();
  return NextResponse.json(result);
}
