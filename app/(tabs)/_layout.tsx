import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';
import { useColorScheme } from 'nativewind';
import { useTranslation } from '../../src/i18n';
import { useThemeStore } from '../../src/store';

function TabIcon({
  icon,
  focused,
}: {
  icon: string;
  focused: boolean;
}) {
  return (
    <View className="items-center justify-center">
      <Text className={`text-xl ${focused ? 'opacity-100' : 'opacity-50'}`}>
        {icon}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  const { t } = useTranslation();
  const theme = useThemeStore((s) => s.theme);
  const { colorScheme } = useColorScheme();
  // Use nativewind's colorScheme for 'system' mode so it reacts to OS changes
  const isDark =
    theme === 'dark' || (theme === 'system' && colorScheme === 'dark');

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? '#1f2937' : '#ffffff',
          borderTopColor: isDark ? '#374151' : '#e5e7eb',
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: isDark ? '#9ca3af' : '#6b7280',
      }}
    >
      <Tabs.Screen
        name="lockboxes"
        options={{
          title: 'Lockboxes',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="🔐" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: t('stats.title'),
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="📊" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
