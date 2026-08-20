// Unsaved-changes guard for edit screens. The screen hands over a string
// snapshot of everything the form edits (JSON.stringify of the fields) plus
// a `ready` flag for when the form has finished hydrating from the server.
// The first ready render's snapshot becomes the baseline; any later
// difference marks the screen dirty, and a dirty screen intercepts every
// way of leaving — the header Back, the iOS swipe gesture — with a discard
// prompt.
//
// Save flows call markClean() before router.back(), so a successful save
// never prompts. Ready-gating matters: the baseline must be captured only
// after the load's setStates have landed, otherwise the loaded values
// themselves would read as edits.
import { useEffect, useRef } from "react";
import { useNavigation } from "expo-router";
import { AppAlert } from "../stores/appAlert";

export function useUnsavedChanges(ready: boolean, snapshot: string) {
  const navigation = useNavigation();
  const baseline = useRef<string | null>(null);
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (!ready) return;
    if (baseline.current === null) {
      baseline.current = snapshot;
      return;
    }
    dirtyRef.current = snapshot !== baseline.current;
  }, [ready, snapshot]);

  useEffect(() => {
    // beforeRemove covers every exit path at the navigator level, so the
    // Back button needs no wiring of its own.
    const unsubscribe = (navigation as any).addListener("beforeRemove", (e: any) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      AppAlert.alert(
        "Discard changes?",
        "You have unsaved changes — going back will lose them.",
        [
          { text: "Keep editing", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => {
              dirtyRef.current = false;
              (navigation as any).dispatch(e.data.action);
            },
          },
        ]
      );
    });
    return unsubscribe;
  }, [navigation]);

  return {
    /** Call right before navigating away after a successful save. */
    markClean: () => {
      dirtyRef.current = false;
    },
  };
}
