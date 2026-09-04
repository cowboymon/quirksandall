// Camera permission, asked the way App Review requires: the system prompt and
// nothing before it.
//
// This used to open a branded in-app explainer first, with "Not now" and
// "Continue" buttons, so the permission dialog arrived with context. Apple
// rejected build 40 under 5.1.1(iv) for exactly that: a custom message before
// a permission request must not let the user defer the request — "the user
// should always proceed to the permission request after the message". A
// pre-prompt whose only compliant form is a single Continue button isn't worth
// the extra tap, so the reason now lives where iOS wants it: the
// NSCameraUsageDescription string in app.json, which the system dialog shows.
//
// There is deliberately no photo-library counterpart. On iOS 14+
// launchImageLibraryAsync opens PHPicker, which runs out of process and hands
// back only the photos the user picks — no permission needed, and none is
// requested. Gating it behind requestMediaLibraryPermissionsAsync asked for the
// whole library the app never reads, which was the other half of the same
// rejection.
import * as ImagePicker from "expo-image-picker";
import { Linking } from "react-native";
import { AppAlert } from "../stores/appAlert";

// Permission was declined earlier, so the OS won't show its prompt again — the
// only path left is the Settings app. Apple's rejection notes explicitly bless
// this one ("provide a link to the Settings app"), since it's a dead end
// otherwise rather than a nudge ahead of a request.
function settingsNudge(what: string) {
  AppAlert.alert(
    `${what} access is off`,
    "It was turned off earlier, so the system won't ask again — you can switch it on in Settings.",
    [
      { text: "Not now", style: "cancel" },
      { text: "Open Settings", onPress: () => Linking.openSettings() },
    ]
  );
}

export async function ensureCameraPermission(): Promise<boolean> {
  const current = await ImagePicker.getCameraPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) {
    settingsNudge("Camera");
    return false;
  }
  const { granted } = await ImagePicker.requestCameraPermissionsAsync();
  return granted;
}
