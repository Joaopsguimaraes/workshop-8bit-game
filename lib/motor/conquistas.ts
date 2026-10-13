// Regras das Conquistas que dependem de um envio. Sem I/O: o Motor decide o que gravar.
export const TIPOS_DE_CONQUISTA = [
  "na-mosca",
  "de-primeira",
  "primeiro-sangue",
  "evolucao",
  "campeao-da-rodada",
] as const;

export type TipoConquista = (typeof TIPOS_DE_CONQUISTA)[number];

export const MELHORA_PARA_EVOLUCAO = 30;

export type EnvioAceito = {
  numero: number;
  nota: number;
  // Nota da 1ª Tentativa do mesmo Jogador na Rodada; ausente quando este envio é o próprio 1º.
  notaDaPrimeira?: number;
  // Verdadeiro quando nenhuma Tentativa da Rodada tinha sido aceita antes deste envio.
  primeiroDaRodada: boolean;
};

// Conquistas que este envio sozinho concede. A regra de "uma vez por Rodada" fica com o Motor.
export function conquistasDoEnvio(envio: EnvioAceito): TipoConquista[] {
  const conquistas: TipoConquista[] = [];
  if (envio.nota === 100) conquistas.push("na-mosca");
  if (envio.nota === 100 && envio.numero === 1) conquistas.push("de-primeira");
  if (envio.primeiroDaRodada) conquistas.push("primeiro-sangue");
  if (
    envio.numero > 1 &&
    envio.notaDaPrimeira !== undefined &&
    envio.nota >= envio.notaDaPrimeira + MELHORA_PARA_EVOLUCAO
  ) {
    conquistas.push("evolucao");
  }
  return conquistas;
}

// Nome que aparece na tela, em pt-BR.
export const NOME_DA_CONQUISTA: Record<TipoConquista, string> = {
  "na-mosca": "Na mosca",
  "de-primeira": "De primeira",
  "primeiro-sangue": "Primeiro sangue",
  evolucao: "Evolução",
  "campeao-da-rodada": "Campeão da Rodada",
};
