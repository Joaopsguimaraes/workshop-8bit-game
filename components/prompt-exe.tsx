"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/8bit/button";
import { formatarTempo } from "@/lib/cliente/tempo";
import type { EstadoJogadorAoVivo } from "@/lib/cliente/use-tempo-real";
import { LIMITE_DE_CARACTERES, LIMITE_DE_TENTATIVAS } from "@/lib/limites";
import type { ResultadoTentativa, Revelacao, TentativaPublica } from "@/lib/motor/motor";
import { Avatar } from "./avatar";

type Props = {
  estado: EstadoJogadorAoVivo | null;
  onEnviar: (prompt: string) => Promise<ResultadoTentativa>;
};

// Janela PROMPT.EXE. Sem Rodada aberta, mostra a espera; com Rodada, o campo de prompt.
export function PromptExe({ estado, onEnviar }: Props) {
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const rodada = estado?.rodada ?? null;
  if (!estado || !rodada) {
    if (estado?.revelacao) return <RevelacaoDaRodada revelacao={estado.revelacao} />;
    return (
      <div className="flex min-h-40 flex-col gap-3">
        <p className="uppercase">
          AGUARDANDO O FACILITADOR...
          <span aria-hidden="true" className="cursor-piscante">
            _
          </span>
        </p>
      </div>
    );
  }

  const caracteres = [...texto].length;
  const restantes = estado.tentativasRestantes;
  const restanteMs = rodada.prazo ? Date.parse(rodada.prazo) - (agora + estado.desvioMs) : null;
  const tempoEsgotado = restanteMs !== null && restanteMs <= 0;

  // Motivo que impede o envio; o servidor confere de novo, mas o Jogador vê o motivo antes.
  const motivoBloqueio =
    restantes === 0
      ? `Você já usou as ${LIMITE_DE_TENTATIVAS} Tentativas desta Rodada.`
      : tempoEsgotado
        ? "O tempo acabou."
        : caracteres > LIMITE_DE_CARACTERES
          ? `O prompt passou de ${LIMITE_DE_CARACTERES.toLocaleString("pt-BR")} caracteres.`
          : null;
  const podeEnviar = motivoBloqueio === null && texto.trim().length > 0 && !enviando;

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!podeEnviar) return;

    setErro(null);
    setEnviando(true);
    const resultado = await onEnviar(texto);
    setEnviando(false);
    if (!resultado.ok) setErro(resultado.erro);
  }

  const ultima = estado.tentativas.at(-1);

  return (
    <div className="flex flex-col gap-3">
      <p className="uppercase text-primary">
        RODADA ABERTA · TENTATIVAS RESTANTES: {restantes}/{LIMITE_DE_TENTATIVAS}
      </p>
      {restanteMs !== null && (
        <p aria-live="polite" className="uppercase">
          TEMPO: {formatarTempo(restanteMs)}
        </p>
      )}

      <form onSubmit={enviar} className="flex flex-col gap-2">
        <label htmlFor="prompt" className="sr-only">
          Seu prompt
        </label>
        <textarea
          id="prompt"
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          disabled={restantes === 0 || tempoEsgotado}
          rows={6}
          placeholder="Escreva seu prompt aqui..."
          className="w-full resize-y border-2 border-foreground bg-background p-2 text-foreground placeholder:text-muted-foreground disabled:opacity-60"
        />
        <div className="flex flex-wrap justify-between gap-2 text-lg">
          <span className={caracteres > LIMITE_DE_CARACTERES ? "text-destructive" : ""}>
            {caracteres}/{LIMITE_DE_CARACTERES}
          </span>
          {motivoBloqueio && <span className="text-destructive">{motivoBloqueio}</span>}
        </div>
        <Button type="submit" disabled={!podeEnviar} className="font-pixel text-[12px]">
          {enviando ? "ENVIANDO..." : "ENVIAR"}
        </Button>
        {erro && (
          <p role="alert" className="text-destructive">
            {erro}
          </p>
        )}
      </form>

      {ultima && <AvaliacaoDaTentativa tentativa={ultima} />}
      {estado.tentativas.length > 0 && (
        <Historico tentativas={estado.tentativas} />
      )}
    </div>
  );
}

// Reveal: o Prompt de referência e o top 3 da última Rodada, até o Facilitador abrir a próxima.
function RevelacaoDaRodada({ revelacao }: { revelacao: Revelacao }) {
  return (
    <div className="flex flex-col gap-4" aria-label="Revelação da Rodada">
      <p className="font-pixel text-[12px] text-primary">REVELAÇÃO</p>

      <section className="flex flex-col gap-2">
        <h3 className="uppercase text-primary">Prompt de referência</h3>
        <p className="whitespace-pre-line text-foreground">{revelacao.desafio.promptReferencia}</p>
      </section>

      <section className="flex flex-col gap-3 border-t-2 border-ring pt-3">
        <h3 className="uppercase text-primary">Top 3</h3>
        {revelacao.top3.length === 0 ? (
          <p className="uppercase">NINGUÉM PONTUOU NESTA RODADA.</p>
        ) : (
          <ol className="flex flex-col gap-4">
            {revelacao.top3.map((item) => (
              <li key={item.posicao} className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <Avatar iniciais={item.iniciais} />
                  <span className="flex-1 truncate">
                    {item.posicao}º {item.nickname}
                  </span>
                  <span className="text-primary">NOTA {item.nota}</span>
                </div>
                <p className="whitespace-pre-line text-muted-foreground">{item.prompt}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <p className="uppercase">AGUARDANDO O PRÓXIMO DESAFIO...</p>
    </div>
  );
}

function AvaliacaoDaTentativa({ tentativa }: { tentativa: TentativaPublica }) {
  const { avaliacao } = tentativa;
  return (
    <section aria-label="Avaliação da Tentativa" className="flex flex-col gap-2 border-t-2 border-ring pt-3">
      <p className="font-pixel text-[12px] text-primary">
        TENTATIVA {tentativa.numero} · NOTA {tentativa.nota}
      </p>
      <p>
        {avaliacao.veredito.titulo} {avaliacao.veredito.texto}
      </p>
      <ul className="flex flex-col gap-1">
        {avaliacao.criterios.map((criterio) => (
          <li key={criterio.id}>
            <span className={criterio.atendido ? "text-foreground" : "text-destructive"}>
              {criterio.atendido ? "✓" : "✕"}
            </span>{" "}
            {criterio.nome} {criterio.pontos}/{criterio.maximo}
            {criterio.atendido && criterio.trecho && (
              <span className="block text-muted-foreground">reconhecido: “{criterio.trecho}”</span>
            )}
            {!criterio.atendido && criterio.dica && (
              <span className="block text-foreground">dica: {criterio.dica}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Historico({ tentativas }: { tentativas: TentativaPublica[] }) {
  return (
    <section aria-label="Histórico das Tentativas" className="flex flex-col gap-2 border-t-2 border-ring pt-3">
      <p className="font-pixel text-[10px]">HISTÓRICO DA RODADA</p>
      <ol className="flex flex-col gap-2">
        {tentativas.map((tentativa) => (
          <li key={tentativa.numero}>
            <span className="text-primary">
              #{tentativa.numero} · NOTA {tentativa.nota}
            </span>
            <span className="block whitespace-pre-line text-muted-foreground">{tentativa.prompt}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
