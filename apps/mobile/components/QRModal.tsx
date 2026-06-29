import { Modal, View, Text, TouchableOpacity, Share } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { colors } from "@quirksandall/shared";

type Props = {
  visible: boolean;
  url: string;
  petName: string;
  onClose: () => void;
};

export default function QRModal({ visible, url, petName, onClose }: Props) {
  const handleShare = async () => {
    await Share.share({ message: url, url });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#FBF4E8", padding: 24, paddingTop: 48 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <Text
            style={{
              fontFamily: "Spectral_700BoldItalic",
              fontSize: 22,
              color: colors.primary,
              flex: 1,
            }}
          >
            {petName}'s QR code
          </Text>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={{ color: colors.textMuted, fontSize: 26, lineHeight: 26 }}>×</Text>
          </TouchableOpacity>
        </View>

        {/* QR code centred on card */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 28,
            alignItems: "center",
            alignSelf: "center",
            width: "100%",
            maxWidth: 320,
          }}
        >
          <QRCode
            value={url}
            size={220}
            color={colors.primary}
            backgroundColor="#FFFFFF"
            // Quiet zone handled by the card padding
          />
          <Text
            style={{
              color: colors.textMuted,
              fontSize: 11,
              marginTop: 16,
              textAlign: "center",
              letterSpacing: 0.3,
            }}
          >
            {url}
          </Text>
        </View>

        {/* Hint */}
        <Text
          style={{
            color: colors.textMuted,
            fontSize: 12,
            textAlign: "center",
            marginTop: 20,
            lineHeight: 18,
          }}
        >
          Scan to open {petName}'s profile.{"\n"}No app needed on the other end.
        </Text>

        {/* Share button */}
        <TouchableOpacity
          onPress={handleShare}
          style={{
            marginTop: 28,
            height: 44,
            borderRadius: 10,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#F7E9C9", fontWeight: "600", fontSize: 15 }}>
            Share link
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onClose}
          style={{ alignItems: "center", paddingVertical: 14 }}
        >
          <Text style={{ color: colors.textMuted, fontSize: 14 }}>Done</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
