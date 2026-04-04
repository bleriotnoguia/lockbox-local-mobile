import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useLockboxStore } from "../../../src/store";
import {
  useLockboxStatus,
  getStatusColor,
  useCountdown,
  formatTimeRemaining,
} from "../../../src/hooks";
import { useTranslation } from "../../../src/i18n";
import { ReflectionModal } from "../../../src/components/ReflectionModal";
import { ExtendDelayModal } from "../../../src/components/ExtendDelayModal";
import type { Lockbox, AccessLogEntry } from "../../../src/types";

export default function LockboxDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, formatDelay } = useTranslation();

  const lockboxes = useLockboxStore((s) => s.lockboxes);
  const lockbox = lockboxes.find((lb) => lb.id === Number(id));

  if (!lockbox) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return <LockboxDetailContent lockbox={lockbox} />;
}

function LockboxDetailContent({ lockbox }: { lockbox: Lockbox }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, formatDelay } = useTranslation();
  const status = useLockboxStatus(lockbox);
  const statusColor = getStatusColor(status);

  const {
    fetchLockboxDecrypted,
    unlockLockbox,
    cancelUnlock,
    relockLockbox,
    deleteLockbox,
    usePanicCode,
    resetPanicCode,
    getAccessLog,
    checkAndUpdateStates,
  } = useLockboxStore();

  const [decryptedContent, setDecryptedContent] = useState<string | null>(null);
  const [isContentVisible, setIsContentVisible] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [panicInput, setPanicInput] = useState("");
  const [accessLog, setAccessLog] = useState<AccessLogEntry[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showReflection, setShowReflection] = useState(false);
  const [showExtendDelay, setShowExtendDelay] = useState(false);

  const countdownTimestamp =
    status === "unlocking"
      ? lockbox.unlock_timestamp
      : status === "scheduled"
        ? lockbox.scheduled_unlock_at
        : status === "unlocked"
          ? lockbox.relock_timestamp
          : null;

  const countdown = useCountdown(countdownTimestamp);

  useEffect(() => {
    if (!countdown || countdown.total > 0) return;
    if (status === "locked" || status === "unlocked") return;
    let cancelled = false;
    (async () => {
      await checkAndUpdateStates();
      if (cancelled) return;
      await checkAndUpdateStates();
    })();
    return () => {
      cancelled = true;
    };
  }, [countdown?.total, status, checkAndUpdateStates]);

  const loadDecryptedContent = useCallback(async () => {
    if (status !== "unlocked") {
      setDecryptedContent(null);
      setIsContentVisible(false);
      return;
    }
    setIsDecrypting(true);
    // On laisse le temps à React d'afficher le spinner avant de lancer la tâche lourde
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
    try {
      const result = await fetchLockboxDecrypted(lockbox.id);
      setDecryptedContent(result?.content ?? null);
    } catch {
      setDecryptedContent(null);
    } finally {
      setIsDecrypting(false);
    }
  }, [status, lockbox.id, fetchLockboxDecrypted]);

  useEffect(() => {
    loadDecryptedContent();
  }, [loadDecryptedContent]);

  useEffect(() => {
    if (showAdvanced) {
      getAccessLog(lockbox.id).then(setAccessLog);
    }
  }, [showAdvanced, lockbox.id, getAccessLog]);

  const handleUnlock = () => {
    if (lockbox.reflection_enabled) {
      setShowReflection(true);
      return;
    }

    Alert.alert(
      t("lockboxDetail.unlockConfirmTitle"),
      t("lockboxDetail.unlockConfirmMessage", {
        delay: formatDelay(lockbox.unlock_delay_seconds),
      }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.confirm"),
          onPress: async () => {
            await unlockLockbox(lockbox.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ],
    );
  };

  const handleCancel = () => {
    const message = lockbox.penalty_enabled
      ? t("lockboxDetail.cancelWithPenaltyMessage", {
          penalty: formatDelay(lockbox.penalty_seconds),
        })
      : t("lockboxDetail.cancelConfirmMessage");

    Alert.alert(t("lockboxDetail.cancelConfirmTitle"), message, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.confirm"),
        style: "destructive",
        onPress: async () => {
          await cancelUnlock(lockbox.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
      },
    ]);
  };

  const handleRelock = async () => {
    await relockLockbox(lockbox.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setDecryptedContent(null);
    setIsContentVisible(false);
  };

  const handleDelete = () => {
    Alert.alert(
      t("lockboxDetail.deleteConfirmTitle"),
      t("lockboxDetail.deleteConfirmMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            await deleteLockbox(lockbox.id);
            router.back();
          },
        },
      ],
    );
  };

  const handleCopy = async () => {
    if (decryptedContent) {
      await Clipboard.setStringAsync(decryptedContent);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("", t("lockboxDetail.contentCopied"));
    }
  };

  const handlePanicCode = async () => {
    if (!panicInput.trim()) return;
    const result = await usePanicCode(lockbox.id, panicInput.trim());
    if (result) {
      setPanicInput("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("", t("lockboxDetail.panicCodeSuccess"));
    } else {
      Alert.alert("", t("lockboxDetail.panicCodeInvalid"));
    }
  };

  return (
    <View
      className="flex-1 bg-gray-50 dark:bg-gray-900"
      style={{ paddingTop: insets.top }}
    >
      {/* Header */}
      <View className="flex-row items-center px-4 py-3">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-2 p-1 -ml-1"
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={28} color="#6366f1" />
        </TouchableOpacity>
        <Text
          className="text-lg font-bold text-gray-900 dark:text-white flex-1"
          numberOfLines={1}
        >
          {lockbox.name}
        </Text>
        <TouchableOpacity
          onPress={handleDelete}
          className="p-1"
          activeOpacity={0.7}
        >
          <Text className="text-red-500 text-sm">
            {t("lockboxDetail.delete")}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-8"
        showsVerticalScrollIndicator={false}
      >
        {/* Status + Countdown */}
        <View
          className="bg-white dark:bg-gray-800 rounded-2xl p-5 mb-4"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <View className="flex-row items-center mb-3">
            <View
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: statusColor }}
            />
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
              {t(`status.${status}`)}
            </Text>
          </View>

          {countdown && countdown.total > 0 && (
            <View className="items-center py-4">
              <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                {status === "unlocking"
                  ? t("lockboxDetail.unlockIn")
                  : status === "scheduled"
                    ? t("lockboxDetail.scheduledIn")
                    : t("lockboxDetail.relockIn")}
              </Text>
              <Text className="text-3xl font-bold font-mono text-gray-900 dark:text-white">
                {formatTimeRemaining(countdown)}
              </Text>
            </View>
          )}

          {/* Info rows */}
          <View className="border-t border-gray-100 dark:border-gray-700 pt-3 mt-2 gap-2">
            {lockbox.category && (
              <View className="flex-row justify-between">
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  {t("lockboxDetail.category")}
                </Text>
                <Text className="text-xs text-gray-700 dark:text-gray-300">
                  {t(`category.${lockbox.category}`) || lockbox.category}
                </Text>
              </View>
            )}
            <View className="flex-row justify-between">
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                {t("lockboxDetail.unlockDelay")}
              </Text>
              <Text className="text-xs text-gray-700 dark:text-gray-300">
                {formatDelay(lockbox.unlock_delay_seconds)}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                {t("lockboxDetail.relockDelay")}
              </Text>
              <Text className="text-xs text-gray-700 dark:text-gray-300">
                {formatDelay(lockbox.relock_delay_seconds)}
              </Text>
            </View>
            {lockbox.penalty_enabled && (
              <View className="bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-1.5 mt-1">
                <Text className="text-xs text-amber-700 dark:text-amber-300">
                  {t("lockboxDetail.penaltyBadge", {
                    penalty: formatDelay(lockbox.penalty_seconds),
                  })}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Content (when unlocked) */}
        {status === "unlocked" && (
          <View
            className="bg-white dark:bg-gray-800 rounded-2xl p-5 mb-4"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.06,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t("lockboxDetail.content")}
              </Text>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg"
                  onPress={() => setIsContentVisible(!isContentVisible)}
                  activeOpacity={0.7}
                >
                  <Text className="text-xs text-gray-600 dark:text-gray-400">
                    {isContentVisible
                      ? t("lockboxDetail.hide")
                      : t("lockboxDetail.show")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="px-3 py-1.5 bg-primary-100 dark:bg-primary-900/30 rounded-lg"
                  onPress={handleCopy}
                  activeOpacity={0.7}
                >
                  <Text className="text-xs text-primary-700 dark:text-primary-300">
                    {t("lockboxDetail.copy")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {isDecrypting ? (
              <ActivityIndicator size="small" color="#6366f1" />
            ) : isContentVisible && decryptedContent ? (
              <View className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
                <Text className="text-sm text-gray-800 dark:text-gray-200 font-mono">
                  {decryptedContent}
                </Text>
              </View>
            ) : (
              <View className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
                <Text className="text-sm text-gray-400 text-center">
                  {"•".repeat(24)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View className="gap-3 mb-4">
          {status === "locked" && (
            <TouchableOpacity
              className="bg-primary-600 rounded-xl py-4 items-center"
              onPress={handleUnlock}
              activeOpacity={0.7}
            >
              <Text className="text-white font-semibold text-base">
                {t("lockboxDetail.unlock")}
              </Text>
            </TouchableOpacity>
          )}

          {(status === "unlocking" || status === "scheduled") && (
            <>
              <TouchableOpacity
                className="bg-red-500 rounded-xl py-4 items-center"
                onPress={handleCancel}
                activeOpacity={0.7}
              >
                <Text className="text-white font-semibold text-base">
                  {status === "scheduled"
                    ? t("lockboxDetail.cancelScheduled")
                    : t("lockboxDetail.cancelUnlock")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-gray-200 dark:bg-gray-700 rounded-xl py-4 items-center"
                onPress={() => setShowExtendDelay(true)}
                activeOpacity={0.7}
              >
                <Text className="text-gray-700 dark:text-gray-300 font-semibold text-base">
                  {t("lockboxDetail.extendDelay")}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {status === "unlocked" && (
            <TouchableOpacity
              className="bg-gray-800 dark:bg-gray-200 rounded-xl py-4 items-center"
              onPress={handleRelock}
              activeOpacity={0.7}
            >
              <Text className="text-white dark:text-gray-900 font-semibold text-base">
                {t("lockboxDetail.relockNow")}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Advanced Section */}
        <TouchableOpacity
          className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-4 flex-row items-center justify-between"
          onPress={() => setShowAdvanced(!showAdvanced)}
          activeOpacity={0.8}
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {t("createLockbox.advancedOptions")}
          </Text>
          <Ionicons 
            name={showAdvanced ? "chevron-down" : "chevron-forward"} 
            size={20} 
            color="#9ca3af" 
          />
        </TouchableOpacity>

        {showAdvanced && (
          <View
            className="bg-white dark:bg-gray-800 rounded-2xl p-5 mb-4 gap-4"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.06,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            {/* Panic Code */}
            {lockbox.panic_code_hash && (
              <View>
                <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {t("lockboxDetail.panicCode")}
                </Text>
                {lockbox.panic_code_used ? (
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs text-gray-500">
                      {t("lockboxDetail.panicCodeUsed")}
                    </Text>
                  </View>
                ) : (
                  <View className="flex-row gap-2">
                    <TextInput
                      className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
                      placeholder={t("lockboxDetail.panicCodePlaceholder")}
                      placeholderTextColor="#9ca3af"
                      value={panicInput}
                      onChangeText={setPanicInput}
                      secureTextEntry
                    />
                    <TouchableOpacity
                      className="bg-orange-500 rounded-lg px-4 items-center justify-center"
                      onPress={handlePanicCode}
                      activeOpacity={0.7}
                    >
                      <Text className="text-white text-xs font-semibold">
                        {t("lockboxDetail.usePanicCode")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Access Log */}
            <View>
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {t("lockboxDetail.accessLog")}
              </Text>
              {accessLog.length === 0 ? (
                <Text className="text-xs text-gray-400">
                  {t("lockboxDetail.accessLogEmpty")}
                </Text>
              ) : (
                <View className="gap-1.5">
                  {accessLog.slice(0, 10).map((entry) => (
                    <View
                      key={entry.id}
                      className="flex-row justify-between items-center py-1"
                    >
                      <Text className="text-xs text-gray-600 dark:text-gray-400">
                        {t(`accessLog.${entry.event_type}` as string) ||
                          entry.event_type}
                      </Text>
                      <Text className="text-xs text-gray-400">
                        {new Date(entry.timestamp).toLocaleString()}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Reflection Modal */}
      <ReflectionModal
        visible={showReflection}
        message={lockbox.reflection_message}
        checklist={lockbox.reflection_checklist}
        onConfirm={async () => {
          setShowReflection(false);
          await unlockLockbox(lockbox.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
        onCancel={() => setShowReflection(false)}
      />

      {/* Extend Delay Modal */}
      <ExtendDelayModal
        visible={showExtendDelay}
        currentDelaySeconds={lockbox.unlock_delay_seconds}
        onConfirm={async (additionalSeconds) => {
          setShowExtendDelay(false);
          await useLockboxStore
            .getState()
            .extendUnlockDelay(lockbox.id, additionalSeconds);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
        onCancel={() => setShowExtendDelay(false)}
      />
    </View>
  );
}
