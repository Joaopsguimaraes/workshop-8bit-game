# 06: Graded scoring for the six Criteria

**Status:** done (commits `cebf686`, `7b3857c`; Vitest suite green, 231 tests)

**Spec:** `.scratch/workshop-game/spec.md`, stories 17–26, and the "Evaluator" section (scoring by strength, Fixed Criteria table).

**What to build:** A Player's prompt earns points by the strength of each signal, not all-or-nothing. A label with content gives full points, a clear natural phrase gives 70%, and a weak mention gives 30%. Task recognizes an action verb from the broader verb list together with one Keywords group of the Challenge. A label counts when it has at least one word of content, so `Papel: consultor` scores in full. In `PROMPT.EXE`, each Criterion shows ✓ or "parcial" with its points and the recognized excerpt, and the Attempt keeps the level reached by each Criterion.

**Blocked by:** None (builds on the Evaluator from issue 03).

- [x] A label with content gives full points; a label with no word of content gives none.
- [x] A clear natural phrase gives 70% of the Criterion's points; a weak mention gives 30%; the highest level wins and points are not added across signals.
- [x] Task: a verb plus one Keywords group gives 70%; a verb alone or a Keywords group alone gives 30%.
- [x] Points are the maximum times the level, rounded to the nearest integer; the Score never exceeds 100.
- [x] Recognition works with `<papel>…</papel>` and with "Você é…", "Atue como…", "sendo um especialista", "as an expert", in pt-BR and English.
- [x] Regression: the e-mail Challenge prompt scores more than 15, with Papel and Tarefa recognized.
- [x] `PROMPT.EXE` shows ✓ or "parcial" per Criterion, with points and the recognized excerpt.
- [x] The stored Attempt keeps the level of each Criterion.
- [x] Evaluator tests cover the levels, the label rule and the Task rule.
- [ ] Manual check in the browser: `**Tarefa**` (bold label) is recognized. No automated test covers this form yet.
