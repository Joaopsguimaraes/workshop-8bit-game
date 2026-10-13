import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Sessão do Facilitador: um cookie assinado com expiração, sem estado no servidor.
// O segredo nasce aleatório a cada processo; um restart exige o PIN de novo.
const DURACAO_MS = 12 * 60 * 60 * 1000;

const CHAVE_GLOBAL = "__workshopSegredoFacilitador";
type GlobalComSegredo = typeof globalThis & { [CHAVE_GLOBAL]?: Buffer };

export const NOME_COOKIE_FACILITADOR = "facilitador_sessao";

export function segredoDoProcesso(): Buffer {
  const global_ = globalThis as GlobalComSegredo;
  global_[CHAVE_GLOBAL] ??= randomBytes(32);
  return global_[CHAVE_GLOBAL];
}

// Compara com tempo constante; PIN vazio ou não configurado nunca confere.
export function pinConfere(informado: string, esperado: string | undefined): boolean {
  if (!esperado || !informado) return false;
  const a = Buffer.from(informado);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

function assinar(segredo: Buffer, expira: number): string {
  return createHmac("sha256", segredo).update(`facilitador:${expira}`).digest("base64url");
}

export function criarSessaoFacilitador(segredo: Buffer, agora: Date): string {
  const expira = agora.getTime() + DURACAO_MS;
  return `${expira}.${assinar(segredo, expira)}`;
}

export function sessaoFacilitadorValida(
  token: string | undefined,
  segredo: Buffer,
  agora: Date,
): boolean {
  if (!token) return false;
  const [expiraBruto, assinatura] = token.split(".");
  const expira = Number(expiraBruto);
  if (!Number.isInteger(expira) || !assinatura) return false;
  if (expira <= agora.getTime()) return false;

  const esperada = Buffer.from(assinar(segredo, expira));
  const recebida = Buffer.from(assinatura);
  return esperada.length === recebida.length && timingSafeEqual(esperada, recebida);
}

// Lê um cookie do cabeçalho `Cookie` de uma requisição HTTP ou de um handshake de socket.
export function valorDoCookie(cabecalho: string | undefined, nome: string): string | undefined {
  if (!cabecalho) return undefined;
  for (const par of cabecalho.split(";")) {
    const [chave, ...resto] = par.trim().split("=");
    if (chave === nome) return resto.join("=");
  }
  return undefined;
}
