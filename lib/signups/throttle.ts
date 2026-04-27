const STORAGE_KEY = "cc_team_signup_last_submit_ms";
const DEFAULT_MS = 5000;

export function canSubmitNow(minIntervalMs = DEFAULT_MS): boolean {
  if (typeof window === "undefined") return true;
  const last = Number.parseInt(sessionStorage.getItem(STORAGE_KEY) ?? "0", 10);
  if (!Number.isFinite(last)) return true;
  return Date.now() - last >= minIntervalMs;
}

export function markSubmittedNow(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
}

export function msUntilNextSubmit(minIntervalMs = DEFAULT_MS): number {
  if (typeof window === "undefined") return 0;
  const last = Number.parseInt(sessionStorage.getItem(STORAGE_KEY) ?? "0", 10);
  if (!Number.isFinite(last)) return 0;
  const elapsed = Date.now() - last;
  return Math.max(0, minIntervalMs - elapsed);
}
