import "dotenv/config";
import { createServer } from "node:http";
import next from "next";
import { getEngine } from "./lib/engine/service";
import { createPresence } from "./lib/presence";
import { installRealtime } from "./lib/realtime";

// Next and Socket.IO share the same process and the same port (ADR-0001).
async function start() {
  const port = Number(process.env.PORT ?? 3000);
  const hostname = process.env.HOSTNAME ?? "localhost";
  const dev = process.env.NODE_ENV !== "production";

  const httpServer = createServer();
  const app = next({ dev, hostname, port, httpServer });
  const handle = app.getRequestHandler();
  await app.prepare();

  httpServer.on("request", (req, res) => {
    void handle(req, res);
  });

  installRealtime({
    httpServer,
    engine: getEngine(),
    presence: createPresence(),
  });

  httpServer.listen(port, () => {
    console.log(`> Pronto em http://${hostname}:${port} (${dev ? "desenvolvimento" : "produção"})`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
