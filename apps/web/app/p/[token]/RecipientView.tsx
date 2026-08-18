"use client";

import { useEffect, useState } from "react";
import type { RecipientProfile } from "@quirksandall/shared";
import { formatWeight, formatPhone, formatVetName, possessive, commandStrengthLabel, mealSlotLabel, shortAddress, isSafeHttpsUrl, sanitizeTelValue, treatEntries } from "@quirksandall/shared";
import { WarningCircle } from "@phosphor-icons/react";
import PINGate from "./PINGate";
import { trackWeb, startTimingWeb, WebAnalyticsEvent } from "../../lib/analytics";

type Props = { profile: RecipientProfile; token: string };

const BLUSH = "#F8ECEE";
const CRIMSON = "#510000";
const BORDER = "#E5BEC4";
const MUTED = "#74555D";
// Light rose surface — the segmented Quick/Full toggle track. Matches
// colors.secondary in the shared tokens (and the native preview toggle).
const SECONDARY = "#F2E4E6";
// Body/content copy renders near-black; crimson and rose are reserved for
// titles and eyebrow labels only.
const BODY = "#1F1A17";

export default function RecipientView({ profile, token }: Props) {
  const { pet, age, behavior, allergies, routine, medical, lastUpdatedAt, isPaid, pinSet, preview, stayNote } = profile;
  // The Quick/Full toggle only exists where there is paid content to toggle:
  // paid links and the owner's own preview. A free sitter gets one fixed view.
  const showToggle = isPaid || preview;
  const [view, setView] = useState<"quick" | "full">(showToggle ? "full" : "quick");
  // Unlocked when there's no PIN to gate, or when the emergency contacts already
  // arrived — either openly (no PIN) or via a persisted device unlock (#87),
  // which the server resolves before render so there's no flash of the gate.
  const [pinUnlocked, setPinUnlocked] = useState(!pinSet || !!profile.emergencyContacts);
  const [emergencyContacts, setEmergencyContacts] = useState<RecipientProfile["emergencyContacts"] | null>(
    profile.emergencyContacts ?? null
  );
  // Once shown, the emergency block can be collapsed — it's a long list a sitter
  // only needs in a pinch, so let them fold it away after a first read.
  const [emergencyOpen, setEmergencyOpen] = useState(true);
  // Decision-contact designation (replaces the old vet-pre-auth flag) — whoever
  // the owner marked, ordered so the sitter knows who to try first. Purely
  // instructional; never implies any legal or clinical authority.
  const decisionContacts = (emergencyContacts?.backupContacts ?? [])
    .filter((c) => c.isDecisionContact)
    .sort((a, b) => (a.decisionPriority ?? 99) - (b.decisionPriority ?? 99));

  // "Lock again on this device" (#87) — clears the persisted-unlock cookie
  // server-side (it's httpOnly), then re-gates the block behind the PIN.
  const relock = async () => {
    try {
      await fetch("/api/pin-lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
    } catch {}
    setEmergencyContacts(null);
    setPinUnlocked(false);
    setEmergencyOpen(true);
  };

  // Growth-engine signal (§3.2): a shared link was actually opened. Anonymous —
  // the viewer is a sitter/vet, not a signed-up user. Skip the owner's own
  // preview so it doesn't count as a real recipient view.
  useEffect(() => {
    if (preview) return;
    trackWeb(WebAnalyticsEvent.RecipientPageViewed, { pin_gated: pinSet, tier: isPaid ? "paid" : "free" });

    // Read depth: how long the page was actually open. Mixpanel times it from
    // here and attaches $duration when the paired event fires.
    //
    // pagehide AND visibilitychange, because neither alone is enough: mobile
    // Safari often kills a backgrounded tab without ever firing pagehide, and
    // visibilitychange fires on every app switch. `sent` makes this
    // once-per-page — otherwise a viewer who backgrounds and returns three
    // times logs three durations and drags the average down.
    startTimingWeb(WebAnalyticsEvent.RecipientPageClosed);
    let sent = false;
    const finish = () => {
      if (sent) return;
      sent = true;
      trackWeb(WebAnalyticsEvent.RecipientPageClosed, { pin_gated: pinSet, tier: isPaid ? "paid" : "free" });
    };
    const onVisibility = () => { if (document.visibilityState === "hidden") finish(); };
    window.addEventListener("pagehide", finish);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", finish);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [preview, pinSet, isPaid]);

  // Paid-tier fields (soft triggers, routine-rest, medical) are visible in the
  // Full view. In the owner's preview on a free plan we still show them but with
  // a "Paid" badge, so the owner sees exactly what an upgrade would unlock.
  const lockedPreview = preview && !isPaid;
  const paidVisible = view === "full";
  // Whether the extended routine is actually showing right now — false both
  // when it's gated (free tier, or Quick view) and when the owner simply
  // never filled it in. See the neutral note below, which relies on that
  // ambiguity being the point.
  const hasExtendedRoutine =
    paidVisible && !!(routine?.walks || routine?.sleep || routine?.bathroomHabits || routine?.leftAlone || routine?.toileting);

  // Medications tied to a meal ALSO render inline in the feeding routine (at
  // that meal) as a convenience, but every medication always shows in the
  // standalone Medication section too — that's the safety-critical section a
  // sitter is most likely to check, so nothing should ever be discoverable
  // only via Feeding.
  const allMeds = medical?.medications ?? [];
  const hasRewards = behavior.commands.some((cmd) => cmd.reward?.trim());

  const name = pet.name?.trim() ?? "";
  const idTiles: [string, string][] = [
    ["Weight", formatWeight(pet.weight)],
    ["Sex", pet.sex],
    ["Colour", pet.colorMarkings],
    ["Microchip", pet.microchipNumber ?? ""],
  ].filter(([, v]) => !!v) as [string, string][];

  return (
    <div className="flex flex-col min-h-screen pb-16 max-w-lg mx-auto px-6">
      {preview && (
        <div
          className="mt-4 rounded-card px-4 py-2.5 text-center text-xs font-medium"
          style={{ backgroundColor: CRIMSON, color: BLUSH }}
        >
          Preview — this is the full picture. {!isPaid && "Sitters see routine & medical only after you unlock."}
        </div>
      )}

      {/* Stay-duration orientation (§5.1) — set by the owner, tells the sitter
          the plan at a glance. */}
      {stayNote && (
        <div
          className="mt-4 rounded-card px-4 py-2.5 text-sm font-medium"
          style={{ backgroundColor: SECONDARY, color: CRIMSON }}
        >
          {/* Already a complete sentence from stayStatus() — it varies by
              phase ("3 days until…", "…for another 2 days…", "no longer
              staying…"), so it can't be composed from a fragment here. */}
          {stayNote}
        </div>
      )}

      {/* Pet identity */}
      <div className="pt-10">
        <div className="flex items-center gap-4 mb-4">
          {pet.photoUrl && isSafeHttpsUrl(pet.photoUrl) && (
            <img
              src={pet.photoUrl}
              alt={name}
              className="w-16 h-16 rounded-full object-cover border-2"
              style={{ borderColor: BORDER }}
            />
          )}
          <div>
            <h1 className="font-tanker text-3xl leading-none text-foreground">
              {possessive(name)} Cheat Sheet
            </h1>
            <p className="text-text-muted text-sm mt-1">
              {[pet.breed, age].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>

        {idTiles.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            {idTiles.map(([label, val]) => (
              <div key={label} className="bg-white border rounded-card px-3 py-2.5" style={{ borderColor: BORDER }}>
                <p className="eyebrow text-text-muted">{label}</p>
                <p className="text-xs font-medium mt-0.5 truncate" style={{ color: BODY }}>{val}</p>
              </div>
            ))}
          </div>
        )}

        {/* Quick / Full toggle — only where there's paid content to toggle */}
        {showToggle && (
          <div className="flex gap-1 rounded-card p-1 mb-5" style={{ backgroundColor: SECONDARY }}>
            {(["quick", "full"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="flex-1 h-9 rounded-button text-sm font-medium transition-all"
                style={view === v ? { backgroundColor: CRIMSON, color: BLUSH } : { color: MUTED }}
              >
                {v === "quick" ? "Quick view" : "Full view"}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-6">
        {/* Emergency contacts — dark card, PIN-gated only when the owner set a PIN */}
        {pinSet && !pinUnlocked ? (
          <PINGate
            token={token}
            onUnlocked={(contacts) => {
              setPinUnlocked(true);
              setEmergencyContacts(contacts);
            }}
          />
        ) : (
          emergencyContacts && hasContactData(emergencyContacts) && (
            <section className="rounded-card p-5" style={{ backgroundColor: CRIMSON }}>
              <button
                onClick={() => setEmergencyOpen((o) => !o)}
                className="flex w-full items-center justify-between"
                style={{ marginBottom: emergencyOpen ? 16 : 0 }}
                aria-expanded={emergencyOpen}
              >
                <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: BLUSH }}>In an emergency</span>
                {/* Chevron matching the app's nav — rotates on expand */}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={BLUSH}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ opacity: 0.6, transition: "transform 0.2s ease", transform: emergencyOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              <div className="flex flex-col gap-4" style={{ display: emergencyOpen ? "flex" : "none" }}>
                {(emergencyContacts.primaryVet.contactName || emergencyContacts.primaryVet.clinic || emergencyContacts.primaryVet.phone) && (
                  <DarkContact
                    label="Vet"
                    name={emergencyContacts.primaryVet.contactName ? formatVetName(emergencyContacts.primaryVet.contactName) : ""}
                    place={emergencyContacts.primaryVet.clinic}
                    address={emergencyContacts.primaryVet.address}
                    phone={emergencyContacts.primaryVet.phone}
                  />
                )}
                {(emergencyContacts.emergencyVet.clinic || emergencyContacts.emergencyVet.phone) && (
                  <DarkContact
                    label="Emergency vet"
                    place={emergencyContacts.emergencyVet.clinic}
                    address={emergencyContacts.emergencyVet.address}
                    phone={emergencyContacts.emergencyVet.phone}
                  />
                )}
                <a
                  href="https://www.google.com/maps/search/emergency+vet+near+me"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="self-start text-xs"
                  style={{ color: "rgba(248,236,238,0.55)" }}
                >
                  Not at {possessive(name)} home? Find an emergency vet near me
                </a>
                {(emergencyContacts.insurance.provider || emergencyContacts.insurance.policyNumber) && (
                  <div className="flex flex-col gap-0.5">
                    <p className="eyebrow" style={{ color: "rgba(248,236,238,0.5)" }}>Insurance</p>
                    <p className="text-sm" style={{ color: BLUSH }}>
                      {[emergencyContacts.insurance.provider, emergencyContacts.insurance.policyNumber].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                )}
                {emergencyContacts.backupContacts.map((c, i) => (
                  <DarkContact
                    key={i}
                    label={i === 0 ? (c.relationship ? `Backup — ${c.relationship}` : "Backup contact") : (c.relationship ? `Second backup — ${c.relationship}` : "Second backup")}
                    name={c.name}
                    phone={c.phone}
                  />
                ))}
                {decisionContacts.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <p className="eyebrow" style={{ color: "rgba(248,236,238,0.5)" }}>
                      Decisions about {possessive(name)} care
                    </p>
                    {decisionContacts.map((c, i) => (
                      <p key={i} className="text-sm" style={{ color: BLUSH }}>
                        {i === 0 && decisionContacts.length > 1
                          ? `Call ${c.name} first — ${formatPhone(c.phone)}`
                          : decisionContacts.length > 1
                          ? `If ${decisionContacts[0].name} can't be reached, call ${c.name} — ${formatPhone(c.phone)}`
                          : `Call ${c.name} — ${formatPhone(c.phone)}`}
                      </p>
                    ))}
                  </div>
                )}
                {/* Only meaningful when a PIN gates this block — on a shared or
                    borrowed device, drop the 30-day remembered unlock. */}
                {pinSet && (
                  <button
                    onClick={relock}
                    className="self-start text-xs underline"
                    style={{ color: "rgba(248,236,238,0.55)" }}
                  >
                    Lock again on this device
                  </button>
                )}
              </div>
            </section>
          )
        )}

        {/* Missing-pet report — sits right below the emergency box, the
            other place a sitter's attention goes in a moment like this.
            Ghost version of the dashboard's "Account scheduled for
            deletion" banner: same icon + two-line-text + pill-button
            layout, but a light tinted card instead of a solid dark fill —
            this is a standing option every sitter sees, not an active
            warning state, so it shouldn't read with that much alarm.
            Links to a dedicated page (not a modal) so filling in last-seen
            details is the actual friction against an accidental tap, rather
            than a confirm dialog stacked on top of a one-tap trigger. */}
        <a
          href={`/p/${token}/missing`}
          className="flex items-center gap-3 rounded-card border p-4"
          style={{ borderColor: "rgba(154,80,80,0.35)", backgroundColor: "rgba(154,80,80,0.06)" }}
        >
          <WarningCircle size={20} weight="duotone" color="#9A5050" className="shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: "#9A5050" }}>Is {name} missing?</p>
            <p className="text-xs mt-0.5" style={{ color: MUTED }}>Alerts the owner immediately and creates a printable poster.</p>
          </div>
          <span
            className="shrink-0 rounded-button px-4 py-2 text-sm font-bold"
            style={{ backgroundColor: "#FFFFFF", color: "#9A5050" }}
          >
            Report
          </span>
        </a>

        {/* Feeding & Meds — free at every tier */}
        {routine && hasFeeding(routine.feeding, allMeds) && (
          <section>
            <SectionTitle tail="Feeding & Meds" />
            <div className="flex flex-col gap-2">
              <FeedingCard feeding={routine.feeding} medications={allMeds} />
            </div>
          </section>
        )}

        {/* Medications — free at every tier, like allergies. A sitter needs
            the dose whether or not the owner has paid, so it shows in both
            views. Its own section (not nested under Daily Routine) since
            it's safety-critical and shouldn't sit behind a scroll hurdle. */}
        {allMeds.length > 0 && (
          <section>
            <SectionTitle tail="Meds & Notes" />
            <div className="flex flex-col gap-2">
              {allMeds.map((med, i) => (
                <div key={i} className="bg-white border rounded-card px-4 py-3" style={{ borderColor: BORDER }}>
                  <p className="text-sm font-semibold whitespace-pre-line" style={{ color: BODY }}>{[med.name, med.dose].filter(Boolean).join(" — ")}</p>
                  {(mealSlotLabel(med.withMeal) || med.frequency || med.locationStored) && (
                    <p className="text-text-muted text-xs mt-0.5">{[mealSlotLabel(med.withMeal), med.frequency, med.locationStored && `Stored: ${med.locationStored}`].filter(Boolean).join(" · ")}</p>
                  )}
                  {med.notes && <p className="text-text-muted text-xs italic mt-0.5">{med.notes}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Daily Routine — walks/sleep/bathroom are paid */}
        {paidVisible && (routine?.walks || routine?.sleep || routine?.bathroomHabits || routine?.leftAlone || routine?.toileting) && (
          <section>
            <SectionTitle tail="Daily Routine" />
            <div className="flex flex-col gap-2">
              {routine?.walks && <InfoCard label="Walks" text={routine.walks} locked={lockedPreview} />}
              {routine?.sleep && <InfoCard label="Sleep" text={routine.sleep} locked={lockedPreview} />}
              {routine?.bathroomHabits && <InfoCard label="Bathroom" text={routine.bathroomHabits} locked={lockedPreview} />}
              {routine?.leftAlone && <InfoCard label="Left alone" text={routine.leftAlone} locked={lockedPreview} />}
              {routine?.toileting && <InfoCard label="Toileting" text={routine.toileting} locked={lockedPreview} />}
            </div>
          </section>
        )}

        {/* Deliberately worded the same whether the extended routine is
            gated (owner on the free tier) or simply empty (owner never
            filled it in) — a sitter can't tell the difference and shouldn't
            need to. The point isn't to explain why; it's so a sitter
            comparing this to another pet-sitting app doesn't read "no walk
            schedule" as "this app can't do that". Never shown to the
            owner's own preview — they already get the explicit
            upgrade-aware banner above.

            Must NOT show for a paid owner sitting in Quick view —
            hasExtendedRoutine is also false there even though the content
            exists and just needs the Full view toggle, which isn't "not
            included" at all. Only genuinely-gated (free tier) or
            genuinely-empty (paid + full view, nothing filled in) should
            trip this. Lives outside any one section now that Daily Routine
            only covers walks/sleep/bathroom. */}
        {!preview && !hasExtendedRoutine && !(isPaid && !paidVisible) && (
          <p className="text-xs italic" style={{ color: MUTED }}>Full routine not included.</p>
        )}

        {/* Conditions & Allergies — always shown regardless of tier */}
        {((medical?.conditions?.length ?? 0) > 0 || allergies.length > 0) && (
          <section>
            <SectionTitle tail="Conditions & Allergies" />
            <div className="flex flex-col gap-2">
              {(medical?.conditions?.length ?? 0) > 0 && <InfoCard label="Conditions" text={medical!.conditions.join(", ")} />}
              {allergies.length > 0 && <InfoCard label="Allergies" text={allergies.join(", ")} />}
            </div>
          </section>
        )}

        {/* Commands */}
        {behavior.commands.length > 0 && (
          <section>
            <SectionTitle tail="Commands" />
            <div className="border rounded-card overflow-hidden" style={{ borderColor: BORDER }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: CRIMSON, color: BLUSH }}>
                    <th className="text-left px-3 py-2 eyebrow font-medium">Word</th>
                    <th className="text-left px-3 py-2 eyebrow font-medium">Means</th>
                    {/* Only when at least one command has a reward — an
                        empty column of blank cells reads as a broken table,
                        not "no rewards set". */}
                    {hasRewards && <th className="text-left px-3 py-2 eyebrow font-medium">Reward</th>}
                  </tr>
                </thead>
                <tbody>
                  {behavior.commands.map((cmd, i) => (
                    <tr
                      key={cmd.id}
                      className="border-t align-top"
                      style={{ borderColor: BORDER, backgroundColor: i % 2 === 0 ? "#FFFFFF" : BLUSH }}
                    >
                      <td className="px-3 py-2 font-semibold" style={{ color: BODY }}>
                        <span className="block leading-tight">{cmd.word}</span>
                        {commandStrengthLabel(cmd.strength) && (
                          <span className="mt-0.5 block text-[10px] leading-tight font-medium" style={{ color: MUTED }}>
                            {commandStrengthLabel(cmd.strength)}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-text-muted">
                        {cmd.meaning}
                        {cmd.howToCue?.trim() && (
                          <span className="mt-1 block text-xs font-light italic" style={{ color: MUTED }}>
                            Cue: {cmd.howToCue}
                          </span>
                        )}
                      </td>
                      {hasRewards && <td className="px-3 py-2 text-text-muted">{cmd.reward}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Triggers — flight risk is a free safety override; the soft
            behavioural colour (scared/no-go/temperament) is paid */}
        {((behavior.flightRisk || behavior.escapeRisk.flag) || (paidVisible && (behavior.scared || behavior.noGo || behavior.temperamentSummary))) && (
          <section>
            <SectionTitle tail="Triggers" />
            <div className="flex flex-col gap-2">
              {paidVisible && behavior.temperamentSummary && <InfoCard label="Temperament" text={behavior.temperamentSummary} locked={lockedPreview} />}
              {(behavior.flightRisk || behavior.escapeRisk.flag) && (
                <InfoCard label="Flight risk" text={behavior.flightRisk || behavior.escapeRisk.notes} />
              )}
              {paidVisible && behavior.scared && <InfoCard label="Scared of" text={behavior.scared} locked={lockedPreview} />}
              {paidVisible && behavior.noGo && <InfoCard label="No-go zones" text={behavior.noGo} locked={lockedPreview} />}
            </div>
          </section>
        )}

        <footer className="mt-2 pb-8 border-t pt-6" style={{ borderColor: BORDER }}>
          {/* Two registers, deliberately separated. The top pair is the warm
              sign-off — the pet's person, the brand. The bottom row is the
              page's small print, pushed apart by whitespace and set quieter,
              so it reads as an intentional legal footer rather than a fourth
              line of sign-off. */}
          <p className="text-text-muted text-xs text-center font-light">
            Made with love by {possessive(name)} person · updated{" "}
            {new Date(lastUpdatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </p>
          <p className="text-foreground text-[11px] text-center mt-1 font-medium">
            Quirks &amp; All ·{" "}
            <a
              href="https://quirksandall.itshypothetical.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              quirksandall.itshypothetical.com
            </a>
          </p>
          {/* Notice at the point of collection (APP 5). Whoever opens this
              page — a sitter, a vet, a neighbour — is not a Quirks & All user
              and has agreed to nothing, but trackWeb() still records an
              anonymous view and Mixpanel writes an id to their localStorage.
              Saying so plainly, with a route to the full policy, is the least
              this page owes them. */}
          <p className="text-center mt-4 text-[11px] font-light" style={{ color: MUTED }}>
            This page counts anonymous views ·{" "}
            <a
              href="https://quirksandall.itshypothetical.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline underline-offset-2"
              style={{ color: MUTED }}
            >
              Privacy Policy
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}

function hasContactData(c: NonNullable<RecipientProfile["emergencyContacts"]>): boolean {
  return !!(
    c.primaryVet?.clinic || c.primaryVet?.phone || c.primaryVet?.contactName ||
    c.emergencyVet?.clinic || c.emergencyVet?.phone ||
    c.insurance?.provider ||
    (c.backupContacts && c.backupContacts.length > 0)
  );
}

function mealComplete(slot?: { time?: string; amount?: string; skip?: boolean }): boolean {
  // A meal needs BOTH a time and an amount to be useful to a sitter (#93) —
  // a bare "7:30am" with no amount says nothing. A skipped meal (#23) is
  // never "complete"; it renders through its own branch.
  return !!(!slot?.skip && slot?.time && slot?.amount);
}
function hasFeeding(f: NonNullable<RecipientProfile["routine"]>["feeding"], medications: NonNullable<RecipientProfile["medical"]>["medications"] = []): boolean {
  // A meal-tied medication also earns the Feeding card its own row (with a
  // "See Medications" pointer), even if that meal itself was never filled in.
  // An "anytime" medication does the same — it isn't tied to a meal, but
  // Feeding is the card sitters treat as the day's source of truth, so an
  // anytime-only medication still needs to earn this card its own row
  // rather than being invisible unless they scroll to Medication below.
  return !!(
    mealComplete(f.breakfast) || mealComplete(f.lunch) || mealComplete(f.dinner) ||
    f.breakfast?.skip || f.lunch?.skip || f.dinner?.skip ||
    treatEntries(f.treats).length > 0 || f.notes ||
    medications.some((m) => m.withMeal?.some((s) => s === "breakfast" || s === "lunch" || s === "dinner" || s === "anytime"))
  );
}

function SectionTitle({ name, tail, locked }: { name?: string; tail: string; locked?: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <h2 className="font-tanker text-2xl leading-none text-foreground">
        {name ? `${possessive(name)} ${tail}` : tail}
      </h2>
      {locked && <PaidBadge />}
    </div>
  );
}

// Shown in the owner's preview only: marks a section the sitter can't see until
// the owner unlocks the paid tier.
function PaidBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
      style={{ backgroundColor: "rgba(184,58,82,0.12)", color: "#B83A52" }}
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#B83A52" strokeWidth="2.2">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      Unlock to share
    </span>
  );
}

// A contact row inside the dark emergency card: name, an optional place that
// links to Maps, and a phone that links to tel: — all formatted for AU.
function DarkContact({ label, name, place, address, phone }: { label: string; name?: string; place?: string; address?: string; phone?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="eyebrow" style={{ color: "rgba(248,236,238,0.5)" }}>{label}</p>
      {name && <p className="text-sm font-bold" style={{ color: BLUSH }}>{name}</p>}
      {place && (
        <a
          href={`https://maps.google.com/?q=${encodeURIComponent([place, address].filter(Boolean).join(", "))}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm underline"
          style={{ color: "rgba(248,236,238,0.85)" }}
        >
          {place}
        </a>
      )}
      {address && <p className="text-sm" style={{ color: "rgba(248,236,238,0.6)" }}>{shortAddress(address)}</p>}
      {phone && sanitizeTelValue(phone) && (
        <a href={`tel:${sanitizeTelValue(phone)}`} className="text-sm" style={{ color: "rgba(248,236,238,0.85)" }}>
          {formatPhone(phone)}
        </a>
      )}
    </div>
  );
}

function InfoCard({ label, text, locked }: { label: string; text: string; locked?: boolean }) {
  return (
    <div className="bg-white border rounded-card px-4 py-3" style={{ borderColor: BORDER }}>
      <div className="flex items-center justify-between mb-1">
        <p className="eyebrow" style={{ color: "#B83A52" }}>{label}</p>
        {locked && <PaidBadge />}
      </div>
      <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: BODY }}>{text}</p>
    </div>
  );
}

function FeedingCard({ feeding, medications }: { feeding: NonNullable<RecipientProfile["routine"]>["feeding"]; medications: NonNullable<RecipientProfile["medical"]>["medications"] }) {
  const meals: [string, "breakfast" | "lunch" | "dinner", { time?: string; amount?: string; skip?: boolean } | undefined][] = [
    ["Breakfast", "breakfast", feeding.breakfast],
    ["Lunch", "lunch", feeding.lunch],
    ["Dinner", "dinner", feeding.dinner],
  ];
  // A meal renders if it has its own time+amount, OR if a medication is tied
  // to it — otherwise a med tied to an unfilled-in meal (e.g. "with lunch"
  // when lunch itself was never filled in) would have nowhere to point from.
  const shown = meals.filter(([, key, slot]) => mealComplete(slot) || slot?.skip || medications.some((m) => m.withMeal?.includes(key)));
  // Not tied to any meal, so never matched a row above — surfaced as its
  // own row instead of being invisible on the card sitters treat as the
  // day's source of truth. See the comment on hasFeeding() above.
  const anytimeMeds = medications.filter((m) => m.withMeal?.includes("anytime"));
  return (
    <div className="bg-white border rounded-card overflow-hidden" style={{ borderColor: BORDER }}>
      {shown.map(([label, key, slot], i) => {
        const meds = medications.filter((m) => m.withMeal?.includes(key));
        return (
        <div
          key={label}
          className="flex px-4 py-2 gap-3"
          style={{ borderTop: i === 0 ? undefined : `1px solid ${BORDER}` }}
        >
          <span className="text-sm font-medium w-20 shrink-0" style={{ color: MUTED }}>{label}</span>
          <div className="flex flex-col">
            {mealComplete(slot) ? (
              <span className="text-sm" style={{ color: BODY }}>
                {slot?.time && <span className="font-medium">{slot.time}</span>}
                {slot?.time && slot?.amount ? " · " : ""}
                {slot?.amount}
              </span>
            ) : slot?.skip ? (
              // #23 — deliberately no such meal, not missing data.
              <span className="text-sm italic" style={{ color: MUTED }}>Doesn&apos;t have {label.toLowerCase()}</span>
            ) : (
              <span className="text-sm italic" style={{ color: MUTED }}>Medication only</span>
            )}
            {meds.map((m, mi) => (
              <span key={mi} className="text-xs mt-0.5 font-medium" style={{ color: "#B83A52" }}>
                + {[m.name, m.dose].filter(Boolean).join(" — ")}
              </span>
            ))}
            {meds.length > 0 && (
              <span className="text-[11px] mt-0.5" style={{ color: MUTED }}>See Medications for notes</span>
            )}
          </div>
        </div>
        );
      })}
      {anytimeMeds.length > 0 && (
        <div className="flex px-4 py-2 gap-3" style={{ borderTop: shown.length > 0 ? `1px solid ${BORDER}` : undefined }}>
          <span className="text-sm font-medium w-20 shrink-0" style={{ color: MUTED }}>Anytime</span>
          <div className="flex flex-col">
            {anytimeMeds.map((m, mi) => (
              <span key={mi} className="text-xs font-medium" style={{ color: "#B83A52" }}>
                + {[m.name, m.dose].filter(Boolean).join(" — ")}
              </span>
            ))}
            <span className="text-[11px] mt-0.5" style={{ color: MUTED }}>See Medications for notes</span>
          </div>
        </div>
      )}
      {treatEntries(feeding.treats).length > 0 && (
        <div className="flex px-4 py-2 gap-3" style={{ borderTop: `1px solid ${BORDER}` }}>
          <span className="text-sm font-medium w-20 shrink-0" style={{ color: MUTED }}>Treats</span>
          <div className="flex flex-col gap-1">
            {/* Limit sits inline, not on its own line: several treats stack up
                fast otherwise. Never truncated or chipped — a limit is a
                safety instruction a sitter has to read in full, and it's free
                text of unbounded length. */}
            {treatEntries(feeding.treats).map((t, ti) => (
              <span key={ti} className="text-sm" style={{ color: BODY }}>
                {t.type}
                {t.type && t.limit ? <span className="font-light" style={{ color: MUTED }}> — {t.limit}</span> : null}
                {!t.type && t.limit ? <span className="font-light" style={{ color: MUTED }}>{t.limit}</span> : null}
              </span>
            ))}
          </div>
        </div>
      )}
      {feeding.notes && (
        <div className="px-4 py-2.5" style={{ borderTop: `1px solid ${BORDER}` }}>
          <p className="text-xs font-light" style={{ color: MUTED }}>{feeding.notes}</p>
        </div>
      )}
    </div>
  );
}
