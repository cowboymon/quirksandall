import type { Metadata } from "next";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { site } from "../site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `The terms that govern your use of ${site.name}.`,
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
            operated by {site.operator}. By downloading, accessing or using the Service, you agree to
            these Terms. If you don&apos;t agree, please don&apos;t use the Service.
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

          <h2>4. Your content</h2>
          <p>
            You keep ownership of the information, text, photos and other content you add (&quot;Your
            Content&quot;). You grant us a limited licence to host, store, process and display Your Content
            solely to operate the Service for you — for example, rendering the cheat-sheet page when
            someone opens a link you&apos;ve shared.
          </p>
          <p>You are responsible for Your Content. You agree that:</p>
          <ul>
            <li>you have the right to share everything you add, including any third party&apos;s contact details;</li>
            <li>
              where you add another person&apos;s information (such as a backup contact, vet or insurer),
              you have their permission to share it;
            </li>
            <li>Your Content is lawful and doesn&apos;t infringe anyone else&apos;s rights.</li>
          </ul>

          <h2>5. Shareable links</h2>
          <p>
            The Service lets you generate links that display your pet&apos;s profile. Anyone with a link can
            view the non-PIN-protected parts of that profile — treat a link like you&apos;d treat a key.
            Emergency contact details are protected behind a PIN you set. If you have a paid plan, you can
            rotate a link, which invalidates the previous one. We can&apos;t control what recipients do with
            information after they&apos;ve seen it.
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
            To the fullest extent permitted by law, {site.operator} will not be liable for any indirect,
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

          <h2>12. Changes to these Terms</h2>
          <p>
            We may update these Terms from time to time. If we make material changes, we&apos;ll update the
            date above and, where appropriate, let you know in the app. Continuing to use the Service after
            changes take effect means you accept the updated Terms.
          </p>

          <h2>13. Contact</h2>
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
