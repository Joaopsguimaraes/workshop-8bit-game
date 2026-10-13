import "dotenv/config";
import { createServer } from "node:http";
import next from "next";
import { obterMotor } from "./lib/motor/servico";
import { criarPresenca } from "./lib/presenca";
import { instalarTempoReal } from "./lib/tempo-real";

// Next e Socket.IO compartilham o mesmo processo e a mesma porta (ADR-0001).
async function iniciar() {
  const porta = Number(process.env.PORT ?? 3000);
  const hostname = process.env.HOSTNAME ?? "localhost";
  const dev = process.env.NODE_ENV !== "production";

  const httpServer = createServer();
  const app = next({ dev, hostname, port: porta, httpServer });
  const handle = app.getRequestHandler();
  await app.prepare();

  httpServer.on("request", (req, res) => {
    void handle(req, res);
  });

  instalarTempoReal({
    httpServer,
    motor: obterMotor(),
    presenca: criarPresenca(),
  });

  httpServer.listen(porta, () => {
    console.log(`> Pronto em http://${hostname}:${porta} (${dev ? "desenvolvimento" : "produção"})`);
  });
}

iniciar().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
