import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { FileText, AlertTriangle, AlertOctagon, Pill, Stethoscope, History } from 'lucide-react';
import styles from './TimelinePage.module.css';

const API_URL = import.meta.env.VITE_API_URL;

const TYPE_META = {
  document:   { icon: FileText,      label: 'Report',     tone: 'blue' },
  abnormal:   { icon: AlertTriangle, label: 'Abnormal',   tone: 'amber' },
  critical:   { icon: AlertOctagon,  label: 'Critical',   tone: 'red' },
  medication: { icon: Pill,          label: 'Medication', tone: 'teal' },
  finding:    { icon: Stethoscope,   label: 'Finding',    tone: 'neutral' },
};

function formatDay(iso) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

function TimelinePage() {
  const { getToken } = useAuth();
  const [events, setEvents] = useState(null);
  const [error, setError] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/dashboard/timeline`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load timeline');
        setEvents(await res.json());
      } catch (err) {
        setError(err.message);
      }
    })();
  }, [getToken]);

  const filtered = (events || []).filter(
    (e) => typeFilter === 'all' || e.type === typeFilter
      || (typeFilter === 'abnormal' && e.type === 'critical')
  );

  // Group consecutive events by calendar day
  const groups = [];
  for (const event of filtered) {
    const day = formatDay(event.date);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.events.push(event);
    else groups.push({ day, events: [event] });
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Health Timeline</h1>
          <p className={styles.subtitle}>Every report, out-of-range value and medication — in one chronological view.</p>
        </div>
        <div className={styles.filters}>
          {[['all', 'All'], ['document', 'Reports'], ['abnormal', 'Out of range'], ['medication', 'Medications']].map(([key, label]) => (
            <button
              key={key}
              className={`${styles.filterBtn} ${typeFilter === key ? styles.filterActive : ''}`}
              onClick={() => setTypeFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {!events && !error && (
        <div className={styles.skeletons}>
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className={styles.skeleton} />)}
        </div>
      )}

      {events && filtered.length === 0 && (
        <div className={styles.empty}>
          <History size={30} strokeWidth={1.5} />
          <p>No events yet. Upload a report — or load the sample data — to build your timeline.</p>
        </div>
      )}

      {groups.length > 0 && (
        <div className={styles.timeline}>
          {groups.map((group) => (
            <div key={group.day} className={styles.dayGroup}>
              <div className={styles.dayLabel}>{group.day}</div>
              <div className={styles.dayEvents}>
                {group.events.map((event) => {
                  const meta = TYPE_META[event.type] ?? TYPE_META.finding;
                  const Icon = meta.icon;
                  // Routine uploads are one-line rows; abnormal values,
                  // medications and findings keep the full card
                  const compact = event.type === 'document';
                  return (
                    <div
                      key={event.id}
                      className={`${styles.event} ${styles[`event_${meta.tone}`] || ''} ${compact ? styles.eventCompact : ''}`}
                    >
                      <span className={`${styles.eventIcon} ${styles[`tone_${meta.tone}`]}`}>
                        <Icon size={compact ? 13 : 15} />
                      </span>
                      <div className={styles.eventBody}>
                        <div className={styles.eventTop}>
                          <span className={styles.eventTitle}>
                            {event.title}
                            {compact && event.detail && (
                              <span className={styles.eventInlineDetail}> · {event.detail}</span>
                            )}
                          </span>
                          <span className={`${styles.eventBadge} ${styles[`badge_${meta.tone}`]}`}>{meta.label}</span>
                        </div>
                        {!compact && <p className={styles.eventDetail}>{event.detail}</p>}
                        {!compact && event.source && <p className={styles.eventSource}>{event.source}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TimelinePage;
