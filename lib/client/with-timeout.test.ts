import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { withTimeout } from "./with-timeout";

describe("withTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps the answer when it arrives in time", async () => {
    const answer = withTimeout(Promise.resolve("ok"), 1_000, "tempo esgotado");

    await expect(answer).resolves.toBe("ok");
  });

  it("resolves with the fallback when the answer never arrives", async () => {
    const answer = withTimeout(new Promise<string>(() => {}), 1_000, "tempo esgotado");

    await vi.advanceTimersByTimeAsync(1_000);

    await expect(answer).resolves.toBe("tempo esgotado");
  });
});
