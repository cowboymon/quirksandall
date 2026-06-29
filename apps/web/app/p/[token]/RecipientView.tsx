"use client";

import { useState } from "react";
import type { RecipientProfile } from "@quirksandall/shared";
import PINGate from "./PINGate";

type Props = { profile: RecipientProfile; token: string };

export default function RecipientView({ profile, token }: Props) {
  const { pet, age, behavior, allergies, routine, medical, lastUpdatedAt, mode, isPaid } = profile;
  const [view, setView] = useState<"quick" | "full">("quick");
  const [pinUnlocked, setPinUnlocked] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState<RecipientProfile["emergencyContacts"] | null>(null);

  const showRoutine = view === "full" && isPaid && routine;
  const showMedical = view === "full" && isPaid && medical;

  return (
    <div className="flex flex-col min-h-screen pb-16 max-w-lg mx-auto px-6">
      {/* Pet identity */}
      <div className="pt-10 pb-5">
        <div className="flex items-center gap-4 mb-4">
          {pet.photoUrl && (
            <img
              src={pet.photoUrl}
              alt={pet.name}
              className="w-16 h-16 rounded-full object-cover border-2"
              style={{ borderColor: "#E8DCC8" }}
            />
          )}
          <div>
            <h1 className="font-spectral text-3xl font-bold italic leading-none text-primary">
              {pet.name}'s Cheat Sheet
            </h1>
            <p className="text-text-muted text-sm mt-1">
              {pet.breed} · {age}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {[
            ["Weight", pet.weight],
            ["Sex", pet.sex],
            ["Color", pet.colorMarkings],
            ["Microchip", pet.microchipNumber],
          ]
            .filter(([, v]) => !!v)
            .map(([label, val]) => (
              <div
                key={label}
                className="bg-white border rounded-card px-3 py-2.5"
                style={{ borderColor: "#E8DCC8" }}
              >
                <p className="eyebrow text-text-muted">{label}</p>
                <p className="text-primary text-xs font-medium mt-0.5 truncate">{val}</p>
              </div>
            ))}
        </div>

        {/* Quick / Full toggle */}
        <div
          className="flex gap-1 rounded-card p-1"
          style={{ backgroundColor: "#EFE7D8" }}
        >
          {(["quick", "full"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="flex-1 h-9 rounded-button text-sm font-medium transition-all"
              style={
                view === v
                  ? { backgroundColor: "#4A2E3D", color: "#F7E9C9" }
                  : { color: "#8A7A72" }
              }
            >
              {v === "quick" ? "Quick view" : "Full view"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {/* Emergency contacts — PIN-gated, no personality, plain labels */}
        {!pinUnlocked ? (
          <PINGate
            token={token}
            onUnlocked={(contacts) => {
              setPinUnlocked(true);
              setEmergencyContacts(contacts);
            }}
          />
        ) : (
          emergencyContacts && (
            <section className="border rounded-card p-4" style={{ borderColor: "#E8DCC8" }}>
              <p className="eyebrow text-text-muted mb-3">Emergency contacts</p>
              <div className="flex flex-col gap-3">
                <ContactRow label="Vet" name={emergencyContacts.primaryVet.clinic} phone={emergencyContacts.primaryVet.phone} />
                <ContactRow label="Emergency vet" name={emergencyContacts.emergencyVet.clinic} phone={emergencyContacts.emergencyVet.phone} />
                <ContactRow label="Insurance" name={emergencyContacts.insurance.provider} phone={emergencyContacts.insurance.claimsContact} />
                <ContactRow label="Owner" name={emergencyContacts.ownerContact.name} phone={emergencyContacts.ownerContact.phone} />
                {emergencyContacts.backupContacts.map((c, i) => (
                  <ContactRow key={i} label={`Backup — ${c.relationship}`} name={c.name} phone={c.phone} />
                ))}
              </div>
            </section>
          )
        )}

        {/* Commands */}
        {behavior.commands.length > 0 && (
          <section>
            <p className="eyebrow text-text-muted mb-2">Commands</p>
            <div className="border rounded-card overflow-hidden" style={{ borderColor: "#E8DCC8" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: "#4A2E3D", color: "#F7E9C9" }}>
                    <th className="text-left px-3 py-2 eyebrow font-medium">Word</th>
                    <th className="text-left px-3 py-2 eyebrow font-medium">Means</th>
                    <th className="text-left px-3 py-2 eyebrow font-medium">Reward</th>
                  </tr>
                </thead>
                <tbody>
                  {behavior.commands.map((cmd, i) => (
                    <tr
                      key={cmd.id}
                      className="border-t"
                      style={{ borderColor: "#E8DCC8", backgroundColor: i % 2 === 0 ? "#FFFFFF" : "#FBF4E8" }}
                    >
                      <td className="px-3 py-2 font-semibold text-primary">{cmd.word}</td>
                      <td className="px-3 py-2 text-text-muted">{cmd.meaning}</td>
                      <td className="px-3 py-2 text-text-muted">{cmd.reward}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Quirks & triggers */}
        {(behavior.scared || behavior.noGo || behavior.flightRisk || behavior.escapeRisk.flag) && (
          <section>
            <p className="eyebrow text-text-muted mb-2">Quirks & triggers</p>
            <div className="flex flex-col gap-2">
              {behavior.scared && <QuirkCard label="Scared of" text={behavior.scared} />}
              {behavior.noGo && <QuirkCard label="Off-limits" text={behavior.noGo} />}
              {(behavior.flightRisk || behavior.escapeRisk.flag) && (
                <QuirkCard
                  label="Flight risk"
                  text={behavior.flightRisk || behavior.escapeRisk.notes}
                  highlight
                />
              )}
            </div>
          </section>
        )}

        {/* Allergies — always shown regardless of tier */}
        {allergies.length > 0 && (
          <section>
            <p className="eyebrow text-text-muted mb-2">Allergies</p>
            <div className="bg-white border rounded-card px-4 py-3" style={{ borderColor: "#E8DCC8" }}>
              <p className="text-primary text-sm">{allergies.join(", ")}</p>
            </div>
          </section>
        )}

        {/* Routine — paid tier + full view only */}
        {showRoutine && routine && (
          <section>
            <p className="eyebrow text-text-muted mb-2">Routine</p>
            <div className="flex flex-col gap-2">
              {routine.feeding && (
                <RoutineCard label="Feeding" text={formatFeeding(routine.feeding)} />
              )}
              {routine.walks && <RoutineCard label="Walks" text={routine.walks} />}
              {routine.sleep && <RoutineCard label="Sleep" text={routine.sleep} />}
              {routine.bathroomHabits && <RoutineCard label="Bathroom" text={routine.bathroomHabits} />}
            </div>
          </section>
        )}

        {/* Medical — paid tier + full view only */}
        {showMedical && medical && (
          <section>
            {medical.conditions?.length > 0 && (
              <>
                <p className="eyebrow text-text-muted mb-2">Medical conditions</p>
                <div className="bg-white border rounded-card px-4 py-3 mb-2" style={{ borderColor: "#E8DCC8" }}>
                  <p className="text-primary text-sm">{medical.conditions.join(", ")}</p>
                </div>
              </>
            )}
            {medical.medications?.length > 0 && (
              <>
                <p className="eyebrow text-text-muted mb-2 mt-4">Medications</p>
                {medical.medications.map((med, i) => (
                  <div key={i} className="bg-white border rounded-card px-4 py-3 mb-2" style={{ borderColor: "#E8DCC8" }}>
                    <p className="text-primary text-sm font-semibold">{med.name} — {med.dose}</p>
                    <p className="text-text-muted text-xs mt-0.5">{med.frequency} · Stored: {med.locationStored}</p>
                    {med.notes && <p className="text-text-muted text-xs mt-0.5">{med.notes}</p>}
                  </div>
                ))}
              </>
            )}
          </section>
        )}

        <footer className="mt-4 pb-8">
          <p className="eyebrow text-text-muted text-center">
            Last updated by owner
          </p>
        </footer>
      </div>
    </div>
  );
}

function ContactRow({ label, name, phone }: { label: string; name: string; phone: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="eyebrow text-text-muted">{label}</p>
      <p className="text-primary text-sm font-semibold">{name}</p>
      <a href={`tel:${phone}`} className="text-primary text-sm underline">{phone}</a>
    </div>
  );
}

function QuirkCard({ label, text, highlight }: { label: string; text: string; highlight?: boolean }) {
  return (
    <div
      className="bg-white border rounded-card px-4 py-3"
      style={{ borderColor: highlight ? "#C9A24A" : "#E8DCC8" }}
    >
      <p className="eyebrow mb-1" style={{ color: highlight ? "#C9A24A" : "#8A7A72" }}>{label}</p>
      <p className="text-primary text-sm">{text}</p>
    </div>
  );
}

function RoutineCard({ label, text }: { label: string; text: string }) {
  return (
    <div className="bg-white border rounded-card px-4 py-3" style={{ borderColor: "#E8DCC8" }}>
      <p className="eyebrow text-text-muted mb-1">{label}</p>
      <p className="text-primary text-sm">{text}</p>
    </div>
  );
}

function formatFeeding(feeding: RecipientProfile["routine"]["feeding"]): string {
  const slots = [
    feeding.breakfast?.time && `Breakfast ${feeding.breakfast.time}: ${feeding.breakfast.amount}`,
    feeding.lunch?.time && `Lunch ${feeding.lunch.time}: ${feeding.lunch.amount}`,
    feeding.dinner?.time && `Dinner ${feeding.dinner.time}: ${feeding.dinner.amount}`,
  ].filter(Boolean);
  const treats = feeding.treats?.type ? `Treats: ${feeding.treats.type} (${feeding.treats.limit})` : "";
  return [...slots, treats, feeding.notes].filter(Boolean).join(". ");
}
