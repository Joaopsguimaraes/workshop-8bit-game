"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/8bit/button";
import { Input } from "@/components/ui/8bit/input";
import { Label } from "@/components/ui/8bit/label";
import type { FacilitatorState } from "@/lib/engine/engine";

type Reply = { ok: boolean; error?: string };

// Facilitator control panel: opens and closes Rounds, removes Players and resets the Room.
export function FacilitatorPanel() {
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<FacilitatorState | null>(null);
  const [minutes, setMinutes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);

  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    socket.on("facilitator:state", (data: FacilitatorState) => {
      setState(data);
    });
    socket.on("facilitator:invalid", () => {
      socket.close();
      router.refresh();
    });

    return () => {
      socketRef.current = null;
      socket.close();
    };
  }, [router]);

  function openRound(challengeId: string) {
    const text = minutes.trim();
    const minutesNumber = Number(text);
    if (text !== "" && (!Number.isInteger(minutesNumber) || minutesNumber < 1)) {
      setError("O cronômetro precisa ser um número inteiro de minutos, ou ficar em branco.");
      return;
    }

    const durationSeconds = text === "" ? undefined : minutesNumber * 60;
    socketRef.current?.emit(
      "facilitator:openRound",
      { challengeId, durationSeconds },
      (reply: Reply) => {
        setError(reply.ok ? null : (reply.error ?? null));
        // The timer only applies to the Round that was just opened; the next one starts without a deadline.
        if (reply.ok) setMinutes("");
      },
    );
  }

  function closeRound() {
    socketRef.current?.emit("facilitator:closeRound", (reply: Reply) =>
      setError(reply.ok ? null : (reply.error ?? null)),
    );
  }

  function removePlayer(playerId: string) {
    socketRef.current?.emit(
      "facilitator:removePlayer",
      { playerId },
      (reply: Reply) => setError(reply.ok ? null : (reply.error ?? null)),
    );
  }

  function resetMatch() {
    socketRef.current?.emit("facilitator:resetMatch", (reply: Reply) => {
      setError(reply.ok ? null : (reply.error ?? null));
      if (reply.ok) setConfirmingReset(false);
    });
  }

  if (!state) {
    return (
      <main className="font-pixel flex min-h-dvh items-center justify-center text-[12px] text-primary">
        CARREGANDO...
      </main>
    );
  }

  const { round, sent, challenges, players } = state;

  return (
    <main className="flex min-h-dvh flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <span className="font-pixel text-[12px] text-primary">FACILITADOR</span>
        <Link
          href="/facilitador/telao"
          target="_blank"
          rel="noreferrer"
          className="font-pixel border-2 border-foreground px-3 py-2 text-[10px] text-foreground hover:bg-accent"
        >
          ABRIR TELÃO
        </Link>
      </header>

      <section
        aria-label="Rodada atual"
        className="flex flex-col gap-3 border-4 border-ring bg-background p-4 text-2xl text-foreground"
      >
        {round ? (
          <>
            <p className="uppercase">RODADA ABERTA: {round.challenge.title}</p>
            <p>
              {sent} {sent === 1 ? "jogador já enviou" : "jogadores já enviaram"}
            </p>
            <Button type="button" onClick={closeRound} className="font-pixel w-fit text-[12px]">
              ENCERRAR RODADA
            </Button>
          </>
        ) : (
          <p className="uppercase">NENHUMA RODADA ABERTA.</p>
        )}
      </section>

      <div className="flex max-w-sm flex-col gap-2">
        <Label htmlFor="minutes" className="font-pixel text-[10px] text-muted-foreground">
          CRONÔMETRO EM MINUTOS (OPCIONAL)
        </Label>
        <Input
          id="minutes"
          type="number"
          min={1}
          inputMode="numeric"
          placeholder="Sem cronômetro"
          value={minutes}
          onChange={(event) => setMinutes(event.target.value)}
        />
      </div>

      {error && (
        <p role="alert" className="text-2xl text-destructive">
          {error}
        </p>
      )}

      <section aria-label="Desafios" className="flex flex-col gap-3">
        <h2 className="font-pixel text-[12px] text-primary">DESAFIOS</h2>
        <ul className="flex flex-col gap-3">
          {challenges.map((challenge) => (
            <li
              key={challenge.id}
              className="flex flex-wrap items-center gap-3 border-2 border-ring bg-background p-3 text-2xl text-foreground"
            >
              <span className="flex-1">
                {challenge.order}. {challenge.title}
              </span>
              <span className={challenge.played ? "text-muted-foreground" : "text-foreground"}>
                {challenge.played ? "JOGADO" : "DISPONÍVEL"}
              </span>
              <Button
                type="button"
                disabled={challenge.played || round !== null}
                onClick={() => openRound(challenge.id)}
                className="font-pixel text-[10px]"
              >
                ABRIR RODADA
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Jogadores" className="flex flex-col gap-3">
        <h2 className="font-pixel text-[12px] text-primary">JOGADORES</h2>
        {players.length === 0 ? (
          <p className="text-2xl text-muted-foreground">NENHUM JOGADOR AINDA.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {players.map((player) => (
              <li
                key={player.id}
                className="flex flex-wrap items-center gap-3 border-2 border-ring bg-background p-3 text-2xl text-foreground"
              >
                <Avatar initials={player.initials} />
                <span className="flex-1 truncate">{player.nickname}</span>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => removePlayer(player.id)}
                  aria-label={`Remover ${player.nickname}`}
                  className="font-pixel text-[10px]"
                >
                  REMOVER
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        aria-label="Reiniciar a Sala"
        className="flex flex-col gap-3 border-2 border-destructive bg-background p-4 text-2xl text-foreground"
      >
        <h2 className="font-pixel text-[12px] text-destructive">REINICIAR A SALA</h2>
        {confirmingReset ? (
          <>
            <p>
              Isso apaga todos os Jogadores, Rodadas, Tentativas e Conquistas. Todos voltam ao login
              e os Desafios podem ser jogados de novo. Não tem volta.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="destructive"
                onClick={resetMatch}
                className="font-pixel text-[10px]"
              >
                SIM, APAGAR TUDO
              </Button>
              <Button
                type="button"
                onClick={() => setConfirmingReset(false)}
                className="font-pixel text-[10px]"
              >
                CANCELAR
              </Button>
            </div>
          </>
        ) : (
          <Button
            type="button"
            variant="destructive"
            onClick={() => setConfirmingReset(true)}
            className="font-pixel w-fit text-[10px]"
          >
            RESETAR PARTIDA
          </Button>
        )}
      </section>
    </main>
  );
}
