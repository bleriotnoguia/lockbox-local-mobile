import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { useTranslation } from '../i18n';

interface ReflectionModalProps {
  visible: boolean;
  message?: string | null;
  checklist?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const COUNTDOWN_SECONDS = 10;

export function ReflectionModal({
  visible,
  message,
  checklist,
  onConfirm,
  onCancel,
}: ReflectionModalProps) {
  const { t } = useTranslation();
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  const checklistItems = checklist
    ? checklist
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  useEffect(() => {
    if (!visible) {
      setCountdown(COUNTDOWN_SECONDS);
      setCheckedItems(new Set());
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [visible]);

  const allChecked =
    checklistItems.length === 0 ||
    checkedItems.size === checklistItems.length;

  const canConfirm = countdown === 0 && allChecked;

  const toggleItem = (index: number) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onCancel}
    >
      <View className="flex-1 bg-black/60 justify-center px-6">
        <View className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-h-[80%]">
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Title */}
            <Text className="text-xl font-bold text-gray-900 dark:text-white text-center mb-4">
              {t('reflection.title')}
            </Text>

            {/* Message */}
            <View className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 mb-5">
              <Text className="text-base text-amber-800 dark:text-amber-200 text-center">
                {message || t('reflection.defaultMessage')}
              </Text>
            </View>

            {/* Countdown */}
            <View className="items-center mb-5">
              {countdown > 0 ? (
                <>
                  <Text className="text-5xl font-bold text-primary-600 dark:text-primary-400 mb-2">
                    {countdown}
                  </Text>
                  <Text className="text-sm text-gray-500 dark:text-gray-400 text-center">
                    {t('reflection.countdown', { seconds: countdown })}
                  </Text>
                </>
              ) : (
                <Text className="text-sm text-green-600 dark:text-green-400 font-medium text-center">
                  {t('reflection.countdownDone')}
                </Text>
              )}
            </View>

            {/* Checklist */}
            {checklistItems.length > 0 && (
              <View className="mb-5">
                <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  {t('reflection.checklistTitle')}
                </Text>
                {checklistItems.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    className="flex-row items-center py-2"
                    onPress={() => toggleItem(index)}
                    activeOpacity={0.7}
                  >
                    <View
                      className={`w-5 h-5 rounded border-2 mr-3 items-center justify-center ${
                        checkedItems.has(index)
                          ? 'bg-primary-600 border-primary-600'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {checkedItems.has(index) && (
                        <Text className="text-white text-xs">✓</Text>
                      )}
                    </View>
                    <Text className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
                {!allChecked && (
                  <Text className="text-xs text-red-500 mt-1">
                    {t('reflection.checklistRequired')}
                  </Text>
                )}
              </View>
            )}
          </ScrollView>

          {/* Buttons */}
          <View className="gap-3 mt-2">
            <TouchableOpacity
              className={`rounded-xl py-4 items-center ${
                canConfirm ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
              onPress={onConfirm}
              disabled={!canConfirm}
              activeOpacity={0.7}
            >
              <Text
                className={`font-semibold text-base ${
                  canConfirm ? 'text-white' : 'text-gray-500'
                }`}
              >
                {t('reflection.confirmUnlock')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="rounded-xl py-4 items-center bg-gray-100 dark:bg-gray-700"
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text className="font-semibold text-base text-gray-700 dark:text-gray-300">
                {t('reflection.cancelUnlock')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
