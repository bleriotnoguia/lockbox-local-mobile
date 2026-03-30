import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';
import type { Locale } from './translations';

function getDeviceLocale(): Locale {
  try {
    const deviceLocale =
      Platform.OS === 'ios'
        ? NativeModules.SettingsManager?.settings?.AppleLocale ||
          NativeModules.SettingsManager?.settings?.AppleLanguages?.[0]
        : NativeModules.I18nManager?.localeIdentifier;
    if (deviceLocale && deviceLocale.startsWith('fr')) return 'fr';
  } catch {
    // fallback
  }
  return 'en';
}

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: getDeviceLocale(),
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: 'lockbox-locale',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
