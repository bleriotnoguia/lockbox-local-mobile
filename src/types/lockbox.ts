export interface Lockbox {
  id: number;
  name: string;
  content: string;
  category: string | null;
  is_locked: boolean;
  unlock_delay_seconds: number;
  relock_delay_seconds: number;
  unlock_timestamp: number | null;
  relock_timestamp: number | null;
  created_at: number;
  updated_at: number;
  reflection_enabled: boolean;
  reflection_message: string | null;
  reflection_checklist: string | null;
  penalty_enabled: boolean;
  penalty_seconds: number;
  panic_code_hash: string | null;
  panic_code_used: boolean;
  scheduled_unlock_at: number | null;
  tags: string | null;
}

export interface CreateLockboxInput {
  name: string;
  content: string;
  category?: string;
  unlock_delay_seconds: number;
  relock_delay_seconds: number;
  reflection_enabled?: boolean;
  reflection_message?: string;
  reflection_checklist?: string;
  penalty_enabled?: boolean;
  penalty_seconds?: number;
  panic_code?: string;
  scheduled_unlock_at?: number;
  tags?: string;
}

export interface UpdateLockboxInput {
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
  scheduled_unlock_at?: number | null;
  tags?: string | null;
}

export interface AccessLogEntry {
  id: number;
  lockbox_id: number;
  event_type:
    | 'unlock_requested'
    | 'unlock_completed'
    | 'unlock_cancelled'
    | 'panic_used'
    | 'extend_delay'
    | 'content_edited';
  timestamp: number;
}

export interface ExportData {
  version: string;
  exported_at: number;
  lockboxes: ExportLockbox[];
}

export interface ExportLockbox {
  name: string;
  content: string;
  category: string | null;
  unlock_delay_seconds: number;
  relock_delay_seconds: number;
  reflection_enabled?: boolean;
  reflection_message?: string | null;
  reflection_checklist?: string | null;
  penalty_enabled?: boolean;
  penalty_seconds?: number;
  tags?: string | null;
  signature?: string | null;
}

export type LockboxStatus = 'locked' | 'unlocking' | 'scheduled' | 'unlocked';

export interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

export function parseTags(tags: string | null | undefined): string[] {
  if (!tags) return [];
  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed)
      ? parsed.filter((t): t is string => typeof t === 'string')
      : [];
  } catch {
    return [];
  }
}

export function serializeTags(tags: string[]): string | undefined {
  return tags.length > 0 ? JSON.stringify(tags) : undefined;
}
