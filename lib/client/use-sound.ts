"use client";

import { useCallback, useState } from "react";
import {
  readSoundPreference,
  saveSoundPreference,
  playEffect,
  type Effect,
} from "./sounds";

// Turns sound on and off, remembering the choice in the browser. Only plays while on.
export function useSound() {
  const [on, setOn] = useState(readSoundPreference);

  const toggle = useCallback(() => {
    const next = !on;
    setOn(next);
    saveSoundPreference(next);
    // The click that turns sound on also plays a signal, to confirm the audio works.
    if (next) playEffect("send");
  }, [on]);

  const play = useCallback(
    (effect: Effect) => {
      if (on) playEffect(effect);
    },
    [on],
  );

  return { on, toggle, play };
}
