import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../../src/store';
import { useTranslation } from '../../src/i18n';

const BIOMETRIC_ENABLED_KEY = 'lockbox_biometric_enabled';

export default function LoginScreen() {
  const { t } = useTranslation();
  const { verifyMasterPassword, isLoading, error, clearError } =
    useAuthStore();
  const [password, setPassword] = useState('');

  useEffect(() => {
    tryBiometricLogin();
  }, []);

  const tryBiometricLogin = async () => {
    try {
      const biometricEnabled = await SecureStore.getItemAsync(
        BIOMETRIC_ENABLED_KEY
      );
      if (biometricEnabled !== 'true') return;

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) return;

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t('login.biometricPrompt'),
        fallbackLabel: t('login.masterPassword'),
        disableDeviceFallback: true,
      });

      if (result.success) {
        const storedHash = await SecureStore.getItemAsync(
          'lockbox_master_hash'
        );
        if (storedHash) {
          useAuthStore.setState({
            isAuthenticated: true,
            masterHash: storedHash,
          });
          router.replace('/(tabs)/lockboxes');
        }
      }
    } catch {
      // Biometric not available, fall back to password
    }
  };

  const handleLogin = async () => {
    clearError();
    if (!password) return;
    const success = await verifyMasterPassword(password);
    if (success) {
      router.replace('/(tabs)/lockboxes');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white dark:bg-gray-950"
    >
      <ScrollView
        contentContainerClassName="flex-1 justify-center px-8"
        keyboardShouldPersistTaps="handled"
      >
        <View className="items-center mb-10">
          <View className="w-20 h-20 rounded-2xl bg-primary-600 items-center justify-center mb-4">
            <Text className="text-4xl">🔒</Text>
          </View>
          <Text className="text-3xl font-bold text-gray-900 dark:text-white">
            Lockbox Local
          </Text>
          <Text className="text-base text-gray-500 dark:text-gray-400 mt-2 text-center">
            {t('login.enterPassword')}
          </Text>
        </View>

        <View className="gap-4">
          <View>
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t('login.masterPassword')}
            </Text>
            <TextInput
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3.5 text-base text-gray-900 dark:text-white"
              placeholder={t('login.masterPassword')}
              placeholderTextColor="#9ca3af"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoComplete="off"
              onSubmitEditing={handleLogin}
              returnKeyType="go"
            />
          </View>

          {error && (
            <Text className="text-red-500 text-sm text-center">
              {error === 'wrong_password' ? t('login.wrongPassword') : error}
            </Text>
          )}

          <TouchableOpacity
            className={`bg-primary-600 rounded-xl py-4 items-center ${
              isLoading ? 'opacity-50' : ''
            }`}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <Text className="text-white font-semibold text-base">
              {t('login.unlock')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="items-center py-2"
            onPress={tryBiometricLogin}
            activeOpacity={0.7}
          >
            <Text className="text-primary-600 dark:text-primary-400 text-sm">
              {t('login.biometricPrompt')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
