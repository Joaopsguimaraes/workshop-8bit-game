# 04: Competitive Scoreboard, reveal, Achievements and game feedback

**Size:** XL

**Spec:** `.scratch/workshop-game/spec.md`, stories 32–51.

**What to build:** The game gets a competitive feel. The Scoreboard sums each Round's best Score, with fair tiebreaking and each Player's status. The live event feed shows what is happening ("JO tirou 100!"), and Players earn the 5 Achievements. There are 8-bit sounds (off by default) and a LEVEL UP animation. When a Round closes, everyone sees the Reference prompt and the top 3 prompts, the moment of collective learning, and it stays on screen until the next Round.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] The Scoreboard total sums the Player's best Score in each Round (closed or open).
- [ ] Tiebreaker: fewer Attempts used in the Rounds where the Player scored, then who reached the score first. Tested through the Engine.
- [ ] `PLACAR.EXE` shows, per Player: position, Avatar, Nickname, total, status (online, offline, sent in the Round), Attempts used and Achievements; players who go offline keep their points.
- [ ] Achievement schema (playerId, roundId, type, createdAt); each Achievement is granted at most once per Player per Round.
- [ ] **Na mosca** (Score 100), **De primeira** (100 on the 1st Attempt), **Primeiro sangue** (first accepted Attempt of the Round), **Evolução** (later Attempt ≥ 1st Attempt + 30) and **Campeão da Rodada** (1st place on closing, with the same tiebreaker, only if the best Score is greater than 0). Each one tested through the Engine, including the cases where it must not be granted.
- [ ] Live event feed in `PLACAR.EXE` (Player entered, Attempt submitted, Score 100, Achievement earned, Round opened or closed) with no prompt text.
- [ ] On closing the Round, the reveal event carries the Reference prompt and the top 3 (Avatar, Nickname, Score, prompt); `PROMPT.EXE` shows the reveal until the Facilitator opens the next Round.
- [ ] Test: no event or snapshot sent to a Player contains another Player's prompt before the reveal.
- [ ] 8-bit sounds when submitting, when receiving the Score and when moving up in position; off by default, with a button to turn them on and the preference saved in the browser.
- [ ] LEVEL UP animation when the Player's Score improves in the Round or they move up on the Scoreboard.
