import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// Facilitator session: a signed cookie with an expiry, with no state on the server.
// The PIN is fixed (see docs/adr/0003-fixed-facilitator-pin.md), so the secret is derived from it
// and is the same in every serverless instance; a cookie issued by one instance validates on another.
const DURATION_MS = 12 * 60 * 60 * 1000;

export const FACILITATOR_PIN = "4321";
export const FACILITATOR_COOKIE_NAME = "facilitator_session";

export function processSecret(): Buffer {
  return createHash("sha256").update(`workshop-facilitador-session:${FACILITATOR_PIN}`).digest();
}

// Compares in constant time; an empty or unconfigured PIN never matches.
export function pinMatches(given: string, expected: string | undefined): boolean {
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function sign(secret: Buffer, expiresAt: number): string {
  return createHmac("sha256", secret).update(`facilitador:${expiresAt}`).digest("base64url");
}

export function createFacilitatorSession(secret: Buffer, now: Date): string {
  const expiresAt = now.getTime() + DURATION_MS;
  return `${expiresAt}.${sign(secret, expiresAt)}`;
}

export function isFacilitatorSessionValid(
  token: string | undefined,
  secret: Buffer,
  now: Date,
): boolean {
  if (!token) return false;
  const [rawExpiry, signature] = token.split(".");
  const expiresAt = Number(rawExpiry);
  if (!Number.isInteger(expiresAt) || !signature) return false;
  if (expiresAt <= now.getTime()) return false;

  const expected = Buffer.from(sign(secret, expiresAt));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

// Reads a cookie from the `Cookie` header of an HTTP request or a socket handshake.
export function cookieValue(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const pair of header.split(";")) {
    const [key, ...rest] = pair.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return undefined;
}
