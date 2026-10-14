import { describe, expect, it } from "vitest";
import { evaluate, verdictForScore } from "./evaluator";
import type { Challenge } from "../challenges/types";
import { findChallenge } from "../challenges/catalog";

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

function criterion(prompt: string, id: string, target: Challenge = challenge) {
  const result = evaluate(prompt, target);
  const found = result.criteria.find((c) => c.id === id);
  if (!found) throw new Error(`criterion ${id} missing`);
  return found;
}

describe("strength levels", () => {
  it("a label with content gives full points and the level 'full'", () => {
    expect(criterion("Papel: você é um consultor de RH experiente.", "role")).toMatchObject({
      level: "full",
      points: 15,
    });
  });

  it("a natural phrase gives 70% of the points and the level 'partial'", () => {
    expect(criterion("Atue como um consultor de RH experiente em trabalho remoto.", "role")).toMatchObject({
      level: "partial",
      points: 11,
    });
  });

  it("a weak mention gives 30% of the points and the level 'weak'", () => {
    expect(criterion("Um consultor chega amanhã.", "role")).toMatchObject({
      level: "weak",
      points: 5,
    });
  });

  it("a criterion with no signal is 'missing' with no points and a tip", () => {
    const role = criterion("Liste as coisas.", "role");

    expect(role).toMatchObject({ level: "missing", points: 0, max: 15 });
    expect(role.tip).toEqual(expect.any(String));
    expect(role.excerpt).toBeUndefined();
  });

  it("the highest level wins: a label and a natural phrase give the label's points, not the sum", () => {
    expect(
      criterion("Papel: consultor. Atue como um consultor de RH experiente.", "role"),
    ).toMatchObject({ level: "full", points: 15 });
  });

  it("a weak mention and a natural phrase give the natural phrase's points", () => {
    expect(
      criterion("Consultor. Atue como um consultor de RH experiente.", "role"),
    ).toMatchObject({ level: "partial", points: 11 });
  });

  it("rounds the points to the nearest integer", () => {
    expect(criterion("Um consultor chega amanhã.", "role").points).toBe(5);
    expect(criterion("Restrições: não use jargão.", "constraints").points).toBe(10);
  });
});

describe("label rule", () => {
  it("a label with a single word of content counts in full", () => {
    expect(criterion("Papel: consultor", "role")).toMatchObject({ level: "full", points: 15 });
  });

  it("a label with no word of content does not count", () => {
    expect(criterion("Papel:\nContexto: sou de uma empresa grande.", "role")).toMatchObject({
      level: "missing",
      points: 0,
    });
  });

  it("labels without content score zero in every criterion", () => {
    const emptyLabels = "Papel:\nContexto:\nFormato:\nRestrições:\nExemplo:";

    expect(evaluate(emptyLabels, challenge).score).toBe(0);
  });
});

describe("Role criterion", () => {
  it("is full with a label with real content", () => {
    const role = criterion(
      "Papel: você é um consultor de RH experiente em trabalho remoto.",
      "role",
    );

    expect(role).toMatchObject({ level: "full", points: 15, max: 15 });
    expect(role.excerpt).toContain("consultor de RH");
  });

  it("is partial with a natural sentence in Portuguese", () => {
    expect(
      criterion("Atue como um consultor de RH experiente em trabalho remoto.", "role"),
    ).toMatchObject({ level: "partial", points: 11 });
  });

  it("is partial with a natural sentence in English", () => {
    expect(
      criterion("You are an experienced HR consultant who knows remote work.", "role"),
    ).toMatchObject({ level: "partial", points: 11 });
  });

  it("does not take a common sentence that starts with the word as a label", () => {
    expect(criterion("Papel do RH é cuidar das pessoas e da cultura da empresa.", "role")).toMatchObject({
      level: "missing",
    });
  });

  it("accepts a markdown label, like ## Papel", () => {
    expect(
      criterion("## Papel\nVocê é um consultor de RH experiente em trabalho remoto.", "role"),
    ).toMatchObject({ level: "full" });
  });

  it("accepts the XML label <papel>…</papel>", () => {
    expect(
      criterion("<papel>Você é um consultor de RH experiente em trabalho remoto.</papel>", "role"),
    ).toMatchObject({ level: "full", points: 15 });
  });
});

