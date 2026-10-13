// Cronômetro no formato MM:SS. Valores negativos viram 00:00.
export function formatarTempo(ms: number): string {
  const segundos = Math.max(0, Math.ceil(ms / 1000));
  const minutos = Math.floor(segundos / 60);
  return `${String(minutos).padStart(2, "0")}:${String(segundos % 60).padStart(2, "0")}`;
}
