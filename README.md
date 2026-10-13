# Workshop de Prompts

Jogo colaborativo em tempo real, com estética MS-DOS/8-bit, para o workshop de engenharia de prompt.
Veja o contexto em `CONTEXT.md`, a spec em `.scratch/workshop-game/spec.md` e as decisões em `docs/adr/`.

## Como rodar

Pré-requisitos: Node 20.19+ (testado em 25) e pnpm.

```bash
pnpm install
cp .env.example .env     # DATABASE_URL do SQLite em arquivo
pnpm db:deploy           # aplica as migrações (use db:migrate ao criar uma nova)
pnpm dev                 # Next + Socket.IO no mesmo processo, em http://localhost:3000
```

## Scripts

| Script | O que faz |
| --- | --- |
| `pnpm dev` | Sobe Next e Socket.IO em desenvolvimento |
| `pnpm build` | Build de produção do Next |
| `pnpm start` | Sobe a versão de produção (`NODE_ENV=production`) |
| `pnpm db:migrate` | Cria uma nova migração a partir do `schema.prisma` |
| `pnpm db:deploy` | Aplica as migrações pendentes |
| `pnpm typecheck` | Gera os tipos do Next e roda `tsc` |
| `pnpm test` | Roda a suíte Vitest uma vez |

## Estrutura

- `server.ts`: servidor Node único com Next e Socket.IO (ADR-0001).
- `lib/motor/`: Motor do Jogo, a única porta para mudar o estado da Sala, com testes contra SQLite limpo por teste.
- `lib/nickname.ts`: regras de Nickname e Avatar.
- `lib/presenca.ts`: presença online só em memória, derivada das conexões de socket.
- `lib/tempo-real.ts`: casca fina do Socket.IO sobre o Motor.
- `components/`: login, área de trabalho DOS, janelas arrastáveis e Placar.
- `components/ui/8bit/`: componentes do registry 8bitcn (`pnpm dlx shadcn@latest add @8bitcn/<nome>`).