describe("Context criterion", () => {
  it("is full with a label with real content", () => {
    const context = criterion(
      "Contexto: estamos decidindo se mantemos o trabalho remoto em toda a empresa.",
      "context",
    );

    expect(context).toMatchObject({ level: "full", points: 15, max: 15 });
  });

  it("is partial with audience, situation and goal in Portuguese", () => {
    expect(criterion("O público é a diretoria, que quer uma visão equilibrada.", "context")).toMatchObject({ level: "partial" });
    expect(criterion("Estamos decidindo se mantemos o modelo híbrido da equipe.", "context")).toMatchObject({ level: "partial" });
    expect(criterion("O objetivo é apoiar a decisão sobre o escritório.", "context")).toMatchObject({ level: "partial" });
  });

  it("is partial with a natural sentence in English", () => {
    expect(criterion("The audience is the board, which wants a balanced view.", "context")).toMatchObject({ level: "partial" });
    expect(criterion("We are deciding whether to keep remote work this year.", "context")).toMatchObject({ level: "partial" });
  });

  it("is weak with the word 'contexto' alone", () => {
    expect(criterion("Este contexto é importante.", "context")).toMatchObject({ level: "weak", points: 5 });
  });

  it("does not score when the label comes without content", () => {
    expect(criterion("Contexto:\nPapel: você é um consultor de RH experiente.", "context")).toMatchObject({ level: "missing", points: 0 });
  });
});

describe("Format criterion", () => {
  it("is full with a label with real content", () => {
    expect(criterion("Formato: duas listas com títulos, uma para cada lado.", "format")).toMatchObject({ level: "full", points: 15, max: 15 });
  });

  it("is partial with a natural sentence in Portuguese and in English", () => {
    expect(criterion("Responda em tópicos curtos sobre o assunto do Desafio.", "format")).toMatchObject({ level: "partial" });
    expect(criterion("Devolva a resposta em JSON com os campos pedidos.", "format")).toMatchObject({ level: "partial" });
    expect(criterion("Answer in a table with three columns for each item.", "format")).toMatchObject({ level: "partial" });
  });

  it("is partial with a number of items or a size in words", () => {
    expect(criterion("Liste 3 itens de cada lado sobre o tema escolhido.", "format")).toMatchObject({ level: "partial" });
    expect(criterion("Escreva o resumo com no máximo 80 palavras no total.", "format")).toMatchObject({ level: "partial" });
  });

  it("is weak with the word 'formato' alone", () => {
    expect(criterion("Use o formato certo.", "format")).toMatchObject({ level: "weak", points: 5 });
  });

  it("does not score when the label comes without content", () => {
    expect(criterion("Formato:\nContexto: x.", "format")).toMatchObject({ level: "missing", points: 0 });
  });
});

describe("Constraints criterion", () => {
  it("is full with a label with real content", () => {
    expect(criterion("Restrições: não use jargão técnico nem opiniões pessoais.", "constraints")).toMatchObject({ level: "full", points: 10, max: 10 });
  });

  it("is partial with negatives and limits in Portuguese and in English", () => {
    expect(criterion("Não inclua opiniões pessoais na resposta final.", "constraints")).toMatchObject({ level: "partial", points: 7 });
    expect(criterion("Evite jargão técnico e use frases curtas e claras.", "constraints")).toMatchObject({ level: "partial" });
    expect(criterion("Use apenas fatos verificáveis sobre o assunto.", "constraints")).toMatchObject({ level: "partial" });
    expect(criterion("Don't include personal opinions in the answer.", "constraints")).toMatchObject({ level: "partial" });
    expect(criterion("Avoid technical jargon and keep the sentences short.", "constraints")).toMatchObject({ level: "partial" });
  });

  it("is weak with 'sem' alone", () => {
    expect(criterion("Sem opiniões pessoais.", "constraints")).toMatchObject({ level: "weak", points: 3 });
  });

  it("does not score when the label comes without content", () => {
    expect(criterion("Restrições:\nExemplo: x.", "constraints")).toMatchObject({ level: "missing", points: 0 });
  });
});

