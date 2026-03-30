import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Lockbox } from '../types';
import { getLockboxStatus } from './useLockboxStatus';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function requestPermissions() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('lockbox-unlock', {
      name: 'Lockbox Unlocks',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export function useNotifications(lockboxes: Lockbox[]) {
  const scheduledRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    requestPermissions();
  }, []);

  useEffect(() => {
    for (const lockbox of lockboxes) {
      const status = getLockboxStatus(lockbox);

      if (status === 'unlocking' && lockbox.unlock_timestamp) {
        const key = `unlock-${lockbox.id}-${lockbox.unlock_timestamp}`;
        if (!scheduledRef.current.has(key)) {
          scheduledRef.current.add(key);
          const triggerDate = new Date(lockbox.unlock_timestamp);
          if (triggerDate.getTime() > Date.now()) {
            Notifications.scheduleNotificationAsync({
              content: {
                title: 'Lockbox Local',
                body: `Your lockbox "${lockbox.name}" is now unlocked.`,
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: triggerDate,
              },
            }).catch(() => {
              // notification scheduling can fail silently
            });
          }
        }
      }

      if (status === 'scheduled' && lockbox.scheduled_unlock_at) {
        const key = `scheduled-${lockbox.id}-${lockbox.scheduled_unlock_at}`;
        if (!scheduledRef.current.has(key)) {
          scheduledRef.current.add(key);
          const triggerDate = new Date(lockbox.scheduled_unlock_at);
          if (triggerDate.getTime() > Date.now()) {
            Notifications.scheduleNotificationAsync({
              content: {
                title: 'Lockbox Local',
                body: `Your lockbox "${lockbox.name}" is now unlocked.`,
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: triggerDate,
              },
            }).catch(() => {});
          }
        }
      }
    }
  }, [lockboxes]);
}
