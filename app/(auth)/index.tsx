import { Redirect } from 'expo-router';
import { useAuthStore } from '../../src/store';

export default function AuthIndex() {
  const { isMasterPasswordSet } = useAuthStore();

  if (!isMasterPasswordSet) {
    return <Redirect href="/(auth)/setup" />;
  }

  return <Redirect href="/(auth)/login" />;
}
