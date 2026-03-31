import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import Constants from "expo-constants";
import { useTranslation } from "../src/i18n";

const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";
const GITHUB_URL = "https://github.com/bleriotnoguia/lockbox-local-mobile";
const BUG_URL = "https://github.com/bleriotnoguia/lockbox-local/issues";
const BUY_ME_COFFEE_URL = "https://ko-fi.com/bleriotnoguia";
const X_URL = "https://x.com/bleriotnoguia";
const SUPPORT_EMAIL = "contact@bleriotnoguia.com";

const BTC_ADDRESS = "bc1qejaecc7mfyg5vklzlp9s0kd4z45t0kycehk4ja";
const ADA_ADDRESS =
  "addr1q8mprm9a2kkxkmasjln8lptu682uqawqtyv4u7865wxet6h96p8d77p6pzsh4q74cfl5mmt6mwxksnfasd437h38uxzsntjfe5";
const SOL_ADDRESS = "DUp9FzfPG2QfWNmWq3rJxed5b41FK92An6d9MpyjLBbC";

interface CopyAddressProps {
  label: string;
  address: string;
  copiedLabel: string;
}

function CopyAddress({ label, address, copiedLabel }: CopyAddressProps) {
  const handleCopy = async () => {
    await Clipboard.setStringAsync(address);
    Alert.alert(copiedLabel);
  };

  return (
    <View className="mb-3">
      <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
        {label}
      </Text>
      <TouchableOpacity
        onPress={handleCopy}
        activeOpacity={0.7}
        className="flex-row items-center bg-gray-100 dark:bg-gray-700 rounded-xl px-3 py-2 gap-2"
      >
        <Text
          className="flex-1 text-xs font-mono text-gray-700 dark:text-gray-300"
          numberOfLines={1}
          ellipsizeMode="middle"
        >
          {address}
        </Text>
        <Text className="text-xs text-primary-600 dark:text-primary-400">
          Copy
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function AboutScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [showCrypto, setShowCrypto] = useState(false);

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
            {t("common.close")}
          </Text>
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900 dark:text-white">
          {t("about.title")}
        </Text>
        <View className="w-14" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 py-6"
        showsVerticalScrollIndicator={false}
      >
        {/* App info */}
        <View className="flex-row items-center gap-4 mb-5">
          <View className="w-16 h-16 rounded-2xl bg-primary-600 items-center justify-center">
            <Text className="text-3xl">🔒</Text>
          </View>
          <View>
            <Text className="text-xl font-bold text-gray-900 dark:text-white">
              Lockbox Local
            </Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {t("about.version")} {APP_VERSION}
            </Text>
            <Text className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {t("about.licenseMIT")}
            </Text>
          </View>
        </View>

        <Text className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-5">
          {t("about.description")}
        </Text>

        {/* Privacy note */}
        <View className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4 mb-5">
          <Text className="text-sm text-green-700 dark:text-green-300">
            🔒 {t("about.privacyNote")}
          </Text>
        </View>

        {/* Developer section */}
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-5 mb-4">
          <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">
            {t("about.developer")}
          </Text>

          <TouchableOpacity
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
            activeOpacity={0.7}
            className="flex-row justify-between items-center mb-3"
          >
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {t("about.developerName")}
            </Text>
            <Text className="text-sm text-primary-600 dark:text-primary-400">
              {SUPPORT_EMAIL}
            </Text>
          </TouchableOpacity>

          <View className="flex-row flex-wrap gap-2">
            <TouchableOpacity
              onPress={() => Linking.openURL(GITHUB_URL)}
              activeOpacity={0.7}
              className="flex-row items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-xl"
            >
              <Text className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {t("about.github")}
              </Text>
              <Text className="text-xs text-gray-400">↗</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => Linking.openURL(X_URL)}
              activeOpacity={0.7}
              className="flex-row items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-xl"
            >
              <Text className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {t("about.x")}
              </Text>
              <Text className="text-xs text-gray-400">↗</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => Linking.openURL(BUG_URL)}
              activeOpacity={0.7}
              className="flex-row items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-xl"
            >
              <Text className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {t("about.reportBug")}
              </Text>
              <Text className="text-xs text-gray-400">↗</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Support section */}
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-5 mb-6">
          <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">
            {t("about.support")}
          </Text>
          <Text className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            {t("about.supportDescription")}
          </Text>

          <TouchableOpacity
            onPress={() => Linking.openURL(BUY_ME_COFFEE_URL)}
            activeOpacity={0.7}
            className="flex-row items-center gap-2 px-4 py-2.5 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl mb-2"
          >
            <Text className="text-base">☕</Text>
            <Text className="flex-1 text-sm font-medium text-yellow-800 dark:text-yellow-300">
              {t("about.buyMeCoffee")}
            </Text>
            <Text className="text-xs text-yellow-600 dark:text-yellow-400">
              ↗
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowCrypto(!showCrypto)}
            activeOpacity={0.7}
            className="flex-row items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-xl"
          >
            <Text className="text-base">💜</Text>
            <Text className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("about.crypto")}
            </Text>
            <Text className="text-xs text-gray-400">
              {showCrypto ? "▲" : "▼"}
            </Text>
          </TouchableOpacity>

          {showCrypto && (
            <View className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <CopyAddress
                label={t("about.btcAddress")}
                address={BTC_ADDRESS}
                copiedLabel={t("about.copiedAddress")}
              />
              <CopyAddress
                label={t("about.adaAddress")}
                address={ADA_ADDRESS}
                copiedLabel={t("about.copiedAddress")}
              />
              <CopyAddress
                label={t("about.solAddress")}
                address={SOL_ADDRESS}
                copiedLabel={t("about.copiedAddress")}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
