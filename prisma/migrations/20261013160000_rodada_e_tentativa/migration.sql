-- CreateTable
CREATE TABLE "Rodada" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "desafioId" TEXT NOT NULL,
    "abertaEm" DATETIME NOT NULL,
    "prazo" DATETIME,
    "encerradaEm" DATETIME
);

-- CreateTable
CREATE TABLE "Tentativa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jogadorId" TEXT NOT NULL,
    "rodadaId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "nota" INTEGER NOT NULL,
    "avaliacao" TEXT NOT NULL,
    "criadaEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Tentativa_jogadorId_fkey" FOREIGN KEY ("jogadorId") REFERENCES "Jogador" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Tentativa_rodadaId_fkey" FOREIGN KEY ("rodadaId") REFERENCES "Rodada" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Tentativa_jogadorId_rodadaId_numero_key" ON "Tentativa"("jogadorId", "rodadaId", "numero");

