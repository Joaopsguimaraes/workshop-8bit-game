# Spec: 8-bit Prompt Game for the Workshop

Status: ready-for-agent

## Problem Statement

In a prompt engineering workshop, the Facilitator needs to teach a whole class to write **structured** prompts: with a role, context, a clear task, format, constraints and examples. Today the material is static. The reference activity is a single-page HTML: each person does the exercise alone, pastes an LLM's answer and gets a score that only they see. There is no sense of class, competition, progress across the workshop, or a shared moment to learn from colleagues' prompts. The Facilitator has no way to run the class at the same pace or to see, in real time, who is engaged.

For the participant, there is no immediate, specific feedback on *what* is missing from their prompt, and no credit for prompts that are partly well structured. There is also no fun reason to try again and improve.

## Solution

A real-time web application with the feel of a game: an MS-DOS desktop with an 8-bit aesthetic, all in pt-BR. Each Player logs in with only a Nickname and gets an Avatar made of the first two letters of the name. The Facilitator runs the workshop in Rounds. They open a Challenge (a scenario such as "write the prompt that schedules an alignment meeting"), and all Players write prompts in their personal Window (`PROMPT.EXE`), with up to 3 Attempts per Round.

Each Attempt gets a Score from 0 to 100 immediately, calculated **without calling any LLM**: the prompt itself is evaluated against eight structure Criteria (Role, Context, Task, Format, Constraints, Examples, Delimiters, Uncertainty). Each Criterion is scored by the strength of its signal: an explicit label with content gives full points, a clear natural phrase gives most of the points, and a weak mention gives a small share. The Player sees a checklist with ✓, parcial or ✕ for each Criterion, and the window `DICAS.TXT` lists a tip for each Criterion that is missing or partial, ordered by the points lost, with a link to the reference section of the Anthropic prompting documentation. The best Attempt of the Round goes onto the Scoreboard, which everyone sees live, together with an event feed, Achievements, 8-bit sounds and LEVEL UP animations.

The other Players' prompts stay hidden during the Round. When the Facilitator closes the Round, everyone sees the Challenge's Reference prompt and the prompts of the top 3. This is the moment of collective learning. The Facilitator projects everything on the Big screen.

## User Stories

### Login and identity

1. As a Player, I want to enter by typing only a Nickname, so I can start playing without registration or a password.
2. As a Player, I want the login screen to explain that my Avatar is made of the first two letters of my Nickname, so I understand how I will appear to others.
3. As a Player, I want to see a preview of my 8-bit Avatar updating while I type the Nickname, so I can pick a name that produces an Avatar I like.
4. As a Player, I want a clear message when the Nickname is already in use in the Room, so I can choose another.
5. As a Player, I want a clear message when the Nickname is too short, too long or has invalid characters, so I can fix it without guessing the rule.
6. As a Player, I want "joão" and "JOAO" to be treated as the same Nickname, so nobody can impersonate me with a case or accent variation.
7. As a Player, I want to automatically get back to my Player if I reload the page or close and reopen the tab in the same browser, so I do not lose my Attempts or my position on the Scoreboard.
8. As a Player, I want my Avatar to use uppercase letters without accents ("Élio" becomes "EL"), so all Avatars have the same pixelated look.

### Desktop and Window

9. As a Player, I want to see an MS-DOS-style desktop with the windows `PROMPT.EXE`, `DESAFIO.TXT`, `DICAS.TXT` and `PLACAR.EXE`, so I feel I am inside a retro game.
10. As a Player, I want to drag, minimize and restore the desktop windows, so I can organize the screen my way.
11. As a Player, I want the position of my windows to be saved in my browser, so I do not have to rearrange the screen after reloading.
12. As a Player, I want only me to see my Window, so I can write my prompts without anyone copying them.
13. As a Player, I want to see `AGUARDANDO O FACILITADOR..._` with a blinking cursor when there is no open Round, so I know the game has not started or is between Rounds.
14. As a Player, I want to read the current Challenge's scenario in `DESAFIO.TXT` as soon as the Round opens, so I know what my prompt needs to ask for.
15. As a Player, I want to see how many Attempts I have left in the Round, so I can manage my chances.
16. As a Player, I want to see the Round's timer when the Facilitator has set one, so I know how much time I have left.

