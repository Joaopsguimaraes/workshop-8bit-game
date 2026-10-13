import type { ChallengeSummary } from "@/lib/engine/engine";

type Props = { challenge: Pick<ChallengeSummary, "title" | "scenario"> | null };

// DESAFIO.TXT window: the scenario of the open Round, or empty when there is no Round.
export function ChallengeWindow({ challenge }: Props) {
  if (!challenge) {
    return <div className="min-h-40" aria-label="Conteúdo do desafio" />;
  }

  return (
    <article aria-label="Conteúdo do desafio" className="flex min-h-40 flex-col gap-3">
      <h2 className="uppercase text-primary">{challenge.title}</h2>
      <p className="whitespace-pre-line">{challenge.scenario}</p>
    </article>
  );
}
