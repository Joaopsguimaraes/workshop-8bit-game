import type { Desafio } from "../desafios/tipos";
import { PAPEL, TAREFA, type Criterio } from "./criterios";

export type Avaliacao = {
  nota: number;
  veredito: { titulo: string; texto: string };
  criterios: CriterioAvaliado[];
};

export type CriterioAvaliado = {
  id: string;
  nome: string;
  atendido: boolean;
  pontos: number;
  maximo: number;
  dica?: string;
  trecho?: string;
};

const CRITERIOS: Criterio[] = [PAPEL, TAREFA];

export function veredictoDaNota(nota: number): Avaliacao["veredito"] {
  if (nota >= 100) return { titulo: "Na mosca!", texto: "Prompt perfeito. Estrutura completa." };
  if (nota >= 80) return { titulo: "Quase lá", texto: "Falta pouco. Veja as dicas dos Critérios que faltaram." };
  if (nota >= 50) return { titulo: "No caminho certo", texto: "A base está boa. Acrescente o que falta." };
  return { titulo: "Longe do alvo", texto: "Ainda faltam partes importantes na estrutura do prompt." };
}

// Avaliador: função pura. A Nota é a soma dos pontos dos Critérios atendidos.
export function avaliar(prompt: string, desafio: Desafio): Avaliacao {
  const criterios = CRITERIOS.map((criterio): CriterioAvaliado => {
    const reconhecido = criterio.verificar(prompt, desafio);
    const base = { id: criterio.id, nome: criterio.nome, maximo: criterio.maximo };
    if (reconhecido) {
      return { ...base, atendido: true, pontos: criterio.maximo, trecho: reconhecido.trecho };
    }
    return { ...base, atendido: false, pontos: 0, dica: criterio.dica };
  });

  const nota = criterios.reduce((soma, criterio) => soma + criterio.pontos, 0);
  return { nota, veredito: veredictoDaNota(nota), criterios };
}
