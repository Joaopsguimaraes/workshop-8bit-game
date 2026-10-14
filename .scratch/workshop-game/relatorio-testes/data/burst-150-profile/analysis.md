Profile: 61.27 s recorded, 41.83 s busy ( 68.3% of wall time)
Idle: 19.44 s   Garbage collector: 1.45 s (  2.4% of wall time)

Inclusive share (rows overlap)
| share of busy | share of wall | seconds | caller |
|---:|---:|---:|---|
|   1.3% |   0.9% | 0.53 | updateAll(): refresh after every accepted or refused Attempt |
|   0.7% |   0.5% | 0.29 |   sendScoreboard() |
|   0.5% |   0.4% | 0.21 |     engine.scoreboard() (reads all Players, Attempts, Achievements) |
|   9.8% |   6.7% | 4.10 |   sendPlayerState() (one per connected Player socket) |
|   6.1% |   4.2% | 2.56 |     engine.playerState() (per-Player reads) |
|   0.1% |   0.1% | 0.03 |   sendFacilitatorState() |
|   0.0% |   0.0% | 0.00 | engine exclusive() queue: all state-changing commands |
|   0.0% |   0.0% | 0.00 |   engine.submitAttempt() |
|   0.0% |   0.0% | 0.00 |   engine.checkDeadline() (1 s server tick) |
|  14.2% |   9.7% | 5.94 | socket.io / engine.io (encoding and writes, any caller) |
|  71.3% |  48.7% | 29.84 | Prisma / better-sqlite3 (all queries, any caller) |

Self time, top 20 (leaf frame)
| share of busy | seconds | function (file) |
|---:|---:|---|
|  28.6% | 11.97 | performIO adapter-better-sqlite3/dist/index.js |
|  13.1% | 5.48 | prepare lib/methods/wrappers.js |
|   6.1% | 2.55 | writev  |
|   4.2% | 1.76 | (anonymous) client/runtime/client.js |
|   3.5% | 1.45 | (garbage collector)  |
|   2.7% | 1.14 | toPublicAttempt lib/engine/engine.ts |
|   2.6% | 1.09 | request client/runtime/client.js |
|   2.0% | 0.82 | encodeAsString build/cjs/index.js |
|   1.7% | 0.70 | Od client/runtime/client.js |
|   1.5% | 0.64 | runMicrotasks  |
|   1.5% | 0.61 | r client/runtime/client.js |
|   1.3% | 0.55 | writevGeneric node:internal/stream_base_commons |
|   1.0% | 0.42 | nestArgument client/runtime/client.js |
|   1.0% | 0.41 | Date1 server/node-environment-extensions/date.js |
|   0.8% | 0.35 | snapshot client/runtime/client.js |
|   0.8% | 0.32 | Zs client/runtime/client.js |
|   0.8% | 0.32 | mapQueryEngineResult client/runtime/client.js |
|   0.6% | 0.27 | ge client/runtime/client.js |
|   0.6% | 0.24 | searchKey lib/evaluator/text.ts |
|   0.5% | 0.22 | (anonymous) lib/evaluator/text.ts |
