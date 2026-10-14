# One Node process serves Next and Socket.IO on the same port (docs/adr/0001-single-node-server-with-sqlite.md).
# The SQLite file lives in /app/data, which must be a persistent volume so the match survives restarts.
FROM node:24-slim

# better-sqlite3 compiles a native addon and Prisma needs OpenSSL to detect its engine.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable

WORKDIR /app

COPY . .

RUN pnpm install --frozen-lockfile \
  && mkdir -p /app/data \
  && DATABASE_URL="file:/app/data/build.db" pnpm build \
  && rm -f /app/data/build.db

ENV NODE_ENV=production \
  PORT=3000 \
  HOSTNAME=0.0.0.0 \
  DATABASE_URL=file:/app/data/workshop.db

VOLUME ["/app/data"]
EXPOSE 3000

CMD ["pnpm", "start"]
