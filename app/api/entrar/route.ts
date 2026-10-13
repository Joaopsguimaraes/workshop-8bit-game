import { NextResponse } from "next/server";
import { obterMotor } from "@/lib/motor/servico";

export async function POST(request: Request) {
  const corpo: unknown = await request.json().catch(() => null);
  const nickname =
    typeof corpo === "object" && corpo !== null && "nickname" in corpo
      ? String(corpo.nickname)
      : "";

  const resultado = await obterMotor().entrar(nickname);
  if (!resultado.ok) return NextResponse.json(resultado, { status: 400 });
  return NextResponse.json(resultado, { status: 201 });
}
