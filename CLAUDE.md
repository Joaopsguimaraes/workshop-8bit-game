## Language

- Code is in English: identifiers, types, functions, files and folders, comments, test titles, socket event names, internal API routes, and Prisma model and field names (mapped with `@map`/`@@map` to the existing SQLite tables and columns).
- Documentation is in English: `CONTEXT.md`, the specs and issues under `.scratch/`, `docs/`, and `README.md`.
- User-facing text stays in pt-BR: UI copy, error messages shown to players, the live feed, verdicts, criterion display names, and the pt-BR words the evaluator recognizes in prompts.
- Public page routes stay as they are (`/facilitador`, `/facilitador/telao`), because the facilitator types them.
- Domain terms in code and docs follow `CONTEXT.md` (Player, Challenge, Round, Attempt, Score, Scoreboard, Achievement, Facilitator, Big screen, Room). Do not reintroduce Portuguese names in code.

## Agent skills

### Issue tracker

Local markdown: issues live as files under `.scratch/<feature>/` in this repo. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
