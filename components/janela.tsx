"use client";

import type { PointerEvent, ReactNode } from "react";
import { useRef } from "react";
import type { EstadoJanela } from "@/lib/cliente/janelas";
import { cn } from "@/lib/utils";

type Props = {
  titulo: string;
  estado: EstadoJanela;
  emFrente: boolean;
  largura: number;
  onMover: (x: number, y: number) => void;
  onFocar: () => void;
  onMinimizar: () => void;
  children: ReactNode;
};

// Janela estilo MS-DOS: arrasta pela barra de título e minimiza para a barra de tarefas.
export function Janela({
  titulo,
  estado,
  emFrente,
  largura,
  onMover,
  onFocar,
  onMinimizar,
  children,
}: Props) {
  const arrasto = useRef<{ ponteiroX: number; ponteiroY: number; x: number; y: number } | null>(
    null,
  );

  function iniciarArrasto(evento: PointerEvent<HTMLDivElement>) {
    onFocar();
    arrasto.current = {
      ponteiroX: evento.clientX,
      ponteiroY: evento.clientY,
      x: estado.x,
      y: estado.y,
    };
    evento.currentTarget.setPointerCapture(evento.pointerId);
  }

  function arrastar(evento: PointerEvent<HTMLDivElement>) {
    const inicio = arrasto.current;
    if (!inicio) return;
    const x = Math.max(0, inicio.x + evento.clientX - inicio.ponteiroX);
    const y = Math.max(0, inicio.y + evento.clientY - inicio.ponteiroY);
    onMover(x, y);
  }

  function terminarArrasto() {
    arrasto.current = null;
  }

  return (
    <section
      aria-label={titulo}
      onPointerDown={onFocar}
      style={{ left: estado.x, top: estado.y, width: largura, zIndex: emFrente ? 20 : 10 }}
      className={cn(
        "absolute bg-dos-preto text-dos-verde",
        "border-4 border-dos-cinza [box-shadow:inset_-2px_-2px_0_0_#808080,4px_4px_0_0_#000]",
        estado.minimizada ? "hidden" : "flex flex-col",
      )}
    >
      <header
        onPointerDown={iniciarArrasto}
        onPointerMove={arrastar}
        onPointerUp={terminarArrasto}
        onPointerCancel={terminarArrasto}
        className="font-pixel flex cursor-move touch-none select-none items-center justify-between bg-dos-cinza px-2 py-1 text-[10px] text-dos-preto"
      >
        <span>{titulo}</span>
        <button
          type="button"
          onPointerDown={(evento) => evento.stopPropagation()}
          onClick={onMinimizar}
          aria-label={`Minimizar ${titulo}`}
          className="font-pixel border-2 border-dos-preto bg-dos-cinza px-1.5 leading-none hover:bg-dos-branco"
        >
          _
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-auto p-3 text-[22px] leading-tight">{children}</div>
    </section>
  );
}
