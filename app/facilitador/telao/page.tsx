import { connection } from "next/server";
import { Telao } from "@/components/facilitador/telao";
import { TelaPinFacilitador } from "@/components/facilitador/tela-pin";
import { facilitadorAutenticado } from "@/lib/facilitador/guarda";

// O Telão é só para o Facilitador: sem a sessão, a página pede o PIN como o painel.
export const instant = false;

export default async function PaginaTelao() {
  await connection();
  return (await facilitadorAutenticado()) ? <Telao /> : <TelaPinFacilitador />;
}
