"use client";

import { useState } from "react";
import type { RecipientProfile } from "@quirksandall/shared";

type Props = {
  token: string;
  onUnlocked: (contacts: RecipientProfile["emergencyContacts"]) => void;
};

// Rate-limit state is tracked server-side in the edge function.
// This component handles the UI only.
export default function PINGate({ token, onUnlocked }: Props) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = async (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    setPin(digits);
    setError(null);

    if (digits.length === 4) {
      setLoading(true);
      try {
        const res = await fetch(`/api/pin-check`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, pin: digits }),
        });
        const data = await res.json();
        if (data.success) {
          onUnlocked(data.contacts);
        } else if (data.cooldown) {
          setCooldown(true);
          setError("Too many tries. Wait a few minutes, or call the owner directly.");
        } else {
          setError("That PIN didn't match. The owner set it — ask them directly.");
          setTimeout(() => { setPin(""); setError(null); }, 1200);
        }
      } catch {
        setError("Something went wrong. Try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    // Same dark crimson card as the unlocked emergency block, so the locked
    // state reads as part of the same app — just with a closed padlock and the
    // PIN entry.
    <section className="rounded-card p-5" style={{ backgroundColor: "#510000" }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <span className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F8ECEE" strokeWidth="2" className="shrink-0" style={{ opacity: 0.85 }}>
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span className="eyebrow" style={{ color: "#F8ECEE", fontWeight: 700 }}>In an emergency</span>
        </span>
        <span className="text-xs" style={{ color: "rgba(248,236,238,0.5)" }}>PIN-protected</span>
      </div>

      {/* PIN entry — restyled for the dark card */}
      <p className="eyebrow mb-3" style={{ color: "rgba(248,236,238,0.6)" }}>
        Enter PIN to view
      </p>

      {error && (
        <p className="text-sm mb-3 font-light leading-relaxed" style={{ color: "#F0A0B0" }}>
          {error}
        </p>
      )}

      <div className="relative flex gap-2.5">
        {[0, 1, 2, 3].map((i) => {
          const filled = i < pin.length;
          const isCurrent = i === pin.length && !error;
          return (
            <div
              key={i}
              className="h-[52px] w-[52px] rounded-button border-2 flex items-center justify-center transition-all duration-200"
              style={{
                borderColor: error
                  ? "#F0A0B0"
                  : filled
                  ? "#F8ECEE"
                  : isCurrent
                  ? "#F0A0B0"
                  : "rgba(248,236,238,0.25)",
                backgroundColor: error
                  ? "rgba(240,160,176,0.12)"
                  : filled
                  ? "#F8ECEE"
                  : "transparent",
              }}
            >
              {filled && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#510000" }} />}
            </div>
          );
        })}
        <input
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          value={pin}
          onChange={(e) => !cooldown && !loading && handleChange(e.target.value)}
          className="absolute inset-0 opacity-0 w-full h-full cursor-text"
          disabled={cooldown || loading}
        />
      </div>
    </section>
  );
}
