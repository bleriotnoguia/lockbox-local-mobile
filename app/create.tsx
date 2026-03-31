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
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useLockboxStore } from "../src/store";
import { useTranslation } from "../src/i18n";
import { CATEGORIES, DELAY_PRESETS } from "../src/constants";
import { serializeTags } from "../src/types";

type TimeUnit = "seconds" | "minutes" | "hours" | "days";

function delayToSeconds(value: number, unit: TimeUnit): number {
  switch (unit) {
    case "seconds":
      return value;
    case "minutes":
      return value * 60;
    case "hours":
      return value * 3600;
    case "days":
      return value * 86400;
  }
}

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
    
    // Use setTimeout to allow React Native to render the loading spinner
    // before blocking the thread with heavy cryptographic operations
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
        >
          <Text className="text-primary-600 dark:text-primary-400 text-base">
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
            <Text
              className={`text-base font-semibold ${
                isSubmitting
                  ? "text-gray-400"
                  : "text-primary-600 dark:text-primary-400"
              }`}
            >
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
          />
        </View>

        {/* Content */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {t("createLockbox.content")}
          </Text>
          <TextInput
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-base text-gray-900 dark:text-white min-h-[100px]"
            placeholder={t("createLockbox.contentPlaceholder")}
            placeholderTextColor="#9ca3af"
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
            secureTextEntry
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
        />

        {/* Relock Delay */}
        <DelayPicker
          label={t("createLockbox.relockDelay")}
          hint={t("createLockbox.relockDelayHint")}
          value={relockValue}
          unit={relockUnit}
          onValueChange={setRelockValue}
          onUnitChange={setRelockUnit}
        />

        {/* Advanced Options */}
        <TouchableOpacity
          className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4 flex-row items-center justify-between"
          onPress={() => setShowAdvanced(!showAdvanced)}
          activeOpacity={0.8}
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

function DelayPicker({
  label,
  hint,
  value,
  unit,
  onValueChange,
  onUnitChange,
}: {
  label: string;
  hint: string;
  value: string;
  unit: TimeUnit;
  onValueChange: (v: string) => void;
  onUnitChange: (u: TimeUnit) => void;
}) {
  const { t } = useTranslation();
  const units: TimeUnit[] = ["seconds", "minutes", "hours", "days"];

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
          maxLength={4}
        />
        <View className="flex-row flex-1 gap-1">
          {units.map((u) => (
            <TouchableOpacity
              key={u}
              className={`flex-1 py-3 rounded-xl items-center justify-center ${
                unit === u
                  ? "bg-primary-600"
                  : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
              }`}
              onPress={() => {
                if (unit !== u) {
                  onUnitChange(u);
                  // Reset value to the first preset of the new unit
                  const firstPreset = DELAY_PRESETS[u][0];
                  if (firstPreset) {
                    onValueChange(String(firstPreset));
                  } else {
                    onValueChange("");
                  }
                }
              }}
              activeOpacity={0.7}
            >
              <Text
                className={`text-[10px] font-medium ${
                  unit === u ? "text-white" : "text-gray-600 dark:text-gray-400"
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
        className="mt-2"
        contentContainerClassName="gap-1.5"
      >
        {DELAY_PRESETS[unit].map((preset) => (
          <TouchableOpacity
            key={preset}
            className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full"
            onPress={() => onValueChange(String(preset))}
            activeOpacity={0.7}
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