### Attempts and Evaluation

17. As a Player, I want to write my prompt in a free text field, not a form with ready-made fields, so I learn to structure the prompt myself.
18. As a Player, I want to submit my prompt and get the Score right away, so I can iterate quickly.
19. As a Player, I want to see the Score from 0 to 100 with a short verdict ("Na mosca!", "Quase lá", etc.), so I can tell at a glance how I did.
20. As a Player, I want to see the checklist of the eight Criteria with ✓, parcial or ✕ and the points of each, so I know exactly where I gained and lost points.
21. As a Player, I want a practical tip for each Criterion that is missing or only partly met, ordered by the points I lost, so I know what to improve on my next Attempt first.
22. As a Player, I want to see the excerpt of my prompt that met a Criterion, so I understand what the system recognized.
23. As a Player, I want the system to recognize my prompt's structure with explicit labels (`Papel:`, `## Contexto`, `**Tarefa**`, `<contexto>…</contexto>`) and with natural phrases ("Você é…", "Atue como…", "Responda em…", "Sendo um especialista…"), so I am not penalized for writing naturally.
24. As a Player, I want prompts written in English to be recognized too, so I can practice in the language I use day to day.
25. As a Player, I want a labeled Criterion to count in full as soon as the label has some content, such as `Papel: consultor`, so a short but explicit structure is rewarded, while an empty label does not count.
26. As a Player, I want the Task Criterion to recognize my prompt's action and to reward it more when the prompt also addresses the Challenge's subject, so that reusing a prompt from another Round scores less.
27. As a Player, I want to see the history of my Round's Attempts with prompt and Score, so I can compare versions and learn from my progress.
28. As a Player, I want to be prevented from submitting an empty prompt or one with more than 4,000 characters, and to see the reason, so I do not waste an Attempt by mistake.
29. As a Player, I want submitting to be blocked when my 3 Attempts are used up, so I understand that I have used them all.
30. As a Player, I want submitting to be blocked when the Round closes, even if I was typing, so everyone plays under the same rules.
31. As a Player, I want a prompt that tells the model what to do when information is missing (for example, "escreva 'não informado'") to be recognized as Uncertainty handling, so the Score rewards the habit of not guessing.
32. As a Player, I want a prompt that separates its parts with delimiters (tags, headings or separators) to be recognized as Delimiters, so the Score rewards clear structure.

### Scoreboard and events

33. As a Player, I want to see all Players with Avatar, Nickname and total score in `PLACAR.EXE`, ordered, so I know my position.
34. As a Player, I want the Scoreboard to update in real time when any Player submits an Attempt, so I can feel the competition happening.
35. As a Player, I want only my best Attempt of each Round to count on the Scoreboard, so I can take risks without fear of making things worse.
36. As a Player, I want the total to be the sum of my best Scores from each Round, so consistency across the workshop is rewarded.
37. As a Player, I want ties to be decided by fewer Attempts used and then by who reached the Score first, so the tiebreaker is fair and predictable.
38. As a Player, I want to see each Player's status on the Scoreboard (online, offline, sent in the Round, Attempts used), so I know who is active.
39. As a Player, I want to stay on the Scoreboard with my points even when I go offline, so I do not lose progress because of my connection.
40. As a Player, I want a live event feed ("JO tirou 100!", "AN enviou a 2ª Tentativa", "MA ganhou Evolução"), so I can follow the game even without seeing other Players' Windows.
41. As a Player, I want to never see another Player's prompt text during the Round, so the competition is fair.

### Achievements and game feedback

42. As a Player, I want to earn the **Na mosca** Achievement by scoring 100 on an Attempt, so I am recognized for a perfect prompt.
43. As a Player, I want to earn the **De primeira** Achievement by scoring 100 already on the Round's 1st Attempt, so I am recognized for getting it right without iterating.
44. As a Player, I want to earn the **Primeiro sangue** Achievement by making the first submission of the Round, so I am rewarded for speed.
45. As a Player, I want to earn the **Evolução** Achievement when one of my Attempts beats my first Attempt of the same Round by 30 points or more, so I am rewarded for reading the feedback and improving.
46. As a Player, I want to earn the **Campeão da Rodada** Achievement by finishing first in the Round, so I have a trophy per Round.
47. As a Player, I want to see my Achievements and those of other Players on the Scoreboard, so I can compare.
48. As a Player, I want to see a LEVEL UP animation when my Score improves or I move up on the Scoreboard, so I can feel my progression.
49. As a Player, I want to hear 8-bit sound effects when I submit, when I receive my Score and when I move up in position, so the game is more fun.
50. As a Player, I want sound to start off and to have a button to turn it on, so it does not disturb the workshop room.

