# 01: Confirm the cause of submission latency with a CPU profile

**What to build:** a repeatable profile of the server during a 150-Player burst, showing where the time goes when many Players submit at once. This turns the current hypothesis (per-submission work grows with the number of connected Players) into measured data before any fix is written.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] The 150-Player burst can be run with CPU profiling enabled, and the profile is saved with the test results
- [ ] The profile shows the share of time spent in the post-submission refresh, the per-Player state reads, and the engine's submission queue
- [x] Findings are written up in the report folder, with the numbers the next tickets must improve on (p50 and p95 ack latency, CPU peak)

## Comments

Done in `.scratch/workshop-game/relatorio-testes/perfil-cpu.md`. Summary:

- Baseline, 150 Players, 450 of 450 accepted: ack p50 10.0 s, p95 10.7 s, CPU peak 109% of one core.
- The per-Player state reads after each submission make up 95.8% of database queries. The submission itself takes a median of 9.4 ms on the server, and the engine queue adds 0 ms of wait.
- The second box is not fully met as written. The sampled CPU profile loses its caller after each `await`, so only 3.5% of database time has an application frame and the profile cannot split it by caller. The per-caller split comes from a labeled copy of the build instead, so the box stays open. Either the profile needs a different attribution method, or the box should be reworded to accept the labeled-query split.

## Context

Source: report `.scratch/workshop-game/relatorio-testes/index.html`, finding F1. Burst results: 30 Players ~0.7 s p50, 60 Players ~2.2 s, 150 Players ~11 s, with the server near one full core.