describe("Examples criterion", () => {
  it("is full with a label with real content", () => {
    expect(criterion("Exemplo: vantagem é a economia com aluguel e deslocamento.", "examples")).toMatchObject({ level: "full", points: 10, max: 10 });
  });

  it("is partial with a natural sentence in Portuguese and in English", () => {
    expect(criterion("Dê um caso real, por exemplo, uma empresa que economizou aluguel.", "examples")).toMatchObject({ level: "partial", points: 7 });
    expect(criterion("Ex.: vantagem é a economia com aluguel e deslocamento.", "examples")).toMatchObject({ level: "partial" });
    expect(criterion("Give a real case, for example a company that saved on rent.", "examples")).toMatchObject({ level: "partial" });
  });

  it("is partial with a quoted excerpt of at least 4 words", () => {
    expect(criterion("Responda no tom do cliente, como \"Olá, tudo bem com você?\"", "examples")).toMatchObject({ level: "partial" });
    expect(criterion("Responda assim: “Prezada equipe, segue a pauta da reunião.”", "examples")).toMatchObject({ level: "partial" });
  });

  it("is weak with the word 'exemplo' alone", () => {
    expect(criterion("Use um exemplo simples.", "examples")).toMatchObject({ level: "weak", points: 3 });
  });

  it("does not score when the label comes without content", () => {
    expect(criterion("Exemplo:\nPapel: você é consultor de RH.", "examples")).toMatchObject({ level: "missing", points: 0 });
  });
});

describe("Task criterion", () => {
  it("is full with a label and one Keywords group", () => {
    const task = criterion("Tarefa: liste as vantagens do trabalho remoto.", "task");

    expect(task).toMatchObject({ level: "full", points: 20, max: 20 });
  });

  it("is full with the Markdown label **Tarefa**", () => {
    expect(criterion("**Tarefa**\nListe as vantagens do trabalho remoto.", "task")).toMatchObject({ level: "full" });
  });

  it("is partial with an action verb and one Keywords group", () => {
    const task = criterion("Liste as vantagens e desvantagens do trabalho remoto.", "task");

    expect(task).toMatchObject({ level: "partial", points: 14, max: 20 });
    expect(task.excerpt).toContain("Liste");
  });

  it("is partial with a verb from the broader list in the infinitive, like 'Deve marcar'", () => {
    expect(criterion("Deve marcar uma reunião sobre o trabalho remoto.", "task")).toMatchObject({ level: "partial" });
  });

  it("accepts an English verb", () => {
    expect(criterion("Write the pros and cons of remote work.", "task")).toMatchObject({ level: "partial" });
  });

  it("is weak with an action verb alone", () => {
    expect(criterion("Liste o contrato da equipe.", "task")).toMatchObject({ level: "weak", points: 6 });
  });

  it("is weak with a Keywords group alone", () => {
    expect(criterion("Vantagens e desvantagens do trabalho remoto.", "task")).toMatchObject({ level: "weak", points: 6 });
  });

  it("is not full for a prompt that addresses another Challenge", () => {
    const other = findChallenge("reuniao-alinhamento");
    if (!other) throw new Error("Challenge 2 missing");

    expect(criterion("Tarefa: escreva um e-mail sobre a reunião de alinhamento.", "task", challenge)).toMatchObject({ level: "weak" });
    expect(criterion("Tarefa: escreva um e-mail sobre a reunião de alinhamento.", "task", other)).toMatchObject({ level: "full" });
  });

  it("does not count the word 'contrato' as the 'contra' of the disadvantages group", () => {
    expect(criterion("Liste o contrato da equipe.", "task")).toMatchObject({ level: "weak" });
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
    expect(criterion("Papel: Consultor: experiente em gestão de pessoas da empresa.", "role")).toMatchObject({ level: "full" });
    expect(criterion("Contexto: Empresa: grande e multinacional com equipes espalhadas.", "context")).toMatchObject({ level: "full" });
  });

  it.each(
    labels.flatMap(([id, label]) => forms(label).map((prompt, form) => [id, label, form, prompt] as const)),
  )("recognizes the %s criterion by label '%s' in form %i", (id, _label, _form, prompt) => {
    expect(criterion(prompt, id)).toMatchObject({ level: "full" });
  });
});

