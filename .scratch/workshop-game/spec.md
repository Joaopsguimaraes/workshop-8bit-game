# Spec: Jogo de Prompts 8-bit para o Workshop

Status: ready-for-agent

## Problem Statement

Num workshop de engenharia de prompt, o Facilitador precisa ensinar uma turma inteira a escrever prompts **estruturados**: com papel, contexto, tarefa clara, formato, restrições e exemplos. Hoje o material é estático. A atividade de referência é um HTML de página única: cada pessoa faz o exercício sozinha, cola a resposta de uma LLM e recebe uma nota que só ela vê. Não existe senso de turma, competição, progresso ao longo do workshop nem momento coletivo de aprender com o prompt dos colegas. O Facilitador não tem como conduzir a turma no mesmo ritmo nem ver, em tempo real, quem está engajado.

Para o participante, falta feedback imediato e específico sobre *o que* falta no prompt dele. Também falta um motivo divertido para tentar de novo e melhorar.

## Solution

Uma aplicação web em tempo real com cara de jogo: uma área de trabalho MS-DOS com estética 8-bit, toda em pt-BR. Cada Jogador entra só com um Nickname e ganha um Avatar com as duas primeiras letras do nome. O Facilitador conduz o workshop em Rodadas. Ele abre um Desafio (um cenário do tipo "escreva o prompt que marca uma reunião de alinhamento"), e todos os Jogadores escrevem prompts na sua Janela pessoal (`PROMPT.EXE`), com até 3 Tentativas por Rodada.

Cada Tentativa recebe na hora uma Nota de 0 a 100, calculada **sem chamar nenhuma LLM**: o próprio prompt é avaliado contra seis Critérios de estrutura (Papel, Contexto, Tarefa, Formato, Restrições, Exemplos). O Jogador vê um checklist ✓/✕ com uma dica para cada Critério que faltou. A melhor Tentativa da Rodada entra no Placar, que todos veem ao vivo, junto com um feed de eventos, Conquistas, sons 8-bit e animações de LEVEL UP.

Os prompts dos outros Jogadores ficam ocultos durante a Rodada. Quando o Facilitador encerra a Rodada, todos veem o Prompt de referência do Desafio e os prompts do top 3. É o momento de aprendizado coletivo. O Facilitador projeta tudo num Telão.

## User Stories

### Login e identidade

1. Como Jogador, quero entrar digitando apenas um Nickname, para começar a jogar sem cadastro nem senha.
2. Como Jogador, quero que a tela de login me explique que meu Avatar será formado pelas duas primeiras letras do meu Nickname, para entender como vou aparecer para os outros.
3. Como Jogador, quero ver o preview do meu Avatar 8-bit atualizando enquanto digito o Nickname, para escolher um nome que gere um Avatar de que eu goste.
4. Como Jogador, quero receber uma mensagem clara quando o Nickname já estiver em uso na Sala, para escolher outro.
5. Como Jogador, quero receber uma mensagem clara quando o Nickname for curto demais, longo demais ou tiver caracteres inválidos, para corrigir sem adivinhar a regra.
6. Como Jogador, quero que "joão" e "JOAO" sejam tratados como o mesmo Nickname, para que ninguém se passe por mim com uma variação de maiúscula ou acento.
7. Como Jogador, quero voltar automaticamente para o meu Jogador se eu recarregar a página ou fechar e reabrir a aba no mesmo navegador, para não perder minhas Tentativas nem minha posição no Placar.
8. Como Jogador, quero que meu Avatar use letras maiúsculas sem acento ("Élio" vira "EL"), para que todos os Avatares tenham o mesmo visual pixelado.

### Área de trabalho e Janela

