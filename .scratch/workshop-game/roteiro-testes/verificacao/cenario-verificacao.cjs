/* eslint-disable @typescript-eslint/no-require-imports */
// Cenário de verificação com vários Jogadores (Joao, Lucas, Pedro, Maria) contra o servidor real.
// As Notas esperadas foram calculadas à mão pelos critérios da spec, sem chamar o Avaliador.
// Ordem dos pontos: [Papel 15, Contexto 20, Tarefa 20, Formato 20, Restrições 15, Exemplos 10].
const fs = require("node:fs");
const APP = process.env.APP_DIR;
const BASE = process.env.BASE_URL;
const PIN = process.env.PIN;
const SAIDA = process.env.SAIDA;
const { io } = require(require.resolve("socket.io-client", { paths: [APP] }));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const resultados = [];
let falhas = 0;

function verificar(grupo, nome, obtido, esperado) {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  resultados.push({ grupo, nome, ok, obtido, esperado });
  const detalhe = ok ? "" : `\n      obtido:   ${JSON.stringify(obtido)}\n      esperado: ${JSON.stringify(esperado)}`;
  console.log(`${ok ? "PASS" : "FAIL"} [${grupo}] ${nome}${detalhe}`);
}

async function post(caminho, corpo, cabecalhos = {}) {
  const r = await fetch(BASE + caminho, {
    method: "POST",
    headers: { "content-type": "application/json", ...cabecalhos },
    body: JSON.stringify(corpo),
  });
  return { status: r.status, json: await r.json().catch(() => null), cookie: r.headers.get("set-cookie") };
}

// ---------- Prompts (texto exato digitado pelos Jogadores) ----------
const P = {
  pedro1: "Escreva um texto sobre home office.",
  maria1r1: "Papel: x. Contexto: x. Tarefa: x. Formato: x. Restrições: x. Exemplo: x.",
  joao1r1: "Liste as vantagens e desvantagens do trabalho remoto.",
  lucas1r1:
    "Papel: Você é um consultor de RH experiente. Contexto: Estamos decidindo o modelo de trabalho. Tarefa: liste as vantagens e desvantagens do trabalho remoto.",
  pedro2r1: "Liste as vantagens e as desvantagens do trabalho remoto em tópicos.",
  lucas2r1:
    "Papel: Você é um consultor de RH experiente. Contexto: Estamos decidindo o modelo de trabalho. Tarefa: liste as vantagens e desvantagens do trabalho remoto. Formato: lista com 2 títulos, no máximo 5 itens cada. Restrições: não use jargão técnico.",
  joao2r1:
    "Papel: Você é um consultor de gestão de pessoas com experiência em modelos de trabalho. Contexto: Estamos decidindo se mantemos o trabalho remoto. O público é a diretoria. Tarefa: Liste as vantagens e as desvantagens do trabalho remoto para a empresa e para as pessoas. Formato: Duas listas com títulos, com no máximo 5 itens cada. Restrições: Evite opiniões pessoais e jargão técnico. Exemplo: Vantagem: economia com aluguel, por exemplo, com deslocamento.",
  maria2r1:
    "You are an experienced HR consultant. Context: we are deciding on remote work. Task: list the advantages and disadvantages of remote work. Format: two bulleted lists with short items. Don't use technical jargon in the answer. For example, a bullet: pro, lower rent.",
  pedro3r1: "Liste as vantagens e desvantagens do trabalho remoto.",

  maria1r2: "Escreva um e-mail para a equipe marcando uma reunião de alinhamento com data e participantes.",
  pedro1r2: "Escreva um texto curto.",
  joao1r2: "Escreva um e-mail sobre a reunião.",
  lucas1r2: "Escreva um e-mail marcando uma reunião de alinhamento.",
  maria2r2:
    "Papel: Você é uma assistente de comunicação de projetos. Contexto: Precisamos alinhar o escopo da entrega. Tarefa: Escreva um e-mail marcando uma reunião de alinhamento com data e participantes. Formato: Assunto na primeira linha e corpo em tópicos curtos. Restrições: Não invente datas e evite tom informal. Exemplo: Assunto: Alinhamento, por exemplo, reunião na terça às 14h.",
  pedro2r2: "Escreva um e-mail marcando uma reunião de alinhamento.",
  lucas2r2:
    "Papel: Você é um coordenador de projetos. Tarefa: escreva um e-mail marcando uma reunião de alinhamento com data e participantes.",
  joao2r2: "Escreva um e-mail para o time marcando uma reunião de alinhamento com data e participantes.",
  lucas3r2:
    "Escreva um e-mail marcando uma reunião de alinhamento com data, horário e participantes, em no máximo 80 palavras.",

  pedro1r3: "Resuma as anotações da reunião em decisões, pendências e responsáveis, e transforme em pauta.",
  maria1r3:
    "Atue como um secretário de reuniões. Contexto: as anotações abaixo são de uma reunião de projeto. Formato: lista com três títulos, Decisões, Pendências e Pauta, com no máximo 5 itens.",
  lucas1r3: "Escreva um resumo da reunião.",
  joao1r3: "Crie um resumo das anotações.",

  lucas1r4: "Extraia dados do contrato em JSON.",
  joao1r4:
    "Papel: Você é um analista de dados. Contexto: O documento é um contrato em .docx da empresa. Tarefa: Extraia os campos contratante, contratado, valor, vigência e multa do contrato. Formato: JSON com as chaves contratante, contratado, valor, vigência e multa. Restrições: Não invente dados nem valores.",

  pedro1r5: "Extraia os pontos-chave, as perguntas e o prazo do e-mail do cliente, em tópicos.",
};

