import { NextResponse } from "next/server";
import { obterMotor } from "@/lib/motor/servico";

export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";

  const resultado = await obterMotor().estadoDoJogador(token);
  if (!resultado.ok) return NextResponse.json(resultado, { status: 401 });
  return NextResponse.json(resultado);
}
