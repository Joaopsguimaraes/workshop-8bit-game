import { NextResponse } from "next/server";
import { getEngine } from "@/lib/engine/service";
import { forgetScoreboard } from "@/lib/live";

// Receives a prompt from the Player. The Player's screen picks up the result on its next poll.
export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const body: unknown = await request.json().catch(() => null);
  const prompt =
    typeof body === "object" && body !== null && "prompt" in body && typeof body.prompt === "string"
      ? body.prompt
      : null;

  const engine = await getEngine();
  if (prompt === null) {
    return NextResponse.json({ ok: false, error: "Escreva um prompt antes de enviar." });
  }
  const result = await engine.submitAttempt(token, prompt);
  if (!result.ok && result.error === "Sessão inválida. Entre novamente.") {
    return NextResponse.json(result, { status: 401 });
  }
  forgetScoreboard();
  return NextResponse.json(result);
}
