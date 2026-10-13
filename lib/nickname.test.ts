import { describe, expect, it } from "vitest";
import { iniciaisDoAvatar, normalizarNickname, validarNickname } from "./nickname";

describe("validarNickname", () => {
  it("aceita um Nickname simples e apara os espaços das pontas", () => {
    const r = validarNickname("  Ana  ");
    expect(r).toEqual({ ok: true, nickname: "Ana", normalizado: "ana", iniciais: "AN" });
  });

  it("aceita letras com acento, números e espaços no meio", () => {
    expect(validarNickname("João Silva 2")).toMatchObject({ ok: true, nickname: "João Silva 2" });
  });

  it("recusa Nickname com menos de 2 caracteres depois de aparar", () => {
    expect(validarNickname("   a  ")).toEqual({
      ok: false,
      erro: "O Nickname precisa ter pelo menos 2 caracteres.",
    });
  });

  it("recusa Nickname com mais de 16 caracteres", () => {
    expect(validarNickname("a".repeat(17))).toEqual({
      ok: false,
      erro: "O Nickname pode ter no máximo 16 caracteres.",
    });
  });

  it("aceita exatamente 16 caracteres", () => {
    expect(validarNickname("a".repeat(16))).toMatchObject({ ok: true });
  });

  it("recusa caracteres que não são letras, números nem espaços", () => {
    expect(validarNickname("ana_maria")).toEqual({
      ok: false,
      erro: "Use apenas letras, números e espaços.",
    });
  });

  it("recusa letras que não são do alfabeto latino", () => {
    expect(validarNickname("Жанна")).toEqual({
      ok: false,
      erro: "Use apenas letras, números e espaços.",
    });
  });

  it("não conta espaços como alfanuméricos", () => {
    expect(validarNickname("a   b")).toMatchObject({ ok: true, nickname: "a b" });
    expect(validarNickname("a      ")).toEqual({
      ok: false,
      erro: "O Nickname precisa ter pelo menos 2 caracteres.",
    });
  });
});

describe("normalizarNickname", () => {
  it("compara minúsculo e sem acento: 'João' e 'JOAO' colidem", () => {
    expect(normalizarNickname("João")).toBe(normalizarNickname("JOAO"));
  });
});

describe("iniciaisDoAvatar", () => {
  it("usa os 2 primeiros caracteres alfanuméricos, sem acento, em maiúsculo", () => {
    expect(iniciaisDoAvatar("Élio")).toBe("EL");
    expect(iniciaisDoAvatar("ana")).toBe("AN");
  });

  it("pula espaços e pontuação ao procurar as iniciais", () => {
    expect(iniciaisDoAvatar(" 9 - luz")).toBe("9L");
  });

  it("trata letras sem decomposição como suas equivalentes latinas", () => {
    expect(iniciaisDoAvatar("Łukasz")).toBe("LU");
    expect(iniciaisDoAvatar("Øystein")).toBe("OY");
  });

  it("aceita Nickname cujas letras não se decompõem, como 'Øy'", () => {
    expect(validarNickname("Øy")).toMatchObject({ ok: true, iniciais: "OY" });
  });

  it("devolve string vazia quando não há caracteres alfanuméricos", () => {
    expect(iniciaisDoAvatar("  ")).toBe("");
  });
});
