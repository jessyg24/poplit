export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 space-y-8">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">
        Privacy Policy
      </h1>
      <p className="text-sm text-slate-400">
        Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
      </p>

      <section className="space-y-4 text-sm text-slate-600 leading-relaxed">
        <h2 className="text-lg font-bold text-slate-800">1. Information We Collect</h2>
        <p>
          When you create an account, we collect your email address, pen name, and optionally
          your real name (used for payment verification). We also collect payment information
          through Stripe, our third-party payment processor — we do not store your card details.
        </p>

        <h2 className="text-lg font-bold text-slate-800">2. How We Use Your Information</h2>
        <p>
          We use your information to provide the PopLit service, process payments, display
          your stories and profile to other users, and communicate service updates. We do not
          sell your data to third parties.
        </p>

        <h2 className="text-lg font-bold text-slate-800">3. Data Storage &amp; Security</h2>
        <p>
          Your data is stored securely using Supabase (hosted on AWS). We use industry-standard
          encryption for data in transit and at rest. Authentication is handled via secure,
          httpOnly cookies.
        </p>

        <h2 className="text-lg font-bold text-slate-800">4. Your Rights (GDPR)</h2>
        <p>
          You have the right to access, export, and delete your personal data at any time.
          You can export all of your data from the Settings page. Account deletion anonymizes
          your data while preserving story content attributed to &quot;Deleted User.&quot;
        </p>

        <h2 className="text-lg font-bold text-slate-800">5. Cookies</h2>
        <p>
          We use essential cookies for authentication and session management. We do not use
          advertising or tracking cookies.
        </p>

        <h2 className="text-lg font-bold text-slate-800">6. Third-Party Services</h2>
        <p>
          We use the following third-party services: Stripe (payments), Supabase (database
          and authentication), Vercel (hosting), and Google (OAuth sign-in).
        </p>

        <h2 className="text-lg font-bold text-slate-800">7. Contact</h2>
        <p>
          For privacy-related inquiries, contact us at{" "}
          <a href="mailto:privacy@poplit.io" className="text-orange-500 hover:underline">
            privacy@poplit.io
          </a>.
        </p>
      </section>
    </div>
  );
}
