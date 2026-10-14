import { describe, expect, it } from "vitest";
import { feedbackForWait, PROCESSING_MESSAGE, SLOW_MESSAGE } from "./pending-feedback";

describe("pending feedback", () => {
  it("shows nothing while the answer is still fresh", () => {
    expect(feedbackForWait(0)).toBeNull();
    expect(feedbackForWait(2_999)).toBeNull();
  });

  it("says the game is still processing after about 3 seconds", () => {
    expect(feedbackForWait(3_000)).toBe(PROCESSING_MESSAGE);
    expect(feedbackForWait(9_999)).toBe(PROCESSING_MESSAGE);
  });

  it("suggests checking the connection after about 10 seconds", () => {
    expect(feedbackForWait(10_000)).toBe(SLOW_MESSAGE);
    expect(feedbackForWait(60_000)).toBe(SLOW_MESSAGE);
  });

  it("shows the messages in pt-BR", () => {
    expect(PROCESSING_MESSAGE).toBe("Ainda processando, aguarde...");
    expect(SLOW_MESSAGE).toBe("Está demorando mais que o normal. Verifique sua conexão.");
  });
});