describe("evaluation structure", () => {
  it("has the six criteria with weights 15, 15, 20, 15, 10 and 10", () => {
    const criteria = evaluate("oi", challenge).criteria;

    expect(criteria.map((c) => [c.id, c.max])).toEqual([
      ["role", 15],
      ["context", 15],
      ["task", 20],
      ["format", 15],
      ["constraints", 10],
      ["examples", 10],
    ]);
  });

  it("recognizes labels and markers regardless of case or accents", () => {
    expect(criterion("PAPEL: você é um consultor de RH experiente.", "role")).toMatchObject({ level: "full" });
    expect(criterion("restricoes: nao use jargao tecnico nem opinioes pessoais.", "constraints")).toMatchObject({ level: "full" });
  });

  it("gives a tip with a pt-BR mini-example for each criterion", () => {
    const tips = evaluate("oi", challenge).criteria.map((c) => c.tip ?? "");

    expect(tips).toHaveLength(6);
    tips.forEach((tip) => expect(tip).toMatch(/Ex(emplo)?[.:]/));
  });

  it("the same excerpt can score in Format and in Constraints", () => {
    const format = criterion("Liste as vantagens do trabalho remoto com no máximo 6 palavras por item.", "format");
    const constraints = criterion("Liste as vantagens do trabalho remoto com no máximo 6 palavras por item.", "constraints");

    expect(format).toMatchObject({ level: "partial" });
    expect(constraints).toMatchObject({ level: "partial" });
    expect(format.excerpt).toBe(constraints.excerpt);
  });

  it("a one-line prompt without structure scores low", () => {
    expect(evaluate("Liste as vantagens do trabalho remoto.", challenge).score).toBeLessThan(50);
  });

  it("the regression prompt of the email Challenge scores more than 15, with Papel and Tarefa recognized", () => {
    const email = findChallenge("reuniao-alinhamento");
    if (!email) throw new Error("Challenge 2 missing");
    const prompt =
      "Você é um gestor de produto que gerencia um time de três pessoas. Deve marcar uma reunião de alinhamento com toda equipe com a data mais próxima disponível às 15:00 com todos da equipe.";

    const evaluation = evaluate(prompt, email);

    expect(evaluation.score).toBeGreaterThan(15);
    expect(criterion(prompt, "role", email)).toMatchObject({ level: "partial" });
    expect(criterion(prompt, "task", email)).toMatchObject({ level: "partial" });
  });
});

describe("score and verdict", () => {
  const optimal = "Papel: você é um consultor de RH experiente. Liste as vantagens e desvantagens do trabalho remoto.";

  it("adds up the points of each criterion, each scaled by its level", () => {
    // Papel is a label (15); Tarefa is a verb with one Keywords group (70% of 20 = 14).
    expect(evaluate(optimal, challenge)).toMatchObject({ score: 29 });
  });

  it("zeroes the score when no criterion is met, with a tip on each one", () => {
    const evaluation = evaluate("oi", challenge);

    expect(evaluation.score).toBe(0);
    expect(evaluation.criteria.every((c) => c.level === "missing" && c.tip)).toBe(true);
  });

  it("shows an excerpt on every recognized criterion, and a tip only when points are below the maximum", () => {
    const evaluation = evaluate(optimal, challenge);
    const role = evaluation.criteria.find((c) => c.id === "role");
    const task = evaluation.criteria.find((c) => c.id === "task");

    expect(role).toMatchObject({ level: "full" });
    expect(role?.tip).toBeUndefined();
    expect(task?.excerpt).toBeDefined();
    expect(task?.tip).toBeDefined();
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
