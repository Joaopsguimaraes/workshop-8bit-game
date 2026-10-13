import { connection } from "next/server";
import { PainelFacilitador } from "@/components/facilitador/painel-facilitador";
import { TelaPinFacilitador } from "@/components/facilitador/tela-pin";
import { facilitadorAutenticado } from "@/lib/facilitador/guarda";

// Depende do cookie da requisição e não precisa de navegação instantânea.
export const instant = false;

// Decide no servidor entre pedir o PIN e mostrar o painel, a partir do cookie de sessão.
export default async function PaginaFacilitador() {
  // A checagem depende da hora da requisição, então a página nunca é pré-renderizada.
  await connection();
  return (await facilitadorAutenticado()) ? <PainelFacilitador /> : <TelaPinFacilitador />;
}
