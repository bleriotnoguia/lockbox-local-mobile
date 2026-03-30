import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  getEffectiveTheme: () => 'light' | 'dark';
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
      getEffectiveTheme: () => {
        const { theme } = get();
        if (theme === 'system') {
          return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
        }
        return theme;
      },
    }),
    {
      name: 'lockbox-theme',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
