import { connection } from "next/server";
import { FacilitatorPanel } from "@/components/facilitator/facilitator-panel";
import { PinScreen } from "@/components/facilitator/pin-screen";
import { isFacilitatorAuthenticated } from "@/lib/facilitator/guard";

// Depends on the request cookie and does not need instant navigation.
export const instant = false;

// Decides on the server between asking for the PIN and showing the panel, based on the session cookie.
export default async function FacilitatorPage() {
  // The check depends on the request time, so the page is never prerendered.
  await connection();
  return (await isFacilitatorAuthenticated()) ? <FacilitatorPanel /> : <PinScreen />;
}
