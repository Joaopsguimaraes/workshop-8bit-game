"use client";

import { useEffect, useState } from "react";
import { Avatar } from "./avatar";
import { DesafioTxt } from "./desafio-txt";
import { Janela } from "./janela";
import { PlacarExe } from "./placar-exe";
import { PromptExe } from "./prompt-exe";
import {
  carregarJanelas,
  salvarJanelas,
  type EstadoJanela,
  type EstadoJanelas,
  type IdJanela,
} from "@/lib/cliente/janelas";
import { useTempoReal } from "@/lib/cliente/use-tempo-real";

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
  const { jogadores } = useTempoReal({ token, onSessaoInvalida });

  useEffect(() => {
    salvarJanelas(janelas);
  }, [janelas]);

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
      <header className="flex items-center justify-between bg-dos-cinza-escuro px-4 py-2 text-dos-branco">
        <span className="font-pixel text-[10px]">C:\WORKSHOP&gt; EXECUTAR</span>
        <span className="flex items-center gap-3">
          <Avatar iniciais={iniciais} />
          <span className="text-2xl">{nickname}</span>
        </span>
      </header>

      <main className="relative min-h-[620px] flex-1 overflow-hidden">
        {idsJanelas.map((id) => {
          const conteudo =
            id === "prompt" ? <PromptExe /> : id === "desafio" ? <DesafioTxt /> : (
              <PlacarExe jogadores={jogadores} />
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

      <nav
        aria-label="Barra de tarefas"
        className="flex flex-wrap gap-2 bg-dos-cinza px-3 py-2"
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
                "font-pixel border-2 border-dos-preto px-3 py-2 text-[10px] " +
                (minimizada
                  ? "bg-dos-cinza text-dos-preto"
                  : "bg-dos-preto text-dos-verde")
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
