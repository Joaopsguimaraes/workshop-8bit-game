"use client";

import { useCallback, useState } from "react";
import {
  lerPreferenciaDeSom,
  salvarPreferenciaDeSom,
  tocarEfeito,
  type Efeito,
} from "./sons";

// Liga e desliga o som, lembrando a escolha no navegador. Só toca quando estiver ligado.
export function useSom() {
  const [ligado, setLigado] = useState(lerPreferenciaDeSom);

  const alternar = useCallback(() => {
    const proximo = !ligado;
    setLigado(proximo);
    salvarPreferenciaDeSom(proximo);
    // O clique que liga o som também toca um sinal, para confirmar que o áudio funciona.
    if (proximo) tocarEfeito("enviar");
  }, [ligado]);

  const tocar = useCallback(
    (efeito: Efeito) => {
      if (ligado) tocarEfeito(efeito);
    },
    [ligado],
  );

  return { ligado, alternar, tocar };
}
