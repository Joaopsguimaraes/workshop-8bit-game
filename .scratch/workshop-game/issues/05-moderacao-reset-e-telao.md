# 05: Remover Jogador, resetar a partida e Telão

**Tamanho:** L

**Spec:** `.scratch/workshop-game/spec.md`, histórias 60–63.

**What to build:** O Facilitador ganha os controles para conduzir o workshop de verdade. Ele pode remover um Jogador (ex.: Nickname ofensivo) e resetar a partida para um novo workshop. Também pode projetar o modo Telão em tela cheia, com o Placar grande, o cronômetro, a contagem de envios, o feed de eventos e o reveal do fim de cada Rodada, para a turma acompanhar o jogo na mesma tela.

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] Comando `removerJogador` no Motor: apaga as Tentativas e Conquistas do Jogador, libera o Nickname e atualiza o Placar de todos. O Jogador removido volta para a tela de login, e o token dele deixa de funcionar.
- [ ] Comando `resetarPartida` no Motor: apaga Jogadores, Rodadas, Tentativas e Conquistas. Todos os clientes voltam ao login.
- [ ] O painel do Facilitador lista os Jogadores com um botão de remover e tem o botão de reset com confirmação explícita.
- [ ] Testes pelo Motor: depois de remover, o Nickname pode ser usado de novo e o Jogador some do Placar; depois de resetar, o estado volta ao inicial e todos os Desafios voltam a ser jogáveis.
- [ ] Modo Telão em tela cheia, acessível só com a sessão do Facilitador: Placar grande com Avatares e Conquistas, Desafio atual, cronômetro, contagem de envios e feed de eventos, tudo ao vivo.
- [ ] Ao encerrar a Rodada, o Telão mostra o reveal (Prompt de referência e top 3) com leitura confortável no projetor.
- [ ] O Telão segue o tema DOS/8-bit e tem layout legível à distância (fontes grandes, alto contraste).
