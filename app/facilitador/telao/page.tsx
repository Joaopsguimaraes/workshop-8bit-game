import { connection } from "next/server";
import { BigScreen } from "@/components/facilitator/big-screen";
import { PinScreen } from "@/components/facilitator/pin-screen";
import { isFacilitatorAuthenticated } from "@/lib/facilitator/guard";

// The big screen is for the Facilitator only: without the session, the page asks for the PIN like the panel.
export const instant = false;

export default async function BigScreenPage() {
  await connection();
  return (await isFacilitatorAuthenticated()) ? <BigScreen /> : <PinScreen />;
}
