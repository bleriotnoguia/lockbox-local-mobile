import { create } from 'zustand';
import { useMemo } from 'react';
import * as db from '../db';
import { encrypt, decrypt, decryptAsync, hashPassword } from '../crypto';
import { useAuthStore } from './authStore';
import type { Lockbox, CreateLockboxInput, UpdateLockboxInput, AccessLogEntry } from '../types';
import { parseTags } from '../types';
import { getLockboxStatus } from '../hooks/useLockboxStatus';
import { getLockboxEditPermissions } from '../utils/lockboxPermissions';
import { UNCATEGORIZED_FILTER } from '../constants';

interface LockboxState {
  lockboxes: Lockbox[];
  selectedLockbox: Lockbox | null;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  selectedCategory: string | null;
  selectedTag: string | null;

  fetchLockboxes: () => Promise<void>;
  fetchLockboxDecrypted: (id: number) => Promise<Lockbox | null>;
  createLockbox: (input: CreateLockboxInput) => Promise<Lockbox>;
  updateLockbox: (
    id: number,
    updates: Omit<Partial<UpdateLockboxInput>, 'id'>
  ) => Promise<Lockbox>;
  postponeScheduledUnlock: (id: number, newTimestamp: number) => Promise<Lockbox>;
  deleteLockbox: (id: number) => Promise<void>;
  unlockLockbox: (id: number) => Promise<Lockbox>;
  cancelUnlock: (id: number) => Promise<Lockbox>;
  extendUnlockDelay: (
    id: number,
    additionalSeconds: number
  ) => Promise<Lockbox>;
  usePanicCode: (id: number, code: string) => Promise<Lockbox | null>;
  resetPanicCode: (id: number, newCode?: string) => Promise<Lockbox>;
  getAccessLog: (lockboxId: number) => Promise<AccessLogEntry[]>;
  getGlobalAccessLog: () => Promise<AccessLogEntry[]>;
  relockLockbox: (id: number) => Promise<Lockbox>;
  selectLockbox: (lockbox: Lockbox | null) => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string | null) => void;
  setSelectedTag: (tag: string | null) => void;
  checkAndUpdateStates: () => Promise<void>;
  handleTamperingDetected: () => Promise<void>;
  tamperEventTick: number;
  clearError: () => void;
}

let _checkInProgress = false;

