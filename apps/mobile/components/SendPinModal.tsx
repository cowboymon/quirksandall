// Prompts the owner to send the PIN as its own message, right after they've
// shared the link. Two states, depending on whether this device remembers the
// PIN (see lib/pinVault):
//   known   — Copy / Send it / Later
//   unknown — a 4-digit field, then Send it
// Styled to match AppAlertHost so it reads as part of the same family.
import { useEffect, useState } from "react";
import { Modal, View, Text, TextInput, TouchableOpacity, Platform, Share } from "react-native";
import * as Clipboard from "expo-clipboard";
import { colors, possessive } from "@quirksandall/shared";
import { pinMessage } from "../lib/shareMessage";

export default function SendPinModal({
  visible,
  petName,
  knownPin,
  onClose,
}: {
  visible: boolean;
  petName: string;
  /** The PIN if this device remembers it; null means ask the owner to type it. */
  knownPin: string | null;
  onClose: () => void;
}) {
  const [typed, setTyped] = useState("");
  const [copied, setCopied] = useState(false);
  // A queued action runs after dismissal, never during — iOS drops a share
  // sheet presented while another modal is still animating out (same fix as
  // AppAlertHost).
  const [pending, setPending] = useState<(() => void) | null>(null);

  useEffect(() => {
    if (visible) { setTyped(""); setCopied(false); }
  }, [visible]);

  const pin = knownPin ?? (typed.length === 4 ? typed : null);
  const name = petName.trim();

  const close = (next?: () => void) => {
    setPending(() => next ?? null);
    onClose();
    if (Platform.OS !== "ios") { next?.(); setPending(null); }
  };

  const flush = () => { pending?.(); setPending(null); };

  const send = () => {
    if (!pin) return;
    const message = pinMessage(name, pin);
    close(() => { Share.share({ message }); });
  };

  const copy = () => {
    if (!pin) return;
    Clipboard.setStringAsync(pin);
    setCopied(true);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => close()} onDismiss={flush}>
      <View style={{ flex: 1, backgroundColor: "rgba(31,26,23,0.45)", alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
        <View style={{ width: "100%", maxWidth: 360, backgroundColor: "#FFFFFF", borderRadius: 16, padding: 22 }}>
          <Text style={{ fontFamily: "Tanker", fontSize: 22, lineHeight: 26, color: colors.textDark }}>
            Now send {name ? `${possessive(name)} PIN` : "the PIN"}.
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: 8, fontFamily: "Satoshi-Light" }}>
            Separately from the link — that's what makes it worth having.
          </Text>

          {!knownPin && (
            <TextInput
              value={typed}
              onChangeText={(v) => setTyped(v.replace(/\D/g, "").slice(0, 4))}
              keyboardType="number-pad"
              placeholder="• • • •"
              placeholderTextColor={colors.textMuted}
              maxLength={4}
              autoFocus
              style={{
                marginTop: 16, height: 52, borderRadius: 10, borderWidth: 1, borderColor: colors.border,
                backgroundColor: colors.background, textAlign: "center", fontSize: 22, letterSpacing: 10,
                fontFamily: "Satoshi-Bold", color: colors.textDark,
              }}
            />
          )}

          <View style={{ gap: 10, marginTop: 20 }}>
            {knownPin && (
              <TouchableOpacity
                onPress={copy}
                style={{ height: 46, borderRadius: 11, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}
              >
                <Text style={{ color: colors.textDark, fontSize: 14, fontFamily: "Satoshi-Medium" }}>
                  {copied ? "Copied" : "Copy PIN"}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={send}
              disabled={!pin}
              style={{ height: 46, borderRadius: 11, backgroundColor: colors.cardDark, alignItems: "center", justifyContent: "center", opacity: pin ? 1 : 0.4 }}
            >
              <Text style={{ color: "#F8ECEE", fontSize: 14, fontFamily: "Satoshi-Bold" }}>Send it</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => close()} style={{ alignItems: "center", paddingVertical: 6 }}>
              <Text style={{ color: colors.textMuted, fontSize: 14, fontFamily: "Satoshi-Medium" }}>Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
