import Database from "better-sqlite3";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const MIGRATIONS_DIR = path.join(process.cwd(), "prisma", "migrations");

// Concatenates every migration.sql in folder-name order (the timestamps make that the apply order).
export function readMigrationsSql() {
  return readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .map((migrationFolder) =>
      readFileSync(path.join(MIGRATIONS_DIR, migrationFolder, "migration.sql"), "utf8"),
    )
    .join("\n");
}

// Serverless runtimes start with an empty file (e.g. /tmp), so the schema is applied on first use.
export function applyMigrationsIfNeeded(url: string) {
  if (!url.startsWith("file:")) return;

  const connection = new Database(url.slice("file:".length));
  try {
    const hasSchema = connection
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'Jogador'")
      .get();
    if (!hasSchema) connection.exec(readMigrationsSql());
  } finally {
    connection.close();
  }
}
