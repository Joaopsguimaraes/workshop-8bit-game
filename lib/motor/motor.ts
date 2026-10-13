import { randomBytes } from "node:crypto";
import { avaliar, type Avaliacao } from "../avaliador/avaliador";
import { DESAFIOS, buscarDesafio } from "../desafios/catalogo";
import type { Desafio } from "../desafios/tipos";
import { LIMITE_DE_CARACTERES, LIMITE_DE_TENTATIVAS } from "../limites";
import { validarNickname } from "../nickname";
import type { PrismaClient } from "../../generated/prisma/client";

// Única porta para mudar o estado da Sala. Recebe comandos e devolve resultados.
export type Jogador = { id: string; nickname: string; iniciais: string };

export type ResultadoEntrada =
  | { ok: true; token: string; jogador: Jogador }
  | { ok: false; erro: string };

export type ResultadoRetomada = { ok: true; jogador: Jogador } | { ok: false; erro: string };

export type DesafioResumo = Pick<Desafio, "id" | "ordem" | "titulo" | "cenario">;

export type RodadaPublica = {
  id: string;
  desafio: DesafioResumo;
  abertaEm: string;
  prazo: string | null;
  encerradaEm: string | null;
};

export type TentativaPublica = {
  numero: number;
  prompt: string;
  nota: number;
  avaliacao: Avaliacao;
  criadaEm: string;
};

export type EstadoDoJogador =
  | {
      ok: true;
      jogador: Jogador;
      rodada: RodadaPublica | null;
      tentativas: TentativaPublica[];
      tentativasRestantes: number;
      agora: string;
    }
  | { ok: false; erro: string };

export type EntradaPlacar = Jogador & { pontuacao: number };

export type ResultadoTentativa =
  | { ok: true; tentativa: TentativaPublica; tentativasRestantes: number }
  | { ok: false; erro: string };


const SESSAO_INVALIDA = "Sessão inválida. Entre novamente.";
const NICKNAME_EM_USO = "Nickname já em uso";

type Opcoes = { desafios?: Desafio[]; agora?: () => Date };

type RegistroRodada = {
  id: string;
  desafioId: string;
  abertaEm: Date;
  prazo: Date | null;
  encerradaEm: Date | null;
};

type RegistroTentativa = {
  numero: number;
  prompt: string;
  nota: number;
  avaliacao: string;
  criadaEm: Date;
};

function paraJogador(registro: { id: string; nickname: string; iniciais: string }): Jogador {
  return { id: registro.id, nickname: registro.nickname, iniciais: registro.iniciais };
}

