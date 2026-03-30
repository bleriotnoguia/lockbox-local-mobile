import '../global.css';
import React, { useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppState, type AppStateStatus } from 'react-native';
import { useAuthStore, useLockboxStore, useThemeStore } from '../src/store';

export default function RootLayout() {
  const { isAuthenticated, isLoading, checkMasterPassword } = useAuthStore();
  const { fetchLockboxes, checkAndUpdateStates } = useLockboxStore();
  const effectiveTheme = useThemeStore((s) => s.getEffectiveTheme());
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    checkMasterPassword();
  }, [checkMasterPassword]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchLockboxes();
    }
  }, [isAuthenticated, fetchLockboxes]);

  // 1-second polling while authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      checkAndUpdateStates();
    }, 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated, checkAndUpdateStates]);

  // Run checkAndUpdateStates on app foreground
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

  if (isLoading) {
    return null;
  }

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
        {!isAuthenticated ? (
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="create"
              options={{
                presentation: 'modal',
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="settings"
              options={{
                presentation: 'modal',
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="about"
              options={{
                presentation: 'modal',
                headerShown: false,
              }}
            />
          </>
        )}
      </Stack>
    </>
  );
}
