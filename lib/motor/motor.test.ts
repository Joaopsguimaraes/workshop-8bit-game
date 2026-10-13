import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { criarMotor } from "./motor";
import { criarBancoDeTeste } from "./banco-de-teste";
import { criarPrisma } from "./prisma";
import type { Desafio } from "../desafios/tipos";

// Catálogo de teste com dois Desafios, para testar a regra de não reabrir um Desafio.
const ALFA: Desafio = {
  id: "alfa",
  ordem: 1,
  titulo: "Trabalho remoto",
  cenario: "Cenário alfa.",
  palavrasChave: [
    ["trabalho remoto", "home office"],
    ["vantagens", "prós"],
  ],
  promptReferencia: "Referência alfa.",
};

const BETA: Desafio = {
  id: "beta",
  ordem: 2,
  titulo: "E-mail de reunião",
  cenario: "Cenário beta.",
  palavrasChave: [
    ["e-mail", "email"],
    ["reunião", "reuniao"],
  ],
  promptReferencia: "Referência beta.",
};

// Nota 35 no Desafio alfa: Papel (15) e Tarefa (20).
const PROMPT_ALFA = "Papel: você é um consultor de RH experiente. Liste as vantagens do trabalho remoto.";
// Nota 20 no Desafio beta: só a Tarefa.
const PROMPT_BETA = "Escreva um e-mail sobre a reunião de alinhamento.";

let banco: ReturnType<typeof criarBancoDeTeste>;
let motor: ReturnType<typeof criarMotor>;
let agora: Date;

function avancar(segundos: number) {
  agora = new Date(agora.getTime() + segundos * 1000);
}

beforeEach(() => {
  banco = criarBancoDeTeste();
  agora = new Date("2026-10-13T12:00:00.000Z");
  motor = criarMotor(banco.prisma, { desafios: [ALFA, BETA], agora: () => agora });
});

afterEach(async () => {
  await banco.fechar();
});

async function entrarComo(nickname: string) {
  const r = await motor.entrar(nickname);
  if (!r.ok) throw new Error(`esperava sucesso ao entrar: ${r.erro}`);
  return r;
}

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
    const entrada = await entrarComo("Ana");

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
  it("sem Rodada aberta, devolve o Jogador sem Rodada e sem Tentativas", async () => {
    const entrada = await entrarComo("Ana");

    expect(await motor.estadoDoJogador(entrada.token)).toEqual({
      ok: true,
      jogador: entrada.jogador,
      rodada: null,
      tentativas: [],
      tentativasRestantes: 0,
      agora: agora.toISOString(),
    });
  });

  it("recusa um token inválido", async () => {
    expect(await motor.estadoDoJogador("token-inventado")).toEqual({
      ok: false,
      erro: "Sessão inválida. Entre novamente.",
    });
  });

  it("com Rodada aberta, mostra o Desafio, o prazo e as 3 Tentativas restantes", async () => {
    const ana = await entrarComo("Ana");
    await motor.abrirRodada("alfa", 600);

    expect(await motor.estadoDoJogador(ana.token)).toMatchObject({
      ok: true,
      rodada: {
        desafio: { id: "alfa", titulo: "Trabalho remoto", cenario: "Cenário alfa." },
        prazo: new Date(agora.getTime() + 600_000).toISOString(),
      },
      tentativas: [],
      tentativasRestantes: 3,
    });
  });

  it("mostra só as Tentativas do próprio Jogador, nunca o prompt de outro", async () => {
    const ana = await entrarComo("Ana");
    const bia = await entrarComo("Bia");
    await motor.abrirRodada("alfa");
    await motor.enviarTentativa(ana.token, `${PROMPT_ALFA} SEGREDO-DA-ANA`);

    const estadoDaBia = await motor.estadoDoJogador(bia.token);

    expect(JSON.stringify(estadoDaBia)).not.toContain("SEGREDO-DA-ANA");
    expect(estadoDaBia).toMatchObject({ tentativas: [], tentativasRestantes: 3 });
  });
});

describe("abrirRodada", () => {
  it("abre a Rodada com o Desafio escolhido e sem prazo quando não há duração", async () => {
    const r = await motor.abrirRodada("alfa");

    expect(r).toMatchObject({
      ok: true,
      rodada: { desafio: { id: "alfa" }, abertaEm: agora.toISOString(), prazo: null },
    });
  });

  it("calcula o prazo a partir da duração em segundos", async () => {
    const r = await motor.abrirRodada("alfa", 90);

    expect(r).toMatchObject({
      ok: true,
      rodada: { prazo: new Date(agora.getTime() + 90_000).toISOString() },
    });
  });

  it("recusa abrir outra Rodada enquanto uma está aberta", async () => {
    await motor.abrirRodada("alfa");

    expect(await motor.abrirRodada("beta")).toEqual({
      ok: false,
      erro: "Já existe uma Rodada aberta. Encerre-a antes de abrir outra.",
    });
  });

  it("recusa um Desafio que não existe no catálogo", async () => {
    expect(await motor.abrirRodada("nao-existe")).toEqual({
      ok: false,
      erro: "Desafio não encontrado.",
    });
  });

  it("não reabre um Desafio já jogado nesta partida", async () => {
    await motor.abrirRodada("alfa");
    await motor.encerrarRodada();

    expect(await motor.abrirRodada("alfa")).toEqual({
      ok: false,
      erro: "Este Desafio já foi jogado nesta partida.",
    });
  });

  it("recusa uma duração que não seja um número inteiro positivo de segundos", async () => {
    expect(await motor.abrirRodada("alfa", 0)).toEqual({
      ok: false,
      erro: "A duração precisa ser de pelo menos 1 segundo.",
    });
    expect(await motor.abrirRodada("alfa", 1.5)).toEqual({
      ok: false,
      erro: "A duração precisa ser de pelo menos 1 segundo.",
    });
  });
});

