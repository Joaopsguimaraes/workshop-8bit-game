# Prompt Workshop

A real-time game for a prompt engineering workshop. Players write structured prompts in an MS-DOS desktop with an 8-bit look. The Facilitator runs the class in Rounds. The UI is pt-BR.

Domain terms live in `CONTEXT.md`. The product spec is `.scratch/workshop-game/spec.md`. Architecture decisions are in `docs/adr/`.

## How it works

Each Player logs in with only a Nickname and gets an Avatar from the first two letters of that name. The Facilitator opens a Challenge (for example, “write the prompt that schedules an alignment meeting”). Everyone writes in their personal window `PROMPT.EXE`, with up to 3 Attempts per Round.

Each Attempt gets a Score from 0 to 100 **without calling an LLM** (ADR-0002). The Evaluator scores the prompt text against eight structure Criteria: Papel, Contexto, Tarefa, Formato, Restrições, Exemplos, Delimitadores and Incerteza. Strength is graded: an explicit label with content scores in full, a clear natural phrase scores 70%, a weak mention scores 30%. The Player sees a checklist, excerpts the Evaluator recognized, and tips in `DICAS.TXT`.

The Scoreboard uses each Player’s best Attempt per Round. Other Players’ prompts stay hidden until the Facilitator closes the Round. Then everyone sees the Challenge’s Reference prompt and the top 3, which is the collective learning moment.

There is a single Room per instance. The match survives a server restart because state lives in SQLite on disk, not in memory (ADR-0001).

### Surfaces

| Who | Where | What |
| --- | --- | --- |
| Player | `/` | Login, then the DOS desktop: `PROMPT.EXE`, `DESAFIO.TXT`, `DICAS.TXT`, `PLACAR.EXE` |
| Facilitator | `/facilitador` | PIN, then the control panel (open/close Rounds, timer, remove Player, reset) |
| Class | `/facilitador/telao` | Big screen: Scoreboard, timer, submission count, event feed and reveal |

### Challenges

Five Challenges ship in the versioned seed `lib/challenges/seed.ts`. Edit that file before the workshop; they are not stored in the database and there is no UI to create them.

1. Advantages and disadvantages of remote work
2. Email scheduling an alignment meeting
3. Meeting summary for the next agenda
4. Extract data from a .docx contract
5. Key points of a received email

Each Challenge can be played at most once per match.

## How to run

Prerequisites: Node 20.19+ (tested on 25) and pnpm. Deploy on a single machine or container, never serverless.

```bash
pnpm install
cp .env.example .env
pnpm db:deploy           # applies the migrations (use db:migrate when creating a new one)
pnpm dev                 # Next + Socket.IO in the same process, at http://localhost:3000
```

`.env` must set:

- `DATABASE_URL` — SQLite file, for example `file:./data/workshop.db` (never `:memory:`)
- `FACILITADOR_PIN` — PIN for `/facilitador`

Open more than one browser tab to play locally: one Facilitator, one or more Players, and optionally the Big screen.

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` | Starts Next and Socket.IO in development |
| `pnpm build` | Applies pending migrations and builds Next for production |
| `pnpm start` | Starts the production version (`NODE_ENV=production`) |
| `pnpm db:migrate` | Creates a new migration from `schema.prisma` |
| `pnpm db:deploy` | Applies the pending migrations |
| `pnpm db:generate` | Regenerates the Prisma client |
| `pnpm typecheck` | Generates the Next types and runs `tsc` |
| `pnpm test` | Runs the Vitest suite once |
| `pnpm test:watch` | Runs Vitest in watch mode |
| `pnpm lint` | Runs ESLint |

## Structure

- `server.ts`: single Node server with Next and Socket.IO (ADR-0001).
- `lib/evaluator/`: deep module, pure, no I/O. `evaluate(prompt, challenge)` returns Score, verdict, Criteria and tips.
- `lib/challenges/`: Challenge catalog loaded from the seed file.
- `lib/engine/`: Game Engine, the only entry point for changing the Room’s state, with tests against a clean SQLite database per test.
- `lib/nickname.ts`: Nickname and Avatar rules.
- `lib/presence.ts`: online presence, in memory only, derived from socket connections.
- `lib/realtime.ts`: thin Socket.IO shell over the Engine.
- `lib/facilitator/`: PIN session (httpOnly cookie) for the Facilitator channel.
- `prisma/`: SQLite schema (Player, Round, Attempt, Achievement).
- `components/`: Player login, DOS desktop, draggable windows, Scoreboard, Facilitator panel and Big screen. UI copy is pt-BR.
- `components/ui/8bit/`: components from the 8bitcn registry (`pnpm dlx shadcn@latest add @8bitcn/<name>`).
- `app/`: Player home, `/facilitador`, `/facilitador/telao` and thin HTTP routes for enter/session.

Palette: black and grey terminal (Windows prompt), no blue background and no green. 8bitcn uses the `dark` class on `<html>`. Target layout is laptop or desktop.

## Testing

Automated tests cover the Evaluator (pure function) and the Game Engine (commands against a real SQLite test database), plus small units around Nickname, presence, catalog and Facilitator session. They assert observable rules, not regex or Prisma internals.

There are no automated tests for Socket.IO, the Player UI or the Facilitator/Big screen. Verify those by running the app with several tabs.

## Out of scope

No LLM calls, no comparison of an LLM answer to a target, no multiple Rooms, no Challenge editor in the UI, no Player accounts across matches, no chat, no serverless deploy, no mobile-first layout. See the spec for the full list.
