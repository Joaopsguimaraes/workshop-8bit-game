import type { Challenge } from "../challenges/types";
import { findMarker, labelContent, countWords, sentenceAt, searchKey } from "./text";

// Strength of the signal: an explicit label with content, a natural phrase, or a weak mention.
export type Level = "full" | "partial" | "weak";

export type Recognition = { level: Level; excerpt: string } | null;

export type Criterion = {
  id: string;
  name: string;
  max: number;
  tip: string;
  check: (prompt: string, challenge: Challenge) => Recognition;
};

// A natural marker is only a phrase when at least 4 words follow it in the same sentence.
const MIN_WORDS = 4;

// Label with content: one word of content (a letter or a digit) is enough.
function recognizeLabel(prompt: string, labels: string[]): Recognition {
  const label = labelContent(prompt, labels);
  return label && label.words >= 1 ? { level: "full", excerpt: label.excerpt } : null;
}

// Natural phrase: the marker must come in a sentence with at least 4 words beyond it.
function recognizeSentence(prompt: string, pattern: RegExp): Recognition {
  for (const { index, marker } of findMarker(prompt, pattern)) {
    const { start, end } = sentenceAt(prompt, index);
    const sentence = prompt.slice(start, end);
    if (countWords(searchKey(sentence).replace(marker, " ")) >= MIN_WORDS) {
      return { level: "partial", excerpt: sentence.trim() };
    }
  }
  return null;
}