9. Como Jogador, quero ver uma área de trabalho estilo MS-DOS com as janelas `PROMPT.EXE`, `DESAFIO.TXT` e `PLACAR.EXE`, para sentir que estou dentro de um jogo retrô.
10. Como Jogador, quero arrastar, minimizar e restaurar as janelas da área de trabalho, para organizar a tela do meu jeito.
11. Como Jogador, quero que a posição das minhas janelas fique salva no meu navegador, para não precisar reorganizar a tela depois de recarregar.
12. Como Jogador, quero que só eu veja a minha Janela, para escrever meus prompts sem que copiem de mim.
13. Como Jogador, quero ver `AGUARDANDO O FACILITADOR..._` com o cursor piscando quando não houver Rodada aberta, para saber que o jogo ainda não começou ou está entre Rodadas.
14. Como Jogador, quero ler o cenário do Desafio atual em `DESAFIO.TXT` assim que a Rodada abrir, para saber o que meu prompt precisa pedir.
15. Como Jogador, quero ver quantas Tentativas ainda tenho na Rodada, para administrar minhas chances.
16. Como Jogador, quero ver o cronômetro da Rodada quando o Facilitador tiver definido um, para saber quanto tempo me resta.

### Tentativas e Avaliação

17. Como Jogador, quero escrever meu prompt num campo de texto livre, sem um formulário com campos prontos, para aprender a estruturar o prompt eu mesmo.
18. Como Jogador, quero enviar meu prompt e receber a Nota na hora, para iterar rápido.
19. Como Jogador, quero ver a Nota de 0 a 100 com um veredito curto ("Na mosca!", "Quase lá", etc.), para entender de relance como me saí.
20. Como Jogador, quero ver o checklist dos seis Critérios com ✓/✕ e os pontos de cada um, para saber exatamente onde ganhei e onde perdi pontos.
21. Como Jogador, quero ver uma dica prática para cada Critério que não atendi, para saber como melhorar na próxima Tentativa.
22. Como Jogador, quero ver o trecho do meu prompt que fez um Critério ser atendido, para entender o que o sistema reconheceu.
23. Como Jogador, quero que o sistema reconheça a estrutura do meu prompt tanto com rótulos explícitos (`Papel:`, `## Contexto`, `<contexto>`) quanto com frases naturais ("Atue como…", "Responda em…"), para não ser punido por escrever de forma natural.
24. Como Jogador, quero que prompts escritos em inglês também sejam reconhecidos, para poder praticar no idioma que uso no dia a dia.
25. Como Jogador, quero que um Critério só conte quando houver conteúdo de verdade, e não apenas o rótulo vazio, para que a Nota reflita um prompt realmente bem estruturado.
26. Como Jogador, quero que o Critério Tarefa exija que meu prompt fale do assunto do Desafio, para que reaproveitar o prompt de outra Rodada não funcione.
27. Como Jogador, quero ver o histórico das minhas Tentativas da Rodada com prompt e Nota, para comparar versões e aprender com a evolução.
28. Como Jogador, quero ser impedido de enviar um prompt vazio ou com mais de 4.000 caracteres, e ver o motivo, para não gastar uma Tentativa à toa.
29. Como Jogador, quero que o envio fique bloqueado quando minhas 3 Tentativas acabarem, para entender que já usei todas.
30. Como Jogador, quero que o envio fique bloqueado quando a Rodada for encerrada, inclusive se eu estava digitando, para que todos joguem com as mesmas regras.

### Placar e eventos

31. Como Jogador, quero ver no `PLACAR.EXE` todos os Jogadores com Avatar, Nickname e pontuação total, ordenados, para saber minha posição.
32. Como Jogador, quero que o Placar atualize em tempo real quando qualquer Jogador enviar uma Tentativa, para sentir a competição acontecendo.
33. Como Jogador, quero que só a minha melhor Tentativa de cada Rodada conte no Placar, para poder arriscar sem medo de piorar.
34. Como Jogador, quero que o total seja a soma das minhas melhores Notas de cada Rodada, para que a consistência ao longo do workshop seja recompensada.
35. Como Jogador, quero que os empates sejam decididos por menos Tentativas usadas e, depois, por quem atingiu a Nota primeiro, para que o desempate seja justo e previsível.
36. Como Jogador, quero ver no Placar o status de cada Jogador (online, offline, enviou na Rodada, Tentativas usadas), para saber quem está ativo.
37. Como Jogador, quero continuar no Placar com meus pontos mesmo ficando offline, para não perder o progresso por causa da conexão.
38. Como Jogador, quero ver um feed de eventos ao vivo ("JO tirou 100!", "AN enviou a 2ª Tentativa", "MA ganhou Evolução"), para acompanhar o jogo mesmo sem ver as Janelas dos outros.
39. Como Jogador, quero nunca ver o texto do prompt de outro Jogador durante a Rodada, para que a competição seja justa.

