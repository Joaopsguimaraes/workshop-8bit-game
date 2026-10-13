import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { criarMotor } from "./motor";
import { criarBancoDeTeste } from "./banco-de-teste";

let banco: ReturnType<typeof criarBancoDeTeste>;
let motor: ReturnType<typeof criarMotor>;

beforeEach(() => {
  banco = criarBancoDeTeste();
  motor = criarMotor(banco.prisma);
});

afterEach(async () => {
  await banco.fechar();
});

describe("entrar", () => {
  it("cria o Jogador com Avatar e devolve o token", async () => {
    const r = await motor.entrar("Élio");

    expect(r).toMatchObject({
      ok: true,
      jogador: { nickname: "Élio", iniciais: "EL" },
    });
    if (!r.ok) throw new Error("esperava sucesso");
    expect(r.token.length).toBeGreaterThanOrEqual(20);
  });

  it("recusa Nickname inválido com a mensagem da regra", async () => {
    expect(await motor.entrar("a")).toEqual({
      ok: false,
      erro: "O Nickname precisa ter pelo menos 2 caracteres.",
    });
  });

  it("trata 'João' e 'JOAO' como o mesmo Nickname", async () => {
    await motor.entrar("João");

    expect(await motor.entrar("JOAO")).toEqual({ ok: false, erro: "Nickname já em uso" });
  });

  it("não deixa dois Jogadores entrarem ao mesmo tempo com o mesmo Nickname", async () => {
    const resultados = await Promise.all([motor.entrar("Ana"), motor.entrar("ANA")]);

    expect(resultados.filter((r) => r.ok)).toHaveLength(1);
    expect(resultados).toContainEqual({ ok: false, erro: "Nickname já em uso" });
  });

  it("gera tokens diferentes para Jogadores diferentes", async () => {
    const a = await motor.entrar("Ana");
    const b = await motor.entrar("Bia");

    if (!a.ok || !b.ok) throw new Error("esperava sucesso");
    expect(a.token).not.toBe(b.token);
  });
});

describe("retomar", () => {
  it("devolve o mesmo Jogador pelo token", async () => {
    const entrada = await motor.entrar("Ana");
    if (!entrada.ok) throw new Error("esperava sucesso");

    expect(await motor.retomar(entrada.token)).toEqual({
      ok: true,
      jogador: entrada.jogador,
    });
  });

  it("recusa um token que não existe", async () => {
    expect(await motor.retomar("token-inventado")).toEqual({
      ok: false,
      erro: "Sessão inválida. Entre novamente.",
    });
  });
});

describe("estadoDoJogador", () => {
  it("devolve o Jogador do token, sem Rodada aberta", async () => {
    const entrada = await motor.entrar("Ana");
    if (!entrada.ok) throw new Error("esperava sucesso");

    expect(await motor.estadoDoJogador(entrada.token)).toEqual({
      ok: true,
      jogador: entrada.jogador,
      rodada: null,
    });
  });

  it("recusa um token inválido", async () => {
    expect(await motor.estadoDoJogador("token-inventado")).toEqual({
      ok: false,
      erro: "Sessão inválida. Entre novamente.",
    });
  });
});

describe("placar", () => {
  it("lista todos os Jogadores, com Avatar e Nickname", async () => {
    await motor.entrar("Zoe");
    await motor.entrar("Ana Maria");

    expect(await motor.placar()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ nickname: "Zoe", iniciais: "ZO" }),
        expect.objectContaining({ nickname: "Ana Maria", iniciais: "AN" }),
      ]),
    );
    expect(await motor.placar()).toHaveLength(2);
  });

  it("não expõe o token dos Jogadores", async () => {
    await motor.entrar("Zoe");

    const [entrada] = await motor.placar();
    expect(entrada).not.toHaveProperty("token");
  });
});
