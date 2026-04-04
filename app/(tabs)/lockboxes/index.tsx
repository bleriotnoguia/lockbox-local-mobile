import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLockboxStore, useFilteredLockboxes } from "../../../src/store";
import { LockboxCard } from "../../../src/components/LockboxCard";
import { PasswordGenerator } from "../../../src/components";
import { CATEGORIES, UNCATEGORIZED_FILTER } from "../../../src/constants";
import { useTranslation } from "../../../src/i18n";

export default function LockboxListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showGenerator, setShowGenerator] = useState(false);
  const filteredLockboxes = useFilteredLockboxes();
  const searchQuery = useLockboxStore((s) => s.searchQuery);
  const setSearchQuery = useLockboxStore((s) => s.setSearchQuery);
  const selectedCategory = useLockboxStore((s) => s.selectedCategory);
  const setSelectedCategory = useLockboxStore((s) => s.setSelectedCategory);

  const categoryFilters = [
    { key: null, label: t("sidebar.all") },
    ...CATEGORIES.map((c) => ({
      key: c,
      label: t(`category.${c}`) || c,
    })),
    { key: UNCATEGORIZED_FILTER, label: t("sidebar.uncategorized") },
  ];

  return (
    <View
      className="flex-1 bg-gray-50 dark:bg-gray-900"
      style={{ paddingTop: insets.top }}
    >
      {/* Password generator — standalone, no "Use" button */}
      <PasswordGenerator
        visible={showGenerator}
        onClose={() => setShowGenerator(false)}
      />

      {/* Header */}
      <View className="px-4 pt-3 pb-2">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">
            Lockbox Local
          </Text>
          <View className="flex-row items-center gap-1">
            <TouchableOpacity
              className="p-2"
              onPress={() => setShowGenerator(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="key-outline" size={22} color="#6366f1" />
            </TouchableOpacity>
            <TouchableOpacity
              className="p-2"
              onPress={() => router.push("/settings")}
              activeOpacity={0.7}
            >
              <Ionicons name="settings-outline" size={22} color="#6366f1" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <TextInput
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white"
          placeholder={t("lockboxList.search")}
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Category Chips */}
      <View className="h-11 mb-1">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="px-4 gap-2"
          className="flex-grow-0"
        >
          {categoryFilters.map((filter) => {
            const isActive = selectedCategory === filter.key;
            return (
              <TouchableOpacity
                key={filter.key ?? "all"}
                className={`px-3.5 py-2 rounded-full ${
                  isActive
                    ? "bg-primary-600"
                    : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                }`}
                onPress={() =>
                  setSelectedCategory(isActive ? null : filter.key)
                }
                activeOpacity={0.7}
              >
                <Text
                  className={`text-xs font-medium ${
                    isActive ? "text-white" : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Lockbox List */}
      <FlatList
        data={filteredLockboxes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <LockboxCard
            lockbox={item}
            onPress={() => router.push(`/(tabs)/lockboxes/${item.id}`)}
          />
        )}
        contentContainerClassName="px-4 pb-24"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <Text className="text-5xl mb-4 opacity-30">🔐</Text>
            <Text className="text-base font-medium text-gray-400 dark:text-gray-500">
              {t("lockboxList.empty")}
            </Text>
            <Text className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              {t("lockboxList.emptyHint")}
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-primary-600 items-center justify-center"
        onPress={() => router.push("/create")}
        activeOpacity={0.8}
        style={{
          shadowColor: "#6366f1",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
          marginBottom: insets.bottom,
        }}
      >
        <Text className="text-white text-2xl font-light">+</Text>
      </TouchableOpacity>
    </View>
  );
}
