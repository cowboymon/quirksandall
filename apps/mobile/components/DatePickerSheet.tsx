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

  // Bounded by the day, not the instant. Comparing against `new Date()` meant
  // an empty field — whose seed is "now" from a slightly earlier render —
  // landed microseconds outside the range, and iOS treats an out-of-bounds
  // value as undefined behaviour. Day granularity is what a date picker means
  // anyway: "no future" is "not after today", not "not after this millisecond".
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);
  const bounds = range === "future" ? { minimumDate: startOfToday } : { maximumDate: endOfToday };

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
            // Spinner for EVERY range. DO NOT switch this to "inline"/
            // calendar again — that has now been tried and reverted twice:
            //
            //   build 20  — crashed on device; survived seed/bounds fixes
            //               and the modal de-nesting, so it isn't those.
            //   2026-08-10 — re-rolled on a newer SDK, crashed again with
            //               SIGABRT inside -[UIDatePicker setMinimumDate:]
            //               → UICalendarView _setVisibleMonth: assertion.
            //
            // Root cause: UICalendarView asserts (and aborts) when its
            // selected date is outside min/maxDate, where the wheel simply
            // clamps. React Native applies props individually, so there is
            // always an instant where the old date is still set while the
            // new bounds have landed — unavoidable from JS, and fatal only
            // for the calendar. The wheel with an explicit height is the one
            // variant that has never crashed.
            display="spinner"
            value={draft}
            {...bounds}
            onChange={(_, d) => d && setDraft(d)}
            themeVariant="light"
            accentColor={colors.primary}
            // The wheel needs a concrete height — in a flex container it can
            // end up unresolved and take the view down. 216 is the standard
            // iOS wheel height.
            style={{ alignSelf: "stretch", height: 216 }}
          />
        </View>
      </View>
    </Modal>
  );
}
