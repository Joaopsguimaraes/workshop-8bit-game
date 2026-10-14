"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AttemptResult, FeedItem, PlayerState } from "@/lib/engine/engine";
import type { LiveScoreboardEntry } from "@/lib/live";
import { withTimeout } from "./with-timeout";

// How long an Attempt may wait for its answer before the Player is told it did not go through.
export const ATTEMPT_ANSWER_TIMEOUT_MS = 30_000;
// How often the Player's screen asks the server for news. A poll costs one request; the Scoreboard
// and the feed travel with it.
export const POLL_INTERVAL_MS = 2000;

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

type PlayerPoll = { state: PlayerState; players: LiveScoreboardEntry[]; feed: FeedItem[] };

const FEED_MAX = 50;

// Keeps the Scoreboard, feed and player state live by polling the server. The token identifies the Player.
export function useRealtime({ token, onSessionInvalid, onProgress }: Options) {
  const [players, setPlayers] = useState<LiveScoreboardEntry[] | null>(null);
  const [state, setState] = useState<LivePlayerState | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const pollNowRef = useRef<(() => void) | null>(null);
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
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function applyPoll(data: PlayerPoll) {
      const own = data.state;
      if (own.ok) {
        myIdRef.current = own.player.id;

        const roundId = own.round?.id ?? null;
        const score = Math.max(0, ...own.attempts.map((attempt) => attempt.score));
        const sent = own.attempts.length;
        const previous = lastScoreRef.current;
        lastScoreRef.current = { roundId, score, sent };
        // Only counts as improvement when there was already an Attempt in the Round; the 1st is not "improvement".
        if (previous && previous.roundId === roundId && previous.sent > 0 && score > previous.score) {
          onProgressRef.current?.("score");
        }
        setState({ ...own, clockOffsetMs: Date.parse(own.now) - Date.now() });
      }

      setPlayers(data.players);
      const me = data.players.find((player) => player.id === myIdRef.current);
      if (me) {
        const previous = lastPositionRef.current;
        lastPositionRef.current = me.position;
        if (previous !== null && me.position < previous) onProgressRef.current?.("position");
      }

      setFeed(data.feed.slice(-FEED_MAX));
    }

    async function poll() {
      try {
        const response = await fetch("/api/player/poll", {
          headers: { authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (response.status === 401) {
          // The server no longer knows this token: the Player was removed or the Room was reset.
          stopped = true;
          onSessionInvalidRef.current();
          return;
        }
        if (!response.ok) throw new Error(`poll respondeu ${response.status}`);
        const data = (await response.json()) as PlayerPoll;
        if (!stopped) applyPoll(data);
      } catch {
        // A failed poll keeps the last reading on screen; the next one tries again.
      } finally {
        if (!stopped) {
          clearTimeout(timer);
          timer = setTimeout(() => void poll(), POLL_INTERVAL_MS);
        }
      }
    }

    pollNowRef.current = () => {
      clearTimeout(timer);
      void poll();
    };
    void poll();

    return () => {
      stopped = true;
      clearTimeout(timer);
      pollNowRef.current = null;
    };
  }, [token]);

  const submitAttempt = useCallback(
    (prompt: string) =>
      withTimeout(
        (async (): Promise<AttemptResult> => {
          try {
            const response = await fetch("/api/player/attempt", {
              method: "POST",
              headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
              body: JSON.stringify({ prompt }),
            });
            if (response.status === 401) onSessionInvalidRef.current();
            return (await response.json()) as AttemptResult;
          } catch {
            return { ok: false, error: "Sem conexão com o servidor. Tente de novo." };
          } finally {
            // The answer changes the Player's state and the Scoreboard: read them now, not at the next poll.
            pollNowRef.current?.();
          }
        })(),
        ATTEMPT_ANSWER_TIMEOUT_MS,
        { ok: false, error: "Sem resposta do servidor. Verifique sua conexão e tente de novo." },
      ),
    [token],
  );

  return { players, state, feed, submitAttempt };
}
