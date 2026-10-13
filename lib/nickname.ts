export type ResultadoNickname =
  | { ok: true; nickname: string; normalizado: string; iniciais: string }
  | { ok: false; erro: string };

const MINIMO = 2;
const MAXIMO = 16;

// Letras latinas (com acento), números e espaço. Tudo o mais é inválido.
const CARACTERES_PERMITIDOS = /^[\p{Script=Latin}\p{N} ]+$/u;

// Letras latinas que não se decompõem em NFD ganham a equivalente mais próxima.
const EQUIVALENTES: Record<string, string> = {
  ø: "o",
  Ø: "O",
  ł: "l",
  Ł: "L",
  æ: "ae",
  Æ: "AE",
  œ: "oe",
  Œ: "OE",
  ß: "ss",
  đ: "d",
  Đ: "D",
  ħ: "h",
  Ħ: "H",
  ı: "i",
  ð: "d",
  Ð: "D",
  þ: "th",
  Þ: "TH",
};

function semAcento(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[øØłŁæÆœŒßđĐħĦıðÐþÞ]/gu, (letra) => EQUIVALENTES[letra] ?? letra);
}

function alfanumericos(texto: string): string {
  return semAcento(texto).replace(/[^A-Za-z0-9]/g, "");
}

export function normalizarNickname(nome: string): string {
  return semAcento(nome).replace(/\s+/g, " ").trim().toLowerCase();
}

export function iniciaisDoAvatar(nome: string): string {
  return alfanumericos(nome).slice(0, 2).toUpperCase();
}

export function validarNickname(bruto: string): ResultadoNickname {
  const nickname = bruto.normalize("NFC").trim().replace(/\s+/g, " ");
  const tamanho = [...nickname].length;

  if (tamanho < MINIMO) {
    return { ok: false, erro: "O Nickname precisa ter pelo menos 2 caracteres." };
  }
  if (tamanho > MAXIMO) {
    return { ok: false, erro: "O Nickname pode ter no máximo 16 caracteres." };
  }
  if (!CARACTERES_PERMITIDOS.test(nickname)) {
    return { ok: false, erro: "Use apenas letras, números e espaços." };
  }
  if (alfanumericos(nickname).length < MINIMO) {
    return { ok: false, erro: "Use pelo menos 2 letras ou números." };
  }

  return {
    ok: true,
    nickname,
    normalizado: normalizarNickname(nickname),
    iniciais: iniciaisDoAvatar(nickname),
  };
}
