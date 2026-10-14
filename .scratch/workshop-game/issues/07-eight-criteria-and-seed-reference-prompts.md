# 07: Eight Criteria and seed Reference prompts

**Status:** done (commit `1235847`; Vitest suite green, 231 tests)

**Spec:** `.scratch/workshop-game/spec.md`, stories 31, 32, and the "Evaluator" and "Challenge catalog" sections.

**What to build:** The Evaluator grows from six to eight Criteria. Delimiters count when there are at least two isolated blocks (XML tag pairs with any name, Markdown headings, or `---` separators). Uncertainty counts when the prompt gives a conditional instruction with the action to take, such as "se não estiver no texto, escreva 'não informado'". The weights are Papel 15, Contexto 15, Tarefa 20, Formato 15, Restrições 10, Exemplos 10, Delimitadores 10, Incerteza 5. The five seed Challenges' Reference prompts use all eight Criteria at full strength and score 100. `PROMPT.EXE` shows all eight rows.

**Blocked by:** 06

- [x] Delimiters: two isolated blocks give full points; one block with content gives 70%; a single tag or heading without content gives 30%.
- [x] Uncertainty: a conditional instruction with the action gives full points; a conditional phrase without the action gives 70%; "não informado" or "não encontrado" alone gives 30%.
- [x] The eight weights add up to 100.
- [x] Every seed Challenge's Reference prompt scores 100 (`catalog.test.ts`).
- [x] Challenge 4's Reference prompt uses the "não encontrado" instruction, and the Reference prompts use delimiters.
- [x] `PROMPT.EXE` shows eight rows, each with its mark, points and excerpt.
- [x] Verdict boundaries and the weights are covered by tests.
- [x] Evaluator tests cover both new Criteria.
