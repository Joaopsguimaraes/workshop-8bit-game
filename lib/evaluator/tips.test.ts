import { describe, expect, it } from "vitest";
import { evaluate, type CriterionResult } from "./evaluator";
import { tipsFor } from "./tips";
import { findChallenge } from "../challenges/catalog";

function result(id: string, max: number, points: number): CriterionResult {
  return {
    id,
    name: id,
    level: points === 0 ? "missing" : points < max ? "partial" : "full",
    points,
    max,
    tip: points < max ? `dica de ${id}` : undefined,
  };
}

describe("tipsFor", () => {
  it("orders the tips by the points lost, the largest loss first", () => {
    const criteria = [
      result("role", 15, 15),
      result("context", 15, 0),
      result("task", 20, 14),
      result("format", 15, 10),
    ];

    expect(tipsFor(criteria).map((tip) => [tip.id, tip.pointsLost])).toEqual([
      ["context", 15],
      ["task", 6],
      ["format", 5],
    ]);
  });

  it("keeps the Criteria order when two tips lose the same points", () => {
    const criteria = [result("constraints", 10, 0), result("examples", 10, 0)];

    expect(tipsFor(criteria).map((tip) => tip.id)).toEqual(["constraints", "examples"]);
  });

  it("gives no tip for a Criterion at its maximum", () => {
    const criteria = [result("role", 15, 15), result("uncertainty", 5, 5)];

    expect(tipsFor(criteria)).toEqual([]);
  });

  it("carries the tip text, the points lost and the Anthropic reference of the Criterion", () => {
    const [tip] = tipsFor([result("delimiters", 10, 3)]);

    expect(tip).toMatchObject({
      id: "delimiters",
      tip: "dica de delimiters",
      pointsLost: 7,
      reference: { url: expect.stringContaining("claude-prompting-best-practices") },
    });
  });

  it("cites the workshop guide, not the official page, for Incerteza", () => {
    const [tip] = tipsFor([result("uncertainty", 5, 0)]);

    expect(tip.reference.url).toBeUndefined();
    expect(tip.reference.label).toMatch(/Guia de um bom prompt/);
  });

  it("still gives tips for an Attempt saved before references existed", () => {
    const stored = { id: "role", name: "Papel", level: "missing" as const, points: 0, max: 15, tip: "dica" };

    expect(tipsFor([stored]).map((tip) => tip.id)).toEqual(["role"]);
  });

  it("gives no tip for a Criterion without tip text", () => {
    const criteria = [{ ...result("role", 15, 15), tip: undefined }];

    expect(tipsFor(criteria)).toEqual([]);
  });

  it("gives no tips for the seed Reference prompt, which scores 100", () => {
    const challenge = findChallenge("trabalho-remoto");
    if (!challenge) throw new Error("Challenge 1 missing");

    const evaluation = evaluate(challenge.referencePrompt, challenge);

    expect(evaluation.score).toBe(100);
    expect(tipsFor(evaluation.criteria)).toEqual([]);
  });
});
