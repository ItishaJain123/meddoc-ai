import { Link } from 'react-router-dom';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import {
  FileText, MessageSquare, TrendingUp, ShieldCheck, GitCompareArrows,
  Pill, Upload, Sparkles, LineChart, Lock, KeyRound, Timer, ArrowRight,
} from 'lucide-react';
import styles from './LandingPage.module.css';

function Logo() {
  return (
    <div className={styles.logo}>
      <svg width="30" height="30" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="34" height="34" rx="10" fill="url(#landGrad)" />
        <path d="M7 18.5h4.5l2.5-6 4 11 3-9 2 4H27" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <defs>
          <linearGradient id="landGrad" x1="0" y1="0" x2="34" y2="34" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>
      </svg>
      <span className={styles.logoText}>MedDoc <em>AI</em></span>
    </div>
  );
}

const FEATURES = [
  {
    icon: FileText,
    title: 'Document analysis',
    text: 'Upload lab reports, prescriptions or X-ray reports. Values, reference ranges and findings are extracted automatically.',
  },
  {
    icon: MessageSquare,
    title: 'Chat with your reports',
    text: 'Ask questions in plain language — answers stream in real time and every number is cited back to the exact report it came from.',
  },
  {
    icon: TrendingUp,
    title: 'Trends over time',
    text: 'Every metric is tracked across reports, so you can see whether your haemoglobin, sugar or cholesterol is moving the right way.',
  },
  {
    icon: GitCompareArrows,
    title: 'Report comparison',
    text: 'Put two reports side by side and get an AI-written summary of what improved, what worsened and what to ask your doctor.',
  },
  {
    icon: Pill,
    title: 'Medication tracking',
    text: 'Prescriptions are parsed into a clean medication list with dose schedules and optional reminders.',
  },
  {
    icon: ShieldCheck,
    title: 'Privacy first',
    text: 'Files are AES-256 encrypted at rest, access is authenticated per request, and you can share results only via expiring links.',
  },
];

const STEPS = [
  { icon: Upload,       title: 'Upload a report',    text: 'PDF or photo — or start with the built-in sample data.' },
  { icon: Sparkles,     title: 'AI does the reading', text: 'Values, ranges, findings and medications are extracted in seconds.' },
  { icon: LineChart,    title: 'Understand & track',  text: 'Dashboards, trends, chat and summaries — all in plain language.' },
];

function LandingPage() {
  return (
    <div className={styles.page}>
      {/* ── Nav ── */}
      <header className={styles.nav}>
        <Logo />
        <div className={styles.navActions}>
          <SignedOut>
            <Link to="/sign-in" className={styles.navGhost}>Sign in</Link>
            <Link to="/sign-up" className={styles.navPrimary}>Get started</Link>
          </SignedOut>
          <SignedIn>
            <Link to="/dashboard" className={styles.navPrimary}>Open dashboard <ArrowRight size={14} /></Link>
          </SignedIn>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <p className={styles.kicker}>Your personal medical document assistant</p>
        <h1 className={styles.heroTitle}>
          Understand your medical reports<br />
          <span className={styles.heroAccent}>without a medical degree</span>
        </h1>
        <p className={styles.heroSub}>
          MedDoc AI reads your lab reports, prescriptions and scans, then explains what your
          values mean, tracks them over time, and answers your questions — with every answer
          cited back to your own documents.
        </p>
        <div className={styles.heroCtas}>
          <Link to="/sign-up" className={styles.ctaPrimary}>Create free account</Link>
          <Link to="/sign-in" className={styles.ctaGhost}>Sign in</Link>
        </div>
        <p className={styles.heroNote}>Includes sample data — explore every feature without uploading anything.</p>
      </section>

      {/* ── How it works ── */}
      <section className={styles.steps}>
        {STEPS.map(({ icon: Icon, title, text }, i) => (
          <div key={title} className={styles.step}>
            <span className={styles.stepNum}>{i + 1}</span>
            <span className={styles.stepIcon}><Icon size={18} /></span>
            <h3 className={styles.stepTitle}>{title}</h3>
            <p className={styles.stepText}>{text}</p>
          </div>
        ))}
      </section>

      {/* ── Features ── */}
      <section className={styles.features}>
        <h2 className={styles.sectionTitle}>Everything your health data should do</h2>
        <div className={styles.featureGrid}>
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className={styles.featureCard}>
              <span className={styles.featureIcon}><Icon size={18} /></span>
              <h3 className={styles.featureTitle}>{title}</h3>
              <p className={styles.featureText}>{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Security strip ── */}
      <section className={styles.security}>
        <div className={styles.securityItem}><Lock size={15} /> AES-256 encryption at rest</div>
        <div className={styles.securityItem}><KeyRound size={15} /> Clerk-authenticated API</div>
        <div className={styles.securityItem}><Timer size={15} /> Expiring share links</div>
      </section>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <p>
          <strong>Medical disclaimer:</strong> MedDoc AI provides informational assistance only and
          does not replace professional medical advice, diagnosis, or treatment.
        </p>
        <p className={styles.footerMuted}>© {new Date().getFullYear()} MedDoc AI</p>
      </footer>
    </div>
  );
}

export default LandingPage;
