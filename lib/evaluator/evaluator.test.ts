import { describe, expect, it } from "vitest";
import { evaluate, verdictForScore } from "./evaluator";
import type { Challenge } from "../challenges/types";

const challenge: Challenge = {
  id: "teste",
  order: 1,
  title: "Trabalho remoto",
  scenario: "Cenário de teste.",
  keywords: [
    ["trabalho remoto", "home office", "remote work"],
    ["vantagens", "prós", "pros", "advantages"],
    ["desvantagens", "contras", "cons", "disadvantages"],
  ],
  referencePrompt: "Referência de teste.",
};

function criterion(prompt: string, id: string) {
  const result = evaluate(prompt, challenge);
  const found = result.criteria.find((c) => c.id === id);
  if (!found) throw new Error(`criterion ${id} missing`);
  return found;
}

describe("Role criterion", () => {
  it("is met by a label with real content", () => {
    const role = criterion(
      "Papel: você é um consultor de RH experiente em trabalho remoto.",
      "role",
    );

    expect(role).toMatchObject({ met: true, points: 15, max: 15 });
    expect(role.excerpt).toContain("consultor de RH");
  });

  it("is met by a natural sentence in Portuguese", () => {
    expect(
      criterion("Atue como um consultor de RH experiente em trabalho remoto.", "role"),
    ).toMatchObject({ met: true, points: 15 });
  });

  it("is met by a natural sentence in English", () => {
    expect(
      criterion("You are an experienced HR consultant who knows remote work.", "role"),
    ).toMatchObject({ met: true, points: 15 });
  });

  it("does not score when the label comes without content", () => {
    const role = criterion("Papel: x. Contexto: sou de uma empresa grande.", "role");

    expect(role).toMatchObject({ met: false, points: 0, max: 15 });
    expect(role.tip).toEqual(expect.any(String));
    expect(role.excerpt).toBeUndefined();
  });
});

describe("role labels", () => {
  it("does not take a common sentence that starts with the word as a label", () => {
    expect(criterion("Papel do RH é cuidar das pessoas e da cultura da empresa.", "role")).toMatchObject({
      met: false,
    });
  });

  it("accepts a markdown label, like ## Papel", () => {
    expect(
      criterion("## Papel\nVocê é um consultor de RH experiente em trabalho remoto.", "role"),
    ).toMatchObject({ met: true });
  });
});

describe("Context criterion", () => {
  it("is met by a label with real content", () => {
    const context = criterion(
      "Contexto: estamos decidindo se mantemos o trabalho remoto em toda a empresa.",
      "context",
    );

    expect(context).toMatchObject({ met: true, points: 20, max: 20 });
  });

  it("is met by audience, situation and goal in Portuguese", () => {
    expect(criterion("O público é a diretoria, que quer uma visão equilibrada.", "context")).toMatchObject({ met: true });
    expect(criterion("Estamos decidindo se mantemos o modelo híbrido da equipe.", "context")).toMatchObject({ met: true });
    expect(criterion("O objetivo é apoiar a decisão sobre o escritório.", "context")).toMatchObject({ met: true });
  });

  it("is met by a natural sentence in English", () => {
    expect(criterion("The audience is the board, which wants a balanced view.", "context")).toMatchObject({ met: true });
    expect(criterion("We are deciding whether to keep remote work this year.", "context")).toMatchObject({ met: true });
  });

  it("does not score when the label comes without content", () => {
    expect(criterion("Contexto: x. Papel: x.", "context")).toMatchObject({ met: false, points: 0 });
  });
});

describe("Format criterion", () => {
  it("is met by a label with real content", () => {
    expect(criterion("Formato: duas listas com títulos, uma para cada lado.", "format")).toMatchObject({ met: true, points: 20, max: 20 });
  });

  it("is met by a natural sentence in Portuguese and in English", () => {
    expect(criterion("Responda em tópicos curtos sobre o assunto do Desafio.", "format")).toMatchObject({ met: true });
    expect(criterion("Devolva a resposta em JSON com os campos pedidos.", "format")).toMatchObject({ met: true });
    expect(criterion("Answer in a table with three columns for each item.", "format")).toMatchObject({ met: true });
  });

  it("is met by a number of items or a size in words", () => {
    expect(criterion("Liste 3 itens de cada lado sobre o tema escolhido.", "format")).toMatchObject({ met: true });
    expect(criterion("Escreva o resumo com no máximo 80 palavras no total.", "format")).toMatchObject({ met: true });
  });

  it("does not score when the label comes without content", () => {
    expect(criterion("Formato: x. Contexto: x.", "format")).toMatchObject({ met: false, points: 0 });
  });
});

