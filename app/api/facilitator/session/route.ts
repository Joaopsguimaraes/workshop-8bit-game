import { NextResponse } from "next/server";
import {
  createFacilitatorSession,
  FACILITATOR_COOKIE_NAME,
  FACILITATOR_PIN,
  pinMatches,
  processSecret,
} from "@/lib/facilitator/session";

const TWELVE_HOURS_IN_SECONDS = 12 * 60 * 60;

// Checks the PIN and issues the httpOnly cookie that the Facilitator socket validates.
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const pin =
    typeof body === "object" && body !== null && "pin" in body ? String(body.pin) : "";

  if (!pinMatches(pin, FACILITATOR_PIN)) {
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
