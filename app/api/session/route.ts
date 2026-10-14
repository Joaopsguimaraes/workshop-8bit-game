import { NextResponse } from "next/server";
import { getEngine } from "@/lib/engine/service";

export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";

  const result = await (await getEngine()).playerState(token);
  if (!result.ok) return NextResponse.json(result, { status: 401 });
  return NextResponse.json(result);
}
