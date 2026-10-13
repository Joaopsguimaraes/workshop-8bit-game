import { lerItem, removerItem, salvarItem } from "./armazenamento";

const CHAVE_TOKEN = "workshop.token";

export function lerToken(): string | null {
  return lerItem(CHAVE_TOKEN);
}

export function salvarToken(token: string): void {
  salvarItem(CHAVE_TOKEN, token);
}

export function limparToken(): void {
  removerItem(CHAVE_TOKEN);
}
