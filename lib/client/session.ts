import { readItem, removeItem, writeItem } from "./storage";

const TOKEN_KEY = "workshop.token";

export function readToken(): string | null {
  return readItem(TOKEN_KEY);
}

export function saveToken(token: string): void {
  writeItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  removeItem(TOKEN_KEY);
}
