import '../global.css';
import React, { useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Alert, AppState, Text, View, type AppStateStatus } from 'react-native';
import { useColorScheme } from 'nativewind';
import { useAuthStore, useLockboxStore, useThemeStore } from '../src/store';
import { useNotifications, useScreenSecurity } from '../src/hooks';
import {
  initTimeIntegrity,
  checkTimeIntegrity,
  refreshSessionBaseline,
} from '../src/utils/timeIntegrity';
import { checkAndRecordAppVersion } from '../src/utils/appVersion';
import { useTranslation } from '../src/i18n';

export default function RootLayout() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const checkMasterPassword = useAuthStore((s) => s.checkMasterPassword);
  const fetchLockboxes = useLockboxStore((s) => s.fetchLockboxes);
  const checkAndUpdateStates = useLockboxStore((s) => s.checkAndUpdateStates);
  const handleTamperingDetected = useLockboxStore(
    (s) => s.handleTamperingDetected
  );
  const lockboxes = useLockboxStore((s) => s.lockboxes);
  const themeMode = useThemeStore((s) => s.theme);
  const effectiveTheme = useThemeStore((s) => s.getEffectiveTheme());
  const appState = useRef(AppState.currentState);
  const tamperAlertShownRef = useRef(false);
  const [versionBlocked, setVersionBlocked] = React.useState<{
    required: string;
  } | null>(null);

  const runIntegrityCheck = React.useCallback(async () => {
    const result = await checkTimeIntegrity();
    if (result.tampered) {
      await handleTamperingDetected();
      refreshSessionBaseline();
      if (!tamperAlertShownRef.current) {
        tamperAlertShownRef.current = true;
        Alert.alert(
          t('tamper.title'),
          t('tamper.body'),
          [{ text: t('common.confirm'), onPress: () => { tamperAlertShownRef.current = false; } }]
        );
      }
    }
  }, [handleTamperingDetected, t]);

  // Sync the theme store with NativeWind's color scheme so dark: classes match
  const { setColorScheme } = useColorScheme();
  useEffect(() => {
    setColorScheme(themeMode === 'system' ? 'system' : themeMode);
  }, [themeMode, setColorScheme]);

  useNotifications(isAuthenticated ? lockboxes : []);
  useScreenSecurity();

  useEffect(() => {
    initTimeIntegrity();
  }, []);

  useEffect(() => {
    checkMasterPassword();
  }, [checkMasterPassword]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    (async () => {
      const result = await checkAndRecordAppVersion();
      if (cancelled) return;
      if (!result.ok) {
        setVersionBlocked({ required: result.required });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && !versionBlocked) {
      fetchLockboxes();
    }
  }, [isAuthenticated, fetchLockboxes, versionBlocked]);

  useEffect(() => {
    if (!isAuthenticated || versionBlocked) return;
    const stateInterval = setInterval(() => {
      checkAndUpdateStates();
    }, 1000);
    const integrityInterval = setInterval(() => {
      runIntegrityCheck();
    }, 5000);
    return () => {
      clearInterval(stateInterval);
      clearInterval(integrityInterval);
    };
  }, [isAuthenticated, versionBlocked, checkAndUpdateStates, runIntegrityCheck]);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      async (nextAppState: AppStateStatus) => {
        if (
          appState.current.match(/inactive|background/) &&
          nextAppState === 'active' &&
          isAuthenticated
        ) {
          await runIntegrityCheck();
          checkAndUpdateStates();
        }
        appState.current = nextAppState;
      }
    );
    return () => subscription.remove();
  }, [isAuthenticated, checkAndUpdateStates, runIntegrityCheck]);

  if (versionBlocked) {
    return (
      <>
        <StatusBar style={effectiveTheme === 'dark' ? 'light' : 'dark'} />
        <View className="flex-1 items-center justify-center px-8 bg-gray-50 dark:bg-gray-900">
          <Text className="text-xl font-bold text-gray-900 dark:text-white mb-3 text-center">
            {t('appVersion.tooOldTitle')}
          </Text>
          <Text className="text-sm text-gray-600 dark:text-gray-300 text-center leading-relaxed">
            {t('appVersion.tooOldBody', { minVersion: versionBlocked.required })}
          </Text>
        </View>
      </>
    );
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
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="create" options={{ presentation: 'modal' }} />
        <Stack.Screen name="edit/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
        <Stack.Screen name="about" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}
