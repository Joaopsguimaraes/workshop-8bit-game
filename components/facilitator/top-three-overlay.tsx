"use client";

import { useEffect } from "react";
import { Avatar } from "@/components/avatar";
import type { Reveal } from "@/lib/engine/engine";

type Props = { reveal: Reveal; onDone: () => void };

const DURATION_MS = 6000;

// TOP 3 animation: appears in the middle of the Big screen when a Round closes, then disappears on its own.
export function TopThreeOverlay({ reveal, onDone }: Props) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-6"
    >
      <div className="top-three-animation font-pixel flex w-full max-w-3xl flex-col gap-6 border-4 border-foreground bg-background p-8 text-foreground">
        <p className="text-center text-[16px] text-primary">TOP 3 · {reveal.challenge.title}</p>

        {reveal.top3.length === 0 ? (
          <p className="text-center text-3xl uppercase">NINGUÉM PONTUOU NESTA RODADA.</p>
        ) : (
          <ol className="flex flex-col gap-4">
            {reveal.top3.map((item) => (
              <li key={item.position} className="flex items-center gap-4 border-2 border-border p-3">
                <span className="w-14 text-[16px] text-primary">{item.position}º</span>
                <Avatar initials={item.initials} size="medium" />
                <span className="flex-1 truncate text-3xl text-foreground">{item.nickname}</span>
                <span className="text-[16px] text-primary">NOTA {item.score}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
