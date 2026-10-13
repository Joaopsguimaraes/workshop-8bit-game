import Database from "better-sqlite3";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { criarPrisma } from "./prisma";

const PASTA_MIGRACOES = path.join(process.cwd(), "prisma", "migrations");

// Cada teste ganha um arquivo SQLite novo, com as migrações aplicadas.
export function criarBancoDeTeste() {
  const pasta = mkdtempSync(path.join(tmpdir(), "workshop-teste-"));
  const arquivo = path.join(pasta, "teste.db");

  const sql = readdirSync(PASTA_MIGRACOES, { withFileTypes: true })
    .filter((entrada) => entrada.isDirectory())
    .map((entrada) => entrada.name)
    .sort()
    .map((pastaMigracao) =>
      readFileSync(path.join(PASTA_MIGRACOES, pastaMigracao, "migration.sql"), "utf8"),
    )
    .join("\n");

  const conexao = new Database(arquivo);
  conexao.exec(sql);
  conexao.close();

  const prisma = criarPrisma(`file:${arquivo}`);

  return {
    prisma,
    url: `file:${arquivo}`,
    async fechar() {
      await prisma.$disconnect();
      rmSync(pasta, { recursive: true, force: true });
    },
  };
}
