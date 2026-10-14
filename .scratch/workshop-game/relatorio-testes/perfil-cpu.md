# CPU profile of the 150-Player burst (issue 01)

Confirms or refines finding F1 in `index.html` (answer time grows with connected Players). Measured on the production build of commit `081c866`, on this machine, with the scripts in `scripts/`.

## Result in one paragraph

The cause of the slow acks is the refresh that runs after every submission, and it is confirmed as the dominant cost. 95.8% of the 212,514 database queries in the burst come from the per-Player state reads (`sendPlayerState`, 3 queries each, 67,850 calls for 450 Attempts). The submission itself is cheap: on the server, from the moment the `attempt:submit` handler starts to the moment the ack is sent, the median is 9.4 ms (p95 16.8 ms). The engine's `exclusive()` queue adds no measurable wait (0 ms at p50, p95 and max). The mechanism is that the event loop stays busy with earlier submissions' refresh work, so even a probe that does no database work waits 0.6 to 13.7 s for its reply. This refines F1: the fix is to stop the refresh work from occupying the event loop, not to speed up the submission or the queue.

## Numbers the next tickets must improve on

150 Players, each sends 3 Attempts at once (`scripts/run-burst.sh rajada 150`), 450 of 450 accepted in every run.

| Run | Ack p50 | Ack p95 | CPU peak (% of one core) | Bytes written by server |
|---|---:|---:|---:|---:|
| Baseline, no profiler (`data/rajada-150-sem-perfil/`) | 10.0 s | 10.7 s | 109% | 2.3 GB |
| With `--cpu-prof` (`data/rajada-150-com-perfil/`) | 10.4 s | 10.9 s | 109% | 2.3 GB |
| Instrumented copy, see below (`data/rajada-150-instrumentado/`) | 10.6 s | 11.5 s | 110% | 2.3 GB |
| Same burst plus one probe per second (`data/rajada-150-sonda/`) | 11.7 s | 14.0 s | 118% | 2.5 GB |

The profiler adds about 3% to the p50. Runs differ by about 5%, so treat each number as ±0.5 s. The probe run adds one extra refresh per second, which explains its higher numbers.

Use the baseline row as the reference for issues 02 to 05.

## What the CPU profile shows

Source: `data/rajada-150-com-perfil/profile.cpuprofile`, summarized by `scripts/analisar-perfil.mjs` into `data/rajada-150-com-perfil/analise.md`.

- The server is busy for 35.2 s of the 61 s profile, which is the whole burst window. Idle is 26 s and garbage collection is 1.2 s (1.9% of wall time).
- Prisma and better-sqlite3 account for 72.6% of busy time. Socket.IO encoding and writes account for 12.9%.
- Leaf functions: `performIO` in the Prisma adapter 29.7%, `prepare` 13.4%, `writev` 5.5%, Prisma client internals and the garbage collector make up most of the rest. `toPublicAttempt` (JSON parsing of each Attempt, called from every per-Player read) is 2.6%.

**Caveat on caller attribution.** The sampled stacks lose their caller after each `await`. Only 3.5% of database samples have any application frame in their stack, so the profile cannot, by itself, split the database time between the refresh, the submission and the queue. The rows in `analise.md` that name `sendPlayerState` and `engine.playerState` are therefore lower bounds (3.1 s and 2.1 s of busy time). The per-caller split below comes from query labels instead.

## Where the database work comes from

Measured with a throwaway copy of the repo (the patch is `scripts/medicao-instrumentada.patch`). It labels each Prisma query by the caller, using `AsyncLocalStorage`, and records the event-loop delay and the handler times. Nothing was committed to the app.

| Caller | Queries | Share |
|---|---:|---:|
| `refresh:player-state` (per-Player reads after each submission) | 203,550 | 95.8% |
| `submit` (the Attempt itself) | 3,201 | 1.5% |
| `refresh:scoreboard` | 1,808 | 0.9% |
| `refresh:facilitator` | 1,809 | 0.9% |
| untagged (connection-time reads) | 2,117 | 1.0% |
| `tick` (1 s deadline check) | 29 | 0.0% |

Time measures from the same run:

- `attempt:submit` handler, from entry to ack: p50 9.4 ms, p95 16.8 ms, max 29.8 ms.
- `updateAll()` per call: p50 62.7 ms, p95 76.8 ms, 452 calls, 29.3 s in total.
- Engine `exclusive()` queue wait: p50 0, p95 0, max 0 ms (481 tasks).
- Event-loop delay on the server: p50 5.1 ms, p95 6.2 ms, max 11.7 s.
- Load generator's own event-loop delay: p50 5.1 ms, p95 11.7 ms, max 346 ms. It is not the bottleneck.

## Why the acks take 10 s

The submission takes about 10 ms on the server, but the client waits about 10.6 s for the ack. The probe shows the wait is not in the submission code:

- The probe sends `attempt:submit` with a number instead of a prompt. The server answers at once with a refusal, with no database work.
- Across 37 probes during the burst, round trips range from 0.57 s to 13.7 s. The replies come back in batches about 12 s apart, so responses to probes sent at different times arrive together.
- The batch pattern matches the long server event-loop stall (max 11.7 s) and the ack spread, so the delay is in the server's event loop and outgoing path.

I have not pinned down the exact stall, and that is the next thing to check. The most likely reading, given the numbers above: each submission triggers a refresh that runs as one long chain of promises without yielding to I/O, so incoming messages and outgoing replies wait until the chain finishes. This is a hypothesis, not a measurement.

## What this means for the next issues

- **Issue 02** (refresh only the submitter): removes about 96% of the queries. It should also remove most of the event-loop stall, because the 150 per-Player reads per submission are the bulk of the refresh.
- **Issue 03** (coalesce broadcasts): the scoreboard is still sent to all 150 sockets on every change, and the burst wrote 2.3 GB, so the outgoing volume needs its own check after 02.
- **Issue 04** (pending feedback) is still needed for the UX, because the stall stays in the event loop until the refresh work is reduced.

## Limits

- One run per configuration, so the spread across runs is an estimate.
- The per-caller query split comes from the instrumented copy; the CPU profile is the unmodified build.
- The profile does not split the database time by caller (see the caveat above).
- The probe adds one refresh per second, so its numbers are a little higher than the baseline.
- The burst is the scenario from `relatorio-testes/index.html`: a single Round, all 150 Players submitting at once, three Attempts each.

## Reproduce

```bash
cd .scratch/workshop-game/relatorio-testes
pnpm exec next build                                     # from the repo root, first
bash scripts/run-burst.sh rajada 150 profile   <work-dir> data/rajada-150-com-perfil
bash scripts/run-burst.sh rajada 150 no-profile <work-dir> data/rajada-150-sem-perfil
node scripts/analisar-perfil.mjs data/rajada-150-com-perfil/profile.cpuprofile
```

`scripts/run-burst.sh` uses a fresh SQLite file in `<work-dir>`, so the workshop database in `data/workshop.db` is not touched. `scripts/stop-on-sigint.mjs` makes SIGINT exit cleanly, which writes the profile. `scripts/amostrar.sh` samples the server every second: CPU, memory, and bytes written.
