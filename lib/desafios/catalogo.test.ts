import { describe, expect, it } from "vitest";
import { avaliar } from "../avaliador/avaliador";
import { buscarDesafio, DESAFIOS } from "./catalogo";

describe("catálogo de Desafios", () => {
  it("traz o Desafio 1, de trabalho remoto, como primeiro da ordem", () => {
    expect(DESAFIOS[0]).toMatchObject({
      id: "trabalho-remoto",
      ordem: 1,
      titulo: "Vantagens e desvantagens do trabalho remoto",
    });
  });

  it("tem identificadores e ordens únicos", () => {
    const ids = DESAFIOS.map((d) => d.id);
    const ordens = DESAFIOS.map((d) => d.ordem);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(ordens).size).toBe(ordens.length);
  });

  it("busca um Desafio pelo identificador e devolve undefined para um desconhecido", () => {
    expect(buscarDesafio("trabalho-remoto")?.titulo).toBe(
      "Vantagens e desvantagens do trabalho remoto",
    );
    expect(buscarDesafio("nao-existe")).toBeUndefined();
  });

  it("traz os cinco Desafios do seed, em ordem de dificuldade", () => {
    expect(DESAFIOS.map((d) => d.id)).toEqual([
      "trabalho-remoto",
      "reuniao-alinhamento",
      "resumo-reuniao",
      "contrato-json",
      "pontos-do-email",
    ]);
  });

  it.each(
    DESAFIOS.map((desafio) => [desafio.titulo, desafio] as const),
  )("o Prompt de referência de '%s' tira 100", (_titulo, desafio) => {
    expect(avaliar(desafio.promptReferencia, desafio).nota).toBe(100);
  });

  it("o Prompt de referência do Desafio 1 avaliado no Desafio 2 perde a Tarefa", () => {
    const desafio1 = buscarDesafio("trabalho-remoto");
    const desafio2 = buscarDesafio("reuniao-alinhamento");
    if (!desafio1 || !desafio2) throw new Error("Desafio ausente");

    const tarefa = avaliar(desafio1.promptReferencia, desafio2).criterios.find((c) => c.id === "tarefa");

    expect(tarefa).toMatchObject({ atendido: false, pontos: 0 });
  });

  it("o Prompt de referência do Desafio 1 atende Papel e Tarefa", () => {
    const desafio = buscarDesafio("trabalho-remoto");
    if (!desafio) throw new Error("Desafio 1 ausente");

    const avaliacao = avaliar(desafio.promptReferencia, desafio);
    const atendidos = avaliacao.criterios.filter((c) => c.atendido).map((c) => c.id);

    expect(atendidos).toEqual(expect.arrayContaining(["papel", "tarefa"]));
  });
});