### End of Round and learning

51. As a Player, I want to see the Challenge's Reference prompt when the Round closes, so I can compare it with mine and learn.
52. As a Player, I want to see the prompts of the Round's top 3, with Avatar and Score, when it closes, so I can learn from those who did best.
53. As a Player, I want to keep seeing the reveal of the last Round until the Facilitator opens the next one, so I have time to read and discuss.

### Facilitator

54. As a Facilitator, I want to enter through the `/facilitador` route with a PIN, so that only I control the game.
55. As a Facilitator, I want not to appear on the Scoreboard, so the ranking shows only Players.
56. As a Facilitator, I want to see the list of Challenges marking those already played in this match, so I can choose the next one.
57. As a Facilitator, I want to open a Round with the chosen Challenge, so all Players start at the same time.
58. As a Facilitator, I want to optionally set a timer when opening the Round, so I can control the workshop's time.
59. As a Facilitator, I want the Round to close on its own when the timer reaches zero, so I do not have to keep an eye on the clock.
60. As a Facilitator, I want to close the Round manually at any time, so I can adapt the pace to the class.
61. As a Facilitator, I want to see how many Players have already submitted in the current Round, so I can decide when to close it.
62. As a Facilitator, I want to remove a Player (for example, for an offensive Nickname), freeing the Nickname and taking them off the Scoreboard, so I can keep the environment appropriate.
63. As a Facilitator, I want to reset the match, deleting Players, Attempts, Achievements and Rounds after a confirmation, so I can start a new workshop from scratch.
64. As a Facilitator, I want a full-screen Big screen mode with the large Scoreboard, the timer, the submission count and the event feed, so I can project it for the class.
65. As a Facilitator, I want the Big screen to show the reveal (Reference prompt and top 3) when the Round closes, so I can lead the discussion with everyone looking at the same screen.
66. As a Facilitator, I want the match to survive a server restart in the middle of the workshop, so the class does not lose progress.

### Challenges

67. As a Facilitator, I want the match to come with five ready Challenges, in increasing difficulty, so I do not have to prepare content before the workshop.
68. As a Facilitator, I want to be able to review and edit the Challenges' text in a versioned file before the workshop, so I can adjust the content to the class.

### Tips window and prompt guide

69. As a Player, I want a floating `DICAS.TXT` window that is updated after each Attempt with the tips for that prompt, so I know what to improve on the next one.
70. As a Player, I want the same `DICAS.TXT` window to show a fixed guide to a good prompt (role, context, task, format, constraints, examples, delimiters, uncertainty), so I can learn even between Attempts.
71. As a Player, I want each tip to point to the section of the Anthropic prompting documentation it comes from, so I can read more on the subject.

## Implementation Decisions

### Architecture and stack

- Next.js with a **custom Node server** hosting Socket.IO in the same process; deployed on a single machine or container, never serverless (ADR-0001).
- Prisma over **SQLite in a file**, never `:memory:`, so the match survives a restart (ADR-0001).
- **No LLM calls**: the Score comes from deterministic heuristics over the prompt text (ADR-0002).
- UI with Tailwind, shadcn and components from the **8bitcn** registry; MS-DOS plus 8-bit aesthetic, with an RPG game vibe; all interface text in pt-BR.
- Palette: black and grey terminal, like the default Windows prompt (black background, light grey text, white highlights). **No blue background and no green**. Errors in red (`destructive`). The 8bitcn components get the `dark` class on `<html>` to enable the pixelated borders.
- Package manager **pnpm**; the project starts with `git init` and `main` as the default branch.
- A single Room per instance; there is no concept of multiple rooms.

### Modules

