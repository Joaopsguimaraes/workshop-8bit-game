import { NextResponse } from "next/server";
import { isFacilitatorAuthenticated } from "@/lib/facilitator/guard";
import { getEngine } from "@/lib/engine/service";
import { forgetScoreboard } from "@/lib/live";

// Resets the Room: every Player goes back to the login on their next poll.
export async function POST() {
  if (!(await isFacilitatorAuthenticated())) {
    return NextResponse.json({ ok: false, error: "Sessão do Facilitador inválida." }, { status: 401 });
  }
  const result = await (await getEngine()).resetMatch();
  forgetScoreboard();
  return NextResponse.json(result);
}
