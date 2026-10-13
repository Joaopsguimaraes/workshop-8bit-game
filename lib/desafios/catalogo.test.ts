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

  it("o Prompt de referência do Desafio 1 atende Papel e Tarefa", () => {
    const desafio = buscarDesafio("trabalho-remoto");
    if (!desafio) throw new Error("Desafio 1 ausente");

    const avaliacao = avaliar(desafio.promptReferencia, desafio);
    const atendidos = avaliacao.criterios.filter((c) => c.atendido).map((c) => c.id);

    expect(atendidos).toEqual(expect.arrayContaining(["papel", "tarefa"]));
  });
});
