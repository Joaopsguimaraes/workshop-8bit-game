import { NextResponse } from "next/server";
import { isFacilitatorAuthenticated } from "@/lib/facilitator/guard";
import { getEngine } from "@/lib/engine/service";
import { forgetScoreboard } from "@/lib/live";

// Opens a Round. `durationSeconds` is optional: without it, the Round has no deadline.
export async function POST(request: Request) {
  if (!(await isFacilitatorAuthenticated())) {
    return NextResponse.json({ ok: false, error: "Sessão do Facilitador inválida." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as {
    challengeId?: unknown;
    durationSeconds?: unknown;
  } | null;

  const result = await (await getEngine()).openRound(
    String(body?.challengeId ?? ""),
    body?.durationSeconds == null ? undefined : Number(body.durationSeconds),
  );
  forgetScoreboard();
  return NextResponse.json(result);
}
