"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/8bit/button";
import type { EstadoJogadorAoVivo } from "@/lib/cliente/use-tempo-real";
import { LIMITE_DE_CARACTERES, LIMITE_DE_TENTATIVAS } from "@/lib/limites";
import type { ResultadoEnvio, TentativaPublica } from "@/lib/motor/motor";

type Props = {
  estado: EstadoJogadorAoVivo | null;
  onEnviar: (prompt: string) => Promise<ResultadoEnvio>;
};

function formatarTempo(ms: number): string {
  const segundos = Math.max(0, Math.ceil(ms / 1000));
  const minutos = Math.floor(segundos / 60);
  return `${String(minutos).padStart(2, "0")}:${String(segundos % 60).padStart(2, "0")}`;
}

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
      <p className="uppercase text-dos-amarelo">
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
          className="w-full resize-y border-2 border-dos-verde bg-dos-preto p-2 text-dos-verde placeholder:text-dos-cinza-escuro disabled:opacity-60"
        />
        <div className="flex flex-wrap justify-between gap-2 text-lg">
          <span className={caracteres > LIMITE_DE_CARACTERES ? "text-dos-vermelho" : ""}>
            {caracteres}/{LIMITE_DE_CARACTERES}
          </span>
          {motivoBloqueio && <span className="text-dos-vermelho">{motivoBloqueio}</span>}
        </div>
        <Button type="submit" disabled={!podeEnviar} className="font-pixel text-[12px]">
          {enviando ? "ENVIANDO..." : "ENVIAR"}
        </Button>
        {erro && (
          <p role="alert" className="text-dos-vermelho">
            {erro}
          </p>
        )}
      </form>

      {ultima && <Resultado tentativa={ultima} />}
      {estado.tentativas.length > 0 && (
        <Historico tentativas={estado.tentativas} />
      )}
    </div>
  );
}

function Resultado({ tentativa }: { tentativa: TentativaPublica }) {
  const { avaliacao } = tentativa;
  return (
    <section aria-label="Resultado da Tentativa" className="flex flex-col gap-2 border-t-2 border-dos-cinza pt-3">
      <p className="font-pixel text-[12px] text-dos-amarelo">
        TENTATIVA {tentativa.numero} · NOTA {tentativa.nota}
      </p>
      <p>
        {avaliacao.veredito.titulo} {avaliacao.veredito.texto}
      </p>
      <ul className="flex flex-col gap-1">
        {avaliacao.criterios.map((criterio) => (
          <li key={criterio.id}>
            <span className={criterio.atendido ? "text-dos-verde" : "text-dos-vermelho"}>
              {criterio.atendido ? "✓" : "✕"}
            </span>{" "}
            {criterio.nome} {criterio.pontos}/{criterio.maximo}
            {criterio.atendido && criterio.trecho && (
              <span className="block text-dos-cinza">reconhecido: “{criterio.trecho}”</span>
            )}
            {!criterio.atendido && criterio.dica && (
              <span className="block text-dos-ciano">dica: {criterio.dica}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Historico({ tentativas }: { tentativas: TentativaPublica[] }) {
  return (
    <section aria-label="Histórico das Tentativas" className="flex flex-col gap-2 border-t-2 border-dos-cinza pt-3">
      <p className="font-pixel text-[10px]">HISTÓRICO DA RODADA</p>
      <ol className="flex flex-col gap-2">
        {tentativas.map((tentativa) => (
          <li key={tentativa.numero}>
            <span className="text-dos-amarelo">
              #{tentativa.numero} · NOTA {tentativa.nota}
            </span>
            <span className="block whitespace-pre-line text-dos-cinza">{tentativa.prompt}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
