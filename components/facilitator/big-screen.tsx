"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/8bit/button";
import { eventText } from "@/lib/client/feed";
import { formatTime } from "@/lib/client/time";
import { ACHIEVEMENT_NAMES } from "@/lib/engine/achievements";
import type { FacilitatorState, Reveal } from "@/lib/engine/engine";
import type { FeedItem, LiveScoreboardEntry } from "@/lib/realtime";

// `clockOffsetMs` is the difference between the server clock and the browser clock, for the timer.
type LiveState = FacilitatorState & { clockOffsetMs: number };

const FEED_MAX = 50;
const FEED_ON_BIG_SCREEN = 8;

// Full-screen big screen: Scoreboard, current Challenge, timer, submissions, feed and reveal, all live.
// Uses the Facilitator channel, so the page only works with the PIN session.
export function BigScreen() {
  const router = useRouter();
  const [state, setState] = useState<LiveState | null>(null);
  const [players, setPlayers] = useState<LiveScoreboardEntry[] | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const socket: Socket = io();

    socket.on("facilitator:state", (data: FacilitatorState) => {
      setState({ ...data, clockOffsetMs: Date.parse(data.now) - Date.now() });
    });
    socket.on("scoreboard", (data: { players: LiveScoreboardEntry[] }) => {
      setPlayers(data.players);
    });
    socket.on("feed:history", (items: FeedItem[]) => {
      setFeed(items.slice(-FEED_MAX));
    });
    socket.on("feed:event", (item: FeedItem) => {
      setFeed((current) => [...current, item].slice(-FEED_MAX));
    });
    socket.on("facilitator:invalid", () => {
      socket.close();
      router.refresh();
    });

    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearInterval(clock);
      socket.close();
    };
  }, [router]);

  function goFullscreen() {
    document.documentElement.requestFullscreen().catch(() => undefined);
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
            <LiveChallenge
              title={round.challenge.title}
              scenario={round.challenge.scenario}
              remainingMs={
                round.deadline ? Date.parse(round.deadline) - (now + state.clockOffsetMs) : null
              }
              sent={state.sent}
              total={state.players.length}
            />
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
