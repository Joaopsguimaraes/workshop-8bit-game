-- CreateTable
CREATE TABLE "Conquista" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jogadorId" TEXT NOT NULL,
    "rodadaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "criadaEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Conquista_jogadorId_fkey" FOREIGN KEY ("jogadorId") REFERENCES "Jogador" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Conquista_rodadaId_fkey" FOREIGN KEY ("rodadaId") REFERENCES "Rodada" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Conquista_jogadorId_rodadaId_tipo_key" ON "Conquista"("jogadorId", "rodadaId", "tipo");
