/**
 * Tiny in-memory login throttle (per email + IP). Good enough for a single
 * server instance; use Redis or similar if you deploy several instances.
 */
const WINDOW_MS = 15 * 60 * 1000
const MAX_FAILURES = 8

const failures = new Map<string, { count: number; resetAt: number }>()

export function isLoginBlocked(key: string): boolean {
  const entry = failures.get(key)
  if (!entry) return false
  if (entry.resetAt < Date.now()) {
    failures.delete(key)
    return false
  }
  return entry.count >= MAX_FAILURES
}

export function recordLoginFailure(key: string): void {
  const now = Date.now()
  const entry = failures.get(key)
  if (!entry || entry.resetAt < now) failures.set(key, { count: 1, resetAt: now + WINDOW_MS })
  else entry.count += 1
}

export function clearLoginFailures(key: string): void {
  failures.delete(key)
}
