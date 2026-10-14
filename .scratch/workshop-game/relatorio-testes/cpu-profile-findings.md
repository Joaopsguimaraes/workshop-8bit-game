# CPU profile of the 150-Player burst (issue 01)

Confirms or refines finding F1 in `index.html` (answer time grows with connected Players). Measured on the production build of commit `081c866`, on this machine, with the scripts in `scripts/`.

## Result in one paragraph

The slow acks come from the refresh that runs after every submission. 95.8% of the 212,507 database queries in the burst are per-Player state reads (`sendPlayerState`, about 3 queries per call: 203,550 queries, roughly 67,850 calls for 450 Attempts). The submission itself is cheap: on the server, from the moment the `attempt:submit` handler starts to the moment the ack is sent, the median is 10.4 ms (p95 18.4 ms). The engine's `exclusive()` queue adds no measurable wait (0 ms at p50 and p95, 0.6 ms at max). The client still waits 11 to 13 s for the ack, and a probe that does no submission work waits 0.6 to 13.7 s. So the event loop is busy with earlier submissions' refresh work, and that is where the wait sits. This refines F1: the fix is to stop the refresh work from occupying the event loop, not to speed up the submission or the queue.

## Numbers the next tickets must improve on

150 Players, each sends 3 Attempts at once (`scripts/run-burst.sh burst 150`), 450 of 450 accepted in every run.

| Run | Ack p50 | Ack p95 | CPU peak (% of one core) | Bytes written by server |
|---|---:|---:|---:|---:|
| Baseline, no profiler (`data/burst-150-no-profile/`) | 11.0 s | 12.0 s | 113% | 2.3 GB |
| Baseline, repeated (`data/burst-150-no-profile-repeat/`) | 12.3 s | 14.0 s | 113% | 2.3 GB |
| With `--cpu-prof` (`data/burst-150-profile/`) | 11.8 s | 13.6 s | 113% | 2.3 GB |
| Instrumented copy (`data/burst-150-instrumented/`) | 12.8 s | 14.2 s | 114% | 2.3 GB |
| Same burst plus one probe per second (`data/burst-150-probe/`) | 11.4 s | 14.1 s | 114% | 2.5 GB |

**The spread is large.** The two identical baseline runs differ by 1.3 s at p50, and the same baseline gave 10.0 s in an earlier session on this machine. The profiler's effect (+0.8 s at p50 here) is inside that spread, so do not read it as overhead. Use the two baseline rows together as the reference for issues 02 to 05: p50 about 11 to 12 s, p95 about 12 to 14 s, CPU peak about 113%.

## What the CPU profile shows

Source: `data/burst-150-profile/profile.cpuprofile`, summarized by `scripts/analyze-profile.mjs` into `data/burst-150-profile/analysis.md`.

- The server is busy for 41.8 s of the 61.3 s profile, which covers the burst. Idle is 19.4 s and garbage collection is 1.5 s (2.4% of wall time).
- Prisma and better-sqlite3 account for 71.3% of busy time. Socket.IO encoding and writes account for 14.2%.
- Leaf functions: `performIO` in the Prisma adapter 28.6%, `prepare` 13.1%, `writev` 6.1%. `toPublicAttempt` (JSON parsing of each Attempt, called from every per-Player read) is 2.7%.
- Inclusive, `sendPlayerState()` is 9.8% of busy time (4.1 s) and `engine.playerState()` is 6.1% (2.6 s).

**Caveat on caller attribution.** The sampled stacks lose their caller after each `await`. Only 3.6% of database samples have any application frame in their stack, so the profile cannot, by itself, split the database time between the refresh, the submission and the queue. The `sendPlayerState` and `engine.playerState` rows are therefore lower bounds, and `updateAll()` and `exclusive()` show almost nothing for the same reason. The per-caller split below comes from query labels instead.

## Where the database work comes from

Measured with a throwaway copy of the repo (the patch is `scripts/instrumentation.patch`). It labels each Prisma query by the caller, using `AsyncLocalStorage`, and records the handler times, the queue wait and the event-loop delay. Nothing was committed to the app.

