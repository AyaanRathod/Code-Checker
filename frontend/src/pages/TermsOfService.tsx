import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ScrollText } from 'lucide-react';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section style={{ marginBottom: '2.25rem' }}>
    <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.65rem', paddingBottom: '0.4rem', borderBottom: '1px solid var(--border-subtle)' }}>
      {title}
    </h2>
    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.75 }}>
      {children}
    </div>
  </section>
);

const TermsOfService: React.FC = () => {
  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>

      <Link
        to="/"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-tertiary)', fontSize: '0.85rem', textDecoration: 'none', marginBottom: '2rem' }}
      >
        <ArrowLeft size={14} /> Back
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.5rem' }}>
        <ScrollText size={28} style={{ color: 'var(--brand-red)', flexShrink: 0 }} />
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Terms of Service</h1>
      </div>
      <p style={{ color: 'var(--text-tertiary)', fontSize: '0.82rem', marginBottom: '2.5rem' }}>
        Last updated: April 2026 &nbsp;·&nbsp; CodeSimilar — Academic Integrity Platform
      </p>

      <div className="glass-card" style={{ padding: '2rem 2.25rem' }}>

        <Section title="1. About This Platform">
          <p>
            CodeSimilar is an academic integrity platform developed as a final-year academic project. It provides
            instructors with tools to detect code similarity across student submissions using static code
            fingerprinting techniques.
          </p>
          <p style={{ marginTop: '0.75rem' }}>
            By accessing or using CodeSimilar, you agree to these Terms of Service. If you do not agree, you
            must not use the platform.
          </p>
        </Section>

        <Section title="2. Permitted Use">
          <p>CodeSimilar is intended exclusively for:</p>
          <ul style={{ paddingLeft: '1.25rem', marginTop: '0.35rem' }}>
            <li>Academic instructors conducting legitimate similarity checks on student-submitted coursework</li>
            <li>Students submitting their own original work to assignments they are enrolled in</li>
            <li>Educational research and demonstration purposes in an academic setting</li>
          </ul>
          <p style={{ marginTop: '0.75rem' }}>
            Use of the platform for any commercial purpose, competitive intelligence, or outside of an
            educational context is strictly prohibited.
          </p>
        </Section>

        <Section title="3. Instructor Responsibilities">
          <p>By using CodeSimilar as an instructor, you confirm that:</p>
          <ul style={{ paddingLeft: '1.25rem', marginTop: '0.35rem' }}>
            <li>You have the proper institutional authority to collect and process student submissions through this platform</li>
            <li>Your use complies with your institution's academic integrity policies and applicable privacy regulations</li>
            <li>You will not use similarity scores as the sole basis for academic misconduct decisions, these scores are a tool to aid investigation, not a verdict</li>
            <li>You are responsible for how you communicate and act upon similarity results with students</li>
            <li>You will keep your account credentials secure and not share access with unauthorised parties</li>
          </ul>
        </Section>

        <Section title="4. Student Responsibilities">
          <p>By submitting work through CodeSimilar, you confirm that:</p>
          <ul style={{ paddingLeft: '1.25rem', marginTop: '0.35rem' }}>
            <li>You are submitting work to an assignment you are legitimately enrolled in</li>
            <li>You understand that your submission will be analysed for code similarity as part of your institution's academic integrity process</li>
            <li>You will not attempt to circumvent the platform's analysis through deliberate obfuscation intended to deceive the system</li>
          </ul>
        </Section>

        <Section title="5. Similarity Scores Are Not Verdicts">
          <p>
            CodeSimilar computes similarity scores using static code fingerprinting. These scores are
            <strong> indicators only</strong>. A high similarity score does not constitute proof of academic
            misconduct. Many factors including shared starter code, common algorithmic patterns, boilerplate, and
            coincidental similarity can produce elevated scores without any wrongdoing.
          </p>
          <p style={{ marginTop: '0.75rem' }}>
            <strong>All academic integrity decisions must be made by a qualified human instructor</strong> in
            accordance with institutional policy. CodeSimilar accepts no responsibility for disciplinary outcomes
            arising from the use of its reports.
          </p>
        </Section>

        <Section title="6. Prohibited Conduct">
          <p>The following are expressly prohibited:</p>
          <ul style={{ paddingLeft: '1.25rem', marginTop: '0.35rem' }}>
            <li>Attempting to access another instructor's assignments, submissions, or results</li>
            <li>Reverse-engineering, scraping, or automated bulk-accessing of the platform</li>
            <li>Uploading malicious code, excessively large files, or content intended to disrupt the service</li>
            <li>Impersonating another user or institution</li>
            <li>Using the platform for any purpose unrelated to academic course administration</li>
          </ul>
        </Section>

        <Section title="7. No Warranty">
          <p>
            CodeSimilar is provided <strong>"as is"</strong> without warranty of any kind. As an academic
            prototype, the platform may experience downtime, data loss, or inaccuracies in analysis results.
            We make no guarantees regarding uptime, detection accuracy, or fitness for any particular purpose.
          </p>
          <p style={{ marginTop: '0.75rem' }}>
            Users are encouraged to maintain their own copies of submitted work and not rely solely on the
            platform for record-keeping.
          </p>
        </Section>

        <Section title="8. Limitation of Liability">
          <p>
            The CodeSimilar development team, its academic supervisors, and associated institution shall not be
            liable for any direct, indirect, or consequential damages arising from the use or inability to use
            this platform — including but not limited to data loss, incorrect similarity reports, or academic
            decisions made on the basis of platform output.
          </p>
        </Section>

        <Section title="9. Changes to These Terms">
          <p>
            We may update these Terms of Service as the platform evolves. Continued use after changes are
            posted constitutes acceptance of the revised terms. The date at the top of this page reflects the
            most recent revision.
          </p>
        </Section>

        <Section title="10. Contact">
          <p>
            For questions about these terms, contact the development team at{' '}
            <a href="mailto:faculty@brocku.ca" style={{ color: 'var(--brand-red)' }}>faculty@brocku.ca</a>.
          </p>
        </Section>

      </div>
    </div>
  );
};

export default TermsOfService;
