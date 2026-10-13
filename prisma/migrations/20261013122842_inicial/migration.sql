-- CreateTable
CREATE TABLE "Jogador" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nickname" TEXT NOT NULL,
    "nicknameNormalizado" TEXT NOT NULL,
    "iniciais" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Jogador_nicknameNormalizado_key" ON "Jogador"("nicknameNormalizado");

-- CreateIndex
CREATE UNIQUE INDEX "Jogador_token_key" ON "Jogador"("token");
