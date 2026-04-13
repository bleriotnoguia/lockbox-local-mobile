import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from '../i18n';
import { DELAY_PRESETS } from '../constants';

export type TimeUnit = 'seconds' | 'minutes' | 'hours' | 'days';

export function delayToSeconds(value: number, unit: TimeUnit): number {
  switch (unit) {
    case 'seconds': return value;
    case 'minutes': return value * 60;
    case 'hours':   return value * 3600;
    case 'days':    return value * 86400;
  }
}

export function secondsToDisplay(totalSeconds: number): { value: string; unit: TimeUnit } {
  if (totalSeconds >= 86400 && totalSeconds % 86400 === 0)
    return { value: String(totalSeconds / 86400), unit: 'days' };
  if (totalSeconds >= 3600 && totalSeconds % 3600 === 0)
    return { value: String(totalSeconds / 3600), unit: 'hours' };
  if (totalSeconds >= 60 && totalSeconds % 60 === 0)
    return { value: String(totalSeconds / 60), unit: 'minutes' };
  return { value: String(totalSeconds), unit: 'seconds' };
}

interface DelayPickerProps {
  label: string;
  hint: string;
  value: string;
  unit: TimeUnit;
  onValueChange: (v: string) => void;
  onUnitChange: (u: TimeUnit) => void;
  disabled?: boolean;
}

export function DelayPicker({
  label,
  hint,
  value,
  unit,
  onValueChange,
  onUnitChange,
  disabled = false,
}: DelayPickerProps) {
  const { t } = useTranslation();
  const units: TimeUnit[] = ['seconds', 'minutes', 'hours', 'days'];

  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
        {label}
      </Text>
      <Text className="text-xs text-gray-500 dark:text-gray-400 mb-2">
        {hint}
      </Text>
      <View className="flex-row gap-2">
        <TextInput
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-base text-gray-900 dark:text-white w-24"
          value={value}
          onChangeText={onValueChange}
          keyboardType="numeric"
          maxLength={5}
          editable={!disabled}
        />
        <View className="flex-row flex-1 gap-1">
          {units.map((u) => (
            <TouchableOpacity
              key={u}
              className={`flex-1 py-3 rounded-xl items-center justify-center ${
                unit === u
                  ? 'bg-primary-600'
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
              }`}
              onPress={() => {
                if (unit !== u) {
                  onUnitChange(u);
                  const first = DELAY_PRESETS[u][0];
                  if (first) onValueChange(String(first));
                  else onValueChange('');
                }
              }}
              activeOpacity={0.7}
              disabled={disabled}
            >
              <Text
                className={`text-[10px] font-medium ${
                  unit === u ? 'text-white' : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                {t(`timeUnits.${u}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mt-2"
        contentContainerClassName="gap-1.5"
      >
        {DELAY_PRESETS[unit].map((preset) => (
          <TouchableOpacity
            key={preset}
            className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full"
            onPress={() => onValueChange(String(preset))}
            activeOpacity={0.7}
            disabled={disabled}
          >
            <Text className="text-xs text-gray-600 dark:text-gray-400">
              {preset}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
