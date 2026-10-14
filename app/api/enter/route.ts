import { NextResponse } from "next/server";
import { getEngine } from "@/lib/engine/service";
import { forgetScoreboard } from "@/lib/live";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const nickname =
    typeof body === "object" && body !== null && "nickname" in body
      ? String(body.nickname)
      : "";

  const result = await (await getEngine()).enter(nickname);
  forgetScoreboard();
  if (!result.ok) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result, { status: 201 });
}
