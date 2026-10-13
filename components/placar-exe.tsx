import { Avatar } from "./avatar";
import type { EntradaPlacarAoVivo } from "@/lib/tempo-real";

type Props = { jogadores: EntradaPlacarAoVivo[] | null };

// Janela PLACAR.EXE: todos os Jogadores com Avatar, Nickname e status.
export function PlacarExe({ jogadores }: Props) {
  if (jogadores === null) {
    return <p className="uppercase">CARREGANDO JOGADORES...</p>;
  }

  if (jogadores.length === 0) {
    return <p className="uppercase">NENHUM JOGADOR AINDA.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {jogadores.map((jogador) => (
        <li key={jogador.id} className="flex items-center gap-3">
          <Avatar iniciais={jogador.iniciais} />
          <span className="flex-1 truncate">{jogador.nickname}</span>
          <span
            className={
              jogador.online ? "text-dos-verde" : "text-dos-cinza-escuro"
            }
          >
            {jogador.online ? "ONLINE" : "OFFLINE"}
          </span>
        </li>
      ))}
    </ul>
  );
}
