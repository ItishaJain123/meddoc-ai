import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, ArrowRight, ExternalLink } from 'lucide-react';
import styles from './CompanionBanner.module.css';

const KEY = 'meddoc.companionBannerDismissed';
const APP_PROTOCOL = 'meddoc-companion://open';

function CompanionBanner() {
  const [hidden, setHidden] = useState(() => localStorage.getItem(KEY) === '1');
  if (hidden) return null;

  const dismiss = (e) => {
    e.preventDefault();
    e.stopPropagation();
    localStorage.setItem(KEY, '1');
    setHidden(true);
  };

  const openApp = (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.location.href = APP_PROTOCOL; // launches the installed desktop app
  };

  return (
    <Link to="/companion" className={styles.banner}>
      <span className={styles.mascot}>🫧</span>
      <div className={styles.text}>
        <strong className={styles.title}>Meet your MedDoc Companion</strong>
        <span className={styles.sub}>
          A desktop buddy that walks onto your screen to remind you to drink water, eat, take
          medicines and move during long sitting.
        </span>
      </div>
      <button className={styles.open} onClick={openApp}><ExternalLink size={14} /> Open app</button>
      <span className={styles.cta}>Learn more <ArrowRight size={15} /></span>
      <button className={styles.close} onClick={dismiss} aria-label="Dismiss"><X size={16} /></button>
    </Link>
  );
}

export default CompanionBanner;
