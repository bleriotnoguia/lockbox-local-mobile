import { useMemo } from 'react';
import type { Lockbox, LockboxStatus } from '../types';

export function useLockboxStatus(lockbox: Lockbox): LockboxStatus {
  return useMemo(() => {
    return getLockboxStatus(lockbox);
  }, [
    lockbox.is_locked,
    lockbox.unlock_timestamp,
    lockbox.relock_timestamp,
    lockbox.scheduled_unlock_at,
  ]);
}

export function getLockboxStatus(lockbox: Lockbox): LockboxStatus {
  const now = Date.now();

  if (lockbox.is_locked) {
    if (lockbox.unlock_timestamp && lockbox.unlock_timestamp > now) {
      return 'unlocking';
    }
    if (lockbox.scheduled_unlock_at && lockbox.scheduled_unlock_at > now) {
      return 'scheduled';
    }
    return 'locked';
  }

  if (lockbox.relock_timestamp && lockbox.relock_timestamp > now) {
    return 'unlocked';
  }

  return 'locked';
}

export function getStatusColor(status: LockboxStatus): string {
  switch (status) {
    case 'locked':
      return '#ef4444';
    case 'unlocking':
      return '#eab308';
    case 'scheduled':
      return '#3b82f6';
    case 'unlocked':
      return '#22c55e';
  }
}
