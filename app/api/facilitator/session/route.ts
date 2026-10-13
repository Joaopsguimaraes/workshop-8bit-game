import { NextResponse } from "next/server";
import {
  createFacilitatorSession,
  FACILITATOR_COOKIE_NAME,
  pinMatches,
  processSecret,
} from "@/lib/facilitator/session";

const TWELVE_HOURS_IN_SECONDS = 12 * 60 * 60;

// Checks the PIN and issues the httpOnly cookie that the Facilitator socket validates.
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const pin =
    typeof body === "object" && body !== null && "pin" in body ? String(body.pin) : "";

  const expected = process.env.FACILITADOR_PIN;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "O PIN do Facilitador não está configurado no servidor." },
      { status: 503 },
    );
  }
  if (!pinMatches(pin, expected)) {
    return NextResponse.json({ ok: false, error: "PIN incorreto." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true }, { status: 201 });
  response.cookies.set(
    FACILITATOR_COOKIE_NAME,
    createFacilitatorSession(processSecret(), new Date()),
    { httpOnly: true, sameSite: "lax", path: "/", maxAge: TWELVE_HOURS_IN_SECONDS },
  );
  return response;
}
