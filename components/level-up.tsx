"use client";

import { useEffect } from "react";

type Props = { reason: string; onDone: () => void };

const DURATION_MS = 1800;

// LEVEL UP animation: appears over the desktop for a moment and disappears on its own.
export function LevelUp({ reason, onDone }: Props) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  return (
    <div role="status" aria-live="assertive" className="pointer-events-none fixed inset-x-0 top-1/3 z-50 flex justify-center">
      <div className="level-up-animation font-pixel border-4 border-foreground bg-background px-6 py-4 text-center text-primary">
        <p className="text-[20px]">LEVEL UP!</p>
        <p className="mt-2 text-[10px] text-foreground">{reason}</p>
      </div>
    </div>
  );
}
