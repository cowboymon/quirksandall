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
    <div>
      {/* Locked card — plain register, no personality */}
      <div
        className="rounded-card px-5 py-4 flex items-center gap-3 mb-3"
        style={{ backgroundColor: "#510000" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F8ECEE" strokeWidth="2" opacity={0.6}>
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <div>
          <p className="text-sm font-bold uppercase tracking-wide" style={{ color: "#F8ECEE" }}>Emergency contacts</p>
          <p className="text-xs font-light mt-0.5" style={{ color: "rgba(248,236,238,0.5)" }}>
            PIN-protected · enter below to view
          </p>
        </div>
      </div>

      <div className="bg-white border rounded-card p-4" style={{ borderColor: "#E5BEC4" }}>
        <p className="eyebrow text-text-muted mb-3">Enter PIN</p>

        {error && (
          <p className="text-sm mb-3 font-light leading-relaxed" style={{ color: "#C98F8F" }}>
            {error}
          </p>
        )}

        {/* PIN dots */}
        <div className="relative flex gap-2">
          {[0, 1, 2, 3].map((i) => {
            const filled = i < pin.length;
            const isCurrent = i === pin.length && !error;
            return (
              <div
                key={i}
                className="flex-1 h-[52px] rounded-button border-2 flex items-center justify-center transition-all duration-200"
                style={{
                  borderColor: error
                    ? "#C98F8F"
                    : filled
                    ? "#510000"
                    : isCurrent
                    ? "#B83A52"
                    : "#E5BEC4",
                  backgroundColor: error
                    ? "rgba(184,112,112,0.1)"
                    : filled
                    ? "#510000"
                    : "#FFFFFF",
                }}
              >
                {filled && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#F8ECEE" }} />}
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
      </div>
    </div>
  );
}
