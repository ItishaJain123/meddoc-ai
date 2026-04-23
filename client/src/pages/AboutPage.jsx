import styles from './AboutPage.module.css';

function IconDoc() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  );
}

function IconBrain() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.14z"/>
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.14z"/>
    </svg>
  );
}

function IconChart() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6"  y1="20" x2="6"  y2="14"/>
      <line x1="2"  y1="20" x2="22" y2="20"/>
    </svg>
  );
}

function IconLock() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}

function IconChat() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

function IconTarget() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="12" r="2"/>
    </svg>
  );
}

const FEATURES = [
  {
    Icon: IconDoc,
    title: 'Document Analysis',
    desc: 'Upload blood tests, X-rays, MRI scans, prescriptions, and sonography reports. The AI extracts all key findings automatically.',
    color: 'blue',
  },
  {
    Icon: IconChart,
    title: 'Health Dashboard',
    desc: 'Six interactive charts show your health score, metric trends, flagged values, body health map, and upload activity over time.',
    color: 'cyan',
  },
  {
    Icon: IconChat,
    title: 'Smart Chat',
    desc: 'Ask questions about your reports in plain English. The AI answers using RAG — grounded in your actual uploaded documents.',
    color: 'purple',
  },
  {
    Icon: IconTarget,
    title: 'Health Goals',
    desc: 'Set targets for any tracked metric (e.g. keep Haemoglobin above 13 g/dL) and watch a progress bar update as new reports come in.',
    color: 'green',
  },
  {
    Icon: IconBrain,
    title: 'Medication Tracker',
    desc: 'Medications are automatically extracted from prescription documents and displayed in a clean, scannable list.',
    color: 'orange',
  },
  {
    Icon: IconLock,
    title: 'Secure by Design',
    desc: 'Clerk authentication, JWT-protected API, Helmet security headers, rate limiting, and encrypted storage keep your data private.',
    color: 'red',
  },
];

const STEPS = [
  { n: '1', title: 'Upload a report', desc: 'Drag and drop any medical document — PDF, image, or text.' },
  { n: '2', title: 'AI processes it', desc: 'LangChain + Gemini extracts metrics, findings, and medications in seconds.' },
  { n: '3', title: 'Explore your data', desc: 'View charts, ask the AI questions, track goals, and monitor medications.' },
];


export default function AboutPage() {
  return (
    <div className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroLabel}>What is MedDoc AI?</div>
        <h1 className={styles.heroTitle}>
          Your personal<br />
          <span className={styles.heroGradient}>medical document assistant</span>
        </h1>
        <p className={styles.heroDesc}>
          MedDoc AI turns your medical reports into clear, actionable insights.
          Upload any report and instantly understand what your values mean,
          how they compare to safe ranges, and how they change over time —
          all without needing a medical background.
        </p>
      </section>

      {/* Features */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>What it does</h2>
        <div className={styles.featGrid}>
          {FEATURES.map(({ Icon, title, desc, color }) => (
            <div key={title} className={`${styles.featCard} ${styles['feat_' + color]}`}>
              <div className={styles.featIcon}>
                <Icon />
              </div>
              <h3 className={styles.featTitle}>{title}</h3>
              <p className={styles.featDesc}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>How it works</h2>
        <div className={styles.steps}>
          {STEPS.map(({ n, title, desc }) => (
            <div key={n} className={styles.step}>
              <div className={styles.stepNum}>{n}</div>
              <div>
                <div className={styles.stepTitle}>{title}</div>
                <div className={styles.stepDesc}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Disclaimer */}
      <section className={styles.disclaimer}>
        <strong>Disclaimer:</strong> MedDoc AI is a personal project for educational and informational purposes only.
        It does not provide medical advice, diagnosis, or treatment. Always consult a qualified healthcare
        professional for any medical concerns.
      </section>
    </div>
  );
}
