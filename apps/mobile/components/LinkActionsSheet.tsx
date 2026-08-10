// Per-link edit menu, opened from the pencil on a dashboard link row.
//
// A pencil reads as "edit this link", so it can't quietly mean "rename" only
// — the stay dates are equally an edit of the link, and hanging them off a
// line of text that looks like the static "Viewed …" line above it left them
// undiscoverable. Both live here; the stay line stays tappable as a shortcut
// for anyone who already knows.
//
// Deliberately NOT an RN <Modal>, same as DurationModal: picking "Stay dates"
// opens DurationModal, which opens DatePickerSheet — a real Modal on iOS.
// Presenting a modal from inside another is the presentation race that broke
// the share sheet (#6). As a plain absolute-fill overlay this adds no native
// modal, so the date sheet stays the only one on screen.
import { useEffect } from "react";
import { BackHandler, Platform, View, Text, TouchableOpacity } from "react-native";
import { CalendarBlank, PencilSimple, type Icon } from "./icons";
import { colors } from "@quirksandall/shared";

type Props = {
  visible: boolean;
  linkLabel: string;
  onRename: () => void;
  onStayDates: () => void;
  onClose: () => void;
};

export default function LinkActionsSheet({ visible, linkLabel, onRename, onStayDates, onClose }: Props) {
  // What <Modal onRequestClose> used to give us on Android.
  useEffect(() => {
    if (!visible || Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => { onClose(); return true; });
    return () => sub.remove();
  }, [visible, onClose]);

  if (!visible) return null;

  const Row = ({ icon: RowIcon, label, onPress }: { icon: Icon; label: string; onPress: () => void }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 15, paddingHorizontal: 4 }}
    >
      <RowIcon size={18} color={colors.textDark} />
      <Text style={{ color: colors.textDark, fontSize: 15, fontFamily: "Satoshi-Medium" }}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, elevation: 100, justifyContent: "flex-end" }}>
      {/* Backdrop is its own layer behind the sheet rather than a wrapper
          around it — wrapping interactive children in a Touchable competes
          with their own taps on iOS. */}
      <TouchableOpacity activeOpacity={1} onPress={onClose} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(31,26,23,0.45)" }} />
      <View style={{ backgroundColor: "#FFFFFF", borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 22, paddingTop: 18, paddingBottom: 28 }}>
        <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, fontFamily: "Satoshi-Medium", marginBottom: 4 }}>
          {linkLabel || "Untitled link"}
        </Text>
        <Row icon={PencilSimple} label="Rename link" onPress={onRename} />
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <Row icon={CalendarBlank} label="Stay dates" onPress={onStayDates} />
        <TouchableOpacity
          onPress={onClose}
          activeOpacity={0.85}
          style={{ height: 46, borderRadius: 11, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", marginTop: 14 }}
        >
          <Text style={{ color: colors.textDark, fontSize: 14, fontFamily: "Satoshi-Medium" }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
