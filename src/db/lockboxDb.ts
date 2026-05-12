import { getDatabase } from './database';
import type { Lockbox, AccessLogEntry } from '../types';

const SELECT_LOCKBOX = `SELECT id, name, content, category, is_locked,
  unlock_delay_seconds, relock_delay_seconds, unlock_timestamp, relock_timestamp,
  created_at, updated_at, reflection_enabled, reflection_message, reflection_checklist,
  penalty_enabled, penalty_seconds, panic_code_hash, panic_code_used, scheduled_unlock_at,
  tags
  FROM lockboxes`;

interface RawLockboxRow {
  id: number;
  name: string;
  content: string;
  category: string | null;
  is_locked: number;
  unlock_delay_seconds: number;
  relock_delay_seconds: number;
  unlock_timestamp: number | null;
  relock_timestamp: number | null;
  created_at: number;
  updated_at: number;
  reflection_enabled: number;
  reflection_message: string | null;
  reflection_checklist: string | null;
  penalty_enabled: number;
  penalty_seconds: number;
  panic_code_hash: string | null;
  panic_code_used: number;
  scheduled_unlock_at: number | null;
  tags: string | null;
}

function rowToLockbox(row: RawLockboxRow): Lockbox {
  return {
    id: row.id,
    name: row.name,
    content: row.content,
    category: row.category,
    is_locked: row.is_locked === 1,
    unlock_delay_seconds: row.unlock_delay_seconds,
    relock_delay_seconds: row.relock_delay_seconds,
    unlock_timestamp: row.unlock_timestamp,
    relock_timestamp: row.relock_timestamp,
    created_at: row.created_at,
    updated_at: row.updated_at,
    reflection_enabled: (row.reflection_enabled ?? 0) === 1,
    reflection_message: row.reflection_message ?? null,
    reflection_checklist: row.reflection_checklist ?? null,
    penalty_enabled: (row.penalty_enabled ?? 0) === 1,
    penalty_seconds: row.penalty_seconds ?? 0,
    panic_code_hash: row.panic_code_hash ?? null,
    panic_code_used: (row.panic_code_used ?? 0) === 1,
    scheduled_unlock_at: row.scheduled_unlock_at ?? null,
    tags: row.tags ?? null,
  };
}

export async function getAllLockboxes(): Promise<Lockbox[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<RawLockboxRow>(
    `${SELECT_LOCKBOX} ORDER BY name ASC`
  );
  return rows.map(rowToLockbox);
}

export async function getLockbox(id: number): Promise<Lockbox | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<RawLockboxRow>(
    `${SELECT_LOCKBOX} WHERE id = ?`,
    [id]
  );
  return row ? rowToLockbox(row) : null;
}

export interface CreateLockboxDbInput {
  name: string;
  content: string;
  category: string | null;
  unlock_delay_seconds: number;
  relock_delay_seconds: number;
  reflection_enabled: boolean;
  reflection_message: string | null;
  reflection_checklist: string | null;
  penalty_enabled: boolean;
  penalty_seconds: number;
  panic_code_hash: string | null;
  scheduled_unlock_at: number | null;
  tags: string | null;
}

