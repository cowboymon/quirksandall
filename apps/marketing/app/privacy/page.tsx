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
            This policy explains what information {site.name} collects, why, and what you can do about
            it. {site.name} is operated by {site.legalEntity} (ABN {site.legalAbn}) (&quot;we&quot;,
            &quot;us&quot;).
          </p>

          <div className="my-8 rounded-card border border-border bg-card-bg p-5">
            <h3 className="!mt-0">Joining the launch waitlist (this website)</h3>
            <p>
              If you give us your email address on this site to be told when {site.name} launches, we
              use it for that one message and nothing else. We don&apos;t add you to a newsletter, sell
              or share it, or use it for anything else. You can ask us to remove you at any time by
              replying to that email or contacting us at{" "}
              <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>. When the launch email
              goes out it will identify us as the sender and carry a working unsubscribe link, as
              required under the Australian Spam Act.
            </p>
          </div>

          <h2>1. Information we collect</h2>
          <h3>Information you give us</h3>
          <ul>
            <li>
              <strong>Account details</strong> — your name, email address and phone number. Your email
              signs you in; your name and phone appear on missing-pet posters you generate.
            </li>
            <li>
              <strong>Pet profiles</strong> — name, breed, date of birth, sex, weight, colour and
              markings, microchip number, photo, commands, quirks, escape risk, allergies, routine,
              medications and conditions.
            </li>
            <li>
              <strong>Emergency contacts</strong> — vet, after-hours clinic, insurer and backup
              contacts you choose to add, including which of them you nominate as a decision contact.
              These sit behind a PIN you set.
            </li>
            <li>
              <strong>Documents you upload</strong> — vaccination and parasite-treatment certificates,
              stored as images or PDFs. These are visible only to you and are never shown to anyone
              opening a share link. Certificates issued by a veterinary practice often carry your name,
              address and contact details in the clinic&apos;s own layout. We store the file as you
              upload it and can&apos;t edit or remove what&apos;s printed on it.
            </li>
            <li>
              <strong>PINs</strong> — stored hashed, so we can check them without holding the raw value.
            </li>
          </ul>

          <h3>Information collected automatically</h3>
          <ul>
            <li>
              <strong>Technical and usage data</strong> — device type, operating system, app version,
              and how the app is used: which screens are opened, which features are used, and where
              people stop during setup. We use this to fix problems and improve the Service.
            </li>
            <li>
              <strong>Share link activity</strong> — when a link you created was last opened, shown to
              you so you know your sitter has seen it.
            </li>
            <li>
              <strong>Failed PIN attempts</strong> — the time and IP address of failed attempts on a
              share link, kept to prevent guessing attacks and shown to you as a count. We don&apos;t
              record who made them.
            </li>
          </ul>

          <h3>Information from other people</h3>
          <p>
            When you add someone else&apos;s details — a backup contact, your vet — you&apos;re giving
            us their information. Please only do that where you have their permission or another lawful
            basis.
          </p>

          <h2>2. How we use information</h2>
          <p>We use it to:</p>
          <ul>
            <li>run the Service — store your pet&apos;s profile and show it to people you share a link with;</li>
            <li>keep your account and your emergency details secure, including PIN checks and rate limiting;</li>
            <li>process your purchase and remember that you&apos;ve made it;</li>
            <li>understand how the app is used so we can improve it;</li>
            <li>respond to you when you get in touch;</li>
            <li>meet our legal obligations;</li>
            <li>
              where you&apos;ve switched it on in Settings, send you occasional offers from pet insurance
              partners. This is off unless you turn it on, you can turn it off at any time, and we
              don&apos;t share your account details, your pet&apos;s information or your emergency
              contacts with those partners in order to do it.
            </li>
          </ul>
          <p>We don&apos;t sell your personal information, and we don&apos;t use it for third-party advertising.</p>

          <h2>3. Sharing your pet&apos;s profile</h2>
          <p>
            The Service works by generating a link that shows your pet&apos;s profile. Anyone with that
            link can see the parts of the profile that aren&apos;t behind your PIN. Emergency contacts
            sit behind the PIN.
          </p>
          <p>
            You decide who gets a link, and you can revoke any link at any time — it stops working
            immediately. On a paid plan you can run several links at once and revoke them individually.
          </p>
          <p>
            We can&apos;t control what someone does with information after they&apos;ve seen it. Revoking
            a link stops future access; it doesn&apos;t undo what&apos;s already been read or saved.
          </p>
          <p>Uploaded documents are never shown on a shared link. They&apos;re visible only to you in the app.</p>

          <h2>4. If someone has shared a link with you</h2>
          <p>
            You don&apos;t need an account to open a {site.name} link, and we don&apos;t ask you to
            create one. A small amount of information is still involved:
          </p>
          <ul>
            <li>
              If the link is protected by a PIN, we store a token in your browser for 30 days so
              you&apos;re not asked to re-enter it every time. Clearing your browser data removes it. If
              the owner revokes the link, it stops working immediately regardless.
            </li>
            <li>We record when the link was last opened, and show that to the person who shared it with you.</li>
            <li>
              If a PIN is entered incorrectly, we log the time and IP address to prevent guessing
              attacks, and show the owner a count of failed attempts. We don&apos;t record who made them.
            </li>
          </ul>
          <p>
            The pet information you see belongs to the person who shared the link. They decide what it
            contains and can revoke your access at any time. If you have questions about that
            information, speak to them.
          </p>

          <h2>5. Service providers</h2>
          <p>
            We use a small number of providers to run the Service. They only handle information as
            needed to provide it to us.
          </p>
          <ul>
            <li>
              <strong>Supabase</strong> — database, authentication and file storage for your account,
              pet profiles, photos and uploaded documents.
            </li>
            <li>
              <strong>Vercel</strong> — hosting for our website and for the shared profile pages your
              links open.
            </li>
            <li>
              <strong>Expo</strong> — infrastructure for building and updating the mobile app.
            </li>
            <li>
              <strong>Mixpanel</strong> — product analytics, to understand how the app is used and where
              it can be improved.
            </li>
            <li>
              <strong>Apple App Store and Google Play</strong> — to process your purchase. We
              don&apos;t receive your full payment details.
            </li>
            <li>
              <strong>RevenueCat</strong> — to verify and manage purchase entitlements.
            </li>
          </ul>

          <h2>6. Security</h2>
          <p>
            We take reasonable steps to protect your information. PINs are stored hashed rather than in
            plain text. Emergency contacts are only returned to a device that has entered the correct
            PIN. Failed PIN attempts are rate limited. Uploaded documents are served through short-lived,
            signed links rather than public URLs.
          </p>
          <p>
            No system is completely secure, and we can&apos;t guarantee absolute security. Keep your
            account login and any PINs you set reasonably private, and share links only with people you
            trust.
          </p>

          <h2>7. Data retention</h2>
          <p>We keep your information for as long as your account is active.</p>
          <p>
            When you delete a pet, a document or your account, we delete the associated data within 30
            days. Deleting a pet or your account invalidates its share links immediately, so they stop
            working straight away even while the underlying data is being removed.
          </p>
          <p>Failed PIN attempt records are kept for 30 days, then deleted.</p>
          <p>
            We may keep limited information for longer where we&apos;re legally required to — for
            example, records relating to a purchase.
          </p>
          <p>
            Missing-pet posters are never stored. Each one is generated at the moment you ask for it and
            sent straight to you. There&apos;s no copy on our servers, which also means a poster always
            reflects your pet&apos;s current details rather than an older saved version.
          </p>

          <h2>8. Your rights</h2>
          <p>
            You can access, correct or delete most of your information directly in the app. You can also
            ask us to:
          </p>
          <ul>
            <li>give you a copy of the information we hold about you;</li>
            <li>correct anything that&apos;s wrong;</li>
            <li>delete your information;</li>
            <li>restrict or object to how we use it;</li>
            <li>withdraw consent you&apos;ve given, such as the insurance offers setting.</li>
          </ul>
          <p>
            Email us at <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a> and we&apos;ll
            respond within a reasonable time and in line with the law that applies to you.
          </p>
          <p>
            If you&apos;re in Australia and you&apos;re not satisfied with our response, you can complain
            to the Office of the Australian Information Commissioner at{" "}
            <a href="https://oaic.gov.au" target="_blank" rel="noopener noreferrer">
              oaic.gov.au
            </a>
            . If you&apos;re in the EEA or UK, you can complain to your local data protection authority.
          </p>

          <h2>9. Children</h2>
          <p>
            The Service isn&apos;t directed at children. You must be at least 16, or the age of digital
            consent where you live, to use it. We don&apos;t knowingly collect personal information from
            children — if you believe a child has given us information, contact us and we&apos;ll delete
            it.
          </p>

          <h2>10. International transfers</h2>
          <p>
            Our providers may store and process information outside Australia, including in the United
            States and the European Union. Our product analytics provider (Mixpanel) is configured for
            EU data residency, so analytics data is stored and processed in the European Union. Where
            information is transferred out of a jurisdiction with data protection laws, we rely on our
            providers&apos; standard contractual clauses and take reasonable steps to make sure it
            receives an equivalent level of protection.
          </p>

          <h2>11. Changes to this policy</h2>
          <p>
            We may update this policy. If we make material changes we&apos;ll update the date above and,
            where appropriate, let you know in the app.
          </p>

          <h2>12. Contact</h2>
          <p>
            Questions about this policy, or want to exercise any of the rights above? Email{" "}
            <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