describe("Constraints criterion", () => {
  it("is met by a label with real content", () => {
    expect(criterion("Restrições: não use jargão técnico nem opiniões pessoais.", "constraints")).toMatchObject({ met: true, points: 15, max: 15 });
  });

  it("is met by negatives and limits in Portuguese and in English", () => {
    expect(criterion("Não inclua opiniões pessoais na resposta final.", "constraints")).toMatchObject({ met: true });
    expect(criterion("Evite jargão técnico e use frases curtas e claras.", "constraints")).toMatchObject({ met: true });
    expect(criterion("Use apenas fatos verificáveis sobre o assunto.", "constraints")).toMatchObject({ met: true });
    expect(criterion("Don't include personal opinions in the answer.", "constraints")).toMatchObject({ met: true });
    expect(criterion("Avoid technical jargon and keep the sentences short.", "constraints")).toMatchObject({ met: true });
  });

  it("does not score when the label comes without content", () => {
    expect(criterion("Restrições: x. Exemplo: x.", "constraints")).toMatchObject({ met: false, points: 0 });
  });
});

describe("Examples criterion", () => {
  it("is met by a label with real content", () => {
    expect(criterion("Exemplo: vantagem é a economia com aluguel e deslocamento.", "examples")).toMatchObject({ met: true, points: 10, max: 10 });
  });

  it("is met by a natural sentence in Portuguese and in English", () => {
    expect(criterion("Dê um caso real, por exemplo, uma empresa que economizou aluguel.", "examples")).toMatchObject({ met: true });
    expect(criterion("Ex.: vantagem é a economia com aluguel e deslocamento.", "examples")).toMatchObject({ met: true });
    expect(criterion("Give a real case, for example a company that saved on rent.", "examples")).toMatchObject({ met: true });
  });

  it("is met by a quoted excerpt with at least 4 words", () => {
    expect(criterion("Responda no tom do cliente, como \"Olá, tudo bem com você?\"", "examples")).toMatchObject({ met: true });
    expect(criterion("Responda assim: “Prezada equipe, segue a pauta da reunião.”", "examples")).toMatchObject({ met: true });
  });

  it("does not score when the label comes without content", () => {
    expect(criterion("Exemplo: x. Papel: x.", "examples")).toMatchObject({ met: false, points: 0 });
  });
});

describe("Task criterion", () => {
  it("is met with an action verb and at least 2 keyword groups", () => {
    const task = criterion(
      "Liste as vantagens e desvantagens do trabalho remoto.",
      "task",
    );

    expect(task).toMatchObject({ met: true, points: 20, max: 20 });
    expect(task.excerpt).toContain("Liste");
  });

  it("accepts an English verb", () => {
    expect(
      criterion("Write the pros and cons of remote work.", "task"),
    ).toMatchObject({ met: true });
  });

  it("is not met with only one keyword group", () => {
    expect(criterion("Liste as vantagens de um modelo qualquer.", "task")).toMatchObject({
      met: false,
      points: 0,
    });
  });

  it("is not met without an action verb", () => {
    expect(criterion("Vantagens e desvantagens do trabalho remoto.", "task")).toMatchObject({
      met: false,
    });
  });

  it("does not count the word 'contrato' as the 'contra' of the disadvantages group", () => {
    expect(
      criterion("Liste o contrato de trabalho remoto e as vantagens dele.", "task"),
    ).toMatchObject({ met: true });
    expect(
      criterion("Liste o contrato de trabalho remoto e os pontos dele.", "task"),
    ).toMatchObject({ met: false });
  });
});

