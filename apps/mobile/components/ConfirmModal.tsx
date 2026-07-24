// Branded confirmation modal — replaces native Alert.alert for in-app confirms
// so destructive actions match the app's styling instead of the OS dialog.
import { Modal, View, Text, TouchableOpacity } from "react-native";
import { colors } from "@quirksandall/shared";

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({
  visible, title, message, confirmLabel = "Confirm", cancelLabel = "Cancel",
  destructive, onConfirm, onCancel,
}: Props) {
  const confirmBg = destructive ? colors.danger : colors.cardDark;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: "rgba(31,26,23,0.45)", alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
        <View style={{ width: "100%", maxWidth: 360, backgroundColor: "#FFFFFF", borderRadius: 16, padding: 22 }}>
          <Text style={{ fontFamily: "Tanker", fontSize: 22, lineHeight: 26, color: colors.textDark }}>{title}</Text>
          {message ? (
            <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: 8, fontFamily: "Satoshi-Light" }}>{message}</Text>
          ) : null}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 22 }}>
            <TouchableOpacity
              onPress={onCancel}
              activeOpacity={0.85}
              style={{ flex: 1, height: 46, borderRadius: 11, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ color: colors.textDark, fontSize: 14, fontFamily: "Satoshi-Medium" }}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              activeOpacity={0.85}
              style={{ flex: 1, height: 46, borderRadius: 11, backgroundColor: confirmBg, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ color: "#F8ECEE", fontSize: 14, fontFamily: "Satoshi-Bold" }}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
