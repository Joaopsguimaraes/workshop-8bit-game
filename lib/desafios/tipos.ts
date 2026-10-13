// Desafio do catálogo: cenário, Palavras-chave em grupos e Prompt de referência.
export type Desafio = {
  id: string;
  ordem: number;
  titulo: string;
  cenario: string;
  // Cada grupo são sinônimos; a Tarefa exige pelo menos 2 grupos distintos.
  palavrasChave: string[][];
  promptReferencia: string;
};
