import type { Challenge } from "../challenges/types";
import {
  CONTEXT,
  CONSTRAINTS,
  DELIMITERS,
  EXAMPLES,
  FORMAT,
  ROLE,
  TASK,
  UNCERTAINTY,
  type Criterion,
  type Level,
} from "./criteria";

export type Evaluation = {
  score: number;
  verdict: { title: string; text: string };
  criteria: CriterionResult[];
};

export type CriterionResult = {
  id: string;
  name: string;
  level: Level | "missing";
  points: number;
  max: number;
  tip?: string;
  excerpt?: string;
};

const CRITERIA: Criterion[] = [ROLE, CONTEXT, TASK, FORMAT, CONSTRAINTS, EXAMPLES, DELIMITERS, UNCERTAINTY];

// Share of the Criterion's points reached by each strength level.
const SHARE: Record<Level, number> = { full: 1, partial: 0.7, weak: 0.3 };

export function verdictForScore(score: number): Evaluation["verdict"] {
  if (score >= 100) return { title: "Na mosca!", text: "Prompt perfeito. Estrutura completa." };
  if (score >= 80) return { title: "Quase lá", text: "Falta pouco. Veja as dicas dos Critérios que faltaram." };
  if (score >= 50) return { title: "No caminho certo", text: "A base está boa. Acrescente o que falta." };
  return { title: "Longe do alvo", text: "Ainda faltam partes importantes na estrutura do prompt." };
}

// Evaluator: pure function. The score is the sum of the points of each Criterion,
// each one scaled by the strength of its signal.
export function evaluate(prompt: string, challenge: Challenge): Evaluation {
  const criteria = CRITERIA.map((criterion): CriterionResult => {
    const recognized = criterion.check(prompt, challenge);
    const base = { id: criterion.id, name: criterion.name, max: criterion.max };
    if (!recognized) {
      return { ...base, level: "missing", points: 0, tip: criterion.tip };
    }
    const points = Math.round(criterion.max * SHARE[recognized.level]);
    const tip = points < criterion.max ? criterion.tip : undefined;
    return { ...base, level: recognized.level, points, tip, excerpt: recognized.excerpt };
  });

  const score = criteria.reduce((sum, criterion) => sum + criterion.points, 0);
  return { score, verdict: verdictForScore(score), criteria };
}