### Conquistas e feedback de jogo

40. Como Jogador, quero ganhar a Conquista **Na mosca** ao tirar 100 numa Tentativa, para ser reconhecido pelo prompt perfeito.
41. Como Jogador, quero ganhar a Conquista **De primeira** ao tirar 100 já na 1ª Tentativa da Rodada, para ser reconhecido por acertar sem iterar.
42. Como Jogador, quero ganhar a Conquista **Primeiro sangue** ao fazer o primeiro envio da Rodada, para ser recompensado pela agilidade.
43. Como Jogador, quero ganhar a Conquista **Evolução** quando uma Tentativa minha superar em 30 pontos ou mais a minha primeira Tentativa da mesma Rodada, para ser recompensado por ler o feedback e melhorar.
44. Como Jogador, quero ganhar a Conquista **Campeão da Rodada** ao terminar a Rodada em primeiro, para ter um troféu por Rodada.
45. Como Jogador, quero ver minhas Conquistas e as dos outros Jogadores no Placar, para comparar.
46. Como Jogador, quero ver uma animação de LEVEL UP quando minha Nota melhorar ou eu subir no Placar, para sentir a progressão.
47. Como Jogador, quero ouvir efeitos sonoros 8-bit ao enviar, ao receber a Nota e ao subir de posição, para que o jogo fique mais divertido.
48. Como Jogador, quero que o som venha desligado e haja um botão para ligar, para não atrapalhar a sala do workshop.

### Fim da Rodada e aprendizado

49. Como Jogador, quero ver o Prompt de referência do Desafio quando a Rodada encerrar, para comparar com o meu e aprender.
50. Como Jogador, quero ver os prompts do top 3 da Rodada, com Avatar e Nota, quando ela encerrar, para aprender com quem foi melhor.
51. Como Jogador, quero continuar vendo o reveal da última Rodada até o Facilitador abrir a próxima, para ter tempo de ler e discutir.

### Facilitador

52. Como Facilitador, quero entrar pela rota `/facilitador` com um PIN, para que só eu controle o jogo.
53. Como Facilitador, quero não aparecer no Placar, para que o ranking mostre só os Jogadores.
54. Como Facilitador, quero ver a lista de Desafios com a indicação dos que já foram jogados nesta partida, para escolher o próximo.
55. Como Facilitador, quero abrir uma Rodada com o Desafio escolhido, para que todos os Jogadores comecem ao mesmo tempo.
56. Como Facilitador, quero definir, de forma opcional, um cronômetro ao abrir a Rodada, para controlar o tempo do workshop.
57. Como Facilitador, quero que a Rodada encerre sozinha quando o cronômetro zerar, para não precisar ficar de olho no relógio.
58. Como Facilitador, quero encerrar a Rodada manualmente a qualquer momento, para adaptar o ritmo à turma.
59. Como Facilitador, quero ver quantos Jogadores já enviaram na Rodada atual, para decidir quando encerrar.
60. Como Facilitador, quero remover um Jogador (por exemplo, por um Nickname ofensivo), liberando o Nickname e tirando-o do Placar, para manter o ambiente adequado.
61. Como Facilitador, quero resetar a partida, apagando Jogadores, Tentativas, Conquistas e Rodadas depois de uma confirmação, para começar um novo workshop do zero.
62. Como Facilitador, quero um modo Telão em tela cheia com o Placar grande, o cronômetro, a contagem de envios e o feed de eventos, para projetar para a turma.
63. Como Facilitador, quero que o Telão mostre o reveal (Prompt de referência e top 3) quando a Rodada encerrar, para conduzir a discussão com todos olhando para a mesma tela.
64. Como Facilitador, quero que a partida sobreviva a um restart do servidor no meio do workshop, para não perder o progresso da turma.

