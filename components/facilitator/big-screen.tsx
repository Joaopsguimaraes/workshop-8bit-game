"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { TopThreeOverlay } from "@/components/facilitator/top-three-overlay";
import { Button } from "@/components/ui/8bit/button";
import { eventText } from "@/lib/client/feed";
import { playEffect } from "@/lib/client/sounds";
import { useFacilitator } from "@/lib/client/use-facilitator";
import { formatTime } from "@/lib/client/time";
import { ACHIEVEMENT_NAMES } from "@/lib/engine/achievements";
import type { FeedItem, Reveal } from "@/lib/engine/engine";
import type { LiveScoreboardEntry } from "@/lib/live";

const FEED_ON_BIG_SCREEN = 8;

// Full-screen big screen: Scoreboard, current Challenge, timer, submissions, feed and reveal, all live.
// Uses the Facilitator session, so the page only works with the PIN session.
export function BigScreen() {
  const router = useRouter();
  const { state, players, feed, act } = useFacilitator({ onInvalid: () => router.refresh() });
  const [now, setNow] = useState(() => Date.now());
  const [podium, setPodium] = useState<{ id: number; reveal: Reveal } | null>(null);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const lastFeedId = useRef<number | null>(null);

  useEffect(() => {
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(clock);
  }, []);

  // A Round that closes while the screen is open (by the button, or by the timer) shows the TOP 3 with a sound.
  // The feed already holds past closings, so the first reading only marks where the feed ends.
  useEffect(() => {
    if (!state) return;
    const latest = feed.length > 0 ? feed[feed.length - 1].id : 0;
    if (lastFeedId.current === null) {
      lastFeedId.current = latest;
      return;
    }
    const previous = lastFeedId.current;
    lastFeedId.current = latest;

    let closed: { id: number; reveal: Reveal } | null = null;
    for (const item of feed) {
      if (item.id > previous && item.event.type === "round-closed") {
        closed = { id: item.id, reveal: item.event.reveal };
      }
    }
    if (closed) {
      setPodium(closed);
      playEffect("podium");
    }
  }, [state, feed]);

  const endPodium = useCallback(() => setPodium(null), []);

  function goFullscreen() {
    document.documentElement.requestFullscreen().catch(() => undefined);
  }

  // Closes the open Round from the big screen; on success, goes to the Facilitator panel to open the next one.
  async function closeRound() {
    setClosing(true);
    setCloseError(null);
    const reply = await act("/api/facilitator/rounds/close");
    if (reply.ok) {
      router.push("/facilitador");
      return;
    }
    setCloseError(reply.error ?? "Não foi possível encerrar a rodada.");
    setClosing(false);
  }

  if (!state) {
    return (
      <main className="font-pixel flex min-h-dvh items-center justify-center text-[16px] text-primary">
        CARREGANDO...
      </main>
    );
  }

  const { round, reveal } = state;

  return (
    <main className="flex min-h-dvh flex-col gap-6 bg-background p-6">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b-4 border-ring pb-4">
        <h1 className="font-pixel text-[18px] leading-relaxed text-primary">
          TELÃO · WORKSHOP DE PROMPTS
        </h1>
        <Button type="button" onClick={goFullscreen} className="font-pixel text-[12px]">
          TELA CHEIA
        </Button>
      </header>

      <div className="grid flex-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section aria-label="Palco" className="flex min-w-0 flex-col gap-6">
          {round ? (
            <div className="flex flex-col gap-6">
              <LiveChallenge
                title={round.challenge.title}
                scenario={round.challenge.scenario}
                remainingMs={
                  round.deadline ? Date.parse(round.deadline) - (now + state.clockOffsetMs) : null
                }
                sent={state.sent}
                total={state.players.length}
              />
              <div className="flex flex-col gap-3">
                <Button
                  type="button"
                  onClick={closeRound}
                  disabled={closing}
                  className="font-pixel w-fit text-[12px]"
                >
                  ENCERRAR RODADA
                </Button>
                {closeError && (
                  <p role="alert" className="text-2xl text-destructive">
                    {closeError}
                  </p>
                )}
              </div>
            </div>
          ) : reveal ? (
            <RevealOnScreen reveal={reveal} />
          ) : (
            <p className="text-4xl uppercase">
              AGUARDANDO O FACILITADOR...
              <span aria-hidden="true" className="cursor-blink">
                _
              </span>
            </p>
          )}
        </section>

        <aside className="flex min-w-0 flex-col gap-6">
          <ScoreboardOnScreen players={players} />
          <FeedOnScreen feed={feed} />
        </aside>
      </div>

      {podium && <TopThreeOverlay key={podium.id} reveal={podium.reveal} onDone={endPodium} />}
    </main>
  );
}

