import { Avatar } from "./avatar";
import { eventText } from "@/lib/client/feed";
import { ACHIEVEMENT_NAMES } from "@/lib/engine/achievements";
import { ATTEMPT_LIMIT } from "@/lib/limits";
import type { FeedItem } from "@/lib/engine/engine";
import type { LiveScoreboardEntry } from "@/lib/live";

type Props = {
  players: LiveScoreboardEntry[] | null;
  feed: FeedItem[];
  myId: string | null;
};

const FEED_ON_SCREEN = 12;

// PLACAR.EXE window: Players with status and Achievements, and the live event feed.
export function ScoreboardWindow({ players, feed, myId }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {players === null ? (
        <p className="uppercase">CARREGANDO JOGADORES...</p>
      ) : players.length === 0 ? (
        <p className="uppercase">NENHUM JOGADOR AINDA.</p>
      ) : (
        <ol className="flex flex-col gap-2" aria-label="Jogadores no Placar">
          {players.map((player) => (
            <ScoreboardRow key={player.id} player={player} mine={player.id === myId} />
          ))}
        </ol>
      )}

      <section aria-label="Feed de eventos" className="flex flex-col gap-1 border-t-2 border-ring pt-3">
        <p className="font-pixel text-[10px]">EVENTOS</p>
        {feed.length === 0 ? (
          <p className="text-muted-foreground">SEM EVENTOS AINDA.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-lg">
            {[...feed]
              .reverse()
              .slice(0, FEED_ON_SCREEN)
              .map((item) => (
                <li key={item.id} className="text-foreground">
                  &gt; {eventText(item.event)}
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ScoreboardRow({ player, mine }: { player: LiveScoreboardEntry; mine: boolean }) {
  return (
    <li
      className={`flex flex-col gap-1 border-2 p-2 ${mine ? "border-foreground" : "border-transparent"}`}
    >
      <div className="flex items-center gap-3">
        <span className="font-pixel w-8 text-[10px] text-primary">{player.position}º</span>
        <Avatar initials={player.initials} />
        <span className="flex-1 truncate">{player.nickname}</span>
        <span aria-label="Pontuação" className="text-primary">
          {player.points}
        </span>
      </div>
      <div className="flex flex-wrap gap-x-4 text-base">
        <span className={player.online ? "text-foreground" : "text-muted-foreground"}>
          {player.online ? "ONLINE" : "OFFLINE"}
        </span>
        {player.sentInRound && <span className="text-foreground">ENVIOU</span>}
        <span>
          TENT. {player.attemptsInRound}/{ATTEMPT_LIMIT}
        </span>
        {player.achievements.length > 0 && (
          <span className="text-primary">
            {player.achievements.map((achievement) => ACHIEVEMENT_NAMES[achievement.type]).join(" · ")}
          </span>
        )}
      </div>
    </li>
  );
}
