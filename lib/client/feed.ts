import type { Event } from "@/lib/engine/engine";
import { ACHIEVEMENT_NAMES } from "@/lib/engine/achievements";

function ordinal(number: number): string {
  return `${number}ª`;
}

// Feed sentence for the live feed. Never includes prompt text: the event does not carry that data.
export function eventText(event: Event): string {
  switch (event.type) {
    case "player-joined":
      return `${event.player.initials} entrou na Sala`;
    case "round-opened":
      return `Rodada aberta: ${event.title}`;
    case "attempt-submitted":
      return `${event.player.initials} enviou a ${ordinal(event.number)} Tentativa`;
    case "max-score":
      return `${event.player.initials} tirou 100!`;
    case "achievement-earned":
      return `${event.player.initials} ganhou ${ACHIEVEMENT_NAMES[event.achievement]}`;
    case "round-closed":
      return `Rodada encerrada: ${event.title}`;
    case "player-removed":
      return `${event.player.initials} saiu da Sala`;
    case "match-reset":
      return "Sala reiniciada para um novo workshop";
  }
}
