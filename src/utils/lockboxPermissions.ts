import type { LockboxStatus } from '../types';

export interface LockboxEditPermissions {
  canEditMetadata: boolean;
  canEditContent: boolean;
  canReduceDelay: boolean;
  canIncreaseDelay: boolean;
  canEditRelockDelay: boolean;
  canManageSchedule: boolean;
  canPostponeSchedule: boolean;
  canManagePanicCode: boolean;
}

export function getLockboxEditPermissions(
  status: LockboxStatus
): LockboxEditPermissions {
  const isUnlocked = status === 'unlocked';
  const isScheduled = status === 'scheduled';

  return {
    canEditMetadata: true,
    canEditContent: isUnlocked,
    canReduceDelay: isUnlocked,
    canIncreaseDelay: true,
    canEditRelockDelay: true,
    canManageSchedule: isUnlocked,
    canPostponeSchedule: isScheduled || isUnlocked,
    canManagePanicCode: isUnlocked,
  };
}
