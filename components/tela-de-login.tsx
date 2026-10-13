"use client";

import { useState, type FormEvent } from "react";
import { Avatar } from "./avatar";
import { Button } from "@/components/ui/8bit/button";
import { Input } from "@/components/ui/8bit/input";
import { Label } from "@/components/ui/8bit/label";
import { iniciaisDoAvatar, validarNickname } from "@/lib/nickname";

type Props = {
  onEntrou: (dados: { token: string; jogador: { nickname: string; iniciais: string } }) => void;
};

// Login só com Nickname. O preview do Avatar acompanha a digitação.
export function TelaDeLogin({ onEntrou }: Props) {
  const [nickname, setNickname] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const iniciais = iniciaisDoAvatar(nickname);

  async function entrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);

    const validacao = validarNickname(nickname);
    if (!validacao.ok) {
      setErro(validacao.erro);
      return;
    }

    setEnviando(true);
    try {
      const resposta = await fetch("/api/entrar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nickname }),
      });
      const dados = await resposta.json();
      if (!dados.ok) {
        setErro(dados.erro);
        return;
      }
      onEntrou({ token: dados.token, jogador: dados.jogador });
    } catch {
      setErro("Não foi possível conectar. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <section
        aria-labelledby="titulo-login"
        className="flex w-full max-w-xl flex-col gap-6 border-4 border-dos-cinza bg-dos-preto p-6 text-dos-verde [box-shadow:4px_4px_0_0_#000]"
      >
        <header className="flex flex-col gap-3">
          <h1 id="titulo-login" className="font-pixel text-base leading-relaxed text-dos-amarelo">
            WORKSHOP DE PROMPTS
          </h1>
          <p className="text-2xl">
            Entre com um Nickname. Seu Avatar usa as duas primeiras letras dele, sem acento e em
            maiúsculo.
          </p>
        </header>

        <form onSubmit={entrar} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="nickname" className="font-pixel text-[10px] text-dos-cinza">
              NICKNAME
            </Label>
            <Input
              id="nickname"
              name="nickname"
              autoComplete="off"
              maxLength={40}
              placeholder="Digite seu nickname"
              value={nickname}
              onChange={(evento) => setNickname(evento.target.value)}
              aria-invalid={erro !== null}
              aria-describedby={erro ? "erro-nickname" : undefined}
              className="text-2xl"
            />
            {erro && (
              <p id="erro-nickname" role="alert" className="text-2xl text-dos-vermelho">
                {erro}
              </p>
            )}
          </div>

          <div className="flex items-center gap-4 border-2 border-dos-cinza-escuro p-3">
            <Avatar iniciais={iniciais} tamanho="grande" />
            <div className="flex flex-col gap-1">
              <span className="font-pixel text-[10px] text-dos-cinza">PREVIEW DO AVATAR</span>
              <span className="text-xl text-dos-cinza-escuro">
                Ele muda enquanto você digita.
              </span>
            </div>
          </div>

          <Button type="submit" disabled={enviando} className="font-pixel text-[12px]">
            {enviando ? "ENTRANDO..." : "ENTRAR"}
          </Button>
        </form>
      </section>
    </main>
  );
}
