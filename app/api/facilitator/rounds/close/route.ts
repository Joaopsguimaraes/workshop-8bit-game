import { NextResponse } from "next/server";
import { isFacilitatorAuthenticated } from "@/lib/facilitator/guard";
import { getEngine } from "@/lib/engine/service";
import { forgetScoreboard } from "@/lib/live";

export async function POST() {
  if (!(await isFacilitatorAuthenticated())) {
    return NextResponse.json({ ok: false, error: "Sessão do Facilitador inválida." }, { status: 401 });
  }
  const result = await (await getEngine()).closeRound();
  forgetScoreboard();
  return NextResponse.json(result);
}
