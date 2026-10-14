"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { AttemptResult, PlayerState } from "@/lib/engine/engine";
import type { FeedItem, LiveScoreboardEntry } from "@/lib/realtime";
import { withTimeout } from "./with-timeout";

// How long an Attempt may wait for its answer before the Player is told it did not go through.
export const ATTEMPT_ANSWER_TIMEOUT_MS = 30_000;

type OkState = Extract<PlayerState, { ok: true }>;

// `clockOffsetMs` is the difference between the server clock and the browser clock, for the timer.
export type LivePlayerState = OkState & { clockOffsetMs: number };

// Progress of the own Player: their score improved in the Round or they moved up in the Scoreboard.
export type Progress = "score" | "position";

type Options = {
  token: string;
  onSessionInvalid: () => void;
  onProgress?: (progress: Progress) => void;
};

const FEED_MAX = 50;

// Keeps the Scoreboard, feed and player state live. The connection uses the token as the socket identity.
export function useRealtime({ token, onSessionInvalid, onProgress }: Options) {
  const [players, setPlayers] = useState<LiveScoreboardEntry[] | null>(null);
  const [state, setState] = useState<LivePlayerState | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const onSessionInvalidRef = useRef(onSessionInvalid);
  const onProgressRef = useRef(onProgress);
  // Last reading of the Round, to detect improvement. Null until the first reading.
  const lastScoreRef = useRef<{ roundId: string | null; score: number; sent: number } | null>(
    null,
  );
  const lastPositionRef = useRef<number | null>(null);
  const myIdRef = useRef<string | null>(null);

  useEffect(() => {
    onSessionInvalidRef.current = onSessionInvalid;
    onProgressRef.current = onProgress;
  }, [onSessionInvalid, onProgress]);

  useEffect(() => {
    const socket: Socket = io({ auth: { token } });
    socketRef.current = socket;

    socket.on("scoreboard", (data: { players: LiveScoreboardEntry[] }) => {
      setPlayers(data.players);
      const myId = myIdRef.current;
      const me = data.players.find((player) => player.id === myId);
      if (!me) return;
      const previous = lastPositionRef.current;
      lastPositionRef.current = me.position;
      if (previous !== null && me.position < previous) onProgressRef.current?.("position");
    });

    socket.on("player:state", (data: PlayerState) => {
      if (!data.ok) return;
      myIdRef.current = data.player.id;

      const roundId = data.round?.id ?? null;
      const score = Math.max(0, ...data.attempts.map((attempt) => attempt.score));
      const sent = data.attempts.length;
      const previous = lastScoreRef.current;
      lastScoreRef.current = { roundId, score, sent };
      // Only counts as improvement when there was already an Attempt in the Round; the 1st is not "improvement".
      if (
        previous &&
        previous.roundId === roundId &&
        previous.sent > 0 &&
        score > previous.score
      ) {
        onProgressRef.current?.("score");
      }

      setState({ ...data, clockOffsetMs: Date.parse(data.now) - Date.now() });
    });

    socket.on("feed:history", (items: FeedItem[]) => {
      setFeed(items.slice(-FEED_MAX));
    });
    socket.on("feed:event", (item: FeedItem) => {
      setFeed((current) => [...current, item].slice(-FEED_MAX));
    });

    socket.on("session:invalid", () => {
      onSessionInvalidRef.current();
    });

    return () => {
      socketRef.current = null;
      socket.close();
    };
  }, [token]);

  const submitAttempt = useCallback(
    (prompt: string) =>
      withTimeout(
        new Promise<AttemptResult>((resolve) => {
          const socket = socketRef.current;
          if (!socket) {
            resolve({ ok: false, error: "Sem conexão com o servidor. Tente de novo." });
            return;
          }
          socket.emit("attempt:submit", prompt, resolve);
        }),
        ATTEMPT_ANSWER_TIMEOUT_MS,
        { ok: false, error: "Sem resposta do servidor. Verifique sua conexão e tente de novo." },
      ),
    [],
  );

  return { players, state, feed, submitAttempt };
}
