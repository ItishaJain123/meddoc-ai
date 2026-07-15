import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Bell, BellOff, Plus, X } from 'lucide-react';
import { fetchMedications } from '../services/medicationService';
import styles from './MedicationsPage.module.css';

/* ── Reminder schedules (stored locally in this browser) ─────────────────── */

const REMINDERS_KEY = 'meddoc-med-reminders';

function loadReminders() {
  try {
    return JSON.parse(localStorage.getItem(REMINDERS_KEY)) || {};
  } catch {
    return {};
  }
}

function nextDoseLabel(times) {
  if (!times?.length) return null;
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const sorted = [...times].sort();
  const upcoming = sorted.find((t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m > nowMins;
  });
  return upcoming ? `Next dose today at ${upcoming}` : `Next dose tomorrow at ${sorted[0]}`;
}

function useMedReminders() {
  const [reminders, setReminders] = useState(loadReminders);

  const update = useCallback((medId, patch) => {
    setReminders((prev) => {
      const next = {
        ...prev,
        [medId]: { enabled: false, times: ['09:00'], ...prev[medId], ...patch },
      };
      localStorage.setItem(REMINDERS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // Fire a browser notification when a scheduled time comes up (app must be open)
  useEffect(() => {
    const fired = new Set();
    const interval = setInterval(() => {
      if (Notification?.permission !== 'granted') return;
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      for (const [medId, r] of Object.entries(loadReminders())) {
        const key = `${medId}-${now.toDateString()}-${hhmm}`;
        if (r.enabled && r.times?.includes(hhmm) && !fired.has(key)) {
          fired.add(key);
          new Notification('Medication reminder', {
            body: `Time to take your medication (${hhmm}). Open MedDoc AI → Medications for details.`,
          });
        }
      }
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  return { reminders, update };
}

function ReminderPanel({ medId, reminder, onUpdate }) {
  const r = reminder ?? { enabled: false, times: ['09:00'] };

  async function toggle() {
    if (!r.enabled && Notification && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    onUpdate(medId, { enabled: !r.enabled });
  }

  function setTime(i, value) {
    const times = [...r.times];
    times[i] = value;
    onUpdate(medId, { times });
  }

  return (
    <div className={styles.reminder}>
      <button
        className={`${styles.reminderToggle} ${r.enabled ? styles.reminderOn : ''}`}
        onClick={toggle}
        title={r.enabled ? 'Turn reminders off' : 'Remind me (browser notification while the app is open)'}
      >
        {r.enabled ? <Bell size={13} /> : <BellOff size={13} />}
        {r.enabled ? 'Reminders on' : 'Remind me'}
      </button>

      {r.enabled && (
        <div className={styles.reminderTimes}>
          {r.times.map((t, i) => (
            <span key={i} className={styles.timeChip}>
              <input
                type="time"
                value={t}
                onChange={(e) => setTime(i, e.target.value)}
                className={styles.timeInput}
              />
              {r.times.length > 1 && (
                <button
                  className={styles.timeRemove}
                  onClick={() => onUpdate(medId, { times: r.times.filter((_, j) => j !== i) })}
                  title="Remove time"
                >
                  <X size={11} />
                </button>
              )}
            </span>
          ))}
          {r.times.length < 4 && (
            <button
              className={styles.timeAdd}
              onClick={() => onUpdate(medId, { times: [...r.times, '21:00'] })}
              title="Add another time"
            >
              <Plus size={12} />
            </button>
          )}
          <span className={styles.nextDose}>{nextDoseLabel(r.times)}</span>
        </div>
      )}
    </div>
  );
}

function PillIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v3"/>
      <circle cx="18" cy="18" r="4"/>
      <path d="m15.5 15.5 5 5"/>
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}

function DocIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  );
}

function EmptyState() {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon}>
        <PillIcon />
      </div>
      <h3>No medications found</h3>
      <p>Upload a prescription document and your medications will appear here automatically.</p>
    </div>
  );
}

/**
 * Split an extracted medication line into its parts, e.g.
 * "Atorvastatin 10 mg — 1 tablet at bedtime (cholesterol management)"
 *  → name "Atorvastatin 10 mg", schedule "1 tablet at bedtime",
 *    purpose "cholesterol management"
 */
function parseMedication(text) {
  const clean = text.replace(/^[-•*]\s*/, '').trim();
  const purposeMatch = clean.match(/\(([^)]+)\)\s*$/);
  const purpose = purposeMatch ? purposeMatch[1].trim() : null;
  const base = purposeMatch ? clean.slice(0, purposeMatch.index).trim() : clean;
  const parts = base.split(/\s*—\s*|\s+-\s+/);
  return {
    name: parts[0].trim(),
    schedule: parts.slice(1).join(' — ').trim() || null,
    purpose,
  };
}

/** Accent color by what the medication is for */
function purposeTone(purpose) {
  const p = (purpose || '').toLowerCase();
  if (/cholesterol|lipid|heart|cardiac|blood pressure|hypertension/.test(p)) return 'rose';
  if (/sugar|glucose|diabet|hba1c|metabol/.test(p)) return 'blue';
  if (/vitamin|deficien|supplement|calcium|iron|b12|d3/.test(p)) return 'amber';
  return 'teal';
}

function MedCard({ med, reminder, onReminderUpdate }) {
  const lines = med.finding
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const [firstLine, ...extraLines] = lines;
  const { name, schedule, purpose } = parseMedication(firstLine || '');
  const tone = purposeTone(purpose);

  const date = med.reportDate
    ? new Date(med.reportDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : null;

  return (
    <div className={`${styles.card} ${styles[`accent_${tone}`]}`}>
      <div className={styles.cardTop}>
        <div className={styles.cardIcon}>
          <PillIcon />
        </div>
        <div className={styles.cardTitleWrap}>
          <h3 className={styles.medName}>{name}</h3>
          {schedule && <p className={styles.medSchedule}>{schedule}</p>}
        </div>
      </div>

      {purpose && <span className={styles.purposeBadge}>{purpose}</span>}

      {extraLines.length > 0 && (
        <ul className={styles.medList}>
          {extraLines.map((line, i) => (
            <li key={i} className={styles.medItem}>
              {line.replace(/^[-•*]\s*/, '')}
            </li>
          ))}
        </ul>
      )}

      <ReminderPanel medId={med.id} reminder={reminder} onUpdate={onReminderUpdate} />

      <div className={styles.cardFooter}>
        {med.documentName && (
          <span className={styles.metaItem}>
            <DocIcon /> {med.documentName}
          </span>
        )}
        {date && (
          <span className={styles.metaItem}>
            <CalendarIcon /> {date}
          </span>
        )}
      </div>
    </div>
  );
}

export default function MedicationsPage() {
  const { getToken } = useAuth();
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { reminders, update: updateReminder } = useMedReminders();

  useEffect(() => {
    fetchMedications(getToken)
      .then(setMedications)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [getToken]);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Medications</h1>
          <p className={styles.subtitle}>All medications extracted from your prescription documents</p>
        </div>
        <div className={styles.badge}>
          {loading ? '…' : `${medications.length} prescription${medications.length !== 1 ? 's' : ''}`}
        </div>
      </div>

      {loading && (
        <div className={styles.grid}>
          {[1, 2, 3].map((n) => (
            <div key={n} className={`${styles.card} ${styles.skeleton}`}>
              <div className={styles.skeletonHeader} />
              <div className={styles.skeletonLine} />
              <div className={styles.skeletonLine} style={{ width: '70%' }} />
              <div className={styles.skeletonLine} style={{ width: '85%' }} />
            </div>
          ))}
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}

      {!loading && !error && medications.length === 0 && <EmptyState />}

      {!loading && !error && medications.length > 0 && (
        <div className={styles.grid}>
          {medications.map((med) => (
            <MedCard key={med.id} med={med} reminder={reminders[med.id]} onReminderUpdate={updateReminder} />
          ))}
        </div>
      )}
    </div>
  );
}
