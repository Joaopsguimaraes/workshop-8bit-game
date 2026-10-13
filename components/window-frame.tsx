"use client";

import type { PointerEvent, ReactNode } from "react";
import { useRef } from "react";
import type { WindowState } from "@/lib/client/windows";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  state: WindowState;
  inFront: boolean;
  width: number;
  onMove: (x: number, y: number) => void;
  onFocus: () => void;
  onMinimize: () => void;
  children: ReactNode;
};

// MS-DOS style window: drag by the title bar and minimize to the taskbar.
export function WindowFrame({
  title,
  state,
  inFront,
  width,
  onMove,
  onFocus,
  onMinimize,
  children,
}: Props) {
  const dragRef = useRef<{ pointerX: number; pointerY: number; x: number; y: number } | null>(
    null,
  );

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    onFocus();
    dragRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      x: state.x,
      y: state.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const start = dragRef.current;
    if (!start) return;
    const x = Math.max(0, start.x + event.clientX - start.pointerX);
    const y = Math.max(0, start.y + event.clientY - start.pointerY);
    onMove(x, y);
  }

  function endDrag() {
    dragRef.current = null;
  }

  return (
    <section
      aria-label={title}
      onPointerDown={onFocus}
      style={{ left: state.x, top: state.y, width, zIndex: inFront ? 20 : 10 }}
      className={cn(
        "absolute bg-background text-foreground",
        "border-4 border-ring [box-shadow:inset_-2px_-2px_0_0_#808080,4px_4px_0_0_#000]",
        state.minimized ? "hidden" : "flex flex-col",
      )}
    >
      <header
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="font-pixel flex cursor-move touch-none select-none items-center justify-between bg-foreground px-2 py-1 text-[10px] text-background"
      >
        <span>{title}</span>
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onMinimize}
          aria-label={`Minimizar ${title}`}
          className="font-pixel border-2 border-background bg-foreground px-1.5 leading-none hover:bg-muted-foreground"
        >
          _
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-auto p-3 text-[22px] leading-tight">{children}</div>
    </section>
  );
}
