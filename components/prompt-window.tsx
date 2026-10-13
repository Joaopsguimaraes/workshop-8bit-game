"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/8bit/button";
import { formatTime } from "@/lib/client/time";
import type { LivePlayerState } from "@/lib/client/use-realtime";
import { CHARACTER_LIMIT, ATTEMPT_LIMIT } from "@/lib/limits";
import type { AttemptResult, PublicAttempt, Reveal } from "@/lib/engine/engine";
import { Avatar } from "./avatar";

type Props = {
  state: LivePlayerState | null;
  onSubmit: (prompt: string) => Promise<AttemptResult>;
};

// PROMPT.EXE window. Without an open Round, shows the wait; with a Round, the prompt field.
export function PromptWindow({ state, onSubmit }: Props) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const round = state?.round ?? null;
  if (!state || !round) {
    if (state?.reveal) return <RoundReveal reveal={state.reveal} />;
    return (
      <div className="flex min-h-40 flex-col gap-3">
        <p className="uppercase">
          AGUARDANDO O FACILITADOR...
          <span aria-hidden="true" className="cursor-blink">
            _
          </span>
        </p>
      </div>
    );
  }

  const characters = [...text].length;
  const attemptsLeft = state.attemptsLeft;
  const remainingMs = round.deadline ? Date.parse(round.deadline) - (now + state.clockOffsetMs) : null;
  const timeUp = remainingMs !== null && remainingMs <= 0;

  // Reason that blocks sending; the server checks again, but the Player sees the reason first.
  const blockReason =
    attemptsLeft === 0
      ? `Você já usou as ${ATTEMPT_LIMIT} Tentativas desta Rodada.`
      : timeUp
        ? "O tempo acabou."
        : characters > CHARACTER_LIMIT
          ? `O prompt passou de ${CHARACTER_LIMIT.toLocaleString("pt-BR")} caracteres.`
          : null;
  const canSend = blockReason === null && text.trim().length > 0 && !sending;

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSend) return;

    setError(null);
    setSending(true);
    const result = await onSubmit(text);
    setSending(false);
    // Only clears when the Attempt was accepted; a refusal keeps the text for the Player to fix.
    if (result.ok) setText("");
    else setError(result.error);
  }

  const last = state.attempts.at(-1);

  return (
    <div className="flex flex-col gap-3">
      <p className="uppercase text-primary">
        RODADA ABERTA · TENTATIVAS RESTANTES: {attemptsLeft}/{ATTEMPT_LIMIT}
      </p>
      {remainingMs !== null && (
        <p aria-live="polite" className="uppercase">
          TEMPO: {formatTime(remainingMs)}
        </p>
      )}

      <form onSubmit={send} className="flex flex-col gap-2">
        <label htmlFor="prompt" className="sr-only">
          Seu prompt
        </label>
        <textarea
          id="prompt"
          value={text}
          onChange={(event) => setText(event.target.value)}
          disabled={attemptsLeft === 0 || timeUp}
          rows={6}
          placeholder="Escreva seu prompt aqui..."
          className="w-full resize-y border-2 border-foreground bg-background p-2 text-foreground placeholder:text-muted-foreground disabled:opacity-60"
        />
        <div className="flex flex-wrap justify-between gap-2 text-lg">
          <span className={characters > CHARACTER_LIMIT ? "text-destructive" : ""}>
            {characters}/{CHARACTER_LIMIT}
          </span>
          {blockReason && <span className="text-destructive">{blockReason}</span>}
        </div>
        <Button type="submit" disabled={!canSend} className="font-pixel text-[12px]">
          {sending ? "ENVIANDO..." : "ENVIAR"}
        </Button>
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
      </form>

      {last && <AttemptEvaluation attempt={last} />}
      {state.attempts.length > 0 && (
        <History attempts={state.attempts} />
      )}
    </div>
  );
}

// Reveal: the reference prompt and the top 3 of the last Round, until the Facilitator opens the next one.
function RoundReveal({ reveal }: { reveal: Reveal }) {
  return (
    <div className="flex flex-col gap-4" aria-label="Revelação da Rodada">
      <p className="font-pixel text-[12px] text-primary">REVELAÇÃO</p>

      <section className="flex flex-col gap-2">
        <h3 className="uppercase text-primary">Prompt de referência</h3>
        <p className="whitespace-pre-line text-foreground">{reveal.challenge.referencePrompt}</p>
      </section>

      <section className="flex flex-col gap-3 border-t-2 border-ring pt-3">
        <h3 className="uppercase text-primary">Top 3</h3>
        {reveal.top3.length === 0 ? (
          <p className="uppercase">NINGUÉM PONTUOU NESTA RODADA.</p>
        ) : (
          <ol className="flex flex-col gap-4">
            {reveal.top3.map((item) => (
              <li key={item.position} className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <Avatar initials={item.initials} />
                  <span className="flex-1 truncate">
                    {item.position}º {item.nickname}
                  </span>
                  <span className="text-primary">NOTA {item.score}</span>
                </div>
                <p className="whitespace-pre-line text-muted-foreground">{item.prompt}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <p className="uppercase">AGUARDANDO O PRÓXIMO DESAFIO...</p>
    </div>
  );
}

function AttemptEvaluation({ attempt }: { attempt: PublicAttempt }) {
  const { evaluation } = attempt;
  return (
    <section aria-label="Avaliação da Tentativa" className="flex flex-col gap-2 border-t-2 border-ring pt-3">
      <p className="font-pixel text-[12px] text-primary">
        TENTATIVA {attempt.number} · NOTA {attempt.score}
      </p>
      <p>
        {evaluation.verdict.title} {evaluation.verdict.text}
      </p>
      <ul className="flex flex-col gap-1">
        {evaluation.criteria.map((criterion) => (
          <li key={criterion.id}>
            <span className={criterion.met ? "text-foreground" : "text-destructive"}>
              {criterion.met ? "✓" : "✕"}
            </span>{" "}
            {criterion.name} {criterion.points}/{criterion.max}
            {criterion.met && criterion.excerpt && (
              <span className="block text-muted-foreground">reconhecido: “{criterion.excerpt}”</span>
            )}
            {!criterion.met && criterion.tip && (
              <span className="block text-foreground">dica: {criterion.tip}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function History({ attempts }: { attempts: PublicAttempt[] }) {
  return (
    <section aria-label="Histórico das Tentativas" className="flex flex-col gap-2 border-t-2 border-ring pt-3">
      <p className="font-pixel text-[10px]">HISTÓRICO DA RODADA</p>
      <ol className="flex flex-col gap-2">
        {attempts.map((attempt) => (
          <li key={attempt.number}>
            <span className="text-primary">
              #{attempt.number} · NOTA {attempt.score}
            </span>
            <span className="block whitespace-pre-line text-muted-foreground">{attempt.prompt}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
