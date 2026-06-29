// Supabase client factory — works in both web (browser) and mobile (React Native)
// Each app imports this and calls createClient with its own env vars.

export type SupabaseConfig = {
  url: string;
  anonKey: string;
};

// Re-export so apps don't need to depend on @supabase/supabase-js directly.
// Apps call: import { createSupabaseClient } from '@quirksandall/shared/supabase'
export { createClient as createSupabaseClient } from "@supabase/supabase-js";
