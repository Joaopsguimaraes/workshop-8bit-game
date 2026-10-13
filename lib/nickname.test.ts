import { describe, expect, it } from "vitest";
import { avatarInitials, normalizeNickname, validateNickname } from "./nickname";

describe("validateNickname", () => {
  it("accepts a simple Nickname and trims the edge spaces", () => {
    const r = validateNickname("  Ana  ");
    expect(r).toEqual({ ok: true, nickname: "Ana", normalized: "ana", initials: "AN" });
  });

  it("accepts accented letters, numbers and spaces in the middle", () => {
    expect(validateNickname("João Silva 2")).toMatchObject({ ok: true, nickname: "João Silva 2" });
  });

  it("rejects a Nickname shorter than 2 characters after trimming", () => {
    expect(validateNickname("   a  ")).toEqual({
      ok: false,
      error: "O Nickname precisa ter pelo menos 2 caracteres.",
    });
  });

  it("rejects a Nickname longer than 16 characters", () => {
    expect(validateNickname("a".repeat(17))).toEqual({
      ok: false,
      error: "O Nickname pode ter no máximo 16 caracteres.",
    });
  });

  it("accepts exactly 16 characters", () => {
    expect(validateNickname("a".repeat(16))).toMatchObject({ ok: true });
  });

  it("rejects characters that are not letters, numbers or spaces", () => {
    expect(validateNickname("ana_maria")).toEqual({
      ok: false,
      error: "Use apenas letras, números e espaços.",
    });
  });

  it("rejects letters that are not from the Latin alphabet", () => {
    expect(validateNickname("Жанна")).toEqual({
      ok: false,
      error: "Use apenas letras, números e espaços.",
    });
  });

  it("does not count spaces as alphanumeric", () => {
    expect(validateNickname("a   b")).toMatchObject({ ok: true, nickname: "a b" });
    expect(validateNickname("a      ")).toEqual({
      ok: false,
      error: "O Nickname precisa ter pelo menos 2 caracteres.",
    });
  });
});

describe("normalizeNickname", () => {
  it("compares lowercase and without accents: 'João' and 'JOAO' collide", () => {
    expect(normalizeNickname("João")).toBe(normalizeNickname("JOAO"));
  });
});

describe("avatarInitials", () => {
  it("uses the first 2 alphanumeric characters, without accents, in uppercase", () => {
    expect(avatarInitials("Élio")).toBe("EL");
    expect(avatarInitials("ana")).toBe("AN");
  });

  it("skips spaces and punctuation when looking for the initials", () => {
    expect(avatarInitials(" 9 - luz")).toBe("9L");
  });

  it("treats letters that do not decompose as their Latin equivalents", () => {
    expect(avatarInitials("Łukasz")).toBe("LU");
    expect(avatarInitials("Øystein")).toBe("OY");
  });

  it("accepts a Nickname whose letters do not decompose, such as 'Øy'", () => {
    expect(validateNickname("Øy")).toMatchObject({ ok: true, initials: "OY" });
  });

  it("returns an empty string when there are no alphanumeric characters", () => {
    expect(avatarInitials("  ")).toBe("");
  });
});
