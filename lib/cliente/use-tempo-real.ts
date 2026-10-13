"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { EstadoDoJogador, ResultadoEnvio } from "@/lib/motor/motor";
import type { EntradaPlacarAoVivo } from "@/lib/tempo-real";

type EstadoOk = Extract<EstadoDoJogador, { ok: true }>;

// `desvioMs` é a diferença entre o relógio do servidor e o do navegador, para o cronômetro.
export type EstadoJogadorAoVivo = EstadoOk & { desvioMs: number };

type Opcoes = { token: string; onSessaoInvalida: () => void };

// Mantém o Placar e o estado do Jogador ao vivo. A conexão usa o token como identidade do socket.
export function useTempoReal({ token, onSessaoInvalida }: Opcoes) {
  const [jogadores, setJogadores] = useState<EntradaPlacarAoVivo[] | null>(null);
  const [estado, setEstado] = useState<EstadoJogadorAoVivo | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const aoInvalidarRef = useRef(onSessaoInvalida);

  useEffect(() => {
    aoInvalidarRef.current = onSessaoInvalida;
  }, [onSessaoInvalida]);

  useEffect(() => {
    const socket: Socket = io({ auth: { token } });
    socketRef.current = socket;

    socket.on("placar", (dados: { jogadores: EntradaPlacarAoVivo[] }) => {
      setJogadores(dados.jogadores);
    });
    socket.on("jogador:estado", (dados: EstadoDoJogador) => {
      if (!dados.ok) return;
      setEstado({ ...dados, desvioMs: Date.parse(dados.agora) - Date.now() });
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
      new Promise<ResultadoEnvio>((resolver) => {
        const socket = socketRef.current;
        if (!socket) {
          resolver({ ok: false, erro: "Sem conexão com o servidor. Tente de novo." });
          return;
        }
        socket.emit("tentativa:enviar", prompt, resolver);
      }),
    [],
  );

  return { jogadores, estado, enviarTentativa };
}
