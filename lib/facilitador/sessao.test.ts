import { describe, expect, it } from "vitest";
import { criarSessaoFacilitador, pinConfere, sessaoFacilitadorValida, valorDoCookie } from "./sessao";

const SEGREDO = Buffer.from("segredo-de-teste-com-32-bytes-ok!");
const OUTRO_SEGREDO = Buffer.from("outro-segredo-com-32-bytes-tambem!");
const AGORA = new Date("2026-10-13T12:00:00.000Z");
const DOZE_HORAS = 12 * 60 * 60 * 1000;

describe("pinConfere", () => {
  it("aceita o PIN exato", () => {
    expect(pinConfere("4821", "4821")).toBe(true);
  });

  it("recusa um PIN errado, de outro tamanho ou vazio", () => {
    expect(pinConfere("4822", "4821")).toBe(false);
    expect(pinConfere("48210", "4821")).toBe(false);
    expect(pinConfere("", "4821")).toBe(false);
  });

  it("recusa tudo quando o PIN do servidor não foi configurado", () => {
    expect(pinConfere("", "")).toBe(false);
    expect(pinConfere("4821", "")).toBe(false);
    expect(pinConfere("", undefined)).toBe(false);
  });
});

describe("sessão do Facilitador", () => {
  it("é válida logo depois de criada", () => {
    const token = criarSessaoFacilitador(SEGREDO, AGORA);

    expect(sessaoFacilitadorValida(token, SEGREDO, AGORA)).toBe(true);
  });

  it("continua válida até 12 horas e deixa de valer depois", () => {
    const token = criarSessaoFacilitador(SEGREDO, AGORA);

    expect(
      sessaoFacilitadorValida(token, SEGREDO, new Date(AGORA.getTime() + DOZE_HORAS - 1)),
    ).toBe(true);
    expect(
      sessaoFacilitadorValida(token, SEGREDO, new Date(AGORA.getTime() + DOZE_HORAS + 1)),
    ).toBe(false);
  });

  it("recusa um token adulterado, um token de outro segredo ou ausente", () => {
    const token = criarSessaoFacilitador(SEGREDO, AGORA);
    const [expira, assinatura] = token.split(".");
    const adulterado = `${Number(expira) + 1}.${assinatura}`;

    expect(sessaoFacilitadorValida(adulterado, SEGREDO, AGORA)).toBe(false);
    expect(sessaoFacilitadorValida(token, OUTRO_SEGREDO, AGORA)).toBe(false);
    expect(sessaoFacilitadorValida(undefined, SEGREDO, AGORA)).toBe(false);
    expect(sessaoFacilitadorValida("lixo", SEGREDO, AGORA)).toBe(false);
  });
});

describe("valorDoCookie", () => {
  it("encontra o cookie pelo nome entre vários outros", () => {
    expect(
      valorDoCookie("a=1; facilitador_sessao=123.abc; b=2", "facilitador_sessao"),
    ).toBe("123.abc");
  });

  it("devolve undefined quando o cookie não existe ou não há cabeçalho", () => {
    expect(valorDoCookie("a=1", "facilitador_sessao")).toBeUndefined();
    expect(valorDoCookie(undefined, "facilitador_sessao")).toBeUndefined();
  });
});
