import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../src/store';

export default function Index() {
  const { isAuthenticated, isMasterPasswordSet, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)/lockboxes" />;
  }

  if (!isMasterPasswordSet) {
    return <Redirect href="/(auth)/setup" />;
  }

  return <Redirect href="/(auth)/login" />;
}