### Desafios

65. Como Facilitador, quero que a partida venha com cinco Desafios prontos, em dificuldade crescente, para não precisar preparar conteúdo antes do workshop.
66. Como Facilitador, quero poder revisar e editar o texto dos Desafios num arquivo versionado antes do workshop, para ajustar o conteúdo à turma.

## Implementation Decisions

### Arquitetura e stack

- Next.js com **servidor Node customizado** hospedando Socket.IO no mesmo processo; deploy em máquina ou container único, nunca serverless (ADR-0001).
- Prisma sobre **SQLite em arquivo**, nunca `:memory:`, para a partida sobreviver a um restart (ADR-0001).
- **Nenhuma chamada a LLM**: a Nota vem de heurística determinística sobre o texto do prompt (ADR-0002).
- UI com Tailwind, shadcn e componentes do registry **8bitcn**; estética MS-DOS mais 8-bit; todo o texto da interface em pt-BR.
- Gerenciador **pnpm**; o projeto começa com `git init` e `main` como branch padrão.
- Uma única Sala por instância; não existe conceito de múltiplas salas.

### Módulos

1. **Avaliador** (módulo profundo, puro, sem I/O). Interface: `avaliar(prompt, desafio) → Avaliação`.
   - `Avaliação` = Nota (0–100), veredito (título e texto) e a lista dos seis Critérios. Cada item da lista traz o identificador e o nome do Critério, se foi atendido, os pontos obtidos e o máximo, a dica (quando não atendido) e o trecho reconhecido (quando atendido).
   - Critérios fixos e iguais para todos os Desafios:

     | Critério | Pontos | Reconhece (pt-BR e inglês, sem diferenciar maiúscula nem acento) |
     |---|---|---|
     | Papel | 15 | "você é", "atue/aja como", "seu papel", rótulo `Papel:`/`Persona:`/`Role:`, "you are", "act as" |
     | Contexto | 20 | rótulo `Contexto:`/`Context:`, público ("para a diretoria", "o público é"), situação ("estou/estamos…"), objetivo ("o objetivo é…") |
     | Tarefa | 20 | verbo de ação no imperativo (liste, escreva, redija, resuma, extraia, gere, identifique, crie, analise; list, write…) **e** pelo menos 2 grupos distintos de Palavras-chave do Desafio |
     | Formato | 20 | "formato", lista ou tópicos, numerada, tabela, JSON, markdown, títulos, quantidade de itens ("3 itens"), tamanho ("no máximo N palavras"), rótulo `Formato:`/`Format:` |
     | Restrições | 15 | "não inclua/use/escreva", "evite", "sem …", "apenas", "somente", "no máximo", "nunca", rótulo `Restrições:`, "don't", "avoid", "only" |
     | Exemplos | 10 | "por exemplo", "exemplo:", "ex.:", trecho entre aspas ou em bloco apresentado como exemplo, "example" |

   - Os rótulos podem aparecer como `Rótulo:`, `## Rótulo`, `**Rótulo**` ou `<rotulo>…</rotulo>`.
   - **Mínimo de conteúdo**: o trecho que dispara o Critério (o conteúdo após o rótulo até o próximo rótulo, ou a frase que contém o marcador natural) precisa ter pelo menos 4 palavras além do próprio marcador. Rótulo vazio ou com 1 a 3 palavras não pontua.
   - Um mesmo trecho pode atender mais de um Critério (por exemplo, "no máximo 6 palavras por item" vale para Formato e para Restrições).
   - Vereditos: 100 é "Na mosca!"; de 80 a 99, "Quase lá"; de 50 a 79, "No caminho certo"; abaixo de 50, "Longe do alvo". Os textos de apoio seguem o tom do HTML de referência.
   - Cada Critério tem uma dica fixa em pt-BR que diz o que acrescentar, com um mini-exemplo.

