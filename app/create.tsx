import React, { useState } from "react";
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
  Modal,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useLockboxStore } from "../src/store";
import { useTranslation } from "../src/i18n";
import { CATEGORIES } from "../src/constants";
import { serializeTags } from "../src/types";
import { PasswordGenerator, DelayPicker, delayToSeconds } from "../src/components";
import type { TimeUnit } from "../src/components";

export default function CreateScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const createLockbox = useLockboxStore((s) => s.createLockbox);

  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<string | undefined>();
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const [unlockValue, setUnlockValue] = useState("60");
  const [unlockUnit, setUnlockUnit] = useState<TimeUnit>("seconds");
  const [relockValue, setRelockValue] = useState("24");
  const [relockUnit, setRelockUnit] = useState<TimeUnit>("seconds");

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [reflectionEnabled, setReflectionEnabled] = useState(false);
  const [reflectionMessage, setReflectionMessage] = useState("");
  const [reflectionChecklist, setReflectionChecklist] = useState("");
  const [penaltyEnabled, setPenaltyEnabled] = useState(false);
  const [penaltyValue, setPenaltyValue] = useState("30");
  const [penaltyUnit, setPenaltyUnit] = useState<TimeUnit>("seconds");
  const [panicCode, setPanicCode] = useState("");
  const [scheduledEnabled, setScheduledEnabled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<"date" | "time">("date");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPasswordGenerator, setShowPasswordGenerator] = useState(false);

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setTagInput("");
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert("", t("createLockbox.nameRequired"));
      return;
    }
    if (!content.trim()) {
      Alert.alert("", t("createLockbox.contentRequired"));
      return;
    }
    const unlockNum = Number(unlockValue);
    if (isNaN(unlockNum) || unlockNum <= 0) {
      Alert.alert(
        "",
        t("createLockbox.invalidUnlockDelay") ||
          "Veuillez entrer un délai de déverrouillage valide (> 0).",
      );
      return;
    }
    const relockNum = Number(relockValue);
    if (isNaN(relockNum) || relockNum <= 0) {
      Alert.alert(
        "",
        t("createLockbox.invalidRelockDelay") ||
          "Veuillez entrer un délai de reverrouillage valide (> 0).",
      );
      return;
    }
    let penaltyNum = 0;
    if (penaltyEnabled) {
      penaltyNum = Number(penaltyValue);
      if (isNaN(penaltyNum) || penaltyNum <= 0) {
        Alert.alert(
          "",
          t("createLockbox.invalidPenaltyDelay") ||
            "Veuillez entrer un délai de pénalité valide (> 0).",
        );
        return;
      }
    }

    setIsSubmitting(true);
    // Allow React Native to render the spinner before the crypto work blocks the thread
    setTimeout(async () => {
      try {
        await createLockbox({
          name: name.trim(),
          content: content.trim(),
          category,
          unlock_delay_seconds: delayToSeconds(unlockNum, unlockUnit),
          relock_delay_seconds: delayToSeconds(relockNum, relockUnit),
          reflection_enabled: reflectionEnabled,
          reflection_message: reflectionMessage.trim() || undefined,
          reflection_checklist: reflectionChecklist.trim() || undefined,
          penalty_enabled: penaltyEnabled,
          penalty_seconds: penaltyEnabled
            ? delayToSeconds(penaltyNum, penaltyUnit)
            : 0,
          panic_code: panicCode.trim() || undefined,
          scheduled_unlock_at: scheduledEnabled
            ? scheduledDate.getTime()
            : undefined,
          tags: serializeTags(tags),
        });
        if (router.canDismiss()) router.dismiss();
        else router.replace("/(tabs)/lockboxes");
      } catch (e) {
        Alert.alert("Error", String(e));
      } finally {
        setIsSubmitting(false);
      }
    }, 50);
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Password generator modal */}
      <PasswordGenerator
        visible={showPasswordGenerator}
        onClose={() => setShowPasswordGenerator(false)}
        onUsePassword={(pwd) => setContent(pwd)}
      />

      {/* Loading Modal */}
      <Modal visible={isSubmitting} transparent animationType="fade">
        <View className="flex-1 bg-black/50 items-center justify-center px-4">
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-6 items-center shadow-xl w-full max-w-[300px]">
            <ActivityIndicator size="large" color="#6366f1" className="mb-4" />
            <Text className="text-base font-bold text-gray-900 dark:text-white mb-2 text-center">
              {t('common.loading') || 'Opération en cours...'}
            </Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400 text-center">
              {t('common.cryptoWait') || 'Le chiffrement des données peut prendre quelques secondes. Veuillez patienter.'}
            </Text>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View
        className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700"
        style={{ paddingTop: insets.top + 8 }}
      >
        <TouchableOpacity
          onPress={() => {
            if (router.canDismiss()) router.dismiss();
            else router.replace("/(tabs)/lockboxes");
          }}
          activeOpacity={0.7}
          disabled={isSubmitting}
        >
          <Text
            className={`text-base ${isSubmitting ? "text-gray-400" : "text-primary-600 dark:text-primary-400"}`}
          >
            {t("createLockbox.cancel")}
          </Text>
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900 dark:text-white">
          {t("createLockbox.title")}
        </Text>
        <TouchableOpacity
          onPress={handleCreate}
          disabled={isSubmitting}
          activeOpacity={0.7}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#9ca3af" />
          ) : (
            <Text className="text-base font-semibold text-primary-600 dark:text-primary-400">
              {t("createLockbox.create")}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 32,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid
        extraScrollHeight={20}
      >
        {/* Name */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {t("createLockbox.name")}
          </Text>
          <TextInput
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-base text-gray-900 dark:text-white"
            placeholder={t("createLockbox.namePlaceholder")}
            placeholderTextColor="#9ca3af"
            value={name}
            onChangeText={setName}
            editable={!isSubmitting}
          />
        </View>

        {/* Content */}
        <View className="mb-4">
          <View className="flex-row items-center justify-between mb-1.5">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("createLockbox.content")}
            </Text>
            <TouchableOpacity
              onPress={() => setShowPasswordGenerator(true)}
              activeOpacity={0.7}
              disabled={isSubmitting}
              className="flex-row items-center gap-1 px-2.5 py-1 bg-primary-50 dark:bg-primary-900/30 rounded-lg"
            >
              <Ionicons name="key-outline" size={13} color="#6366f1" />
              <Text className="text-xs font-medium text-primary-600 dark:text-primary-400">
                {t("passwordGenerator.title")}
              </Text>
            </TouchableOpacity>
          </View>
          <TextInput
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-base text-gray-900 dark:text-white min-h-[100px]"
            placeholder={t("createLockbox.contentPlaceholder")}
            placeholderTextColor="#9ca3af"
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
            secureTextEntry
            editable={!isSubmitting}
          />
        </View>

        {/* Category */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {t("createLockbox.category")}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2"
          >
            <TouchableOpacity
              className={`px-3 py-2 rounded-lg ${
                !category
                  ? "bg-primary-600"
                  : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
              }`}
              onPress={() => setCategory(undefined)}
              activeOpacity={0.7}
            >
              <Text
                className={`text-xs ${
                  !category ? "text-white" : "text-gray-600 dark:text-gray-400"
                }`}
              >
                {t("createLockbox.noCategory")}
              </Text>
            </TouchableOpacity>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c}
                className={`px-3 py-2 rounded-lg ${
                  category === c
                    ? "bg-primary-600"
                    : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                }`}
                onPress={() => setCategory(c)}
                activeOpacity={0.7}
              >
                <Text
                  className={`text-xs ${
                    category === c
                      ? "text-white"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
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
            {t("tags.label")}
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
            placeholder={t("tags.placeholder")}
            placeholderTextColor="#9ca3af"
            value={tagInput}
            onChangeText={(text) => {
              if (text.endsWith(",") || text.endsWith(" ")) {
                setTagInput("");
                const trimmed = text.slice(0, -1).trim();
                if (trimmed && !tags.includes(trimmed)) {
                  setTags([...tags, trimmed]);
                }
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
          label={t("createLockbox.unlockDelay")}
          hint={t("createLockbox.unlockDelayHint")}
          value={unlockValue}
          unit={unlockUnit}
          onValueChange={setUnlockValue}
          onUnitChange={setUnlockUnit}
          disabled={isSubmitting}
        />

        {/* Relock Delay */}
        <DelayPicker
          label={t("createLockbox.relockDelay")}
          hint={t("createLockbox.relockDelayHint")}
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
            {t("createLockbox.advancedOptions")}
          </Text>
          <Ionicons
            name={showAdvanced ? "chevron-down" : "chevron-forward"}
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
                    {t("createLockbox.reflectionSection")}
                  </Text>
                  <Text className="text-xs text-gray-500 mt-0.5">
                    {t("createLockbox.reflectionSectionHint")}
                  </Text>
                </View>
                <Switch
                  value={reflectionEnabled}
                  onValueChange={setReflectionEnabled}
                  trackColor={{ true: "#6366f1" }}
                  disabled={isSubmitting}
                />
              </View>
              {reflectionEnabled && (
                <View className="mt-3 gap-3">
                  <TextInput
                    className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white"
                    placeholder={t(
                      "createLockbox.reflectionMessagePlaceholder",
                    )}
                    placeholderTextColor="#9ca3af"
                    value={reflectionMessage}
                    onChangeText={setReflectionMessage}
                    editable={!isSubmitting}
                  />
                  <TextInput
                    className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white min-h-[80px]"
                    placeholder={t(
                      "createLockbox.reflectionChecklistPlaceholder",
                    )}
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
                    {t("createLockbox.penaltySection")}
                  </Text>
                  <Text className="text-xs text-gray-500 mt-0.5">
                    {t("createLockbox.penaltySectionHint")}
                  </Text>
                </View>
                <Switch
                  value={penaltyEnabled}
                  onValueChange={setPenaltyEnabled}
                  trackColor={{ true: "#6366f1" }}
                  disabled={isSubmitting}
                />
              </View>
              {penaltyEnabled && (
                <View className="mt-3">
                  <DelayPicker
                    label={t("createLockbox.penaltyDelay")}
                    hint={t("createLockbox.penaltyDelayHint")}
                    value={penaltyValue}
                    unit={penaltyUnit}
                    onValueChange={setPenaltyValue}
                    onUnitChange={setPenaltyUnit}
                    disabled={isSubmitting}
                  />
                </View>
              )}
            </View>

            {/* Panic Code */}
            <View className="bg-white dark:bg-gray-800 rounded-xl p-4">
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t("createLockbox.panicSection")}
              </Text>
              <Text className="text-xs text-gray-500 mb-3">
                {t("createLockbox.panicSectionHint")}
              </Text>
              <TextInput
                className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white"
                placeholder={t("createLockbox.panicCodePlaceholder")}
                placeholderTextColor="#9ca3af"
                value={panicCode}
                onChangeText={setPanicCode}
                secureTextEntry
                editable={!isSubmitting}
              />
            </View>

            {/* Scheduled Unlock */}
            <View className="bg-white dark:bg-gray-800 rounded-xl p-4">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-1 mr-3">
                  <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {t("createLockbox.scheduledSection")}
                  </Text>
                  <Text className="text-xs text-gray-500 mt-0.5">
                    {t("createLockbox.scheduledSectionHint")}
                  </Text>
                </View>
                <Switch
                  value={scheduledEnabled}
                  onValueChange={setScheduledEnabled}
                  trackColor={{ true: "#6366f1" }}
                  disabled={isSubmitting}
                />
              </View>
              {scheduledEnabled && (
                <View className="mt-3">
                  <TouchableOpacity
                    className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-3"
                    onPress={() => {
                      setDatePickerMode("date");
                      setShowDatePicker(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text className="text-sm text-gray-700 dark:text-gray-300">
                      {scheduledDate.toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={scheduledDate}
                      mode={
                        Platform.OS === "android" ? datePickerMode : "datetime"
                      }
                      minimumDate={new Date()}
                      onChange={(event, date) => {
                        if (event.type === "dismissed") {
                          setShowDatePicker(false);
                          setDatePickerMode("date");
                          return;
                        }
                        if (Platform.OS === "android") {
                          if (datePickerMode === "date") {
                            if (date) setScheduledDate(date);
                            setDatePickerMode("time");
                          } else {
                            if (date) setScheduledDate(date);
                            setShowDatePicker(false);
                            setDatePickerMode("date");
                          }
                        } else {
                          setShowDatePicker(false);
                          if (date) setScheduledDate(date);
                        }
                      }}
                    />
                  )}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Bottom Create Button */}
        <TouchableOpacity
          className={`mt-2 mb-8 py-4 rounded-xl items-center justify-center ${
            isSubmitting
              ? "bg-primary-400 dark:bg-primary-800"
              : "bg-primary-600 dark:bg-primary-500"
          }`}
          onPress={handleCreate}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-white text-base font-bold">
              {t("createLockbox.create")}
            </Text>
          )}
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </View>
  );
}

