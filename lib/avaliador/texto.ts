// Busca sem acento nem maiúscula, mantendo o mesmo tamanho do texto original.
// Assim um índice encontrado na cópia vale também no texto que o Jogador escreveu.
export function chaveDeBusca(texto: string): string {
  return Array.from(texto, (caractere) => {
    if (caractere.length !== 1) return caractere;
    const base = caractere.normalize("NFD").charAt(0).toLowerCase();
    return base.length === 1 ? base : caractere;
  }).join("");
}

// Palavras de conteúdo: ignora marcações como ** # < > e pontuação solta.
export function contarPalavras(trecho: string): number {
  return trecho
    .replace(/<\/?[^>]*>/g, " ")
    .split(/\s+/)
    .filter((palavra) => /[\p{L}\p{N}]/u.test(palavra)).length;
}

// Frase em que o marcador aparece, delimitada por . ! ? ou quebra de linha.
export function fraseDoIndice(texto: string, indice: number): { inicio: number; fim: number } {
  const antes = texto.slice(0, indice);
  const inicio = Math.max(antes.search(/[^.!?\n]*$/), 0);
  const restante = texto.slice(indice);
  const corte = restante.search(/[.!?\n]/);
  const fim = corte === -1 ? texto.length : indice + corte;
  return { inicio, fim };
}

// Rótulo: no início de linha (`Papel:`, `## Papel`, `**Papel**`, `<papel>`) ou
// no meio do texto depois de uma frase (`... x. Contexto: ...`, sempre com dois pontos).
// `rotulos` vêm sem acento e em minúsculo.
export function conteudoDoRotulo(
  texto: string,
  rotulos: string[],
): { trecho: string; palavras: number } | null {
  const busca = chaveDeBusca(texto);
  const alternativas = rotulos.map((rotulo) => rotulo.replace(/\s+/g, "\\s+")).join("|");
  // Com marcação (`##`, `**`, `<`) os dois pontos são opcionais; sem ela, são obrigatórios.
  const dePrimeiraLinha = new RegExp(
    `^[ \\t]*(?:(?:#{1,6}[ \\t]*|\\*\\*|<)(?:${alternativas})[ \\t]*(?:\\*\\*|>)?[ \\t]*:?|(?:${alternativas})[ \\t]*:)`,
    "gm",
  );
  const noMeio = new RegExp(`(?<=[\\s.!?])(?:${alternativas})(?:\\*\\*)?:`, "g");

  const encontrados = [...busca.matchAll(dePrimeiraLinha), ...busca.matchAll(noMeio)].sort(
    (a, b) => (a.index ?? 0) - (b.index ?? 0),
  );
  const primeiro = encontrados[0];
  if (!primeiro) return null;

  const inicio = primeiro.index ?? 0;
  const fimRotulo = inicio + primeiro[0].length;
  // O conteúdo termina no próximo rótulo, em cabeçalho ou marcação de linha, ou no fim do texto.
  const proximo = busca
    .slice(fimRotulo)
    .search(/\n[ \t]*(?:#|\*\*|<)|(?<=[\s.!?])[\p{L}][\p{L} ]{0,28}:/u);
  const fim = proximo === -1 ? texto.length : fimRotulo + proximo;

  const trecho = texto.slice(inicio, fim).trim();
  const palavras = contarPalavras(texto.slice(fimRotulo, fim));
  return { trecho, palavras };
}

export function buscarMarcador(texto: string, padrao: RegExp) {
  return [...chaveDeBusca(texto).matchAll(padrao)].map((encontrado) => ({
    indice: encontrado.index ?? 0,
    marcador: encontrado[0],
  }));
}
