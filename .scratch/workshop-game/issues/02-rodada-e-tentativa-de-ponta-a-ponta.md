# 02: Rodada e Tentativa de ponta a ponta (Facilitador, cronômetro e Avaliador mínimo)

**Tamanho:** XL

**Spec:** `.scratch/workshop-game/spec.md`, histórias 14–22, 27–30, 33, 52–59 e 64.

**What to build:** O Facilitador entra em `/facilitador` com um PIN, escolhe um Desafio e abre a Rodada, com cronômetro opcional. Todos os Jogadores veem o cenário em `DESAFIO.TXT` e escrevem prompts em `PROMPT.EXE`. Cada Tentativa recebe na hora uma Nota de 0 a 100, um veredito e um checklist ✓/✕ com dicas. O Jogador tem até 3 Tentativas, e a melhor delas aparece no `PLACAR.EXE` de todos em tempo real. A Rodada encerra quando o Facilitador clica em encerrar ou quando o cronômetro zera, e a partir daí ninguém mais envia.

O Avaliador nasce aqui com a **interface final** (`avaliar(prompt, desafio) → Avaliação`), mas com só 2 Critérios (Papel e Tarefa) e só o Desafio 1 no seed. O ticket 03 completa os Critérios.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] O PIN do Facilitador vem de variável de ambiente; `/facilitador` pede o PIN e emite uma sessão (cookie httpOnly) que o canal de socket do Facilitador valida; um PIN errado é recusado. O Facilitador não aparece no Placar.
- [ ] Catálogo de Desafios carregado de um arquivo de seed versionado, com o Desafio 1 (trabalho remoto): identificador, ordem, título, cenário, Palavras-chave em grupos e Prompt de referência.
- [ ] O painel do Facilitador lista os Desafios marcando os já jogados, abre a Rodada com duração opcional, encerra manualmente e mostra quantos Jogadores já enviaram.
- [ ] Esquema de Rodada (desafioId, abertaEm, prazo opcional, encerradaEm) e de Tentativa (jogadorId, rodadaId, número 1–3, prompt, Nota, Avaliação serializada, criadaEm).
- [ ] Comandos do Motor: `abrirRodada`, `encerrarRodada`, `verificarPrazo(agora)` e `enviarTentativa`; relógio injetável; um tick no servidor chama `verificarPrazo`.
- [ ] Invariantes testados: no máximo uma Rodada aberta; um Desafio não pode ser reaberto na mesma partida; até 3 Tentativas por Jogador por Rodada; recusa sem Rodada, com a Rodada encerrada, com prompt vazio ou com mais de 4.000 caracteres; envio recusado não consome Tentativa; prazo vencido encerra a Rodada.
- [ ] O Jogador vê o cenário em `DESAFIO.TXT` ao abrir a Rodada, o contador de caracteres, as Tentativas restantes e o cronômetro regressivo (quando houver); o envio fica bloqueado ao esgotar as Tentativas ou ao encerrar a Rodada, inclusive se ele estava digitando.
- [ ] Avaliador mínimo com os Critérios Papel (15) e Tarefa (20; verbo de ação e pelo menos 2 grupos de Palavras-chave do Desafio), devolvendo uma Avaliação com Nota, veredito e, por Critério, atendido, pontos e máximo, dica e trecho reconhecido.
- [ ] `PROMPT.EXE` mostra a Nota, o veredito, o checklist ✓/✕ com pontos, dica nos Critérios que falharam e trecho nos que passaram, além do histórico das Tentativas da Rodada.
- [ ] O Placar conta a melhor Tentativa do Jogador na Rodada e atualiza para todos em tempo real; o evento de Placar **nunca** carrega texto de prompt (garantido por teste).
- [ ] O estado (Rodada aberta, Tentativas, prazo) sobrevive a um restart do servidor.
