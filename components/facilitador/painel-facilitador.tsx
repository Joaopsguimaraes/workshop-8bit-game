"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/8bit/button";
import { Input } from "@/components/ui/8bit/input";
import { Label } from "@/components/ui/8bit/label";
import type { EstadoDoFacilitador } from "@/lib/motor/motor";

type Resposta = { ok: boolean; erro?: string };

// Painel de controle do Facilitador: abre e encerra Rodadas, remove Jogadores e reinicia a Sala.
export function PainelFacilitador() {
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const [estado, setEstado] = useState<EstadoDoFacilitador | null>(null);
  const [minutos, setMinutos] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [confirmandoReset, setConfirmandoReset] = useState(false);

  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    socket.on("facilitador:estado", (dados: EstadoDoFacilitador) => {
      setEstado(dados);
    });
    socket.on("facilitador:invalido", () => {
      socket.close();
      router.refresh();
    });

    return () => {
      socketRef.current = null;
      socket.close();
    };
  }, [router]);

  function abrirRodada(desafioId: string) {
    const texto = minutos.trim();
    const minutosNumero = Number(texto);
    if (texto !== "" && (!Number.isInteger(minutosNumero) || minutosNumero < 1)) {
      setErro("O cronômetro precisa ser um número inteiro de minutos, ou ficar em branco.");
      return;
    }

    const duracaoSegundos = texto === "" ? undefined : minutosNumero * 60;
    socketRef.current?.emit(
      "facilitador:abrirRodada",
      { desafioId, duracaoSegundos },
      (resposta: Resposta) => setErro(resposta.ok ? null : (resposta.erro ?? null)),
    );
  }

  function encerrarRodada() {
    socketRef.current?.emit("facilitador:encerrarRodada", (resposta: Resposta) =>
      setErro(resposta.ok ? null : (resposta.erro ?? null)),
    );
  }

  function removerJogador(jogadorId: string) {
    socketRef.current?.emit(
      "facilitador:removerJogador",
      { jogadorId },
      (resposta: Resposta) => setErro(resposta.ok ? null : (resposta.erro ?? null)),
    );
  }

  function resetarPartida() {
    socketRef.current?.emit("facilitador:resetarPartida", (resposta: Resposta) => {
      setErro(resposta.ok ? null : (resposta.erro ?? null));
      if (resposta.ok) setConfirmandoReset(false);
    });
  }

  if (!estado) {
    return (
      <main className="font-pixel flex min-h-dvh items-center justify-center text-[12px] text-dos-amarelo">
        CARREGANDO...
      </main>
    );
  }

  const { rodada, enviaram, desafios, jogadores } = estado;

  return (
    <main className="flex min-h-dvh flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <span className="font-pixel text-[12px] text-dos-amarelo">FACILITADOR</span>
        <Link
          href="/facilitador/telao"
          target="_blank"
          rel="noreferrer"
          className="font-pixel border-2 border-dos-branco px-3 py-2 text-[10px] text-dos-branco hover:bg-dos-azul"
        >
          ABRIR TELÃO
        </Link>
      </header>

      <section
        aria-label="Rodada atual"
        className="flex flex-col gap-3 border-4 border-dos-cinza bg-dos-preto p-4 text-2xl text-dos-verde"
      >
        {rodada ? (
          <>
            <p className="uppercase">RODADA ABERTA: {rodada.desafio.titulo}</p>
            <p>
              {enviaram} {enviaram === 1 ? "jogador já enviou" : "jogadores já enviaram"}
            </p>
            <Button type="button" onClick={encerrarRodada} className="font-pixel w-fit text-[12px]">
              ENCERRAR RODADA
            </Button>
          </>
        ) : (
          <p className="uppercase">NENHUMA RODADA ABERTA.</p>
        )}
      </section>

      <div className="flex max-w-sm flex-col gap-2">
        <Label htmlFor="minutos" className="font-pixel text-[10px] text-dos-cinza">
          CRONÔMETRO EM MINUTOS (OPCIONAL)
        </Label>
        <Input
          id="minutos"
          type="number"
          min={1}
          inputMode="numeric"
          placeholder="Sem cronômetro"
          value={minutos}
          onChange={(evento) => setMinutos(evento.target.value)}
        />
      </div>

      {erro && (
        <p role="alert" className="text-2xl text-dos-vermelho">
          {erro}
        </p>
      )}

      <section aria-label="Desafios" className="flex flex-col gap-3">
        <h2 className="font-pixel text-[12px] text-dos-amarelo">DESAFIOS</h2>
        <ul className="flex flex-col gap-3">
          {desafios.map((desafio) => (
            <li
              key={desafio.id}
              className="flex flex-wrap items-center gap-3 border-2 border-dos-cinza bg-dos-preto p-3 text-2xl text-dos-verde"
            >
              <span className="flex-1">
                {desafio.ordem}. {desafio.titulo}
              </span>
              <span className={desafio.jogado ? "text-dos-cinza-escuro" : "text-dos-ciano"}>
                {desafio.jogado ? "JOGADO" : "DISPONÍVEL"}
              </span>
              <Button
                type="button"
                disabled={desafio.jogado || rodada !== null}
                onClick={() => abrirRodada(desafio.id)}
                className="font-pixel text-[10px]"
              >
                ABRIR RODADA
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Jogadores" className="flex flex-col gap-3">
        <h2 className="font-pixel text-[12px] text-dos-amarelo">JOGADORES</h2>
        {jogadores.length === 0 ? (
          <p className="text-2xl text-dos-cinza">NENHUM JOGADOR AINDA.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {jogadores.map((jogador) => (
              <li
                key={jogador.id}
                className="flex flex-wrap items-center gap-3 border-2 border-dos-cinza bg-dos-preto p-3 text-2xl text-dos-verde"
              >
                <Avatar iniciais={jogador.iniciais} />
                <span className="flex-1 truncate">{jogador.nickname}</span>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => removerJogador(jogador.id)}
                  aria-label={`Remover ${jogador.nickname}`}
                  className="font-pixel text-[10px]"
                >
                  REMOVER
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        aria-label="Reiniciar a Sala"
        className="flex flex-col gap-3 border-2 border-dos-vermelho bg-dos-preto p-4 text-2xl text-dos-verde"
      >
        <h2 className="font-pixel text-[12px] text-dos-vermelho">REINICIAR A SALA</h2>
        {confirmandoReset ? (
          <>
            <p>
              Isso apaga todos os Jogadores, Rodadas, Tentativas e Conquistas. Todos voltam ao login
              e os Desafios podem ser jogados de novo. Não tem volta.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="destructive"
                onClick={resetarPartida}
                className="font-pixel text-[10px]"
              >
                SIM, APAGAR TUDO
              </Button>
              <Button
                type="button"
                onClick={() => setConfirmandoReset(false)}
                className="font-pixel text-[10px]"
              >
                CANCELAR
              </Button>
            </div>
          </>
        ) : (
          <Button
            type="button"
            variant="destructive"
            onClick={() => setConfirmandoReset(true)}
            className="font-pixel w-fit text-[10px]"
          >
            RESETAR PARTIDA
          </Button>
        )}
      </section>
    </main>
  );
}
