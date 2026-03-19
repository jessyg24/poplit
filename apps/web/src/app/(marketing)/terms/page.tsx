export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 space-y-8">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">
        Terms of Service
      </h1>
      <p className="text-sm text-slate-400">
        Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
      </p>

      <section className="space-y-4 text-sm text-slate-600 leading-relaxed">
        <h2 className="text-lg font-bold text-slate-800">1. Acceptance of Terms</h2>
        <p>
          By creating an account or using PopLit, you agree to these Terms of Service.
          If you do not agree, do not use the service.
        </p>

        <h2 className="text-lg font-bold text-slate-800">2. Eligibility</h2>
        <p>
          You must be at least 18 years old to use PopLit. By using the service, you
          represent that you meet this requirement.
        </p>

        <h2 className="text-lg font-bold text-slate-800">3. User Accounts</h2>
        <p>
          You are responsible for maintaining the security of your account credentials.
          Each person may only maintain one account. Pen names must be unique and cannot
          impersonate other individuals.
        </p>

        <h2 className="text-lg font-bold text-slate-800">4. Content &amp; Submissions</h2>
        <p>
          You retain all rights to the stories you submit. By submitting a story, you grant
          PopLit a non-exclusive license to display it on the platform during the active
          Popcycle and in the archive. Stories must be original work — plagiarism will result
          in account suspension.
        </p>

        <h2 className="text-lg font-bold text-slate-800">5. Payments &amp; Refunds</h2>
        <p>
          Entry fees are non-refundable once a story has been submitted and payment is
          processed. Subscription credits roll over month-to-month for monthly plans.
          Prize payouts are distributed via Stripe Connect after each Popoff concludes.
        </p>

        <h2 className="text-lg font-bold text-slate-800">6. Prize Distribution</h2>
        <p>
          Prizes are distributed as follows: 65% to 1st place, 12% to 2nd place, 5% to
          3rd place, and 15% retained by PopLit. 4th through 10th place finishers receive
          one free entry credit each.
        </p>

        <h2 className="text-lg font-bold text-slate-800">7. Prohibited Conduct</h2>
        <p>
          Users may not submit AI-generated content without disclosure, manipulate voting,
          harass other users, or submit content that violates applicable laws. Violations
          may result in strikes, suspension, or permanent bans.
        </p>

        <h2 className="text-lg font-bold text-slate-800">8. Termination</h2>
        <p>
          PopLit reserves the right to suspend or terminate accounts that violate these
          terms. You may delete your account at any time from the Settings page.
        </p>

        <h2 className="text-lg font-bold text-slate-800">9. Limitation of Liability</h2>
        <p>
          PopLit is provided &quot;as is&quot; without warranty. We are not liable for any
          indirect, incidental, or consequential damages arising from your use of the service.
        </p>

        <h2 className="text-lg font-bold text-slate-800">10. Contact</h2>
        <p>
          For questions about these terms, contact us at{" "}
          <a href="mailto:support@poplit.io" className="text-orange-500 hover:underline">
            support@poplit.io
          </a>.
        </p>
      </section>
    </div>
  );
}
