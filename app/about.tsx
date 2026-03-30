import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '../src/i18n';

export default function AboutScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

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
        >
          <Text className="text-primary-600 dark:text-primary-400 text-base">
            {t('common.close')}
          </Text>
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900 dark:text-white">
          {t('about.title')}
        </Text>
        <View className="w-14" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 py-6 items-center"
        showsVerticalScrollIndicator={false}
      >
        {/* Icon + Name */}
        <View className="w-20 h-20 rounded-2xl bg-primary-600 items-center justify-center mb-4">
          <Text className="text-4xl">🔒</Text>
        </View>
        <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          Lockbox Local
        </Text>
        <Text className="text-sm text-gray-500 dark:text-gray-400 mb-1">
          {t('about.version')} 1.0.0
        </Text>
        <Text className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6 px-4">
          {t('about.description')}
        </Text>

        {/* Info Card */}
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-5 w-full mb-4">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {t('about.developer')}
            </Text>
            <Text className="text-sm font-medium text-gray-900 dark:text-white">
              {t('about.developerName')}
            </Text>
          </View>

          <TouchableOpacity
            className="flex-row justify-between items-center py-2"
            onPress={() =>
              Linking.openURL('https://github.com/BleriotMusic')
            }
            activeOpacity={0.7}
          >
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {t('about.github')}
            </Text>
            <Text className="text-sm text-primary-600 dark:text-primary-400">
              github.com/BleriotMusic
            </Text>
          </TouchableOpacity>
        </View>

        {/* Privacy Note */}
        <View className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4 w-full">
          <Text className="text-sm text-green-700 dark:text-green-300 text-center">
            🔒 {t('about.privacyNote')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
