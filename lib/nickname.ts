export type NicknameResult =
  | { ok: true; nickname: string; normalized: string; initials: string }
  | { ok: false; error: string };

const MIN = 2;
const MAX = 16;

// Latin letters (with accents), numbers and spaces. Anything else is invalid.
const ALLOWED_CHARACTERS = /^[\p{Script=Latin}\p{N} ]+$/u;

// Latin letters that do not decompose in NFD get their closest equivalent.
const EQUIVALENTS: Record<string, string> = {
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

function withoutAccents(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[øØłŁæÆœŒßđĐħĦıðÐþÞ]/gu, (letter) => EQUIVALENTS[letter] ?? letter);
}

function alphanumeric(text: string): string {
  return withoutAccents(text).replace(/[^A-Za-z0-9]/g, "");
}

export function normalizeNickname(name: string): string {
  return withoutAccents(name).replace(/\s+/g, " ").trim().toLowerCase();
}

export function avatarInitials(name: string): string {
  return alphanumeric(name).slice(0, 2).toUpperCase();
}

export function validateNickname(raw: string): NicknameResult {
  const nickname = raw.normalize("NFC").trim().replace(/\s+/g, " ");
  const length = [...nickname].length;

  if (length < MIN) {
    return { ok: false, error: "O Nickname precisa ter pelo menos 2 caracteres." };
  }
  if (length > MAX) {
    return { ok: false, error: "O Nickname pode ter no máximo 16 caracteres." };
  }
  if (!ALLOWED_CHARACTERS.test(nickname)) {
    return { ok: false, error: "Use apenas letras, números e espaços." };
  }
  if (alphanumeric(nickname).length < MIN) {
    return { ok: false, error: "Use pelo menos 2 letras ou números." };
  }

  return {
    ok: true,
    nickname,
    normalized: normalizeNickname(nickname),
    initials: avatarInitials(nickname),
  };
}