describe("encerrarRodada", () => {
  it("encerra a Rodada aberta e impede novos envios", async () => {
    const ana = await entrarComo("Ana");
    await motor.abrirRodada("alfa");

    const r = await motor.encerrarRodada();
    expect(r).toMatchObject({ ok: true, rodada: { encerradaEm: agora.toISOString() } });
    expect(await motor.enviarTentativa(ana.token, PROMPT_ALFA)).toEqual({
      ok: false,
      erro: "A Rodada foi encerrada.",
    });
  });

  it("recusa encerrar quando não há Rodada aberta", async () => {
    expect(await motor.encerrarRodada()).toEqual({
      ok: false,
      erro: "Não há Rodada aberta.",
    });
  });
});

describe("verificarPrazo", () => {
  it("encerra a Rodada quando o prazo já passou", async () => {
    await motor.abrirRodada("alfa", 60);
    avancar(61);

    expect(await motor.verificarPrazo(agora)).toEqual({ encerrou: true });
    expect(await motor.estadoDoFacilitador()).toMatchObject({ rodada: null });
  });

  it("não encerra a Rodada antes do prazo", async () => {
    await motor.abrirRodada("alfa", 60);
    avancar(59);

    expect(await motor.verificarPrazo(agora)).toEqual({ encerrou: false });
    expect(await motor.estadoDoFacilitador()).toMatchObject({ rodada: { desafio: { id: "alfa" } } });
  });

  it("nunca encerra uma Rodada sem prazo", async () => {
    await motor.abrirRodada("alfa");
    avancar(60 * 60 * 24);

    expect(await motor.verificarPrazo(agora)).toEqual({ encerrou: false });
  });
});

