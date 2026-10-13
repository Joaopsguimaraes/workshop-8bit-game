// Presença só em memória, derivada das conexões de socket abertas.
export function criarPresenca() {
  const socketsPorJogador = new Map<string, Set<string>>();
  const jogadorPorSocket = new Map<string, string>();

  return {
    conectar(jogadorId: string, socketId: string) {
      const sockets = socketsPorJogador.get(jogadorId) ?? new Set<string>();
      sockets.add(socketId);
      socketsPorJogador.set(jogadorId, sockets);
      jogadorPorSocket.set(socketId, jogadorId);
    },

    desconectar(socketId: string) {
      const jogadorId = jogadorPorSocket.get(socketId);
      if (!jogadorId) return;

      jogadorPorSocket.delete(socketId);
      const sockets = socketsPorJogador.get(jogadorId);
      sockets?.delete(socketId);
      if (sockets?.size === 0) socketsPorJogador.delete(jogadorId);
    },

    estaOnline(jogadorId: string): boolean {
      return socketsPorJogador.has(jogadorId);
    },
  };
}

export type Presenca = ReturnType<typeof criarPresenca>;
