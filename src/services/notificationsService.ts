import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// ---------------------------------------------------------------------------
// Notification handler
// ---------------------------------------------------------------------------

// Call once at module scope in app/_layout.tsx (before any notification
// can arrive). Controls how incoming pushes behave while the app is foregrounded.
export function setNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// ---------------------------------------------------------------------------
// Push token registration
// ---------------------------------------------------------------------------

// Called after login (parent mode only). Requests permission, retrieves the
// Expo push token, and writes it to parent_account if it has changed.
// Silently returns on simulator or if permission is denied — never throws.
export async function registerForPushNotifications(userId: string): Promise<void> {
  // Expo push tokens are only available on physical devices.
  if (!Device.isDevice) return;

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  // projectId is required since Expo SDK 49. Set in app.json under
  // expo.extra.eas.projectId (filled in when linking to EAS).
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId || projectId === 'YOUR_EAS_PROJECT_ID') {
    console.warn('[Notifications] EAS projectId not set in app.json. Skipping token registration.');
    return;
  }

  let token: string;
  try {
    const result = await Notifications.getExpoPushTokenAsync({ projectId });
    token = result.data;
  } catch (err) {
    // Happens on simulator even if Device.isDevice guard slips through.
    console.warn('[Notifications] getExpoPushTokenAsync failed:', err);
    return;
  }

  // Avoid unnecessary DB writes on every cold start — only update if changed.
  const { data } = await supabase
    .from('parent_account')
    .select('push_token')
    .eq('id', userId)
    .single();

  if (data?.push_token === token) return;

  await supabase
    .from('parent_account')
    .update({ push_token: token })
    .eq('id', userId);
}
