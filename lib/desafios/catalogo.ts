import { DESAFIOS_SEED } from "./seed";
import type { Desafio } from "./tipos";

// Catálogo carregado do seed versionado; os Desafios não ficam no banco.
export const DESAFIOS: Desafio[] = [...DESAFIOS_SEED].sort((a, b) => a.ordem - b.ordem);

export function buscarDesafio(id: string, desafios: Desafio[] = DESAFIOS): Desafio | undefined {
  return desafios.find((desafio) => desafio.id === id);
}
