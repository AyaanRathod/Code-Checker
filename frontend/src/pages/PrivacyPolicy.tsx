import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

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

const PrivacyPolicy: React.FC = () => {
  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>

      <Link
        to="/"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-tertiary)', fontSize: '0.85rem', textDecoration: 'none', marginBottom: '2rem' }}
      >
        <ArrowLeft size={14} /> Back
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.5rem' }}>
        <ShieldCheck size={28} style={{ color: 'var(--brand-red)', flexShrink: 0 }} />
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Privacy Policy</h1>
      </div>
      <p style={{ color: 'var(--text-tertiary)', fontSize: '0.82rem', marginBottom: '2.5rem' }}>
        Last updated: April 2026 &nbsp;·&nbsp; CodeSimilar : Academic Integrity Platform
      </p>

      <div className="glass-card" style={{ padding: '2rem 2.25rem' }}>

        <Section title="1. Overview">
          <p>
            CodeSimilar is an academic integrity tool developed as a final-year capstone project. It is designed
            exclusively for use by instructors and students in an educational setting. This Privacy Policy describes
            what data the platform collects, how it is stored, and who can access it.
          </p>
          <p style={{ marginTop: '0.75rem' }}>
            By using CodeSimilar, you acknowledge that this is a prototype academic platform and not a
            commercially operated service. We handle all data with care and limit collection to only what is
            necessary for the platform to function.
          </p>
        </Section>

        <Section title="2. Data We Collect">
          <p><strong>Instructor accounts:</strong></p>
          <ul style={{ paddingLeft: '1.25rem', marginTop: '0.35rem' }}>
            <li>Name, email address, and institutional title provided at registration</li>
            <li>Google account information if signing in via Google OAuth (name and email only)</li>
            <li>Account credentials stored as salted, hashed passwords, plaintext passwords are never stored</li>
          </ul>
          <p style={{ marginTop: '0.9rem' }}><strong>Student submissions:</strong></p>
          <ul style={{ paddingLeft: '1.25rem', marginTop: '0.35rem' }}>
            <li>Student ID numbers, collected at the time of submission and <strong>encrypted at rest</strong> using AES-grade symmetric encryption</li>
            <li>Submitted source code files, stored in isolated object storage (MinIO)</li>
            <li>Submission metadata: timestamp, file count, file sizes</li>
          </ul>
          <p style={{ marginTop: '0.9rem' }}><strong>Analysis data:</strong></p>
          <ul style={{ paddingLeft: '1.25rem', marginTop: '0.35rem' }}>
            <li>Pairwise similarity scores computed from submitted code fingerprints</li>
            <li>Matched code regions used to generate similarity reports</li>
          </ul>
        </Section>

        <Section title="3. How Data Is Stored">
          <p>
            All data is stored on infrastructure controlled by the platform operator (self-hosted). We use:
          </p>
          <ul style={{ paddingLeft: '1.25rem', marginTop: '0.35rem' }}>
            <li><strong>PostgreSQL</strong> : for structured data (accounts, submissions, results). Student IDs are stored encrypted; they are decrypted only at the point of display and only to the instructor who owns the assignment.</li>
            <li><strong>MinIO</strong> : for code file storage. Files are scoped to individual assignments and are not publicly accessible.</li>
          </ul>
          <p style={{ marginTop: '0.75rem' }}>
            No data is stored in third-party analytics services, advertising platforms, or external databases.
          </p>
        </Section>

        <Section title="4. Who Can Access Your Data">
          <p>
            Access is strictly scoped:
          </p>
          <ul style={{ paddingLeft: '1.25rem', marginTop: '0.35rem' }}>
            <li>An instructor can only view submissions, results, and student identities belonging to assignments they created.</li>
            <li>Students submit anonymously relative to other students : similarity results visible to instructors display masked IDs by default.</li>
            <li>No cross-instructor data sharing occurs within the platform.</li>
            <li>Platform administrators (the project team) have database-level access for maintenance purposes only.</li>
          </ul>
        </Section>

        <Section title="5. Third-Party Services">
          <p>
            CodeSimilar uses <strong>Google OAuth 2.0</strong> as an optional sign-in method for instructors. If
            you choose to sign in with Google, your name and email address are retrieved from Google and stored
            in our database. We do not receive or store your Google password. Google's own{' '}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" style={{ color: 'var(--brand-red)' }}>
              Privacy Policy
            </a>{' '}
            governs data handled on their end.
          </p>
          <p style={{ marginTop: '0.75rem' }}>
            No other third-party tracking, advertising, or analytics services are used.
          </p>
        </Section>

        <Section title="6. Data Retention">
          <p>
            As this is a prototype academic platform, there is no automated data deletion schedule. Instructors
            can archive assignments and delete repositories from within the platform. If you require your data
            to be removed, please contact the platform administrator directly.
          </p>
        </Section>

        <Section title="7. Institutional Responsibility">
          <p>
            Instructors are responsible for ensuring that their use of CodeSimilar complies with their
            institution's data governance, student privacy policies, and applicable regulations (e.g. FIPPA in
            Ontario, Canada). The platform provides tools; instructors are accountable for how those tools are
            applied to student data.
          </p>
        </Section>

        <Section title="8. Disclaimer">
          <p>
            CodeSimilar is a final-year academic project. It is not operated by a registered company
            and does not carry a formal legal privacy framework. This policy reflects our genuine commitment to
            handling user data responsibly within the scope of an academic prototype.
          </p>
        </Section>

      </div>
    </div>
  );
};

export default PrivacyPolicy;