export async function createLockbox(
  input: CreateLockboxDbInput
): Promise<Lockbox> {
  const db = await getDatabase();
  const now = Date.now();

  const result = await db.runAsync(
    `INSERT INTO lockboxes (name, content, category, is_locked, unlock_delay_seconds,
      relock_delay_seconds, created_at, updated_at,
      reflection_enabled, reflection_message, reflection_checklist,
      penalty_enabled, penalty_seconds, panic_code_hash, scheduled_unlock_at, tags)
     VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.name,
      input.content,
      input.category,
      input.unlock_delay_seconds,
      input.relock_delay_seconds,
      now,
      now,
      input.reflection_enabled ? 1 : 0,
      input.reflection_message,
      input.reflection_checklist,
      input.penalty_enabled ? 1 : 0,
      input.penalty_seconds,
      input.panic_code_hash,
      input.scheduled_unlock_at,
      input.tags,
    ]
  );

  const lockbox = await getLockbox(result.lastInsertRowId);
  if (!lockbox) throw new Error('Failed to create lockbox');
  return lockbox;
}

export interface UpdateLockboxDbInput {
  id: number;
  name?: string;
  content?: string;
  category?: string | null;
  unlock_delay_seconds?: number;
  relock_delay_seconds?: number;
  reflection_enabled?: boolean;
  reflection_message?: string | null;
  reflection_checklist?: string | null;
  penalty_enabled?: boolean;
  penalty_seconds?: number;
  panic_code_hash?: string | null;
  scheduled_unlock_at?: number | null;
  tags?: string | null;
}

export async function updateLockbox(
  input: UpdateLockboxDbInput
): Promise<Lockbox> {
  const db = await getDatabase();
  const now = Date.now();
  const current = await getLockbox(input.id);
  if (!current) throw new Error('Lockbox not found');

  await db.runAsync(
    `UPDATE lockboxes SET
      name = ?, content = ?, category = ?,
      unlock_delay_seconds = ?, relock_delay_seconds = ?,
      reflection_enabled = ?, reflection_message = ?, reflection_checklist = ?,
      penalty_enabled = ?, penalty_seconds = ?, panic_code_hash = ?,
      scheduled_unlock_at = ?, tags = ?, updated_at = ?
     WHERE id = ?`,
    [
      input.name ?? current.name,
      input.content ?? current.content,
      input.category !== undefined ? input.category : current.category,
      input.unlock_delay_seconds ?? current.unlock_delay_seconds,
      input.relock_delay_seconds ?? current.relock_delay_seconds,
      (input.reflection_enabled ?? current.reflection_enabled) ? 1 : 0,
      input.reflection_message !== undefined
        ? input.reflection_message
        : current.reflection_message,
      input.reflection_checklist !== undefined
        ? input.reflection_checklist
        : current.reflection_checklist,
      (input.penalty_enabled ?? current.penalty_enabled) ? 1 : 0,
      input.penalty_seconds ?? current.penalty_seconds,
      input.panic_code_hash !== undefined
        ? input.panic_code_hash
        : current.panic_code_hash,
      input.scheduled_unlock_at !== undefined
        ? input.scheduled_unlock_at
        : current.scheduled_unlock_at,
      input.tags !== undefined ? input.tags : current.tags,
      now,
      input.id,
    ]
  );

  const updated = await getLockbox(input.id);
  if (!updated) throw new Error('Lockbox not found after update');
  return updated;
}

export async function deleteLockbox(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM lockboxes WHERE id = ?', [id]);
}

export async function unlockLockbox(id: number): Promise<Lockbox> {
  const db = await getDatabase();
  const now = Date.now();
  const current = await getLockbox(id);
  if (!current) throw new Error('Lockbox not found');

  const unlockTimestamp = now + current.unlock_delay_seconds * 1000;

  await db.runAsync(
    'UPDATE lockboxes SET unlock_timestamp = ?, updated_at = ? WHERE id = ?',
    [unlockTimestamp, now, id]
  );

  await logAccessEvent(id, 'unlock_requested');
  const result = await getLockbox(id);
  if (!result) throw new Error('Lockbox not found');
  return result;
}

export async function cancelUnlock(id: number): Promise<Lockbox> {
  const db = await getDatabase();
  const now = Date.now();
  const current = await getLockbox(id);
  if (!current) throw new Error('Lockbox not found');

  const newDelay = current.penalty_enabled
    ? current.unlock_delay_seconds + current.penalty_seconds
    : current.unlock_delay_seconds;

  await db.runAsync(
    `UPDATE lockboxes SET is_locked = 1, unlock_timestamp = NULL, scheduled_unlock_at = NULL,
      unlock_delay_seconds = ?, updated_at = ?
     WHERE id = ?`,
    [newDelay, now, id]
  );

  await logAccessEvent(id, 'unlock_cancelled');
  const result = await getLockbox(id);
  if (!result) throw new Error('Lockbox not found');
  return result;
}

export async function extendUnlockDelay(
  id: number,
  additionalSeconds: number
): Promise<Lockbox> {
  const db = await getDatabase();
  const now = Date.now();
  const current = await getLockbox(id);
  if (!current) throw new Error('Lockbox not found');

  const additionalMs = additionalSeconds * 1000;
  const newDelay = current.unlock_delay_seconds + additionalSeconds;

  const newUnlockTimestamp = current.unlock_timestamp
    ? current.unlock_timestamp + additionalMs
    : null;
  const newScheduled = current.scheduled_unlock_at
    ? current.scheduled_unlock_at + additionalMs
    : null;

  await db.runAsync(
    `UPDATE lockboxes SET unlock_delay_seconds = ?, unlock_timestamp = ?,
      scheduled_unlock_at = ?, updated_at = ?
     WHERE id = ?`,
    [newDelay, newUnlockTimestamp, newScheduled, now, id]
  );

  await logAccessEvent(id, 'extend_delay');
  const result = await getLockbox(id);
  if (!result) throw new Error('Lockbox not found');
  return result;
}

export async function relockLockbox(id: number): Promise<Lockbox> {
  const db = await getDatabase();
  const now = Date.now();

  await db.runAsync(
    `UPDATE lockboxes SET is_locked = 1, unlock_timestamp = NULL,
      relock_timestamp = NULL, updated_at = ?
     WHERE id = ?`,
    [now, id]
  );

  const result = await getLockbox(id);
  if (!result) throw new Error('Lockbox not found');
  return result;
}

export async function usePanicCode(
  id: number,
  codeHash: string
): Promise<Lockbox | null> {
  const db = await getDatabase();
  const current = await getLockbox(id);
  if (!current) throw new Error('Lockbox not found');

  if (!current.panic_code_hash || current.panic_code_used) return null;
  if (current.panic_code_hash !== codeHash) return null;

  const now = Date.now();
  const relockTimestamp = now + current.relock_delay_seconds * 1000;

  await db.runAsync(
    `UPDATE lockboxes SET is_locked = 0, unlock_timestamp = NULL, scheduled_unlock_at = NULL,
      relock_timestamp = ?, panic_code_used = 1, updated_at = ?
     WHERE id = ?`,
    [relockTimestamp, now, id]
  );

  await logAccessEvent(id, 'panic_used');
  return getLockbox(id);
}

export async function resetPanicCode(
  id: number,
  newCodeHash: string | null
): Promise<Lockbox> {
  const db = await getDatabase();
  const now = Date.now();

  await db.runAsync(
    'UPDATE lockboxes SET panic_code_hash = ?, panic_code_used = 0, updated_at = ? WHERE id = ?',
    [newCodeHash, now, id]
  );

  const result = await getLockbox(id);
  if (!result) throw new Error('Lockbox not found');
  return result;
}

export async function postponeScheduledUnlock(
  id: number,
  newTimestamp: number
): Promise<Lockbox> {
  const now = Date.now();
  if (newTimestamp <= now) throw new Error('New timestamp must be in the future');

  const current = await getLockbox(id);
  if (!current) throw new Error('Lockbox not found');
  if (!current.scheduled_unlock_at)
    throw new Error('No scheduled unlock to postpone');
  if (newTimestamp <= current.scheduled_unlock_at)
    throw new Error('New timestamp must be later than current scheduled time');

  const db = await getDatabase();
  await db.runAsync(
    'UPDATE lockboxes SET scheduled_unlock_at = ?, updated_at = ? WHERE id = ?',
    [newTimestamp, now, id]
  );

  const result = await getLockbox(id);
  if (!result) throw new Error('Lockbox not found');
  return result;
}

export async function checkAndUpdateStates(): Promise<Lockbox[]> {
  const db = await getDatabase();
  const now = Date.now();

  // 1. Complete countdown-based unlocks:
  //    Find lockboxes whose unlock countdown has finished, compute each
  //    relock_timestamp individually to avoid parameter-in-expression issues.
  const pendingUnlocks = await db.getAllAsync<{ id: number; relock_delay_seconds: number }>(
    `SELECT id, relock_delay_seconds FROM lockboxes
     WHERE is_locked = 1 AND unlock_timestamp IS NOT NULL AND unlock_timestamp <= ?`,
    [now]
  );
  for (const row of pendingUnlocks) {
    const relockTs = now + row.relock_delay_seconds * 1000;
    await db.runAsync(
      `UPDATE lockboxes
       SET is_locked = 0, relock_timestamp = ?, unlock_timestamp = NULL, updated_at = ?
       WHERE id = ?`,
      [relockTs, now, row.id]
    );
    await logAccessEvent(row.id, 'unlock_completed');
  }

  // 2. Complete scheduled unlocks
  const pendingScheduled = await db.getAllAsync<{ id: number; relock_delay_seconds: number }>(
    `SELECT id, relock_delay_seconds FROM lockboxes
     WHERE is_locked = 1 AND scheduled_unlock_at IS NOT NULL AND scheduled_unlock_at <= ?
       AND unlock_timestamp IS NULL`,
    [now]
  );
  for (const row of pendingScheduled) {
    const relockTs = now + row.relock_delay_seconds * 1000;
    await db.runAsync(
      `UPDATE lockboxes
       SET is_locked = 0, relock_timestamp = ?, scheduled_unlock_at = NULL, updated_at = ?
       WHERE id = ?`,
      [relockTs, now, row.id]
    );
    await logAccessEvent(row.id, 'unlock_completed');
  }

  // 3. Auto-relock
  await db.runAsync(
    `UPDATE lockboxes
     SET is_locked = 1, relock_timestamp = NULL, updated_at = ?
     WHERE is_locked = 0 AND relock_timestamp IS NOT NULL AND relock_timestamp <= ?`,
    [now, now]
  );

  return getAllLockboxes();
}

/**
 * Tampering response: cancel every in-flight unlock (countdown or scheduled)
 * and re-lock everything currently unlocked. Each affected lockbox receives
 * a `tamper_detected` access-log entry. Penalty is applied where enabled to
 * discourage repeat attempts.
 */
export async function handleTamperingDetected(): Promise<Lockbox[]> {
  const db = await getDatabase();
  const now = Date.now();

  const affected = await db.getAllAsync<{
    id: number;
    is_locked: number;
    unlock_timestamp: number | null;
    scheduled_unlock_at: number | null;
    relock_timestamp: number | null;
    penalty_enabled: number;
    penalty_seconds: number;
    unlock_delay_seconds: number;
  }>(
    `SELECT id, is_locked, unlock_timestamp, scheduled_unlock_at,
            relock_timestamp, penalty_enabled, penalty_seconds, unlock_delay_seconds
     FROM lockboxes
     WHERE is_locked = 0
        OR unlock_timestamp IS NOT NULL
        OR scheduled_unlock_at IS NOT NULL`
  );

  for (const row of affected) {
    const newDelay =
      row.penalty_enabled === 1
        ? row.unlock_delay_seconds + row.penalty_seconds
        : row.unlock_delay_seconds;

    await db.runAsync(
      `UPDATE lockboxes
       SET is_locked = 1,
           unlock_timestamp = NULL,
           scheduled_unlock_at = NULL,
           relock_timestamp = NULL,
           unlock_delay_seconds = ?,
           updated_at = ?
       WHERE id = ?`,
      [newDelay, now, row.id]
    );
    await logAccessEvent(row.id, 'tamper_detected');
  }

  return getAllLockboxes();
}

export async function logAccessEvent(
  lockboxId: number,
  eventType: string
): Promise<void> {
  const db = await getDatabase();
  const now = Date.now();
  await db.runAsync(
    'INSERT INTO access_log (lockbox_id, event_type, timestamp) VALUES (?, ?, ?)',
    [lockboxId, eventType, now]
  );
}

export async function getAccessLog(
  lockboxId: number
): Promise<AccessLogEntry[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<AccessLogEntry>(
    `SELECT id, lockbox_id, event_type, timestamp FROM access_log
     WHERE lockbox_id = ? ORDER BY timestamp DESC LIMIT 50`,
    [lockboxId]
  );
  return rows;
}

export async function getGlobalAccessLog(): Promise<AccessLogEntry[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<AccessLogEntry>(
    'SELECT id, lockbox_id, event_type, timestamp FROM access_log ORDER BY timestamp DESC'
  );
  return rows;
}

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [key]
  );
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [key, value]
  );
}
