// The picker behind DateInput's calendar button.
//
// The two platforms want opposite things here, so this doesn't try to unify
// them: Android's picker IS a dialog (it renders its own chrome and reports a
// dismiss), so wrapping it in our modal would double up. iOS renders a plain
// inline view, which needs our own sheet and an explicit Done — without one,
// a spinner has no way to say "I've finished scrolling".
import { useEffect, useState } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Modal, Platform, Text, TouchableOpacity, View } from "react-native";
import { colors } from "@quirksandall/shared";

export default function DatePickerSheet({
  visible,
  value,
  range,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  value: Date;
  range: "birthday" | "past" | "future";
  onConfirm: (d: Date) => void;
  onCancel: () => void;
}) {
  if (!visible) return null;

  const today = new Date();
  const bounds = range === "future" ? { minimumDate: today } : { maximumDate: today };

  if (Platform.OS === "android") {
    return (
      <DateTimePicker
        mode="date"
        value={value}
        {...bounds}
        onChange={(event, d) => {
          // "dismissed" covers both the Cancel button and a back-gesture.
          if (event.type === "set" && d) onConfirm(d);
          else onCancel();
        }}
      />
    );
  }

  // iOS: our own sheet. Track the spinner's position locally and only report it
  // on Done, so scrolling past a value doesn't commit it.
  return (
    <IOSSheet value={value} range={range} bounds={bounds} onConfirm={onConfirm} onCancel={onCancel} />
  );
}

function IOSSheet({
  value,
  range,
  bounds,
  onConfirm,
  onCancel,
}: {
  value: Date;
  range: "birthday" | "past" | "future";
  bounds: { maximumDate?: Date; minimumDate?: Date };
  onConfirm: (d: Date) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(value);
  // Re-seed when reopened against a different typed value.
  useEffect(() => { setDraft(value); }, [value.getTime()]);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: "rgba(31,26,23,0.45)", justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: "#FFFFFF", borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 28 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6 }}>
            <TouchableOpacity onPress={onCancel} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={{ color: colors.textMuted, fontSize: 14, fontFamily: "Satoshi-Medium" }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onConfirm(draft)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={{ color: colors.primary, fontSize: 14, fontFamily: "Satoshi-Bold" }}>Done</Text>
            </TouchableOpacity>
          </View>

          <DateTimePicker
            mode="date"
            // A birthday means scrolling back through years, which the wheel
            // does far faster than paging a calendar; the other two are
            // "which day" decisions, where seeing the week laid out is
            // the point.
            display={range === "birthday" ? "spinner" : "inline"}
            value={draft}
            {...bounds}
            onChange={(_, d) => d && setDraft(d)}
            themeVariant="light"
            accentColor={colors.primary}
            style={{ alignSelf: "center" }}
          />
        </View>
      </View>
    </Modal>
  );
}
