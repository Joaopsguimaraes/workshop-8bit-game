# 08: Floating `DICAS.TXT` window with per-Attempt tips and a prompt guide

**Status:** done (Vitest suite green, 237 tests; manual two-tab check still open)

**Spec:** `.scratch/workshop-game/spec.md`, stories 21, 69, 70, 71, and the "Player UI" section (`DICAS.TXT`).

**What to build:** A new floating window, `DICAS.TXT`, opens on the Player's desktop alongside `PROMPT.EXE`, `DESAFIO.TXT` and `PLACAR.EXE`, and reuses the existing window frame. It has two sections.
- **"Dicas deste envio"**: one tip for each Criterion that is missing or only partly met in the Player's last accepted Attempt, ordered by the points lost. Each tip links to the section of the Anthropic prompting documentation it comes from. Before any Attempt, it shows a short placeholder. It is updated after every accepted submission.
- **"Guia de um bom prompt"**: a fixed guide covering the eight Criteria, always visible.

The Incerteza tip cites the workshop's guide, not the official page, because the official page does not recommend an uncertainty instruction. All texts are pt-BR and fixed per Criterion; no tip is generated per Player.

**Blocked by:** 07 (done)

- [x] `DICAS.TXT` appears on the desktop with the other windows, and can be dragged, minimized and restored; its position is saved per browser.
- [x] After an accepted Attempt, "Dicas deste envio" lists one tip per Criterion that is missing or partial, ordered by points lost.
- [x] A Criterion at its maximum produces no tip.
- [x] Each tip links to the matching section of the Anthropic prompting documentation; the Incerteza tip cites the guide instead.
- [x] Before any Attempt, "Dicas deste envio" shows the placeholder.
- [x] "Guia de um bom prompt" is always visible and covers the eight Criteria.
- [x] Tips are fixed texts from the Evaluator's Criteria; the window never shows another Player's prompt.
- [ ] Manual check with two tabs: each Player's tips reflect only that Player's last Attempt.
- [x] Tests cover the ordering of tips and the no-tip case for a Criterion at maximum (Evaluator or a pure helper, not the UI).
