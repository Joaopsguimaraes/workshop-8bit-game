# 01: Base do projeto, login com Nickname e área de trabalho DOS

**Tamanho:** L

**Spec:** `.scratch/workshop-game/spec.md`, histórias 1–13, 31 e 36 (presença).

**What to build:** Um Jogador abre a aplicação, entra só com um Nickname, vê o preview do Avatar enquanto digita e cai numa área de trabalho MS-DOS/8-bit com três janelas arrastáveis: `PROMPT.EXE` (no estado `AGUARDANDO O FACILITADOR..._`), `DESAFIO.TXT` (vazia) e `PLACAR.EXE`. O `PLACAR.EXE` mostra, ao vivo, todos os Jogadores conectados de outras abas, com Avatar e status online/offline. Recarregar a página devolve o Jogador ao mesmo Nickname.

Este ticket estabelece a base: repositório git, Next.js com servidor Node customizado e Socket.IO no mesmo processo (ADR-0001), Prisma sobre SQLite em arquivo, Vitest, Tailwind, shadcn com o registry 8bitcn e o tema visual DOS. O Motor do Jogo já nasce como a única porta para mudar o estado da Sala.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `git init` com `main` como branch padrão; projeto gerenciado com pnpm; scripts para dev, build, start, migração do banco e testes.
- [ ] Next.js roda com servidor Node customizado e Socket.IO no mesmo processo; um único comando sobe tudo.
- [ ] Prisma sobre SQLite em arquivo, com o esquema de Jogador (nickname, nickname normalizado único, iniciais, token único, criadoEm).
- [ ] Tailwind, shadcn e componentes 8bitcn instalados; tema DOS/8-bit (fonte pixelada, cores de terminal, bordas de janela) aplicado; todo o texto em pt-BR.
- [ ] A tela de login explica que o Avatar usa as duas primeiras letras do Nickname e mostra o preview do Avatar atualizando ao vivo.
- [ ] Regras de Nickname: depois de aparar espaços, de 2 a 16 caracteres, apenas letras (com acento), números e espaço, e pelo menos 2 caracteres alfanuméricos. Cada violação mostra uma mensagem específica em pt-BR.
- [ ] A unicidade compara o Nickname minúsculo e sem acento ("João" e "JOAO" colidem), com a mensagem "Nickname já em uso".
- [ ] Iniciais do Avatar: os 2 primeiros caracteres alfanuméricos, sem acento, em maiúsculo ("Élio" vira "EL").
- [ ] O token fica salvo no navegador; recarregar ou reabrir a aba retoma o mesmo Jogador; um token inválido volta para o login.
- [ ] Motor do Jogo com `entrar(nickname)`, `retomar(token)` e `estadoDoJogador(token)`, testados com Vitest contra um SQLite de teste limpo por teste.
- [ ] O `PLACAR.EXE` lista os Jogadores com Avatar, Nickname e status online/offline, atualizando em tempo real entre abas; a presença fica só em memória, derivada das conexões de socket.
- [ ] As janelas `PROMPT.EXE`, `DESAFIO.TXT` e `PLACAR.EXE` podem ser arrastadas, minimizadas e restauradas; as posições ficam salvas no navegador e sobrevivem a um reload.
- [ ] Sem Rodada aberta, `PROMPT.EXE` mostra `AGUARDANDO O FACILITADOR..._` com o cursor piscando.
