import type { DesafioResumo } from "@/lib/motor/motor";

type Props = { desafio: Pick<DesafioResumo, "titulo" | "cenario"> | null };

// Janela DESAFIO.TXT: o cenário da Rodada aberta, ou vazia quando não há Rodada.
export function DesafioTxt({ desafio }: Props) {
  if (!desafio) {
    return <div className="min-h-40" aria-label="Conteúdo do desafio" />;
  }

  return (
    <article aria-label="Conteúdo do desafio" className="flex min-h-40 flex-col gap-3">
      <h2 className="uppercase text-primary">{desafio.titulo}</h2>
      <p className="whitespace-pre-line">{desafio.cenario}</p>
    </article>
  );
}
