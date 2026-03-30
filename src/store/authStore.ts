import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { hashPassword, verifyPassword, clearKeyCache } from '../crypto';

const MASTER_HASH_KEY = 'lockbox_master_hash';

interface AuthState {
  isAuthenticated: boolean;
  isMasterPasswordSet: boolean;
  isLoading: boolean;
  error: string | null;
  masterHash: string | null;

  checkMasterPassword: () => Promise<void>;
  setMasterPassword: (password: string) => Promise<void>;
  verifyMasterPassword: (password: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  getMasterHash: () => string | null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isMasterPasswordSet: false,
  isLoading: true,
  error: null,
  masterHash: null,

  checkMasterPassword: async () => {
    set({ isLoading: true });
    try {
      const storedHash = await SecureStore.getItemAsync(MASTER_HASH_KEY);
      set({
        isMasterPasswordSet: storedHash !== null,
        isLoading: false,
      });
    } catch {
      set({ isMasterPasswordSet: false, isLoading: false });
    }
  },

  setMasterPassword: async (password: string) => {
    set({ isLoading: true, error: null });
    try {
      const hash = hashPassword(password);
      await SecureStore.setItemAsync(MASTER_HASH_KEY, hash);
      set({
        isAuthenticated: true,
        isMasterPasswordSet: true,
        masterHash: hash,
        isLoading: false,
      });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  verifyMasterPassword: async (password: string) => {
    set({ isLoading: true, error: null });
    try {
      const storedHash = await SecureStore.getItemAsync(MASTER_HASH_KEY);
      if (!storedHash) {
        set({ error: 'No master password set', isLoading: false });
        return false;
      }

      const isValid = verifyPassword(password, storedHash);
      if (isValid) {
        set({
          isAuthenticated: true,
          masterHash: storedHash,
          isLoading: false,
        });
      } else {
        set({ error: 'wrong_password', isLoading: false });
      }
      return isValid;
    } catch (e) {
      set({ error: String(e), isLoading: false });
      return false;
    }
  },

  logout: () => {
    clearKeyCache();
    set({
      isAuthenticated: false,
      masterHash: null,
      error: null,
    });
  },

  clearError: () => set({ error: null }),

  getMasterHash: () => get().masterHash,
}));
