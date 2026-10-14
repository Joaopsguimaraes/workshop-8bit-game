import Database from "better-sqlite3";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { readMigrationsSql } from "./migrations";
import { createPrismaClient } from "./prisma";

// Each test gets a new SQLite file, with the migrations applied.
export function createTestDatabase() {
  const folder = mkdtempSync(path.join(tmpdir(), "workshop-teste-"));
  const file = path.join(folder, "teste.db");

  const connection = new Database(file);
  connection.exec(readMigrationsSql());
  connection.close();

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
