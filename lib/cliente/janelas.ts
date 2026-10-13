import { lerItem, salvarItem } from "./armazenamento";

export type IdJanela = "prompt" | "desafio" | "placar";

export type EstadoJanela = { x: number; y: number; minimizada: boolean };

export type EstadoJanelas = Record<IdJanela, EstadoJanela>;

const CHAVE = "workshop.janelas";

export const JANELAS_PADRAO: EstadoJanelas = {
  prompt: { x: 32, y: 32, minimizada: false },
  desafio: { x: 32, y: 360, minimizada: false },
  placar: { x: 640, y: 32, minimizada: false },
};

// Junta o que foi salvo com o padrão; dados inválidos ou ausentes caem no padrão.
export function carregarJanelas(): EstadoJanelas {
  const bruto = lerItem(CHAVE);
  if (!bruto) return JANELAS_PADRAO;

  try {
    const salvo = JSON.parse(bruto) as Partial<Record<IdJanela, Partial<EstadoJanela>>>;
    const resultado = { ...JANELAS_PADRAO };
    for (const id of Object.keys(JANELAS_PADRAO) as IdJanela[]) {
      const estado = salvo[id];
      if (!estado) continue;
      resultado[id] = {
        x: typeof estado.x === "number" ? estado.x : JANELAS_PADRAO[id].x,
        y: typeof estado.y === "number" ? estado.y : JANELAS_PADRAO[id].y,
        minimizada: estado.minimizada === true,
      };
    }
    return resultado;
  } catch {
    return JANELAS_PADRAO;
  }
}

export function salvarJanelas(estado: EstadoJanelas): void {
  salvarItem(CHAVE, JSON.stringify(estado));
}
