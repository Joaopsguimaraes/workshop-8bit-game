# 04: Placar competitivo, reveal, Conquistas e feedback de jogo

**Tamanho:** XL

**Spec:** `.scratch/workshop-game/spec.md`, histórias 32–51.

**What to build:** O jogo passa a ter cara de competição. O Placar soma a melhor Nota de cada Rodada, com desempate justo e o status de cada Jogador. O feed de eventos ao vivo mostra o que está acontecendo ("JO tirou 100!"), e os Jogadores ganham as 5 Conquistas. Há sons 8-bit (desligados por padrão) e animação de LEVEL UP. Quando a Rodada encerra, todos veem o Prompt de referência e os prompts do top 3, o momento de aprendizado coletivo, e isso fica na tela até a próxima Rodada.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] O total do Placar soma a melhor Nota do Jogador em cada Rodada (encerrada ou aberta).
- [ ] Desempate: menos Tentativas usadas nas Rodadas em que o Jogador pontuou, depois quem atingiu primeiro a pontuação. Testado pelo Motor.
- [ ] O `PLACAR.EXE` mostra, por Jogador: posição, Avatar, Nickname, total, status (online, offline, enviou na Rodada), Tentativas usadas e Conquistas; quem fica offline mantém os pontos.
- [ ] Esquema de Conquista (jogadorId, rodadaId, tipo, criadaEm); cada Conquista é concedida no máximo uma vez por Jogador por Rodada.
- [ ] **Na mosca** (Nota 100), **De primeira** (100 na 1ª Tentativa), **Primeiro sangue** (primeira Tentativa aceita da Rodada), **Evolução** (Tentativa posterior ≥ 1ª Tentativa + 30) e **Campeão da Rodada** (1º lugar ao encerrar, com o mesmo desempate, só se a melhor Nota for maior que 0). Cada uma testada pelo Motor, incluindo os casos em que não deve ser concedida.
- [ ] Feed de eventos ao vivo no `PLACAR.EXE` (Jogador entrou, Tentativa enviada, Nota 100, Conquista ganha, Rodada aberta ou encerrada) sem texto de prompt.
- [ ] Ao encerrar a Rodada, o evento de reveal leva o Prompt de referência e o top 3 (Avatar, Nickname, Nota, prompt); `PROMPT.EXE` mostra o reveal até o Facilitador abrir a próxima Rodada.
- [ ] Teste: nenhum evento ou snapshot enviado a um Jogador contém prompt de outro Jogador antes do reveal.
- [ ] Sons 8-bit ao enviar, ao receber a Nota e ao subir de posição; desligados por padrão, com um botão para ligar e a preferência salva no navegador.
- [ ] Animação de LEVEL UP quando a Nota do Jogador melhora na Rodada ou ele sobe de posição no Placar.
