import type { Server as ServidorHttp } from "node:http";
import { Server, type Socket } from "socket.io";
import {
  NOME_COOKIE_FACILITADOR,
  segredoDoProcesso,
  sessaoFacilitadorValida,
  valorDoCookie,
} from "./facilitador/sessao";
import type { EntradaPlacar, Evento, Motor } from "./motor/motor";
import type { Presenca } from "./presenca";

export type EntradaPlacarAoVivo = EntradaPlacar & { online: boolean };

// Evento do feed com um número crescente, para o cliente ordenar e não repetir.
export type ItemDoFeed = { id: number; evento: Evento };

type Dependencias = { httpServer: ServidorHttp; motor: Motor; presenca: Presenca };

const SALA_FACILITADORES = "facilitadores";
const INTERVALO_DO_TICK_MS = 1000;
const FEED_MAXIMO = 30;

// Casca fina: traduz sockets em chamadas ao Motor e distribui o estado de cada papel.
export function instalarTempoReal({ httpServer, motor, presenca }: Dependencias) {
  const io = new Server(httpServer);

  // Feed da Sala: os eventos recentes ficam na memória, para quem entra depois ver o que aconteceu.
  const feed: ItemDoFeed[] = [];
  let proximoId = 1;
  motor.assinar((evento) => {
    const item: ItemDoFeed = { id: proximoId++, evento };
    if (evento.tipo === "partida-resetada") {
      // Partida nova: o feed antigo sai da tela de todos, inclusive do Telão.
      feed.length = 0;
      feed.push(item);
      io.emit("feed:historico", feed);
      return;
    }
    feed.push(item);
    if (feed.length > FEED_MAXIMO) feed.shift();
    io.emit("feed:evento", item);
  });

  async function enviarPlacar() {
    try {
      const jogadores = await motor.placar();
      const placar: EntradaPlacarAoVivo[] = jogadores.map((jogador) => ({
        ...jogador,
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
    try {
      io.to(SALA_FACILITADORES).emit("facilitador:estado", await motor.estadoDoFacilitador());
    } catch (erro) {
      // Uma falha ao ler o estado do Facilitador não pode impedir o envio aos Jogadores.
      console.error("Falha ao enviar o estado do Facilitador", erro);
    }
  }

  // Depois de qualquer mudança de estado: cada Jogador recebe só o próprio estado.
  async function atualizarTudo() {
    await enviarPlacar();
    await enviarEstadoDoFacilitador();
    for (const socket of io.sockets.sockets.values()) {
      if (socket.data.papel === "jogador") await enviarEstadoDoJogador(socket);
    }
  }

  // Leva o socket de volta ao login: o Motor já não aceita o token dele.
  function expulsar(socket: Socket) {
    socket.emit("sessao:invalida");
    socket.disconnect(true);
  }

  function conectarJogador(socket: Socket, token: string, jogadorId: string) {
    socket.data.papel = "jogador";
    socket.data.token = token;
    socket.data.jogadorId = jogadorId;
    presenca.conectar(jogadorId, socket.id);
    socket.emit("feed:historico", feed);

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
      // Mesmo um envio recusado pode ter encerrado a Rodada, porque o prazo já tinha vencido.
      await atualizarTudo();
    });
  }

  function conectarFacilitador(socket: Socket) {
    socket.data.papel = "facilitador";
    void socket.join(SALA_FACILITADORES);
    socket.emit("feed:historico", feed);

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

    socket.on(
      "facilitador:removerJogador",
      async (dados: { jogadorId?: unknown }, responder?: unknown) => {
        const jogadorId = String(dados?.jogadorId ?? "");
        const resultado = await motor.removerJogador(jogadorId);
        if (typeof responder === "function") responder(resultado);
        if (!resultado.ok) return;

        for (const alvo of io.sockets.sockets.values()) {
          if (alvo.data.jogadorId === jogadorId) expulsar(alvo);
        }
        await atualizarTudo();
      },
    );

    socket.on("facilitador:resetarPartida", async (responder?: unknown) => {
      const resultado = await motor.resetarPartida();
      if (typeof responder === "function") responder(resultado);
      if (!resultado.ok) return;

      // Todos os Jogadores voltam ao login; o Facilitador continua na própria tela.
      for (const alvo of io.sockets.sockets.values()) {
        if (alvo.data.papel === "jogador") expulsar(alvo);
      }
      await atualizarTudo();
    });

    void enviarEstadoDoFacilitador();
    // O Telão precisa do Placar já na abertura; o Placar só é enviado depois de uma mudança.
    void enviarPlacar();
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
      // Se o Facilitador removeu o Jogador enquanto o socket conectava, a checagem acima já passou.
      // Conferir de novo, agora que o socket já está na lista de expulsão, fecha essa janela.
      const confirmacao = await motor.retomar(token);
      if (!confirmacao.ok) {
        expulsar(socket);
        return;
      }
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
