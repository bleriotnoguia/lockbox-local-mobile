import '../global.css';
import React, { useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppState, type AppStateStatus } from 'react-native';
import { useColorScheme } from 'nativewind';
import { useAuthStore, useLockboxStore, useThemeStore } from '../src/store';
import { useNotifications, useScreenSecurity } from '../src/hooks';

export default function RootLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const checkMasterPassword = useAuthStore((s) => s.checkMasterPassword);
  const fetchLockboxes = useLockboxStore((s) => s.fetchLockboxes);
  const checkAndUpdateStates = useLockboxStore((s) => s.checkAndUpdateStates);
  const lockboxes = useLockboxStore((s) => s.lockboxes);
  const themeMode = useThemeStore((s) => s.theme);
  const effectiveTheme = useThemeStore((s) => s.getEffectiveTheme());
  const appState = useRef(AppState.currentState);

  // Sync the theme store with NativeWind's color scheme so dark: classes match
  const { setColorScheme } = useColorScheme();
  useEffect(() => {
    setColorScheme(themeMode === 'system' ? 'system' : themeMode);
  }, [themeMode, setColorScheme]);

  useNotifications(isAuthenticated ? lockboxes : []);
  useScreenSecurity();

  useEffect(() => {
    checkMasterPassword();
  }, [checkMasterPassword]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchLockboxes();
    }
  }, [isAuthenticated, fetchLockboxes]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      checkAndUpdateStates();
    }, 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated, checkAndUpdateStates]);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (
          appState.current.match(/inactive|background/) &&
          nextAppState === 'active' &&
          isAuthenticated
        ) {
          checkAndUpdateStates();
        }
        appState.current = nextAppState;
      }
    );
    return () => subscription.remove();
  }, [isAuthenticated, checkAndUpdateStates]);

  return (
    <>
      <StatusBar style={effectiveTheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: effectiveTheme === 'dark' ? '#111827' : '#f9fafb',
          },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="create" options={{ presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
        <Stack.Screen name="about" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}