export const useLockboxStore = create<LockboxState>((set, get) => ({
  lockboxes: [],
  selectedLockbox: null,
  isLoading: false,
  error: null,
  searchQuery: '',
  selectedCategory: null,
  selectedTag: null,
  tamperEventTick: 0,

  fetchLockboxes: async () => {
    set({ isLoading: true, error: null });
    try {
      const lockboxes = await db.getAllLockboxes();
      set({ lockboxes, isLoading: false });
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  fetchLockboxDecrypted: async (id: number) => {
    try {
      const { lockboxes } = get();
      const lockbox = lockboxes.find((lb) => lb.id === id) ?? await db.getLockbox(id);
      if (!lockbox) return null;

      if (!lockbox.is_locked) {
        const masterHash = useAuthStore.getState().getMasterHash();
        if (masterHash) {
          try {
            const decrypted = await decryptAsync(lockbox.content, masterHash);
            return { ...lockbox, content: decrypted };
          } catch {
            return lockbox;
          }
        }
      }
      return lockbox;
    } catch {
      return null;
    }
  },

  createLockbox: async (input: CreateLockboxInput) => {
    set({ isLoading: true, error: null });
    try {
      const masterHash = useAuthStore.getState().getMasterHash();
      const encryptedContent = masterHash
        ? encrypt(input.content, masterHash)
        : input.content;

      const panicCodeHash = input.panic_code
        ? hashPassword(input.panic_code)
        : null;

      const lockbox = await db.createLockbox({
        name: input.name,
        content: encryptedContent,
        category: input.category ?? null,
        unlock_delay_seconds: input.unlock_delay_seconds,
        relock_delay_seconds: input.relock_delay_seconds,
        reflection_enabled: input.reflection_enabled ?? false,
        reflection_message: input.reflection_message ?? null,
        reflection_checklist: input.reflection_checklist ?? null,
        penalty_enabled: input.penalty_enabled ?? false,
        penalty_seconds: input.penalty_seconds ?? 0,
        panic_code_hash: panicCodeHash,
        scheduled_unlock_at: input.scheduled_unlock_at ?? null,
        tags: input.tags ?? null,
      });

      set((state) => ({
        lockboxes: [...state.lockboxes, lockbox].sort((a, b) =>
          a.name.localeCompare(b.name)
        ),
        isLoading: false,
      }));
      return lockbox;
    } catch (error) {
      set({ error: String(error), isLoading: false });
      throw error;
    }
  },

  updateLockbox: async (
    id: number,
    updates: Omit<Partial<UpdateLockboxInput>, 'id'>
  ) => {
    set({ isLoading: true, error: null });
    try {
      const { lockboxes } = get();
      const current = lockboxes.find((lb) => lb.id === id);
      if (current) {
        const status = getLockboxStatus(current);
        const perms = getLockboxEditPermissions(status);

        if (updates.content !== undefined && !perms.canEditContent) {
          throw new Error('Cannot edit content in current state');
        }
        if (
          updates.unlock_delay_seconds !== undefined &&
          updates.unlock_delay_seconds < current.unlock_delay_seconds &&
          !perms.canReduceDelay
        ) {
          throw new Error('Cannot reduce unlock delay in current state');
        }
        if (
          'scheduled_unlock_at' in updates &&
          updates.scheduled_unlock_at !== current.scheduled_unlock_at &&
          !perms.canManageSchedule
        ) {
          throw new Error('Cannot modify scheduled unlock in current state');
        }
      }

      const masterHash = useAuthStore.getState().getMasterHash();

      let contentChanged = false;
      if (updates.content !== undefined && current && masterHash) {
        try {
          const decrypted = await decryptAsync(current.content, masterHash);
          contentChanged = decrypted !== updates.content;
        } catch {
          contentChanged = true;
        }
      }

      const encryptedContent =
        updates.content && masterHash
          ? encrypt(updates.content, masterHash)
          : updates.content;

      const lockbox = await db.updateLockbox({
        id,
        name: updates.name,
        content: encryptedContent,
        category: updates.category,
        unlock_delay_seconds: updates.unlock_delay_seconds,
        relock_delay_seconds: updates.relock_delay_seconds,
        reflection_enabled: updates.reflection_enabled,
        reflection_message: updates.reflection_message,
        reflection_checklist: updates.reflection_checklist,
        penalty_enabled: updates.penalty_enabled,
        penalty_seconds: updates.penalty_seconds,
        scheduled_unlock_at: updates.scheduled_unlock_at,
        tags: updates.tags,
      });

      if (contentChanged) {
        await db.logAccessEvent(id, 'content_edited');
      }

      set((state) => ({
        lockboxes: state.lockboxes.map((lb) =>
          lb.id === id ? lockbox : lb
        ),
        selectedLockbox:
          state.selectedLockbox?.id === id
            ? lockbox
            : state.selectedLockbox,
        isLoading: false,
      }));
      return lockbox;
    } catch (error) {
      set({ error: String(error), isLoading: false });
      throw error;
    }
  },

  deleteLockbox: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      await db.deleteLockbox(id);
      set((state) => ({
        lockboxes: state.lockboxes.filter((lb) => lb.id !== id),
        selectedLockbox:
          state.selectedLockbox?.id === id ? null : state.selectedLockbox,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: String(error), isLoading: false });
      throw error;
    }
  },

  unlockLockbox: async (id: number) => {
    set({ error: null });
    try {
      const lockbox = await db.unlockLockbox(id);
      set((state) => ({
        lockboxes: state.lockboxes.map((lb) =>
          lb.id === id ? lockbox : lb
        ),
        selectedLockbox:
          state.selectedLockbox?.id === id
            ? lockbox
            : state.selectedLockbox,
      }));
      return lockbox;
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  cancelUnlock: async (id: number) => {
    set({ error: null });
    try {
      const lockbox = await db.cancelUnlock(id);
      set((state) => ({
        lockboxes: state.lockboxes.map((lb) =>
          lb.id === id ? lockbox : lb
        ),
        selectedLockbox:
          state.selectedLockbox?.id === id
            ? lockbox
            : state.selectedLockbox,
      }));
      return lockbox;
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  extendUnlockDelay: async (id: number, additionalSeconds: number) => {
    set({ error: null });
    try {
      const lockbox = await db.extendUnlockDelay(id, additionalSeconds);
      set((state) => ({
        lockboxes: state.lockboxes.map((lb) =>
          lb.id === id ? lockbox : lb
        ),
        selectedLockbox:
          state.selectedLockbox?.id === id
            ? lockbox
            : state.selectedLockbox,
      }));
      return lockbox;
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  usePanicCode: async (id: number, code: string) => {
    set({ error: null });
    try {
      const codeHash = hashPassword(code);
      const lockbox = await db.usePanicCode(id, codeHash);
      if (lockbox) {
        set((state) => ({
          lockboxes: state.lockboxes.map((lb) =>
            lb.id === id ? lockbox : lb
          ),
          selectedLockbox:
            state.selectedLockbox?.id === id
              ? lockbox
              : state.selectedLockbox,
        }));
      }
      return lockbox;
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  resetPanicCode: async (id: number, newCode?: string) => {
    set({ error: null });
    try {
      const newCodeHash = newCode ? hashPassword(newCode) : null;
      const lockbox = await db.resetPanicCode(id, newCodeHash);
      set((state) => ({
        lockboxes: state.lockboxes.map((lb) =>
          lb.id === id ? lockbox : lb
        ),
        selectedLockbox:
          state.selectedLockbox?.id === id
            ? lockbox
            : state.selectedLockbox,
      }));
      return lockbox;
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  getAccessLog: async (lockboxId: number) => {
    try {
      return await db.getAccessLog(lockboxId);
    } catch {
      return [];
    }
  },

  getGlobalAccessLog: async () => {
    try {
      return await db.getGlobalAccessLog();
    } catch {
      return [];
    }
  },

  relockLockbox: async (id: number) => {
    set({ error: null });
    try {
      const lockbox = await db.relockLockbox(id);
      set((state) => ({
        lockboxes: state.lockboxes.map((lb) =>
          lb.id === id ? lockbox : lb
        ),
        selectedLockbox:
          state.selectedLockbox?.id === id
            ? lockbox
            : state.selectedLockbox,
      }));
      return lockbox;
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  postponeScheduledUnlock: async (id: number, newTimestamp: number) => {
    set({ error: null });
    try {
      const lockbox = await db.postponeScheduledUnlock(id, newTimestamp);
      set((state) => ({
        lockboxes: state.lockboxes.map((lb) =>
          lb.id === id ? lockbox : lb
        ),
        selectedLockbox:
          state.selectedLockbox?.id === id ? lockbox : state.selectedLockbox,
      }));
      return lockbox;
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  selectLockbox: (lockbox) => set({ selectedLockbox: lockbox }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  setSelectedTag: (tag) => set({ selectedTag: tag }),

  checkAndUpdateStates: async () => {
    if (_checkInProgress) return;

    const { lockboxes: current } = get();
    const now = Date.now();

    const needsUpdate = current.some(
      (lb) =>
        (lb.is_locked &&
          lb.unlock_timestamp != null &&
          lb.unlock_timestamp <= now) ||
        (lb.is_locked &&
          lb.scheduled_unlock_at != null &&
          lb.scheduled_unlock_at <= now) ||
        (!lb.is_locked &&
          lb.relock_timestamp != null &&
          lb.relock_timestamp <= now)
    );

    if (!needsUpdate) return;

    _checkInProgress = true;
    try {
      const { lockboxes, tamperedIds } = await db.checkAndUpdateStates();
      const { selectedLockbox, tamperEventTick } = get();
      set({
        lockboxes,
        selectedLockbox: selectedLockbox
          ? lockboxes.find((lb) => lb.id === selectedLockbox.id) ?? null
          : null,
        tamperEventTick:
          tamperedIds.length > 0 ? tamperEventTick + 1 : tamperEventTick,
      });
    } catch (e) {
      console.warn('[checkAndUpdateStates]', e);
    } finally {
      _checkInProgress = false;
    }
  },

  handleTamperingDetected: async () => {
    try {
      const lockboxes = await db.handleTamperingDetected();
      const { selectedLockbox } = get();
      set({
        lockboxes,
        selectedLockbox: selectedLockbox
          ? lockboxes.find((lb) => lb.id === selectedLockbox.id) ?? null
          : null,
      });
    } catch (e) {
      console.warn('[handleTamperingDetected]', e);
    }
  },

  clearError: () => set({ error: null }),
}));

export function useFilteredLockboxes(): Lockbox[] {
  const lockboxes = useLockboxStore((s) => s.lockboxes);
  const searchQuery = useLockboxStore((s) => s.searchQuery);
  const selectedCategory = useLockboxStore((s) => s.selectedCategory);
  const selectedTag = useLockboxStore((s) => s.selectedTag);

  return useMemo(() => {
    let filtered = lockboxes;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (lb) =>
          lb.name.toLowerCase().includes(query) ||
          lb.category?.toLowerCase().includes(query) ||
          parseTags(lb.tags).some((t) => t.toLowerCase().includes(query))
      );
    }

    if (selectedCategory === UNCATEGORIZED_FILTER) {
      filtered = filtered.filter((lb) => !lb.category);
    } else if (selectedCategory) {
      filtered = filtered.filter((lb) => lb.category === selectedCategory);
    }

    if (selectedTag) {
      filtered = filtered.filter((lb) =>
        parseTags(lb.tags).includes(selectedTag)
      );
    }

    return filtered;
  }, [lockboxes, searchQuery, selectedCategory, selectedTag]);
}
