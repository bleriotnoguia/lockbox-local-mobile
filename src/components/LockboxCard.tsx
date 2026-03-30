import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import type { Lockbox } from '../types';
import { parseTags } from '../types';
import { useLockboxStatus, getStatusColor, useCountdown, formatTimeRemaining } from '../hooks';
import { useTranslation } from '../i18n';

interface LockboxCardProps {
  lockbox: Lockbox;
  onPress: () => void;
  isSelected?: boolean;
}

export function LockboxCard({ lockbox, onPress, isSelected }: LockboxCardProps) {
  const { t } = useTranslation();
  const status = useLockboxStatus(lockbox);
  const statusColor = getStatusColor(status);
  const tags = parseTags(lockbox.tags);

  const countdownTimestamp =
    status === 'unlocking'
      ? lockbox.unlock_timestamp
      : status === 'scheduled'
        ? lockbox.scheduled_unlock_at
        : status === 'unlocked'
          ? lockbox.relock_timestamp
          : null;

  const countdown = useCountdown(countdownTimestamp);

  const countdownLabel =
    status === 'unlocking'
      ? t('lockboxCard.unlockIn')
      : status === 'scheduled'
        ? t('lockboxCard.scheduledIn')
        : status === 'unlocked'
          ? t('lockboxCard.relockIn')
          : '';

  return (
    <TouchableOpacity
      className={`bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3 border-2 ${
        isSelected
          ? 'border-primary-500'
          : 'border-transparent'
      }`}
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
      }}
    >
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center flex-1 mr-2">
          <View
            className="w-2.5 h-2.5 rounded-full mr-2.5"
            style={{ backgroundColor: statusColor }}
          />
          <Text
            className="text-base font-semibold text-gray-900 dark:text-white flex-shrink"
            numberOfLines={1}
          >
            {lockbox.name}
          </Text>
        </View>

        {lockbox.category && (
          <View className="bg-primary-100 dark:bg-primary-900/30 px-2.5 py-0.5 rounded-full">
            <Text className="text-xs text-primary-700 dark:text-primary-300">
              {t(`category.${lockbox.category}` as string) || lockbox.category}
            </Text>
          </View>
        )}
      </View>

      <View className="flex-row items-center justify-between">
        <Text className="text-xs text-gray-500 dark:text-gray-400 capitalize">
          {t(`status.${status}`)}
        </Text>

        {countdown && countdown.total > 0 && (
          <View className="flex-row items-center">
            <Text className="text-xs text-gray-400 dark:text-gray-500 mr-1">
              {countdownLabel}
            </Text>
            <Text className="text-xs font-mono font-semibold text-gray-700 dark:text-gray-300">
              {formatTimeRemaining(countdown)}
            </Text>
          </View>
        )}
      </View>

      {tags.length > 0 && (
        <View className="flex-row flex-wrap mt-2 gap-1">
          {tags.slice(0, 3).map((tag) => (
            <View
              key={tag}
              className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded"
            >
              <Text className="text-[10px] text-gray-600 dark:text-gray-400">
                {tag}
              </Text>
            </View>
          ))}
          {tags.length > 3 && (
            <Text className="text-[10px] text-gray-400 self-center">
              +{tags.length - 3}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}
