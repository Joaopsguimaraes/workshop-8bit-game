# 05: Remove Player, reset the match and Big screen

**Size:** L

**Spec:** `.scratch/workshop-game/spec.md`, stories 60–63.

**What to build:** The Facilitator gets the controls to run the workshop for real. They can remove a Player (e.g. an offensive Nickname) and reset the match for a new workshop. They can also project the Big screen mode full screen, with the large Scoreboard, the timer, the submission count, the event feed and the reveal at the end of each Round, so the class follows the game on the same screen.

**Blocked by:** 04

**Status:** done (validated against the code and the Vitest suite on 2026-10-14)

- [x] `removePlayer` command in the Engine: deletes the Player's Attempts and Achievements, frees the Nickname and updates everyone's Scoreboard. The removed Player goes back to the login screen, and their token stops working.
- [x] `resetMatch` command in the Engine: deletes Players, Rounds, Attempts and Achievements. All clients go back to the login screen.
- [x] The Facilitator panel lists the Players with a remove button and has the reset button with explicit confirmation.
- [x] Engine tests: after removal, the Nickname can be used again and the Player disappears from the Scoreboard; after reset, the state returns to the initial one and all Challenges are playable again.
- [x] Full-screen Big screen mode, accessible only with the Facilitator's session: large Scoreboard with Avatars and Achievements, current Challenge, timer, submission count and event feed, all live.
- [x] On closing the Round, the Big screen shows the reveal (Reference prompt and top 3) readable from a distance on a projector.
- [x] The Big screen follows the DOS/8-bit theme and has a layout readable from a distance (large fonts, high contrast).
