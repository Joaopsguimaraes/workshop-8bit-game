import type { Challenge } from "../challenges/types";
import { findMarker, labelContent, countWords, sentenceAt, searchKey } from "./text";

export type Recognition = { excerpt: string } | null;

export type Criterion = {
  id: string;
  name: string;
  max: number;
  tip: string;
  check: (prompt: string, challenge: Challenge) => Recognition;
};

// A natural marker only counts with at least 4 words beyond it in the same sentence.
const MIN_WORDS = 4;

// Natural sentence: the marker must come in a sentence with at least 4 words beyond it.
function recognizeSentence(prompt: string, pattern: RegExp): Recognition {
  for (const { index, marker } of findMarker(prompt, pattern)) {
    const { start, end } = sentenceAt(prompt, index);
    const sentence = prompt.slice(start, end);
    if (countWords(searchKey(sentence).replace(marker, " ")) >= MIN_WORDS) {
      return { excerpt: sentence.trim() };
    }
  }
  return null;
}

// Label with at least 4 content words.
function recognizeLabel(prompt: string, labels: string[]): Recognition {
  const label = labelContent(prompt, labels);
  return label && label.words >= MIN_WORDS ? { excerpt: label.excerpt } : null;
}

const ROLE_NATURAL = /(?<![a-z])(voce e|atue como|aja como|seu papel e|you are|act as)(?![a-z])/g;

export const ROLE: Criterion = {
  id: "role",
  name: "Papel",
  max: 15,
  tip: "Diga quem o modelo deve ser. Ex.: \"Você é um consultor de RH experiente.\"",
  check(prompt) {
    return recognizeLabel(prompt, ["papel", "persona", "role"]) ?? recognizeSentence(prompt, ROLE_NATURAL);
  },
};

// Action verbs in the imperative, without accents and in lowercase, in pt-BR and English.
const ACTION_VERBS =
  /(?<![a-z])(liste|escreva|redija|resuma|extraia|gere|identifique|crie|analise|list|write|summarize|extract|generate|identify|create|analyze)(?![a-z])/g;

const MIN_GROUPS = 2;

function mentionsTerm(normalizedText: string, term: string): boolean {
  const escaped = searchKey(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`).test(normalizedText);
}

export const TASK: Criterion = {
  id: "task",
  name: "Tarefa",
  max: 20,
  tip:
    "Comece com um verbo de ação (liste, escreva, resuma) e fale do assunto do Desafio. Ex.: \"Liste as vantagens e desvantagens do trabalho remoto.\"",
  check(prompt, challenge) {
    const search = searchKey(prompt);
    const verb = findMarker(prompt, ACTION_VERBS)[0];
    if (!verb) return null;

    const mentionedGroups = challenge.keywords.filter((group) =>
      group.some((term) => mentionsTerm(search, term)),
    );
    if (mentionedGroups.length < MIN_GROUPS) return null;

    const { start, end } = sentenceAt(prompt, verb.index);
    return { excerpt: prompt.slice(start, end).trim() };
  },
};

const CONTEXT_NATURAL =
  /(?<![a-z])(o publico e|a audiencia e|o objetivo e|the audience is|the goal is|the objective is|estamos|estou|we are|i am|para a diretoria|para o time|para a equipe|for the board|for the team)(?![a-z])/g;

export const CONTEXT: Criterion = {
  id: "context",
  name: "Contexto",
  max: 20,
  tip: "Diga para quem é e em que situação está. Ex.: \"Estamos decidindo o modelo de trabalho. O público é a diretoria.\"",
  check(prompt) {
    return recognizeLabel(prompt, ["contexto", "context"]) ?? recognizeSentence(prompt, CONTEXT_NATURAL);
  },
};

const FORMAT_NATURAL =
  /(?<![a-z])(formato|format|topicos|em lista|numerad[oa]|numbered|bullet|bulleted|tabela|table|json|markdown|titulos|\d+ (itens|items|palavras|words))(?![a-z])/g;

export const FORMAT: Criterion = {
  id: "format",
  name: "Formato",
  max: 20,
  tip: "Diga como a resposta deve ser organizada. Ex.: \"Responda em 3 itens, em tópicos curtos.\"",
  check(prompt) {
    return recognizeLabel(prompt, ["formato", "format"]) ?? recognizeSentence(prompt, FORMAT_NATURAL);
  },
};

const CONSTRAINTS_NATURAL =
  /(?<![a-z])(nao (inclua|use|escreva|invente|adicione|mencione|faca|traga|cite|repita|fale)|evite|sem|apenas|somente|no maximo|nunca|don't|do not|avoid|only|never)(?![a-z])/g;

export const CONSTRAINTS: Criterion = {
  id: "constraints",
  name: "Restrições",
  max: 15,
  tip: "Diga o que não deve aparecer ou quais limites seguir. Ex.: \"Não inclua opiniões pessoais.\"",
  check(prompt) {
    return (
      recognizeLabel(prompt, ["restricoes", "restriction", "restrictions", "constraints"]) ??
      recognizeSentence(prompt, CONSTRAINTS_NATURAL)
    );
  },
};

// Quoted excerpt with at least 4 words.
function recognizeQuote(prompt: string): Recognition {
  for (const [excerpt, content] of prompt.matchAll(/["“]([^"”]+)["”]/g)) {
    if (countWords(content) >= MIN_WORDS) return { excerpt };
  }
  return null;
}

const EXAMPLES_NATURAL =
  /(?<![a-z])(por exemplo|exemplo:|ex\.:|for example|example:|such as)(?![a-z])/g;

export const EXAMPLES: Criterion = {
  id: "examples",
  name: "Exemplos",
  max: 10,
  tip: "Mostre um exemplo do que espera na resposta. Ex.: \"Exemplo: Vantagem: economia com aluguel.\"",
  check(prompt) {
    return (
      recognizeLabel(prompt, ["exemplo", "exemplos", "example", "examples"]) ??
      recognizeSentence(prompt, EXAMPLES_NATURAL) ??
      recognizeQuote(prompt)
    );
  },
};
