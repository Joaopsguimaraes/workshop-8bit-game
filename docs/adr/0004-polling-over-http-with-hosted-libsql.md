# Poll the server over HTTP, with a hosted libSQL database instead of a Socket.IO process

The screens (Player, Facilitator panel and Big screen) read the Room's state with a short poll every 1.5–2 seconds, and commands go through ordinary POST routes. The database is a libSQL database: a local file in development, and a hosted Turso database in production. The custom Node server with Socket.IO goes away, so the app runs on Vercel, as the team requires. This supersedes [ADR 0001](0001-single-node-server-with-sqlite.md).

Both parts of ADR 0001 stop holding on serverless. WebSocket needs a long-lived process, and in-memory state (presence, the feed, the event listeners) is not shared between instances, so the Socket.IO design cannot run on Vercel. A SQLite file does not work there either: each instance would see its own copy. Moving the state into the database, which every instance reads, fixes both.

## Considered Options

- **Keep Socket.IO on a separate Node host** (ADR 0001): works, but the team needs the app on Vercel. Rejected by the requirement, not by the design.
- **External real-time service** (Ably, Pusher, Liveblocks): keeps push updates, but adds a paid dependency and rewrites the realtime layer around its channels. Rejected to keep the game free of paid services, as ADR 0001 already decided.
- **Poll the server over HTTP** (chosen): no new service, no connection to keep alive, and any serverless instance can answer. The cost is latency of up to one poll interval and one request per screen every interval.
- **SQLite in a file on Vercel**: not shared between instances and lost on redeploy. Rejected.
- **Hosted libSQL (Turso)** (chosen for the database): it keeps the SQLite dialect, so the schema and the migrations stay the same, and the Prisma adapter for libSQL works both with a local file and with the hosted database.

## Consequences

- The feed (`EventoFeed`) and the online presence (`Jogador.ultimoAcesso`, online within 10 seconds) live in the database. Every poll reads the last 30 events and the list of online Players.
- The Scoreboard reads every Attempt of the Room, so each instance caches it for one second. That keeps the number of reads close to one per second per instance, not one per poll.
- Each poll also closes the Round if its deadline has passed. Nobody needs to click for a Round to close on time.
- Commands and state changes are still serialized per instance. Across several instances, two simultaneous submissions from the same Player can race past the attempt limit. For a workshop, with one Facilitator and one Room at a time, this is accepted.
- Migrations are applied on the first request, only when the schema is missing. A later migration does not apply itself to a database that already has the schema; it needs a deploy script or a manual `pnpm db:deploy` against the hosted URL.
- Cost: each connected screen makes one request per poll. With 150 Players polling every 2 seconds, that is about 75 requests per second, and Turso bills rows read, so the Scoreboard cache matters. Those numbers were not measured under load in this change.