1. **Evaluator** (deep module, pure, no I/O). Interface: `evaluate(prompt, challenge) → Evaluation`.
   - `Evaluation` = Score (0–100), verdict (title and text) and the list of the eight Criteria. Each item carries the Criterion's id and name, its maximum, the points obtained, the strength level reached (full, partial or missing), the tip (when points are below the maximum) and the recognized excerpt (when there is any signal).
   - **Scoring by strength**: each Criterion has three levels, and the points are the maximum times the level, rounded to the nearest integer. The Score is the sum of the points, from 0 to 100.
     - **Full (100%)**: an explicit label with content. Labels can appear as `Rótulo:`, `## Rótulo`, `**Rótulo**`, `<rotulo>…</rotulo>` or `<rotulo>` with a closing tag. The label must be followed by at least one word of content (a letter or a digit). An empty label does not count.
     - **Partial (70%)**: a clear natural marker in a sentence with at least 4 words beyond the marker (for example, "Você é um analista…").
     - **Weak (30%)**: a single marker word or a loose mention without the 4-word sentence.
     - A Criterion can reach a level from more than one signal; the highest level wins, and the points are not added up.
   - Fixed Criteria, the same for all Challenges. The display names are the pt-BR names shown in the UI. The recognized markers are pt-BR and English input, matched case- and accent-insensitive:

     | Criterion | Max points | Labels (full) | Natural markers (70%) | Weak mentions (30%) |
     |---|---|---|---|---|
     | Papel | 15 | `Papel:`, `Persona:`, `Role:` | "você é", "atue como", "aja como", "seu papel é", "sendo um especialista", "you are", "act as", "as an expert", "as a specialist" | "especialista", "consultor" alone |
     | Contexto | 15 | `Contexto:`, `Context:` | "estamos", "estou", "o público é", "a audiência é", "o objetivo é", "para a diretoria", "para a equipe", "we are", "i am", "the audience is", "the goal is" | "contexto", "situação" alone |
     | Tarefa | 20 | `Tarefa:`, `Task:` **and** at least 1 group of the Challenge's Keywords | an imperative action verb from the verb list (about 60 verbs in pt-BR and English, for example liste, escreva, resuma, extraia, gere, marque, agende, envie, explique, compare, classifique, transforme, responda; list, write, summarize…) **and** at least 1 group of Keywords | a verb alone, or a Keywords group alone |
     | Formato | 15 | `Formato:`, `Format:` | "formato", "tópicos", "em tópicos", "em lista", "numerad[oa]", "bullets", "bullet points", "tabela", "JSON", "markdown", "títulos", "N itens", "N palavras", "table", "bulleted" | "formato" alone |
     | Restrições | 10 | `Restrições:`, `Restrictions:`, `Constraints:` | "não inclua/use/escreva/invente…", "evite", "sem …", "apenas", "somente", "no máximo", "nunca", "don't", "avoid", "only", "never" | "sem" alone |
     | Exemplos | 10 | `Exemplo:`, `Exemplos:`, `Example:`, `Examples:` | "por exemplo", "exemplo:", "ex.:", "for example", "such as", a quoted excerpt of at least 4 words | "exemplo" alone |
     | Delimitadores | 10 | at least 2 isolated blocks: an XML tag pair `<name>…</name>` with any name, a Markdown heading (`##`), or a `---` separator | 1 isolated block with content | a single tag or heading without content |
     | Incerteza | 5 | a conditional instruction with the action to take, such as "se não estiver no texto, escreva 'não informado'" or "caso falte…, escreva…" | a conditional phrase without the action: "se não souber", "caso faltar", "se não tiver" | "não informado" or "não encontrado" alone |

   - **Keywords** are the groups from the Challenge catalog. They count only for Tarefa.
   - The same excerpt can meet more than one Criterion (for example, "no máximo 6 palavras por item" counts for Formato and for Restrições).
   - Verdicts: 100 is "Na mosca!"; 80 to 99 is "Quase lá"; 50 to 79 is "No caminho certo"; below 50 is "Longe do alvo". The supporting texts follow the tone of the reference HTML.
   - Each Criterion has a fixed tip in pt-BR that says what to add, with a mini example, and a reference to the section of the Anthropic prompting documentation it comes from (see Further Notes). The Incerteza tip cites the workshop's guide, not the official page, because the official page does not recommend an uncertainty instruction.

