import { describe, expect, it } from "vitest";
import {
  createFacilitatorSession,
  cookieValue,
  isFacilitatorSessionValid,
  pinMatches,
} from "./session";

const SECRET = Buffer.from("segredo-de-teste-com-32-bytes-ok!");
const OTHER_SECRET = Buffer.from("outro-segredo-com-32-bytes-tambem!");
const NOW = new Date("2026-10-13T12:00:00.000Z");
const TWELVE_HOURS = 12 * 60 * 60 * 1000;

describe("pinMatches", () => {
  it("accepts the exact PIN", () => {
    expect(pinMatches("4821", "4821")).toBe(true);
  });

  it("rejects a wrong PIN, one of another length, or an empty one", () => {
    expect(pinMatches("4822", "4821")).toBe(false);
    expect(pinMatches("48210", "4821")).toBe(false);
    expect(pinMatches("", "4821")).toBe(false);
  });

  it("rejects everything when the server PIN was not configured", () => {
    expect(pinMatches("", "")).toBe(false);
    expect(pinMatches("4821", "")).toBe(false);
    expect(pinMatches("", undefined)).toBe(false);
  });
});

describe("facilitator session", () => {
  it("is valid right after it is created", () => {
    const token = createFacilitatorSession(SECRET, NOW);

    expect(isFacilitatorSessionValid(token, SECRET, NOW)).toBe(true);
  });

  it("stays valid for 12 hours and stops being valid after that", () => {
    const token = createFacilitatorSession(SECRET, NOW);

    expect(
      isFacilitatorSessionValid(token, SECRET, new Date(NOW.getTime() + TWELVE_HOURS - 1)),
    ).toBe(true);
    expect(
      isFacilitatorSessionValid(token, SECRET, new Date(NOW.getTime() + TWELVE_HOURS + 1)),
    ).toBe(false);
  });

  it("rejects a tampered token, a token from another secret, or a missing one", () => {
    const token = createFacilitatorSession(SECRET, NOW);
    const [expiresAt, signature] = token.split(".");
    const tampered = `${Number(expiresAt) + 1}.${signature}`;

    expect(isFacilitatorSessionValid(tampered, SECRET, NOW)).toBe(false);
    expect(isFacilitatorSessionValid(token, OTHER_SECRET, NOW)).toBe(false);
    expect(isFacilitatorSessionValid(undefined, SECRET, NOW)).toBe(false);
    expect(isFacilitatorSessionValid("lixo", SECRET, NOW)).toBe(false);
  });
});

describe("cookieValue", () => {
  it("finds the cookie by name among several others", () => {
    expect(
      cookieValue("a=1; facilitator_session=123.abc; b=2", "facilitator_session"),
    ).toBe("123.abc");
  });

  it("returns undefined when the cookie does not exist or there is no header", () => {
    expect(cookieValue("a=1", "facilitator_session")).toBeUndefined();
    expect(cookieValue(undefined, "facilitator_session")).toBeUndefined();
  });
});