describe("label forms", () => {
  const content = "Este trecho tem conteúdo suficiente para contar.";
  const forms = (label: string) => [
    `${label}: ${content}`,
    `## ${label}\n${content}`,
    `**${label}**\n${content}`,
    `<${label.toLowerCase()}>${content}</${label.toLowerCase()}>`,
  ];
  const labels: [string, string][] = [
    ["role", "Papel"],
    ["role", "Role"],
    ["context", "Contexto"],
    ["context", "Context"],
    ["format", "Formato"],
    ["format", "Format"],
    ["constraints", "Restrições"],
    ["constraints", "Constraints"],
    ["examples", "Exemplo"],
    ["examples", "Examples"],
  ];

  it("a label whose content has a colon still counts", () => {
    expect(criterion("Papel: Consultor: experiente em gestão de pessoas da empresa.", "role")).toMatchObject({ met: true });
    expect(criterion("Contexto: Empresa: grande e multinacional com equipes espalhadas.", "context")).toMatchObject({ met: true });
  });

  it.each(
    labels.flatMap(([id, label]) => forms(label).map((prompt, form) => [id, label, form, prompt] as const)),
  )("recognizes the %s criterion by label '%s' in form %i", (id, _label, _form, prompt) => {
    expect(criterion(prompt, id)).toMatchObject({ met: true });
  });
});

describe("evaluation structure", () => {
  it("has the six criteria with weights 15, 20, 20, 20, 15 and 10, summing to 100", () => {
    const criteria = evaluate("oi", challenge).criteria;

    expect(criteria.map((c) => [c.id, c.max])).toEqual([
      ["role", 15],
      ["context", 20],
      ["task", 20],
      ["format", 20],
      ["constraints", 15],
      ["examples", 10],
    ]);
    expect(criteria.reduce((sum, c) => sum + c.max, 0)).toBe(100);
  });

  it("recognizes labels and markers regardless of case or accents", () => {
    expect(criterion("PAPEL: você é um consultor de RH experiente.", "role")).toMatchObject({ met: true });
    expect(criterion("restricoes: nao use jargao tecnico nem opinioes pessoais.", "constraints")).toMatchObject({ met: true });
  });

  it("gives a tip with a pt-BR mini-example for each criterion", () => {
    const tips = evaluate("oi", challenge).criteria.map((c) => c.tip ?? "");

    expect(tips).toHaveLength(6);
    tips.forEach((tip) => expect(tip).toMatch(/Ex(emplo)?[.:]/));
  });

  it("the same excerpt can score in Format and in Constraints", () => {
    const format = criterion("Liste as vantagens do trabalho remoto com no máximo 6 palavras por item.", "format");
    const constraints = criterion("Liste as vantagens do trabalho remoto com no máximo 6 palavras por item.", "constraints");

    expect(format).toMatchObject({ met: true });
    expect(constraints).toMatchObject({ met: true });
    expect(format.excerpt).toBe(constraints.excerpt);
  });

  it("a one-line prompt without structure scores low", () => {
    expect(evaluate("Liste as vantagens do trabalho remoto.", challenge).score).toBeLessThan(50);
  });

  it("labels with 1 word of content, in every criterion, add up to less than 20", () => {
    const emptyLabels = "Papel: x. Contexto: x. Formato: x. Restrições: x. Exemplo: x.";

    expect(evaluate(emptyLabels, challenge).score).toBeLessThan(20);
  });
});

describe("score and verdict", () => {
  const optimal = "Papel: você é um consultor de RH experiente. Liste as vantagens e desvantagens do trabalho remoto.";

  it("adds up the points of the met criteria", () => {
    expect(evaluate(optimal, challenge)).toMatchObject({ score: 35 });
  });

  it("zeroes the score when no criterion is met, with a tip on each one", () => {
    const evaluation = evaluate("oi", challenge);

    expect(evaluation.score).toBe(0);
    expect(evaluation.criteria.every((c) => !c.met && c.tip)).toBe(true);
  });

  it("shows an excerpt only on met criteria and a tip only on failed ones", () => {
    const task = evaluate(optimal, challenge).criteria.find((c) => c.id === "task");

    expect(task?.excerpt).toBeDefined();
    expect(task?.tip).toBeUndefined();
  });

  it.each([
    [100, "Na mosca!"],
    [99, "Quase lá"],
    [80, "Quase lá"],
    [79, "No caminho certo"],
    [50, "No caminho certo"],
    [49, "Longe do alvo"],
    [0, "Longe do alvo"],
  ])("score %i has the verdict '%s'", (score, title) => {
    expect(verdictForScore(score).title).toBe(title);
  });
});
