import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, Linking } from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { type Plan } from "../lib/purchases";
import { colors, LIFETIME_AVAILABLE } from "@quirksandall/shared";
import { usePrices } from "../hooks/usePrices";
import { usePurchaseFlow } from "../hooks/usePurchaseFlow";
import { REDEMPTION_ENABLED, TERMS_URL, PRIVACY_URL } from "../lib/config";
import { track, AnalyticsEvent } from "../lib/analytics";

const FEATURES = [
  { label: "The soft stuff, too", sub: "Scared of, steers clear of, and what they're really like" },
  { label: "Routine, beyond feeding", sub: "Walks, sleep, and the bathroom routine" },
  { label: "A link for every sitter", sub: "Share several at once — a separate live link per sitter or kennel, each revocable on its own" },
  { label: "Unlimited pets", sub: "Add as many as you need" },
];

export default function Upgrade() {
  const prices = usePrices();
  const [plan, setPlan] = useState<Plan>(LIFETIME_AVAILABLE ? "lifetime" : "annual");
  const { loading, purchase, restore } = usePurchaseFlow("upgrade");

  useEffect(() => { track(AnalyticsEvent.PaywallViewed, { source: "upgrade" }); }, []);

  const handlePurchase = () => purchase(plan, () => router.back());
  const handleRestore = () => restore(() => router.back());

  return (
    <View style={{ flex: 1, backgroundColor: "#510000" }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        {/* ── Dark hero ─────────────────────────────── */}
        <View style={{ paddingHorizontal: 24, paddingTop: 60, paddingBottom: 36 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 36 }}>
            <Text style={{ color: "rgba(248,236,238,0.6)", fontSize: 13, fontFamily: "Satoshi-Medium" }}>‹ Back</Text>
          </TouchableOpacity>

          <Text style={{ fontFamily: "Tanker", fontSize: 42, lineHeight: 42, color: "#F8ECEE", marginBottom: 14 }}>
            Unlock the full picture.
          </Text>
          <Text style={{ color: "rgba(248,236,238,0.7)", fontSize: 15, lineHeight: 22, fontFamily: "Satoshi-Light" }}>
            Routines and the softer stuff that makes the handoff feel less like a stranger and more like you.
          </Text>

          {/* Single-plan launch: the price lives here in the hero. When the
              lifetime plan ships (LIFETIME_AVAILABLE), the picker below takes
              over and this pill retires. */}
          {!LIFETIME_AVAILABLE && (
            <View
              style={{
                alignSelf: "flex-start",
                flexDirection: "row",
                alignItems: "baseline",
                gap: 8,
                backgroundColor: "rgba(248,236,238,0.1)",
                borderWidth: 1,
                borderColor: "rgba(248,236,238,0.2)",
                borderRadius: 999,
                paddingHorizontal: 20,
                paddingVertical: 10,
                marginTop: 24,
              }}
            >
              <Text style={{ fontFamily: "Tanker", fontSize: 30, color: "#F8ECEE" }}>{prices.annual}</Text>
              <Text style={{ color: "rgba(248,236,238,0.6)", fontSize: 12, fontFamily: "Satoshi-Light" }}>a year</Text>
            </View>
          )}
        </View>

        {/* ── Light panel ───────────────────────────── */}
        <View
          style={{
            flex: 1,
            backgroundColor: "#F8ECEE",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 24,
            paddingTop: 28,
            paddingBottom: 40,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontFamily: "Satoshi-Medium",
              textTransform: "uppercase",
              letterSpacing: 0.7,
              color: colors.textMuted,
              marginBottom: 20,
            }}
          >
            Everything unlocked
          </Text>

          {/* Features */}
          <View style={{ flex: 1 }}>
            {FEATURES.map((f, i) => (
              <View
                key={f.label}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 16,
                  paddingVertical: 14,
                  borderBottomWidth: i < FEATURES.length - 1 ? 1 : 0,
                  borderBottomColor: colors.border,
                }}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: "#510000",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="checkmark" size={13} color="#F8ECEE" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#510000", fontSize: 15, fontFamily: "Satoshi-Medium" }}>{f.label}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12, fontFamily: "Satoshi-Light", marginTop: 3 }}>{f.sub}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Plan picker — two options, one entitlement. Same features either
              way; the choice is only how it's paid for, and the cards say so
              rather than inventing tiers that don't exist. Hidden until the
              lifetime product actually exists to buy. */}
          {LIFETIME_AVAILABLE && (
          <View style={{ flexDirection: "row", gap: 10, marginTop: 28 }}>
            {(
              [
                { id: "annual" as Plan, title: "Yearly", price: prices.annual, sub: "per year" },
                { id: "lifetime" as Plan, title: "Forever", price: prices.lifetime, sub: "once, that's it" },
              ]
            ).map((p) => {
              const selected = plan === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setPlan(p.id)}
                  activeOpacity={0.85}
                  style={{
                    flex: 1,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: selected ? "#510000" : colors.border,
                    backgroundColor: selected ? "#FFFFFF" : colors.cardBg,
                    paddingHorizontal: 14,
                    paddingVertical: 14,
                    gap: 2,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={{ color: colors.textMuted, fontSize: 11, fontFamily: "Satoshi-Medium", textTransform: "uppercase", letterSpacing: 0.5 }}>
                      {p.title}
                    </Text>
                    <View
                      style={{
                        width: 16, height: 16, borderRadius: 8, borderWidth: 2,
                        borderColor: selected ? "#510000" : colors.border,
                        backgroundColor: selected ? "#510000" : "transparent",
                        alignItems: "center", justifyContent: "center",
                      }}
                    >
                      {selected && <Ionicons name="checkmark" size={10} color="#F8ECEE" />}
                    </View>
                  </View>
                  <Text style={{ fontFamily: "Tanker", fontSize: 24, color: "#510000", marginTop: 6 }}>{p.price}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 11, fontFamily: "Satoshi-Light" }}>{p.sub}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          )}

          {/* CTA footer */}
          <View style={{ marginTop: 16, alignItems: "center", gap: 12 }}>
            <TouchableOpacity
              onPress={handlePurchase}
              disabled={loading}
              activeOpacity={0.85}
              style={{
                width: "100%",
                height: 52,
                borderRadius: 12,
                backgroundColor: "#510000",
                alignItems: "center",
                justifyContent: "center",
                opacity: loading ? 0.5 : 1,
              }}
            >
              <Text style={{ color: "#F8ECEE", fontSize: 15, fontFamily: "Satoshi-Medium", letterSpacing: 0.3 }}>
                {loading
                  ? "Working…"
                  : plan === "lifetime"
                  ? `Unlock forever — ${prices.lifetime}`
                  : `Unlock for ${prices.annual} a year`}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleRestore} disabled={loading} style={{ paddingVertical: 4 }}>
              <Text style={{ color: colors.textMuted, fontSize: 14, fontFamily: "Satoshi-Medium" }}>Restore purchases</Text>
            </TouchableOpacity>

            {/* Batch-licensing redemption (breeders, insurance partners). Hidden
                until the backend exists — an unexplained link to a "coming
                soon" placeholder is unnecessary risk on an App Review whose
                only job is activating the app's real IAPs.
                Intended architecture: code lives in a redemption_codes table →
                a Supabase Edge Function validates it → the function calls the
                RevenueCat API to grant a Promotional Entitlement to this user's
                RC customer ID (bypasses StoreKit/Play Billing, so one shared
                code works on both platforms). Do NOT use Apple/Google promo
                codes — they're platform-specific. Flip REDEMPTION_ENABLED on
                once the backend exists. */}
            {REDEMPTION_ENABLED && (
              <TouchableOpacity onPress={() => router.push("/redeem")} style={{ paddingVertical: 4 }}>
                <Text style={{ color: colors.textMuted, fontSize: 13, fontFamily: "Satoshi" }}>Have a code?</Text>
              </TouchableOpacity>
            )}

            {/* App Review requires auto-renewal terms and working Terms/Privacy
                links on any paywall selling a subscription. Plain-worded, but
                the required facts are all present: price, term, renewal,
                cancellation. */}
            <Text style={{ color: colors.textMuted, fontSize: 10, fontFamily: "Satoshi-Light", textAlign: "center", lineHeight: 15 }}>
              {plan === "annual"
                ? `Renews automatically at ${prices.annual} a year until cancelled — manage or cancel any time in your App Store / Google Play account settings. `
                : "One payment, charged to your App Store / Google Play account. "}
              Unlocks account-wide — every pet you add, covered.
            </Text>
            <View style={{ flexDirection: "row", gap: 16 }}>
              <TouchableOpacity onPress={() => Linking.openURL(TERMS_URL)}>
                <Text style={{ color: colors.textMuted, fontSize: 10, fontFamily: "Satoshi", textDecorationLine: "underline" }}>Terms of Use</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)}>
                <Text style={{ color: colors.textMuted, fontSize: 10, fontFamily: "Satoshi", textDecorationLine: "underline" }}>Privacy Policy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
