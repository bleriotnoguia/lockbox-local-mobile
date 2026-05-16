import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';
import {
  useAuthStore,
  useThemeStore,
  useNotificationSettingsStore,
  type ThemeMode,
} from '../src/store';
import { useTranslation, useLocaleStore, type Locale } from '../src/i18n';
import { useExportImport } from '../src/hooks';

const BIOMETRIC_ENABLED_KEY = 'lockbox_biometric_enabled';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const logout = useAuthStore((s) => s.logout);
  const { theme, setTheme } = useThemeStore();
  const { locale, setLocale } = useLocaleStore();
  const { exportLockboxes, importLockboxes } = useExportImport();
  const notifSoundEnabled = useNotificationSettingsStore((s) => s.soundEnabled);
  const setNotifSoundEnabled = useNotificationSettingsStore(
    (s) => s.setSoundEnabled
  );

  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [showImportPassword, setShowImportPassword] = useState(false);
  const [importSourcePassword, setImportSourcePassword] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    (async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(hasHardware && isEnrolled);

      const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
      setBiometricEnabled(enabled === 'true');
    })();
  }, []);

  const toggleBiometric = async (value: boolean) => {
    if (value) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t('login.biometricPrompt'),
        disableDeviceFallback: true,
      });
      if (!result.success) return;
    }
    await SecureStore.setItemAsync(
      BIOMETRIC_ENABLED_KEY,
      value ? 'true' : 'false'
    );
    setBiometricEnabled(value);
  };

  const handleExport = async () => {
    try {
      await exportLockboxes();
      Alert.alert(
        t('settings.exportWarningTitle'),
        t('settings.exportWarningBody')
      );
    } catch (e) {
      Alert.alert('Error', String(e));
    }
  };

  const handleImport = () => {
    setShowImportPassword(true);
  };

  const performImport = async (sourcePassword?: string) => {
    setShowImportPassword(false);
    setIsImporting(true);
    try {
      const imported = await importLockboxes(sourcePassword || undefined);
      if (imported.length === 0) {
        Alert.alert('', t('settings.importNoneNew'));
      } else {
        Alert.alert(
          '',
          t('settings.importedCount', { count: imported.length })
        );
      }
    } catch (e) {
      const msg = String(e);
      if (msg.includes('integrity_failed')) {
        Alert.alert('', t('settings.importErrorIntegrity'));
      } else if (msg.includes('decrypt_failed')) {
        Alert.alert('', t('settings.importErrorPassword'));
      } else if (msg.includes('Invalid') || msg.includes('JSON')) {
        Alert.alert('', t('settings.importErrorFormat'));
      } else {
        Alert.alert('', t('settings.importErrorGeneric', { detail: msg }));
      }
    } finally {
      setIsImporting(false);
      setImportSourcePassword('');
    }
  };

  const themes: ThemeMode[] = ['light', 'system', 'dark'];
  const locales: Locale[] = ['en', 'fr'];

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View
        className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700"
        style={{ paddingTop: insets.top + 8 }}
      >
        <TouchableOpacity
          onPress={() => {
            if (router.canDismiss()) router.dismiss();
            else router.replace('/(tabs)/lockboxes');
          }}
          activeOpacity={0.7}
          className="p-1 -ml-1"
        >
          <Ionicons name="chevron-back" size={28} color="#6366f1" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900 dark:text-white">
          {t('settings.title')}
        </Text>
        <View className="w-8" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 py-4 pb-8"
        showsVerticalScrollIndicator={false}
      >
        {/* Theme */}
        <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
          {t('settings.theme')}
        </Text>
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-1 flex-row mb-6">
          {themes.map((th) => (
            <TouchableOpacity
              key={th}
              className={`flex-1 py-3 rounded-xl items-center ${
                theme === th ? 'bg-primary-600' : ''
              }`}
              onPress={() => setTheme(th)}
              activeOpacity={0.7}
            >
              <Text
                className={`text-sm font-medium ${
                  theme === th
                    ? 'text-white'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                {t(`settings.theme${th.charAt(0).toUpperCase() + th.slice(1)}` as string)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Language */}
        <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
          {t('settings.language')}
        </Text>
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-1 flex-row mb-6">
          {locales.map((l) => (
            <TouchableOpacity
              key={l}
              className={`flex-1 py-3 rounded-xl items-center ${
                locale === l ? 'bg-primary-600' : ''
              }`}
              onPress={() => setLocale(l)}
              activeOpacity={0.7}
            >
              <Text
                className={`text-sm font-medium ${
                  locale === l
                    ? 'text-white'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                {t(`settings.language${l.charAt(0).toUpperCase() + l.slice(1)}` as string)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Security — biometric only when hardware is available */}
        {biometricAvailable && (
          <>
            <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              {t('settings.security')}
            </Text>
            <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex-row items-center justify-between mb-6">
              <View className="flex-1 mr-3">
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('settings.biometric')}
                </Text>
                <Text className="text-xs text-gray-500 mt-0.5">
                  {t('settings.biometricHint')}
                </Text>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={toggleBiometric}
                trackColor={{ true: '#6366f1' }}
              />
            </View>
          </>
        )}

        {/* Notifications */}
        <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
          {t('settings.notifications')}
        </Text>
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex-row items-center justify-between mb-6">
          <View className="flex-1 mr-3">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('settings.notificationSound')}
            </Text>
            <Text className="text-xs text-gray-500 mt-0.5">
              {t('settings.notificationSoundHint')}
            </Text>
          </View>
          <Switch
            value={notifSoundEnabled}
            onValueChange={setNotifSoundEnabled}
            trackColor={{ true: '#6366f1' }}
          />
        </View>

        {/* Import/Export */}
        <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
          Data
        </Text>
        <View className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-3.5 mb-3">
          <Text className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
            ℹ️ {t('settings.importExportNote')}
          </Text>
        </View>
        <View className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden mb-6">
          <TouchableOpacity
            className="p-4 border-b border-gray-100 dark:border-gray-700"
            onPress={handleExport}
            activeOpacity={0.7}
          >
            <Text className="text-sm text-gray-700 dark:text-gray-300">
              {t('settings.export')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="p-4"
            onPress={handleImport}
            activeOpacity={0.7}
          >
            <Text className="text-sm text-gray-700 dark:text-gray-300">
              {t('settings.import')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* About */}
        <TouchableOpacity
          className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-6"
          onPress={() => router.push('/about')}
          activeOpacity={0.7}
        >
          <Text className="text-sm text-gray-700 dark:text-gray-300">
            {t('about.title')}
          </Text>
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 items-center"
          onPress={() => {
            logout();
            router.dismissAll();
            router.replace('/(auth)/login');
          }}
          activeOpacity={0.7}
        >
          <Text className="text-sm font-semibold text-red-600 dark:text-red-400">
            {t('settings.logout')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Import loading overlay */}
      <Modal visible={isImporting} animationType="fade" transparent>
        <View className="flex-1 bg-black/60 items-center justify-center">
          <View className="bg-white dark:bg-gray-800 rounded-2xl px-6 py-5 items-center">
            <ActivityIndicator size="large" color="#6366f1" />
            <Text className="text-sm text-gray-700 dark:text-gray-300 mt-3">
              {t('settings.importing')}
            </Text>
          </View>
        </View>
      </Modal>

      {/* Import Password Modal */}
      <Modal
        visible={showImportPassword}
        animationType="fade"
        transparent
        onRequestClose={() => setShowImportPassword(false)}
      >
        <View className="flex-1 bg-black/60 justify-center px-6">
          <View className="bg-white dark:bg-gray-800 rounded-3xl p-6">
            <Text className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              {t('settings.importPasswordTitle')}
            </Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {t('settings.importPasswordBody')}
            </Text>
            <TextInput
              className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-base text-gray-900 dark:text-white mb-4"
              placeholder={t('settings.importPasswordPlaceholder')}
              placeholderTextColor="#9ca3af"
              value={importSourcePassword}
              onChangeText={setImportSourcePassword}
              secureTextEntry
            />
            <View className="gap-2">
              <TouchableOpacity
                className="bg-primary-600 rounded-xl py-3.5 items-center"
                onPress={() => performImport(importSourcePassword)}
                activeOpacity={0.7}
              >
                <Text className="text-white font-semibold text-sm">
                  {t('settings.importPasswordConfirm')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-gray-100 dark:bg-gray-700 rounded-xl py-3.5 items-center"
                onPress={() => performImport()}
                activeOpacity={0.7}
              >
                <Text className="text-gray-700 dark:text-gray-300 font-semibold text-sm">
                  {t('settings.importPasswordSkip')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="py-3 items-center"
                onPress={() => setShowImportPassword(false)}
                activeOpacity={0.7}
              >
                <Text className="text-gray-500 text-sm">
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
