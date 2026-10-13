import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../../generated/prisma/client";

export function criarPrisma(url: string) {
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
}
