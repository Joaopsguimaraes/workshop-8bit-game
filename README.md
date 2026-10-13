# Prompt Workshop

A real-time collaborative game, with an MS-DOS/8-bit look, for the prompt engineering workshop.
See the domain context in `CONTEXT.md`, the spec in `.scratch/workshop-game/spec.md` and the decisions in `docs/adr/`.

## How to run

Prerequisites: Node 20.19+ (tested on 25) and pnpm.

```bash
pnpm install
cp .env.example .env     # DATABASE_URL of the SQLite file
pnpm db:deploy           # applies the migrations (use db:migrate when creating a new one)
pnpm dev                 # Next + Socket.IO in the same process, at http://localhost:3000
```

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` | Starts Next and Socket.IO in development |
| `pnpm build` | Production build of Next |
| `pnpm start` | Starts the production version (`NODE_ENV=production`) |
| `pnpm db:migrate` | Creates a new migration from `schema.prisma` |
| `pnpm db:deploy` | Applies the pending migrations |
| `pnpm typecheck` | Generates the Next types and runs `tsc` |
| `pnpm test` | Runs the Vitest suite once |

## Structure

- `server.ts`: single Node server with Next and Socket.IO (ADR-0001).
- `lib/engine/`: Game Engine, the only entry point for changing the Room's state, with tests against a clean SQLite database per test.
- `lib/nickname.ts`: Nickname and Avatar rules.
- `lib/presence.ts`: online presence, in memory only, derived from socket connections.
- `lib/realtime.ts`: thin Socket.IO shell over the Engine.
- `components/`: login, DOS desktop, draggable windows and the Scoreboard. The UI text is pt-BR.
- `components/ui/8bit/`: components from the 8bitcn registry (`pnpm dlx shadcn@latest add @8bitcn/<name>`).
