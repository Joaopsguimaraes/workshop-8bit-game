import type { Evento } from "@/lib/motor/motor";
import { NOME_DA_CONQUISTA } from "@/lib/motor/conquistas";

function ordinal(numero: number): string {
  return `${numero}ª`;
}

// Frase do feed ao vivo. Nunca inclui texto de prompt: o evento não traz esse dado.
export function textoDoEvento(evento: Evento): string {
  switch (evento.tipo) {
    case "jogador-entrou":
      return `${evento.jogador.iniciais} entrou na Sala`;
    case "rodada-aberta":
      return `Rodada aberta: ${evento.titulo}`;
    case "tentativa-enviada":
      return `${evento.jogador.iniciais} enviou a ${ordinal(evento.numero)} Tentativa`;
    case "nota-maxima":
      return `${evento.jogador.iniciais} tirou 100!`;
    case "conquista-ganha":
      return `${evento.jogador.iniciais} ganhou ${NOME_DA_CONQUISTA[evento.conquista]}`;
    case "rodada-encerrada":
      return `Rodada encerrada: ${evento.titulo}`;
  }
}
