import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { apiFetch } from './api';

// Foreground notification presentation.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Request permission + get this device's Expo push token.
 * Returns null on simulators, denied permission, or before the EAS project is linked.
 */
export async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null; // no push tokens on simulators/emulators

  const existing = await Notifications.getPermissionsAsync();
  let granted = existing.granted;
  if (!granted) {
    const requested = await Notifications.requestPermissionsAsync();
    granted = requested.granted;
  }
  if (!granted) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    // EAS project isn't linked yet (set during `eas build`); skip until then.
    return null;
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data;
  } catch {
    return null;
  }
}

/** Get the token and register it with the API. Safe to call repeatedly; non-fatal on failure. */
export async function registerAndUploadPushToken(): Promise<void> {
  try {
    const token = await getExpoPushToken();
    if (!token) return;
    await apiFetch('/push-token', {
      method: 'POST',
      body: JSON.stringify({ expo_push_token: token }),
    });
  } catch {
    // best-effort; never block the app on push registration
  }
}
