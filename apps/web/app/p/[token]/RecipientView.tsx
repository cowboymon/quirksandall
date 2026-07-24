"use client";

import { useState } from "react";
import type { RecipientProfile } from "@quirksandall/shared";
import { formatWeight, formatPhone, formatVetName, possessive } from "@quirksandall/shared";
import PINGate from "./PINGate";

type Props = { profile: RecipientProfile; token: string };

const BLUSH = "#F8ECEE";
const CRIMSON = "#510000";
const BORDER = "#E5BEC4";
const MUTED = "#987080";
// Body/content copy renders near-black; crimson and rose are reserved for
// titles and eyebrow labels only.
const BODY = "#1F1A17";

export default function RecipientView({ profile, token }: Props) {
  const { pet, age, behavior, allergies, routine, medical, lastUpdatedAt, isPaid, pinSet, preview } = profile;
  // The Quick/Full toggle only exists where there is paid content to toggle:
  // paid links and the owner's own preview. A free sitter gets one fixed view.
  const showToggle = isPaid || preview;
  const [view, setView] = useState<"quick" | "full">(showToggle ? "full" : "quick");
  // No PIN set → nothing to gate; the contacts are already in the profile.
  const [pinUnlocked, setPinUnlocked] = useState(!pinSet);
  const [emergencyContacts, setEmergencyContacts] = useState<RecipientProfile["emergencyContacts"] | null>(
    profile.emergencyContacts ?? null
  );
  // Once shown, the emergency block can be collapsed — it's a long list a sitter
  // only needs in a pinch, so let them fold it away after a first read.
  const [emergencyOpen, setEmergencyOpen] = useState(true);

  // Paid-tier fields (soft triggers, routine-rest, medical) are visible in the
  // Full view. In the owner's preview on a free plan we still show them but with
  // a "Paid" badge, so the owner sees exactly what an upgrade would unlock.
  const lockedPreview = preview && !isPaid;
  const paidVisible = view === "full";

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

      {/* Pet identity */}
      <div className="pt-10 pb-5">
        <div className="flex items-center gap-4 mb-4">
          {pet.photoUrl && (
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
          <div className="flex gap-1 rounded-card p-1" style={{ backgroundColor: "#EFE7D8" }}>
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
                <span className="eyebrow" style={{ color: "rgba(248,236,238,0.5)" }}>Emergency contacts</span>
                <span className="text-xs" style={{ color: "rgba(248,236,238,0.5)" }}>{emergencyOpen ? "Hide ▲" : "Show ▼"}</span>
              </button>
              <div className="flex flex-col gap-4" style={{ display: emergencyOpen ? "flex" : "none" }}>
                {(emergencyContacts.primaryVet.contactName || emergencyContacts.primaryVet.clinic || emergencyContacts.primaryVet.phone) && (
                  <DarkContact
                    label="Vet"
                    name={emergencyContacts.primaryVet.contactName ? formatVetName(emergencyContacts.primaryVet.contactName) : ""}
                    place={emergencyContacts.primaryVet.clinic}
                    phone={emergencyContacts.primaryVet.phone}
                  />
                )}
                {(emergencyContacts.emergencyVet.clinic || emergencyContacts.emergencyVet.phone) && (
                  <DarkContact label="Emergency vet" place={emergencyContacts.emergencyVet.clinic} phone={emergencyContacts.emergencyVet.phone} />
                )}
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
                {emergencyContacts.vetPreAuth && (
                  <div className="flex items-center gap-2 rounded-card px-3 py-2" style={{ backgroundColor: "rgba(248,236,238,0.1)" }}>
                    <span style={{ color: "#88C888" }}>✓</span>
                    <p className="text-xs leading-snug" style={{ color: "rgba(248,236,238,0.8)" }}>
                      Vet pre-authorised — backup contact can approve treatment
                    </p>
                  </div>
                )}
              </div>
            </section>
          )
        )}

        {/* Daily Routine — feeding is free; walks/sleep/bathroom are paid */}
        {routine && (hasFeeding(routine.feeding) || (paidVisible && (routine.walks || routine.sleep || routine.bathroomHabits))) && (
          <section>
            <SectionTitle name={name} tail="Daily Routine" />
            <div className="flex flex-col gap-2">
              {hasFeeding(routine.feeding) && <FeedingCard feeding={routine.feeding} />}
              {paidVisible && routine.walks && <InfoCard label="Walks" text={routine.walks} locked={lockedPreview} />}
              {paidVisible && routine.sleep && <InfoCard label="Sleep" text={routine.sleep} locked={lockedPreview} />}
              {paidVisible && routine.bathroomHabits && <InfoCard label="Bathroom" text={routine.bathroomHabits} locked={lockedPreview} />}
            </div>
          </section>
        )}

        {/* Medication — paid tier + full view only */}
        {paidVisible && medical && (medical.conditions?.length > 0 || medical.medications?.length > 0) && (
          <section>
            <SectionTitle name={name} tail="Medication" locked={lockedPreview} />
            <div className="flex flex-col gap-2">
              {medical.conditions?.length > 0 && <InfoCard label="Conditions" text={medical.conditions.join(", ")} />}
              {medical.medications?.map((med, i) => (
                <div key={i} className="bg-white border rounded-card px-4 py-3" style={{ borderColor: BORDER }}>
                  <p className="eyebrow text-primary mb-1">Medication</p>
                  <p className="text-sm font-semibold" style={{ color: BODY }}>{[med.name, med.dose].filter(Boolean).join(" — ")}</p>
                  {(med.frequency || med.locationStored) && (
                    <p className="text-text-muted text-xs mt-0.5">{[med.frequency, med.locationStored && `Stored: ${med.locationStored}`].filter(Boolean).join(" · ")}</p>
                  )}
                  {med.notes && <p className="text-text-muted text-xs mt-0.5">{med.notes}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Allergies — always shown regardless of tier */}
        {allergies.length > 0 && (
          <section>
            <SectionTitle name={name} tail="Allergies" />
            <div className="bg-white border rounded-card px-4 py-3" style={{ borderColor: BORDER }}>
              <p className="text-sm" style={{ color: BODY }}>{allergies.join(", ")}</p>
            </div>
          </section>
        )}

        {/* Commands */}
        {behavior.commands.length > 0 && (
          <section>
            <SectionTitle name={name} tail="Commands" />
            <div className="border rounded-card overflow-hidden" style={{ borderColor: BORDER }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: CRIMSON, color: BLUSH }}>
                    <th className="text-left px-3 py-2 eyebrow font-medium">Word</th>
                    <th className="text-left px-3 py-2 eyebrow font-medium">Means</th>
                    <th className="text-left px-3 py-2 eyebrow font-medium">Reward</th>
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
                        {cmd.word}
                        {cmd.howToCue?.trim() && (
                          // How-to-cue wasn't in the original table design, so keep it
                          // subtle: a hint icon that reveals the cue on hover (desktop)
                          // and an always-visible line beneath (mobile / no-hover).
                          <span
                            className="group relative ml-1 inline-flex cursor-help align-middle"
                            title={`How to cue: ${cmd.howToCue}`}
                          >
                            <span
                              className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold"
                              style={{ backgroundColor: BORDER, color: CRIMSON }}
                            >
                              ?
                            </span>
                            <span
                              className="pointer-events-none absolute left-0 top-5 z-10 hidden w-44 rounded-card px-3 py-2 text-xs font-light leading-snug shadow-lg group-hover:block"
                              style={{ backgroundColor: CRIMSON, color: BLUSH }}
                            >
                              {cmd.howToCue}
                            </span>
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-text-muted">
                        {cmd.meaning}
                        {cmd.howToCue?.trim() && (
                          <span className="mt-1 block text-xs font-light italic md:hidden" style={{ color: MUTED }}>
                            Cue: {cmd.howToCue}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-text-muted">{cmd.reward}</td>
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
            <SectionTitle name={name} tail="Triggers" />
            <div className="flex flex-col gap-2">
              {(behavior.flightRisk || behavior.escapeRisk.flag) && (
                <InfoCard label="Flight risk" text={behavior.flightRisk || behavior.escapeRisk.notes} highlight />
              )}
              {paidVisible && behavior.scared && <InfoCard label="Scared of" text={behavior.scared} locked={lockedPreview} />}
              {paidVisible && behavior.noGo && <InfoCard label="No-go zones" text={behavior.noGo} locked={lockedPreview} />}
              {paidVisible && behavior.temperamentSummary && <InfoCard label="Temperament" text={behavior.temperamentSummary} locked={lockedPreview} />}
            </div>
          </section>
        )}

        <footer className="mt-2 pb-8 border-t pt-5" style={{ borderColor: BORDER }}>
          <p className="text-text-muted text-xs text-center font-light">
            Made with love by {possessive(name)} owner · updated{" "}
            {new Date(lastUpdatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </p>
          <p className="text-foreground text-[11px] text-center mt-1 font-medium">
            Quirks &amp; All · quirksandall.itshypothetical.com
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

function hasFeeding(f: NonNullable<RecipientProfile["routine"]>["feeding"]): boolean {
  return !!(f.breakfast?.time || f.breakfast?.amount || f.lunch?.time || f.lunch?.amount || f.dinner?.time || f.dinner?.amount || f.treats?.type || f.notes);
}

function SectionTitle({ name, tail, locked }: { name: string; tail: string; locked?: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <h2 className="font-tanker text-2xl leading-none text-foreground">
        {possessive(name)} {tail}
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
      🔒 Sitters unlock this
    </span>
  );
}

// A contact row inside the dark emergency card: name, an optional place that
// links to Maps, and a phone that links to tel: — all formatted for AU.
function DarkContact({ label, name, place, phone }: { label: string; name?: string; place?: string; phone?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="eyebrow" style={{ color: "rgba(248,236,238,0.5)" }}>{label}</p>
      {name && <p className="text-sm font-bold" style={{ color: BLUSH }}>{name}</p>}
      {place && (
        <a
          href={`https://maps.google.com/?q=${encodeURIComponent(place)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm underline"
          style={{ color: "rgba(248,236,238,0.85)" }}
        >
          {place}
        </a>
      )}
      {phone && (
        <a href={`tel:${phone}`} className="text-sm" style={{ color: "rgba(248,236,238,0.85)" }}>
          {formatPhone(phone)}
        </a>
      )}
    </div>
  );
}

function InfoCard({ label, text, highlight, locked }: { label: string; text: string; highlight?: boolean; locked?: boolean }) {
  return (
    <div className="bg-white border rounded-card px-4 py-3" style={{ borderColor: highlight ? "#A07848" : BORDER }}>
      <div className="flex items-center justify-between mb-1">
        <p className="eyebrow" style={{ color: highlight ? "#A07848" : "#B83A52" }}>{label}</p>
        {locked && <PaidBadge />}
      </div>
      <p className="text-sm leading-relaxed" style={{ color: BODY }}>{text}</p>
    </div>
  );
}

function FeedingCard({ feeding }: { feeding: NonNullable<RecipientProfile["routine"]>["feeding"] }) {
  const meals: [string, { time?: string; amount?: string } | undefined][] = [
    ["Breakfast", feeding.breakfast],
    ["Lunch", feeding.lunch],
    ["Dinner", feeding.dinner],
  ];
  const shown = meals.filter(([, slot]) => slot?.time || slot?.amount);
  return (
    <div className="bg-white border rounded-card overflow-hidden" style={{ borderColor: BORDER }}>
      <div className="px-4 pt-3 pb-2">
        <p className="eyebrow" style={{ color: "#B83A52" }}>Feeding</p>
      </div>
      {shown.map(([label, slot], i) => (
        <div
          key={label}
          className="flex px-4 py-2 gap-3"
          style={{ borderTop: i === 0 ? undefined : `1px solid ${BORDER}` }}
        >
          <span className="text-sm font-medium w-20 shrink-0" style={{ color: MUTED }}>{label}</span>
          <span className="text-sm" style={{ color: BODY }}>
            {slot?.time && <span className="font-medium">{slot.time}</span>}
            {slot?.time && slot?.amount ? " · " : ""}
            {slot?.amount}
          </span>
        </div>
      ))}
      {(feeding.treats?.type || feeding.treats?.limit) && (
        <div className="flex px-4 py-2 gap-3" style={{ borderTop: `1px solid ${BORDER}` }}>
          <span className="text-sm font-medium w-20 shrink-0" style={{ color: MUTED }}>Treats</span>
          <span className="text-sm" style={{ color: BODY }}>
            {feeding.treats.type}
            {feeding.treats.limit && <span className="block text-xs font-light" style={{ color: MUTED }}>{feeding.treats.limit}</span>}
          </span>
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
