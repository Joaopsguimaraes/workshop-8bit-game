"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/8bit/button";
import { textoDoEvento } from "@/lib/cliente/feed";
import { formatarTempo } from "@/lib/cliente/tempo";
import { NOME_DA_CONQUISTA } from "@/lib/motor/conquistas";
import type { EstadoDoFacilitador, Revelacao } from "@/lib/motor/motor";
import type { EntradaPlacarAoVivo, ItemDoFeed } from "@/lib/tempo-real";

// `desvioMs` é a diferença entre o relógio do servidor e o do navegador, para o cronômetro.
type EstadoAoVivo = EstadoDoFacilitador & { desvioMs: number };

const FEED_MAXIMO = 50;
const FEED_NO_TELAO = 8;

// Telão em tela cheia: Placar, Desafio atual, cronômetro, envios, feed e reveal, tudo ao vivo.
// Usa o canal do Facilitador, então a página só funciona com a sessão do PIN.
export function Telao() {
  const router = useRouter();
  const [estado, setEstado] = useState<EstadoAoVivo | null>(null);
  const [jogadores, setJogadores] = useState<EntradaPlacarAoVivo[] | null>(null);
  const [feed, setFeed] = useState<ItemDoFeed[]>([]);
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    const socket: Socket = io();

    socket.on("facilitador:estado", (dados: EstadoDoFacilitador) => {
      setEstado({ ...dados, desvioMs: Date.parse(dados.agora) - Date.now() });
    });
    socket.on("placar", (dados: { jogadores: EntradaPlacarAoVivo[] }) => {
      setJogadores(dados.jogadores);
    });
    socket.on("feed:historico", (itens: ItemDoFeed[]) => {
      setFeed(itens.slice(-FEED_MAXIMO));
    });
    socket.on("feed:evento", (item: ItemDoFeed) => {
      setFeed((atual) => [...atual, item].slice(-FEED_MAXIMO));
    });
    socket.on("facilitador:invalido", () => {
      socket.close();
      router.refresh();
    });

    const relogio = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => {
      window.clearInterval(relogio);
      socket.close();
    };
  }, [router]);

  function telaCheia() {
    document.documentElement.requestFullscreen().catch(() => undefined);
  }

  if (!estado) {
    return (
      <main className="font-pixel flex min-h-dvh items-center justify-center text-[16px] text-dos-amarelo">
        CARREGANDO...
      </main>
    );
  }

  const { rodada, revelacao } = estado;

  return (
    <main className="flex min-h-dvh flex-col gap-6 bg-dos-preto p-6">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b-4 border-dos-cinza pb-4">
        <h1 className="font-pixel text-[18px] leading-relaxed text-dos-amarelo">
          TELÃO · WORKSHOP DE PROMPTS
        </h1>
        <Button type="button" onClick={telaCheia} className="font-pixel text-[12px]">
          TELA CHEIA
        </Button>
      </header>

      <div className="grid flex-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section aria-label="Palco" className="flex min-w-0 flex-col gap-6">
          {rodada ? (
            <DesafioAoVivo
              titulo={rodada.desafio.titulo}
              cenario={rodada.desafio.cenario}
              restanteMs={
                rodada.prazo ? Date.parse(rodada.prazo) - (agora + estado.desvioMs) : null
              }
              enviaram={estado.enviaram}
              total={estado.jogadores.length}
            />
          ) : revelacao ? (
            <RevelacaoNoTelao revelacao={revelacao} />
          ) : (
            <p className="text-4xl uppercase">
              AGUARDANDO O FACILITADOR...
              <span aria-hidden="true" className="cursor-piscante">
                _
              </span>
            </p>
          )}
        </section>

        <aside className="flex min-w-0 flex-col gap-6">
          <PlacarNoTelao jogadores={jogadores} />
          <FeedNoTelao feed={feed} />
        </aside>
      </div>
    </main>
  );
}

function DesafioAoVivo({
  titulo,
  cenario,
  restanteMs,
  enviaram,
  total,
}: {
  titulo: string;
  cenario: string;
  restanteMs: number | null;
  enviaram: number;
  total: number;
}) {
  return (
    <div className="flex flex-col gap-6">
      <p className="font-pixel text-[16px] text-dos-verde">RODADA ABERTA</p>
      <h2 className="font-pixel text-[24px] leading-relaxed text-dos-branco">{titulo}</h2>
      <p className="whitespace-pre-line text-3xl text-dos-cinza">{cenario}</p>
      <div className="grid gap-6 sm:grid-cols-2">
        <Indicador
          rotulo="TEMPO"
          valor={restanteMs === null ? "--:--" : formatarTempo(restanteMs)}
          destaque
        />
        <Indicador rotulo="ENVIARAM" valor={`${enviaram}/${total}`} />
      </div>
    </div>
  );
}

