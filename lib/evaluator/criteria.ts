import type { Challenge } from "../challenges/types";
import { findMarker, labelContent, countWords, sentenceAt, searchKey } from "./text";

// Strength of the signal: an explicit label with content, a natural phrase, or a weak mention.
export type Level = "full" | "partial" | "weak";

export type Recognition = { level: Level; excerpt: string } | null;

// Where a tip comes from: a section of the Anthropic prompting documentation, or the workshop's own guide.
export type Reference = { label: string; url?: string };

export type Criterion = {
  id: string;
  name: string;
  max: number;
  tip: string;
  // One line of the fixed "Guia de um bom prompt", shown to the Player at all times.
  guide: string;
  reference: Reference;
  check: (prompt: string, challenge: Challenge) => Recognition;
};

const ANTHROPIC_PROMPTING_DOCS =
  "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices";

function anthropicSection(section: string): Reference {
  return { label: `Documentação da Anthropic: “${section}”`, url: ANTHROPIC_PROMPTING_DOCS };
}

const WORKSHOP_GUIDE: Reference = { label: "Guia de um bom prompt, nesta janela" };

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
  guide: "Defina quem o modelo deve ser, com uma persona ou especialidade.",
  reference: anthropicSection("Give Claude a role"),
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
  guide: "Diga o que fazer, com um verbo de ação e o assunto do Desafio.",
  reference: anthropicSection("Be clear and direct"),
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
  guide: "Diga a situação e para quem é a resposta.",
  reference: anthropicSection("Add context"),
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
  guide: "Diga como organizar a resposta: lista, tabela, JSON ou número de itens.",
  reference: anthropicSection("Control the format of responses"),
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
  guide: "Diga o que não deve aparecer e quais limites seguir.",
  reference: anthropicSection("Be clear and direct"),
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
  guide: "Mostre um exemplo do resultado esperado.",
  reference: anthropicSection("Use examples effectively"),
  tip: "Mostre um exemplo do que espera na resposta. Ex.: \"Exemplo: Vantagem: economia com aluguel.\"",
  check(prompt) {
    return strongest(
      recognizeLabel(prompt, ["exemplo", "exemplos", "example", "examples"]),
      recognizeStructure(prompt, EXAMPLES_NATURAL, EXAMPLES_WEAK),
      recognizeQuote(prompt),
    );
  },
};

// XML tag pair with any name (`<contexto>…</contexto>`); the content is between the tags.
const XML_BLOCK = /<([a-z][\w-]*)>([\s\S]*?)<\/\1>/gi;
// A Markdown heading line or a `---` separator line: each one splits the prompt into sections.
const LINE_DELIMITER = /^[ \t]*(?:#{1,6}[ \t]+\S.*|---+)[ \t]*$/gm;

function hasContent(text: string): boolean {
  return countWords(text) >= 1;
}

// Isolated blocks: XML pairs with content, plus the sections between heading or separator lines.
// Two blocks give full points, one block 70%, and a tag or heading without content 30%.
function recognizeDelimiters(prompt: string): Recognition {
  const xmlBlocks = [...prompt.matchAll(XML_BLOCK)];
  // The XML pairs are taken out first, so one block is not counted twice and a heading inside a block is not a section.
  const text = prompt.replace(XML_BLOCK, "\n");
  const lineMarks = [...text.matchAll(LINE_DELIMITER)];
  const sections = lineMarks.length > 0 ? text.split(LINE_DELIMITER).filter(hasContent) : [];
  const blocks = [
    ...xmlBlocks.filter((block) => hasContent(block[2])).map((block) => block[0]),
    ...sections,
  ].map((block) => block.trim());

  if (blocks.length >= 2) return { level: "full", excerpt: blocks[0] };
  if (blocks.length === 1) return { level: "partial", excerpt: blocks[0] };
  const mark = xmlBlocks[0]?.[0] ?? lineMarks[0]?.[0];
  return mark ? { level: "weak", excerpt: mark.trim() } : null;
}

export const DELIMITERS: Criterion = {
  id: "delimiters",
  name: "Delimitadores",
  max: 10,
  guide: "Separe as partes do prompt com tags ou títulos.",
  reference: anthropicSection("Structure prompts with XML tags"),
  tip: "Separe as partes do prompt com tags ou títulos. Ex.: \"<contexto>…</contexto>\" ou \"## Tarefa\".",
  check: recognizeDelimiters,
};

// Conditional words, and the words that say the information is absent (`não`, `faltar`…).
const CONDITIONAL = /(?<![a-z])(se|caso|if)(?![a-z])/g;
const ABSENCE =
  /(?<![a-z])(nao|nenhum|nenhuma|falta|faltar|falte|faltando|ausente|vazio|desconhecid[oa]|not|missing|unknown|empty|absent)(?![a-z])/;
// Verbs that tell the Model what to write in the uncertain case.
const UNCERTAINTY_ACTION =
  /(?<![a-z])(escreva|escrever|responda|responder|deixe|deixar|informe|informar|indique|indicar|diga|dizer|retorne|retornar|devolva|devolver|use|usar|mencione|mencionar|marque|marcar|write|respond|leave|say|return|mark|put|answer)(?![a-z])/;

// Conditional with absence in the same sentence: with the action to take it is full, without it 70%.
function recognizeConditional(prompt: string): Recognition {
  // Every conditional is checked: a later one with the action beats an earlier one without it.
  let best: Recognition = null;
  for (const { index, marker } of findMarker(prompt, CONDITIONAL)) {
    const { start, end } = sentenceAt(prompt, index);
    const clause = searchKey(prompt.slice(start, end)).slice(index - start + marker.length);
    if (!ABSENCE.test(clause)) continue;
    const level: Level = UNCERTAINTY_ACTION.test(clause) ? "full" : "partial";
    const excerpt = prompt.slice(start, end).trim();
    if (level === "full") return { level, excerpt };
    if (!best) best = { level, excerpt };
  }
  return best;
}

const UNCERTAINTY_WEAK = /(?<![a-z])(nao informad[oa]|nao encontrad[oa])(?![a-z])/g;

export const UNCERTAINTY: Criterion = {
  id: "uncertainty",
  name: "Incerteza",
  max: 5,
  guide: "Diga o que fazer quando alguma informação faltar.",
  reference: WORKSHOP_GUIDE,
  tip: "Diga o que fazer quando faltar informação. Ex.: \"Se o valor não estiver no texto, escreva 'não informado'.\"",
  check(prompt) {
    return strongest(recognizeConditional(prompt), recognizeMention(prompt, UNCERTAINTY_WEAK));
  },
};
