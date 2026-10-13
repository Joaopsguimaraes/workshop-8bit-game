"use client";

import { useCallback, useEffect, useState } from "react";
import { AreaDeTrabalho } from "./area-de-trabalho";
import { TelaDeLogin } from "./tela-de-login";
import { Button } from "@/components/ui/8bit/button";
import { limparToken, lerToken, salvarToken } from "@/lib/cliente/sessao";

type Sessao = { token: string; nickname: string; iniciais: string };

type Estado =
  | { tipo: "carregando" }
  | { tipo: "login" }
  | { tipo: "erro" }
  | { tipo: "area"; sessao: Sessao };

// Erro de rede ou do servidor: o token continua salvo, só a verificação falhou.
class FalhaTransitoria extends Error {}

// Decide a tela: retoma o Jogador salvo no navegador ou mostra o login.
export function Jogo() {
  const [estado, setEstado] = useState<Estado>({ tipo: "carregando" });
  const [tentativa, setTentativa] = useState(0);

  const voltarParaLogin = useCallback(() => {
    limparToken();
    setEstado({ tipo: "login" });
  }, []);

  useEffect(() => {
    const token = lerToken();
    if (!token) {
      // O localStorage só existe no cliente, então a decisão só pode sair depois do mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEstado({ tipo: "login" });
      return;
    }

    let cancelado = false;
    fetch("/api/sessao", { headers: { authorization: `Bearer ${token}` } })
      .then(async (resposta) => {
        if (resposta.status === 401) {
          // Só um token que o servidor recusou volta para o login.
          if (!cancelado) voltarParaLogin();
          return;
        }
        if (!resposta.ok) throw new FalhaTransitoria();

        const dados = await resposta.json().catch(() => {
          throw new FalhaTransitoria();
        });
        if (cancelado) return;
        setEstado({
          tipo: "area",
          sessao: {
            token,
            nickname: dados.jogador.nickname,
            iniciais: dados.jogador.iniciais,
          },
        });
      })
      .catch(() => {
        if (!cancelado) setEstado({ tipo: "erro" });
      });

    return () => {
      cancelado = true;
    };
  }, [voltarParaLogin, tentativa]);

  if (estado.tipo === "carregando") {
    return (
      <main className="font-pixel flex min-h-dvh items-center justify-center text-[12px] text-dos-amarelo">
        CARREGANDO...
      </main>
    );
  }

  if (estado.tipo === "erro") {
    return (
      <main className="flex min-h-dvh items-center justify-center p-4">
        <section className="flex max-w-xl flex-col gap-6 border-4 border-dos-cinza bg-dos-preto p-6 text-dos-verde">
          <p className="text-2xl">Não foi possível conectar. Sua sessão continua salva.</p>
          <Button
            type="button"
            className="font-pixel text-[12px]"
            onClick={() => {
              setEstado({ tipo: "carregando" });
              setTentativa((atual) => atual + 1);
            }}
          >
            TENTAR DE NOVO
          </Button>
        </section>
      </main>
    );
  }

  if (estado.tipo === "login") {
    return (
      <TelaDeLogin
        onEntrou={({ token, jogador }) => {
          salvarToken(token);
          setEstado({
            tipo: "area",
            sessao: { token, nickname: jogador.nickname, iniciais: jogador.iniciais },
          });
        }}
      />
    );
  }

  return (
    <AreaDeTrabalho
      key={estado.sessao.token}
      token={estado.sessao.token}
      nickname={estado.sessao.nickname}
      iniciais={estado.sessao.iniciais}
      onSessaoInvalida={voltarParaLogin}
    />
  );
}