2. **Catálogo de Desafios**: arquivo de seed versionado no repositório, carregado pelo servidor; os Desafios não ficam no banco. Cada Desafio tem identificador estável, ordem, título, cenário (texto do `DESAFIO.TXT`), Palavras-chave (em grupos de sinônimos, como os `groups` do HTML de referência) e Prompt de referência. Os Prompts de referência precisam tirar 100 no Avaliador. Os cinco Desafios:
   1. **Vantagens e desvantagens do trabalho remoto**: o Prompt de referência é o do HTML de referência, enriquecido com Papel, Contexto e Exemplo. Palavras-chave: trabalho remoto/home office, vantagens/prós, desvantagens/contras.
   2. **E-mail marcando uma reunião de alinhamento**: Palavras-chave: e-mail, reunião, alinhamento, data/horário, participantes.
   3. **Resumo da reunião para a pauta da próxima**: o cenário traz anotações soltas de uma reunião; o prompt deve transformá-las num resumo com decisões, pendências e responsáveis, organizado como pauta da próxima reunião. Palavras-chave: anotações/ata, resumo, decisões, pendências, responsáveis, pauta.
   4. **Extrair dados de um contrato em .docx**: o Jogador vai anexar um contrato .docx a uma LLM e precisa extrair contratante, contratado, valor, vigência e multa em **JSON**, marcando "não encontrado" no que faltar. Palavras-chave: contrato, docx/documento, extrair, JSON, contratante, valor, vigência, multa.
   5. **Pontos-chave de um e-mail recebido**: o cenário traz um e-mail longo e confuso de um cliente; o prompt deve extrair os pontos-chave, as perguntas que exigem resposta e o prazo, em tópicos curtos. Palavras-chave: e-mail, cliente, pontos-chave, perguntas, prazo, tópicos.

3. **Motor do Jogo** (módulo profundo, a única porta para mudar o estado da Sala). Recebe comandos e devolve resultado e eventos; depende de um repositório (Prisma) e de um relógio injetável. Comandos:
   - `entrar(nickname)` devolve o Jogador e o token. `retomar(token)` devolve o Jogador ou um erro.
   - `abrirRodada(desafioId, duracao?)`, só para o Facilitador.
   - `enviarTentativa(token, prompt)` devolve a Tentativa com a Avaliação.
   - `encerrarRodada()`, só para o Facilitador. `verificarPrazo(agora)` encerra a Rodada se o prazo tiver passado.
   - `removerJogador(jogadorId)` e `resetarPartida()`, só para o Facilitador.
   - Consultas: `estadoDoJogador(token)` (snapshot para a tela do Jogador, **sem** prompts alheios), `estadoDoFacilitador()` e `placar()`.
   - Invariantes:
     - No máximo uma Rodada aberta.
     - Cada Desafio é jogado no máximo uma vez por partida.
     - Até 3 Tentativas por Jogador por Rodada.
     - Envio recusado sem Rodada aberta, com a Rodada encerrada, com prompt vazio ou com mais de 4.000 caracteres. Envio recusado não consome Tentativa.
   - Nickname: depois de aparar espaços, tem de 2 a 16 caracteres, apenas letras (com acento), números e espaço, e pelo menos 2 caracteres alfanuméricos. A unicidade compara a forma normalizada (minúscula e sem acento). Iniciais do Avatar: os 2 primeiros caracteres alfanuméricos, sem acento, em maiúsculo.
   - Placar: cada Jogador soma, para cada Rodada (encerrada ou aberta), a Nota da sua melhor Tentativa. Empate: menor soma de Tentativas usadas nas Rodadas em que pontuou, depois quem atingiu primeiro a pontuação. O Facilitador não aparece.
   - Conquistas: avaliadas dentro do Motor a cada envio e ao encerrar a Rodada. Cada uma é concedida no máximo uma vez por Jogador por Rodada.
     - **Na mosca**: Nota 100.
     - **De primeira**: Nota 100 na 1ª Tentativa.
     - **Primeiro sangue**: primeira Tentativa aceita da Rodada.
     - **Evolução**: Nota de uma Tentativa posterior ≥ Nota da 1ª Tentativa + 30.
     - **Campeão da Rodada**: 1º lugar da Rodada pela melhor Nota com o mesmo desempate; só é concedida se a melhor Nota for maior que 0.
   - Eventos emitidos: Jogador entrou/saiu/ficou offline, Tentativa avaliada (para o próprio Jogador, com a Avaliação completa), Placar atualizado (para todos, **sem** texto de prompt), Conquista concedida, Rodada aberta, Rodada encerrada com reveal (Prompt de referência mais o top 3 com Avatar, Nickname, Nota e prompt), Jogador removido e partida resetada.
   - Remover um Jogador apaga as Tentativas e Conquistas dele e libera o Nickname. O Jogador removido volta para a tela de login.
   - Resetar apaga Jogadores, Rodadas, Tentativas e Conquistas; todos os clientes voltam para a tela de login.

