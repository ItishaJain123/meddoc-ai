import { useState } from 'react';
import styles from './OnboardingModal.module.css';

const STEPS = [
  {
    icon: (
      <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="80" height="80" rx="20" fill="#EFF6FF" />
        <rect x="18" y="22" width="34" height="42" rx="4" fill="#BFDBFE" stroke="#2563EB" strokeWidth="2" />
        <path d="M26 36h18M26 44h12" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
        <circle cx="55" cy="28" r="12" fill="#2563EB" />
        <path d="M55 23v10M50 28h10" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
    title: 'Upload Your Medical Reports',
    description:
      'Upload PDFs or images of your blood tests, prescriptions, X-rays, MRI scans, and any other medical documents. MedDoc AI securely encrypts every file.',
    action: 'Next',
  },
  {
    icon: (
      <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="80" height="80" rx="20" fill="#F0FDF4" />
        <rect x="14" y="38" width="30" height="20" rx="6" fill="#BBF7D0" stroke="#059669" strokeWidth="2" />
        <path d="M20 48h18M20 54h10" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
        <rect x="36" y="22" width="30" height="20" rx="6" fill="#DCFCE7" stroke="#059669" strokeWidth="2" />
        <path d="M42 32h18M42 38h12" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    title: 'Ask Anything About Your Health',
    description:
      'Chat with MedDoc AI in plain language — or even in Hindi, Bengali, and other languages. Ask what your haemoglobin means, compare reports, or understand any finding.',
    action: 'Next',
  },
  {
    icon: (
      <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="80" height="80" rx="20" fill="#FEF9C3" />
        <rect x="14" y="18" width="52" height="44" rx="6" fill="#FEF08A" stroke="#CA8A04" strokeWidth="2" />
        <path d="M24 46l10-10 8 8 14-16" stroke="#CA8A04" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="24" cy="46" r="3" fill="#CA8A04" />
        <circle cx="34" cy="36" r="3" fill="#CA8A04" />
        <circle cx="42" cy="44" r="3" fill="#CA8A04" />
        <circle cx="56" cy="28" r="3" fill="#CA8A04" />
      </svg>
    ),
    title: 'Track Your Health Over Time',
    description:
      'See your health score, monitor trends in your blood values, and get alerts for anything that needs attention — all in one dashboard.',
    action: "Let's go",
  },
];

const STORAGE_KEY = 'meddoc_onboarding_v1';

export function useOnboarding() {
  const [show, setShow] = useState(() => !localStorage.getItem(STORAGE_KEY));

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1');
    setShow(false);
  }

  return { show, dismiss };
}

function OnboardingModal({ onDismiss }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  function handleAction() {
    if (isLast) {
      onDismiss();
    } else {
      setStep((s) => s + 1);
    }
  }

  return (
    <div className={styles.overlay} onClick={onDismiss}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.skip} onClick={onDismiss} aria-label="Skip onboarding">
          Skip
        </button>

        <div className={styles.iconWrap}>{current.icon}</div>

        <div className={styles.dots}>
          {STEPS.map((_, i) => (
            <button
              key={i}
              className={`${styles.dot} ${i === step ? styles.dotActive : ''}`}
              onClick={() => setStep(i)}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>

        <h2 className={styles.title}>{current.title}</h2>
        <p className={styles.description}>{current.description}</p>

        <div className={styles.actions}>
          {step > 0 && (
            <button className={styles.backBtn} onClick={() => setStep((s) => s - 1)}>
              Back
            </button>
          )}
          <button className={styles.actionBtn} onClick={handleAction}>
            {current.action}
          </button>
        </div>

        <p className={styles.stepCount}>{step + 1} of {STEPS.length}</p>
      </div>
    </div>
  );
}

export default OnboardingModal;
