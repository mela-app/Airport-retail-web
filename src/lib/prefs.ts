/**
 * Per-browser conveniences (language, last persona). Storage can be unavailable (private windows, blocked
 * site data), so every access is guarded and the app works without it.
 */
const PREFIX = 'arm.';

export function readPref(key: string): string | null {
  try {
    return window.localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

export function writePref(key: string, value: string): void {
  try {
    window.localStorage.setItem(PREFIX + key, value);
  } catch {
    // not available: the preference lasts for this page view only
  }
}
