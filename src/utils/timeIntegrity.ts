import * as SecureStore from 'expo-secure-store';

/**
 * Time-tampering protection.
 *
 * Active layers:
 *
 *  1. Cross-session anti-rollback. We persist the highest wall-clock value
 *     ever observed in SecureStore. Any wall reading more than tolerance
 *     below it indicates the user moved the clock backward (e.g. to keep
 *     a relock from firing). See `checkWallRollback` / `recordWallHighWater`.
 *
 *  2. Monotonic-based auto-relock. After a successful unlock we snapshot
 *     `perf.now()` into `relock_mono_start`. The relock fires when either
 *     the wall timestamp expires OR enough monotonic time has elapsed,
 *     which defeats a backward clock jump intended to keep the lockbox
 *     open. See `hasMonoElapsed`.
 *
 * Removed: a per-lockbox forward-jump check that compared wall-vs-mono
 * elapsed since the unlock anchor. It produced false positives on long
 * countdowns: `performance.now()` (CLOCK_MONOTONIC via Hermes on Android,
 * mach_absolute_time on iOS) does NOT advance during device deep sleep,
 * so a phone that slept for most of a 1-2h countdown shows wallElapsed
 * ≫ monoElapsed even with no tampering. Pure JS cannot distinguish sleep
 * from a forward clock jump; a proper fix requires a native module
 * exposing a sleep-aware monotonic clock (`SystemClock.elapsedRealtime`
 * on Android, `mach_continuous_time` on iOS).
 *
 * The `unlock_wall_start` / `unlock_mono_start` columns and the
 * `verifiedInSession` tracking remain — they still drive the backward-
 * relock defense in layer 2.
 */

const MAX_WALL_KEY = 'lockbox_time_max_wall';
const ROLLBACK_TOLERANCE_MS = 60_000;
// A stored high-water more than this far ahead of `Date.now()` is treated
// as poisoned (the user advanced their clock in a previous session, then
// reverted) and reset rather than treated as evidence of a rollback. We
// trade a narrow window of anti-rollback weakness for the much more
// disruptive failure mode of locking the app forever.
const STALE_FUTURE_TOLERANCE_MS = 60_000;

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
    const poisoned =
      stored != null &&
      Number.isFinite(stored) &&
      stored > wallNow + STALE_FUTURE_TOLERANCE_MS;
    if (
      stored == null ||
      !Number.isFinite(stored) ||
      poisoned ||
      wallNow > stored
    ) {
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
    const wallNow = Date.now();
    // Stored value is implausibly in the future — treat the persisted
    // high-water as poisoned and refuse to call this a rollback.
    if (stored > wallNow + STALE_FUTURE_TOLERANCE_MS) return false;
    return wallNow < stored - ROLLBACK_TOLERANCE_MS;
  } catch {
    return false;
  }
}

/**
 * Returns true when at least `durationMs` of monotonic time has elapsed
 * since `monoStart`. Used by auto-relock to fire even if the wall clock
 * was rolled back to prevent `relock_timestamp <= Date.now()` from ever
 * becoming true. Returns false when the anchor is unverifiable in the
 * current JS session — caller should fall back to wall-only.
 */
export function hasMonoElapsed(
  lockboxId: number,
  monoStart: number | null,
  durationMs: number
): boolean {
  if (monoStart == null) return false;
  if (!verifiedInSession.has(lockboxId)) return false;
  return readMonoNow() - monoStart >= durationMs;
}
