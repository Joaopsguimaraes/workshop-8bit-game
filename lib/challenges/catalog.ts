import { CHALLENGES_SEED } from "./seed";
import type { Challenge } from "./types";

// Catalog loaded from the versioned seed; challenges are not stored in the database.
export const CHALLENGES: Challenge[] = [...CHALLENGES_SEED].sort((a, b) => a.order - b.order);

export function findChallenge(id: string, challenges: Challenge[] = CHALLENGES): Challenge | undefined {
  return challenges.find((challenge) => challenge.id === id);
}
