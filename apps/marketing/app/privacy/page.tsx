import type { Metadata } from "next";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { site } from "../site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${site.name} collects, uses and protects your information.`,
  alternates: { canonical: "/privacy" },
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
            This Privacy Policy explains how {site.legalEntity}
            {site.legalAbn ? ` (ABN ${site.legalAbn})` : ""} (&quot;we&quot;, &quot;us&quot;) collects,
            uses and shares information when you use the {site.name} app, website and the shareable links
            it generates (the &quot;Service&quot;). We keep it short and try to only collect what the
            Service actually needs.
          </p>

          <div className="my-8 rounded-card border border-border bg-card-bg p-5">
            <h3 className="!mt-0">Joining the launch waitlist (this website)</h3>
            <p>
              If you enter your email in the &quot;Get notified at launch&quot; form on this site, we
              collect <strong>only your email address</strong> and a note of which form you used (to see
              which converts). We use it for exactly one thing: a single email to tell you when {site.name}{" "}
              is live. We don&apos;t add you to a newsletter, sell or share it, or use it for anything else.
            </p>
            <p>
              We keep your email until launch (plus a short window to send that one email), then delete it.
              You can ask us to remove you sooner at any time — email{" "}
              <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>. When the launch email goes
              out it will identify us as the sender and carry a working unsubscribe link, as required under
              the Australian Spam Act.
            </p>
          </div>

          <h2>1. Information we collect</h2>
          <h3>Information you give us</h3>
          <ul>
            <li>
              <strong>Account details</strong> — your name, email address and phone number. Email is used
              to sign you in; your name and phone appear on missing-pet posters you generate.
            </li>
            <li>
              <strong>Pet profiles</strong> — name, breed, date of birth, sex, weight, colour and markings,
              microchip number, photo, commands, quirks, escape risk, allergies, routine, medications and
              conditions.
            </li>
            <li>
              <strong>Emergency contacts</strong> — vet, after-hours clinic, insurer and backup contact
              details you choose to add. These are protected behind a PIN you set.
            </li>
            <li>
              <strong>Documents you upload</strong> — vaccination and parasite-treatment certificates,
              stored as images or PDFs. These are visible only to you and are never shown to anyone opening
              a share link. Certificates issued by a veterinary practice often contain your name, address
              and contact details in the clinic&apos;s own layout; we store the file as you upload it and
              cannot edit or remove information printed on it.
            </li>
            <li>
              <strong>PINs</strong> — stored in hashed form so we can verify them without holding the raw
              value.
            </li>
          </ul>

          <h3>Information collected automatically</h3>
          <ul>
            <li>
              <strong>Technical and usage data</strong> — device type, operating system, app version, and
              how the app is used: screens opened, features used, and where people stop during setup. We
              use this to fix problems and improve the Service. It is collected through Mixpanel (see
              Service providers).
            </li>
            <li>
              <strong>Share link activity</strong> — when a link you created was last opened, shown to you
              so you know your sitter has seen it.
            </li>
            <li>
              <strong>Failed PIN attempts</strong> — the time and the IP address of failed attempts on a
              share link, kept to prevent guessing attacks and shown to you as a count. We do not record
              who made the attempt.
            </li>
          </ul>

          <h3>Information from others</h3>
          <p>
            When you add another person&apos;s details — a backup contact, your vet — you are providing
            their information to us. Please only do this where you have their permission or another lawful
            basis.
          </p>

          <h2>2. How we use information</h2>
          <ul>
            <li>to provide the Service — storing your pet&apos;s profile and rendering it when someone opens a link you share;</li>
            <li>to protect emergency details behind a PIN and to let you manage and revoke share links;</li>
            <li>to operate, maintain, secure and improve the Service;</li>
            <li>to respond to your requests and provide support;</li>
            <li>to comply with legal obligations;</li>
            <li>
              where you have switched it on in Settings, to send you occasional offers from pet insurance
              partners. This is off unless you turn it on, you can turn it off at any time, and we do not
              share your account details, your pet&apos;s information or your emergency contacts with those
              partners in order to do it.
            </li>
          </ul>
          <p>We do not sell your personal information, and we don&apos;t use it for third-party advertising.</p>

          <h2>3. Sharing through links</h2>
          <p>
            The core purpose of {site.name} is to let you share your pet&apos;s profile with people you
            choose. When you share a link, anyone who has it can view the non-PIN-protected parts of that
            profile. Emergency contacts require the PIN. You control who you send links to, and you can
            revoke a link at any time to stop it working. On a paid plan you can run a separate link per
            sitter and revoke any of them on its own.
          </p>

          <h2>3A. If someone has shared a link with you</h2>
          <p>
            You don&apos;t need an account to open a {site.name} link, and we don&apos;t ask you to create
            one. A small amount of information is still involved:
          </p>
          <ul>
            <li>
              If the link is protected by a PIN, we store a token in your browser for 30 days so you
              aren&apos;t asked to re-enter it every time. Clearing your browser data removes it. If the
              owner revokes the link, it stops working immediately regardless.
            </li>
            <li>We record when the link was last opened, and show that to the person who shared it with you.</li>
            <li>
              If a PIN is entered incorrectly, we log the time and IP address to prevent guessing attacks,
              and show the owner a count of failed attempts. We don&apos;t record who made them.
            </li>
          </ul>
          <p>
            The pet information you see belongs to the person who shared the link. They decide what it
            contains and can revoke your access at any time.
          </p>

          <h2>4. Service providers</h2>
          <p>
            We use trusted third parties to run the Service. They process data on our behalf under
            agreements that limit how they can use it. These include:
          </p>
          <ul>
            <li>
              <strong>Supabase</strong> — database, authentication and file storage for your account, pet
              profiles, photos and uploaded documents.
            </li>
            <li>
              <strong>Vercel</strong> — hosting for our website and for the shared pet profile pages your
              links open.
            </li>
            <li>
              <strong>Expo</strong> — infrastructure for building and updating the mobile app.
            </li>
            <li>
              <strong>Mixpanel</strong> — product analytics, to understand how the app is used and where it
              can be improved.
            </li>
            <li>
              <strong>Apple App Store &amp; Google Play</strong> — to process the one-time purchase. We
              don&apos;t receive your full payment details.
            </li>
            <li>
              <strong>RevenueCat</strong> — to verify and manage purchase entitlements.
            </li>
          </ul>

          <h2>5. Legal disclosures</h2>
          <p>
            We may disclose information if required by law, to enforce our terms, or to protect the rights,
            safety and security of our users, the public or {site.legalEntity}.
          </p>

          <h2>6. Data retention</h2>
          <p>We keep your information for as long as your account is active.</p>
          <p>
            When you delete a pet, a document or your account, we delete the associated data within 30
            days. Deleting a pet or your account invalidates its share links immediately, so they stop
            working straight away even while the underlying data is being removed.
          </p>
          <p>Failed PIN attempt records are kept for 30 days and then deleted.</p>
          <p>
            We may retain limited information for longer where we are legally required to — for example
            records relating to a purchase.
          </p>
          <p>
            Missing-pet posters are never stored. Each one is generated at the moment you request it and
            sent straight to you. There is no copy on our servers, which also means a poster always reflects
            your pet&apos;s current details rather than an older saved version.
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
            Our service providers may store and process information outside Australia, including in the
            United States and the European Union. Where information is transferred out of a jurisdiction
            with data protection laws, we rely on our providers&apos; standard contractual clauses and take
            reasonable steps to ensure it receives an equivalent level of protection.
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
