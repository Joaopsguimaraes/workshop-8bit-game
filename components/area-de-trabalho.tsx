"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "./avatar";
import { DesafioTxt } from "./desafio-txt";
import { Janela } from "./janela";
import { LevelUp } from "./level-up";
import { PlacarExe } from "./placar-exe";
import { PromptExe } from "./prompt-exe";
import {
  carregarJanelas,
  salvarJanelas,
  type EstadoJanela,
  type EstadoJanelas,
  type IdJanela,
} from "@/lib/cliente/janelas";
import { useSom } from "@/lib/cliente/use-som";
import { useTempoReal, type Progresso } from "@/lib/cliente/use-tempo-real";

type Props = {
  nickname: string;
  iniciais: string;
  token: string;
  onSessaoInvalida: () => void;
};

const TITULOS: Record<IdJanela, string> = {
  prompt: "PROMPT.EXE",
  desafio: "DESAFIO.TXT",
  placar: "PLACAR.EXE",
};

const LARGURAS: Record<IdJanela, number> = {
  prompt: 560,
  desafio: 340,
  placar: 360,
};

const ORDEM_INICIAL: IdJanela[] = ["desafio", "placar", "prompt"];

// Área de trabalho MS-DOS: três janelas arrastáveis, minimizáveis e salvas no navegador.
export function AreaDeTrabalho({ nickname, iniciais, token, onSessaoInvalida }: Props) {
  const [janelas, setJanelas] = useState<EstadoJanelas>(carregarJanelas);
  const [ordem, setOrdem] = useState<IdJanela[]>(ORDEM_INICIAL);
  const [levelUp, setLevelUp] = useState<{ id: number; motivo: string } | null>(null);
  const proximoLevelUp = useRef(0);
  const { ligado, alternar: alternarSom, tocar } = useSom();

  const aoProgresso = useCallback(
    (progresso: Progresso) => {
      if (progresso === "posicao") tocar("subir");
      proximoLevelUp.current += 1;
      setLevelUp({
        id: proximoLevelUp.current,
        motivo: progresso === "nota" ? "NOTA MELHOROU!" : "SUBIU NO PLACAR!",
      });
    },
    [tocar],
  );
  const fimDoLevelUp = useCallback(() => setLevelUp(null), []);

  const { jogadores, estado, feed, enviarTentativa } = useTempoReal({
    token,
    onSessaoInvalida,
    onProgresso: aoProgresso,
  });

  useEffect(() => {
    salvarJanelas(janelas);
  }, [janelas]);

  // Efeitos de envio: um som ao enviar e outro quando a Nota chega.
  async function enviarComSom(prompt: string) {
    tocar("enviar");
    const resultado = await enviarTentativa(prompt);
    if (resultado.ok) tocar("nota");
    return resultado;
  }

  function alterarJanela(id: IdJanela, mudanca: Partial<EstadoJanela>) {
    setJanelas((atual) => ({ ...atual, [id]: { ...atual[id], ...mudanca } }));
  }

  function focar(id: IdJanela) {
    setOrdem((atual) => [...atual.filter((item) => item !== id), id]);
  }

  function alternarMinimizada(id: IdJanela) {
    const minimizada = !janelas[id].minimizada;
    alterarJanela(id, { minimizada });
    if (!minimizada) focar(id);
  }

  const idsJanelas = Object.keys(TITULOS) as IdJanela[];

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between bg-muted-foreground px-4 py-2 text-foreground">
        <span className="font-pixel text-[10px]">C:\WORKSHOP&gt; EXECUTAR</span>
        <span className="flex items-center gap-3">
          <button
            type="button"
            aria-pressed={ligado}
            onClick={alternarSom}
            className="font-pixel border-2 border-foreground px-2 py-1 text-[10px] text-foreground hover:bg-accent"
          >
            SOM: {ligado ? "LIGADO" : "DESLIGADO"}
          </button>
          <Avatar iniciais={iniciais} />
          <span className="text-2xl">{nickname}</span>
        </span>
      </header>

      <main className="relative min-h-[620px] flex-1 overflow-hidden">
        {idsJanelas.map((id) => {
          const conteudo =
            id === "prompt" ? (
              <PromptExe estado={estado} onEnviar={enviarComSom} />
            ) : id === "desafio" ? (
              <DesafioTxt desafio={estado?.rodada?.desafio ?? null} />
            ) : (
              <PlacarExe jogadores={jogadores} feed={feed} meuId={estado?.jogador.id ?? null} />
            );
          return (
            <Janela
              key={id}
              titulo={TITULOS[id]}
              estado={janelas[id]}
              largura={LARGURAS[id]}
              emFrente={ordem[ordem.length - 1] === id}
              onMover={(x, y) => alterarJanela(id, { x, y })}
              onFocar={() => focar(id)}
              onMinimizar={() => alternarMinimizada(id)}
            >
              {conteudo}
            </Janela>
          );
        })}
      </main>

      {levelUp && <LevelUp key={levelUp.id} motivo={levelUp.motivo} onFim={fimDoLevelUp} />}

      <nav
        aria-label="Barra de tarefas"
        className="flex flex-wrap gap-2 bg-foreground px-3 py-2"
      >
        {idsJanelas.map((id) => {
          const minimizada = janelas[id].minimizada;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={!minimizada}
              onClick={() => alternarMinimizada(id)}
              className={
                "font-pixel border-2 border-background px-3 py-2 text-[10px] " +
                (minimizada
                  ? "bg-foreground text-background"
                  : "bg-background text-foreground")
              }
            >
              {TITULOS[id]}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
