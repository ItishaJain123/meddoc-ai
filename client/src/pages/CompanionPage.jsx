import { Link } from 'react-router-dom';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import {
  Droplets, Utensils, Pill, Footprints, MonitorSmartphone,
  MousePointerClick, Moon, ShieldCheck, Download, ArrowRight, Apple, Monitor,
  ExternalLink,
} from 'lucide-react';
import styles from './CompanionPage.module.css';

// TODO: replace with the real GitHub Release download URL once the installer is published.
const DOWNLOAD_URL = '#download-placeholder';
// Custom protocol the installed desktop app registers — clicking it launches the app.
const APP_PROTOCOL = 'meddoc-companion://open';

// Try to open the installed app; if nothing handles the protocol, fall back to download.
function openApp(e) {
  e.preventDefault();
  const start = Date.now();
  // if the app opens, the browser loses focus; if not, we bounce to the download section
  const fallback = setTimeout(() => {
    if (Date.now() - start < 2000 && !document.hidden) {
      document.getElementById('download-band')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, 1200);
  window.addEventListener('blur', () => clearTimeout(fallback), { once: true });
  window.location.href = APP_PROTOCOL;
}

function Logo() {
  return (
    <div className={styles.logo}>
      <svg width="30" height="30" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="34" height="34" rx="10" fill="url(#compGrad)" />
        <path d="M7 18.5h4.5l2.5-6 4 11 3-9 2 4H27" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <defs>
          <linearGradient id="compGrad" x1="0" y1="0" x2="34" y2="34" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>
      </svg>
      <span className={styles.logoText}>MedDoc <em>Companion</em></span>
    </div>
  );
}

const REACTIONS = [
  { emoji: '🫧', prop: '🥤', label: 'Time for water', anim: styles.drink, tone: 'It leans back and takes a sip' },
  { emoji: '🫧', prop: '🍲', label: 'Lunch break', anim: styles.eat, tone: 'It bobs down and digs in' },
  { emoji: '🫧', prop: '🏋️', label: 'Move your body', anim: styles.jump, tone: 'It does jumping jacks with you' },
  { emoji: '🫧', prop: '💊', label: 'Medicine time', anim: styles.pill, tone: 'It pops the pill on schedule' },
];

const FEATURES = [
  { icon: Droplets, title: 'Water, every interval', text: 'A gentle nudge every 30–60 minutes (you choose) so you actually stay hydrated through the workday.' },
  { icon: Utensils, title: 'Never skip lunch', text: 'A reminder at your lunch time to step away from the screen and eat something proper.' },
  { icon: Pill, title: 'Medicines on time', text: 'Add your medicines and exact times — the companion pops up right when a dose is due.' },
  { icon: Footprints, title: 'Break up long sitting', text: 'It watches your real keyboard & mouse activity and, after an hour of non-stop sitting, tells you to walk 5 minutes or jump 10 times.' },
  { icon: MousePointerClick, title: 'Never in your way', text: 'The buddy walks in over your work, says its bit, and walks off. Clicks pass right through it.' },
  { icon: Moon, title: 'Quiet after hours', text: 'Set your work hours — no nagging in the evening or on your break, except medicines you asked for.' },
];

const STEPS = [
  { icon: Download, title: 'Download & install', text: 'Grab the installer and run it — it lives quietly in your system tray.' },
  { icon: ShieldCheck, title: 'Sign in with MedDoc', text: 'Use the same account as this site. No MedDoc account, no access.' },
  { icon: MonitorSmartphone, title: 'Pick your buddy & go', text: 'Choose your companion, answer a few setup questions, and it takes over from there.' },
];

function CompanionPage() {
  return (
    <div className={styles.page}>
      {/* Nav */}
      <header className={styles.nav}>
        <Link to="/" className={styles.logoLink}><Logo /></Link>
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

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <p className={styles.kicker}>Meet your desk wellness buddy</p>
          <h1 className={styles.heroTitle}>
            A tiny companion that <span className={styles.heroAccent}>walks onto your screen</span> until you take care of yourself
          </h1>
          <p className={styles.heroSub}>
            Every water-reminder app has failed you — so this one doesn't just ping. A little
            character strolls onto your desktop, acts out what you need to do, and only leaves
            once you've done it. Water, lunch, medicines, and getting up to move.
          </p>
          <div className={styles.heroCtas}>
            <a href={APP_PROTOCOL} onClick={openApp} className={styles.ctaPrimary}>
              <ExternalLink size={18} /> Open the app
            </a>
            <a href={DOWNLOAD_URL} className={styles.ctaGhost}>
              <Download size={17} /> Download for Windows
            </a>
          </div>
          <span className={styles.heroNote}>Already installed? “Open the app” launches it. New here? Download first · Requires a MedDoc account</span>
          <div className={styles.platforms}>
            <span><Monitor size={14} /> Windows</span>
            <span className={styles.soon}><Apple size={14} /> macOS — soon</span>
          </div>
        </div>

        {/* Live animated demo */}
        <div className={styles.heroDemo}>
          <div className={styles.demoWindow}>
            <div className={styles.demoBar}><span></span><span></span><span></span></div>
            <div className={styles.demoStage}>
              <div className={styles.demoBubble}>💧 Time for water — take a sip!</div>
              <div className={styles.demoScene}>
                <div className={`${styles.demoProp} ${styles.drinkProp}`}>🥤</div>
                <div className={`${styles.demoChar} ${styles.drink}`}>🫧</div>
                <div className={styles.demoShadow}></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reactions showcase */}
      <section className={styles.reactions}>
        <h2 className={styles.sectionTitle}>It acts out every reminder</h2>
        <p className={styles.sectionSub}>Not just a notification — your buddy mimes exactly what you should do.</p>
        <div className={styles.reactionGrid}>
          {REACTIONS.map((r) => (
            <div key={r.label} className={styles.reactionCard}>
              <div className={styles.reactionStage}>
                <div className={`${styles.reactionProp}`}>{r.prop}</div>
                <div className={`${styles.reactionChar} ${r.anim}`}>{r.emoji}</div>
                <div className={styles.reactionShadow}></div>
              </div>
              <h3 className={styles.reactionLabel}>{r.label}</h3>
              <p className={styles.reactionTone}>{r.tone}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className={styles.features}>
        <h2 className={styles.sectionTitle}>Built for people glued to a laptop</h2>
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

      {/* Steps */}
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

      {/* Download band */}
      <section className={styles.downloadBand} id="download-band">
        <h2>Ready to be looked after?</h2>
        <p>Install the companion and let your buddy keep you healthy while you work.</p>
        <div className={styles.bandCtas}>
          <a href={DOWNLOAD_URL} className={styles.ctaPrimaryLarge}>
            <Download size={20} /> Download for Windows
          </a>
          <a href={APP_PROTOCOL} onClick={openApp} className={styles.ctaGhostLarge}>
            <ExternalLink size={18} /> Open the app
          </a>
        </div>
        <p className={styles.bandNote}>You'll sign in with your MedDoc account inside the app.</p>
      </section>

      <footer className={styles.footer}>
        <p><strong>Note:</strong> The companion runs on your computer and reminds you locally. It is not a medical device and does not replace professional medical advice.</p>
        <p className={styles.footerMuted}>© {new Date().getFullYear()} MedDoc AI</p>
      </footer>
    </div>
  );
}

export default CompanionPage;
