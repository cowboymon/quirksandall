import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { supabase } from "./supabase";

// Configure foreground notification behaviour globally (call once in _layout.tsx)
export function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      // SDK 53+ split shouldShowAlert into banner + list
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Request permission and register the device's Expo push token with Supabase.
 * Safe to call on every app launch — no-ops if already registered.
 * Returns false if permission denied or not a physical device.
 */
export async function registerForPushNotifications(): Promise<boolean> {
  if (!Device.isDevice) return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return false;

  // Android channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Quirks & All",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;

  // Persist the token on the owner row so the edge function can send to it
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase
      .from("owners")
      .update({ push_token: token })
      .eq("id", user.id);
  }

  return true;
}

/**
 * Schedule a local trick-reinforcement nudge N days from now.
 * For paid users only — called from the dashboard after pet load.
 */
export async function scheduleTrickNudge(petName: string, commandWord: string, delayDays = 7) {
  // Cancel any existing nudge so we don't stack them
  await Notifications.cancelAllScheduledNotificationsAsync();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${petName} check-in`,
      body: `Still using '${commandWord}'? Still accurate?`,
      data: { type: "trick_nudge" },
    },
    trigger: {
      // SDK 54 requires an explicit trigger type
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: delayDays * 24 * 60 * 60,
      repeats: false,
    },
  });
}

/**
 * Cancel all pending nudges — call when user disables notifications or downgrades.
 */
export async function cancelAllNudges() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
