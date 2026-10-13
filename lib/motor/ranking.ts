// Regras de pontuação e de desempate, sem I/O. O Placar e o campeão da Rodada usam a mesma ordem.

export type TentativaRegistrada = {
  id: string;
  jogadorId: string;
  rodadaId: string;
  numero: number;
  nota: number;
  criadaEm: Date;
};

// Marca de um Jogador: quanto ele pontuou, quantas Tentativas gastou para isso e quando atingiu o total.
export type Marca = { pontuacao: number; tentativasUsadas: number; atingiuEm: number };

export type ColocacaoNaRodada<T extends TentativaRegistrada> = {
  jogadorId: string;
  melhor: T;
  tentativasUsadas: number;
};

// Maior Nota primeiro; menos Tentativas usadas; depois quem atingiu a pontuação antes.
export function compararMarcas(a: Marca, b: Marca): number {
  return (
    maiorPrimeiro(a.pontuacao, b.pontuacao) ||
    menorPrimeiro(a.tentativasUsadas, b.tentativasUsadas) ||
    menorPrimeiro(a.atingiuEm, b.atingiuEm)
  );
}

function maiorPrimeiro(a: number, b: number): number {
  return a === b ? 0 : a > b ? -1 : 1;
}

function menorPrimeiro(a: number, b: number): number {
  return a === b ? 0 : a < b ? -1 : 1;
}

function emOrdemDeEnvio<T extends TentativaRegistrada>(tentativas: T[]): T[] {
  return [...tentativas].sort(
    (a, b) => a.criadaEm.getTime() - b.criadaEm.getTime() || a.numero - b.numero,
  );
}

// Tentativa de maior Nota; em empate de Nota, a que foi enviada primeiro.
export function melhorTentativa<T extends TentativaRegistrada>(tentativas: T[]): T | undefined {
  return emOrdemDeEnvio(tentativas).reduce<T | undefined>(
    (melhor, atual) => (!melhor || atual.nota > melhor.nota ? atual : melhor),
    undefined,
  );
}

function agrupar<T>(itens: T[], chave: (item: T) => string): Map<string, T[]> {
  const grupos = new Map<string, T[]>();
  for (const item of itens) {
    const grupo = grupos.get(chave(item)) ?? [];
    grupo.push(item);
    grupos.set(chave(item), grupo);
  }
  return grupos;
}

// Ranking de uma Rodada: só quem tem Nota acima de zero, na ordem do desempate.
export function rankingDaRodada<T extends TentativaRegistrada>(
  tentativasDaRodada: T[],
): ColocacaoNaRodada<T>[] {
  const colocacoes: ColocacaoNaRodada<T>[] = [];
  for (const [jogadorId, tentativas] of agrupar(tentativasDaRodada, (t) => t.jogadorId)) {
    const melhor = melhorTentativa(tentativas);
    if (!melhor || melhor.nota <= 0) continue;
    colocacoes.push({ jogadorId, melhor, tentativasUsadas: tentativas.length });
  }
  return colocacoes.sort((a, b) => compararMarcas(marcaNaRodada(a), marcaNaRodada(b)));
}

function marcaNaRodada<T extends TentativaRegistrada>(colocacao: ColocacaoNaRodada<T>): Marca {
  return {
    pontuacao: colocacao.melhor.nota,
    tentativasUsadas: colocacao.tentativasUsadas,
    atingiuEm: colocacao.melhor.criadaEm.getTime(),
  };
}

// Pontuação do Placar: soma, por Rodada, a Nota da melhor Tentativa. Conta as Tentativas só
// das Rodadas em que o Jogador pontuou. `atingiuEm` é quando o total final foi alcançado.
export function marcaDoPlacar(tentativas: TentativaRegistrada[]): Marca {
  const melhorPorRodada = new Map<string, number>();
  for (const [rodadaId, tentativasDaRodada] of agrupar(tentativas, (t) => t.rodadaId)) {
    const melhor = melhorTentativa(tentativasDaRodada);
    melhorPorRodada.set(rodadaId, melhor?.nota ?? 0);
  }
  const pontuacao = [...melhorPorRodada.values()].reduce((soma, nota) => soma + nota, 0);

  let tentativasUsadas = 0;
  for (const [rodadaId, tentativasDaRodada] of agrupar(tentativas, (t) => t.rodadaId)) {
    if ((melhorPorRodada.get(rodadaId) ?? 0) > 0) tentativasUsadas += tentativasDaRodada.length;
  }

  return { pontuacao, tentativasUsadas, atingiuEm: instanteDoTotal(tentativas, pontuacao) };
}

// Primeiro instante em que o total chegou ao valor final. Sem pontos, nunca atingiu.
function instanteDoTotal(tentativas: TentativaRegistrada[], final: number): number {
  if (final === 0) return Number.POSITIVE_INFINITY;

  const melhorPorRodada = new Map<string, number>();
  let total = 0;
  for (const tentativa of emOrdemDeEnvio(tentativas)) {
    const atual = melhorPorRodada.get(tentativa.rodadaId) ?? 0;
    if (tentativa.nota <= atual) continue;
    melhorPorRodada.set(tentativa.rodadaId, tentativa.nota);
    total += tentativa.nota - atual;
    if (total >= final) return tentativa.criadaEm.getTime();
  }
  return Number.POSITIVE_INFINITY;
}

export function agruparPorJogador<T extends TentativaRegistrada>(tentativas: T[]): Map<string, T[]> {
  return agrupar(tentativas, (t) => t.jogadorId);
}
