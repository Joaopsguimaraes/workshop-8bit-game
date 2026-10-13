import { describe, expect, it } from "vitest";
import { criarPresenca } from "./presenca";

describe("presença", () => {
  it("considera online o Jogador com uma conexão aberta", () => {
    const presenca = criarPresenca();

    presenca.conectar("jogador-1", "socket-a");

    expect(presenca.estaOnline("jogador-1")).toBe(true);
    expect(presenca.estaOnline("jogador-2")).toBe(false);
  });

  it("continua online enquanto houver outra aba aberta", () => {
    const presenca = criarPresenca();
    presenca.conectar("jogador-1", "socket-a");
    presenca.conectar("jogador-1", "socket-b");

    presenca.desconectar("socket-a");

    expect(presenca.estaOnline("jogador-1")).toBe(true);
  });

  it("fica offline quando a última conexão fecha", () => {
    const presenca = criarPresenca();
    presenca.conectar("jogador-1", "socket-a");
    presenca.conectar("jogador-1", "socket-b");

    presenca.desconectar("socket-a");
    presenca.desconectar("socket-b");

    expect(presenca.estaOnline("jogador-1")).toBe(false);
  });

  it("ignora desconexão de socket que não estava registrado", () => {
    const presenca = criarPresenca();

    expect(() => presenca.desconectar("socket-fantasma")).not.toThrow();
  });
});
