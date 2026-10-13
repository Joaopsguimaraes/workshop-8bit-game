import { cookies } from "next/headers";
import { NOME_COOKIE_FACILITADOR, segredoDoProcesso, sessaoFacilitadorValida } from "./sessao";

// Confere, pelo cookie desta requisição, se o Facilitador já entrou com o PIN.
// Quem chama precisa ter aguardado `connection()`, para a checagem não ser pré-renderizada.
export async function facilitadorAutenticado(): Promise<boolean> {
  const cookieStore = await cookies();
  return sessaoFacilitadorValida(
    cookieStore.get(NOME_COOKIE_FACILITADOR)?.value,
    segredoDoProcesso(),
    new Date(),
  );
}