2. **Challenge catalog**: a versioned seed file in the repository, loaded by the server; Challenges do not live in the database. Each Challenge has a stable identifier, order, title, scenario (text of `DESAFIO.TXT`), Keywords (in groups of synonyms, like the `groups` of the reference HTML) and a Reference prompt. The Reference prompt must include all eight Criteria at full strength and must score 100 in the Evaluator. The five Challenges:
   1. **Advantages and disadvantages of remote work**: the Reference prompt is the one from the reference HTML, enriched with Role, Context, Example, Delimiters and Uncertainty. Keywords: trabalho remoto/home office, vantagens/prós, desvantagens/contras.
   2. **Email scheduling an alignment meeting**: Keywords: e-mail, reunião, alinhamento, data/horário, participantes.
   3. **Meeting summary for the next agenda**: the scenario brings loose notes from a meeting; the prompt must turn them into a summary with decisions, pending items and owners, organized as the agenda of the next meeting. Keywords: anotações/ata, resumo, decisões, pendências, responsáveis, pauta.
   4. **Extract data from a .docx contract**: the Player will attach a .docx contract to an LLM and must extract the contracting party, contracted party, value, term and penalty in **JSON**, marking "não encontrado" for anything missing. Keywords: contrato, docx/documento, extrair, JSON, contratante, valor, vigência, multa.
   5. **Key points of a received email**: the scenario brings a long, confusing email from a client; the prompt must extract the key points, the questions that require an answer and the deadline, in short bullets. Keywords: e-mail, cliente, pontos-chave, perguntas, prazo, tópicos.

