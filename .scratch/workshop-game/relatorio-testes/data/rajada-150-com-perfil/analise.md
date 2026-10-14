Profile: 61.23 s recorded, 35.24 s busy ( 57.6% of wall time)
Idle: 25.99 s   Garbage collector: 1.17 s (  1.9% of wall time)

Inclusive share (rows overlap)
| share of busy | share of wall | seconds | caller |
|---:|---:|---:|---|
|   1.3% |   0.8% | 0.46 | updateAll(): refresh after every accepted or refused Attempt |
|   0.7% |   0.4% | 0.25 |   sendScoreboard() |
|   0.4% |   0.2% | 0.14 |     engine.scoreboard() (reads all Players, Attempts, Achievements) |
|   8.7% |   5.0% | 3.06 |   sendPlayerState() (one per connected Player socket) |
|   5.9% |   3.4% | 2.07 |     engine.playerState() (per-Player reads) |
|   0.0% |   0.0% | 0.01 |   sendFacilitatorState() |
|   0.0% |   0.0% | 0.00 | engine exclusive() queue: all state-changing commands |
|   0.0% |   0.0% | 0.00 |   engine.submitAttempt() |
|   0.0% |   0.0% | 0.00 |   engine.checkDeadline() (1 s server tick) |
|  12.9% |   7.4% | 4.54 | socket.io / engine.io (encoding and writes, any caller) |
|  72.6% |  41.8% | 25.57 | Prisma / better-sqlite3 (all queries, any caller) |

Self time, top 20 (leaf frame)
| share of busy | seconds | function (file) |
|---:|---:|---|
|  29.7% | 10.48 | performIO adapter-better-sqlite3/dist/index.js |
|  13.4% | 4.73 | prepare lib/methods/wrappers.js |
|   5.5% | 1.94 | writev  |
|   4.2% | 1.47 | (anonymous) client/runtime/client.js |
|   3.3% | 1.17 | (garbage collector)  |
|   2.6% | 0.92 | toPublicAttempt lib/engine/engine.ts |
|   2.5% | 0.89 | request client/runtime/client.js |
|   1.8% | 0.62 | encodeAsString build/cjs/index.js |
|   1.6% | 0.57 | runMicrotasks  |
|   1.6% | 0.56 | Od client/runtime/client.js |
|   1.4% | 0.49 | r client/runtime/client.js |
|   1.1% | 0.40 | writevGeneric node:internal/stream_base_commons |
|   1.0% | 0.37 | nestArgument client/runtime/client.js |
|   1.0% | 0.34 | Date1 server/node-environment-extensions/date.js |
|   0.9% | 0.32 | mapQueryEngineResult client/runtime/client.js |
|   0.9% | 0.30 | snapshot client/runtime/client.js |
|   0.7% | 0.25 | ge client/runtime/client.js |
|   0.6% | 0.22 | searchKey lib/evaluator/text.ts |
|   0.6% | 0.22 | Zs client/runtime/client.js |
|   0.6% | 0.20 | debugCall debug/dist/index.js |
