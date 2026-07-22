import type { Metadata } from "next";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { site } from "../site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${site.name} collects, uses and protects your information.`,
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-14 sm:py-20">
        <p className="eyebrow text-primary">Legal</p>
        <h1 className="mt-3 font-tanker text-4xl leading-none text-foreground sm:text-5xl">
          Privacy Policy
        </h1>
        <p className="mt-4 text-sm text-text-muted">Last updated {site.legalLastUpdated}</p>

        <div className="prose-legal mt-8">
          <p>
            This Privacy Policy explains how {site.operator} (&quot;we&quot;, &quot;us&quot;) collects,
            uses and shares information when you use the {site.name} app, website and the shareable links
            it generates (the &quot;Service&quot;). We keep it short and try to only collect what the
            Service actually needs.
          </p>

          <h2>1. Information we collect</h2>
          <h3>Information you give us</h3>
          <ul>
            <li>
              <strong>Account details</strong> — such as your email address, used to sign you in and
              contact you about the Service.
            </li>
            <li>
              <strong>Pet profiles</strong> — the information you add about your pet: name, breed, age,
              photo, quirks, commands, allergies, routine, medications and conditions.
            </li>
            <li>
              <strong>Emergency contacts</strong> — vet, after-hours clinic, insurer and backup contact
              details you choose to add. These are protected behind a PIN you set.
            </li>
            <li>
              <strong>PINs</strong> — stored in hashed form so we can verify them without holding the raw
              value.
            </li>
          </ul>

          <h3>Information collected automatically</h3>
          <ul>
            <li>
              <strong>Basic technical data</strong> — such as device type and app version, used to keep the
              Service working and diagnose problems.
            </li>
            <li>
              <strong>Push tokens</strong> — if you enable notifications, a device token so we can send the
              nudges you&apos;ve asked for.
            </li>
          </ul>

          <h3>Information from others</h3>
          <p>
            When you add another person&apos;s details (for example a backup contact or your vet), you are
            providing their information to us. Please only do this where you have their permission or
            another lawful basis.
          </p>

          <h2>2. How we use information</h2>
          <ul>
            <li>to provide the Service — storing your pet&apos;s profile and rendering it when someone opens a link you share;</li>
            <li>to protect emergency details behind a PIN and to let you rotate share links;</li>
            <li>to send notifications you&apos;ve turned on;</li>
            <li>to operate, maintain, secure and improve the Service;</li>
            <li>to respond to your requests and provide support;</li>
            <li>to comply with legal obligations.</li>
          </ul>
          <p>We do not sell your personal information, and we don&apos;t use it for third-party advertising.</p>

          <h2>3. Sharing through links</h2>
          <p>
            The core purpose of {site.name} is to let you share your pet&apos;s profile with people you
            choose. When you share a link, anyone who has it can view the non-PIN-protected parts of that
            profile. Emergency contacts require the PIN. You control who you send links to, and — on a paid
            plan — you can rotate a link to invalidate the previous one.
          </p>

          <h2>4. Service providers</h2>
          <p>
            We use trusted third parties to run the Service. They process data on our behalf under
            agreements that limit how they can use it. These include:
          </p>
          <ul>
            <li>
              <strong>Supabase</strong> — hosting, database and file storage for your account, profiles and
              photos.
            </li>
            <li>
              <strong>Apple App Store &amp; Google Play</strong> — to process the one-time Pro purchase. We
              don&apos;t receive your full payment details.
            </li>
            <li>
              <strong>RevenueCat</strong> — to verify and manage purchase entitlements.
            </li>
            <li>
              <strong>Push notification services</strong> (Apple Push Notification service / Firebase Cloud
              Messaging) — to deliver notifications you&apos;ve enabled.
            </li>
          </ul>

          <h2>5. Legal disclosures</h2>
          <p>
            We may disclose information if required by law, to enforce our terms, or to protect the rights,
            safety and security of our users, the public or {site.operator}.
          </p>

          <h2>6. Data retention</h2>
          <p>
            We keep your information for as long as your account is active or as needed to provide the
            Service. When you delete a pet, a profile or your account, we delete or anonymise the associated
            data within a reasonable period, except where we need to retain some information to meet legal
            obligations.
          </p>

          <h2>7. Security</h2>
          <p>
            We use reasonable technical and organisational measures to protect your information — including
            hashing PINs and access controls on stored data. No system is perfectly secure, so we can&apos;t
            guarantee absolute security, but we work to protect your data and to limit what we collect in
            the first place.
          </p>

          <h2>8. Your rights</h2>
          <p>
            Depending on where you live, you may have rights to access, correct, export or delete your
            personal information, or to object to or restrict certain processing. You can edit or delete most
            data directly in the app, or contact us to exercise these rights. We won&apos;t discriminate
            against you for exercising them.
          </p>

          <h2>9. Children</h2>
          <p>
            The Service isn&apos;t directed at children and isn&apos;t intended for anyone under 16. We
            don&apos;t knowingly collect personal information from children. If you believe a child has
            provided us information, contact us and we&apos;ll delete it.
          </p>

          <h2>10. International transfers</h2>
          <p>
            Your information may be processed in countries other than your own, including where our service
            providers operate. Where required, we take steps to ensure your information receives an adequate
            level of protection.
          </p>

          <h2>11. Changes to this policy</h2>
          <p>
            We may update this Privacy Policy from time to time. When we make material changes, we&apos;ll
            update the date above and, where appropriate, notify you in the app.
          </p>

          <h2>12. Contact</h2>
          <p>
            Questions or requests about your privacy? Email us at{" "}
            <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
