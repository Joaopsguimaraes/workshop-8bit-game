import type { Desafio } from "../desafios/tipos";
import { buscarMarcador, conteudoDoRotulo, contarPalavras, fraseDoIndice, chaveDeBusca } from "./texto";

export type Reconhecimento = { trecho: string } | null;

export type Criterio = {
  id: string;
  nome: string;
  maximo: number;
  dica: string;
  verificar: (prompt: string, desafio: Desafio) => Reconhecimento;
};

// Um marcador natural só conta com pelo menos 4 palavras além dele na mesma frase.
const MINIMO_PALAVRAS = 4;

const PAPEL_NATURAL = /(?<![a-z])(voce e|atue como|aja como|seu papel e|you are|act as)(?![a-z])/g;

export const PAPEL: Criterio = {
  id: "papel",
  nome: "Papel",
  maximo: 15,
  dica: "Diga quem o modelo deve ser. Ex.: \"Você é um consultor de RH experiente.\"",
  verificar(prompt) {
    const rotulo = conteudoDoRotulo(prompt, ["papel", "persona", "role"]);
    if (rotulo && rotulo.palavras >= MINIMO_PALAVRAS) return { trecho: rotulo.trecho };

    for (const { indice, marcador } of buscarMarcador(prompt, PAPEL_NATURAL)) {
      const { inicio, fim } = fraseDoIndice(prompt, indice);
      const frase = prompt.slice(inicio, fim);
      const alémDoMarcador = contarPalavras(
        chaveDeBusca(frase).replace(marcador, " "),
      );
      if (alémDoMarcador >= MINIMO_PALAVRAS) return { trecho: frase.trim() };
    }
    return null;
  },
};

// Verbos de ação no imperativo, sem acento e em minúsculo, em pt-BR e inglês.
const VERBOS_DE_ACAO =
  /(?<![a-z])(liste|escreva|redija|resuma|extraia|gere|identifique|crie|analise|list|write|summarize|extract|generate|identify|create|analyze)(?![a-z])/g;

const MINIMO_GRUPOS = 2;

function mencionaTermo(textoNormalizado: string, termo: string): boolean {
  const escapado = chaveDeBusca(termo).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![a-z0-9])${escapado}(?![a-z0-9])`).test(textoNormalizado);
}

export const TAREFA: Criterio = {
  id: "tarefa",
  nome: "Tarefa",
  maximo: 20,
  dica:
    "Comece com um verbo de ação (liste, escreva, resuma) e fale do assunto do Desafio. Ex.: \"Liste as vantagens e desvantagens do trabalho remoto.\"",
  verificar(prompt, desafio) {
    const busca = chaveDeBusca(prompt);
    const verbo = buscarMarcador(prompt, VERBOS_DE_ACAO)[0];
    if (!verbo) return null;

    const gruposMencionados = desafio.palavrasChave.filter((grupo) =>
      grupo.some((termo) => mencionaTermo(busca, termo)),
    );
    if (gruposMencionados.length < MINIMO_GRUPOS) return null;

    const { inicio, fim } = fraseDoIndice(prompt, verbo.indice);
    return { trecho: prompt.slice(inicio, fim).trim() };
  },
};
