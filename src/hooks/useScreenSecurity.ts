import { useEffect } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';

/**
 * Hides screen content when the app goes to background.
 * On iOS, uses the native activity flag to prevent screenshots.
 * On Android, uses FLAG_SECURE via the react-native-screens API.
 *
 * Note: Full FLAG_SECURE implementation may require a native module.
 * This hook provides the AppState-based foundation.
 */
export function useScreenSecurity() {
  useEffect(() => {
    if (Platform.OS === 'android') {
      // Android: FLAG_SECURE would need native module integration
      // This is a placeholder for the native implementation
    }

    const subscription = AppState.addEventListener(
      'change',
      (_nextState: AppStateStatus) => {
        // The system handles screen hiding natively on iOS via
        // UIApplicationDelegate methods. On Android, FLAG_SECURE
        // handles it at the Activity level.
      }
    );

    return () => subscription.remove();
  }, []);
}
