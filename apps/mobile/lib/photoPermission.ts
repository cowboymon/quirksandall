// Branded lead-in to the OS media permission prompts. The native dialog
// itself can't be restyled (the OS owns it for privacy reasons), so the
// branded moment happens just before it: an in-app explainer in the app's own
// alert, then the system prompt. Shown only while permission is still
// undetermined — once the OS has an answer it never re-asks, so neither do we.
import * as ImagePicker from "expo-image-picker";
import { Linking } from "react-native";
import { AppAlert } from "../stores/appAlert";

function explain(title: string, message: string): Promise<boolean> {
  return new Promise((resolve) => {
    AppAlert.alert(title, message, [
      { text: "Not now", style: "cancel", onPress: () => resolve(false) },
      { text: "Continue", onPress: () => resolve(true) },
    ]);
  });
}

// Permission was declined earlier, so the OS won't show its prompt again —
// the only path left is the Settings app.
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

export async function ensurePhotoPermission(reason: string): Promise<boolean> {
  const current = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) {
    settingsNudge("Photo");
    return false;
  }
  if (!(await explain("Your photos", reason))) return false;
  const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return granted;
}

export async function ensureCameraPermission(reason: string): Promise<boolean> {
  const current = await ImagePicker.getCameraPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) {
    settingsNudge("Camera");
    return false;
  }
  if (!(await explain("Camera", reason))) return false;
  const { granted } = await ImagePicker.requestCameraPermissionsAsync();
  return granted;
}
