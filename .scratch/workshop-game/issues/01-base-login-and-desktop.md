# 01: Project base, login with Nickname and DOS desktop

**Size:** L

**Spec:** `.scratch/workshop-game/spec.md`, stories 1–13, 31 and 36 (presence).

**What to build:** A Player opens the application, enters with only a Nickname, sees the Avatar preview while typing, and lands on an MS-DOS/8-bit desktop with three draggable windows: `PROMPT.EXE` (in the state `AGUARDANDO O FACILITADOR..._`), `DESAFIO.TXT` (empty) and `PLACAR.EXE`. `PLACAR.EXE` shows, live, all Players connected from other tabs, with Avatar and online/offline status. Reloading the page returns the Player to the same Nickname.

This ticket sets up the base: git repository, Next.js with a custom Node server and Socket.IO in the same process (ADR-0001), Prisma over SQLite in a file, Vitest, Tailwind, shadcn with the 8bitcn registry and the DOS visual theme. The Game Engine is born as the only entry point for changing the Room's state.

**Blocked by:** None (can start immediately)

**Status:** done (validated against the code and the Vitest suite on 2026-10-14)

- [x] `git init` with `main` as the default branch; project managed with pnpm; scripts for dev, build, start, database migration and tests.
- [x] Next.js runs with a custom Node server and Socket.IO in the same process; a single command starts everything.
- [x] Prisma over SQLite in a file, with the Player schema (nickname, unique normalized nickname, initials, unique token, createdAt).
- [x] Tailwind, shadcn and 8bitcn components installed; DOS/8-bit theme (pixel font, terminal colors, window borders) applied; all text in pt-BR.
- [x] The login screen explains that the Avatar uses the first two letters of the Nickname and shows the Avatar preview updating live.
- [x] Nickname rules: after trimming spaces, 2 to 16 characters, only letters (with accents), numbers and spaces, and at least 2 alphanumeric characters. Each violation shows a specific pt-BR message.
- [x] Uniqueness compares the lowercase, accent-free Nickname ("João" and "JOAO" collide), with the message "Nickname já em uso".
- [x] Avatar initials: the first 2 alphanumeric characters, without accents, in uppercase ("Élio" becomes "EL").
- [x] The token is saved in the browser; reloading or reopening the tab resumes the same Player; an invalid token returns to the login.
- [x] Game Engine with `enter(nickname)`, `resume(token)` and `playerState(token)`, tested with Vitest against a clean SQLite test database per test.
- [x] `PLACAR.EXE` lists Players with Avatar, Nickname and online/offline status, updating in real time across tabs; presence lives only in memory, derived from socket connections.
- [x] The windows `PROMPT.EXE`, `DESAFIO.TXT` and `PLACAR.EXE` can be dragged, minimized and restored; positions are saved in the browser and survive a reload.
- [x] With no open Round, `PROMPT.EXE` shows `AGUARDANDO O FACILITADOR..._` with a blinking cursor.
