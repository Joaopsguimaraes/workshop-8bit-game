import { createEngine, type Engine } from "./engine";
import { applyMigrationsIfNeeded } from "./migrations";
import { createPrismaClient } from "./prisma";

// One Engine per process. The globalThis avoids opening another connection on every Next dev reload.
const KEY = "__workshopEngine";
const globalScope = globalThis as typeof globalThis & { [KEY]?: Promise<Engine> };

// DATABASE_URL is a local file or a hosted libSQL URL; DATABASE_AUTH_TOKEN is needed only for the hosted one.
export function getEngine(): Promise<Engine> {
  if (!globalScope[KEY]) {
    const url = process.env.DATABASE_URL ?? "file:./data/workshop.db";
    const authToken = process.env.DATABASE_AUTH_TOKEN;
    globalScope[KEY] = applyMigrationsIfNeeded(url, authToken).then(() =>
      createEngine(createPrismaClient(url, authToken)),
    );
  }
  return globalScope[KEY];
}
