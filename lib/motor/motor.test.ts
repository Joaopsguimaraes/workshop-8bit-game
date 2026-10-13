import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { criarMotor, type Evento, type Motor } from "./motor";
import { criarBancoDeTeste } from "./banco-de-teste";
import { criarPrisma } from "./prisma";
import type { Desafio } from "../desafios/tipos";
import { DESAFIOS_SEED } from "../desafios/seed";

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
      revelacao: null,
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

  it("não reabre um Desafio já jogado nesta Sala", async () => {
    await motor.abrirRodada("alfa");
    await motor.encerrarRodada();

    expect(await motor.abrirRodada("alfa")).toEqual({
      ok: false,
      erro: "Este Desafio já foi jogado nesta Sala.",
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
    expect(r.tentativa.avaliacao.criterios.map((c) => c.id)).toEqual([
      "papel",
      "contexto",
      "tarefa",
      "formato",
      "restricoes",
      "exemplos",
    ]);
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

// Leitura do Placar pelo Jogador, como a tela faz; os testes não olham tabelas.
async function entradaDe(m: Motor, nickname: string) {
  const entrada = (await m.placar()).find((jogador) => jogador.nickname === nickname);
  if (!entrada) throw new Error(`${nickname} não está no Placar`);
  return entrada;
}

async function tiposDe(m: Motor, nickname: string) {
  return (await entradaDe(m, nickname)).conquistas.map((conquista) => conquista.tipo).sort();
}

async function entrarNo(m: Motor, nickname: string) {
  const r = await m.entrar(nickname);
  if (!r.ok) throw new Error(`esperava sucesso ao entrar: ${r.erro}`);
  return r;
}

describe("placar: desempate e status", () => {
  it("empate de pontuação: quem usou menos Tentativas nas Rodadas em que pontuou fica na frente", async () => {
    const bia = await entrarComo("Bia");
    const ana = await entrarComo("Ana");
    await motor.abrirRodada("alfa");
    await motor.enviarTentativa(bia.token, "oi");
    await motor.enviarTentativa(bia.token, PROMPT_ALFA);
    avancar(5);
    await motor.enviarTentativa(ana.token, PROMPT_ALFA);
    await motor.encerrarRodada();

    expect((await motor.placar()).map((j) => j.nickname)).toEqual(["Ana", "Bia"]);
  });

  it("Tentativas de Rodadas sem pontuação não contam no desempate", async () => {
    const bia = await entrarComo("Bia");
    const ana = await entrarComo("Ana");
    await motor.abrirRodada("alfa");
    await motor.enviarTentativa(bia.token, "oi");
    await motor.enviarTentativa(bia.token, PROMPT_ALFA);
    avancar(5);
    await motor.enviarTentativa(ana.token, PROMPT_ALFA);
    await motor.encerrarRodada();
    await motor.abrirRodada("beta");
    await motor.enviarTentativa(ana.token, "oi");
    await motor.enviarTentativa(ana.token, "oi");
    await motor.enviarTentativa(ana.token, "oi");
    await motor.encerrarRodada();

    // Ana: 35 com 1 Tentativa na Rodada que pontuou (as 3 da beta não contam).
    // Bia: 35 com 2 Tentativas. Sem a regra, Bia ficaria na frente com 2 contra 4.
    expect((await motor.placar()).map((j) => j.nickname)).toEqual(["Ana", "Bia"]);
  });

  it("com a mesma pontuação e o mesmo número de Tentativas, vence quem atingiu a pontuação primeiro", async () => {
    // Bia entrou antes na Sala, então a ordem de criação não pode decidir o empate.
    const bia = await entrarComo("Bia");
    const ana = await entrarComo("Ana");
    await motor.abrirRodada("alfa");
    await motor.enviarTentativa(ana.token, PROMPT_ALFA);
    avancar(5);
    await motor.enviarTentativa(bia.token, PROMPT_ALFA);
    await motor.encerrarRodada();

    expect((await motor.placar()).map((j) => j.nickname)).toEqual(["Ana", "Bia"]);
  });

  it("mostra posição, se o Jogador enviou na Rodada atual e quantas Tentativas usou nela", async () => {
    const ana = await entrarComo("Ana");
    const bia = await entrarComo("Bia");
    await motor.abrirRodada("alfa");
    await motor.enviarTentativa(ana.token, PROMPT_ALFA);
    await motor.enviarTentativa(bia.token, "oi");

    expect(await entradaDe(motor, "Ana")).toMatchObject({
      posicao: 1,
      pontuacao: 35,
      enviouNaRodada: true,
      tentativasNaRodada: 1,
    });
    expect(await entradaDe(motor, "Bia")).toMatchObject({
      posicao: 2,
      pontuacao: 0,
      enviouNaRodada: true,
      tentativasNaRodada: 1,
    });
  });
});

describe("conquistas", () => {
  // Motor com o seed real, para que os Prompts de referência valham 100 de verdade.
  let seed: Motor;
  const REMOTO = "trabalho-remoto";
  const ALINHAMENTO = "reuniao-alinhamento";
  const REF_REMOTO = DESAFIOS_SEED[0].promptReferencia;
  const REF_ALINHAMENTO = DESAFIOS_SEED[1].promptReferencia;
  // Mesmo Prompt de referência sem o último Critério (Exemplos): Nota 90.
  const REF_REMOTO_NOTA_90 = REF_REMOTO.split("\n").slice(0, -1).join("\n");

  beforeEach(() => {
    seed = criarMotor(banco.prisma, { desafios: DESAFIOS_SEED, agora: () => agora });
  });

  it("Na mosca: concedida a quem tira 100", async () => {
    const ana = await entrarNo(seed, "Ana");
    await seed.abrirRodada(REMOTO);
    await seed.enviarTentativa(ana.token, REF_REMOTO);

    expect(await tiposDe(seed, "Ana")).toEqual(["de-primeira", "na-mosca", "primeiro-sangue"]);
  });

  it("Na mosca não é concedida com Nota 90", async () => {
    const ana = await entrarNo(seed, "Ana");
    await seed.abrirRodada(REMOTO);
    await seed.enviarTentativa(ana.token, REF_REMOTO_NOTA_90);

    expect(await tiposDe(seed, "Ana")).toEqual(["primeiro-sangue"]);
  });

  it("De primeira só vale quando o 100 vem na 1ª Tentativa", async () => {
    const ana = await entrarNo(seed, "Ana");
    await seed.abrirRodada(REMOTO);
    await seed.enviarTentativa(ana.token, "oi");
    await seed.enviarTentativa(ana.token, REF_REMOTO);

    expect(await tiposDe(seed, "Ana")).toEqual(["evolucao", "na-mosca", "primeiro-sangue"]);
  });

  it("Primeiro sangue vai só para a primeira Tentativa aceita da Rodada", async () => {
    const ana = await entrarNo(seed, "Ana");
    const bia = await entrarNo(seed, "Bia");
    await seed.abrirRodada(REMOTO);
    await seed.enviarTentativa(ana.token, "oi");
    await seed.enviarTentativa(bia.token, "oi");

    expect(await tiposDe(seed, "Ana")).toContain("primeiro-sangue");
    expect(await tiposDe(seed, "Bia")).not.toContain("primeiro-sangue");
  });

  it("Primeiro sangue não é dado a um envio recusado", async () => {
    const ana = await entrarNo(seed, "Ana");
    const bia = await entrarNo(seed, "Bia");
    await seed.abrirRodada(REMOTO);
    expect((await seed.enviarTentativa(ana.token, "   ")).ok).toBe(false);
    await seed.enviarTentativa(bia.token, "oi");

    expect(await tiposDe(seed, "Bia")).toContain("primeiro-sangue");
    expect(await tiposDe(seed, "Ana")).not.toContain("primeiro-sangue");
  });

  it("Evolução: a Tentativa posterior precisa superar a primeira em 30 pontos", async () => {
    const ana = await entrarNo(seed, "Ana");
    await seed.abrirRodada(REMOTO);
    await seed.enviarTentativa(ana.token, "oi");
    await seed.enviarTentativa(ana.token, REF_REMOTO);

    expect(await tiposDe(seed, "Ana")).toContain("evolucao");
  });

  it("Evolução não é concedida quando a melhora fica abaixo de 30 pontos", async () => {
    const ana = await entrarNo(seed, "Ana");
    await seed.abrirRodada(REMOTO);
    await seed.enviarTentativa(ana.token, REF_REMOTO_NOTA_90);
    await seed.enviarTentativa(ana.token, REF_REMOTO);

    expect(await tiposDe(seed, "Ana")).not.toContain("evolucao");
  });

  it("cada Conquista vale no máximo uma vez por Jogador por Rodada", async () => {
    const ana = await entrarNo(seed, "Ana");
    await seed.abrirRodada(REMOTO);
    await seed.enviarTentativa(ana.token, "oi");
    await seed.enviarTentativa(ana.token, REF_REMOTO);
    await seed.enviarTentativa(ana.token, REF_REMOTO);

    const tipos = await tiposDe(seed, "Ana");
    expect(tipos.filter((tipo) => tipo === "na-mosca")).toHaveLength(1);
    expect(tipos.filter((tipo) => tipo === "evolucao")).toHaveLength(1);
  });

  it("a mesma Conquista pode ser ganha de novo em outra Rodada", async () => {
    const ana = await entrarNo(seed, "Ana");
    await seed.abrirRodada(REMOTO);
    await seed.enviarTentativa(ana.token, REF_REMOTO);
    await seed.encerrarRodada();
    await seed.abrirRodada(ALINHAMENTO);
    await seed.enviarTentativa(ana.token, REF_ALINHAMENTO);

    expect((await tiposDe(seed, "Ana")).filter((tipo) => tipo === "na-mosca")).toHaveLength(2);
  });

  it("Campeão da Rodada vai para o 1º lugar ao encerrar", async () => {
    const ana = await entrarNo(seed, "Ana");
    const bia = await entrarNo(seed, "Bia");
    await seed.abrirRodada(REMOTO);
    await seed.enviarTentativa(ana.token, REF_REMOTO);
    await seed.enviarTentativa(bia.token, REF_REMOTO_NOTA_90);
    await seed.encerrarRodada();

    expect(await tiposDe(seed, "Ana")).toContain("campeao-da-rodada");
    expect(await tiposDe(seed, "Bia")).not.toContain("campeao-da-rodada");
  });

  it("Campeão da Rodada usa o mesmo desempate: Nota igual, menos Tentativas", async () => {
    const ana = await entrarNo(seed, "Ana");
    const bia = await entrarNo(seed, "Bia");
    await seed.abrirRodada(REMOTO);
    await seed.enviarTentativa(ana.token, REF_REMOTO_NOTA_90);
    avancar(5);
    await seed.enviarTentativa(bia.token, "oi");
    await seed.enviarTentativa(bia.token, REF_REMOTO_NOTA_90);
    await seed.encerrarRodada();

    expect(await tiposDe(seed, "Ana")).toContain("campeao-da-rodada");
    expect(await tiposDe(seed, "Bia")).not.toContain("campeao-da-rodada");
  });

  it("Campeão da Rodada não é concedido quando a melhor Nota da Rodada é zero", async () => {
    const ana = await entrarNo(seed, "Ana");
    const bia = await entrarNo(seed, "Bia");
    await seed.abrirRodada(REMOTO);
    await seed.enviarTentativa(ana.token, "oi");
    await seed.enviarTentativa(bia.token, "oi");
    await seed.encerrarRodada();

    expect(await tiposDe(seed, "Ana")).not.toContain("campeao-da-rodada");
    expect(await tiposDe(seed, "Bia")).not.toContain("campeao-da-rodada");
  });

  it("Campeão da Rodada também é concedido quando o prazo vence", async () => {
    const ana = await entrarNo(seed, "Ana");
    await seed.abrirRodada(REMOTO, 60);
    await seed.enviarTentativa(ana.token, REF_REMOTO);
    avancar(61);
    await seed.verificarPrazo(agora);

    expect(await tiposDe(seed, "Ana")).toContain("campeao-da-rodada");
  });
});

describe("eventos", () => {
  let seed: Motor;
  let recebidos: Evento[];
  const REMOTO = "trabalho-remoto";
  const REF_REMOTO = DESAFIOS_SEED[0].promptReferencia;

  beforeEach(() => {
    seed = criarMotor(banco.prisma, { desafios: DESAFIOS_SEED, agora: () => agora });
    recebidos = [];
    seed.assinar((evento) => recebidos.push(evento));
  });

  it("avisa quando um Jogador entra", async () => {
    await seed.entrar("Ana Maria");

    expect(recebidos).toContainEqual({
      tipo: "jogador-entrou",
      jogador: { nickname: "Ana Maria", iniciais: "AN" },
    });
  });

  it("avisa quando a Rodada abre e quando encerra, com o título do Desafio", async () => {
    await seed.abrirRodada(REMOTO);
    await seed.encerrarRodada();

    expect(recebidos).toContainEqual({
      tipo: "rodada-aberta",
      titulo: DESAFIOS_SEED[0].titulo,
    });
    expect(recebidos).toContainEqual(
      expect.objectContaining({ tipo: "rodada-encerrada", titulo: DESAFIOS_SEED[0].titulo }),
    );
  });

  it("avisa o envio com o número da Tentativa, sem o texto do prompt", async () => {
    const ana = await entrarNo(seed, "Ana");
    await seed.abrirRodada(REMOTO);
    await seed.enviarTentativa(ana.token, `oi SEGREDO-DA-ANA`);

    expect(recebidos).toContainEqual({
      tipo: "tentativa-enviada",
      jogador: { nickname: "Ana", iniciais: "AN" },
      numero: 1,
    });
    expect(JSON.stringify(recebidos)).not.toContain("SEGREDO-DA-ANA");
  });

  it("avisa quando uma Tentativa tira 100 e quando uma Conquista é ganha", async () => {
    const ana = await entrarNo(seed, "Ana");
    await seed.abrirRodada(REMOTO);
    await seed.enviarTentativa(ana.token, REF_REMOTO);

    expect(recebidos).toContainEqual(
      expect.objectContaining({ tipo: "nota-maxima", numero: 1 }),
    );
    expect(recebidos).toContainEqual({
      tipo: "conquista-ganha",
      jogador: { nickname: "Ana", iniciais: "AN" },
      conquista: "na-mosca",
    });
  });

  it("antes do reveal, nenhum evento nem snapshot de um Jogador traz o prompt de outro", async () => {
    const ana = await entrarNo(seed, "Ana");
    const bia = await entrarNo(seed, "Bia");
    await seed.abrirRodada(REMOTO);
    await seed.enviarTentativa(bia.token, `${REF_REMOTO} SEGREDO-DA-BIA`);
    await seed.enviarTentativa(ana.token, "oi");

    expect(JSON.stringify(recebidos)).not.toContain("SEGREDO-DA-BIA");
    expect(JSON.stringify(await seed.estadoDoJogador(ana.token))).not.toContain("SEGREDO-DA-BIA");
    expect(JSON.stringify(await seed.placar())).not.toContain("SEGREDO-DA-BIA");
  });

  it("ao encerrar, o evento de reveal leva o Prompt de referência e o top 3", async () => {
    const ana = await entrarNo(seed, "Ana");
    await seed.abrirRodada(REMOTO);
    await seed.enviarTentativa(ana.token, REF_REMOTO);
    await seed.encerrarRodada();

    expect(recebidos).toContainEqual(
      expect.objectContaining({
        tipo: "rodada-encerrada",
        revelacao: expect.objectContaining({
          desafio: expect.objectContaining({ promptReferencia: REF_REMOTO }),
          top3: [expect.objectContaining({ nickname: "Ana", nota: 100, prompt: REF_REMOTO })],
        }),
      }),
    );
  });
});

describe("reveal", () => {
  let seed: Motor;
  const REMOTO = "trabalho-remoto";
  const ALINHAMENTO = "reuniao-alinhamento";
  const REF_REMOTO = DESAFIOS_SEED[0].promptReferencia;
  const REF_REMOTO_NOTA_90 = REF_REMOTO.split("\n").slice(0, -1).join("\n");

  beforeEach(() => {
    seed = criarMotor(banco.prisma, { desafios: DESAFIOS_SEED, agora: () => agora });
  });

  it("sem Rodada encerrada, não há reveal", async () => {
    const ana = await entrarNo(seed, "Ana");
    await seed.abrirRodada(REMOTO);

    expect((await seed.estadoDoJogador(ana.token))).toMatchObject({ ok: true, revelacao: null });
  });

  it("depois de encerrar, traz o Prompt de referência e o top 3 com Avatar, Nickname, Nota e prompt", async () => {
    const ana = await entrarNo(seed, "Ana");
    const bia = await entrarNo(seed, "Bia");
    const cy = await entrarNo(seed, "Cy");
    await seed.abrirRodada(REMOTO);
    await seed.enviarTentativa(ana.token, REF_REMOTO);
    await seed.enviarTentativa(bia.token, REF_REMOTO_NOTA_90);
    await seed.enviarTentativa(cy.token, "oi");
    await seed.encerrarRodada();

    const estado = await seed.estadoDoJogador(ana.token);
    expect(estado).toMatchObject({
      ok: true,
      revelacao: {
        desafio: { titulo: DESAFIOS_SEED[0].titulo, promptReferencia: REF_REMOTO },
        top3: [
          { posicao: 1, nickname: "Ana", iniciais: "AN", nota: 100, prompt: REF_REMOTO },
          { posicao: 2, nickname: "Bia", iniciais: "BI", nota: 90, prompt: REF_REMOTO_NOTA_90 },
        ],
      },
    });
  });

  it("fica visível até o Facilitador abrir a próxima Rodada", async () => {
    const ana = await entrarNo(seed, "Ana");
    await seed.abrirRodada(REMOTO);
    await seed.enviarTentativa(ana.token, REF_REMOTO);
    await seed.encerrarRodada();
    avancar(600);

    expect((await seed.estadoDoJogador(ana.token))).toMatchObject({ revelacao: { top3: [expect.anything()] } });

    await seed.abrirRodada(ALINHAMENTO);
    expect((await seed.estadoDoJogador(ana.token))).toMatchObject({ revelacao: null });
  });
});
