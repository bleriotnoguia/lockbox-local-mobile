import { useEffect, useRef } from 'react';
import Constants from 'expo-constants';
import type { Lockbox } from '../types';
import { getLockboxStatus } from './useLockboxStatus';

// expo-notifications is not supported in Expo Go (removed in SDK 53).
// Only load the module when running in a real build.
const isExpoGo = Constants.appOwnership === 'expo';

type NotificationsModule = typeof import('expo-notifications');
let Notifications: NotificationsModule | null = null;

if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications') as NotificationsModule;
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {
    Notifications = null;
  }
}

async function requestPermissions() {
  if (!Notifications) return false;
  try {
    const { Platform } = require('react-native');
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('lockbox-unlock', {
        name: 'Lockbox Unlocks',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export function useNotifications(lockboxes: Lockbox[]) {
  const scheduledRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    requestPermissions();
  }, []);

  useEffect(() => {
    if (!Notifications) return;

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
            }).catch(() => {});
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
