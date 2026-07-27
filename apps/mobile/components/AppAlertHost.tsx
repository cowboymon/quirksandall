// Single host for every branded popup in the app (replaces native Alert.alert
// everywhere — see stores/appAlert.ts). Mount once, at the root layout.
import { Modal, View, Text, TouchableOpacity } from "react-native";
import { colors } from "@quirksandall/shared";
import { useAppAlertStore, type AppAlertButton } from "../stores/appAlert";

function buttonColors(style: AppAlertButton["style"]) {
  if (style === "destructive") return { bg: colors.danger, text: "#F8ECEE", border: colors.danger };
  if (style === "cancel") return { bg: "transparent", text: colors.textDark, border: colors.border };
  return { bg: colors.cardDark, text: "#F8ECEE", border: colors.cardDark };
}

export default function AppAlertHost() {
  const { visible, title, message, buttons, dismiss } = useAppAlertStore();

  const press = (b: AppAlertButton) => {
    dismiss();
    b.onPress?.();
  };

  // 1-2 buttons sit side by side (matches ConfirmModal); 3+ (an action-sheet
  // style pick, e.g. "What kind of document?") stack as a vertical list.
  const stacked = buttons.length > 2;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismiss}>
      <View style={{ flex: 1, backgroundColor: "rgba(31,26,23,0.45)", alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
        <View style={{ width: "100%", maxWidth: 360, backgroundColor: "#FFFFFF", borderRadius: 16, padding: 22 }}>
          <Text style={{ fontFamily: "Tanker", fontSize: 22, lineHeight: 26, color: colors.textDark }}>{title}</Text>
          {message ? (
            <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: 8, fontFamily: "Satoshi-Light" }}>{message}</Text>
          ) : null}

          <View style={{ flexDirection: stacked ? "column" : "row", gap: 10, marginTop: 22 }}>
            {buttons.map((b, i) => {
              const c = buttonColors(b.style);
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => press(b)}
                  activeOpacity={0.85}
                  style={{
                    flex: stacked ? undefined : 1,
                    height: 46,
                    borderRadius: 11,
                    borderWidth: c.bg === "transparent" ? 1 : 0,
                    borderColor: c.border,
                    backgroundColor: c.bg,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: c.text, fontSize: 14, fontFamily: b.style === "cancel" ? "Satoshi-Medium" : "Satoshi-Bold" }}>{b.text}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}
