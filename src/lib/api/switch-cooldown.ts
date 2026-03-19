/**
 * Switch-Team Cooldown
 *
 * Shared state between switch-team route and proxy route.
 * When switch-team rotates tokens, the proxy should skip token refresh
 * for a brief cooldown period to avoid using stale refresh tokens.
 *
 * Without this, concurrent API requests during tenant switch may try
 * to refresh using the OLD refresh token (already invalidated by switch-team),
 * causing "refresh token already been used" errors.
 */

let lastSwitchTimestamp = 0

const COOLDOWN_MS = 3000 // 3 seconds

/**
 * Mark that a switch-team just completed (tokens were rotated).
 * Called from the switch-team route handler.
 */
export function markSwitchTeamCompleted(): void {
  lastSwitchTimestamp = Date.now()
}

/**
 * Check if we're in the post-switch cooldown period.
 * During this period, the proxy should skip token refresh to avoid
 * using stale refresh tokens that were just rotated.
 */
export function isInSwitchCooldown(): boolean {
  return lastSwitchTimestamp > 0 && Date.now() - lastSwitchTimestamp < COOLDOWN_MS
}
