import { describe, expect, it } from "vitest";
import { createPresence } from "./presence";

describe("presence", () => {
  it("considers online the Player with one open connection", () => {
    const presence = createPresence();

    presence.connect("player-1", "socket-a");

    expect(presence.isOnline("player-1")).toBe(true);
    expect(presence.isOnline("jogador-2")).toBe(false);
  });

  it("stays online while another tab is open", () => {
    const presence = createPresence();
    presence.connect("player-1", "socket-a");
    presence.connect("player-1", "socket-b");

    presence.disconnect("socket-a");

    expect(presence.isOnline("player-1")).toBe(true);
  });

  it("goes offline when the last connection closes", () => {
    const presence = createPresence();
    presence.connect("player-1", "socket-a");
    presence.connect("player-1", "socket-b");

    presence.disconnect("socket-a");
    presence.disconnect("socket-b");

    expect(presence.isOnline("player-1")).toBe(false);
  });

  it("ignores the disconnection of a socket that was not registered", () => {
    const presence = createPresence();

    expect(() => presence.disconnect("socket-fantasma")).not.toThrow();
  });
});
