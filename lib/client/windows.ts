import { readItem, writeItem } from "./storage";

export type WindowId = "prompt" | "challenge" | "scoreboard" | "tips";

export type WindowState = {
  x: number;
  y: number;
  width: number;
  height: number;
  minimized: boolean;
};

export type WindowStates = Record<WindowId, WindowState>;

const KEY = "workshop.windows";

export const DEFAULT_WINDOWS: WindowStates = {
  prompt: { x: 32, y: 32, width: 560, height: 300, minimized: false },
  challenge: { x: 32, y: 360, width: 340, height: 240, minimized: false },
  scoreboard: { x: 640, y: 32, width: 360, height: 300, minimized: false },
  tips: { x: 640, y: 360, width: 360, height: 240, minimized: false },
};

// Merges what was saved with the defaults; invalid or missing data falls back to the defaults.
export function loadWindows(): WindowStates {
  const raw = readItem(KEY);
  if (!raw) return DEFAULT_WINDOWS;

  try {
    const saved = JSON.parse(raw) as Partial<Record<WindowId, Partial<WindowState>>>;
    const result = { ...DEFAULT_WINDOWS };
    for (const id of Object.keys(DEFAULT_WINDOWS) as WindowId[]) {
      const state = saved[id];
      if (!state) continue;
      result[id] = {
        x: typeof state.x === "number" ? state.x : DEFAULT_WINDOWS[id].x,
        y: typeof state.y === "number" ? state.y : DEFAULT_WINDOWS[id].y,
        width: typeof state.width === "number" ? state.width : DEFAULT_WINDOWS[id].width,
        height: typeof state.height === "number" ? state.height : DEFAULT_WINDOWS[id].height,
        minimized: state.minimized === true,
      };
    }
    return result;
  } catch {
    return DEFAULT_WINDOWS;
  }
}

export function saveWindows(state: WindowStates): void {
  writeItem(KEY, JSON.stringify(state));
}
