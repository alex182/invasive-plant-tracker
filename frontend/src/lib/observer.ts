const KEY = "ipt-observer";

/** The name attached to plants/treatments this device logs. Empty string if unset. */
export function getObserver(): string {
  try {
    return localStorage.getItem(KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

export function setObserver(name: string): void {
  try {
    const trimmed = name.trim();
    if (trimmed) localStorage.setItem(KEY, trimmed);
    else localStorage.removeItem(KEY);
  } catch {
    // Private mode / storage disabled — attribution just stays unset.
  }
}
