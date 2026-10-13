import type { Server as ServidorHttp } from "node:http";
import { Server } from "socket.io";
import type { Motor } from "./motor/motor";
import type { Presenca } from "./presenca";

export type EntradaPlacarAoVivo = {
  id: string;
  nickname: string;
  iniciais: string;
  online: boolean;
};

type Dependencias = { httpServer: ServidorHttp; motor: Motor; presenca: Presenca };

// Casca fina: traduz sockets em chamadas ao Motor e distribui o Placar.
export function instalarTempoReal({ httpServer, motor, presenca }: Dependencias) {
  const io = new Server(httpServer);

  async function enviarPlacar() {
    const jogadores = await motor.placar();
    const placar: EntradaPlacarAoVivo[] = jogadores.map((jogador) => ({
      ...jogador,
      online: presenca.estaOnline(jogador.id),
    }));
    io.emit("placar", { jogadores: placar });
  }

  io.on("connection", async (socket) => {
    const token = socket.handshake.auth?.token;
    const resultado =
      typeof token === "string" ? await motor.retomar(token) : { ok: false as const };

    if (!resultado.ok) {
      socket.emit("sessao:invalida");
      socket.disconnect(true);
      return;
    }

    // O cliente pode ter fechado enquanto o token era validado.
    if (!socket.connected) return;

    presenca.conectar(resultado.jogador.id, socket.id);
    socket.on("disconnect", () => {
      presenca.desconectar(socket.id);
      void enviarPlacar();
    });
    await enviarPlacar();
  });

  return io;
}