3. **Game Engine** (deep module, the only entry point for changing the Room's state). It receives commands and returns results and events; it depends on a repository (Prisma) and an injectable clock. Commands:
   - `enter(nickname)` returns the Player and the token. `resume(token)` returns the Player or an error.
   - `openRound(challengeId, duration?)`, Facilitator only.
   - `submitAttempt(token, prompt)` returns the Attempt with its Evaluation.
   - `closeRound()`, Facilitator only. `checkDeadline(now)` closes the Round if the deadline has passed.
   - `removePlayer(playerId)` and `resetMatch()`, Facilitator only.
   - Queries: `playerState(token)` (snapshot for the Player's screen, **without** other Players' prompts), `facilitatorState()` and `scoreboard()`.
   - Invariants:
     - At most one open Round.
     - Each Challenge is played at most once per match.
     - Up to 3 Attempts per Player per Round.
     - Submission refused without an open Round, with the Round closed, with an empty prompt or with more than 4,000 characters. A refused submission does not consume an Attempt.
   - Nickname: after trimming spaces, it has 2 to 16 characters, only letters (with accents), numbers and spaces, and at least 2 alphanumeric characters. Uniqueness compares the normalized form (lowercase and without accents). Avatar initials: the first 2 alphanumeric characters, without accents, in uppercase.
   - Scoreboard: each Player sums, for each Round (closed or open), the Score of their best Attempt. Tie: smaller sum of Attempts used in the Rounds where they scored, then who reached the score first. The Facilitator does not appear.
   - Achievements: evaluated inside the Engine on each submission and when the Round closes. Each one is granted at most once per Player per Round.
     - **Na mosca**: Score 100.
     - **De primeira**: Score 100 on the 1st Attempt.
     - **Primeiro sangue**: first accepted Attempt of the Round.
     - **Evolução**: Score of a later Attempt ≥ Score of the 1st Attempt + 30.
     - **Campeão da Rodada**: 1st place in the Round by best Score with the same tiebreaker; only granted if the best Score is greater than 0.
   - Events emitted: Player entered/left/went offline, Attempt evaluated (to the Player themselves, with the full Evaluation), Scoreboard updated (to everyone, **without** prompt text), Achievement granted, Round opened, Round closed with reveal (Reference prompt plus the top 3 with Avatar, Nickname, Score and prompt), Player removed and match reset.
   - Removing a Player deletes their Attempts and Achievements and frees the Nickname. The removed Player goes back to the login screen.
   - Reset deletes Players, Rounds, Attempts and Achievements; all clients go back to the login screen.

4. **Persistence** (Prisma/SQLite). Conceptual schema (the Prisma models and columns are mapped to the EN names in the code):
   - Player: id, nickname, normalized nickname (unique), initials, token (unique), createdAt.
   - Round: id, challengeId, openedAt, deadline (optional), closedAt (optional).
   - Attempt: id, playerId, roundId, number (1–3), prompt, Score, serialized Evaluation (including the level reached by each Criterion), createdAt.
   - Achievement: id, playerId, roundId, type, createdAt.
   - Presence (online/offline) lives only in memory, derived from socket connections.

5. **Real-time transport** (Socket.IO, thin shell). Translates socket messages into Engine commands and distributes the events. The Players' broadcast room never receives another Player's prompt text before the reveal. The Facilitator channel requires a session authenticated by the PIN. On connect, the client receives the full snapshot for its role. A periodic tick calls `checkDeadline`.

6. **Facilitator authentication**: the PIN lives in an environment variable. The `/facilitador` route asks for the PIN and, if it is correct, issues a session (httpOnly cookie) that the socket validates.

7. **Player UI**:
   - Login screen with a Nickname field, an explanation about the Avatar and a live preview; the token is saved in the browser.
   - DOS desktop with four draggable and minimizable windows (`PROMPT.EXE`, `DESAFIO.TXT`, `DICAS.TXT`, `PLACAR.EXE`); positions are saved per browser.
   - `PROMPT.EXE`: waiting state, prompt field, character counter, Attempts left, timer, result (Score, verdict, checklist of the eight Criteria with ✓, parcial or ✕ and the excerpts), Round history and reveal.
   - `DICAS.TXT` (floating window, reuses the desktop's window frame): two sections. "Dicas deste envio" shows the tips for the last Attempt, ordered by the points lost, and is updated after each submission. "Guia de um bom prompt" is a fixed guide to the eight Criteria, always available.
   - `DESAFIO.TXT`: scenario of the current Round.
   - `PLACAR.EXE`: ranking, status, Achievements and event feed.
   - Sound button, off by default. LEVEL UP animation when the Score improves or the Player moves up.

8. **Facilitator UI and Big screen**: control panel (Challenges with played markers, open with optional timer, close, submission count, list of Players with a remove button, reset with confirmation) and a full-screen Big screen mode (large Scoreboard, timer, submission count, feed and reveal).

## Testing Decisions

- **What makes a good test here**: it exercises only the external behavior through the public interface of one of the two test points, and asserts on observable results and events, never on internal structure, specific regex or Prisma calls. The tests read like the game's rules ("a label with one word of content scores in full", "a verb alone scores 30% of Task").
- **Point 1, Evaluator**: tested as a pure function, with TDD (red, green, refactor). Minimum cases:
  - A one-line bad prompt scores low.
  - The three strength levels: a label with content gives full points, a natural phrase gives 70%, a weak mention gives 30%.
  - Each Criterion is recognized by label and by natural phrase, in pt-BR and in English, including `<papel>…</papel>` and `**Tarefa**`.
  - Labels without content do not score; a label with one word of content does (`Papel: consultor`).
  - Task: a verb plus a Keywords group gives 70%; the verb alone gives 30%; the Keywords group alone gives 30%. A prompt addressing another Challenge does not reach full points for Task.
  - Delimiters: 2 isolated blocks give full points; 1 block gives 70%.
  - Uncertainty: a conditional instruction with the action gives full points; "não informado" alone gives 30%.
  - The same excerpt can score for Format and for Constraints.
  - The points are rounded to the nearest integer and the Score never exceeds 100.
  - The verdict boundaries are correct (49/50, 79/80, 99/100).
  - **Each seed Challenge's Reference prompt scores 100 with all eight Criteria at full strength** (protects the seed against regressions).
  - Regression: the prompt "Você é um gestor de produto que gerencia um time de três pessoas. Deve marcar uma reunião de alinhamento com toda equipe com a data mais próxima disponível às 15:00 com todos da equipe." on the email Challenge scores more than 15, with Papel and Tarefa recognized.
- **Point 2, Game Engine**: tested through commands against a real SQLite test database (a clean database per test) and with an injectable clock. Minimum cases:
  - Nickname rules and normalized uniqueness; initials.
  - Resume by token.
  - Round lifecycle (open, submit, close); refusals without an open Round, with the Round closed, on the 4th Attempt, with an empty prompt or above 4,000 characters, and a refusal that does not consume an Attempt.
  - A Challenge cannot be reopened; an expired deadline closes via `checkDeadline`.
  - Scoreboard by best Attempt and by the sum across Rounds; tiebreakers.
  - Each of the five Achievements, including the non-grant cases.
  - Scoreboard events never contain prompt text; the reveal contains the top 3 and the Reference prompt.
  - Removing a Player frees the Nickname and clears it from the Scoreboard; reset clears everything.
- **No automated tests**: the Socket.IO transport, the Player UI (including the `DICAS.TXT` window), and the Facilitator UI and Big screen. They are thin enough that verification is manual, running the app with more than one tab open.
- **Tool**: Vitest.
- **Prior art**: the repository starts from scratch, with no existing tests. The "Workshop Prompts" HTML used as reference (the `analyze` function, which returns `score` and a list of checks) is the conceptual model for the Evaluation format.

## Out of Scope

- Any LLM call: generating the prompt's answer, LLM-as-judge, embeddings (ADR-0002).
- Target answer and comparison of the LLM output against a target (the mechanism of the original HTML).
- Multiple Rooms, room codes, simultaneous workshops.
- Creating or editing Challenges through the UI; different Criteria or weights per Challenge.
- Login with password, email or SSO; persistent accounts across matches.
- Seeing another Player's Window or prompt during the Round; window positions shared between Players.
- Chat between Players.
- History of previous matches after a reset.
- Browser-based E2E tests.
- Serverless deployment (Vercel and similar) or an external real-time service (ADR-0001).
- Mobile-first layout: the target is laptop or desktop. The layout may degrade acceptably on smaller screens.
- Tips generated by an LLM or personalized per Player; tips are fixed texts per Criterion.

## Further Notes

- The vocabulary follows `CONTEXT.md` (Player, Nickname, Avatar, Facilitator, Big screen, Room, Challenge, Keywords, Reference prompt, Criterion, Score, Round, Attempt, Window, Scoreboard, Achievement). The `DESAFIO.TXT`, `DICAS.TXT` and `PLACAR.EXE` windows are not a "Window" in the glossary's sense.
- Relevant ADRs: `docs/adr/0001-single-node-server-with-sqlite.md` and `docs/adr/0002-evaluate-prompt-without-llm.md`.
- The reference HTML ("Workshop Prompts", Atividade 1) inspired Challenge 1, the checklist format with points and the verdicts. Its target-answer mechanism was deliberately dropped.
- The Criteria and their fixed tips are based on the Anthropic prompting best practices page (https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices). Mapping used for the tips: Papel to "Give Claude a role"; Contexto to "Add context"; Formato to "Control the format of responses" (including "say what to do instead of what not to do"); Exemplos to "Use examples effectively"; Delimitadores to "Structure prompts with XML tags"; Restrições and Tarefa to "Be clear and direct". The page has no recommendation for an uncertainty instruction, so Incerteza is a workshop criterion, cited to the guide and not to the official page.
- Decision taken in this spec without explicit discussion: each Challenge can be played at most once per match, so the Scoreboard sum does not count the same Challenge twice. If the Facilitator needs to repeat a Challenge, that becomes a new spec.
- Scoring decisions made in the grilling session of 2026-10-14: graded scoring by strength (100%, 70%, 30%); eight Criteria with the weights in the table above; Task now needs one Keywords group instead of two; labels count when they have one word of content; the Dicas window is a floating `DICAS.TXT` with a per-Attempt section and a fixed guide. The name `DICAS.TXT` is a choice of this spec, following the names of the other windows.
- Known gap to confirm during implementation: the example prompt in the Regression case above reaches Papel and Tarefa but not Contexto, because "com toda equipe" is not a Contexto marker. Recognizing that phrasing is outside the agreed rules and would need a new marker.
- The texts of scenarios, tips and Reference prompts are written during implementation and reviewed by the Facilitator before the workshop (story 68).
- Color decision (revised during implementation): the first version used DOS terminal colors (blue background, green text) and was hard to read. It was replaced with black and grey, like the default Windows prompt, using the 8bitcn tokens. It is a visual decision and reversible, so it lives here and not in an ADR. Highlights use white instead of yellow and green, so the hierarchy depends on font size and weight, not on color.
- The heuristic can always be gamed with effort; the minimum content, the Keywords and the strength levels make that laborious, and the top 3 reveal exposes abuses. Perfect precision is not the goal.
