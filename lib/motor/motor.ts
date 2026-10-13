import { randomBytes } from "node:crypto";
import { validarNickname } from "../nickname";
import type { PrismaClient } from "../../generated/prisma/client";

// Única porta para mudar o estado da Sala. Recebe comandos e devolve resultados.
export type Jogador = { id: string; nickname: string; iniciais: string };

export type ResultadoEntrada =
  | { ok: true; token: string; jogador: Jogador }
  | { ok: false; erro: string };

export type ResultadoRetomada = { ok: true; jogador: Jogador } | { ok: false; erro: string };

// `rodada` fica null até existir Rodada aberta (ticket 02).
export type EstadoDoJogador =
  | { ok: true; jogador: Jogador; rodada: null }
  | { ok: false; erro: string };

export type EntradaPlacar = Jogador;

const SESSAO_INVALIDA = "Sessão inválida. Entre novamente.";
const NICKNAME_EM_USO = "Nickname já em uso";

function paraJogador(registro: { id: string; nickname: string; iniciais: string }): Jogador {
  return { id: registro.id, nickname: registro.nickname, iniciais: registro.iniciais };
}

export function criarMotor(prisma: PrismaClient) {
  async function buscarPorToken(token: string) {
    return prisma.jogador.findUnique({ where: { token } });
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
      return { ok: true, jogador: paraJogador(registro), rodada: null };
    },

    async placar(): Promise<EntradaPlacar[]> {
      const registros = await prisma.jogador.findMany({
        select: { id: true, nickname: true, iniciais: true },
        orderBy: { criadoEm: "asc" },
      });
      return registros.map(paraJogador);
    },
  };
}

export type Motor = ReturnType<typeof criarMotor>;

function ehViolacaoDeUnicidade(erro: unknown): boolean {
  return typeof erro === "object" && erro !== null && "code" in erro && erro.code === "P2002";
}