export function criarMotor(prisma: PrismaClient, opcoes: Opcoes = {}) {
  const desafios = opcoes.desafios ?? DESAFIOS;
  const relogio = opcoes.agora ?? (() => new Date());

  // Comandos que mudam estado rodam um de cada vez, para que os invariantes valham
  // mesmo com envios simultâneos (ex.: 5 cliques seguidos numa Tentativa só).
  let fila: Promise<unknown> = Promise.resolve();
  function exclusivo<T>(tarefa: () => Promise<T>): Promise<T> {
    const execucao = fila.then(tarefa);
    fila = execucao.catch(() => undefined);
    return execucao;
  }

  async function buscarPorToken(token: string) {
    return prisma.jogador.findUnique({ where: { token } });
  }

  async function rodadaAberta(): Promise<RegistroRodada | null> {
    return prisma.rodada.findFirst({
      where: { encerradaEm: null },
      orderBy: { abertaEm: "desc" },
    });
  }

  async function ultimaRodada(): Promise<RegistroRodada | null> {
    return prisma.rodada.findFirst({ orderBy: { abertaEm: "desc" } });
  }

  function desafioDaRodada(rodada: RegistroRodada): Desafio {
    const desafio = buscarDesafio(rodada.desafioId, desafios);
    if (!desafio) throw new Error(`Desafio ${rodada.desafioId} não está no catálogo`);
    return desafio;
  }

  function paraRodada(rodada: RegistroRodada): RodadaPublica {
    return {
      id: rodada.id,
      desafio: resumir(desafioDaRodada(rodada)),
      abertaEm: rodada.abertaEm.toISOString(),
      prazo: rodada.prazo?.toISOString() ?? null,
      encerradaEm: rodada.encerradaEm?.toISOString() ?? null,
    };
  }

  function paraTentativa(tentativa: RegistroTentativa): TentativaPublica {
    return {
      numero: tentativa.numero,
      prompt: tentativa.prompt,
      nota: tentativa.nota,
      avaliacao: JSON.parse(tentativa.avaliacao) as Avaliacao,
      criadaEm: tentativa.criadaEm.toISOString(),
    };
  }

  // Encerra a Rodada aberta se o prazo já passou. Sem prazo, nunca encerra.
  async function encerrarSePrazoVencido(agora: Date): Promise<boolean> {
    const aberta = await rodadaAberta();
    if (!aberta?.prazo || aberta.prazo > agora) return false;

    await prisma.rodada.update({
      where: { id: aberta.id },
      data: { encerradaEm: aberta.prazo },
    });
    return true;
  }

  return {
    async entrar(nickname: string): Promise<ResultadoEntrada> {
      const validacao = validarNickname(nickname);
      if (!validacao.ok) return validacao;

      const token = randomBytes(24).toString("base64url");

      try {
        const registro = await prisma.jogador.create({
          data: {
            nickname: validacao.nickname,
            nicknameNormalizado: validacao.normalizado,
            iniciais: validacao.iniciais,
            token,
          },
        });
        return { ok: true, token, jogador: paraJogador(registro) };
      } catch (erro) {
        if (ehViolacaoDeUnicidade(erro)) return { ok: false, erro: NICKNAME_EM_USO };
        throw erro;
      }
    },

    async retomar(token: string): Promise<ResultadoRetomada> {
      const registro = await buscarPorToken(token);
      if (!registro) return { ok: false, erro: SESSAO_INVALIDA };
      return { ok: true, jogador: paraJogador(registro) };
    },

    async estadoDoJogador(token: string): Promise<EstadoDoJogador> {
      const registro = await buscarPorToken(token);
      if (!registro) return { ok: false, erro: SESSAO_INVALIDA };

      const rodada = await rodadaAberta();
      const tentativas = rodada
        ? await prisma.tentativa.findMany({
            where: { jogadorId: registro.id, rodadaId: rodada.id },
            orderBy: { numero: "asc" },
          })
        : [];

      return {
        ok: true,
        jogador: paraJogador(registro),
        rodada: rodada ? paraRodada(rodada) : null,
        tentativas: tentativas.map(paraTentativa),
        tentativasRestantes: rodada ? LIMITE_DE_TENTATIVAS - tentativas.length : 0,
        agora: relogio().toISOString(),
      };
    },

    async abrirRodada(desafioId: string, duracaoSegundos?: number) {
      return exclusivo(async () => {
        const desafio = buscarDesafio(desafioId, desafios);
        if (!desafio) return { ok: false as const, erro: "Desafio não encontrado." };

        if (
          duracaoSegundos !== undefined &&
          (!Number.isInteger(duracaoSegundos) || duracaoSegundos < 1)
        ) {
          return { ok: false as const, erro: "A duração precisa ser de pelo menos 1 segundo." };
        }

        const agora = relogio();
        await encerrarSePrazoVencido(agora);

        if (await rodadaAberta()) {
          return {
            ok: false as const,
            erro: "Já existe uma Rodada aberta. Encerre-a antes de abrir outra.",
          };
        }

        const jaJogado = await prisma.rodada.findFirst({ where: { desafioId } });
        if (jaJogado) {
          return { ok: false as const, erro: "Este Desafio já foi jogado nesta Sala." };
        }

        const criada = await prisma.rodada.create({
          data: {
            desafioId,
            abertaEm: agora,
            prazo:
              duracaoSegundos === undefined
                ? null
                : new Date(agora.getTime() + duracaoSegundos * 1000),
          },
        });
        return { ok: true as const, rodada: paraRodada(criada) };
      });
    },

    async encerrarRodada() {
      return exclusivo(async () => {
        const aberta = await rodadaAberta();
        if (!aberta) return { ok: false as const, erro: "Não há Rodada aberta." };

        const encerrada = await prisma.rodada.update({
          where: { id: aberta.id },
          data: { encerradaEm: relogio() },
        });
        return { ok: true as const, rodada: paraRodada(encerrada) };
      });
    },

    async verificarPrazo(agora: Date): Promise<{ encerrou: boolean }> {
      return exclusivo(async () => ({ encerrou: await encerrarSePrazoVencido(agora) }));
    },

    async enviarTentativa(token: string, promptBruto: string): Promise<ResultadoTentativa> {
      return exclusivo(async () => {
        const jogador = await buscarPorToken(token);
        if (!jogador) return { ok: false as const, erro: SESSAO_INVALIDA };

        const agora = relogio();
        await encerrarSePrazoVencido(agora);

        const rodada = await rodadaAberta();
        if (!rodada) {
          const ultima = await ultimaRodada();
          return {
            ok: false as const,
            erro: ultima ? "A Rodada foi encerrada." : "Nenhuma Rodada aberta no momento.",
          };
        }

        const prompt = promptBruto.trim();
        if (prompt.length === 0) {
          return { ok: false as const, erro: "Escreva um prompt antes de enviar." };
        }
        if ([...prompt].length > LIMITE_DE_CARACTERES) {
          return {
            ok: false as const,
            erro: `O prompt pode ter no máximo ${LIMITE_DE_CARACTERES.toLocaleString("pt-BR")} caracteres.`,
          };
        }

        const usadas = await prisma.tentativa.count({
          where: { jogadorId: jogador.id, rodadaId: rodada.id },
        });
        if (usadas >= LIMITE_DE_TENTATIVAS) {
          return {
            ok: false as const,
            erro: `Você já usou as ${LIMITE_DE_TENTATIVAS} Tentativas desta Rodada.`,
          };
        }

        const avaliacao = avaliar(prompt, desafioDaRodada(rodada));
        const criada = await prisma.tentativa.create({
          data: {
            jogadorId: jogador.id,
            rodadaId: rodada.id,
            numero: usadas + 1,
            prompt,
            nota: avaliacao.nota,
            avaliacao: JSON.stringify(avaliacao),
            criadaEm: agora,
          },
        });
        return {
          ok: true as const,
          tentativa: paraTentativa(criada),
          tentativasRestantes: LIMITE_DE_TENTATIVAS - (usadas + 1),
        };
      });
    },

    // Placar: soma, por Rodada, a Nota da melhor Tentativa. Nunca inclui texto de prompt.
    async placar(): Promise<EntradaPlacar[]> {
      const registros = await prisma.jogador.findMany({
        select: {
          id: true,
          nickname: true,
          iniciais: true,
          tentativas: { select: { rodadaId: true, nota: true } },
        },
        orderBy: { criadoEm: "asc" },
      });

      const entradas = registros.map((registro) => {
        const melhorPorRodada = new Map<string, number>();
        for (const tentativa of registro.tentativas) {
          const atual = melhorPorRodada.get(tentativa.rodadaId) ?? 0;
          melhorPorRodada.set(tentativa.rodadaId, Math.max(atual, tentativa.nota));
        }
        const pontuacao = [...melhorPorRodada.values()].reduce((soma, nota) => soma + nota, 0);
        return { ...paraJogador(registro), pontuacao };
      });

      return entradas.sort((a, b) => b.pontuacao - a.pontuacao);
    },

    async estadoDoFacilitador() {
      const rodada = await rodadaAberta();
      const jogadosIds = new Set(
        (await prisma.rodada.findMany({ select: { desafioId: true } })).map((r) => r.desafioId),
      );
      const enviaram = rodada
        ? new Set(
            (
              await prisma.tentativa.findMany({
                where: { rodadaId: rodada.id },
                select: { jogadorId: true },
              })
            ).map((t) => t.jogadorId),
          ).size
        : 0;

      return {
        desafios: [...desafios]
          .sort((a, b) => a.ordem - b.ordem)
          .map((desafio) => ({ ...resumir(desafio), jogado: jogadosIds.has(desafio.id) })),
        rodada: rodada ? paraRodada(rodada) : null,
        enviaram,
      };
    },
  };
}

export type Motor = ReturnType<typeof criarMotor>;

function resumir(desafio: Desafio): DesafioResumo {
  return { id: desafio.id, ordem: desafio.ordem, titulo: desafio.titulo, cenario: desafio.cenario };
}

function ehViolacaoDeUnicidade(erro: unknown): boolean {
  return typeof erro === "object" && erro !== null && "code" in erro && erro.code === "P2002";
}

export type EstadoDoFacilitador = Awaited<ReturnType<Motor["estadoDoFacilitador"]>>;
