// The required-legal-agreement gate's data access, in one place.
//
// Three screens ask the same question — auth.tsx after verification,
// index.tsx on a resumed session, and accept-terms.tsx as a safety net — and
// they used to ask it three slightly different ways against
// `owners.terms_policy_version`. That column holds ONE version for BOTH
// policies, so bumping the Privacy Policy alone could never re-prompt anyone.
// `policy_acceptances` already stores a row per policy per version, so the
// gate reads that and each policy versions on its own.
import { supabase } from "./supabase";
import {
  PRIVACY_POLICY_VERSION,
  TERMS_VERSION,
  acceptanceMethod,
  needsPolicyAcceptance,
} from "@quirksandall/shared";

export const CURRENT_POLICY_VERSIONS = {
  privacy_policy: PRIVACY_POLICY_VERSION,
  terms_of_service: TERMS_VERSION,
};

export type PolicyAcceptanceRow = { policy_type: string | null; version: string | null };

/** Every acceptance this user has ever made. Cheap — two rows per version. */
export async function fetchPolicyAcceptances(userId: string): Promise<PolicyAcceptanceRow[]> {
  const { data } = await supabase
    .from("policy_acceptances")
    .select("policy_type, version")
    .eq("user_id", userId);
  return (data as PolicyAcceptanceRow[]) ?? [];
}

/** Where to send this user next. Fails *closed* on a query error: `data` comes
 * back null, which reads as "no acceptances", which routes to the gate. Showing
 * the agreement screen to someone who already agreed is a mild annoyance;
 * skipping it for someone who hasn't is the failure that matters. */
export async function policyRoute(userId: string): Promise<"/dashboard" | "/accept-terms"> {
  const rows = await fetchPolicyAcceptances(userId);
  return needsPolicyAcceptance(rows, CURRENT_POLICY_VERSIONS) ? "/accept-terms" : "/dashboard";
}

export { acceptanceMethod };
