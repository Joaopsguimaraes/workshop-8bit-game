"use client";

import { useEffect } from "react";

type Props = { motivo: string; onFim: () => void };

const DURACAO_MS = 1800;

// Animação de LEVEL UP: aparece sobre a área de trabalho por um instante e some sozinha.
export function LevelUp({ motivo, onFim }: Props) {
  useEffect(() => {
    const id = window.setTimeout(onFim, DURACAO_MS);
    return () => window.clearTimeout(id);
  }, [onFim]);

  return (
    <div role="status" aria-live="assertive" className="pointer-events-none fixed inset-x-0 top-1/3 z-50 flex justify-center">
      <div className="animacao-level-up font-pixel border-4 border-foreground bg-background px-6 py-4 text-center text-primary">
        <p className="text-[20px]">LEVEL UP!</p>
        <p className="mt-2 text-[10px] text-foreground">{motivo}</p>
      </div>
    </div>
  );
}
