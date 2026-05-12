import Constants from 'expo-constants';
import { getSetting, setSetting } from '../db';

/**
 * App-version rollback protection.
 *
 * We track inside the DB (`settings` table, key `min_app_version`) the highest
 * app version that has ever opened this database. If a build older than that
 * value tries to open the DB, we refuse — this defends against a user
 * side-loading an older APK that lacks the time-tampering checks.
 *
 * Version comparison uses semantic numeric segments (major.minor.patch). A
 * trailing pre-release/build suffix is ignored.
 */

const MIN_APP_VERSION_KEY = 'min_app_version';

export function getCurrentAppVersion(): string {
  return Constants.expoConfig?.version ?? '0.0.0';
}

export function compareVersions(a: string, b: string): number {
  const parse = (v: string) =>
    v
      .split(/[-+]/)[0]
      .split('.')
      .map((part) => {
        const n = parseInt(part, 10);
        return Number.isFinite(n) ? n : 0;
      });

  const pa = parse(a);
  const pb = parse(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x - y;
  }
  return 0;
}

export interface VersionCheckResult {
  ok: boolean;
  current: string;
  required: string;
}

export async function checkAndRecordAppVersion(): Promise<VersionCheckResult> {
  const current = getCurrentAppVersion();
  const stored = (await getSetting(MIN_APP_VERSION_KEY)) ?? '0.0.0';

  if (compareVersions(current, stored) < 0) {
    return { ok: false, current, required: stored };
  }

  if (compareVersions(current, stored) > 0) {
    await setSetting(MIN_APP_VERSION_KEY, current);
  }
  return { ok: true, current, required: stored };
}
