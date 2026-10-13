import { cookies } from "next/headers";
import { FACILITATOR_COOKIE_NAME, isFacilitatorSessionValid, processSecret } from "./session";

// Checks, from this request's cookie, whether the Facilitator has already entered the PIN.
// Callers must have awaited `connection()`, so the check is not prerendered.
export async function isFacilitatorAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return isFacilitatorSessionValid(
    cookieStore.get(FACILITATOR_COOKIE_NAME)?.value,
    processSecret(),
    new Date(),
  );
}
