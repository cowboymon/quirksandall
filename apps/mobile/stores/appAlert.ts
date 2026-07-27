// Drop-in branded replacement for React Native's Alert.alert — same call
// signature, but renders through AppAlertHost (mounted once in _layout.tsx)
// instead of the OS-native dialog, so every popup in the app looks the same.
import { create } from "zustand";

export type AppAlertButton = {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
};

type AppAlertStore = {
  visible: boolean;
  title: string;
  message?: string;
  buttons: AppAlertButton[];
  dismiss: () => void;
};

export const useAppAlertStore = create<AppAlertStore>((set) => ({
  visible: false,
  title: "",
  message: undefined,
  buttons: [],
  dismiss: () => set({ visible: false }),
}));

function alert(title: string, message?: string, buttons?: AppAlertButton[]) {
  useAppAlertStore.setState({
    visible: true,
    title,
    message,
    buttons: buttons && buttons.length ? buttons : [{ text: "OK" }],
  });
}

export const AppAlert = { alert };
