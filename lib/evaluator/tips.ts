import { CRITERIA, type CriterionResult } from "./evaluator";
import type { Reference } from "./criteria";

export type Tip = {
  id: string;
  name: string;
  tip: string;
  reference: Reference;
  pointsLost: number;
};

// Tips for the Criteria that are missing or partial, the largest loss first. Ties keep the Criteria order.
// A Criterion at its maximum gives no tip. The reference comes from the Criterion, not from the stored
// Evaluation, so Attempts saved before a reference existed still get their tips.
export function tipsFor(criteria: CriterionResult[]): Tip[] {
  return criteria
    .flatMap((result): Tip[] => {
      const criterion = CRITERIA.find((item) => item.id === result.id);
      if (!criterion || result.tip === undefined || result.points >= result.max) return [];
      return [
        {
          id: result.id,
          name: result.name,
          tip: result.tip,
          reference: criterion.reference,
          pointsLost: result.max - result.points,
        },
      ];
    })
    .sort((a, b) => b.pointsLost - a.pointsLost);
}
