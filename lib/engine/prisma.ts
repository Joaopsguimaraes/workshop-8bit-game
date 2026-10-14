import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../../generated/prisma/client";

// `url` is a local file (`file:./data/workshop.db`) or a hosted libSQL database (`libsql://...`, e.g. Turso).
export function createPrismaClient(url: string, authToken?: string) {
  return new PrismaClient({ adapter: new PrismaLibSql({ url, authToken }) });
}
