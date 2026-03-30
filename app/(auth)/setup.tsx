import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuthStore } from '../../src/store';
import { useTranslation } from '../../src/i18n';

export default function SetupScreen() {
  const { t } = useTranslation();
  const { setMasterPassword, isLoading } = useAuthStore();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
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

    await setMasterPassword(password);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
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
  );
}
