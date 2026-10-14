# Single Node server with Socket.IO and SQLite in a file, not serverless

Status: superseded by [ADR 0004](0004-polling-over-http-with-hosted-libsql.md).

The game needs real time (live Scoreboard, Rounds opened and closed by the Facilitator), and WebSocket does not work on serverless platforms such as Vercel. So the app runs as a single Node process (Next.js with a custom server and Socket.IO), on a machine or container of its own, with Prisma over SQLite in a file. We use a file, not `:memory:`, so the match survives a restart in the middle of the workshop. The alternative would be Vercel with an external real-time service (Liveblocks, Pusher, Ably). It was rejected to avoid a paid dependency and because the game runs in a single Room, with one workshop at a time.
