# 02: Round and Attempt end to end (Facilitator, timer and minimal Evaluator)

**Size:** XL

**Spec:** `.scratch/workshop-game/spec.md`, stories 14–22, 27–30, 33, 52–59 and 64.

**What to build:** The Facilitator enters `/facilitador` with a PIN, chooses a Challenge and opens the Round, with an optional timer. All Players see the scenario in `DESAFIO.TXT` and write prompts in `PROMPT.EXE`. Each Attempt immediately gets a Score from 0 to 100, a verdict and a ✓/✕ checklist with tips. The Player has up to 3 Attempts, and the best one appears on everyone's `PLACAR.EXE` in real time. The Round ends when the Facilitator clicks close or when the timer reaches zero, and from then on nobody can submit.

The Evaluator is born here with the **final interface** (`evaluate(prompt, challenge) → Evaluation`), but with only 2 Criteria (Role and Task) and only Challenge 1 in the seed. Ticket 03 completes the Criteria.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] The Facilitator's PIN comes from an environment variable; `/facilitador` asks for the PIN and issues a session (httpOnly cookie) that the Facilitator's socket channel validates; a wrong PIN is refused. The Facilitator does not appear on the Scoreboard.
- [ ] Challenge catalog loaded from a versioned seed file, with Challenge 1 (remote work): identifier, order, title, scenario, Keywords in groups and Reference prompt.
- [ ] The Facilitator panel lists the Challenges, marking the ones already played, opens the Round with an optional duration, closes it manually and shows how many Players have already submitted.
- [ ] Round schema (challengeId, openedAt, optional deadline, closedAt) and Attempt schema (playerId, roundId, number 1–3, prompt, Score, serialized Evaluation, createdAt).
- [ ] Engine commands: `openRound`, `closeRound`, `checkDeadline(now)` and `submitAttempt`; injectable clock; a server tick calls `checkDeadline`.
- [ ] Tested invariants: at most one open Round; a Challenge cannot be reopened in the same match; up to 3 Attempts per Player per Round; refusal without a Round, with the Round closed, with an empty prompt or with more than 4,000 characters; a refused submission does not consume an Attempt; an expired deadline closes the Round.
- [ ] The Player sees the scenario in `DESAFIO.TXT` when the Round opens, the character counter, the Attempts left and the countdown timer (when there is one); submitting is blocked when Attempts run out or the Round closes, including if the Player was typing.
- [ ] Minimal Evaluator with the Criteria Papel (15) and Tarefa (20; action verb and at least 2 groups of the Challenge's Keywords), returning an Evaluation with Score, verdict and, per Criterion, met, points and maximum, tip and recognized excerpt.
- [ ] `PROMPT.EXE` shows the Score, the verdict, the ✓/✕ checklist with points, a tip for the Criteria that failed and an excerpt for those that passed, plus the Round's Attempt history.
- [ ] The Scoreboard counts the Player's best Attempt in the Round and updates everyone in real time; the Scoreboard event **never** carries prompt text (guaranteed by a test).
- [ ] State (open Round, Attempts, deadline) survives a server restart.
