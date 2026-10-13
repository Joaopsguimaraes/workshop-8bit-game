import { createEngine, type Engine } from "./engine";
import { createPrismaClient } from "./prisma";

// One Engine per process. The globalThis avoids opening another connection on every Next dev reload.
const KEY = "__workshopEngine";
const globalScope = globalThis as typeof globalThis & { [KEY]?: Engine };

export function getEngine(): Engine {
  if (!globalScope[KEY]) {
    const url = process.env.DATABASE_URL ?? "file:./data/workshop.db";
    globalScope[KEY] = createEngine(createPrismaClient(url));
  }
  return globalScope[KEY];
}
