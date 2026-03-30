import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLockboxStore } from '../../src/store';
import { useTranslation } from '../../src/i18n';
import type { AccessLogEntry } from '../../src/types';

interface Stats {
  totalRequests: number;
  totalCompleted: number;
  totalCancelled: number;
  totalPanic: number;
  totalExtensions: number;
  thisMonthRequests: number;
  thisMonthCompleted: number;
  thisMonthCancelled: number;
}

function computeStats(entries: AccessLogEntry[]): Stats {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const monthTs = startOfMonth.getTime();

  const count = (type: string, fromTs = 0) =>
    entries.filter((e) => e.event_type === type && e.timestamp >= fromTs)
      .length;

  return {
    totalRequests: count('unlock_requested'),
    totalCompleted: count('unlock_completed'),
    totalCancelled: count('unlock_cancelled'),
    totalPanic: count('panic_used'),
    totalExtensions: count('extend_delay'),
    thisMonthRequests: count('unlock_requested', monthTs),
    thisMonthCompleted: count('unlock_completed', monthTs),
    thisMonthCancelled: count('unlock_cancelled', monthTs),
  };
}

function computeStreak(entries: AccessLogEntry[]): number {
  const completedTimestamps = entries
    .filter((e) => e.event_type === 'unlock_completed')
    .map((e) => e.timestamp)
    .sort((a, b) => b - a);

  if (completedTimestamps.length === 0) return 0;

  const now = Date.now();
  const lastAccess = completedTimestamps[0];
  return Math.floor((now - lastAccess) / (1000 * 60 * 60 * 24));
}

function StatCard({
  icon,
  label,
  value,
  sub,
  color = 'text-primary-600 dark:text-primary-400',
}: {
  icon: string;
  label: string;
  value: number | string;
  sub?: string;
  color?: string;
}) {
  return (
    <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex-1">
      <View className="flex-row items-center gap-2 mb-2">
        <Text className="text-base">{icon}</Text>
        <Text className="text-xs text-gray-500 dark:text-gray-400 flex-1">
          {label}
        </Text>
      </View>
      <Text className={`text-2xl font-bold ${color}`}>{value}</Text>
      {sub && (
        <Text className="text-xs text-gray-400 mt-1">{sub}</Text>
      )}
    </View>
  );
}

export default function StatsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const lockboxes = useLockboxStore((s) => s.lockboxes);
  const getGlobalAccessLog = useLockboxStore((s) => s.getGlobalAccessLog);
  const [entries, setEntries] = useState<AccessLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    getGlobalAccessLog().then((data) => {
      setEntries(data);
      setIsLoading(false);
    });
  }, [getGlobalAccessLog]);

  const stats = computeStats(entries);
  const streakDays = computeStreak(entries);

  const successRate =
    stats.totalRequests > 0
      ? Math.round((stats.totalCompleted / stats.totalRequests) * 100)
      : 0;

  const cancelRate =
    stats.totalRequests > 0
      ? Math.round((stats.totalCancelled / stats.totalRequests) * 100)
      : 0;

  const hasData = entries.length > 0;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900" style={{ paddingTop: insets.top }}>
      <View className="px-4 pt-3 pb-2">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('stats.title')}
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : !hasData ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-5xl mb-4 opacity-30">📊</Text>
          <Text className="text-base text-gray-400 dark:text-gray-500 text-center">
            {t('stats.noData')}
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 pb-8"
          showsVerticalScrollIndicator={false}
        >
          {/* All Time */}
          <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 mt-2">
            {t('stats.allTime')}
          </Text>
          <View className="gap-3 mb-6">
            <View className="flex-row gap-3">
              <StatCard
                icon="📈"
                label={t('stats.totalUnlockRequests')}
                value={stats.totalRequests}
              />
              <StatCard
                icon="✅"
                label={t('stats.totalUnlockCompleted')}
                value={stats.totalCompleted}
                sub={`${successRate}% ${t('stats.successRate')}`}
                color="text-green-600 dark:text-green-400"
              />
            </View>
            <View className="flex-row gap-3">
              <StatCard
                icon="❌"
                label={t('stats.totalCancellations')}
                value={stats.totalCancelled}
                sub={`${cancelRate}% ${t('stats.cancelRate')}`}
                color="text-red-500 dark:text-red-400"
              />
              <StatCard
                icon="⚡"
                label={t('stats.totalPanicUses')}
                value={stats.totalPanic}
                color="text-orange-500 dark:text-orange-400"
              />
            </View>
            <View className="flex-row gap-3">
              <StatCard
                icon="⏱️"
                label={t('stats.totalExtensions')}
                value={stats.totalExtensions}
                color="text-blue-500 dark:text-blue-400"
              />
              <StatCard
                icon="🔐"
                label={t('stats.totalLockboxes')}
                value={lockboxes.length}
              />
            </View>
          </View>

          {/* This Month */}
          <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            {t('stats.thisMonth')}
          </Text>
          <View className="flex-row gap-3 mb-6">
            <StatCard
              icon="📈"
              label={t('stats.totalUnlockRequests')}
              value={stats.thisMonthRequests}
            />
            <StatCard
              icon="✅"
              label={t('stats.totalUnlockCompleted')}
              value={stats.thisMonthCompleted}
              color="text-green-600 dark:text-green-400"
            />
            <StatCard
              icon="❌"
              label={t('stats.totalCancellations')}
              value={stats.thisMonthCancelled}
              color="text-red-500 dark:text-red-400"
            />
          </View>

          {/* Streak */}
          <View className="bg-primary-50 dark:bg-primary-900/20 rounded-2xl p-5 border border-primary-200 dark:border-primary-800">
            <Text className="text-sm font-semibold text-primary-700 dark:text-primary-300 mb-1">
              {t('stats.streakTitle')}
            </Text>
            <Text className="text-3xl font-bold text-primary-600 dark:text-primary-400">
              {t('stats.streakDays', { days: streakDays })}
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
