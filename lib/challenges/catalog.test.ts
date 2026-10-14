import { describe, expect, it } from "vitest";
import { evaluate } from "../evaluator/evaluator";
import { findChallenge, CHALLENGES } from "./catalog";

describe("challenge catalog", () => {
  it("brings challenge 1, remote work, first in order", () => {
    expect(CHALLENGES[0]).toMatchObject({
      id: "trabalho-remoto",
      order: 1,
      title: "Vantagens e desvantagens do trabalho remoto",
    });
  });

  it("has unique ids and orders", () => {
    const ids = CHALLENGES.map((c) => c.id);
    const orders = CHALLENGES.map((c) => c.order);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(orders).size).toBe(orders.length);
  });

  it("finds a challenge by id and returns undefined for an unknown one", () => {
    expect(findChallenge("trabalho-remoto")?.title).toBe(
      "Vantagens e desvantagens do trabalho remoto",
    );
    expect(findChallenge("nao-existe")).toBeUndefined();
  });

  it("brings the five seed challenges, in order of difficulty", () => {
    expect(CHALLENGES.map((c) => c.id)).toEqual([
      "trabalho-remoto",
      "reuniao-alinhamento",
      "resumo-reuniao",
      "contrato-json",
      "pontos-do-email",
    ]);
  });

  it.each(
    CHALLENGES.map((challenge) => [challenge.title, challenge] as const),
  )("the reference prompt of '%s' scores 100", (_title, challenge) => {
    expect(evaluate(challenge.referencePrompt, challenge).score).toBe(100);
  });

  it("the reference prompt of challenge 1 evaluated on challenge 2 loses the task", () => {
    const challenge1 = findChallenge("trabalho-remoto");
    const challenge2 = findChallenge("reuniao-alinhamento");
    if (!challenge1 || !challenge2) throw new Error("Challenge missing");

    const task = evaluate(challenge1.referencePrompt, challenge2).criteria.find((c) => c.id === "task");

    expect(task).toMatchObject({ level: "weak", points: 6 });
    expect(task?.level).not.toBe("full");
  });

  it("the reference prompt of challenge 1 meets role and task", () => {
    const challenge = findChallenge("trabalho-remoto");
    if (!challenge) throw new Error("Challenge 1 missing");

    const evaluation = evaluate(challenge.referencePrompt, challenge);
    const full = evaluation.criteria.filter((c) => c.level === "full").map((c) => c.id);

    expect(full).toEqual(expect.arrayContaining(["role", "task"]));
  });
});
