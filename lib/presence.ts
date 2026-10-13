// Presence lives only in memory, derived from the open socket connections.
export function createPresence() {
  const socketsByPlayer = new Map<string, Set<string>>();
  const playerBySocket = new Map<string, string>();

  return {
    connect(playerId: string, socketId: string) {
      const sockets = socketsByPlayer.get(playerId) ?? new Set<string>();
      sockets.add(socketId);
      socketsByPlayer.set(playerId, sockets);
      playerBySocket.set(socketId, playerId);
    },

    disconnect(socketId: string) {
      const playerId = playerBySocket.get(socketId);
      if (!playerId) return;

      playerBySocket.delete(socketId);
      const sockets = socketsByPlayer.get(playerId);
      sockets?.delete(socketId);
      if (sockets?.size === 0) socketsByPlayer.delete(playerId);
    },

    isOnline(playerId: string): boolean {
      return socketsByPlayer.has(playerId);
    },
  };
}

export type Presence = ReturnType<typeof createPresence>;
