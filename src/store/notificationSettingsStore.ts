import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NotificationSettingsState {
  soundEnabled: boolean;
  setSoundEnabled: (value: boolean) => void;
}

export const useNotificationSettingsStore = create<NotificationSettingsState>()(
  persist(
    (set) => ({
      soundEnabled: true,
      setSoundEnabled: (value) => set({ soundEnabled: value }),
    }),
    {
      name: 'lockbox-notification-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
