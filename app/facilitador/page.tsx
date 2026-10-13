import { cookies } from "next/headers";
import { connection } from "next/server";
import { PainelFacilitador } from "@/components/facilitador/painel-facilitador";
import { TelaPinFacilitador } from "@/components/facilitador/tela-pin";
import {
  NOME_COOKIE_FACILITADOR,
  segredoDoProcesso,
  sessaoFacilitadorValida,
} from "@/lib/facilitador/sessao";

// Depende do cookie da requisição e não precisa de navegação instantânea.
export const instant = false;

// Decide no servidor entre pedir o PIN e mostrar o painel, a partir do cookie de sessão.
export default async function PaginaFacilitador() {
  // A checagem depende da hora da requisição, então a página nunca é pré-renderizada.
  await connection();
  const cookieStore = await cookies();
  const valida = sessaoFacilitadorValida(
    cookieStore.get(NOME_COOKIE_FACILITADOR)?.value,
    segredoDoProcesso(),
    new Date(),
  );

  return valida ? <PainelFacilitador /> : <TelaPinFacilitador />;
}