describe("enviarTentativa", () => {
  it("devolve a Tentativa com a Nota e a Avaliação do prompt", async () => {
    const ana = await entrarComo("Ana");
    await motor.abrirRodada("alfa");

    const r = await motor.enviarTentativa(ana.token, PROMPT_ALFA);

    expect(r).toMatchObject({
      ok: true,
      tentativa: { numero: 1, prompt: PROMPT_ALFA, nota: 35 },
      tentativasRestantes: 2,
    });
    if (!r.ok) throw new Error("esperava sucesso");
    expect(r.tentativa.avaliacao.criterios.map((c) => c.id)).toEqual(["papel", "tarefa"]);
  });

  it("recusa sem Rodada aberta", async () => {
    const ana = await entrarComo("Ana");

    expect(await motor.enviarTentativa(ana.token, PROMPT_ALFA)).toEqual({
      ok: false,
      erro: "Nenhuma Rodada aberta no momento.",
    });
  });

  it("recusa um prompt vazio ou só com espaços", async () => {
    const ana = await entrarComo("Ana");
    await motor.abrirRodada("alfa");

    expect(await motor.enviarTentativa(ana.token, "   \n  ")).toEqual({
      ok: false,
      erro: "Escreva um prompt antes de enviar.",
    });
  });

  it("recusa um prompt com mais de 4.000 caracteres e aceita exatamente 4.000", async () => {
    const ana = await entrarComo("Ana");
    await motor.abrirRodada("alfa");

    expect(await motor.enviarTentativa(ana.token, "a".repeat(4001))).toEqual({
      ok: false,
      erro: "O prompt pode ter no máximo 4.000 caracteres.",
    });
    expect(await motor.enviarTentativa(ana.token, "a".repeat(4000))).toMatchObject({ ok: true });
  });

  it("recusa a 4ª Tentativa do Jogador na mesma Rodada", async () => {
    const ana = await entrarComo("Ana");
    await motor.abrirRodada("alfa");
    for (let i = 0; i < 3; i++) {
      expect(await motor.enviarTentativa(ana.token, PROMPT_ALFA)).toMatchObject({ ok: true });
    }

    expect(await motor.enviarTentativa(ana.token, PROMPT_ALFA)).toEqual({
      ok: false,
      erro: "Você já usou as 3 Tentativas desta Rodada.",
    });
  });

  it("não deixa passar de 3 Tentativas mesmo com envios simultâneos", async () => {
    const ana = await entrarComo("Ana");
    await motor.abrirRodada("alfa");

    const resultados = await Promise.all(
      Array.from({ length: 5 }, () => motor.enviarTentativa(ana.token, PROMPT_ALFA)),
    );

    expect(resultados.filter((r) => r.ok)).toHaveLength(3);
    expect(await motor.estadoDoJogador(ana.token)).toMatchObject({ tentativasRestantes: 0 });
  });

  it("recusa envio com prompt inválido sem consumir uma Tentativa", async () => {
    const ana = await entrarComo("Ana");
    await motor.abrirRodada("alfa");

    await motor.enviarTentativa(ana.token, "   ");
    await motor.enviarTentativa(ana.token, "a".repeat(4001));

    expect(await motor.estadoDoJogador(ana.token)).toMatchObject({ tentativasRestantes: 3 });
  });

  it("cada Jogador tem as próprias 3 Tentativas na Rodada", async () => {
    const ana = await entrarComo("Ana");
    const bia = await entrarComo("Bia");
    await motor.abrirRodada("alfa");
    for (let i = 0; i < 3; i++) await motor.enviarTentativa(ana.token, PROMPT_ALFA);

    expect(await motor.enviarTentativa(bia.token, PROMPT_ALFA)).toMatchObject({
      ok: true,
      tentativa: { numero: 1 },
    });
  });

  it("prazo vencido encerra a Rodada e recusa o envio", async () => {
    const ana = await entrarComo("Ana");
    await motor.abrirRodada("alfa", 60);
    avancar(61);

    expect(await motor.enviarTentativa(ana.token, PROMPT_ALFA)).toEqual({
      ok: false,
      erro: "A Rodada foi encerrada.",
    });
    expect(await motor.estadoDoFacilitador()).toMatchObject({ rodada: null });
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

  it("conta só a melhor Tentativa do Jogador em cada Rodada", async () => {
    const ana = await entrarComo("Ana");
    await motor.abrirRodada("alfa");
    await motor.enviarTentativa(ana.token, "Liste as vantagens do trabalho remoto.");
    await motor.enviarTentativa(ana.token, "oi");
    await motor.enviarTentativa(ana.token, PROMPT_ALFA);
    await motor.encerrarRodada();

    expect(await motor.placar()).toEqual([expect.objectContaining({ nickname: "Ana", pontuacao: 35 })]);
  });

  it("soma a melhor Nota de cada Rodada e ordena pelo total", async () => {
    const ana = await entrarComo("Ana");
    const bia = await entrarComo("Bia");
    await motor.abrirRodada("alfa");
    await motor.enviarTentativa(ana.token, PROMPT_ALFA);
    await motor.enviarTentativa(bia.token, "oi");
    await motor.encerrarRodada();
    await motor.abrirRodada("beta");
    await motor.enviarTentativa(bia.token, PROMPT_BETA);
    await motor.encerrarRodada();

    const placar = await motor.placar();
    expect(placar.map((j) => [j.nickname, j.pontuacao])).toEqual([
      ["Ana", 35],
      ["Bia", 20],
    ]);
  });

  it("nunca carrega texto de prompt, mesmo com Tentativas enviadas", async () => {
    const ana = await entrarComo("Ana");
    await motor.abrirRodada("alfa");
    await motor.enviarTentativa(ana.token, `${PROMPT_ALFA} SEGREDO-DO-PLACAR`);

    expect(JSON.stringify(await motor.placar())).not.toContain("SEGREDO-DO-PLACAR");
  });
});

describe("estadoDoFacilitador", () => {
  it("marca os Desafios já jogados e conta quantos Jogadores enviaram", async () => {
    const ana = await entrarComo("Ana");
    const bia = await entrarComo("Bia");
    await motor.abrirRodada("alfa");
    await motor.enviarTentativa(ana.token, PROMPT_ALFA);
    await motor.enviarTentativa(ana.token, PROMPT_ALFA);
    await motor.enviarTentativa(bia.token, PROMPT_ALFA);

    // Um Desafio com Rodada aberta já conta como jogado: não pode ser reaberto.
    expect(await motor.estadoDoFacilitador()).toMatchObject({
      desafios: [
        { id: "alfa", jogado: true },
        { id: "beta", jogado: false },
      ],
      rodada: { desafio: { id: "alfa" } },
      enviaram: 2,
    });

    await motor.encerrarRodada();
    expect(await motor.estadoDoFacilitador()).toMatchObject({
      desafios: [
        { id: "alfa", jogado: true },
        { id: "beta", jogado: false },
      ],
      rodada: null,
    });
  });
});

describe("restart", () => {
  it("mantém a Rodada aberta, o prazo e as Tentativas depois de reiniciar o Motor", async () => {
    const ana = await entrarComo("Ana");
    await motor.abrirRodada("alfa", 600);
    await motor.enviarTentativa(ana.token, PROMPT_ALFA);

    const prismaNovo = criarPrisma(banco.url);
    try {
      const reiniciado = criarMotor(prismaNovo, { desafios: [ALFA, BETA], agora: () => agora });

      expect(await reiniciado.estadoDoJogador(ana.token)).toMatchObject({
        rodada: { prazo: new Date(agora.getTime() + 600_000).toISOString() },
        tentativas: [{ numero: 1, nota: 35 }],
        tentativasRestantes: 2,
      });
    } finally {
      await prismaNovo.$disconnect();
    }
  });
});
