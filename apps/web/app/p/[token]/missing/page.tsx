import { createClient } from "@supabase/supabase-js";
import LinkUnavailable from "../../../components/LinkUnavailable";
import MissingPetForm from "./MissingPetForm";

// Same freshness rules as the parent recipient page — a revoked link must
// stop working immediately, not after a cached response expires.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function liveClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    global: { fetch: (input: any, init?: any) => fetch(input, { ...init, cache: "no-store" }) },
  });
}

// Only what this page needs to render its copy — not the full recipient
// profile. The actual report (and the owner alert it triggers) is handled
// server-side by /api/report-missing, re-validating the token itself rather
// than trusting anything resolved here.
async function fetchNames(token: string): Promise<{ petName: string; ownerName: string } | null> {
  const supabase = liveClient();
  const { data: link } = await supabase
    .from("share_links")
    .select("pet_id, revoked, expires_at")
    .eq("token", token)
    .maybeSingle();
  if (!link || link.revoked) return null;
  if (link.expires_at && new Date(link.expires_at) < new Date()) return null;

  const { data: pet } = await supabase.from("pets").select("name, owner_id, status").eq("id", link.pet_id).maybeSingle();
  if (!pet || (pet as any).status === "archived") return null;

  const { data: owner } = await supabase.from("owners").select("name").eq("id", (pet as any).owner_id).maybeSingle();
  return { petName: (pet as any).name ?? "", ownerName: (owner as any)?.name ?? "the owner" };
}

export default async function MissingPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const names = await fetchNames(token);
  if (!names) return <LinkUnavailable />;

  return <MissingPetForm token={token} petName={names.petName} ownerName={names.ownerName} />;
}
