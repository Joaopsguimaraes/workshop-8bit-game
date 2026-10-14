import { createClient } from "@libsql/client";
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

// Serverless runtimes start with an empty database, so the schema is applied on first use.
// Works for a local file and for a hosted libSQL database alike.
export async function applyMigrationsIfNeeded(url: string, authToken?: string) {
  const client = createClient({ url, authToken });
  try {
    const existing = await client.execute(
      "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'Jogador'",
    );
    if (existing.rows.length === 0) await client.executeMultiple(readMigrationsSql());
  } finally {
    client.close();
  }
}
