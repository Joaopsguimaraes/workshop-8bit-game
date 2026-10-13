import Database from "better-sqlite3";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createPrismaClient } from "./prisma";

const MIGRATIONS_DIR = path.join(process.cwd(), "prisma", "migrations");

// Each test gets a new SQLite file, with the migrations applied.
export function createTestDatabase() {
  const folder = mkdtempSync(path.join(tmpdir(), "workshop-teste-"));
  const file = path.join(folder, "teste.db");

  const sql = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .map((migrationFolder) =>
      readFileSync(path.join(MIGRATIONS_DIR, migrationFolder, "migration.sql"), "utf8"),
    )
    .join("\n");

  const connection = new Database(file);
  connection.exec(sql);
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