function Indicador({ rotulo, valor, destaque = false }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className="flex flex-col gap-3 border-4 border-dos-cinza bg-dos-azul-escuro p-4">
      <span className="font-pixel text-[16px] text-dos-cinza">{rotulo}</span>
      <span className={`font-pixel text-[32px] ${destaque ? "text-dos-amarelo" : "text-dos-branco"}`}>
        {valor}
      </span>
    </div>
  );
}

// Reveal: o Prompt de referência e o top 3 da última Rodada, até o Facilitador abrir a próxima.
function RevelacaoNoTelao({ revelacao }: { revelacao: Revelacao }) {
  return (
    <div className="flex flex-col gap-6" aria-label="Revelação da Rodada">
      <p className="font-pixel text-[16px] text-dos-amarelo">REVELAÇÃO · {revelacao.desafio.titulo}</p>

      <section className="flex flex-col gap-3 border-4 border-dos-verde p-4">
        <h2 className="font-pixel text-[16px] text-dos-verde">PROMPT DE REFERÊNCIA</h2>
        <p className="whitespace-pre-line text-3xl text-dos-branco">
          {revelacao.desafio.promptReferencia}
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-pixel text-[16px] text-dos-amarelo">TOP 3</h2>
        {revelacao.top3.length === 0 ? (
          <p className="text-3xl uppercase">NINGUÉM PONTUOU NESTA RODADA.</p>
        ) : (
          <ol className="flex flex-col gap-6">
            {revelacao.top3.map((item) => (
              <li key={item.posicao} className="flex flex-col gap-3">
                <div className="flex items-center gap-4">
                  <Avatar iniciais={item.iniciais} tamanho="medio" />
                  <span className="flex-1 truncate text-3xl text-dos-branco">
                    {item.posicao}º {item.nickname}
                  </span>
                  <span className="font-pixel text-[16px] text-dos-amarelo">NOTA {item.nota}</span>
                </div>
                <p className="whitespace-pre-line text-2xl text-dos-cinza">{item.prompt}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function PlacarNoTelao({ jogadores }: { jogadores: EntradaPlacarAoVivo[] | null }) {
  return (
    <section aria-label="Placar" className="flex flex-col gap-4">
      <h2 className="font-pixel text-[16px] text-dos-amarelo">PLACAR</h2>
      {jogadores === null ? (
        <p className="text-3xl uppercase">CARREGANDO JOGADORES...</p>
      ) : jogadores.length === 0 ? (
        <p className="text-3xl uppercase">NENHUM JOGADOR AINDA.</p>
      ) : (
        <ol className="flex flex-col gap-3" aria-label="Jogadores no Placar">
          {jogadores.map((jogador) => (
            <li key={jogador.id} className="flex items-center gap-4 border-2 border-dos-cinza-escuro p-3">
              <span className="font-pixel w-14 text-[16px] text-dos-amarelo">{jogador.posicao}º</span>
              <Avatar iniciais={jogador.iniciais} tamanho="medio" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate text-3xl text-dos-branco">{jogador.nickname}</span>
                <span className="flex flex-wrap gap-x-4 text-xl">
                  <span className={jogador.online ? "text-dos-verde" : "text-dos-cinza-escuro"}>
                    {jogador.online ? "ONLINE" : "OFFLINE"}
                  </span>
                  {jogador.conquistas.length > 0 && (
                    <span className="text-dos-amarelo">
                      {jogador.conquistas.map((conquista) => NOME_DA_CONQUISTA[conquista.tipo]).join(" · ")}
                    </span>
                  )}
                </span>
              </div>
              <span aria-label="Pontuação" className="font-pixel text-[20px] text-dos-amarelo">
                {jogador.pontuacao}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function FeedNoTelao({ feed }: { feed: ItemDoFeed[] }) {
  return (
    <section aria-label="Feed de eventos" className="flex flex-col gap-2 border-t-4 border-dos-cinza pt-4">
      <h2 className="font-pixel text-[16px] text-dos-amarelo">EVENTOS</h2>
      {feed.length === 0 ? (
        <p className="text-2xl text-dos-cinza">SEM EVENTOS AINDA.</p>
      ) : (
        <ul className="flex flex-col gap-1 text-2xl text-dos-ciano">
          {[...feed]
            .reverse()
            .slice(0, FEED_NO_TELAO)
            .map((item) => (
              <li key={item.id}>&gt; {textoDoEvento(item.evento)}</li>
            ))}
        </ul>
      )}
    </section>
  );
}
