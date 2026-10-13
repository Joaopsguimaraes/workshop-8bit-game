import { Avatar } from "./avatar";
import { textoDoEvento } from "@/lib/cliente/feed";
import { NOME_DA_CONQUISTA } from "@/lib/motor/conquistas";
import { LIMITE_DE_TENTATIVAS } from "@/lib/limites";
import type { EntradaPlacarAoVivo, ItemDoFeed } from "@/lib/tempo-real";

type Props = {
  jogadores: EntradaPlacarAoVivo[] | null;
  feed: ItemDoFeed[];
  meuId: string | null;
};

const FEED_NA_TELA = 12;

// Janela PLACAR.EXE: Jogadores com status e Conquistas, e o feed de eventos ao vivo.
export function PlacarExe({ jogadores, feed, meuId }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {jogadores === null ? (
        <p className="uppercase">CARREGANDO JOGADORES...</p>
      ) : jogadores.length === 0 ? (
        <p className="uppercase">NENHUM JOGADOR AINDA.</p>
      ) : (
        <ol className="flex flex-col gap-2" aria-label="Jogadores no Placar">
          {jogadores.map((jogador) => (
            <LinhaDoPlacar key={jogador.id} jogador={jogador} meu={jogador.id === meuId} />
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
              .slice(0, FEED_NA_TELA)
              .map((item) => (
                <li key={item.id} className="text-foreground">
                  &gt; {textoDoEvento(item.evento)}
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function LinhaDoPlacar({ jogador, meu }: { jogador: EntradaPlacarAoVivo; meu: boolean }) {
  return (
    <li
      className={`flex flex-col gap-1 border-2 p-2 ${meu ? "border-foreground" : "border-transparent"}`}
    >
      <div className="flex items-center gap-3">
        <span className="font-pixel w-8 text-[10px] text-primary">{jogador.posicao}º</span>
        <Avatar iniciais={jogador.iniciais} />
        <span className="flex-1 truncate">{jogador.nickname}</span>
        <span aria-label="Pontuação" className="text-primary">
          {jogador.pontuacao}
        </span>
      </div>
      <div className="flex flex-wrap gap-x-4 text-base">
        <span className={jogador.online ? "text-foreground" : "text-muted-foreground"}>
          {jogador.online ? "ONLINE" : "OFFLINE"}
        </span>
        {jogador.enviouNaRodada && <span className="text-foreground">ENVIOU</span>}
        <span>
          TENT. {jogador.tentativasNaRodada}/{LIMITE_DE_TENTATIVAS}
        </span>
        {jogador.conquistas.length > 0 && (
          <span className="text-primary">
            {jogador.conquistas.map((conquista) => NOME_DA_CONQUISTA[conquista.tipo]).join(" · ")}
          </span>
        )}
      </div>
    </li>
  );
}
