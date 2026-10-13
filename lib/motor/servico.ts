import { criarMotor, type Motor } from "./motor";
import { criarPrisma } from "./prisma";

// Um Motor por processo. O globalThis evita abrir outra conexão a cada recarga do Next em dev.
const CHAVE = "__workshopMotor";
const global_ = globalThis as typeof globalThis & { [CHAVE]?: Motor };

export function obterMotor(): Motor {
  if (!global_[CHAVE]) {
    const url = process.env.DATABASE_URL ?? "file:./data/workshop.db";
    global_[CHAVE] = criarMotor(criarPrisma(url));
  }
  return global_[CHAVE];
}
