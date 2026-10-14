# Prompt Workshop

A real-time collaborative game with an MS-DOS/8-bit look, for teaching workshop participants to write good, structured prompts for LLMs.

This file is the domain glossary. The terms below are the English names used in code and developer docs. The user-facing UI is in pt-BR, so where a term appears on screen under a different pt-BR word, the description notes it (for example, Big screen is shown as "Telão").

## Language

### People

**Player**:
A workshop participant, identified only by a unique Nickname in the Room (shown in the UI as "Jogador").
_Avoid_: User, participant

**Nickname**:
The name a Player picks at login; it is their only identity and is unique in the Room.
_Avoid_: Username, login, name

**Avatar**:
The visual representation of a Player, made of the first two letters of the Nickname.
_Avoid_: Photo, icon

**Facilitator**:
The person who runs the workshop, opening and closing each Round for all Players; does not appear on the Scoreboard.
_Avoid_: Admin, host, moderator, instructor

**Big screen**:
The full-screen view of the Facilitator, projected for the class, with the live Scoreboard and the reveal at the end of each Round (shown in the UI as "Telão").
_Avoid_: Projector, dashboard, public panel

### Game

**Room**:
The single shared space of the application where all Players play together (shown in the UI as "Sala").
_Avoid_: Lobby, match, game

**Challenge**:
A scenario that describes what the Player must ask an LLM for, together with Keywords and a Reference prompt (shown in the UI as "Desafio").
_Avoid_: Activity, exercise, level, stage

**Keywords**:
Terms about a Challenge's subject that the prompt must mention to meet the Task Criterion (shown in the UI as "Palavras-chave").
_Avoid_: Tags, key terms

**Reference prompt**:
An example of a well-structured prompt for a Challenge, revealed to everyone when the Round closes (shown in the UI as "Prompt de referência").
_Avoid_: Answer key, right answer, ideal prompt

**Criterion**:
A check on the structure of a prompt (for example, defines a role, gives context, specifies the format) that is worth a fixed maximum number of points; the Criteria are the same for every Challenge (shown in the UI as "Critério").
_Avoid_: Rule, check, requirement

**Strength**:
How clearly an Attempt shows a Criterion, which sets the share of its points the Player earns: **full** (an explicit label with content, 100%), **partial** (a clear natural phrase, 70%) or **weak** (a bare mention, 30%). The highest strength wins; points are never added across signals. A Criterion with no signal is **missing** and earns nothing (shown in the UI as "parcial" for partial and weak, and "✕" for missing).
_Avoid_: Grade, quality, intensity

**Score**:
The sum, from 0 to 100, of the points each Criterion earns in an Attempt, given its Strength (shown in the UI as "Nota").
_Avoid_: Grade, result

**Round**:
A period in which a Challenge is open to all Players, started and closed by the Facilitator (shown in the UI as "Rodada").
_Avoid_: Turn

**Attempt**:
One prompt submission by a Player in a Round; each Player has at most 3 per Round (shown in the UI as "Tentativa").
_Avoid_: Submission, send, move

**Window**:
The Player's personal floating window where they write prompts and see the results of their Attempts; only that Player sees it (shown in the UI as "Janela").
_Avoid_: Panel, card, modal

**Scoreboard**:
The list of Players ordered by the sum of each Round's best Score, visible to everyone and updated in real time (shown in the UI as "Placar"). Ties are broken by fewer Attempts used in the Rounds where the Player scored and then by who reached the score first.
_Avoid_: Leaderboard, ranking, listing

**Achievement**:
A badge a Player earns by reaching a milestone in the game (for example, a maximum Score, or being the first to send) (shown in the UI as "Conquista").
_Avoid_: Badge, trophy, medal