function LiveChallenge({
  title,
  scenario,
  remainingMs,
  sent,
  total,
}: {
  title: string;
  scenario: string;
  remainingMs: number | null;
  sent: number;
  total: number;
}) {
  return (
    <div className="flex flex-col gap-6">
      <p className="font-pixel text-[16px] text-foreground">RODADA ABERTA</p>
      <h2 className="font-pixel text-[24px] leading-relaxed text-foreground">{title}</h2>
      <p className="whitespace-pre-line text-3xl text-muted-foreground">{scenario}</p>
      <div className="grid gap-6 sm:grid-cols-2">
        <Indicator
          label="TEMPO"
          value={remainingMs === null ? "--:--" : formatTime(remainingMs)}
          highlight
        />
        <Indicator label="ENVIARAM" value={`${sent}/${total}`} />
      </div>
    </div>
  );
}

function Indicator({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col gap-3 border-4 border-ring bg-card p-4">
      <span className="font-pixel text-[16px] text-muted-foreground">{label}</span>
      <span className={`font-pixel text-[32px] ${highlight ? "text-primary" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}

// Reveal: the reference prompt and the top 3 of the last Round, until the Facilitator opens the next one.
function RevealOnScreen({ reveal }: { reveal: Reveal }) {
  return (
    <div className="flex flex-col gap-6" aria-label="Revelação da Rodada">
      <p className="font-pixel text-[16px] text-primary">REVELAÇÃO · {reveal.challenge.title}</p>

      <section className="flex flex-col gap-3 border-4 border-foreground p-4">
        <h2 className="font-pixel text-[16px] text-foreground">PROMPT DE REFERÊNCIA</h2>
        <p className="whitespace-pre-line text-3xl text-foreground">
          {reveal.challenge.referencePrompt}
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-pixel text-[16px] text-primary">TOP 3</h2>
        {reveal.top3.length === 0 ? (
          <p className="text-3xl uppercase">NINGUÉM PONTUOU NESTA RODADA.</p>
        ) : (
          <ol className="flex flex-col gap-6">
            {reveal.top3.map((item) => (
              <li key={item.position} className="flex flex-col gap-3">
                <div className="flex items-center gap-4">
                  <Avatar initials={item.initials} size="medium" />
                  <span className="flex-1 truncate text-3xl text-foreground">
                    {item.position}º {item.nickname}
                  </span>
                  <span className="font-pixel text-[16px] text-primary">NOTA {item.score}</span>
                </div>
                <p className="whitespace-pre-line text-2xl text-muted-foreground">{item.prompt}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function ScoreboardOnScreen({ players }: { players: LiveScoreboardEntry[] | null }) {
  return (
    <section aria-label="Placar" className="flex flex-col gap-4">
      <h2 className="font-pixel text-[16px] text-primary">PLACAR</h2>
      {players === null ? (
        <p className="text-3xl uppercase">CARREGANDO JOGADORES...</p>
      ) : players.length === 0 ? (
        <p className="text-3xl uppercase">NENHUM JOGADOR AINDA.</p>
      ) : (
        <ol className="flex flex-col gap-3" aria-label="Jogadores no Placar">
          {players.map((player) => (
            <li key={player.id} className="flex items-center gap-4 border-2 border-border p-3">
              <span className="font-pixel w-14 text-[16px] text-primary">{player.position}º</span>
              <Avatar initials={player.initials} size="medium" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate text-3xl text-foreground">{player.nickname}</span>
                <span className="flex flex-wrap gap-x-4 text-xl">
                  <span className={player.online ? "text-foreground" : "text-muted-foreground"}>
                    {player.online ? "ONLINE" : "OFFLINE"}
                  </span>
                  {player.achievements.length > 0 && (
                    <span className="text-primary">
                      {player.achievements.map((achievement) => ACHIEVEMENT_NAMES[achievement.type]).join(" · ")}
                    </span>
                  )}
                </span>
              </div>
              <span aria-label="Pontuação" className="font-pixel text-[20px] text-primary">
                {player.points}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function FeedOnScreen({ feed }: { feed: FeedItem[] }) {
  return (
    <section aria-label="Feed de eventos" className="flex flex-col gap-2 border-t-4 border-ring pt-4">
      <h2 className="font-pixel text-[16px] text-primary">EVENTOS</h2>
      {feed.length === 0 ? (
        <p className="text-2xl text-muted-foreground">SEM EVENTOS AINDA.</p>
      ) : (
        <ul className="flex flex-col gap-1 text-2xl text-foreground">
          {[...feed]
            .reverse()
            .slice(0, FEED_ON_BIG_SCREEN)
            .map((item) => (
              <li key={item.id}>&gt; {eventText(item.event)}</li>
            ))}
        </ul>
      )}
    </section>
  );
}
