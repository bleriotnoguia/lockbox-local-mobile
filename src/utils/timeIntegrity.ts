import * as SecureStore from 'expo-secure-store';

/**
 * Time-tampering protection.
 *
 * The app cannot trust `Date.now()` alone — the user can change the device
 * clock at will. We layer two defenses:
 *
 *  1. Anti-rollback: persist the highest wall-clock value we've ever observed
 *     (`maxWallTimeSeen`) in SecureStore. If `Date.now()` ever falls more than
 *     `ROLLBACK_TOLERANCE_MS` below it, the clock was rolled back.
 *
 *  2. In-session forward-jump: use `performance.now()` (a monotonic clock that
 *     keeps ticking while the app is alive and cannot be moved by the user)
 *     as a baseline. If wall-clock advances much faster than monotonic between
 *     two snapshots, the clock jumped forward.
 *
 * Caveats: `performance.now()` resets when the JS engine restarts (cold app
 * start), so cross-session forward jumps cannot be detected from JS alone.
 * That gap is documented and accepted; the anti-rollback covers naive
 * backward changes and the in-session check covers the common pattern of
 * sending the app to background, changing the clock, then coming back.
 */

const MAX_WALL_KEY = 'lockbox_time_max_wall';
const FORWARD_JUMP_TOLERANCE_MS = 60_000;
const ROLLBACK_TOLERANCE_MS = 60_000;

export type TamperReason = 'rollback' | 'forward_jump';

export type IntegrityResult =
  | { tampered: false }
  | { tampered: true; reason: TamperReason; wallDelta: number; monoDelta: number };

// In-memory baseline for the current JS session. Reset on every cold start.
let sessionWallBaseline: number | null = null;
let sessionMonoBaseline: number | null = null;

function readPerfNow(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

export async function initTimeIntegrity(): Promise<void> {
  sessionWallBaseline = Date.now();
  sessionMonoBaseline = readPerfNow();
  // Seed the persisted max so we never see a sudden "rollback" right after install.
  try {
    const stored = await SecureStore.getItemAsync(MAX_WALL_KEY);
    if (!stored) {
      await SecureStore.setItemAsync(MAX_WALL_KEY, String(sessionWallBaseline));
    }
  } catch {
    // SecureStore not available — fall through silently. The check will simply be a no-op.
  }
}

/**
 * Returns the integrity status against the persisted and session baselines.
 * Updates `maxWallTimeSeen` to the highest value observed.
 */
export async function checkTimeIntegrity(): Promise<IntegrityResult> {
  const wallNow = Date.now();
  const monoNow = readPerfNow();

  let storedMax: number | null = null;
  try {
    const raw = await SecureStore.getItemAsync(MAX_WALL_KEY);
    storedMax = raw ? Number(raw) : null;
    if (storedMax != null && !Number.isFinite(storedMax)) storedMax = null;
  } catch {
    storedMax = null;
  }

  if (storedMax != null && wallNow < storedMax - ROLLBACK_TOLERANCE_MS) {
    return {
      tampered: true,
      reason: 'rollback',
      wallDelta: wallNow - storedMax,
      monoDelta: 0,
    };
  }

  if (sessionWallBaseline != null && sessionMonoBaseline != null) {
    const wallDelta = wallNow - sessionWallBaseline;
    const monoDelta = monoNow - sessionMonoBaseline;
    // Forward jump: wall has moved noticeably more than monotonic.
    if (wallDelta - monoDelta > FORWARD_JUMP_TOLERANCE_MS) {
      return {
        tampered: true,
        reason: 'forward_jump',
        wallDelta,
        monoDelta,
      };
    }
    // Backward jump within a single session.
    if (monoDelta - wallDelta > FORWARD_JUMP_TOLERANCE_MS) {
      return {
        tampered: true,
        reason: 'rollback',
        wallDelta,
        monoDelta,
      };
    }
  }

  // Healthy reading — persist new high-water mark.
  if (storedMax == null || wallNow > storedMax) {
    try {
      await SecureStore.setItemAsync(MAX_WALL_KEY, String(wallNow));
    } catch {
      // ignore
    }
  }
  return { tampered: false };
}

/**
 * Re-anchor the in-session baselines (call after a legitimate gap such as
 * resuming from a long background period, once the integrity check passed).
 */
export function refreshSessionBaseline(): void {
  sessionWallBaseline = Date.now();
  sessionMonoBaseline = readPerfNow();
}
