import { randomBytes } from "node:crypto";
import { avaliar, type Avaliacao } from "../avaliador/avaliador";
import { DESAFIOS, buscarDesafio } from "../desafios/catalogo";
import type { Desafio } from "../desafios/tipos";
import { LIMITE_DE_CARACTERES, LIMITE_DE_TENTATIVAS } from "../limites";
import { validarNickname } from "../nickname";
import type { PrismaClient } from "../../generated/prisma/client";
import { conquistasDoEnvio, type TipoConquista } from "./conquistas";
import {
  agruparPorJogador,
  compararMarcas,
  marcaDoPlacar,
  colocacoesDaRodada,
  type ColocacaoNaRodada,
  type TentativaRegistrada,
} from "./pontuacao";

// Única porta para mudar o estado da Sala. Recebe comandos e devolve resultados.
export type Jogador = { id: string; nickname: string; iniciais: string };

// Dados do Jogador que todos podem ver no feed: sem id e sem token.
export type JogadorPublico = { nickname: string; iniciais: string };

export type ConquistaPublica = { tipo: TipoConquista; rodadaId: string };

export type RevelacaoTop = {
  posicao: number;
  nickname: string;
  iniciais: string;
  nota: number;
  prompt: string;
};

export type Revelacao = {
  desafio: { titulo: string; promptReferencia: string };
  top3: RevelacaoTop[];
};

// Fatos da partida para o feed ao vivo. Nenhum evento carrega texto de prompt.
export type Evento =
  | { tipo: "jogador-entrou"; jogador: JogadorPublico }
  | { tipo: "rodada-aberta"; titulo: string }
  | { tipo: "tentativa-enviada"; jogador: JogadorPublico; numero: number }
  | { tipo: "nota-maxima"; jogador: JogadorPublico; numero: number }
  | { tipo: "conquista-ganha"; jogador: JogadorPublico; conquista: TipoConquista }
  | { tipo: "rodada-encerrada"; titulo: string; revelacao: Revelacao }
  | { tipo: "jogador-removido"; jogador: JogadorPublico }
  | { tipo: "partida-resetada" };

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
      // Reveal da última Rodada encerrada; some quando o Facilitador abre a próxima.
      revelacao: Revelacao | null;
      agora: string;
    }
  | { ok: false; erro: string };

export type EntradaPlacar = Jogador & {
  posicao: number;
  pontuacao: number;
  enviouNaRodada: boolean;
  tentativasNaRodada: number;
  conquistas: ConquistaPublica[];
};

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

// Tentativa com o nome de quem enviou, para montar o colocacoes e o reveal da Rodada.
type TentativaDaRodada = TentativaRegistrada & {
  prompt: string;
  jogador: { nickname: string; iniciais: string };
};

function paraJogador(registro: { id: string; nickname: string; iniciais: string }): Jogador {
  return { id: registro.id, nickname: registro.nickname, iniciais: registro.iniciais };
}

function paraJogadorPublico(registro: { nickname: string; iniciais: string }): JogadorPublico {
  return { nickname: registro.nickname, iniciais: registro.iniciais };
}

