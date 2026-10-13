import { NextResponse } from "next/server";
import {
  criarSessaoFacilitador,
  NOME_COOKIE_FACILITADOR,
  pinConfere,
  segredoDoProcesso,
} from "@/lib/facilitador/sessao";

const DOZE_HORAS_EM_SEGUNDOS = 12 * 60 * 60;

// Confere o PIN e emite o cookie httpOnly que o socket do Facilitador valida.
export async function POST(request: Request) {
  const corpo: unknown = await request.json().catch(() => null);
  const pin =
    typeof corpo === "object" && corpo !== null && "pin" in corpo ? String(corpo.pin) : "";

  const esperado = process.env.FACILITADOR_PIN;
  if (!esperado) {
    return NextResponse.json(
      { ok: false, erro: "O PIN do Facilitador não está configurado no servidor." },
      { status: 503 },
    );
  }
  if (!pinConfere(pin, esperado)) {
    return NextResponse.json({ ok: false, erro: "PIN incorreto." }, { status: 401 });
  }

  const resposta = NextResponse.json({ ok: true }, { status: 201 });
  resposta.cookies.set(
    NOME_COOKIE_FACILITADOR,
    criarSessaoFacilitador(segredoDoProcesso(), new Date()),
    { httpOnly: true, sameSite: "lax", path: "/", maxAge: DOZE_HORAS_EM_SEGUNDOS },
  );
  return resposta;
}
