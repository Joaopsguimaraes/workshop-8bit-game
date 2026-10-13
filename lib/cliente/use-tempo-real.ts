"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { EntradaPlacarAoVivo } from "@/lib/tempo-real";

type Opcoes = { token: string; onSessaoInvalida: () => void };

// Mantém o Placar ao vivo. A conexão usa o token como identidade do socket.
export function useTempoReal({ token, onSessaoInvalida }: Opcoes) {
  const [jogadores, setJogadores] = useState<EntradaPlacarAoVivo[] | null>(null);
  const aoInvalidarRef = useRef(onSessaoInvalida);

  useEffect(() => {
    aoInvalidarRef.current = onSessaoInvalida;
  }, [onSessaoInvalida]);

  useEffect(() => {
    const socket: Socket = io({ auth: { token } });

    socket.on("placar", (dados: { jogadores: EntradaPlacarAoVivo[] }) => {
      setJogadores(dados.jogadores);
    });
    socket.on("sessao:invalida", () => {
      aoInvalidarRef.current();
    });

    return () => {
      socket.close();
    };
  }, [token]);

  return { jogadores };
}
