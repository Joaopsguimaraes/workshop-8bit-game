import { describe, expect, it } from "vitest";
import { avaliar, veredictoDaNota } from "./avaliador";
import type { Desafio } from "../desafios/tipos";

const desafio: Desafio = {
  id: "teste",
  ordem: 1,
  titulo: "Trabalho remoto",
  cenario: "Cenário de teste.",
  palavrasChave: [
    ["trabalho remoto", "home office", "remote work"],
    ["vantagens", "prós", "pros", "advantages"],
    ["desvantagens", "contras", "cons", "disadvantages"],
  ],
  promptReferencia: "Referência de teste.",
};

function criterio(prompt: string, id: string) {
  const resultado = avaliar(prompt, desafio);
  const encontrado = resultado.criterios.find((c) => c.id === id);
  if (!encontrado) throw new Error(`critério ${id} ausente`);
  return encontrado;
}

describe("Critério Papel", () => {
  it("é atendido por rótulo com conteúdo de verdade", () => {
    const papel = criterio(
      "Papel: você é um consultor de RH experiente em trabalho remoto.",
      "papel",
    );

    expect(papel).toMatchObject({ atendido: true, pontos: 15, maximo: 15 });
    expect(papel.trecho).toContain("consultor de RH");
  });

  it("é atendido por frase natural em português", () => {
    expect(
      criterio("Atue como um consultor de RH experiente em trabalho remoto.", "papel"),
    ).toMatchObject({ atendido: true, pontos: 15 });
  });

  it("é atendido por frase natural em inglês", () => {
    expect(
      criterio("You are an experienced HR consultant who knows remote work.", "papel"),
    ).toMatchObject({ atendido: true, pontos: 15 });
  });

  it("não pontua quando o rótulo vem sem conteúdo", () => {
    const papel = criterio("Papel: x. Contexto: sou de uma empresa grande.", "papel");

    expect(papel).toMatchObject({ atendido: false, pontos: 0, maximo: 15 });
    expect(papel.dica).toEqual(expect.any(String));
    expect(papel.trecho).toBeUndefined();
  });
});

describe("rótulos de Papel", () => {
  it("não toma uma frase comum que começa com a palavra como rótulo", () => {
    expect(criterio("Papel do RH é cuidar das pessoas e da cultura da empresa.", "papel")).toMatchObject({
      atendido: false,
    });
  });

  it("aceita rótulo em markdown, como ## Papel", () => {
    expect(
      criterio("## Papel\nVocê é um consultor de RH experiente em trabalho remoto.", "papel"),
    ).toMatchObject({ atendido: true });
  });
});

describe("Critério Tarefa", () => {
  it("é atendida com verbo de ação e pelo menos 2 grupos de Palavras-chave", () => {
    const tarefa = criterio(
      "Liste as vantagens e desvantagens do trabalho remoto.",
      "tarefa",
    );

    expect(tarefa).toMatchObject({ atendido: true, pontos: 20, maximo: 20 });
    expect(tarefa.trecho).toContain("Liste");
  });

  it("aceita verbo em inglês", () => {
    expect(
      criterio("Write the pros and cons of remote work.", "tarefa"),
    ).toMatchObject({ atendido: true });
  });

  it("não é atendida só com um grupo de Palavras-chave", () => {
    expect(criterio("Liste as vantagens de um modelo qualquer.", "tarefa")).toMatchObject({
      atendido: false,
      pontos: 0,
    });
  });

  it("não é atendida sem verbo de ação", () => {
    expect(criterio("Vantagens e desvantagens do trabalho remoto.", "tarefa")).toMatchObject({
      atendido: false,
    });
  });

  it("não conta a palavra 'contrato' como 'contra' do grupo de desvantagens", () => {
    expect(
      criterio("Liste o contrato de trabalho remoto e as vantagens dele.", "tarefa"),
    ).toMatchObject({ atendido: true });
    expect(
      criterio("Liste o contrato de trabalho remoto e os pontos dele.", "tarefa"),
    ).toMatchObject({ atendido: false });
  });
});

describe("nota e veredito", () => {
  const otimo = "Papel: você é um consultor de RH experiente. Liste as vantagens e desvantagens do trabalho remoto.";

  it("soma os pontos dos Critérios atendidos", () => {
    expect(avaliar(otimo, desafio)).toMatchObject({ nota: 35 });
  });

  it("zera a Nota quando nenhum Critério é atendido, com dica em cada um", () => {
    const avaliacao = avaliar("oi", desafio);

    expect(avaliacao.nota).toBe(0);
    expect(avaliacao.criterios.every((c) => !c.atendido && c.dica)).toBe(true);
  });

  it("mostra trecho só nos Critérios atendidos e dica só nos que falharam", () => {
    const tarefa = avaliar(otimo, desafio).criterios.find((c) => c.id === "tarefa");

    expect(tarefa?.trecho).toBeDefined();
    expect(tarefa?.dica).toBeUndefined();
  });

  it.each([
    [100, "Na mosca!"],
    [99, "Quase lá"],
    [80, "Quase lá"],
    [79, "No caminho certo"],
    [50, "No caminho certo"],
    [49, "Longe do alvo"],
    [0, "Longe do alvo"],
  ])("nota %i tem o veredito '%s'", (nota, titulo) => {
    expect(veredictoDaNota(nota).titulo).toBe(titulo);
  });
});
