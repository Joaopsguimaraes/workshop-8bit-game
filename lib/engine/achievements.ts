// Rules for the Achievements that depend on an attempt. No I/O: the Engine decides what to store.
export const ACHIEVEMENT_TYPES = [
  "bullseye",
  "first-try",
  "first-blood",
  "evolution",
  "round-champion",
] as const;

export type AchievementType = (typeof ACHIEVEMENT_TYPES)[number];

export const EVOLUTION_THRESHOLD = 30;

export type AcceptedAttempt = {
  number: number;
  score: number;
  // Score of the same player's 1st attempt in the round; absent when this attempt is the 1st one.
  firstScore?: number;
  // True when no attempt in the round had been accepted before this one.
  firstOfRound: boolean;
};

// Achievements this attempt alone grants. The "once per round" rule is up to the Engine.
export function achievementsForAttempt(attempt: AcceptedAttempt): AchievementType[] {
  const achievements: AchievementType[] = [];
  if (attempt.score === 100) achievements.push("bullseye");
  if (attempt.score === 100 && attempt.number === 1) achievements.push("first-try");
  if (attempt.firstOfRound) achievements.push("first-blood");
  if (
    attempt.number > 1 &&
    attempt.firstScore !== undefined &&
    attempt.score >= attempt.firstScore + EVOLUTION_THRESHOLD
  ) {
    achievements.push("evolution");
  }
  return achievements;
}

// Name shown on screen, in pt-BR.
export const ACHIEVEMENT_NAMES: Record<AchievementType, string> = {
  bullseye: "Na mosca",
  "first-try": "De primeira",
  "first-blood": "Primeiro sangue",
  evolution: "Evolução",
  "round-champion": "Campeão da Rodada",
};
