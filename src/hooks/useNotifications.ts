import { useEffect, useRef } from 'react';
import Constants from 'expo-constants';
import type { Lockbox } from '../types';
import { getLockboxStatus } from './useLockboxStatus';
import { useNotificationSettingsStore } from '../store/notificationSettingsStore';

// expo-notifications is not supported in Expo Go (removed in SDK 53).
// Only load the module when running in a real build.
const isExpoGo = Constants.appOwnership === 'expo';

type NotificationsModule = typeof import('expo-notifications');
let Notifications: NotificationsModule | null = null;

if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications') as NotificationsModule;
    Notifications.setNotificationHandler({
      handleNotification: async () => {
        const soundEnabled =
          useNotificationSettingsStore.getState().soundEnabled;
        return {
          shouldShowAlert: true,
          shouldPlaySound: soundEnabled,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        };
      },
    });
  } catch {
    Notifications = null;
  }
}

// Small buffer added to the trigger time so the OS notification arrives
// after the in-app decryption spinner has had a chance to finish.
const DECRYPT_BUFFER_MS = 1500;

async function requestPermissions() {
  if (!Notifications) return false;
  try {
    const { Platform } = require('react-native');
    if (Platform.OS === 'android') {
      const soundEnabled =
        useNotificationSettingsStore.getState().soundEnabled;
      // Two channels: one with sound, one silent. Choose at schedule time.
      await Notifications.setNotificationChannelAsync('lockbox-unlock', {
        name: 'Lockbox Unlocks',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
      });
      await Notifications.setNotificationChannelAsync('lockbox-unlock-silent', {
        name: 'Lockbox Unlocks (silent)',
        importance: Notifications.AndroidImportance.HIGH,
        sound: null,
      });
    }
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

type ScheduledEntry = {
  identifier: string;
  triggerTs: number;
  kind: 'unlock' | 'scheduled';
};

export function useNotifications(lockboxes: Lockbox[]) {
  // Per-lockbox scheduled notification, indexed by lockbox.id.
  const scheduledRef = useRef<Map<number, ScheduledEntry>>(new Map());
  const soundEnabled = useNotificationSettingsStore((s) => s.soundEnabled);

  useEffect(() => {
    requestPermissions();
  }, [soundEnabled]);

  useEffect(() => {
    if (!Notifications) return;

    const seenIds = new Set<number>();

    for (const lockbox of lockboxes) {
      seenIds.add(lockbox.id);
      const status = getLockboxStatus(lockbox);
      const existing = scheduledRef.current.get(lockbox.id);

      let kind: 'unlock' | 'scheduled' | null = null;
      let triggerTs: number | null = null;
      if (status === 'unlocking' && lockbox.unlock_timestamp) {
        kind = 'unlock';
        triggerTs = lockbox.unlock_timestamp + DECRYPT_BUFFER_MS;
      } else if (status === 'scheduled' && lockbox.scheduled_unlock_at) {
        kind = 'scheduled';
        triggerTs = lockbox.scheduled_unlock_at + DECRYPT_BUFFER_MS;
      }

      // No pending unlock — cancel any previously scheduled notif.
      if (!kind || triggerTs == null) {
        if (existing) {
          Notifications.cancelScheduledNotificationAsync(existing.identifier).catch(
            () => {}
          );
          scheduledRef.current.delete(lockbox.id);
        }
        continue;
      }

      // Same notif already scheduled for this exact trigger — skip.
      if (
        existing &&
        existing.kind === kind &&
        existing.triggerTs === triggerTs
      ) {
        continue;
      }

      // Trigger changed (extend/cancel/re-unlock) — cancel the old one first.
      if (existing) {
        Notifications.cancelScheduledNotificationAsync(existing.identifier).catch(
          () => {}
        );
        scheduledRef.current.delete(lockbox.id);
      }

      if (triggerTs <= Date.now()) continue;

      const triggerDate = new Date(triggerTs);
      const lockboxId = lockbox.id;
      const lockboxName = lockbox.name;
      const kindForClosure = kind;
      const triggerTsForClosure = triggerTs;

      Notifications.scheduleNotificationAsync({
        content: {
          title: 'Lockbox Local',
          body: `Your lockbox "${lockboxName}" is now unlocked.`,
          sound: soundEnabled ? 'default' : null,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
          channelId: soundEnabled ? 'lockbox-unlock' : 'lockbox-unlock-silent',
        },
      })
        .then((identifier) => {
          // Only keep this entry if no newer scheduling has happened in the
          // meantime for the same lockbox.
          const current = scheduledRef.current.get(lockboxId);
          if (!current) {
            scheduledRef.current.set(lockboxId, {
              identifier,
              triggerTs: triggerTsForClosure,
              kind: kindForClosure,
            });
          }
        })
        .catch(() => {});
    }

    // Drop entries for lockboxes that no longer exist.
    for (const id of Array.from(scheduledRef.current.keys())) {
      if (!seenIds.has(id)) {
        const entry = scheduledRef.current.get(id);
        if (entry && Notifications) {
          Notifications.cancelScheduledNotificationAsync(entry.identifier).catch(
            () => {}
          );
        }
        scheduledRef.current.delete(id);
      }
    }
  }, [lockboxes, soundEnabled]);

  // When sound preference changes, force-cancel existing entries so the
  // next pass reschedules them with the new sound channel/setting.
  const prevSoundRef = useRef(soundEnabled);
  useEffect(() => {
    if (prevSoundRef.current === soundEnabled) return;
    prevSoundRef.current = soundEnabled;
    if (!Notifications) return;
    for (const [, entry] of scheduledRef.current) {
      Notifications.cancelScheduledNotificationAsync(entry.identifier).catch(
        () => {}
      );
    }
    scheduledRef.current.clear();
  }, [soundEnabled]);
}
