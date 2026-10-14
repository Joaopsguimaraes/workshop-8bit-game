import { readItem, writeItem } from "./storage";

const KEY = "workshop.som";

// Sound preference: off by default, saved in the browser.
export function readSoundPreference(): boolean {
  return readItem(KEY) === "ligado";
}

export function saveSoundPreference(on: boolean): void {
  writeItem(KEY, on ? "ligado" : "desligado");
}

export type Effect = "send" | "score" | "rise" | "podium";

// 8-bit notes: [frequency in Hz, duration in seconds], played in sequence.
const NOTES: Record<Effect, [number, number][]> = {
  send: [
    [880, 0.05],
    [1320, 0.08],
  ],
  score: [
    [523, 0.08],
    [659, 0.08],
    [784, 0.14],
  ],
  rise: [
    [523, 0.07],
    [659, 0.07],
    [784, 0.07],
    [1047, 0.22],
  ],
  podium: [
    [659, 0.1],
    [784, 0.1],
    [1047, 0.1],
    [784, 0.08],
    [1047, 0.4],
  ],
};

let context: AudioContext | null = null;

// Plays an effect. Without audio support (or without a player gesture), the game stays silent.
export function playEffect(effect: Effect): void {
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume();

    let instant = context.currentTime;
    for (const [frequency, duration] of NOTES[effect]) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "square";
      oscillator.frequency.value = frequency;
      gain.gain.value = 0.06;
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(instant);
      oscillator.stop(instant + duration);
      instant += duration;
    }
  } catch {
    // No audio available, nothing to do.
  }
}
