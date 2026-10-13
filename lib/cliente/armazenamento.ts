// Acesso ao localStorage com fallback: em aba privada ou com dados bloqueados ele pode falhar.
export function lerItem(chave: string): string | null {
  try {
    return window.localStorage.getItem(chave);
  } catch {
    return null;
  }
}

export function salvarItem(chave: string, valor: string): void {
  try {
    window.localStorage.setItem(chave, valor);
  } catch {
    // Sem armazenamento, o jogo segue funcionando; só não lembra da sessão.
  }
}

export function removerItem(chave: string): void {
  try {
    window.localStorage.removeItem(chave);
  } catch {
    // Nada a fazer.
  }
}
