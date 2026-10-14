"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FacilitatorState, FeedItem } from "@/lib/engine/engine";
import type { LiveScoreboardEntry } from "@/lib/live";

// How often the Facilitator panel and the Big screen ask the server for news.
export const FACILITATOR_POLL_INTERVAL_MS = 1500;

// `clockOffsetMs` is the difference between the server clock and the browser clock, for the timer.
export type LiveFacilitatorState = FacilitatorState & { clockOffsetMs: number };

export type Reply = { ok: boolean; error?: string };

type FacilitatorPoll = {
  state: FacilitatorState;
  players: LiveScoreboardEntry[];
  feed: FeedItem[];
};

const FEED_MAX = 50;

// Keeps the Facilitator's view live by polling. `onInvalid` runs when the PIN session is no longer valid.
export function useFacilitator({ onInvalid }: { onInvalid: () => void }) {
  const [state, setState] = useState<LiveFacilitatorState | null>(null);
  const [players, setPlayers] = useState<LiveScoreboardEntry[] | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const pollNowRef = useRef<(() => void) | null>(null);
  const onInvalidRef = useRef(onInvalid);

  useEffect(() => {
    onInvalidRef.current = onInvalid;
  }, [onInvalid]);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      try {
        const response = await fetch("/api/facilitator/poll", { cache: "no-store" });
        if (response.status === 401) {
          stopped = true;
          onInvalidRef.current();
          return;
        }
        if (!response.ok) throw new Error(`poll respondeu ${response.status}`);
        const data = (await response.json()) as FacilitatorPoll;
        if (stopped) return;
        setState({ ...data.state, clockOffsetMs: Date.parse(data.state.now) - Date.now() });
        setPlayers(data.players);
        setFeed(data.feed.slice(-FEED_MAX));
      } catch {
        // A failed poll keeps the last reading on screen; the next one tries again.
      } finally {
        if (!stopped) {
          clearTimeout(timer);
          timer = setTimeout(() => void poll(), FACILITATOR_POLL_INTERVAL_MS);
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
  }, []);

  // Sends a command to the server and reads the screen again right away.
  const act = useCallback(async (path: string, body?: unknown): Promise<Reply> => {
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      if (response.status === 401) onInvalidRef.current();
      return (await response.json()) as Reply;
    } catch {
      return { ok: false, error: "Sem conexão com o servidor. Tente de novo." };
    } finally {
      pollNowRef.current?.();
    }
  }, []);

  return { state, players, feed, act };
}
