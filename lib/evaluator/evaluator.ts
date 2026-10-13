import type { Challenge } from "../challenges/types";
import { CONTEXT, EXAMPLES, FORMAT, ROLE, CONSTRAINTS, TASK, type Criterion } from "./criteria";

export type Evaluation = {
  score: number;
  verdict: { title: string; text: string };
  criteria: CriterionResult[];
};

export type CriterionResult = {
  id: string;
  name: string;
  met: boolean;
  points: number;
  max: number;
  tip?: string;
  excerpt?: string;
};

const CRITERIA: Criterion[] = [ROLE, CONTEXT, TASK, FORMAT, CONSTRAINTS, EXAMPLES];

export function verdictForScore(score: number): Evaluation["verdict"] {
  if (score >= 100) return { title: "Na mosca!", text: "Prompt perfeito. Estrutura completa." };
  if (score >= 80) return { title: "Quase lá", text: "Falta pouco. Veja as dicas dos Critérios que faltaram." };
  if (score >= 50) return { title: "No caminho certo", text: "A base está boa. Acrescente o que falta." };
  return { title: "Longe do alvo", text: "Ainda faltam partes importantes na estrutura do prompt." };
}

// Evaluator: pure function. The score is the sum of the points of the met criteria.
export function evaluate(prompt: string, challenge: Challenge): Evaluation {
  const criteria = CRITERIA.map((criterion): CriterionResult => {
    const recognized = criterion.check(prompt, challenge);
    const base = { id: criterion.id, name: criterion.name, max: criterion.max };
    if (recognized) {
      return { ...base, met: true, points: criterion.max, excerpt: recognized.excerpt };
    }
    return { ...base, met: false, points: 0, tip: criterion.tip };
  });

  const score = criteria.reduce((sum, criterion) => sum + criterion.points, 0);
  return { score, verdict: verdictForScore(score), criteria };
}