4. **Persistência** (Prisma/SQLite). Esquema conceitual:
   - Jogador: id, nickname, nickname normalizado (único), iniciais, token (único), criadoEm.
   - Rodada: id, desafioId, abertaEm, prazo (opcional), encerradaEm (opcional).
   - Tentativa: id, jogadorId, rodadaId, número (1–3), prompt, Nota, Avaliação serializada, criadaEm.
   - Conquista: id, jogadorId, rodadaId, tipo, criadaEm.
   - Presença (online/offline) fica só em memória, derivada das conexões de socket.

5. **Transporte em tempo real** (Socket.IO, casca fina). Traduz mensagens de socket em comandos do Motor e distribui os eventos. A sala de broadcast dos Jogadores nunca recebe texto de prompt alheio antes do reveal. O canal do Facilitador exige sessão autenticada pelo PIN. Ao conectar, o cliente recebe o snapshot completo do seu papel. Um tick periódico chama `verificarPrazo`.

6. **Autenticação do Facilitador**: o PIN fica numa variável de ambiente. A rota `/facilitador` pede o PIN e, se ele estiver correto, emite uma sessão (cookie httpOnly) que o socket valida.

7. **UI do Jogador**:
   - Tela de login com campo de Nickname, explicação sobre o Avatar e preview ao vivo; o token fica salvo no navegador.
   - Área de trabalho DOS com três janelas arrastáveis e minimizáveis; as posições ficam salvas por navegador.
   - `PROMPT.EXE`: estado de espera, campo de prompt, contador de caracteres, Tentativas restantes, cronômetro, resultado (Nota, veredito, checklist com dicas e trechos), histórico da Rodada e reveal.
   - `DESAFIO.TXT`: cenário da Rodada atual.
   - `PLACAR.EXE`: ranking, status, Conquistas e feed de eventos.
   - Botão de som, desligado por padrão. Animação de LEVEL UP ao melhorar a Nota ou subir de posição.

8. **UI do Facilitador e Telão**: painel de controle (Desafios com marcação de jogados, abrir com cronômetro opcional, encerrar, contagem de envios, lista de Jogadores com botão de remover, reset com confirmação) e modo Telão em tela cheia (Placar grande, cronômetro, contagem de envios, feed e reveal).

## Testing Decisions

- **O que é um bom teste aqui**: exercita só o comportamento externo pela interface pública de um dos dois pontos de teste e afirma sobre resultados e eventos observáveis, nunca sobre estrutura interna, regex específica ou chamadas ao Prisma. Os testes leem como regras do jogo ("um prompt só com rótulos vazios tira menos de 20").
- **Ponto 1, Avaliador**: testado como função pura, com TDD (vermelho, verde, refatorar). Casos mínimos:
  - Prompt ruim de uma linha tira nota baixa.
  - Cada Critério é reconhecido por rótulo e por frase natural, em pt-BR e em inglês.
  - Rótulos sem conteúdo ("Papel: x. Contexto: x. …") não pontuam.
  - A Tarefa falha quando o prompt é ótimo, mas fala de outro Desafio (prompt da Rodada 1 avaliado no Desafio 2).
  - O mesmo trecho pode pontuar em Formato e Restrições.
  - Os limites dos vereditos ficam corretos (49/50, 79/80, 99/100).
  - **O Prompt de referência de cada Desafio do seed tira 100** (protege o seed contra regressões).
