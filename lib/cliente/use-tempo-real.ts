"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { EstadoDoJogador, ResultadoTentativa } from "@/lib/motor/motor";
import type { EntradaPlacarAoVivo, ItemDoFeed } from "@/lib/tempo-real";

type EstadoOk = Extract<EstadoDoJogador, { ok: true }>;

// `desvioMs` é a diferença entre o relógio do servidor e o do navegador, para o cronômetro.
export type EstadoJogadorAoVivo = EstadoOk & { desvioMs: number };

// Progresso do próprio Jogador: sua Nota melhorou na Rodada ou ele subiu de posição no Placar.
export type Progresso = "nota" | "posicao";

type Opcoes = {
  token: string;
  onSessaoInvalida: () => void;
  onProgresso?: (progresso: Progresso) => void;
};

const FEED_MAXIMO = 50;

// Mantém o Placar, o feed e o estado do Jogador ao vivo. A conexão usa o token como identidade do socket.
export function useTempoReal({ token, onSessaoInvalida, onProgresso }: Opcoes) {
  const [jogadores, setJogadores] = useState<EntradaPlacarAoVivo[] | null>(null);
  const [estado, setEstado] = useState<EstadoJogadorAoVivo | null>(null);
  const [feed, setFeed] = useState<ItemDoFeed[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const aoInvalidarRef = useRef(onSessaoInvalida);
  const aoProgressoRef = useRef(onProgresso);
  // Última leitura da Rodada, para detectar melhora. Null até a primeira leitura.
  const ultimaNotaRef = useRef<{ rodadaId: string | null; nota: number; enviadas: number } | null>(
    null,
  );
  const ultimaPosicaoRef = useRef<number | null>(null);
  const meuIdRef = useRef<string | null>(null);

  useEffect(() => {
    aoInvalidarRef.current = onSessaoInvalida;
    aoProgressoRef.current = onProgresso;
  }, [onSessaoInvalida, onProgresso]);

  useEffect(() => {
    const socket: Socket = io({ auth: { token } });
    socketRef.current = socket;

    socket.on("placar", (dados: { jogadores: EntradaPlacarAoVivo[] }) => {
      setJogadores(dados.jogadores);
      const meuId = meuIdRef.current;
      const eu = dados.jogadores.find((jogador) => jogador.id === meuId);
      if (!eu) return;
      const anterior = ultimaPosicaoRef.current;
      ultimaPosicaoRef.current = eu.posicao;
      if (anterior !== null && eu.posicao < anterior) aoProgressoRef.current?.("posicao");
    });

    socket.on("jogador:estado", (dados: EstadoDoJogador) => {
      if (!dados.ok) return;
      meuIdRef.current = dados.jogador.id;

      const rodadaId = dados.rodada?.id ?? null;
      const nota = Math.max(0, ...dados.tentativas.map((tentativa) => tentativa.nota));
      const enviadas = dados.tentativas.length;
      const anterior = ultimaNotaRef.current;
      ultimaNotaRef.current = { rodadaId, nota, enviadas };
      // Só conta como melhora quando já havia uma Tentativa na Rodada; a 1ª não é "melhora".
      if (
        anterior &&
        anterior.rodadaId === rodadaId &&
        anterior.enviadas > 0 &&
        nota > anterior.nota
      ) {
        aoProgressoRef.current?.("nota");
      }

      setEstado({ ...dados, desvioMs: Date.parse(dados.agora) - Date.now() });
    });

    socket.on("feed:historico", (itens: ItemDoFeed[]) => {
      setFeed(itens.slice(-FEED_MAXIMO));
    });
    socket.on("feed:evento", (item: ItemDoFeed) => {
      setFeed((atual) => [...atual, item].slice(-FEED_MAXIMO));
    });

    socket.on("sessao:invalida", () => {
      aoInvalidarRef.current();
    });

    return () => {
      socketRef.current = null;
      socket.close();
    };
  }, [token]);

  const enviarTentativa = useCallback(
    (prompt: string) =>
      new Promise<ResultadoTentativa>((resolver) => {
        const socket = socketRef.current;
        if (!socket) {
          resolver({ ok: false, erro: "Sem conexão com o servidor. Tente de novo." });
          return;
        }
        socket.emit("tentativa:enviar", prompt, resolver);
      }),
    [],
  );

  return { jogadores, estado, feed, enviarTentativa };
}
