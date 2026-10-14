import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "./avatar";
import { ChallengeWindow } from "./challenge-window";
import { WindowFrame } from "./window-frame";
import { LevelUp } from "./level-up";
import { ScoreboardWindow } from "./scoreboard-window";
import { PromptWindow } from "./prompt-window";
import { TipsWindow } from "./tips-window";
import {
  loadWindows,
  saveWindows,
  type WindowId,
  type WindowState,
  type WindowStates,
} from "@/lib/client/windows";
import { useSound } from "@/lib/client/use-sound";
import { useRealtime, type Progress } from "@/lib/client/use-realtime";

type Props = {
  nickname: string;
  initials: string;
  token: string;
  onSessionInvalid: () => void;
};

const TITLES: Record<WindowId, string> = {
  prompt: "PROMPT.EXE",
  challenge: "DESAFIO.TXT",
  scoreboard: "PLACAR.EXE",
  tips: "DICAS.TXT",
};

const INITIAL_ORDER: WindowId[] = ["challenge", "scoreboard", "tips", "prompt"];

// MS-DOS style desktop: four draggable, minimizable windows saved in the browser.
export function Desktop({ nickname, initials, token, onSessionInvalid }: Props) {
  const [windows, setWindows] = useState<WindowStates>(loadWindows);
  const [order, setOrder] = useState<WindowId[]>(INITIAL_ORDER);
  const [levelUp, setLevelUp] = useState<{ id: number; reason: string } | null>(null);
  const nextLevelUp = useRef(0);
  const { on, toggle: toggleSound, play } = useSound();

  const onProgress = useCallback(
    (progress: Progress) => {
      if (progress === "position") play("rise");
      nextLevelUp.current += 1;
      setLevelUp({
        id: nextLevelUp.current,
        reason: progress === "score" ? "NOTA MELHOROU!" : "SUBIU NO PLACAR!",
      });
    },
    [play],
  );
  const endLevelUp = useCallback(() => setLevelUp(null), []);

  const { players, state, feed, submitAttempt } = useRealtime({
    token,
    onSessionInvalid,
    onProgress,
  });

  useEffect(() => {
    saveWindows(windows);
  }, [windows]);

  // Submit sound effects: one sound on send and another when the Score arrives.
  async function submitWithSound(prompt: string) {
    play("send");
    const result = await submitAttempt(prompt);
    if (result.ok) play("score");
    return result;
  }

  function changeWindow(id: WindowId, change: Partial<WindowState>) {
    setWindows((current) => ({ ...current, [id]: { ...current[id], ...change } }));
  }

  function focus(id: WindowId) {
    setOrder((current) => [...current.filter((item) => item !== id), id]);
  }

  function toggleMinimized(id: WindowId) {
    const minimized = !windows[id].minimized;
    changeWindow(id, { minimized });
    if (!minimized) focus(id);
  }

  const windowIds = Object.keys(TITLES) as WindowId[];

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between bg-muted-foreground px-4 py-2 text-foreground">
        <span className="font-pixel text-[10px]">C:\WORKSHOP&gt; EXECUTAR</span>
        <span className="flex items-center gap-3">
          <button
            type="button"
            aria-pressed={on}
            onClick={toggleSound}
            className="font-pixel border-2 border-foreground px-2 py-1 text-[10px] text-foreground hover:bg-accent"
          >
            SOM: {on ? "LIGADO" : "DESLIGADO"}
          </button>
          <Avatar initials={initials} />
          <span className="text-2xl">{nickname}</span>
        </span>
      </header>

      <main className="relative min-h-[620px] flex-1 overflow-hidden">
        {windowIds.map((id) => {
          const content =
            id === "prompt" ? (
              <PromptWindow state={state} onSubmit={submitWithSound} />
            ) : id === "challenge" ? (
              <ChallengeWindow challenge={state?.round?.challenge ?? null} />
            ) : id === "tips" ? (
              <TipsWindow evaluation={state?.attempts.at(-1)?.evaluation ?? null} />
            ) : (
              <ScoreboardWindow players={players} feed={feed} myId={state?.player.id ?? null} />
            );
          return (
            <WindowFrame
              key={id}
              title={TITLES[id]}
              state={windows[id]}
              inFront={order[order.length - 1] === id}
              onMove={(x, y) => changeWindow(id, { x, y })}
              onResize={(width, height) => changeWindow(id, { width, height })}
              onFocus={() => focus(id)}
              onMinimize={() => toggleMinimized(id)}
            >
              {content}
            </WindowFrame>
          );
        })}
      </main>

      {levelUp && <LevelUp key={levelUp.id} reason={levelUp.reason} onDone={endLevelUp} />}

      <nav
        aria-label="Barra de tarefas"
        className="flex flex-wrap gap-2 bg-foreground px-3 py-2"
      >
        {windowIds.map((id) => {
          const minimized = windows[id].minimized;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={!minimized}
              onClick={() => toggleMinimized(id)}
              className={
                "font-pixel border-2 border-background px-3 py-2 text-[10px] " +
                (minimized
                  ? "bg-foreground text-background"
                  : "bg-background text-foreground")
              }
            >
              {TITLES[id]}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
