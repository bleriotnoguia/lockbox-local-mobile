import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../../src/store';

export default function AuthGate() {
  const { isMasterPasswordSet, isLoading, checkMasterPassword } =
    useAuthStore();

  useEffect(() => {
    checkMasterPassword();
  }, [checkMasterPassword]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!isMasterPasswordSet) {
    return <Redirect href="/(auth)/setup" />;
  }

  return <Redirect href="/(auth)/login" />;
}
