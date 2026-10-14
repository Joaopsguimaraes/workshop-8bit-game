import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import type { Engine, Event, ScoreboardEntry } from "./engine/engine";
import {
  cookieValue,
  FACILITATOR_COOKIE_NAME,
  isFacilitatorSessionValid,
  processSecret,
} from "./facilitator/session";
import type { Presence } from "./presence";

export type LiveScoreboardEntry = ScoreboardEntry & { online: boolean };

// Feed event with an increasing number, so the client can sort it and not repeat it.
export type FeedItem = { id: number; event: Event };

type Deps = { httpServer: HttpServer; engine: Engine; presence: Presence };

const FACILITATOR_ROOM = "facilitators";
const TICK_INTERVAL_MS = 1000;
const FEED_MAX = 30;

// Thin shell: translates sockets into Engine calls and distributes each role's state.
export function installRealtime({ httpServer, engine, presence }: Deps) {
  const io = new Server(httpServer);

  // Counts the Rounds closed so far, so an Attempt can tell whether it was the one that closed a Round.
  let roundsClosed = 0;

  // Room feed: recent events stay in memory, so late joiners can see what happened.
  const feed: FeedItem[] = [];
  let nextId = 1;
  engine.subscribe((event) => {
    if (event.type === "round-closed") roundsClosed++;
    const item: FeedItem = { id: nextId++, event };
    if (event.type === "match-reset") {
      // New match: the old feed leaves everyone's screen, including the big screen.
      feed.length = 0;
      feed.push(item);
      io.emit("feed:history", feed);
      return;
    }
    feed.push(item);
    if (feed.length > FEED_MAX) feed.shift();
    io.emit("feed:event", item);
  });

  async function sendScoreboard() {
    try {
      const players = await engine.scoreboard();
      const scoreboard: LiveScoreboardEntry[] = players.map((player) => ({
        ...player,
        online: presence.isOnline(player.id),
      }));
      io.emit("scoreboard", { players: scoreboard });
    } catch (error) {
      // A failure reading the Scoreboard must not bring down the whole server.
      console.error("Falha ao enviar o Placar", error);
    }
  }

  async function sendPlayerState(socket: Socket) {
    const state = await engine.playerState(socket.data.token);
    socket.emit("player:state", state);
  }

  async function sendPlayerStates(include: (socket: Socket) => boolean) {
    for (const socket of io.sockets.sockets.values()) {
      if (socket.data.role === "player" && include(socket)) await sendPlayerState(socket);
    }
  }

  async function sendFacilitatorState() {
    try {
      io.to(FACILITATOR_ROOM).emit("facilitator:state", await engine.facilitatorState());
    } catch (error) {
      // A failure reading the Facilitator state must not block the send to the Players.
      console.error("Falha ao enviar o estado do Facilitador", error);
    }
  }

  // After any state change: each Player receives only their own state.
  async function updateAll() {
    await sendScoreboard();
    await sendFacilitatorState();
    await sendPlayerStates(() => true);
  }

  // After an Attempt: only the Player who sent it gets a new state, on every tab they have open.
  async function updateAfterAttempt(playerId: string) {
    await sendScoreboard();
    await sendFacilitatorState();
    await sendPlayerStates((socket) => socket.data.playerId === playerId);
  }

  // Sends the socket back to login: the Engine no longer accepts its token.
  function expel(socket: Socket) {
    socket.emit("session:invalid");
    socket.disconnect(true);
  }

  function connectPlayer(socket: Socket, token: string, playerId: string) {
    socket.data.role = "player";
    socket.data.token = token;
    socket.data.playerId = playerId;
    presence.connect(playerId, socket.id);
    socket.emit("feed:history", feed);

    socket.on("disconnect", () => {
      presence.disconnect(socket.id);
      void sendScoreboard();
    });

    socket.on("attempt:submit", async (prompt: unknown, respond?: unknown) => {
      const closedBefore = roundsClosed;
      const result =
        typeof prompt === "string"
          ? await engine.submitAttempt(token, prompt)
          : { ok: false as const, error: "Escreva um prompt antes de enviar." };
      if (typeof respond === "function") respond(result);
      // Even a refused submission may have closed the Round, because the deadline had already passed.
      // A closed Round changes every Player's state, so it gets the full refresh.
      if (roundsClosed !== closedBefore) await updateAll();
      else await updateAfterAttempt(playerId);
    });
  }

  function connectFacilitator(socket: Socket) {
    socket.data.role = "facilitator";
    void socket.join(FACILITATOR_ROOM);
    socket.emit("feed:history", feed);

    socket.on(
      "facilitator:openRound",
      async (data: { challengeId?: unknown; durationSeconds?: unknown }, respond?: unknown) => {
        const result = await engine.openRound(
          String(data?.challengeId ?? ""),
          data?.durationSeconds == null ? undefined : Number(data.durationSeconds),
        );
        if (typeof respond === "function") respond(result);
        if (result.ok) await updateAll();
      },
    );

    socket.on("facilitator:closeRound", async (respond?: unknown) => {
      const result = await engine.closeRound();
      if (typeof respond === "function") respond(result);
      if (result.ok) await updateAll();
    });

    socket.on(
      "facilitator:removePlayer",
      async (data: { playerId?: unknown }, respond?: unknown) => {
        const playerId = String(data?.playerId ?? "");
        const result = await engine.removePlayer(playerId);
        if (typeof respond === "function") respond(result);
        if (!result.ok) return;

        for (const target of io.sockets.sockets.values()) {
          if (target.data.playerId === playerId) expel(target);
        }
        await updateAll();
      },
    );

    socket.on("facilitator:resetMatch", async (respond?: unknown) => {
      const result = await engine.resetMatch();
      if (typeof respond === "function") respond(result);
      if (!result.ok) return;

      // All Players go back to login; the Facilitator stays on their own screen.
      for (const target of io.sockets.sockets.values()) {
        if (target.data.role === "player") expel(target);
      }
      await updateAll();
    });

    void sendFacilitatorState();
    // The big screen needs the Scoreboard as soon as it opens; the Scoreboard is otherwise only sent after a change.
    void sendScoreboard();
  }

  io.on("connection", async (socket) => {
    const token = socket.handshake.auth?.token;

    if (typeof token === "string") {
      const result = await engine.resume(token);
      if (!result.ok) {
        socket.emit("session:invalid");
        socket.disconnect(true);
        return;
      }
      // The client may have closed while the token was being validated.
      if (!socket.connected) return;

      connectPlayer(socket, token, result.player.id);
      // If the Facilitator removed the Player while the socket was connecting, the check above already passed.
      // Checking again, now that the socket is on the expulsion list, closes that window.
      const confirmation = await engine.resume(token);
      if (!confirmation.ok) {
        expel(socket);
        return;
      }
      await sendScoreboard();
      await sendPlayerState(socket);
      return;
    }

    const cookie = cookieValue(socket.handshake.headers.cookie, FACILITATOR_COOKIE_NAME);
    if (isFacilitatorSessionValid(cookie, processSecret(), new Date())) {
      connectFacilitator(socket);
      return;
    }

    socket.emit("facilitator:invalid");
    socket.disconnect(true);
  });

  // Server tick: closes the Round when the deadline passes, without anyone clicking.
  const tick = setInterval(() => {
    void (async () => {
      try {
        const { closed } = await engine.checkDeadline(new Date());
        if (closed) await updateAll();
      } catch (error) {
        console.error("Falha ao verificar o prazo da Rodada", error);
      }
    })();
  }, TICK_INTERVAL_MS);
  httpServer.on("close", () => clearInterval(tick));

  return io;
}
