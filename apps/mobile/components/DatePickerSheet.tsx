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

const SHEET_H_PADDING = 18;

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
  // Birthdays keep the wheel (spinning the year column back beats paging
  // months); other ranges get the calendar grid. See IOSSheet for why the
  // calendar is never given `bounds`.
  const calendar = range !== "birthday";

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

  // iOS: our own sheet. Track the picker's position locally and only report it
  // on Done, so moving past a value doesn't commit it.
  return (
    <IOSSheet value={value} calendar={calendar} bounds={bounds} onConfirm={onConfirm} onCancel={onCancel} />
  );
}

function IOSSheet({
  value,
  calendar,
  bounds,
  onConfirm,
  onCancel,
}: {
  value: Date;
  calendar: boolean;
  bounds: { maximumDate?: Date; minimumDate?: Date };
  onConfirm: (d: Date) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(value);
  // Re-seed when reopened against a different typed value.
  useEffect(() => { setDraft(value); }, [value.getTime()]);

  // The inline calendar will not stretch. It lays its content out at its own
  // intrinsic width and left-aligns inside whatever frame it's given, so
  // widening the frame (alignSelf: "stretch", or an explicit width from the
  // window) only grows the empty strip on the right — which is what the
  // first two attempts at this did.
  //
  // Centring is the fix that actually works: the leftover space splits
  // evenly and reads as padding rather than as a layout bug.

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: "rgba(31,26,23,0.45)", justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: "#FFFFFF", borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: SHEET_H_PADDING, paddingTop: 10, paddingBottom: 28 }}>
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
            // THIRD attempt at the calendar grid, and the first with a reason
            // to expect a different outcome. History:
            //
            //   build 20   — display="inline", bounds passed. Crashed.
            //                Survived seed and bounds *value* fixes.
            //   2026-08-10 — re-rolled on a newer SDK, same crash: SIGABRT in
            //                -[UIDatePicker setMinimumDate:] → UICalendarView
            //                _setVisibleMonth: assertion.
            //
            // Both crashes were inside the bounds setter. UICalendarView
            // asserts when its selected date sits outside min/maxDate, and RN
            // applies props one at a time, so there is always an instant where
            // the old date is still set as new bounds land — not avoidable
            // from JS. The wheel clamps instead of asserting, which is why it
            // has never crashed.
            //
            // So: the calendar is given NO bounds at all. The crashing setter
            // is never called, and DateInput enforces the range in JS after
            // the pick instead (see its `dateError`). The wheel still takes
            // bounds natively, where they're safe.
            //
            // If this still crashes, stop: go back to display="spinner"
            // unconditionally and treat the calendar as unusable here.
            display={calendar ? "inline" : "spinner"}
            value={draft}
            {...(calendar ? {} : bounds)}
            onChange={(_, d) => d && setDraft(d)}
            themeVariant="light"
            accentColor={colors.primary}
            // The wheel needs a concrete height — in a flex container it can
            // end up unresolved and take the view down. 216 is the standard
            // iOS wheel height. The calendar sizes itself.
            style={calendar ? { alignSelf: "center" } : { alignSelf: "stretch", height: 216 }}
          />
        </View>
      </View>
    </Modal>
  );
}
