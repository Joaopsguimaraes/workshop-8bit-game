// Search copy without accents or uppercase, keeping the same length as the original text.
// So an index found in the copy also applies to the text the player wrote.
export function searchKey(text: string): string {
  return Array.from(text, (char) => {
    if (char.length !== 1) return char;
    const base = char.normalize("NFD").charAt(0).toLowerCase();
    return base.length === 1 ? base : char;
  }).join("");
}

// Content words: ignores markup like ** # < > and loose punctuation.
export function countWords(excerpt: string): number {
  return excerpt
    .replace(/<\/?[^>]*>/g, " ")
    .split(/\s+/)
    .filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
}

// Sentence where the marker appears, delimited by . ! ? or a line break.
// The period of the abbreviation "ex." (from "Ex.:") does not end the sentence.
export function sentenceAt(text: string, index: number): { start: number; end: number } {
  const before = text.slice(0, index);
  const start = Math.max(before.search(/[^.!?\n]*$/), 0);
  const rest = text.slice(index);
  const cut = rest.search(/(?<!\b[Ee][Xx])[.!?\n]/);
  const end = cut === -1 ? text.length : index + cut;
  return { start, end };
}

// All the criteria labels: only they end the content of a label, so
// colons inside the content ("Papel: Consultor: experiente") cut nothing.
const KNOWN_LABELS = [
  "papel", "persona", "role", "contexto", "context", "tarefa", "task", "formato", "format",
  "restricoes", "restriction", "restrictions", "constraints", "exemplo", "exemplos", "example", "examples",
].join("|");

// Label: at the start of a line (`Papel:`, `## Papel`, `**Papel**`, `<papel>`) or
// in the middle of the text after a sentence (`... x. Contexto: ...`, always with a colon).
// `labels` come without accents and in lowercase.
export function labelContent(
  text: string,
  labels: string[],
): { excerpt: string; words: number } | null {
  const search = searchKey(text);
  const alternatives = labels.map((label) => label.replace(/\s+/g, "\\s+")).join("|");
  // With markup (`##`, `**`, `<`) the colon is optional; without it, it is required.
  const atLineStart = new RegExp(
    `^[ \\t]*(?:(?:#{1,6}[ \\t]*|\\*\\*|<)(?:${alternatives})[ \\t]*(?:\\*\\*|>)?[ \\t]*:?|(?:${alternatives})[ \\t]*:)`,
    "gm",
  );
  const inMiddle = new RegExp(`(?<=[\\s.!?])(?:${alternatives})(?:\\*\\*)?:`, "g");

  const found = [...search.matchAll(atLineStart), ...search.matchAll(inMiddle)].sort(
    (a, b) => (a.index ?? 0) - (b.index ?? 0),
  );
  const first = found[0];
  if (!first) return null;

  const start = first.index ?? 0;
  const labelEnd = start + first[0].length;
  // The content ends at the next label, at a heading or line markup, or at the end of the text.
  const next = search
    .slice(labelEnd)
    .search(new RegExp(`\\n[ \\t]*(?:#|\\*\\*|<)|(?<=[\\s.!?])(?:${KNOWN_LABELS})[ \\t]*:`));
  const end = next === -1 ? text.length : labelEnd + next;

  const excerpt = text.slice(start, end).trim();
  const words = countWords(text.slice(labelEnd, end));
  return { excerpt, words };
}

export function findMarker(text: string, pattern: RegExp) {
  return [...searchKey(text).matchAll(pattern)].map((match) => ({
    index: match.index ?? 0,
    marker: match[0],
  }));
}
