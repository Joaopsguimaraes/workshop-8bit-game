import { createClient } from "@libsql/client";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { readMigrationsSql } from "./migrations";
import { createPrismaClient } from "./prisma";

// Each test gets a new SQLite file, with the migrations applied.
export async function createTestDatabase() {
  const folder = mkdtempSync(path.join(tmpdir(), "workshop-teste-"));
  const file = path.join(folder, "teste.db");

  const client = createClient({ url: `file:${file}` });
  await client.executeMultiple(readMigrationsSql());
  client.close();

  const prisma = createPrismaClient(`file:${file}`);

  return {
    prisma,
    url: `file:${file}`,
    async close() {
      await prisma.$disconnect();
      rmSync(folder, { recursive: true, force: true });
    },
  };
}
