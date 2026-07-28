import type { Metadata } from "next";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { site } from "../site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `The terms that govern your use of ${site.name}.`,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-14 sm:py-20">
        <p className="eyebrow text-primary">Legal</p>
        <h1 className="mt-3 font-tanker text-4xl leading-none text-foreground sm:text-5xl">
          Terms of Service
        </h1>
        <p className="mt-4 text-sm text-text-muted">Last updated {site.legalLastUpdated}</p>

        <div className="prose-legal mt-8">
          <p>
            These Terms of Service (&quot;Terms&quot;) govern your access to and use of the {site.name}{" "}
            mobile app, website and the shareable links it generates (together, the &quot;Service&quot;),
            operated by {site.legalEntity}
            {site.legalAbn ? ` (ABN ${site.legalAbn})` : ""} (&quot;we&quot;, &quot;us&quot;). By
            downloading, accessing or using the Service, you agree to these Terms. If you don&apos;t agree,
            please don&apos;t use the Service.
          </p>

          <h2>1. Who can use the Service</h2>
          <p>
            You must be at least 16 years old, or the age of digital consent where you live, to use{" "}
            {site.name}. By using the Service you confirm you meet this requirement and that the
            information you provide is accurate.
          </p>

          <h2>2. Your account</h2>
          <p>
            Some features require an account. You&apos;re responsible for the activity that happens under
            your account and for keeping your login and any PINs you set reasonably secure. Tell us
            promptly if you believe your account has been compromised.
          </p>

          <h2>3. What the Service is — and isn&apos;t</h2>
          <p>
            {site.name} helps you record information about your pet and share it with people who care for
            them. It is an organisational and communication tool. It is{" "}
            <strong>not</strong> a substitute for professional veterinary advice, emergency services, or
            your own judgement. In an emergency, contact a vet or the relevant emergency service directly.
          </p>
          <p>
            You are responsible for the accuracy of what you record. Medication doses, allergies, vet
            details and emergency contacts are shown to whoever opens your link exactly as you entered them
            — we don&apos;t verify them.
          </p>

          <h2>4. Your content</h2>
          <p>
            You keep ownership of the information, text, photos, documents and other content you add
            (&quot;Your Content&quot;). You grant us a limited licence to host, store, process and display
            Your Content solely to operate the Service for you — for example, rendering the shared profile
            page when someone opens a link you&apos;ve shared.
          </p>
          <p>You are responsible for Your Content. You agree that:</p>
          <ul>
            <li>you have the right to share everything you add, including any third party&apos;s contact details;</li>
            <li>
              where you add another person&apos;s information (such as a backup contact, vet or insurer),
              you have their permission to share it;
            </li>
            <li>
              where you upload a document issued by someone else, such as a vaccination certificate from a
              veterinary practice, you have the right to store and use it;
            </li>
            <li>Your Content is lawful and doesn&apos;t infringe anyone else&apos;s rights.</li>
          </ul>

          <h2>5. Shareable links</h2>
          <p>
            The Service lets you generate links that display your pet&apos;s profile. Anyone with a link can
            view the non-PIN-protected parts of that profile — treat a link like you&apos;d treat a key.
            Emergency contact details are protected behind a PIN you set. You can revoke a link at any time,
            which stops it working; on a paid plan you can run several links at once — one per sitter — and
            revoke any of them on its own. We can&apos;t control what recipients do with information after
            they&apos;ve seen it.
          </p>

          <h2>6. Acceptable use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>use the Service for anything unlawful, harmful, or that infringes others&apos; rights;</li>
            <li>upload someone else&apos;s personal data without a lawful basis or their consent;</li>
            <li>attempt to access accounts, data or links that aren&apos;t yours;</li>
            <li>probe, scan, disrupt or reverse-engineer the Service, or bypass its security or PIN gating;</li>
            <li>use the Service to build a competing product or scrape its data.</li>
          </ul>

          <h2>7. Purchases</h2>
          <p>
            {site.name} is free to start. Some features are unlocked by a one-time in-app purchase (the
            &quot;Pro&quot; unlock). Purchases are processed by the Apple App Store or Google Play under
            their terms, and are charged to your store account. The Pro unlock is a one-time purchase, not
            a subscription. Refunds are handled by the relevant app store according to their policies.
          </p>

          <h2>8. Availability &amp; changes</h2>
          <p>
            We work to keep the Service running, but we don&apos;t guarantee it will always be available,
            uninterrupted or error-free. We may add, change or remove features over time. We&apos;ll try to
            give reasonable notice of significant changes where we can.
          </p>

          <h2>9. Disclaimers</h2>
          <p>
            The Service is provided &quot;as is&quot; and &quot;as available&quot;, without warranties of
            any kind, whether express or implied, to the fullest extent permitted by law. We don&apos;t
            warrant that the information shared through the Service is accurate, complete or current —
            that&apos;s up to you to keep updated.
          </p>

          <h2>10. Limitation of liability</h2>
          <p>
            To the fullest extent permitted by law, {site.legalEntity} will not be liable for any indirect,
            incidental, special or consequential damages, or for any loss of data, arising from your use
            of the Service. Nothing in these Terms limits liability that can&apos;t be limited under
            applicable law.
          </p>

          <h2>11. Termination</h2>
          <p>
            You can stop using the Service and delete your account at any time. We may suspend or
            terminate access if you breach these Terms or use the Service in a way that could cause harm or
            legal risk.
          </p>
          <p>
            Deleting your account or a pet&apos;s profile immediately stops any share links for that pet
            from working. If someone is currently caring for your pet, make sure they have what they need
            before you delete.
          </p>

          <h2>12. Changes to these Terms</h2>
          <p>
            We may update these Terms from time to time. If we make material changes, we&apos;ll update the
            date above and, where appropriate, let you know in the app. Continuing to use the Service after
            changes take effect means you accept the updated Terms.
          </p>

          <h2>13. Governing law</h2>
          <p>
            These Terms are governed by the laws of New South Wales, Australia. You and we submit to the
            non-exclusive jurisdiction of the courts of that state. If you are a consumer in another
            country, this does not remove any protection you have under the mandatory laws of the place you
            live.
          </p>

          <h2>14. General</h2>
          <ul>
            <li>
              <strong>Severability.</strong> If any part of these Terms is found unenforceable, the rest
              stays in effect.
            </li>
            <li>
              <strong>Assignment.</strong> You may not transfer your rights under these Terms. We may
              transfer ours to a successor — for example if the business is sold or restructured — without
              reducing your rights.
            </li>
            <li>
              <strong>Entire agreement.</strong> These Terms, together with the Privacy Policy, are the
              whole agreement between you and us about the Service.
            </li>
            <li>
              <strong>Force majeure.</strong> We aren&apos;t responsible for delays or failures caused by
              events beyond our reasonable control.
            </li>
            <li>
              <strong>Notices.</strong> We give notice through the app or by email to the address on your
              account. You give us notice at {site.contactEmail}.
            </li>
          </ul>

          <h2>15. Contact</h2>
          <p>
            Questions about these Terms? Email us at{" "}
            <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
