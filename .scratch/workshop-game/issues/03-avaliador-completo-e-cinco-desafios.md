# 03: Avaliador completo e os 5 Desafios do seed

**Tamanho:** L

**Spec:** `.scratch/workshop-game/spec.md`, histórias 19–26, 65 e 66, e as seções "Avaliador" e "Catálogo de Desafios". ADR-0002.

**What to build:** O Jogador passa a ser avaliado pelos seis Critérios de estrutura, reconhecidos tanto por rótulos quanto por frases naturais, em pt-BR e inglês. Um prompt com rótulos vazios tira pouco, e um prompt ótimo de outro Desafio perde a Tarefa. O Facilitador tem os 5 Desafios prontos para jogar, cada um com um Prompt de referência que tira 100. Desenvolvido com TDD pela interface pública do Avaliador, uma função pura.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] Os seis Critérios com os pesos Papel 15, Contexto 20, Tarefa 20, Formato 20, Restrições 15 e Exemplos 10 (total 100), sem diferenciar maiúscula nem acento.
- [ ] Rótulos reconhecidos nas formas `Rótulo:`, `## Rótulo`, `**Rótulo**` e `<rotulo>…</rotulo>`, em pt-BR e inglês.
- [ ] Frases naturais reconhecidas conforme a tabela da spec (ex.: "atue como", "o público é", "em tópicos", "não inclua", "por exemplo", "you are", "avoid").
- [ ] Mínimo de conteúdo: o trecho que dispara o Critério precisa ter pelo menos 4 palavras além do marcador; `Papel: x. Contexto: x. Formato: x. Restrições: x. Exemplo: x.` tira menos de 20.
- [ ] Um mesmo trecho pode pontuar em mais de um Critério (ex.: "no máximo 6 palavras por item" vale em Formato e Restrições).
- [ ] A Tarefa exige um verbo de ação e pelo menos 2 grupos distintos de Palavras-chave do Desafio; o Prompt de referência do Desafio 1 avaliado no Desafio 2 perde a Tarefa.
- [ ] Vereditos: 100 é "Na mosca!"; de 80 a 99, "Quase lá"; de 50 a 79, "No caminho certo"; abaixo de 50, "Longe do alvo". Testes nos limites 49/50, 79/80 e 99/100.
- [ ] Dica fixa em pt-BR, com mini-exemplo, para cada Critério.
- [ ] Seed com os 5 Desafios, cada um com cenário, Palavras-chave e Prompt de referência:
  1. Trabalho remoto.
  2. E-mail marcando uma reunião de alinhamento.
  3. Anotações de reunião viram resumo e pauta da próxima.
  4. Extrair dados de um contrato .docx em JSON, com "não encontrado".
  5. Pontos-chave, perguntas e prazo de um e-mail longo de cliente.
- [ ] Teste: o Prompt de referência de cada Desafio do seed tira 100.
- [ ] Teste: um prompt ruim de uma linha tira nota baixa; cada Critério passa por rótulo e por frase natural, em pt-BR e em inglês.