export function criarMotor(prisma: PrismaClient, opcoes: Opcoes = {}) {
  const desafios = opcoes.desafios ?? DESAFIOS;
  const relogio = opcoes.agora ?? (() => new Date());
  const ouvintes = new Set<(evento: Evento) => void>();

  function emitir(evento: Evento) {
    for (const ouvinte of ouvintes) ouvinte(evento);
  }

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

  async function tentativasDaRodada(rodadaId: string): Promise<TentativaDaRodada[]> {
    return prisma.tentativa.findMany({
      where: { rodadaId },
      select: {
        id: true,
        jogadorId: true,
        rodadaId: true,
        numero: true,
        nota: true,
        criadaEm: true,
        prompt: true,
        jogador: { select: { nickname: true, iniciais: true } },
      },
    });
  }

  // Reveal: Prompt de referência do Desafio e as três melhores Tentativas com Nota acima de zero.
  function montarRevelacao(
    rodada: RegistroRodada,
    colocacoes: ColocacaoNaRodada<TentativaDaRodada>[],
  ): Revelacao {
    const desafio = desafioDaRodada(rodada);
    return {
      desafio: { titulo: desafio.titulo, promptReferencia: desafio.promptReferencia },
      top3: colocacoes.slice(0, 3).map((colocacao, indice) => ({
        posicao: indice + 1,
        nickname: colocacao.melhor.jogador.nickname,
        iniciais: colocacao.melhor.jogador.iniciais,
        nota: colocacao.melhor.nota,
        prompt: colocacao.melhor.prompt,
      })),
    };
  }

  // Concede só as Conquistas que o Jogador ainda não tem nesta Rodada, e avisa cada uma.
  async function conceder(
    jogador: JogadorPublico & { id: string },
    rodadaId: string,
    tipos: TipoConquista[],
    instante: Date,
  ) {
    const ja = await prisma.conquista.findMany({
      where: { jogadorId: jogador.id, rodadaId },
      select: { tipo: true },
    });
    const existentes = new Set(ja.map((conquista) => conquista.tipo));

    for (const tipo of tipos) {
      if (existentes.has(tipo)) continue;
      await prisma.conquista.create({
        data: { jogadorId: jogador.id, rodadaId, tipo, criadaEm: instante },
      });
      existentes.add(tipo);
      emitir({ tipo: "conquista-ganha", jogador: paraJogadorPublico(jogador), conquista: tipo });
    }
  }

  // Encerra a Rodada, avisa o reveal e concede o Campeão da Rodada ao 1º lugar do colocacoes.
  async function encerrar(rodada: RegistroRodada, instante: Date): Promise<RegistroRodada> {
    const encerrada = await prisma.rodada.update({
      where: { id: rodada.id },
      data: { encerradaEm: instante },
    });

    const colocacoes = colocacoesDaRodada(await tentativasDaRodada(rodada.id));
    emitir({
      tipo: "rodada-encerrada",
      titulo: desafioDaRodada(rodada).titulo,
      revelacao: montarRevelacao(rodada, colocacoes),
    });

    const campeao = colocacoes[0];
    if (campeao) {
      await conceder(
        { id: campeao.jogadorId, ...paraJogadorPublico(campeao.melhor.jogador) },
        rodada.id,
        ["campeao-da-rodada"],
        instante,
      );
    }
    return encerrada;
  }

  // Reveal da última Rodada encerrada; só existe enquanto nenhuma Rodada está aberta.
  async function revelacaoDaUltimaRodada(): Promise<Revelacao | null> {
    const ultima = await ultimaRodada();
    if (!ultima) return null;
    return montarRevelacao(ultima, colocacoesDaRodada(await tentativasDaRodada(ultima.id)));
  }

  // Encerra a Rodada aberta se o prazo já passou. Sem prazo, nunca encerra.
  async function encerrarSePrazoVencido(agora: Date): Promise<boolean> {
    const aberta = await rodadaAberta();
    if (!aberta?.prazo || aberta.prazo > agora) return false;

    await encerrar(aberta, aberta.prazo);
    return true;
  }

  return {
    // Inscreve um ouvinte no feed. Devolve a função que cancela a inscrição.
    assinar(ouvinte: (evento: Evento) => void): () => void {
      ouvintes.add(ouvinte);
      return () => {
        ouvintes.delete(ouvinte);
      };
    },

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
        emitir({ tipo: "jogador-entrou", jogador: paraJogadorPublico(registro) });
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
        // Sem Rodada aberta, a última (já encerrada) fica no reveal até a próxima abrir.
        revelacao: rodada ? null : await revelacaoDaUltimaRodada(),
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
        emitir({ tipo: "rodada-aberta", titulo: desafio.titulo });
        return { ok: true as const, rodada: paraRodada(criada) };
      });
    },

    async encerrarRodada() {
      return exclusivo(async () => {
        const aberta = await rodadaAberta();
        if (!aberta) return { ok: false as const, erro: "Não há Rodada aberta." };

        const encerrada = await encerrar(aberta, relogio());
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

        const doJogador = await prisma.tentativa.findMany({
          where: { jogadorId: jogador.id, rodadaId: rodada.id },
          select: { numero: true, nota: true },
        });
        if (doJogador.length >= LIMITE_DE_TENTATIVAS) {
          return {
            ok: false as const,
            erro: `Você já usou as ${LIMITE_DE_TENTATIVAS} Tentativas desta Rodada.`,
          };
        }

        const primeiroDaRodada = (await prisma.tentativa.count({ where: { rodadaId: rodada.id } })) === 0;
        const numero = doJogador.length + 1;
        const avaliacao = avaliar(prompt, desafioDaRodada(rodada));
        const criada = await prisma.tentativa.create({
          data: {
            jogadorId: jogador.id,
            rodadaId: rodada.id,
            numero,
            prompt,
            nota: avaliacao.nota,
            avaliacao: JSON.stringify(avaliacao),
            criadaEm: agora,
          },
        });

        const publico = paraJogadorPublico(jogador);
        emitir({ tipo: "tentativa-enviada", jogador: publico, numero });
        if (avaliacao.nota === 100) emitir({ tipo: "nota-maxima", jogador: publico, numero });

        await conceder(
          { id: jogador.id, ...publico },
          rodada.id,
          conquistasDoEnvio({
            numero,
            nota: avaliacao.nota,
            notaDaPrimeira: doJogador.find((t) => t.numero === 1)?.nota,
            primeiroDaRodada,
          }),
          agora,
        );

        return {
          ok: true as const,
          tentativa: paraTentativa(criada),
          tentativasRestantes: LIMITE_DE_TENTATIVAS - numero,
        };
      });
    },

    // Placar: pontuação pela melhor Tentativa de cada Rodada, desempate justo e Conquistas.
    // Nunca inclui texto de prompt.
    async placar(): Promise<EntradaPlacar[]> {
      const jogadores = await prisma.jogador.findMany({
        select: { id: true, nickname: true, iniciais: true },
        orderBy: { criadoEm: "asc" },
      });
      const tentativas = await prisma.tentativa.findMany({
        select: { id: true, jogadorId: true, rodadaId: true, numero: true, nota: true, criadaEm: true },
      });
      const conquistas = await prisma.conquista.findMany({
        select: { jogadorId: true, rodadaId: true, tipo: true },
        orderBy: { criadaEm: "asc" },
      });
      const aberta = await rodadaAberta();

      const porJogador = agruparPorJogador(tentativas);
      const conquistasPorJogador = new Map<string, ConquistaPublica[]>();
      for (const conquista of conquistas) {
        const lista = conquistasPorJogador.get(conquista.jogadorId) ?? [];
        // O banco só grava tipos conhecidos, então o texto volta como TipoConquista.
        lista.push({ tipo: conquista.tipo as TipoConquista, rodadaId: conquista.rodadaId });
        conquistasPorJogador.set(conquista.jogadorId, lista);
      }

      const linhas = jogadores.map((jogador) => {
        const doJogador = porJogador.get(jogador.id) ?? [];
        const naRodada = aberta ? doJogador.filter((t) => t.rodadaId === aberta.id).length : 0;
        return {
          marca: marcaDoPlacar(doJogador),
          entrada: {
            ...paraJogador(jogador),
            pontuacao: 0,
            enviouNaRodada: naRodada > 0,
            tentativasNaRodada: naRodada,
            conquistas: conquistasPorJogador.get(jogador.id) ?? [],
          },
        };
      });

      // Array.prototype.sort é estável: empate total mantém a ordem de entrada na Sala.
      linhas.sort((a, b) => compararMarcas(a.marca, b.marca));
      return linhas.map(({ marca, entrada }, indice) => ({
        ...entrada,
        posicao: indice + 1,
        pontuacao: marca.pontuacao,
      }));
    },

    // Remove o Jogador: apaga as Tentativas e Conquistas dele e libera o Nickname e o token.
    async removerJogador(jogadorId: string) {
      return exclusivo(async () => {
        const jogador = await prisma.jogador.findUnique({ where: { id: jogadorId } });
        if (!jogador) return { ok: false as const, erro: "Jogador não encontrado." };

        await prisma.$transaction([
          prisma.conquista.deleteMany({ where: { jogadorId } }),
          prisma.tentativa.deleteMany({ where: { jogadorId } }),
          prisma.jogador.delete({ where: { id: jogadorId } }),
        ]);
        emitir({ tipo: "jogador-removido", jogador: paraJogadorPublico(jogador) });
        return { ok: true as const };
      });
    },

    // Reinicia a Sala para um novo workshop. Encerra a Rodada aberta junto, pois ela some.
    async resetarPartida() {
      return exclusivo(async () => {
        await prisma.$transaction([
          prisma.conquista.deleteMany(),
          prisma.tentativa.deleteMany(),
          prisma.rodada.deleteMany(),
          prisma.jogador.deleteMany(),
        ]);
        emitir({ tipo: "partida-resetada" });
        return { ok: true as const };
      });
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

      const jogadores = await prisma.jogador.findMany({
        select: { id: true, nickname: true, iniciais: true },
        orderBy: { criadoEm: "asc" },
      });

      return {
        desafios: [...desafios]
          .sort((a, b) => a.ordem - b.ordem)
          .map((desafio) => ({ ...resumir(desafio), jogado: jogadosIds.has(desafio.id) })),
        rodada: rodada ? paraRodada(rodada) : null,
        enviaram,
        jogadores: jogadores.map(paraJogador),
        revelacao: rodada ? null : await revelacaoDaUltimaRodada(),
        agora: relogio().toISOString(),
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
