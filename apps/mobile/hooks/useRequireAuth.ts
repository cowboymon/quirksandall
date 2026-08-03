import { useEffect } from "react";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";

// Defense-in-depth route guard. RLS already stops an unauthenticated screen
// from reading another owner's data, but without this a deep link
// (notification, share, cold start, or just navigating here directly) can
// render a protected screen with no session at all instead of bouncing to
// sign-in. Call at the top of any screen that requires an authenticated
// owner, or once in a route group's _layout.tsx to cover every screen in it.
export function useRequireAuth() {
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled && !session) router.replace("/auth");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/auth");
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);
}
