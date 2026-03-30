import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { useTranslation } from '../i18n';
import { DELAY_PRESETS } from '../constants';

type TimeUnit = 'seconds' | 'minutes' | 'hours' | 'days';

function delayToSeconds(value: number, unit: TimeUnit): number {
  switch (unit) {
    case 'seconds': return value;
    case 'minutes': return value * 60;
    case 'hours': return value * 3600;
    case 'days': return value * 86400;
  }
}

interface ExtendDelayModalProps {
  visible: boolean;
  currentDelaySeconds: number;
  onConfirm: (additionalSeconds: number) => void;
  onCancel: () => void;
}

export function ExtendDelayModal({
  visible,
  currentDelaySeconds,
  onConfirm,
  onCancel,
}: ExtendDelayModalProps) {
  const { t, formatDelay } = useTranslation();
  const [value, setValue] = useState('30');
  const [unit, setUnit] = useState<TimeUnit>('minutes');
  const units: TimeUnit[] = ['seconds', 'minutes', 'hours', 'days'];

  const handleConfirm = () => {
    const seconds = delayToSeconds(Number(value) || 0, unit);
    if (seconds > 0) {
      onConfirm(seconds);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onCancel}
    >
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-white dark:bg-gray-800 rounded-t-3xl p-6">
          <Text className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            {t('extendDelay.title')}
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            {t('extendDelay.currentDelay', {
              delay: formatDelay(currentDelaySeconds),
            })}
          </Text>
          <Text className="text-xs text-red-500 dark:text-red-400 mb-5">
            {t('extendDelay.warning')}
          </Text>

          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('extendDelay.addTime')}
          </Text>

          <View className="flex-row gap-2 mb-3">
            <TextInput
              className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-base text-gray-900 dark:text-white w-24"
              value={value}
              onChangeText={setValue}
              keyboardType="numeric"
            />
            <View className="flex-row flex-1 gap-1">
              {units.map((u) => (
                <TouchableOpacity
                  key={u}
                  className={`flex-1 py-3 rounded-xl items-center ${
                    unit === u
                      ? 'bg-primary-600'
                      : 'bg-gray-100 dark:bg-gray-700'
                  }`}
                  onPress={() => setUnit(u)}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`text-[10px] font-medium ${
                      unit === u
                        ? 'text-white'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {t(`timeUnits.${u}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Presets */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-5"
            contentContainerClassName="gap-1.5"
          >
            {DELAY_PRESETS[unit].map((preset) => (
              <TouchableOpacity
                key={preset}
                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full"
                onPress={() => setValue(String(preset))}
                activeOpacity={0.7}
              >
                <Text className="text-xs text-gray-600 dark:text-gray-400">
                  {preset}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View className="gap-3">
            <TouchableOpacity
              className="bg-primary-600 rounded-xl py-4 items-center"
              onPress={handleConfirm}
              activeOpacity={0.7}
            >
              <Text className="text-white font-semibold text-base">
                {t('extendDelay.confirm')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-gray-100 dark:bg-gray-700 rounded-xl py-4 items-center"
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text className="text-gray-700 dark:text-gray-300 font-semibold text-base">
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
