// Scoring and tie-break rules, no I/O. The Scoreboard and the Round champion use the same order.

export type AttemptRecord = {
  id: string;
  playerId: string;
  roundId: string;
  number: number;
  score: number;
  createdAt: Date;
};

// A player's mark: how many points they scored, how many attempts it took, and when they reached the total.
export type Mark = { points: number; attemptsUsed: number; reachedAt: number };

export type RoundRanking<T extends AttemptRecord> = {
  playerId: string;
  best: T;
  attemptsUsed: number;
};

// Highest score first; fewer attempts used; then whoever reached the points first.
export function compareMarks(a: Mark, b: Mark): number {
  return (
    higherFirst(a.points, b.points) ||
    lowerFirst(a.attemptsUsed, b.attemptsUsed) ||
    lowerFirst(a.reachedAt, b.reachedAt)
  );
}

function higherFirst(a: number, b: number): number {
  return a === b ? 0 : a > b ? -1 : 1;
}

function lowerFirst(a: number, b: number): number {
  return a === b ? 0 : a < b ? -1 : 1;
}

function inSubmissionOrder<T extends AttemptRecord>(attempts: T[]): T[] {
  return [...attempts].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.number - b.number,
  );
}

// Attempt with the highest score; on a score tie, the one submitted first.
export function bestAttempt<T extends AttemptRecord>(attempts: T[]): T | undefined {
  return inSubmissionOrder(attempts).reduce<T | undefined>(
    (best, current) => (!best || current.score > best.score ? current : best),
    undefined,
  );
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const group = groups.get(key(item)) ?? [];
    group.push(item);
    groups.set(key(item), group);
  }
  return groups;
}

// Rankings of a round: only players with a score above zero, in tie-break order.
export function roundRanking<T extends AttemptRecord>(attemptsOfRound: T[]): RoundRanking<T>[] {
  const rankings: RoundRanking<T>[] = [];
  for (const [playerId, attempts] of groupBy(attemptsOfRound, (t) => t.playerId)) {
    const best = bestAttempt(attempts);
    if (!best || best.score <= 0) continue;
    rankings.push({ playerId, best, attemptsUsed: attempts.length });
  }
  return rankings.sort((a, b) => compareMarks(markInRound(a), markInRound(b)));
}

function markInRound<T extends AttemptRecord>(ranking: RoundRanking<T>): Mark {
  return {
    points: ranking.best.score,
    attemptsUsed: ranking.attemptsUsed,
    reachedAt: ranking.best.createdAt.getTime(),
  };
}

// Scoreboard points: sums, per round, the score of the best attempt. Only counts the attempts
// of the rounds the player scored in. `reachedAt` is when the final total was reached.
export function scoreboardMark(attempts: AttemptRecord[]): Mark {
  const bestByRound = new Map<string, number>();
  for (const [roundId, attemptsOfRound] of groupBy(attempts, (t) => t.roundId)) {
    const best = bestAttempt(attemptsOfRound);
    bestByRound.set(roundId, best?.score ?? 0);
  }
  const points = [...bestByRound.values()].reduce((sum, score) => sum + score, 0);

  let attemptsUsed = 0;
  for (const [roundId, attemptsOfRound] of groupBy(attempts, (t) => t.roundId)) {
    if ((bestByRound.get(roundId) ?? 0) > 0) attemptsUsed += attemptsOfRound.length;
  }

  return { points, attemptsUsed, reachedAt: momentTotalReached(attempts, points) };
}

// First instant at which the total reached its final value. With no points, it never reached it.
function momentTotalReached(attempts: AttemptRecord[], final: number): number {
  if (final === 0) return Number.POSITIVE_INFINITY;

  const bestByRound = new Map<string, number>();
  let total = 0;
  for (const attempt of inSubmissionOrder(attempts)) {
    const current = bestByRound.get(attempt.roundId) ?? 0;
    if (attempt.score <= current) continue;
    bestByRound.set(attempt.roundId, attempt.score);
    total += attempt.score - current;
    if (total >= final) return attempt.createdAt.getTime();
  }
  return Number.POSITIVE_INFINITY;
}

export function groupByPlayer<T extends AttemptRecord>(attempts: T[]): Map<string, T[]> {
  return groupBy(attempts, (t) => t.playerId);
}
