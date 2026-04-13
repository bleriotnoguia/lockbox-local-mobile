import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useLockboxStore } from '../../src/store';
import { useLockboxStatus } from '../../src/hooks';
import { useTranslation } from '../../src/i18n';
import { getLockboxEditPermissions } from '../../src/utils/lockboxPermissions';
import { CATEGORIES } from '../../src/constants';
import { parseTags, serializeTags } from '../../src/types';
import {
  PasswordGenerator,
  DelayPicker,
  delayToSeconds,
  secondsToDisplay,
} from '../../src/components';
import type { TimeUnit } from '../../src/components';
import type { Lockbox } from '../../src/types';

export default function EditLockboxScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lockboxes = useLockboxStore((s) => s.lockboxes);
  const lockbox = lockboxes.find((lb) => lb.id === Number(id));

  if (!lockbox) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return <EditLockboxContent lockbox={lockbox} />;
}

function EditLockboxContent({ lockbox }: { lockbox: Lockbox }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const status = useLockboxStatus(lockbox);
  const perms = getLockboxEditPermissions(status);

  const { fetchLockboxDecrypted, updateLockbox, resetPanicCode, postponeScheduledUnlock } =
    useLockboxStore();

  // Always-editable fields
  const [name, setName] = useState(lockbox.name);
  const [category, setCategory] = useState<string | undefined>(
    lockbox.category ?? undefined
  );
  const [tags, setTags] = useState<string[]>(parseTags(lockbox.tags));
  const [tagInput, setTagInput] = useState('');

  // Delays
  const unlockDisp = secondsToDisplay(lockbox.unlock_delay_seconds);
  const [unlockValue, setUnlockValue] = useState(unlockDisp.value);
  const [unlockUnit, setUnlockUnit] = useState<TimeUnit>(unlockDisp.unit);

  const relockDisp = secondsToDisplay(lockbox.relock_delay_seconds);
  const [relockValue, setRelockValue] = useState(relockDisp.value);
  const [relockUnit, setRelockUnit] = useState<TimeUnit>(relockDisp.unit);

  // Advanced
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [reflectionEnabled, setReflectionEnabled] = useState(
    lockbox.reflection_enabled
  );
  const [reflectionMessage, setReflectionMessage] = useState(
    lockbox.reflection_message ?? ''
  );
  const [reflectionChecklist, setReflectionChecklist] = useState(
    lockbox.reflection_checklist ?? ''
  );
  const [penaltyEnabled, setPenaltyEnabled] = useState(lockbox.penalty_enabled);
  const penaltyDisp = secondsToDisplay(lockbox.penalty_seconds || 30);
  const [penaltyValue, setPenaltyValue] = useState(penaltyDisp.value);
  const [penaltyUnit, setPenaltyUnit] = useState<TimeUnit>(penaltyDisp.unit);

  // Unlocked-only: content
  const [content, setContent] = useState('');
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [showPasswordGenerator, setShowPasswordGenerator] = useState(false);

  // Unlocked-only: scheduled unlock
  const [scheduledEnabled, setScheduledEnabled] = useState(
    lockbox.scheduled_unlock_at != null
  );
  const [scheduledDate, setScheduledDate] = useState<Date>(
    lockbox.scheduled_unlock_at
      ? new Date(lockbox.scheduled_unlock_at)
      : new Date(Date.now() + 86400 * 1000)
  );
  const [showScheduleDatePicker, setShowScheduleDatePicker] = useState(false);
  const [scheduleDatePickerMode, setScheduleDatePickerMode] = useState<
    'date' | 'time'
  >('date');

  // Unlocked-only: panic code management
  const [newPanicCode, setNewPanicCode] = useState('');
  const [removePanicCode, setRemovePanicCode] = useState(false);

  // Scheduled-only: postpone
  const [postponeDate, setPostponeDate] = useState<Date>(
    lockbox.scheduled_unlock_at
      ? new Date(lockbox.scheduled_unlock_at + 86400 * 1000)
      : new Date(Date.now() + 2 * 86400 * 1000)
  );
  const [showPostponePicker, setShowPostponePicker] = useState(false);
  const [postponePickerMode, setPostponePickerMode] = useState<'date' | 'time'>(
    'date'
  );
  const [hasPostponed, setHasPostponed] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load decrypted content if unlocked
  const loadContent = useCallback(async () => {
    if (!perms.canEditContent) return;
    setIsLoadingContent(true);
    try {
      const result = await fetchLockboxDecrypted(lockbox.id);
      setContent(result?.content ?? '');
    } catch {
      setContent('');
    } finally {
      setIsLoadingContent(false);
    }
  }, [perms.canEditContent, lockbox.id, fetchLockboxDecrypted]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) setTags([...tags, trimmed]);
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('', t('createLockbox.nameRequired'));
      return;
    }

    const unlockNum = Number(unlockValue);
    if (isNaN(unlockNum) || unlockNum <= 0) {
      Alert.alert('', t('createLockbox.unlockDelay') + ' > 0');
      return;
    }
    const newUnlockSeconds = delayToSeconds(unlockNum, unlockUnit);

    if (!perms.canReduceDelay && newUnlockSeconds < lockbox.unlock_delay_seconds) {
      Alert.alert('', t('editLockbox.unlockDelayReduceHint'));
      return;
    }

    const relockNum = Number(relockValue);
    if (isNaN(relockNum) || relockNum <= 0) {
      Alert.alert('', t('createLockbox.relockDelay') + ' > 0');
      return;
    }

    let penaltySeconds = 0;
    if (penaltyEnabled) {
      const penaltyNum = Number(penaltyValue);
      if (isNaN(penaltyNum) || penaltyNum <= 0) {
        Alert.alert('', t('createLockbox.penaltyDelay') + ' > 0');
        return;
      }
      penaltySeconds = delayToSeconds(penaltyNum, penaltyUnit);
    }

    if (
      perms.canPostponeSchedule &&
      !perms.canManageSchedule &&
      hasPostponed &&
      postponeDate.getTime() <= Date.now()
    ) {
      Alert.alert('', t('editLockbox.schedulePostponeHint'));
      return;
    }

    setIsSubmitting(true);
    try {
      const updates: Parameters<typeof updateLockbox>[1] = {
        name: name.trim(),
        category: category ?? null,
        tags: serializeTags(tags) ?? null,
        unlock_delay_seconds: newUnlockSeconds,
        relock_delay_seconds: delayToSeconds(relockNum, relockUnit),
        reflection_enabled: reflectionEnabled,
        reflection_message: reflectionEnabled
          ? reflectionMessage.trim() || null
          : null,
        reflection_checklist: reflectionEnabled
          ? reflectionChecklist.trim() || null
          : null,
        penalty_enabled: penaltyEnabled,
        penalty_seconds: penaltySeconds,
      };

      if (perms.canEditContent) {
        updates.content = content.trim();
      }

      if (perms.canManageSchedule) {
        updates.scheduled_unlock_at = scheduledEnabled
          ? scheduledDate.getTime()
          : null;
      }

      await updateLockbox(lockbox.id, updates);

      if (perms.canManagePanicCode) {
        if (removePanicCode) {
          await resetPanicCode(lockbox.id);
        } else if (newPanicCode.trim()) {
          await resetPanicCode(lockbox.id, newPanicCode.trim());
        }
      }

      if (perms.canPostponeSchedule && !perms.canManageSchedule && hasPostponed) {
        await postponeScheduledUnlock(lockbox.id, postponeDate.getTime());
      }

      if (router.canDismiss()) router.dismiss();
      else router.back();
    } catch (e) {
      Alert.alert('', t('editLockbox.saveError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentScheduledTs = lockbox.scheduled_unlock_at;
  const minimumPostponeDate = currentScheduledTs
    ? new Date(currentScheduledTs + 60 * 1000)
    : new Date(Date.now() + 60 * 1000);

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Password generator modal */}
      <PasswordGenerator
        visible={showPasswordGenerator}
        onClose={() => setShowPasswordGenerator(false)}
        onUsePassword={(pwd) => setContent(pwd)}
      />

      {/* Header */}
      <View
        className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700"
        style={{ paddingTop: insets.top + 8 }}
      >
        <TouchableOpacity
          onPress={() => {
            if (router.canDismiss()) router.dismiss();
            else router.back();
          }}
          activeOpacity={0.7}
          disabled={isSubmitting}
        >
          <Text
            className={`text-base ${isSubmitting ? 'text-gray-400' : 'text-primary-600 dark:text-primary-400'}`}
          >
            {t('common.cancel')}
          </Text>
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900 dark:text-white">
          {t('editLockbox.title')}
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSubmitting}
          activeOpacity={0.7}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#9ca3af" />
          ) : (
            <Text className="text-base font-semibold text-primary-600 dark:text-primary-400">
              {t('common.save')}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 40,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid
        extraScrollHeight={20}
      >
        {/* Name */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {t('createLockbox.name')}
          </Text>
          <TextInput
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-base text-gray-900 dark:text-white"
            placeholder={t('createLockbox.namePlaceholder')}
            placeholderTextColor="#9ca3af"
            value={name}
            onChangeText={setName}
            editable={!isSubmitting}
          />
        </View>

        {/* Category */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {t('createLockbox.category')}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2"
          >
            <TouchableOpacity
              className={`px-3 py-2 rounded-lg ${
                !category
                  ? 'bg-primary-600'
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
              }`}
              onPress={() => setCategory(undefined)}
              activeOpacity={0.7}
            >
              <Text
                className={`text-xs ${!category ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}
              >
                {t('createLockbox.noCategory')}
              </Text>
            </TouchableOpacity>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c}
                className={`px-3 py-2 rounded-lg ${
                  category === c
                    ? 'bg-primary-600'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                }`}
                onPress={() => setCategory(c)}
                activeOpacity={0.7}
              >
                <Text
                  className={`text-xs ${category === c ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}
                >
                  {t(`category.${c}`) || c}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Tags */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {t('tags.label')}
          </Text>
          <View className="flex-row flex-wrap gap-1.5 mb-2">
            {tags.map((tag) => (
              <TouchableOpacity
                key={tag}
                className="flex-row items-center bg-primary-100 dark:bg-primary-900/30 px-2.5 py-1 rounded-full"
                onPress={() => handleRemoveTag(tag)}
              >
                <Text className="text-xs text-primary-700 dark:text-primary-300 mr-1">
                  {tag}
                </Text>
                <Text className="text-xs text-primary-500">×</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white"
            placeholder={t('tags.placeholder')}
            placeholderTextColor="#9ca3af"
            value={tagInput}
            onChangeText={(text) => {
              if (text.endsWith(',') || text.endsWith(' ')) {
                const trimmed = text.slice(0, -1).trim();
                if (trimmed && !tags.includes(trimmed))
                  setTags([...tags, trimmed]);
                setTagInput('');
              } else {
                setTagInput(text);
              }
            }}
            onSubmitEditing={handleAddTag}
            returnKeyType="done"
            editable={!isSubmitting}
          />
        </View>

        {/* Unlock Delay */}
        <DelayPicker
          label={t('createLockbox.unlockDelay')}
          hint={
            !perms.canReduceDelay
              ? t('editLockbox.unlockDelayReduceHint')
              : t('createLockbox.unlockDelayHint')
          }
          value={unlockValue}
          unit={unlockUnit}
          onValueChange={setUnlockValue}
          onUnitChange={setUnlockUnit}
          disabled={isSubmitting}
        />

        {/* Relock Delay */}
        <DelayPicker
          label={t('createLockbox.relockDelay')}
          hint={t('createLockbox.relockDelayHint')}
          value={relockValue}
          unit={relockUnit}
          onValueChange={setRelockValue}
          onUnitChange={setRelockUnit}
          disabled={isSubmitting}
        />

        {/* Advanced Options */}
        <TouchableOpacity
          className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4 flex-row items-center justify-between"
          onPress={() => setShowAdvanced(!showAdvanced)}
          activeOpacity={0.8}
          disabled={isSubmitting}
        >
          <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {t('createLockbox.advancedOptions')}
          </Text>
          <Ionicons
            name={showAdvanced ? 'chevron-down' : 'chevron-forward'}
            size={20}
            color="#9ca3af"
          />
        </TouchableOpacity>

        {showAdvanced && (
          <View className="gap-4 mb-4">
            {/* Reflection */}
            <View className="bg-white dark:bg-gray-800 rounded-xl p-4">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-1 mr-3">
                  <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {t('createLockbox.reflectionSection')}
                  </Text>
                  <Text className="text-xs text-gray-500 mt-0.5">
                    {t('createLockbox.reflectionSectionHint')}
                  </Text>
                </View>
                <Switch
                  value={reflectionEnabled}
                  onValueChange={setReflectionEnabled}
                  trackColor={{ true: '#6366f1' }}
                  disabled={isSubmitting}
                />
              </View>
              {reflectionEnabled && (
                <View className="mt-3 gap-3">
                  <TextInput
                    className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white"
                    placeholder={t('createLockbox.reflectionMessagePlaceholder')}
                    placeholderTextColor="#9ca3af"
                    value={reflectionMessage}
                    onChangeText={setReflectionMessage}
                    editable={!isSubmitting}
                  />
                  <TextInput
                    className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white min-h-[80px]"
                    placeholder={t('createLockbox.reflectionChecklistPlaceholder')}
                    placeholderTextColor="#9ca3af"
                    value={reflectionChecklist}
                    onChangeText={setReflectionChecklist}
                    multiline
                    textAlignVertical="top"
                    editable={!isSubmitting}
                  />
                </View>
              )}
            </View>

            {/* Penalty */}
            <View className="bg-white dark:bg-gray-800 rounded-xl p-4">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-1 mr-3">
                  <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {t('createLockbox.penaltySection')}
                  </Text>
                  <Text className="text-xs text-gray-500 mt-0.5">
                    {t('createLockbox.penaltySectionHint')}
                  </Text>
                </View>
                <Switch
                  value={penaltyEnabled}
                  onValueChange={setPenaltyEnabled}
                  trackColor={{ true: '#6366f1' }}
                  disabled={isSubmitting}
                />
              </View>
              {penaltyEnabled && (
                <View className="mt-3">
                  <DelayPicker
                    label={t('createLockbox.penaltyDelay')}
                    hint={t('createLockbox.penaltyDelayHint')}
                    value={penaltyValue}
                    unit={penaltyUnit}
                    onValueChange={setPenaltyValue}
                    onUnitChange={setPenaltyUnit}
                    disabled={isSubmitting}
                  />
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── Unlocked-only section: Content ── */}
        <SectionWithLock
          locked={!perms.canEditContent}
          lockedHint={t('editLockbox.contentLockedHint')}
        >
          <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4">
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('createLockbox.content')}
              </Text>
              {perms.canEditContent && (
                <TouchableOpacity
                  onPress={() => setShowPasswordGenerator(true)}
                  activeOpacity={0.7}
                  disabled={isSubmitting}
                  className="flex-row items-center gap-1 px-2.5 py-1 bg-primary-50 dark:bg-primary-900/30 rounded-lg"
                >
                  <Ionicons name="key-outline" size={13} color="#6366f1" />
                  <Text className="text-xs font-medium text-primary-600 dark:text-primary-400">
                    {t('passwordGenerator.title')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {isLoadingContent ? (
              <ActivityIndicator size="small" color="#6366f1" />
            ) : (
              <TextInput
                className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-base text-gray-900 dark:text-white min-h-[100px]"
                placeholder={t('createLockbox.contentPlaceholder')}
                placeholderTextColor="#9ca3af"
                value={content}
                onChangeText={setContent}
                multiline
                textAlignVertical="top"
                secureTextEntry
                editable={perms.canEditContent && !isSubmitting}
              />
            )}
          </View>
        </SectionWithLock>

        {/* ── Scheduled unlock ── */}
        {/* Scheduled state: postpone only */}
        {perms.canPostponeSchedule && !perms.canManageSchedule && (
          <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4">
            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {t('editLockbox.scheduleSection')}
            </Text>
            {currentScheduledTs && (
              <Text className="text-xs text-gray-500 mb-3">
                {t('editLockbox.scheduleCurrentDate', {
                  date: new Date(currentScheduledTs).toLocaleString(),
                })}
              </Text>
            )}
            <TouchableOpacity
              className="flex-row items-center gap-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-3"
              onPress={() => {
                setPostponePickerMode('date');
                setShowPostponePicker(true);
              }}
              activeOpacity={0.7}
              disabled={isSubmitting}
            >
              <Ionicons name="calendar-outline" size={16} color="#3b82f6" />
              <Text className="text-sm text-blue-700 dark:text-blue-300 flex-1">
                {hasPostponed
                  ? postponeDate.toLocaleString()
                  : t('editLockbox.schedulePostpone')}
              </Text>
              <Ionicons name="chevron-forward" size={14} color="#3b82f6" />
            </TouchableOpacity>
            {showPostponePicker && (
              <DateTimePicker
                value={postponeDate}
                mode={Platform.OS === 'android' ? postponePickerMode : 'datetime'}
                minimumDate={minimumPostponeDate}
                onChange={(event, date) => {
                  if (event.type === 'dismissed') {
                    setShowPostponePicker(false);
                    setPostponePickerMode('date');
                    return;
                  }
                  if (Platform.OS === 'android') {
                    if (postponePickerMode === 'date') {
                      if (date) setPostponeDate(date);
                      setPostponePickerMode('time');
                    } else {
                      if (date) { setPostponeDate(date); setHasPostponed(true); }
                      setShowPostponePicker(false);
                      setPostponePickerMode('date');
                    }
                  } else {
                    setShowPostponePicker(false);
                    if (date) { setPostponeDate(date); setHasPostponed(true); }
                  }
                }}
              />
            )}
          </View>
        )}

        {/* Unlocked state: full schedule management */}
        <SectionWithLock
          locked={!perms.canManageSchedule}
          lockedHint={t('editLockbox.scheduleLockedHint')}
          hideWhenLocked={perms.canPostponeSchedule}
        >
          <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-1 mr-3">
                <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {t('editLockbox.scheduleSection')}
                </Text>
                <Text className="text-xs text-gray-500 mt-0.5">
                  {t('createLockbox.scheduledSectionHint')}
                </Text>
              </View>
              <Switch
                value={scheduledEnabled}
                onValueChange={setScheduledEnabled}
                trackColor={{ true: '#6366f1' }}
                disabled={!perms.canManageSchedule || isSubmitting}
              />
            </View>
            {scheduledEnabled && (
              <View className="mt-3">
                <TouchableOpacity
                  className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-3"
                  onPress={() => {
                    setScheduleDatePickerMode('date');
                    setShowScheduleDatePicker(true);
                  }}
                  activeOpacity={0.7}
                  disabled={!perms.canManageSchedule || isSubmitting}
                >
                  <Text className="text-sm text-gray-700 dark:text-gray-300">
                    {scheduledDate.toLocaleString()}
                  </Text>
                </TouchableOpacity>
                {showScheduleDatePicker && (
                  <DateTimePicker
                    value={scheduledDate}
                    mode={
                      Platform.OS === 'android' ? scheduleDatePickerMode : 'datetime'
                    }
                    minimumDate={new Date()}
                    onChange={(event, date) => {
                      if (event.type === 'dismissed') {
                        setShowScheduleDatePicker(false);
                        setScheduleDatePickerMode('date');
                        return;
                      }
                      if (Platform.OS === 'android') {
                        if (scheduleDatePickerMode === 'date') {
                          if (date) setScheduledDate(date);
                          setScheduleDatePickerMode('time');
                        } else {
                          if (date) setScheduledDate(date);
                          setShowScheduleDatePicker(false);
                          setScheduleDatePickerMode('date');
                        }
                      } else {
                        setShowScheduleDatePicker(false);
                        if (date) setScheduledDate(date);
                      }
                    }}
                  />
                )}
              </View>
            )}
          </View>
        </SectionWithLock>

        {/* ── Panic code management ── */}
        <SectionWithLock
          locked={!perms.canManagePanicCode}
          lockedHint={t('editLockbox.panicLockedHint')}
        >
          <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4">
            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {t('createLockbox.panicSection')}
            </Text>
            <Text className="text-xs text-gray-500 mb-3">
              {t('createLockbox.panicSectionHint')}
            </Text>

            {lockbox.panic_code_hash && (
              <View className="mb-3 flex-row items-center gap-2 bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2">
                <Ionicons name="shield-checkmark" size={14} color="#16a34a" />
                <Text className="text-xs text-green-700 dark:text-green-300 flex-1">
                  {lockbox.panic_code_used
                    ? t('editLockbox.panicCodeUsed')
                    : t('editLockbox.panicCodeSet')}
                </Text>
              </View>
            )}

            {!removePanicCode && (
              <TextInput
                className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white mb-2"
                placeholder={
                  lockbox.panic_code_hash
                    ? t('editLockbox.panicCodeChange')
                    : t('editLockbox.panicCodeNew')
                }
                placeholderTextColor="#9ca3af"
                value={newPanicCode}
                onChangeText={setNewPanicCode}
                secureTextEntry
                editable={perms.canManagePanicCode && !isSubmitting}
              />
            )}

            {lockbox.panic_code_hash && perms.canManagePanicCode && (
              <TouchableOpacity
                onPress={() => {
                  if (!removePanicCode) {
                    Alert.alert(
                      t('editLockbox.panicCodeRemoveConfirmTitle'),
                      t('editLockbox.panicCodeRemoveConfirmMessage'),
                      [
                        { text: t('common.cancel'), style: 'cancel' },
                        {
                          text: t('common.confirm'),
                          style: 'destructive',
                          onPress: () => {
                            setRemovePanicCode(true);
                            setNewPanicCode('');
                          },
                        },
                      ]
                    );
                  } else {
                    setRemovePanicCode(false);
                  }
                }}
                activeOpacity={0.7}
                className="flex-row items-center gap-1.5"
              >
                <Ionicons
                  name={removePanicCode ? 'close-circle' : 'trash-outline'}
                  size={14}
                  color={removePanicCode ? '#ef4444' : '#9ca3af'}
                />
                <Text
                  className={`text-xs ${removePanicCode ? 'text-red-500' : 'text-gray-500'}`}
                >
                  {removePanicCode
                    ? t('common.cancel')
                    : t('editLockbox.panicCodeRemove')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </SectionWithLock>
      </KeyboardAwareScrollView>
    </View>
  );
}

function SectionWithLock({
  locked,
  lockedHint,
  hideWhenLocked = false,
  children,
}: {
  locked: boolean;
  lockedHint: string;
  hideWhenLocked?: boolean;
  children: React.ReactNode;
}) {
  if (locked && hideWhenLocked) return null;

  if (locked) {
    return (
      <View className="mb-4 opacity-50">
        <View pointerEvents="none">{children}</View>
        <View className="flex-row items-center gap-1.5 mt-1.5 px-1">
          <Ionicons name="lock-closed" size={12} color="#9ca3af" />
          <Text className="text-xs text-gray-400">{lockedHint}</Text>
        </View>
      </View>
    );
  }

  return <>{children}</>;
}

