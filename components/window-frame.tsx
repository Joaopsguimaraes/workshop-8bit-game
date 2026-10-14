"use client";

import type { PointerEvent, ReactNode } from "react";
import { useRef } from "react";
import type { WindowState } from "@/lib/client/windows";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  state: WindowState;
  inFront: boolean;
  onMove: (x: number, y: number) => void;
  onResize: (width: number, height: number) => void;
  onFocus: () => void;
  onMinimize: () => void;
  children: ReactNode;
};

const MIN_WIDTH = 240;
const MIN_HEIGHT = 160;

type Drag = {
  mode: "move" | "resize";
  pointerX: number;
  pointerY: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

// MS-DOS style window: drag by the title bar, resize from the corner and minimize to the taskbar.
export function WindowFrame({
  title,
  state,
  inFront,
  onMove,
  onResize,
  onFocus,
  onMinimize,
  children,
}: Props) {
  const frameRef = useRef<HTMLElement>(null);
  const dragRef = useRef<Drag | null>(null);

  // The desktop area the window lives in (the <main> around it); windows stay inside it.
  function area() {
    const parent = frameRef.current?.parentElement;
    return {
      width: parent?.clientWidth ?? Infinity,
      height: parent?.clientHeight ?? Infinity,
    };
  }

  function startDrag(event: PointerEvent<HTMLElement>, mode: Drag["mode"]) {
    onFocus();
    dragRef.current = {
      mode,
      pointerX: event.clientX,
      pointerY: event.clientY,
      x: state.x,
      y: state.y,
      width: state.width,
      height: state.height,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const start = dragRef.current;
    if (!start) return;
    const bounds = area();
    const dx = event.clientX - start.pointerX;
    const dy = event.clientY - start.pointerY;

    if (start.mode === "move") {
      const x = clamp(start.x + dx, 0, bounds.width - state.width);
      const y = clamp(start.y + dy, 0, bounds.height - state.height);
      onMove(x, y);
      return;
    }

    const width = clamp(start.width + dx, MIN_WIDTH, bounds.width - state.x);
    const height = clamp(
      start.height + dy,
      MIN_HEIGHT,
      bounds.height - state.y,
    );
    onResize(width, height);
  }

  function endDrag() {
    dragRef.current = null;
  }

  return (
    <section
      ref={frameRef}
      aria-label={title}
      onPointerDown={onFocus}
      style={{
        left: state.x,
        top: state.y,
        width: state.width,
        height: state.height,
        zIndex: inFront ? 20 : 10,
      }}
      className={cn(
        "absolute bg-background text-foreground",
        "border-4 border-ring [box-shadow:inset_-2px_-2px_0_0_#808080,4px_4px_0_0_#000]",
        state.minimized ? "hidden" : "flex flex-col",
      )}
    >
      <header
        onPointerDown={(event) => startDrag(event, "move")}
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
      <div className="min-h-0 flex-1 overflow-auto p-3 text-[22px] leading-tight">
        {children}
      </div>
      <div
        role="presentation"
        onPointerDown={(event) => startDrag(event, "resize")}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="absolute right-0 bottom-0 size-4 cursor-se-resize touch-none bg-[linear-gradient(135deg,transparent_50%,#808080_50%,#808080_60%,transparent_60%,transparent_75%,#808080_75%)]"
      />
    </section>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, Math.max(min, max)));
}