| Caller | Queries | Share |
|---|---:|---:|
| `refresh:player-state` (per-Player reads after each submission) | 203,550 | 95.8% |
| `submit` (the Attempt itself) | 3,201 | 1.5% |
| `refresh:scoreboard` | 1,808 | 0.9% |
| `refresh:facilitator` | 1,809 | 0.9% |
| `untagged` (connection-time reads) | 2,117 | 1.0% |
| `tick` (1 s deadline check) | 22 | 0.0% |

Time measures from the same run:

- `attempt:submit` handler, from entry to ack: p50 10.4 ms, p95 18.4 ms, max 30.3 ms.
- `updateAll()` per call: p50 77.8 ms, p95 92.8 ms, 452 calls, 35.8 s in total.
- Engine `exclusive()` queue wait: p50 0, p95 0, max 0.6 ms (474 tasks).
- Event-loop delay on the server: p50 5.1 ms, p95 5.2 ms, max 14.8 s.
- Load generator's own event-loop delay: p50 5.1 ms, p95 14.1 ms, max 287 ms. It is not the bottleneck.

## Why the acks take 10 s or more

The submission takes about 10 ms on the server, but the client waits 11 to 13 s for the ack. The probe shows the wait is not in the submission code:

- The probe sends `attempt:submit` with a number instead of a prompt. The server replies at once with a refusal and does no submission work. The handler still calls `updateAll()` after `respond()` (`lib/realtime.ts`), even for refused submissions, so each probe adds about one refresh. The reply is sent before that refresh starts, so the delay the probe measures comes from earlier refreshes, not from its own.
- Across 37 probes during the burst, round trips range from 0.57 s to 13.7 s. The replies come back in batches about 12 s apart, so responses to probes sent at different times arrive together.
- The batches match the long server event-loop stall (max 14.8 s) and the ack spread, so the delay is in the server's event loop and outgoing path.

I have not pinned down the exact stall, and that is the next thing to check. The most likely reading, given the numbers above: each submission triggers a refresh that runs as one long chain of promises without yielding to I/O, so incoming messages and outgoing replies wait until the chain finishes. This is a hypothesis, not a measurement.

## What this means for the next issues

- **Issue 02** (refresh only the submitter): removes about 96% of the queries. It should also remove most of the event-loop stall, because the 150 per-Player reads per submission are the bulk of the refresh.
- **Issue 03** (coalesce broadcasts): the scoreboard is still sent to all 150 sockets on every change, and the burst wrote 2.3 GB, so the outgoing volume needs its own check after 02.
- **Issue 04** (pending feedback) is still needed for the UX, because the stall stays in the event loop until the refresh work is reduced.

## Limits

- One run per configuration, except the baseline, which ran twice. The spread is about 1.3 s at p50.
- The per-caller query split comes from the instrumented copy; the CPU profile is the unmodified build.
- The profile does not split the database time by caller (see the caveat above).
- The probe adds one refresh per second, so its numbers are a little higher than the baseline.
- The burst is the scenario from `relatorio-testes/index.html`: a single Round, all 150 Players submitting at once, three Attempts each.

## Reproduce

Run from the repo root, with a scratch directory outside the repo as `<work-dir>` (each run deletes and recreates it).

```bash
pnpm exec next build                                                             # first
bash .scratch/workshop-game/relatorio-testes/scripts/run-burst.sh burst 150 profile    <work-dir> <out-dir>
bash .scratch/workshop-game/relatorio-testes/scripts/run-burst.sh burst 150 no-profile <work-dir> <out-dir>
PROBE=1 bash .scratch/workshop-game/relatorio-testes/scripts/run-burst.sh burst 150 no-profile <work-dir> <out-dir>
node .scratch/workshop-game/relatorio-testes/scripts/analyze-profile.mjs <out-dir>/profile.cpuprofile
```

`run-burst.sh` uses a fresh SQLite file in `<work-dir>`, so the workshop database in `data/workshop.db` is not touched. `scripts/stop-on-sigint.mjs` makes SIGINT exit cleanly, which writes the profile. `scripts/sample-server.sh` samples the server every second: CPU, memory, and bytes written. `scripts/burst-load-probe.mjs` is the load generator; it needs the repo's `node_modules`. `REPO_UNDER_TEST` and `INSTRUMENTATION_FILE` drive the instrumented copy described in `scripts/instrumentation.patch`.
