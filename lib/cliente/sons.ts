import { lerItem, salvarItem } from "./armazenamento";

const CHAVE = "workshop.som";

// Preferência de som: desligado por padrão, salvo no navegador.
export function lerPreferenciaDeSom(): boolean {
  return lerItem(CHAVE) === "ligado";
}

export function salvarPreferenciaDeSom(ligado: boolean): void {
  salvarItem(CHAVE, ligado ? "ligado" : "desligado");
}

export type Efeito = "enviar" | "nota" | "subir";

// Notas 8-bit: [frequência em Hz, duração em segundos], tocadas em sequência.
const NOTAS: Record<Efeito, [number, number][]> = {
  enviar: [
    [880, 0.05],
    [1320, 0.08],
  ],
  nota: [
    [523, 0.08],
    [659, 0.08],
    [784, 0.14],
  ],
  subir: [
    [523, 0.07],
    [659, 0.07],
    [784, 0.07],
    [1047, 0.22],
  ],
};

let contexto: AudioContext | null = null;

// Toca um efeito. Sem suporte a áudio (ou sem gesto do Jogador), o jogo segue em silêncio.
export function tocarEfeito(efeito: Efeito): void {
  try {
    contexto ??= new AudioContext();
    if (contexto.state === "suspended") void contexto.resume();

    let instante = contexto.currentTime;
    for (const [frequencia, duracao] of NOTAS[efeito]) {
      const oscilador = contexto.createOscillator();
      const ganho = contexto.createGain();
      oscilador.type = "square";
      oscilador.frequency.value = frequencia;
      ganho.gain.value = 0.06;
      oscilador.connect(ganho).connect(contexto.destination);
      oscilador.start(instante);
      oscilador.stop(instante + duracao);
      instante += duracao;
    }
  } catch {
    // Sem áudio disponível, nada a fazer.
  }
}
