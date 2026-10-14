import type { Evaluation } from "@/lib/evaluator/evaluator";
import { CRITERIA } from "@/lib/evaluator/evaluator";
import { tipsFor } from "@/lib/evaluator/tips";

type Props = { evaluation: Evaluation | null };

// DICAS.TXT window: tips for the last Attempt of the Player, and the fixed guide to a good prompt.
export function TipsWindow({ evaluation }: Props) {
  const tips = evaluation ? tipsFor(evaluation.criteria) : [];

  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Dicas deste envio" className="flex flex-col gap-2">
        <h2 className="uppercase text-primary">Dicas deste envio</h2>
        {evaluation === null ? (
          <p>Envie um prompt para receber dicas.</p>
        ) : tips.length === 0 ? (
          <p>Nenhuma dica: todos os Critérios estão completos.</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {tips.map((tip) => (
              <li key={tip.id} className="flex flex-col gap-1">
                <span className="text-foreground">
                  {tip.name}: {tip.tip}
                </span>
                {tip.reference.url ? (
                  <a
                    href={tip.reference.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    {tip.reference.label}
                  </a>
                ) : (
                  <span className="text-muted-foreground">{tip.reference.label}</span>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-label="Guia de um bom prompt" className="flex flex-col gap-2 border-t-2 border-ring pt-3">
        <h2 className="uppercase text-primary">Guia de um bom prompt</h2>
        <ul className="flex flex-col gap-2">
          {CRITERIA.map((criterion) => (
            <li key={criterion.id}>
              <span className="text-primary">{criterion.name}:</span> {criterion.guide}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
