// localStorage access with a fallback: in a private window or with blocked data it can fail.
export function readItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeItem(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Without storage the game keeps working; it just won't remember the session.
  }
}

export function removeItem(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nothing to do.
  }
}