// Trechos únicos de cada prompt, para checar vazamento nos canais públicos.
const TRECHO_UNICO = {
  joao2r1: "Estamos decidindo se mantemos o trabalho remoto",
  maria2r1: "You are an experienced HR consultant",
  lucas2r1: "lista com 2 títulos, no máximo 5 itens cada",
  pedro2r1: "vantagens e as desvantagens",
  maria1r3: "Atue como um secretário de reuniões",
  joao1r4: "Extraia os campos contratante",
};

async function main() {
  // ---------- Facilitador: PIN e sessão ----------
  const pinErrado = await post("/api/facilitator/session", { pin: "0000" });
  verificar("Facilitador", "PIN incorreto é recusado (401)", pinErrado.status, 401);
  verificar("Facilitador", "PIN incorreto mostra \"PIN incorreto.\"", pinErrado.json?.error, "PIN incorreto.");
  const pinOk = await post("/api/facilitator/session", { pin: PIN });
  verificar("Facilitador", "PIN correto emite sessão (201)", pinOk.status, 201);
  const cookie = pinOk.cookie.split(";")[0];

  const facilSemCookie = io(BASE, { transports: ["websocket"], reconnection: false });
  const recusouSemCookie = await new Promise((r) => {
    facilSemCookie.on("facilitator:invalid", () => r(true));
    setTimeout(() => r(false), 3000);
  });
  verificar("Facilitador", "Canal do Facilitador sem sessão é recusado", recusouSemCookie, true);
  facilSemCookie.close();

  const facil = io(BASE, { transports: ["websocket"], reconnection: false, extraHeaders: { cookie } });
  const feed = [];
  const placarPayloads = [];
  let placarAtual = null;
  let estadoFacil = null;
  facil.onAny((evento, ...args) => {
    if (evento === "scoreboard") {
      placarAtual = args[0].players;
      placarPayloads.push(JSON.stringify(args[0]));
    }
    if (evento === "facilitator:state") estadoFacil = args[0];
    // O reveal (round-closed) traz prompts de propósito; o resto do feed não pode trazer.
    if (evento === "feed:event") {
      feed.push(args[0]);
      if (args[0].event.type !== "round-closed") placarPayloads.push(JSON.stringify(args[0]));
    }
    if (evento === "feed:history") feed.splice(0, feed.length, ...args[0]);
  });
  await sleep(600);
  verificar("Facilitador", "Canal do Facilitador com sessão recebe o estado", estadoFacil !== null, true);
  verificar("Facilitador", "Desafios listados em ordem (5 Desafios)", estadoFacil.challenges.map((d) => d.id), [
    "trabalho-remoto", "reuniao-alinhamento", "resumo-reuniao", "contrato-json", "pontos-do-email",
  ]);
  verificar("Facilitador", "Nenhum Desafio jogado no início", estadoFacil.challenges.map((d) => d.played), [false, false, false, false, false]);

  // ---------- Nickname: regras, unicidade e Avatar ----------
  const G = "Nickname";
  verificar(G, "\"A\" é curto demais", (await post("/api/enter", { nickname: "A" })).json?.error, "O Nickname precisa ter pelo menos 2 caracteres.");
  verificar(G, "Nome de 30 caracteres é longo demais", (await post("/api/enter", { nickname: "Maria Silva Pereira Costa Lima" })).json?.error, "O Nickname pode ter no máximo 16 caracteres.");
  verificar(G, "\"Ana@\" tem caractere inválido", (await post("/api/enter", { nickname: "Ana@" })).json?.error, "Use apenas letras, números e espaços.");
  verificar(G, "Só espaços conta como curto demais", (await post("/api/enter", { nickname: "   " })).json?.error, "O Nickname precisa ter pelo menos 2 caracteres.");

  const jogadores = {};
  const entradas = {};
  for (const nome of ["Joao", "Lucas", "Pedro", "Maria"]) {
    const r = await post("/api/enter", { nickname: nome });
    entradas[nome] = r;
    jogadores[nome] = { token: r.json?.token, id: r.json?.player?.id, socket: null, recebido: [], estado: null, minhas: [] };
    verificar(G, `${nome} entra com Nickname (201)`, r.status, 201);
  }
  verificar("Avatar", "Avatar de Joao = JO", entradas.Joao.json.player.initials, "JO");
  verificar("Avatar", "Avatar de Maria = MA", entradas.Maria.json.player.initials, "MA");

  verificar(G, "\"JOÃO\" é o mesmo Nickname de \"Joao\" (em uso)", (await post("/api/enter", { nickname: "JOÃO" })).json?.error, "Nickname já em uso");
  const elio = await post("/api/enter", { nickname: "Élio" });
  verificar("Avatar", "\"Élio\" vira avatar EL", elio.json?.player?.initials, "EL");
  verificar(G, "\"ÉLIO\" conflita com \"Élio\"", (await post("/api/enter", { nickname: "ÉLIO" })).json?.error, "Nickname já em uso");
  const removeElio = await new Promise((r) => facil.emit("facilitator:removePlayer", { playerId: elio.json.player.id }, r));
  verificar(G, "Facilitador remove \"Élio\" (teste de moderação)", removeElio.ok, true);
  await sleep(200);
  const elioDeNovo = await post("/api/enter", { nickname: "elio" });
  verificar(G, "Remover libera o Nickname: \"elio\" entra de novo (201)", elioDeNovo.status, 201);
  await new Promise((r) => facil.emit("facilitator:removePlayer", { playerId: elioDeNovo.json.player.id }, r));
  await sleep(200);
  verificar(G, "Placar tem só os 4 Jogadores depois de remover o Élio de teste", placarAtual.map((j) => j.nickname).sort(), ["Joao", "Lucas", "Maria", "Pedro"]);

  // Conecta os quatro Jogadores (um socket por Jogador, com o token dele)
  for (const nome of Object.keys(jogadores)) {
    const j = jogadores[nome];
    j.socket = io(BASE, { auth: { token: j.token }, transports: ["websocket"], reconnection: false });
    j.socket.onAny((evento, ...args) => {
      j.recebido.push(evento + " " + JSON.stringify(args));
      if (evento === "player:state") j.estado = args[0];
    });
  }
  await sleep(800);
  verificar("Sessão", "Jogador retoma pelo token ao conectar", jogadores.Joao.estado?.player?.nickname, "Joao");
  verificar("Sessão", "Sem Rodada, a Janela mostra espera (rodada = null)", jogadores.Joao.estado?.round, null);

  // ---------- Helpers de jogo ----------
  async function enviar(nome, prompt) {
    const j = jogadores[nome];
    const r = await new Promise((resolver) => {
      const limite = setTimeout(() => resolver({ ok: false, error: "TIMEOUT" }), 5000);
      j.socket.emit("attempt:submit", prompt, (res) => { clearTimeout(limite); resolver(res); });
    });
    await sleep(120);
    if (r.ok) j.minhas.push(prompt);
    return r;
  }

  async function checarTentativa(grupo, rotulo, nome, prompt, esperado) {
    const r = await enviar(nome, prompt);
    const nomeCheck = `${rotulo} · ${nome}`;
    if (esperado.erro) {
      verificar(grupo, `${nomeCheck} → recusado: "${esperado.erro}"`, r.error, esperado.erro);
      return r;
    }
    verificar(grupo, `${nomeCheck} → Nota ${esperado.nota}`, r.attempt?.score, esperado.nota);
    verificar(grupo, `${nomeCheck} → Tentativas restantes ${esperado.restantes}`, r.attemptsLeft, esperado.restantes);
    const pontos = r.attempt?.evaluation?.criteria.map((c) => c.points) ?? [];
    verificar(grupo, `${nomeCheck} → pontos por Critério`, pontos, esperado.pontos);
    return r;
  }

  // Conquistas e pontuação do Placar: a cada fim de Rodada
  function conquistasDe(nome) {
    const linha = placarAtual?.find((j) => j.nickname === nome);
    return (linha?.achievements ?? []).map((c) => c.type).sort();
  }
  function verificarPlacar(grupo, rotulo, pontuacoes, conquistas) {
    const ordem = placarAtual.map((j) => `${j.position}º ${j.nickname}`);
    verificar(grupo, `${rotulo}: ordem do Placar`, ordem, pontuacoes.ordem);
    for (const [nome, pontos] of Object.entries(pontuacoes.pontos)) {
      const linha = placarAtual.find((j) => j.nickname === nome);
      verificar(grupo, `${rotulo}: pontuação total de ${nome}`, linha?.points, pontos);
    }
    for (const [nome, lista] of Object.entries(conquistas)) {
      verificar(grupo, `${rotulo}: Conquistas de ${nome}`, conquistasDe(nome), [...lista].sort());
    }
  }

  // Isolamento: o estado de cada Jogador só traz as Tentativas dele
  function verificarIsolamento(grupo, rotulo) {
    for (const nome of Object.keys(jogadores)) {
      const tentativas = jogadores[nome].estado?.attempts ?? [];
      const ok = tentativas.every((t) => jogadores[nome].minhas.includes(t.prompt));
      verificar(grupo, `${rotulo}: ${nome} só recebe as próprias Tentativas`, ok, true);
    }
  }

  // Privacidade: nenhum prompt aparece em Placar ou feed antes do reveal
  function verificarSemVazamento(grupo, rotulo, prompts) {
    const vazou = placarPayloads.some((p) => prompts.some((texto) => p.includes(texto)));
    verificar(grupo, `${rotulo}: Placar e feed nunca trazem texto de prompt`, vazou, false);
  }

  function verificarOutrosSemPrompt(grupo, rotulo, dono, trecho) {
    for (const nome of Object.keys(jogadores)) {
      if (nome === dono) continue;
      const viu = jogadores[nome].recebido.some((linha) => linha.includes(trecho));
      verificar(grupo, `${rotulo}: ${nome} não recebeu o prompt de ${dono} durante a Rodada`, viu, false);
    }
    const facilViu = placarPayloads.some((p) => p.includes(trecho));
    verificar(grupo, `${rotulo}: Facilitador não recebeu o prompt de ${dono} durante a Rodada`, facilViu, false);
  }

  // ---------- Recusas antes de qualquer Rodada ----------
  await checarTentativa("Rodada", "Sem Rodada aberta", "Joao", P.joao1r1, { erro: "Nenhuma Rodada aberta no momento." });
  const desconhecido = await new Promise((r) => facil.emit("facilitator:openRound", { challengeId: "nao-existe" }, r));
  verificar("Rodada", "Desafio inexistente é recusado", desconhecido.error, "Desafio não encontrado.");
  const semRodada = await new Promise((r) => facil.emit("facilitator:closeRound", r));
  verificar("Rodada", "Encerrar sem Rodada aberta é recusado", semRodada.error, "Não há Rodada aberta.");

  // ================= RODADA 1 · trabalho-remoto (sem cronômetro) =================
  const G1 = "Rodada 1";
  const abrir1 = await new Promise((r) => facil.emit("facilitator:openRound", { challengeId: "trabalho-remoto" }, r));
  verificar(G1, "Facilitador abre a Rodada 1 (Desafio 1)", abrir1.ok, true);
  verificar(G1, "Rodada 1 sem cronômetro não tem prazo", abrir1.round?.deadline, null);
  await sleep(200);
  const dupla = await new Promise((r) => facil.emit("facilitator:openRound", { challengeId: "reuniao-alinhamento" }, r));
  verificar(G1, "Segunda Rodada com outra aberta é recusada", dupla.error, "Já existe uma Rodada aberta. Encerre-a antes de abrir outra.");

  await checarTentativa(G1, "Prompt vazio", "Joao", "   ", { erro: "Escreva um prompt antes de enviar." });
  const longo = "a".repeat(4001);
  await checarTentativa(G1, "Prompt de 4.001 caracteres", "Joao", longo, { erro: "O prompt pode ter no máximo 4.000 caracteres." });
  await checarTentativa(G1, "Envio recusado não consome Tentativa", "Joao", P.joao1r1, { nota: 20, restantes: 2, pontos: [0, 0, 20, 0, 0, 0] });

  await checarTentativa(G1, "Pedro 1ª", "Pedro", P.pedro1, { nota: 0, restantes: 2, pontos: [0, 0, 0, 0, 0, 0] });
  await checarTentativa(G1, "Maria 1ª", "Maria", P.maria1r1, { nota: 0, restantes: 2, pontos: [0, 0, 0, 0, 0, 0] });
  await checarTentativa(G1, "Lucas 1ª", "Lucas", P.lucas1r1, { nota: 55, restantes: 2, pontos: [15, 20, 20, 0, 0, 0] });
  await checarTentativa(G1, "Pedro 2ª", "Pedro", P.pedro2r1, { nota: 40, restantes: 1, pontos: [0, 0, 20, 20, 0, 0] });
  await checarTentativa(G1, "Lucas 2ª", "Lucas", P.lucas2r1, { nota: 90, restantes: 1, pontos: [15, 20, 20, 20, 15, 0] });
  await sleep(200);
  verificarIsolamento(G1, "Meio da Rodada 1");
  verificarOutrosSemPrompt(G1, "Durante a Rodada 1", "Joao", TRECHO_UNICO.joao2r1);
  verificarOutrosSemPrompt(G1, "Durante a Rodada 1", "Maria", TRECHO_UNICO.maria2r1);
  const enviaramR1 = estadoFacil.sent;
  verificar(G1, "Facilitador vê quantos já enviaram (4 Jogadores já enviaram)", enviaramR1, 4);
  await checarTentativa(G1, "Joao 2ª", "Joao", P.joao2r1, { nota: 100, restantes: 1, pontos: [15, 20, 20, 20, 15, 10] });
  await checarTentativa(G1, "Maria 2ª (inglês)", "Maria", P.maria2r1, { nota: 100, restantes: 1, pontos: [15, 20, 20, 20, 15, 10] });
  await checarTentativa(G1, "Pedro 3ª", "Pedro", P.pedro3r1, { nota: 20, restantes: 0, pontos: [0, 0, 20, 0, 0, 0] });
  await checarTentativa(G1, "Pedro 4ª (sem Tentativas)", "Pedro", P.pedro3r1, { erro: "Você já usou as 3 Tentativas desta Rodada." });

  verificarPlacar(G1, "Placar com Rodada 1 aberta", {
    ordem: ["1º Joao", "2º Maria", "3º Lucas", "4º Pedro"],
    pontos: { Joao: 100, Maria: 100, Lucas: 90, Pedro: 40 },
  }, {});
  verificarSemVazamento(G1, "Rodada 1 aberta", [P.joao2r1, P.maria2r1, P.lucas2r1, P.pedro2r1]);

  const encerrou1 = await new Promise((r) => facil.emit("facilitator:closeRound", r));
  verificar(G1, "Facilitador encerra a Rodada 1", encerrou1.ok, true);
  await sleep(300);
  verificar(G1, "Joao não envia depois do encerramento", (await enviar("Joao", P.joao1r1))?.error, "A Rodada foi encerrada.");
  verificar(G1, "Desafio 1 não pode ser reaberto", (await new Promise((r) => facil.emit("facilitator:openRound", { challengeId: "trabalho-remoto" }, r))).error, "Este Desafio já foi jogado nesta Sala.");

  const revelacao1 = estadoFacil.reveal;
  verificar(G1, "Reveal traz o Prompt de referência do Desafio 1", revelacao1?.challenge?.referencePrompt?.startsWith("Papel: Você é um consultor de gestão de pessoas"), true);
  verificar(G1, "Reveal top 3: Joao, Maria, Lucas (Notas 100, 100, 90)", revelacao1?.top3.map((t) => `${t.nickname}:${t.score}`), ["Joao:100", "Maria:100", "Lucas:90"]);
  verificar(G1, "Reveal top 3 traz o prompt do 1º colocado", revelacao1?.top3[0]?.prompt, P.joao2r1);
  verificarPlacar(G1, "Placar após a Rodada 1", {
    ordem: ["1º Joao", "2º Maria", "3º Lucas", "4º Pedro"],
    pontos: { Joao: 100, Maria: 100, Lucas: 90, Pedro: 40 },
  }, {
    Joao: ["round-champion", "evolution", "bullseye", "first-blood"],
    Maria: ["evolution", "bullseye"],
    Lucas: ["evolution"],
    Pedro: ["evolution"],
  });

  // ================= RODADA 2 · reuniao-alinhamento =================
  const G2 = "Rodada 2";
  await sleep(200);
  const abrir2 = await new Promise((r) => facil.emit("facilitator:openRound", { challengeId: "reuniao-alinhamento" }, r));
  verificar(G2, "Facilitador abre a Rodada 2 (Desafio 2)", abrir2.ok, true);
  await checarTentativa(G2, "Maria 1ª", "Maria", P.maria1r2, { nota: 40, restantes: 2, pontos: [0, 20, 20, 0, 0, 0] });
  await checarTentativa(G2, "Pedro 1ª", "Pedro", P.pedro1r2, { nota: 0, restantes: 2, pontos: [0, 0, 0, 0, 0, 0] });
  await checarTentativa(G2, "Joao 1ª", "Joao", P.joao1r2, { nota: 20, restantes: 2, pontos: [0, 0, 20, 0, 0, 0] });
  await checarTentativa(G2, "Lucas 1ª", "Lucas", P.lucas1r2, { nota: 20, restantes: 2, pontos: [0, 0, 20, 0, 0, 0] });
  await checarTentativa(G2, "Maria 2ª", "Maria", P.maria2r2, { nota: 100, restantes: 1, pontos: [15, 20, 20, 20, 15, 10] });
  await checarTentativa(G2, "Pedro 2ª", "Pedro", P.pedro2r2, { nota: 20, restantes: 1, pontos: [0, 0, 20, 0, 0, 0] });
  await checarTentativa(G2, "Lucas 2ª", "Lucas", P.lucas2r2, { nota: 35, restantes: 1, pontos: [15, 0, 20, 0, 0, 0] });
  await checarTentativa(G2, "Joao 2ª", "Joao", P.joao2r2, { nota: 40, restantes: 1, pontos: [0, 20, 20, 0, 0, 0] });
  await checarTentativa(G2, "Lucas 3ª", "Lucas", P.lucas3r2, { nota: 55, restantes: 0, pontos: [0, 0, 20, 20, 15, 0] });
  await sleep(200);
  verificarIsolamento(G2, "Meio da Rodada 2");

  const encerrou2 = await new Promise((r) => facil.emit("facilitator:closeRound", r));
  verificar(G2, "Facilitador encerra a Rodada 2", encerrou2.ok, true);
  await sleep(300);
  verificar(G2, "Reveal da Rodada 2: top 3 Maria 100, Lucas 55, Joao 40", estadoFacil.reveal?.top3.map((t) => `${t.nickname}:${t.score}`), ["Maria:100", "Lucas:55", "Joao:40"]);
  verificarPlacar(G2, "Placar após a Rodada 2", {
    ordem: ["1º Maria", "2º Lucas", "3º Joao", "4º Pedro"],
    pontos: { Maria: 200, Lucas: 145, Joao: 140, Pedro: 60 },
  }, {
    Joao: ["round-champion", "evolution", "bullseye", "first-blood"],
    Maria: ["round-champion", "evolution", "evolution", "bullseye", "bullseye", "first-blood"],
    Lucas: ["evolution", "evolution"],
    Pedro: ["evolution"],
  });

  // ================= RODADA 3 · resumo-reuniao (cronômetro de 60 s) =================
  const G3 = "Rodada 3";
  verificar(G3, "Cronômetro de 0 segundo é recusado", (await new Promise((r) => facil.emit("facilitator:openRound", { challengeId: "resumo-reuniao", durationSeconds: 0 }, r))).error, "A duração precisa ser de pelo menos 1 segundo.");
  const abrir3 = await new Promise((r) => facil.emit("facilitator:openRound", { challengeId: "resumo-reuniao", durationSeconds: 60 }, r));
  verificar(G3, "Facilitador abre a Rodada 3 com cronômetro de 60 s", abrir3.ok, true);
  verificar(G3, "Prazo fica exatamente 60 s depois da abertura", Date.parse(abrir3.round.deadline) - Date.parse(abrir3.round.openedAt), 60000);
  await checarTentativa(G3, "Pedro 1ª", "Pedro", P.pedro1r3, { nota: 20, restantes: 2, pontos: [0, 0, 20, 0, 0, 0] });
  await checarTentativa(G3, "Maria 1ª", "Maria", P.maria1r3, { nota: 70, restantes: 2, pontos: [15, 20, 0, 20, 15, 0] });
  await checarTentativa(G3, "Lucas 1ª", "Lucas", P.lucas1r3, { nota: 0, restantes: 2, pontos: [0, 0, 0, 0, 0, 0] });
  await checarTentativa(G3, "Joao 1ª", "Joao", P.joao1r3, { nota: 20, restantes: 2, pontos: [0, 0, 20, 0, 0, 0] });

  const fechou = await new Promise((resolver) => {
    const limite = setTimeout(() => resolver(null), 70000);
    const espera = setInterval(() => {
      if (estadoFacil && estadoFacil.round === null && estadoFacil.reveal) {
        clearTimeout(limite); clearInterval(espera); resolver(true);
      }
    }, 250);
  });
  verificar(G3, "Rodada 3 encerra sozinha quando o cronômetro zera", fechou, true);
  verificar(G3, "Joao envia depois do prazo e é recusado", (await enviar("Joao", P.joao1r3))?.error, "A Rodada foi encerrada.");
  verificar(G3, "Reveal da Rodada 3: top 3 Maria 70, Pedro 20, Joao 20 (empate: quem enviou antes)", estadoFacil.reveal?.top3.map((t) => `${t.nickname}:${t.score}`), ["Maria:70", "Pedro:20", "Joao:20"]);
  verificarPlacar(G3, "Placar após a Rodada 3", {
    ordem: ["1º Maria", "2º Joao", "3º Lucas", "4º Pedro"],
    pontos: { Maria: 270, Joao: 160, Lucas: 145, Pedro: 80 },
  }, {
    Joao: ["round-champion", "evolution", "bullseye", "first-blood"],
    Maria: ["round-champion", "round-champion", "evolution", "evolution", "bullseye", "bullseye", "first-blood"],
    Lucas: ["evolution", "evolution"],
    Pedro: ["evolution", "first-blood"],
  });

  // ================= RODADA 4 · contrato-json =================
  const G4 = "Rodada 4";
  const abrir4 = await new Promise((r) => facil.emit("facilitator:openRound", { challengeId: "contrato-json" }, r));
  verificar(G4, "Facilitador abre a Rodada 4 (Desafio 4)", abrir4.ok, true);
  await checarTentativa(G4, "Lucas 1ª", "Lucas", P.lucas1r4, { nota: 40, restantes: 2, pontos: [0, 0, 20, 20, 0, 0] });
  await checarTentativa(G4, "Joao 1ª", "Joao", P.joao1r4, { nota: 90, restantes: 2, pontos: [15, 20, 20, 20, 15, 0] });
  await new Promise((r) => facil.emit("facilitator:closeRound", r));
  await sleep(300);
  verificarPlacar(G4, "Placar após a Rodada 4", {
    ordem: ["1º Maria", "2º Joao", "3º Lucas", "4º Pedro"],
    pontos: { Maria: 270, Joao: 250, Lucas: 185, Pedro: 80 },
  }, {
    Joao: ["round-champion", "round-champion", "evolution", "bullseye", "first-blood"],
    Maria: ["round-champion", "round-champion", "evolution", "evolution", "bullseye", "bullseye", "first-blood"],
    Lucas: ["evolution", "evolution", "first-blood"],
    Pedro: ["evolution", "first-blood"],
  });

  // ================= RODADA 5 · pontos-do-email =================
  const G5 = "Rodada 5";
  const abrir5 = await new Promise((r) => facil.emit("facilitator:openRound", { challengeId: "pontos-do-email" }, r));
  verificar(G5, "Facilitador abre a Rodada 5 (Desafio 5)", abrir5.ok, true);
  await checarTentativa(G5, "Pedro com prompt vazio", "Pedro", "", { erro: "Escreva um prompt antes de enviar." });
  await checarTentativa(G5, "Pedro 1ª", "Pedro", P.pedro1r5, { nota: 40, restantes: 2, pontos: [0, 0, 20, 20, 0, 0] });
  await new Promise((r) => facil.emit("facilitator:closeRound", r));
  await sleep(300);

  // Presença: Lucas cai e volta; continua no Placar com os pontos
  jogadores.Lucas.socket.close();
  await sleep(400);
  const lucasOff = placarAtual.find((j) => j.nickname === "Lucas");
  verificar("Presença", "Lucas offline continua no Placar com 185 pontos", [lucasOff?.online, lucasOff?.points], [false, 185]);
  jogadores.Lucas.socket = io(BASE, { auth: { token: jogadores.Lucas.token }, transports: ["websocket"], reconnection: false });
  await sleep(500);
  verificar("Presença", "Lucas volta ao Placar com o mesmo token", placarAtual.find((j) => j.nickname === "Lucas")?.online, true);

  verificarPlacar("Rodada 5", "Placar após a Rodada 5", {
    ordem: ["1º Maria", "2º Joao", "3º Lucas", "4º Pedro"],
    pontos: { Maria: 270, Joao: 250, Lucas: 185, Pedro: 120 },
  }, {
    Joao: ["round-champion", "round-champion", "evolution", "bullseye", "first-blood"],
    Maria: ["round-champion", "round-champion", "evolution", "evolution", "bullseye", "bullseye", "first-blood"],
    Lucas: ["evolution", "evolution", "first-blood"],
    Pedro: ["round-champion", "evolution", "first-blood", "first-blood"],
  });

  // ---------- Moderação: remover Jogador libera o Nickname e tira do Placar ----------
  const removido = await new Promise((r) => facil.emit("facilitator:removePlayer", { playerId: jogadores.Pedro.id }, r));
  verificar("Moderação", "Facilitador remove Pedro", removido.ok, true);
  await sleep(400);
  verificar("Moderação", "Pedro removido sai do Placar", placarAtual.map((j) => j.nickname), ["Maria", "Joao", "Lucas"]);
  const tokenAntigo = await fetch(BASE + "/api/session", { headers: { authorization: `Bearer ${jogadores.Pedro.token}` } });
  verificar("Moderação", "Token de Pedro removido não retoma mais (401)", tokenAntigo.status, 401);
  verificar("Moderação", "Pedro removido é levado de volta ao login", jogadores.Pedro.recebido.some((l) => l.startsWith("session:invalid")), true);
  const pedroNovo = await post("/api/enter", { nickname: "Pedro" });
  verificar("Moderação", "Nickname liberado: novo Pedro entra (201)", pedroNovo.status, 201);
  // Como a tela do Jogador faz: o novo Pedro conecta o socket com o token dele e entra no Placar.
  const pedroNovoSocket = io(BASE, { auth: { token: pedroNovo.json.token }, transports: ["websocket"], reconnection: false });
  await sleep(500);
  const linhaPedroNovo = placarAtual.find((j) => j.nickname === "Pedro");
  verificar("Moderação", "Pedro novo começa com 0 pontos e sem Conquistas", [linhaPedroNovo?.points, linhaPedroNovo?.achievements], [0, []]);
  pedroNovoSocket.close();

  // ---------- Reset da Sala ----------
  const resetado = await new Promise((r) => facil.emit("facilitator:resetMatch", r));
  verificar("Reset", "Facilitador reseta a partida", resetado.ok, true);
  await sleep(500);
  verificar("Reset", "Placar vazio após reset", placarAtual, []);
  verificar("Reset", "Desafios voltam a ficar disponíveis", estadoFacil.challenges.map((d) => d.played), [false, false, false, false, false]);
  verificar("Reset", "Jogadores antigos voltam ao login", jogadores.Joao.recebido.some((l) => l.startsWith("session:invalid")), true);

  // ---------- Relatório ----------
  const resumo = { total: resultados.length, passaram: resultados.length - falhas, falharam: falhas };
  fs.writeFileSync(SAIDA, JSON.stringify({ resumo, resultados }, null, 2));
  console.log("\nRESUMO", JSON.stringify(resumo));
  facil.close();
  for (const j of Object.values(jogadores)) j.socket?.close();
  process.exit(falhas === 0 ? 0 : 1);
}

main().catch((erro) => {
  console.error("ERRO NO CENÁRIO", erro);
  process.exit(2);
});