- **Ponto 2, Motor do Jogo**: testado por comandos contra um SQLite de teste real (um banco limpo por teste) e com relógio injetável. Casos mínimos:
  - Regras de Nickname e unicidade normalizada; iniciais.
  - Retomar pelo token.
  - Ciclo da Rodada (abrir, enviar, encerrar); recusas sem Rodada, com Rodada encerrada, na 4ª Tentativa, com prompt vazio ou acima de 4.000 caracteres, e recusa que não consome Tentativa.
  - Desafio não pode ser reaberto; prazo vencido encerra via `verificarPrazo`.
  - Placar pela melhor Tentativa e pela soma entre Rodadas; desempates.
  - Cada uma das cinco Conquistas, incluindo os casos de não concessão.
  - Os eventos de Placar nunca contêm texto de prompt; o reveal contém o top 3 e o Prompt de referência.
  - Remoção de Jogador libera o Nickname e limpa o Placar; reset limpa tudo.
- **Sem testes automatizados**: transporte Socket.IO, UI do Jogador e UI do Facilitador e Telão. Ficam finos o bastante para que a verificação seja manual, rodando a app com mais de uma aba.
- **Ferramenta**: Vitest.
- **Prior art**: o repositório parte do zero, sem testes existentes. O HTML "Workshop Prompts" usado como referência (função `analyze`, que devolve `score` e uma lista de checks) é o modelo conceitual para o formato da Avaliação.

## Out of Scope

- Qualquer chamada a LLM: gerar a resposta do prompt, LLM-juíza, embeddings (ADR-0002).
- Resposta-alvo e comparação da saída da LLM com um alvo (o mecanismo do HTML original).
- Múltiplas Salas, códigos de sala, workshops simultâneos.
- Criar ou editar Desafios pela UI; Critérios ou pesos diferentes por Desafio.
- Login com senha, e-mail ou SSO; contas persistentes entre partidas.
- Ver a Janela ou o prompt de outro Jogador durante a Rodada; posição de janelas compartilhada entre Jogadores.
- Chat entre Jogadores.
- Histórico de partidas anteriores depois de um reset.
- Testes E2E por navegador.
- Deploy serverless (Vercel e similares) ou serviço de tempo real externo (ADR-0001).
- Layout pensado para celular: o alvo é notebook ou desktop. O layout pode degradar de forma aceitável em telas menores.

## Further Notes

- O vocabulário segue o `CONTEXT.md` (Jogador, Nickname, Avatar, Facilitador, Telão, Sala, Desafio, Palavras-chave, Prompt de referência, Critério, Nota, Rodada, Tentativa, Janela, Placar, Conquista). As janelas `DESAFIO.TXT` e `PLACAR.EXE` não são "Janela" no sentido do glossário.
- ADRs relevantes: `docs/adr/0001-servidor-node-unico-com-sqlite.md` e `docs/adr/0002-avaliar-o-prompt-sem-chamar-llm.md`.
- O HTML de referência ("Workshop Prompts", Atividade 1) inspirou o Desafio 1, o formato do checklist ✓/✕ com pontos e os vereditos. A mecânica de Resposta-alvo dele foi descartada de propósito.
- Decisão tomada nesta spec sem discussão explícita: cada Desafio pode ser jogado no máximo uma vez por partida, para que a soma do Placar não conte o mesmo Desafio duas vezes. Se o Facilitador precisar repetir um Desafio, isso vira uma nova spec.
- Os textos dos cenários, dicas e Prompts de referência são redigidos na implementação e revisados pelo Facilitador antes do workshop (história 66).
- A heurística sempre pode ser burlada com esforço; o mínimo de conteúdo e as Palavras-chave tornam isso trabalhoso, e o reveal do top 3 expõe abusos. A precisão perfeita não é objetivo.
