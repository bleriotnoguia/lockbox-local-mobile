import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '../i18n';

interface PasswordGeneratorProps {
  visible: boolean;
  onClose: () => void;
  onUsePassword?: (password: string) => void;
}

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

function generatePassword(
  length: number,
  useUpper: boolean,
  useLower: boolean,
  useNums: boolean,
  useSyms: boolean
): string {
  const pools: string[] = [];
  if (useUpper) pools.push(UPPERCASE);
  if (useLower) pools.push(LOWERCASE);
  if (useNums) pools.push(NUMBERS);
  if (useSyms) pools.push(SYMBOLS);
  if (pools.length === 0) return '';

  const fullPool = pools.join('');

  // Guarantee at least one character from each selected pool
  const required: string[] = pools.map(
    (p) => p[Math.floor(Math.random() * p.length)]
  );

  const remaining = length - required.length;
  const chars: string[] = [...required];
  for (let i = 0; i < remaining; i++) {
    chars.push(fullPool[Math.floor(Math.random() * fullPool.length)]);
  }

  // Fisher-Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

type StrengthLevel = 'weak' | 'fair' | 'good' | 'strong';

function getStrength(
  password: string,
  useUpper: boolean,
  useLower: boolean,
  useNums: boolean,
  useSyms: boolean
): StrengthLevel {
  if (!password) return 'weak';
  let poolSize = 0;
  if (useUpper) poolSize += 26;
  if (useLower) poolSize += 26;
  if (useNums) poolSize += 10;
  if (useSyms) poolSize += 32;
  const entropy = password.length * Math.log2(Math.max(poolSize, 1));
  if (entropy < 40) return 'weak';
  if (entropy < 60) return 'fair';
  if (entropy < 80) return 'good';
  return 'strong';
}

const STRENGTH_CONFIG: Record<
  StrengthLevel,
  { barClass: string; fraction: number }
> = {
  weak: { barClass: 'bg-red-500', fraction: 0.25 },
  fair: { barClass: 'bg-yellow-400', fraction: 0.5 },
  good: { barClass: 'bg-blue-500', fraction: 0.75 },
  strong: { barClass: 'bg-green-500', fraction: 1 },
};

const MIN_LENGTH = 8;
const MAX_LENGTH = 32;

export function PasswordGenerator({
  visible,
  onClose,
  onUsePassword,
}: PasswordGeneratorProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [length, setLength] = useState(16);
  const [useUpper, setUseUpper] = useState(true);
  const [useLower, setUseLower] = useState(true);
  const [useNums, setUseNums] = useState(true);
  const [useSyms, setUseSyms] = useState(false);
  const [password, setPassword] = useState(() =>
    generatePassword(16, true, true, true, false)
  );
  const [copied, setCopied] = useState(false);

  const handleGenerate = useCallback(() => {
    if (!useUpper && !useLower && !useNums && !useSyms) {
      Alert.alert('', t('passwordGenerator.atLeastOne'));
      return;
    }
    setPassword(generatePassword(length, useUpper, useLower, useNums, useSyms));
    setCopied(false);
  }, [length, useUpper, useLower, useNums, useSyms, t]);

  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [password]);

  const handleUse = useCallback(() => {
    onUsePassword?.(password);
    onClose();
  }, [password, onUsePassword, onClose]);

  const changeLength = (delta: number) => {
    setLength((prev) => {
      const next = Math.min(MAX_LENGTH, Math.max(MIN_LENGTH, prev + delta));
      return next;
    });
  };

  const toggleOption = (
    current: boolean,
    setter: (v: boolean) => void,
    otherOptions: boolean[]
  ) => {
    // Prevent deselecting the last option
    if (current && otherOptions.every((o) => !o)) return;
    setter(!current);
    setCopied(false);
  };

  const strength = getStrength(password, useUpper, useLower, useNums, useSyms);
  const strengthLabel = t(`passwordGenerator.strength${strength.charAt(0).toUpperCase() + strength.slice(1)}` as never);
  const { barClass, fraction } = STRENGTH_CONFIG[strength];

  const options: {
    key: string;
    value: boolean;
    setter: (v: boolean) => void;
    others: boolean[];
  }[] = [
    {
      key: 'uppercase',
      value: useUpper,
      setter: setUseUpper,
      others: [useLower, useNums, useSyms],
    },
    {
      key: 'lowercase',
      value: useLower,
      setter: setUseLower,
      others: [useUpper, useNums, useSyms],
    },
    {
      key: 'numbers',
      value: useNums,
      setter: setUseNums,
      others: [useUpper, useLower, useSyms],
    },
    {
      key: 'symbols',
      value: useSyms,
      setter: setUseSyms,
      others: [useUpper, useLower, useNums],
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        className="flex-1 bg-gray-50 dark:bg-gray-900"
        style={{ paddingTop: insets.top }}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} className="p-1 -ml-1">
            <Ionicons name="chevron-back" size={28} color="#6366f1" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900 dark:text-white">
            {t('passwordGenerator.title')}
          </Text>
          <View className="w-8" />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Generated password */}
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-4">
            <Text
              className="text-xl font-mono font-semibold text-gray-900 dark:text-white text-center mb-3 tracking-widest"
              selectable
              numberOfLines={2}
            >
              {password}
            </Text>

            {/* Strength bar */}
            <View className="mb-3">
              <View className="flex-row justify-between mb-1">
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  {t('passwordGenerator.strength')}
                </Text>
                <Text
                  className={`text-xs font-semibold ${
                    strength === 'weak'
                      ? 'text-red-500'
                      : strength === 'fair'
                        ? 'text-yellow-500'
                        : strength === 'good'
                          ? 'text-blue-500'
                          : 'text-green-500'
                  }`}
                >
                  {strengthLabel}
                </Text>
              </View>
              <View className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <View
                  className={`h-full rounded-full ${barClass}`}
                  style={{ width: `${fraction * 100}%` }}
                />
              </View>
            </View>

            {/* Action buttons */}
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={handleCopy}
                activeOpacity={0.7}
                className="flex-1 flex-row items-center justify-center gap-2 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-xl"
              >
                <Ionicons
                  name={copied ? 'checkmark' : 'copy-outline'}
                  size={16}
                  color={copied ? '#22c55e' : '#6b7280'}
                />
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {copied ? t('passwordGenerator.copied') : t('passwordGenerator.copy')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleGenerate}
                activeOpacity={0.7}
                className="flex-1 flex-row items-center justify-center gap-2 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-xl"
              >
                <Ionicons name="refresh-outline" size={16} color="#6b7280" />
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('passwordGenerator.generate')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Length control */}
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-4">
            <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              {t('passwordGenerator.length')}
            </Text>
            <View className="flex-row items-center justify-between">
              <TouchableOpacity
                onPress={() => changeLength(-1)}
                activeOpacity={0.7}
                className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 items-center justify-center"
              >
                <Ionicons name="remove" size={20} color="#6b7280" />
              </TouchableOpacity>

              <View className="items-center">
                <Text className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                  {length}
                </Text>
                <Text className="text-xs text-gray-400 dark:text-gray-500">
                  {MIN_LENGTH}–{MAX_LENGTH}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => changeLength(1)}
                activeOpacity={0.7}
                className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 items-center justify-center"
              >
                <Ionicons name="add" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Quick length presets */}
            <View className="flex-row gap-2 mt-3">
              {[8, 12, 16, 24, 32].map((preset) => (
                <TouchableOpacity
                  key={preset}
                  onPress={() => setLength(preset)}
                  activeOpacity={0.7}
                  className={`flex-1 py-1.5 rounded-lg items-center ${
                    length === preset
                      ? 'bg-primary-600'
                      : 'bg-gray-100 dark:bg-gray-700'
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      length === preset
                        ? 'text-white'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {preset}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Character options */}
          <View className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden mb-6">
            {options.map(({ key, value, setter, others }, idx) => (
              <TouchableOpacity
                key={key}
                onPress={() => toggleOption(value, setter, others)}
                activeOpacity={0.7}
                className={`flex-row items-center justify-between px-4 py-3.5 ${
                  idx < options.length - 1
                    ? 'border-b border-gray-100 dark:border-gray-700'
                    : ''
                }`}
              >
                <Text className="text-sm text-gray-700 dark:text-gray-300">
                  {t(`passwordGenerator.${key}` as never)}
                </Text>
                <View
                  className={`w-5 h-5 rounded items-center justify-center ${
                    value
                      ? 'bg-primary-600'
                      : 'border-2 border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {value && (
                    <Ionicons name="checkmark" size={12} color="white" />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Use button — only shown when opened from a form */}
          {onUsePassword && (
            <TouchableOpacity
              onPress={handleUse}
              activeOpacity={0.8}
              className="bg-primary-600 dark:bg-primary-500 py-4 rounded-xl items-center"
            >
              <Text className="text-white text-base font-bold">
                {t('passwordGenerator.use')}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