// A marker written as a label (`Contexto:`, `## Contexto`, `<contexto>`) is not a mention:
// an empty label must not score through its own word.
function isLabelSyntax(search: string, index: number, marker: string): boolean {
  const after = search.slice(index + marker.length);
  const before = search.slice(0, index);
  return (
    marker.endsWith(":") ||
    /^[ \t]*(?:\*\*|>)?[ \t]*:/.test(after) ||
    /(?:#|\*\*|<|<\/)[ \t]*$/.test(before)
  );
}

// Weak mention: the marker alone, without the 4-word sentence around it.
function recognizeMention(prompt: string, pattern: RegExp): Recognition {
  const search = searchKey(prompt);
  const first = findMarker(prompt, pattern).find(
    ({ index, marker }) => !isLabelSyntax(search, index, marker),
  );
  if (!first) return null;
  const { start, end } = sentenceAt(prompt, first.index);
  return { level: "weak", excerpt: prompt.slice(start, end).trim() };
}

// The highest level wins; points are not added across signals.
const RANK: Record<Level, number> = { weak: 1, partial: 2, full: 3 };

function strongest(...signals: Recognition[]): Recognition {
  return signals.reduce<Recognition>(
    (best, signal) => (signal && (!best || RANK[signal.level] > RANK[best.level]) ? signal : best),
    null,
  );
}

// Natural phrase and weak mention for a criterion; the weak mention also covers the natural markers.
function recognizeStructure(prompt: string, natural: RegExp, weak?: RegExp): Recognition {
  return strongest(
    recognizeSentence(prompt, natural),
    recognizeMention(prompt, natural),
    weak ? recognizeMention(prompt, weak) : null,
  );
}

const ROLE_NATURAL =
  /(?<![a-z])(voce e|atue como|aja como|seu papel e|sendo um especialista|you are|act as|as an expert|as a specialist)(?![a-z])/g;
const ROLE_WEAK = /(?<![a-z])(especialista|consultor)(?![a-z])/g;

export const ROLE: Criterion = {
  id: "role",
  name: "Papel",
  max: 15,
  tip: "Diga quem o modelo deve ser. Ex.: \"Você é um consultor de RH experiente.\"",
  check(prompt) {
    return strongest(
      recognizeLabel(prompt, ["papel", "persona", "role"]),
      recognizeStructure(prompt, ROLE_NATURAL, ROLE_WEAK),
    );
  },
};

// Action verbs, without accents and in lowercase, in pt-BR and English: imperatives and infinitives.
const ACTION_VERBS = new RegExp(
  `(?<![a-z])(${[
    "liste", "listar", "escreva", "escrever", "redija", "redigir", "resuma", "resumir",
    "extraia", "extrair", "gere", "gerar", "identifique", "identificar", "crie", "criar",
    "analise", "analisar", "marque", "marcar", "agende", "agendar", "envie", "enviar",
    "explique", "explicar", "compare", "comparar", "classifique", "classificar",
    "transforme", "transformar", "responda", "responder", "descreva", "descrever",
    "sugira", "sugerir", "monte", "montar", "organize", "organizar", "revise", "revisar",
    "traduza", "traduzir", "calcule", "calcular", "defina", "definir", "avalie", "avaliar",
    "estruture", "estruturar", "formate", "formatar", "reescreva", "reescrever",
    "prepare", "preparar", "elabore", "elaborar", "apresente", "apresentar",
    "produza", "produzir", "selecione", "selecionar", "ordene", "ordenar", "escolha", "escolher",
    "list", "write", "summarize", "summarise", "extract", "generate", "identify", "create",
    "analyze", "analyse", "schedule", "send", "explain", "compare", "classify", "transform",
    "respond", "describe", "suggest", "draft", "rewrite", "translate", "calculate", "define",
    "evaluate", "structure", "format", "prepare", "organize", "organise", "select", "produce",
    "compile", "rank", "sort", "choose",
  ].join("|")})(?![a-z])`,
  "g",
);

// Index of the first mention of a Keywords term in the normalized text, or -1.
function keywordIndex(normalizedText: string, keywords: string[][]): number {
  const indexes = keywords.flatMap((group) =>
    group.map((term) => {
      const escaped = searchKey(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const match = new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`).exec(normalizedText);
      return match ? match.index : -1;
    }),
  );
  const found = indexes.filter((index) => index >= 0);
  return found.length > 0 ? Math.min(...found) : -1;
}

function sentenceExcerpt(prompt: string, index: number): string {
  const { start, end } = sentenceAt(prompt, index);
  return prompt.slice(start, end).trim();
}

export const TASK: Criterion = {
  id: "task",
  name: "Tarefa",
  max: 20,
  tip:
    "Comece com um verbo de ação (liste, escreva, resuma) e fale do assunto do Desafio. Ex.: \"Liste as vantagens e desvantagens do trabalho remoto.\"",
  check(prompt, challenge) {
    const keyword = keywordIndex(searchKey(prompt), challenge.keywords);
    const verb = findMarker(prompt, ACTION_VERBS)[0];
    const label = recognizeLabel(prompt, ["tarefa", "task"]);

    if (label && keyword >= 0) return { level: "full", excerpt: label.excerpt };
    if (verb && keyword >= 0) return { level: "partial", excerpt: sentenceExcerpt(prompt, verb.index) };
    if (label) return { level: "weak", excerpt: label.excerpt };
    if (verb) return { level: "weak", excerpt: sentenceExcerpt(prompt, verb.index) };
    if (keyword >= 0) return { level: "weak", excerpt: sentenceExcerpt(prompt, keyword) };
    return null;
  },
};

const CONTEXT_NATURAL =
  /(?<![a-z])(o publico e|a audiencia e|o objetivo e|the audience is|the goal is|the objective is|estamos|estou|we are|i am|para a diretoria|para o time|para a equipe|for the board|for the team)(?![a-z])/g;
const CONTEXT_WEAK = /(?<![a-z])(contexto|situacao)(?![a-z])/g;

export const CONTEXT: Criterion = {
  id: "context",
  name: "Contexto",
  max: 15,
  tip: "Diga para quem é e em que situação está. Ex.: \"Estamos decidindo o modelo de trabalho. O público é a diretoria.\"",
  check(prompt) {
    return strongest(
      recognizeLabel(prompt, ["contexto", "context"]),
      recognizeStructure(prompt, CONTEXT_NATURAL, CONTEXT_WEAK),
    );
  },
};

const FORMAT_NATURAL =
  /(?<![a-z])(formato|format|topicos|em lista|numerad[oa]|numbered|bullet|bulleted|tabela|table|json|markdown|titulos|\d+ (itens|items|palavras|words))(?![a-z])/g;

export const FORMAT: Criterion = {
  id: "format",
  name: "Formato",
  max: 15,
  tip: "Diga como a resposta deve ser organizada. Ex.: \"Responda em 3 itens, em tópicos curtos.\"",
  check(prompt) {
    return strongest(
      recognizeLabel(prompt, ["formato", "format"]),
      recognizeStructure(prompt, FORMAT_NATURAL),
    );
  },
};

const CONSTRAINTS_NATURAL =
  /(?<![a-z])(nao (inclua|use|escreva|invente|adicione|mencione|faca|traga|cite|repita|fale)|evite|sem|apenas|somente|no maximo|nunca|don't|do not|avoid|only|never)(?![a-z])/g;
const CONSTRAINTS_WEAK = /(?<![a-z])sem(?![a-z])/g;

export const CONSTRAINTS: Criterion = {
  id: "constraints",
  name: "Restrições",
  max: 10,
  tip: "Diga o que não deve aparecer ou quais limites seguir. Ex.: \"Não inclua opiniões pessoais.\"",
  check(prompt) {
    return strongest(
      recognizeLabel(prompt, ["restricoes", "restriction", "restrictions", "constraints"]),
      recognizeStructure(prompt, CONSTRAINTS_NATURAL, CONSTRAINTS_WEAK),
    );
  },
};

// Quoted excerpt with at least 4 words.
function recognizeQuote(prompt: string): Recognition {
  for (const [excerpt, content] of prompt.matchAll(/["“]([^"”]+)["”]/g)) {
    if (countWords(content) >= MIN_WORDS) return { level: "partial", excerpt };
  }
  return null;
}

const EXAMPLES_NATURAL =
  /(?<![a-z])(por exemplo|exemplo:|ex\.:|for example|example:|such as)(?![a-z])/g;
const EXAMPLES_WEAK = /(?<![a-z])exemplo(?![a-z])/g;

export const EXAMPLES: Criterion = {
  id: "examples",
  name: "Exemplos",
  max: 10,
  tip: "Mostre um exemplo do que espera na resposta. Ex.: \"Exemplo: Vantagem: economia com aluguel.\"",
  check(prompt) {
    return strongest(
      recognizeLabel(prompt, ["exemplo", "exemplos", "example", "examples"]),
      recognizeStructure(prompt, EXAMPLES_NATURAL, EXAMPLES_WEAK),
      recognizeQuote(prompt),
    );
  },
};
