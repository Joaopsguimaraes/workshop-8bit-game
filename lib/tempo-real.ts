import type { Server as ServidorHttp } from "node:http";
import { Server, type Socket } from "socket.io";
import {
  NOME_COOKIE_FACILITADOR,
  segredoDoProcesso,
  sessaoFacilitadorValida,
  valorDoCookie,
} from "./facilitador/sessao";
import type { Motor } from "./motor/motor";
import type { Presenca } from "./presenca";

export type EntradaPlacarAoVivo = {
  id: string;
  nickname: string;
  iniciais: string;
  online: boolean;
  pontuacao: number;
};

type Dependencias = { httpServer: ServidorHttp; motor: Motor; presenca: Presenca };

const SALA_FACILITADORES = "facilitadores";
const INTERVALO_DO_TICK_MS = 1000;

// Casca fina: traduz sockets em chamadas ao Motor e distribui o estado de cada papel.
export function instalarTempoReal({ httpServer, motor, presenca }: Dependencias) {
  const io = new Server(httpServer);

  async function enviarPlacar() {
    try {
      const jogadores = await motor.placar();
      const placar: EntradaPlacarAoVivo[] = jogadores.map((jogador) => ({
        id: jogador.id,
        nickname: jogador.nickname,
        iniciais: jogador.iniciais,
        pontuacao: jogador.pontuacao,
        online: presenca.estaOnline(jogador.id),
      }));
      io.emit("placar", { jogadores: placar });
    } catch (erro) {
      // Uma falha ao ler o Placar não pode derrubar o servidor inteiro.
      console.error("Falha ao enviar o Placar", erro);
    }
  }

  async function enviarEstadoDoJogador(socket: Socket) {
    const estado = await motor.estadoDoJogador(socket.data.token);
    socket.emit("jogador:estado", estado);
  }

  async function enviarEstadoDoFacilitador() {
    io.to(SALA_FACILITADORES).emit("facilitador:estado", await motor.estadoDoFacilitador());
  }

  // Depois de qualquer mudança de estado: cada Jogador recebe só o próprio estado.
  async function atualizarTudo() {
    await enviarPlacar();
    await enviarEstadoDoFacilitador();
    for (const socket of io.sockets.sockets.values()) {
      if (socket.data.papel === "jogador") await enviarEstadoDoJogador(socket);
    }
  }

  function conectarJogador(socket: Socket, token: string, jogadorId: string) {
    socket.data.papel = "jogador";
    socket.data.token = token;
    presenca.conectar(jogadorId, socket.id);

    socket.on("disconnect", () => {
      presenca.desconectar(socket.id);
      void enviarPlacar();
    });

    socket.on("tentativa:enviar", async (prompt: unknown, responder?: unknown) => {
      const resultado =
        typeof prompt === "string"
          ? await motor.enviarTentativa(token, prompt)
          : { ok: false as const, erro: "Escreva um prompt antes de enviar." };
      if (typeof responder === "function") responder(resultado);
      if (resultado.ok) await atualizarTudo();
    });
  }

  function conectarFacilitador(socket: Socket) {
    socket.data.papel = "facilitador";
    void socket.join(SALA_FACILITADORES);

    socket.on(
      "facilitador:abrirRodada",
      async (dados: { desafioId?: unknown; duracaoSegundos?: unknown }, responder?: unknown) => {
        const resultado = await motor.abrirRodada(
          String(dados?.desafioId ?? ""),
          dados?.duracaoSegundos == null ? undefined : Number(dados.duracaoSegundos),
        );
        if (typeof responder === "function") responder(resultado);
        if (resultado.ok) await atualizarTudo();
      },
    );

    socket.on("facilitador:encerrarRodada", async (responder?: unknown) => {
      const resultado = await motor.encerrarRodada();
      if (typeof responder === "function") responder(resultado);
      if (resultado.ok) await atualizarTudo();
    });

    void enviarEstadoDoFacilitador();
  }

  io.on("connection", async (socket) => {
    const token = socket.handshake.auth?.token;

    if (typeof token === "string") {
      const resultado = await motor.retomar(token);
      if (!resultado.ok) {
        socket.emit("sessao:invalida");
        socket.disconnect(true);
        return;
      }
      // O cliente pode ter fechado enquanto o token era validado.
      if (!socket.connected) return;

      conectarJogador(socket, token, resultado.jogador.id);
      await enviarPlacar();
      await enviarEstadoDoJogador(socket);
      return;
    }

    const cookie = valorDoCookie(socket.handshake.headers.cookie, NOME_COOKIE_FACILITADOR);
    if (sessaoFacilitadorValida(cookie, segredoDoProcesso(), new Date())) {
      conectarFacilitador(socket);
      return;
    }

    socket.emit("facilitador:invalido");
    socket.disconnect(true);
  });

  // Tick do servidor: encerra a Rodada quando o prazo vence, sem depender de ninguém clicar.
  setInterval(() => {
    void (async () => {
      try {
        const { encerrou } = await motor.verificarPrazo(new Date());
        if (encerrou) await atualizarTudo();
      } catch (erro) {
        console.error("Falha ao verificar o prazo da Rodada", erro);
      }
    })();
  }, INTERVALO_DO_TICK_MS);

  return io;
}
