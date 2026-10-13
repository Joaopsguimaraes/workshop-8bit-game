# Workshop de Prompts

Jogo colaborativo em tempo real, com estética MS-DOS/8-bit, para ensinar participantes de um workshop a escrever prompts bons e estruturados para LLMs.

## Language

### Pessoas

**Jogador**:
Participante do workshop identificado apenas por um Nickname único na Sala.
_Avoid_: Usuário, participante, player

**Nickname**:
Nome escolhido pelo Jogador no login; é sua única identidade e é único na Sala.
_Avoid_: Username, login, nome

**Avatar**:
Representação visual do Jogador formada pelas duas primeiras letras do Nickname.
_Avoid_: Foto, ícone

**Facilitador**:
Pessoa que conduz o workshop, abrindo e encerrando cada Rodada para todos os Jogadores; não aparece no Placar.
_Avoid_: Admin, host, moderador, instrutor

**Telão**:
Visão em tela cheia do Facilitador, projetada para a turma, com o Placar ao vivo e o reveal do fim de cada Rodada.
_Avoid_: Projetor, dashboard, painel público

### Jogo

**Sala**:
O único espaço compartilhado da aplicação onde todos os Jogadores jogam juntos.
_Avoid_: Room, lobby, partida

**Desafio**:
Cenário que descreve o que o Jogador precisa pedir a uma LLM, acompanhado de Palavras-chave e de um Prompt de referência.
_Avoid_: Atividade, exercício, nível, fase

**Palavras-chave**:
Termos do assunto de um Desafio que o prompt precisa mencionar para atender ao Critério Tarefa.
_Avoid_: Keywords, tags

**Prompt de referência**:
Um exemplo de prompt bem estruturado para o Desafio, revelado a todos quando a Rodada encerra.
_Avoid_: Gabarito, resposta certa, prompt ideal

**Critério**:
Uma verificação sobre a estrutura do prompt (ex.: define um papel, dá contexto, especifica o formato) que vale um número fixo de pontos; os Critérios são os mesmos em todos os Desafios.
_Avoid_: Regra, check, requisito

**Nota**:
Soma, de 0 a 100, dos pontos dos Critérios atendidos por uma Tentativa.
_Avoid_: Score, pontuação, resultado

**Rodada**:
Período em que um Desafio está aberto para todos os Jogadores, iniciado e encerrado pelo Facilitador.
_Avoid_: Round, turno

**Tentativa**:
Um envio de prompt de um Jogador em uma Rodada; cada Jogador tem no máximo 3 por Rodada.
_Avoid_: Submissão, envio, jogada

**Janela**:
A janela flutuante pessoal do Jogador onde ele escreve prompts e vê os resultados das suas Tentativas; só o próprio Jogador a vê.
_Avoid_: Painel, card, modal

**Placar**:
Ranking de Jogadores pela soma da melhor Nota de cada Rodada, visível para todos e atualizado em tempo real.
_Avoid_: Leaderboard, ranking, listagem

**Conquista**:
Distintivo que um Jogador ganha ao cumprir um feito no jogo (ex.: Nota máxima, primeiro a enviar).
_Avoid_: Badge, troféu, medalha
