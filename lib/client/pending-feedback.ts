// Feedback while an Attempt waits for its answer: after 3s the game says it is still working,
// after 10s it suggests checking the connection, since the answer may never arrive.
export const PROCESSING_AFTER_MS = 3_000;
export const SLOW_AFTER_MS = 10_000;

export const PROCESSING_MESSAGE = "Ainda processando, aguarde...";
export const SLOW_MESSAGE = "Está demorando mais que o normal. Verifique sua conexão.";

// Message for how long the Attempt has been waiting; null while the wait is still short.
export function feedbackForWait(elapsedMs: number): string | null {
  if (elapsedMs >= SLOW_AFTER_MS) return SLOW_MESSAGE;
  if (elapsedMs >= PROCESSING_AFTER_MS) return PROCESSING_MESSAGE;
  return null;
}
