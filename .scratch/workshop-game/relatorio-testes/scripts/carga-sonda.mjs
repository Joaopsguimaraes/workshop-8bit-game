// Carga: N Jogadores virtuais (REST + Socket.IO, como o navegador) enviam ATT Tentativas cada, numa Rodada aberta pelo Facilitador.
// Uso: node carga.mjs <N> <ATT> <rajada|espalhado> <desafio>
import { io } from "/home/joao-victor-guimaraes/studies-projects/workshop-prompt-engineering/node_modules/socket.io-client/build/esm-debug/index.js";
const [N = "60", ATT = "3", MODO = "espalhado", DESAFIO = "trabalho-remoto"] = process.argv.slice(2);
const BASE = "http://localhost:3100";
const PIN = "4321";
const PROMPTS = [
  "Liste as vantagens e desvantagens do trabalho remoto.",
  "Papel: Você é um consultor de RH. Tarefa: liste as vantagens e desvantagens do trabalho remoto. Formato: tópicos curtos.",
  "You are an HR consultant. Task: list the advantages and disadvantages of remote work. Format: bullets.",
];
const letras = (n) => { let s = ""; for (let i = 0; i < 4; i++) { s = String.fromCharCode(97 + (n % 26)) + s; n = Math.floor(n / 26); } return s; };
const nomeDe = (i) => "Carga" + letras(i);
const pct = (arr, p) => { if (!arr.length) return null; const a = [...arr].sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor((p / 100) * a.length))]; };
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();

const RESET = process.env.RESET === "1";
// Facilitador: PIN -> cookie -> socket
const login = await fetch(`${BASE}/api/facilitator/session`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pin: PIN }) });
const cookie = login.headers.getSetCookie()[0].split(";")[0];
const fac = io(BASE, { extraHeaders: { cookie }, transports: ["websocket"], forceNew: true });
await new Promise((r, j) => { fac.on("connect", r); fac.on("facilitator:invalid", () => j(new Error("facilitador recusado"))); setTimeout(() => j(new Error("timeout fac")), 8000); });
if (RESET) await new Promise((r) => fac.emit("facilitator:resetMatch", r));

// Jogadores: entrada REST em lotes de 25
const jogadores = [];
const tEntrada = Date.now();
for (let i = 0; i < Number(N); i += 25) {
  const lote = await Promise.all(Array.from({ length: Math.min(25, Number(N) - i) }, async (_, k) => {
    const r = await fetch(`${BASE}/api/enter`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nickname: nomeDe(i + k) }) });
    const j = await r.json();
    return { nick: nomeDe(i + k), ok: r.ok, token: j.token, erro: j.error };
  }));
  jogadores.push(...lote);
}
const entradaFalhas = jogadores.filter((j) => !j.ok);
const validos = jogadores.filter((j) => j.ok);

// Conexão dos sockets dos Jogadores e contagem de broadcasts recebidos
const stats = { scoreboard: 0, playerState: 0, feed: 0, sessaoInvalida: 0 };
const conexoes = await Promise.all(validos.map((j) => new Promise((resolve) => {
  const s = io(BASE, { auth: { token: j.token }, transports: ["websocket"], forceNew: true, reconnection: false });
  s.on("scoreboard", () => stats.scoreboard++);
  s.on("player:state", () => stats.playerState++);
  s.on("feed:event", () => stats.feed++);
  s.on("session:invalid", () => stats.sessaoInvalida++);
  const t = setTimeout(() => resolve({ ...j, s, conectou: false }), 10000);
  s.on("connect", () => { clearTimeout(t); resolve({ ...j, s, conectou: true }); });
  s.on("connect_error", () => { clearTimeout(t); resolve({ ...j, s, conectou: false }); });
})));
const conectados = conexoes.filter((c) => c.conectou);
const tConexao = Date.now() - tEntrada;

// Abre a Rodada
const tAbrir = Date.now();
const abriu = await new Promise((r) => fac.emit("facilitator:openRound", { challengeId: DESAFIO }, r));
const abrirMs = Date.now() - tAbrir;
if (!abriu?.ok) { console.log(JSON.stringify({ erroAbrir: abriu })); process.exit(1); }

// Sonda: envio sem texto (o servidor responde sem tocar no banco) durante a rajada, para medir o transporte.
const sondaRtt = [];
const sondaSocket = conectados[0].s;
const sondaTimer = setInterval(() => {
  const t = Date.now();
  sondaSocket.emit("attempt:submit", 12345, () => sondaRtt.push(Date.now() - t));
}, 1000);
// Envios
const rtts = [];
const respostas = { ok: 0, recusado: 0, semResposta: 0 };
const motivos = {};
const tEnvios = Date.now();
await Promise.all(conectados.map(async (c, idx) => {
  for (let k = 0; k < Number(ATT); k++) {
    if (MODO === "espalhado") await dormir(300 + Math.random() * 1500);
    const prompt = PROMPTS[(idx + k) % PROMPTS.length];
    const t = Date.now();
    const res = await new Promise((resolve) => {
      const timer = setTimeout(() => resolve({ timeout: true }), 15000);
      c.s.emit("attempt:submit", prompt, (r) => { clearTimeout(timer); resolve(r); });
    });
    if (res?.timeout) { respostas.semResposta++; continue; }
    rtts.push(Date.now() - t);
    if (res.ok) respostas.ok++;
    else { respostas.recusado++; motivos[res.error] = (motivos[res.error] ?? 0) + 1; }
  }
}));
const tEnviosMs = Date.now() - tEnvios;
clearInterval(sondaTimer);
await dormir(200);

// Fecha a Rodada
const tFechar = Date.now();
const fechou = await new Promise((r) => fac.emit("facilitator:closeRound", r));
const fecharMs = Date.now() - tFechar;
await dormir(1500);

const resultado = {
  jogadoresSolicitados: Number(N), entradaFalhas: entradaFalhas.length, conectados: conectados.length,
  tempoEntradaEConexaoMs: tConexao, tempoAbrirRodadaMs: abrirMs,
  tentativasEnviadas: conectados.length * Number(ATT), respostas, motivos,
  latenciaAckMs: { p50: pct(rtts, 50), p95: pct(rtts, 95), p99: pct(rtts, 99), max: Math.max(...rtts) },
  tempoTotalEnviosMs: tEnviosMs, tempoFecharRodadaMs: fecharMs, rodadaFechou: fechou?.ok,
  broadcastsRecebidosNoTotal: stats,
  broadcastsPorSocket: { scoreboard: +(stats.scoreboard / conectados.length).toFixed(1), playerState: +(stats.playerState / conectados.length).toFixed(1) },
  sondaRttMs: sondaRtt,
  duracaoTotalS: Math.round((Date.now() - t0) / 1000),
};
console.log(JSON.stringify(resultado, null, 2));
for (const c of conexoes) c.s.close();
fac.close();
process.exit(0);
