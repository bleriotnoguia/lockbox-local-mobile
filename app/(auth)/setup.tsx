import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../../src/store';
import { useTranslation } from '../../src/i18n';

const BIOMETRIC_ENABLED_KEY = 'lockbox_biometric_enabled';

export default function SetupScreen() {
  const { t } = useTranslation();
  const { setMasterPassword, isLoading } = useAuthStore();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [enableBiometric, setEnableBiometric] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    (async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(hasHardware && isEnrolled);
    })();
  }, []);

  const handleCreate = () => {
    setError(null);

    if (!password) {
      setError(t('login.passwordRequired'));
      return;
    }
    if (password.length < 8) {
      setError(t('login.passwordMinLength'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('login.passwordMismatch'));
      return;
    }

    // Show confirmation modal before actually creating
    setConfirmed(false);
    setShowConfirm(true);
  };

  const handleConfirmCreate = async () => {
    setShowConfirm(false);
    await setMasterPassword(password);
    await SecureStore.setItemAsync(
      BIOMETRIC_ENABLED_KEY,
      enableBiometric ? 'true' : 'false'
    );
    router.replace('/(tabs)/lockboxes');
  };

  return (
    <>
      {/* Confirmation modal */}
      <Modal
        visible={showConfirm}
        animationType="fade"
        transparent
        onRequestClose={() => setShowConfirm(false)}
      >
        <View className="flex-1 bg-black/60 justify-center px-6">
          <View className="bg-white dark:bg-gray-800 rounded-3xl p-6">
            {/* Icon + title */}
            <View className="items-center mb-4">
              <View className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/40 items-center justify-center mb-3">
                <Ionicons name="warning-outline" size={28} color="#d97706" />
              </View>
              <Text className="text-lg font-bold text-gray-900 dark:text-white text-center">
                {t('login.confirmSetupTitle')}
              </Text>
            </View>

            {/* Warning */}
            <View className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3.5 mb-3">
              <Text className="text-sm text-red-700 dark:text-red-300 leading-relaxed">
                {t('login.confirmSetupWarning')}
              </Text>
            </View>

            {/* Checkbox */}
            <TouchableOpacity
              onPress={() => setConfirmed(!confirmed)}
              activeOpacity={0.7}
              className="flex-row items-center gap-3 mb-6"
            >
              <View
                className={`w-6 h-6 rounded-md items-center justify-center ${
                  confirmed
                    ? 'bg-primary-600'
                    : 'border-2 border-gray-300 dark:border-gray-600'
                }`}
              >
                {confirmed && (
                  <Ionicons name="checkmark" size={14} color="white" />
                )}
              </View>
              <Text className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('login.confirmSetupCheckbox')}
              </Text>
            </TouchableOpacity>

            {/* Buttons */}
            <View className="gap-2">
              <TouchableOpacity
                onPress={handleConfirmCreate}
                disabled={!confirmed || isLoading}
                activeOpacity={0.8}
                className={`py-4 rounded-xl items-center ${
                  confirmed && !isLoading
                    ? 'bg-primary-600'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <Text
                  className={`font-semibold text-base ${
                    confirmed && !isLoading
                      ? 'text-white'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {t('login.confirmSetupButton')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowConfirm(false)}
                activeOpacity={0.7}
                className="py-3 items-center"
              >
                <Text className="text-sm text-gray-500">
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
            {t('login.createPassword')}
          </Text>
        </View>

        <View className="gap-4">
          <View>
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t('login.masterPassword')}
            </Text>
            <TextInput
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3.5 text-base text-gray-900 dark:text-white"
              placeholder={t('login.minChars')}
              placeholderTextColor="#9ca3af"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoComplete="off"
            />
          </View>

          <View>
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t('login.confirmPassword')}
            </Text>
            <TextInput
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3.5 text-base text-gray-900 dark:text-white"
              placeholder={t('login.confirmPassword')}
              placeholderTextColor="#9ca3af"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              autoCapitalize="none"
              autoComplete="off"
            />
          </View>

          {error && (
            <Text className="text-red-500 text-sm text-center">{error}</Text>
          )}

          <View className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mt-1">
            <Text className="text-amber-800 dark:text-amber-200 text-sm">
              {t('login.passwordDisclaimer')}
            </Text>
            <Text className="text-amber-700 dark:text-amber-300 text-sm font-semibold mt-1">
              {t('login.passwordWarning')}
            </Text>
          </View>

          {biometricAvailable && (
            <View className="flex-row items-center justify-between bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3.5">
              <View className="flex-1 mr-3">
                <Text className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {t('login.enableBiometric')}
                </Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {t('login.enableBiometricHint')}
                </Text>
              </View>
              <Switch
                value={enableBiometric}
                onValueChange={setEnableBiometric}
                trackColor={{ false: '#d1d5db', true: '#6366f1' }}
                thumbColor="#ffffff"
              />
            </View>
          )}

          <TouchableOpacity
            className={`bg-primary-600 rounded-xl py-4 items-center mt-2 ${
              isLoading ? 'opacity-50' : ''
            }`}
            onPress={handleCreate}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <Text className="text-white font-semibold text-base">
              {t('login.createPasswordButton')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </>
  );
}
