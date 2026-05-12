import * as SecureStore from 'expo-secure-store';

/**
 * Time-tampering protection.
 *
 * Two layers:
 *
 *  1. Per-lockbox monotonic check. When an unlock countdown is started or a
 *     scheduled unlock is armed, we snapshot `Date.now()` and `perf.now()`
 *     into the row (`unlock_wall_start`, `unlock_mono_start`) and remember
 *     the lockbox id in `verifiedInSession`. At completion (countdown
 *     expiry or schedule target reached), we verify the wall elapsed since
 *     the anchor hasn't outrun the monotonic elapsed — a forward clock
 *     jump would. See `isWallMonoTampered`.
 *
 *  2. Cross-session anti-rollback. We persist the highest wall-clock value
 *     ever observed in SecureStore. Any wall reading more than tolerance
 *     below it indicates the user moved the clock backward (e.g. to keep
 *     a relock from firing).
 *
 * Limits:
 *  - `perf.now()` is process-local. An unlock/schedule whose anchor was
 *    captured in a previous JS process cannot be verified by layer 1
 *    (`verifiedInSession` resets on cold start). Forward-clock manipulation
 *    that spans an app restart is NOT detected by this layer — only the
 *    cross-session anti-rollback catches backward jumps in that window.
 *  - On Android, `perf.now()` (CLOCK_MONOTONIC via Hermes) pauses during
 *    deep device sleep / doze. Long countdowns that span heavy idle
 *    periods may produce false positives; tolerance is calibrated to
 *    scale with the expected duration.
 */

const MAX_WALL_KEY = 'lockbox_time_max_wall';
const ROLLBACK_TOLERANCE_MS = 60_000;

function readMonoNow(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

export const getMonoNow = readMonoNow;

const verifiedInSession = new Set<number>();

export function markUnlockVerifiedInSession(lockboxId: number): void {
  verifiedInSession.add(lockboxId);
}

export async function recordWallHighWater(): Promise<void> {
  try {
    const wallNow = Date.now();
    const raw = await SecureStore.getItemAsync(MAX_WALL_KEY);
    const stored = raw ? Number(raw) : null;
    if (stored == null || !Number.isFinite(stored) || wallNow > stored) {
      await SecureStore.setItemAsync(MAX_WALL_KEY, String(wallNow));
    }
  } catch {
    // SecureStore unavailable — anti-rollback degrades to a no-op.
  }
}

export async function checkWallRollback(): Promise<boolean> {
  try {
    const raw = await SecureStore.getItemAsync(MAX_WALL_KEY);
    if (!raw) return false;
    const stored = Number(raw);
    if (!Number.isFinite(stored)) return false;
    return Date.now() < stored - ROLLBACK_TOLERANCE_MS;
  } catch {
    return false;
  }
}

/**
 * Adaptive forward-jump tolerance. Base 60 s, plus 10 % of the expected
 * countdown duration, capped at 5 minutes. Longer countdowns are more
 * likely to encounter legitimate mono/wall drift (doze, GC, suspension)
 * so we widen the band proportionally.
 */
export function getForwardTolerance(durationSeconds: number): number {
  const safe = Math.max(0, durationSeconds);
  return Math.min(60_000 + safe * 100, 300_000);
}

/**
 * Returns true when the wall clock has advanced significantly faster than
 * `perf.now()` since the anchor was captured — strong evidence of a
 * forward clock jump. Returns null when the check cannot be performed
 * (missing anchor, or anchor from a previous JS process); callers should
 * treat that as "unverified" and rely on layer 2.
 */
export function isWallMonoTampered(
  lockboxId: number,
  wallStart: number | null,
  monoStart: number | null,
  toleranceMs: number
): boolean | null {
  if (wallStart == null || monoStart == null) return null;
  if (!verifiedInSession.has(lockboxId)) return null;

  const wallElapsed = Date.now() - wallStart;
  const monoElapsed = readMonoNow() - monoStart;
  return wallElapsed - monoElapsed > toleranceMs;
}
