# 03: Complete Evaluator and the 5 seed Challenges

**Size:** L

**Spec:** `.scratch/workshop-game/spec.md`, stories 19–26, 65 and 66, and the "Evaluator" and "Challenge catalog" sections. ADR-0002.

**What to build:** The Player is now evaluated by the six structure Criteria, recognized both by labels and by natural phrases, in pt-BR and in English. A prompt with empty labels scores little, and an excellent prompt for another Challenge loses the Task Criterion. The Facilitator has the 5 Challenges ready to play, each with a Reference prompt that scores 100. Developed with TDD through the Evaluator's public interface, a pure function.

**Blocked by:** 02

**Status:** done (validated against the code and the Vitest suite on 2026-10-14). Superseded in part by issues 06 and 07: the Criteria are now eight, Tarefa needs one Keywords group, and the weights follow the spec.

- [x] The six Criteria with weights Papel 15, Contexto 20, Tarefa 20, Formato 20, Restrições 15 and Exemplos 10 (total 100), case- and accent-insensitive.
- [x] Labels recognized in the forms `Rótulo:`, `## Rótulo`, `**Rótulo**` and `<rotulo>…</rotulo>`, in pt-BR and in English.
- [x] Natural phrases recognized as in the spec's table (e.g. "atue como", "o público é", "em tópicos", "não inclua", "por exemplo", "you are", "avoid").
- [x] Minimum content: the excerpt that triggers a Criterion must have at least 4 words besides the marker; `Papel: x. Contexto: x. Formato: x. Restrições: x. Exemplo: x.` scores less than 20.
- [x] The same excerpt can score for more than one Criterion (e.g. "no máximo 6 palavras por item" counts for Formato and Restrições).
- [x] Tarefa requires an action verb and at least 2 distinct groups of the Challenge's Keywords; Challenge 1's Reference prompt evaluated on Challenge 2 loses the Tarefa.
- [x] Verdicts: 100 is "Na mosca!"; 80 to 99, "Quase lá"; 50 to 79, "No caminho certo"; below 50, "Longe do alvo". Tests at the boundaries 49/50, 79/80 and 99/100.
- [x] Fixed tip in pt-BR, with a mini example, for each Criterion.
- [x] Seed with the 5 Challenges, each with a scenario, Keywords and a Reference prompt:
  1. Remote work.
  2. Email scheduling an alignment meeting.
  3. Meeting notes turned into a summary and the next meeting's agenda.
  4. Extracting data from a .docx contract into JSON, with "não encontrado".
  5. Key points, questions and deadline from a long client email.
- [x] Test: each seed Challenge's Reference prompt scores 100.
- [x] Test: a bad one-line prompt scores low; each Criterion is recognized by label and by natural phrase, in pt-BR and in English.
