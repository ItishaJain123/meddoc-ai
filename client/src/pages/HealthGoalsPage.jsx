import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { fetchGoals, fetchAvailableMetrics, createGoal, deleteGoal } from '../services/goalService';
import styles from './HealthGoalsPage.module.css';

function TargetIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="12" r="2"/>
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6"/>
      <path d="M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}

function ProgressBar({ progress, direction }) {
  const color = progress >= 80 ? 'var(--success)' : progress >= 50 ? 'var(--warning)' : 'var(--danger)';
  return (
    <div className={styles.progressWrap}>
      <div className={styles.progressBg}>
        <div
          className={styles.progressFill}
          style={{ width: `${Math.min(progress, 100)}%`, background: color }}
        />
      </div>
      <span className={styles.progressLabel} style={{ color }}>
        {Math.round(progress)}%
      </span>
    </div>
  );
}

function GoalCard({ goal, onDelete }) {
  const [deleting, setDeleting] = useState(false);

  const dirLabel = goal.direction === 'above' ? 'Keep above' : 'Keep below';
  const statusColor =
    goal.progress >= 80 ? styles.statusGreen :
    goal.progress >= 50 ? styles.statusYellow :
    styles.statusRed;

  const handleDelete = async () => {
    if (!window.confirm('Remove this goal?')) return;
    setDeleting(true);
    try { await onDelete(goal.id); }
    catch { setDeleting(false); }
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardTop}>
        <div className={styles.cardLeft}>
          <div className={styles.cardIcon}><TargetIcon /></div>
          <div>
            <div className={styles.metricName}>{goal.metricName}</div>
            <div className={styles.targetLine}>
              {dirLabel} <strong>{goal.targetValue} {goal.unit}</strong>
            </div>
          </div>
        </div>
        <button
          className={styles.deleteBtn}
          onClick={handleDelete}
          disabled={deleting}
          title="Remove goal"
        >
          <TrashIcon />
        </button>
      </div>

      <div className={styles.currentRow}>
        <span className={styles.currentLabel}>Current value</span>
        <span className={`${styles.currentValue} ${statusColor}`}>
          {goal.currentValue != null ? `${goal.currentValue} ${goal.unit}` : 'No data yet'}
        </span>
      </div>

      {goal.currentValue != null && (
        <ProgressBar progress={goal.progress} direction={goal.direction} />
      )}
    </div>
  );
}

function AddGoalForm({ metrics, onAdd, onCancel }) {
  const [form, setForm] = useState({ metricName: '', targetValue: '', direction: 'above', unit: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.metricName.trim() || !form.targetValue) return;
    setSaving(true);
    setErr(null);
    try {
      await onAdd({
        metricName: form.metricName.trim(),
        targetValue: parseFloat(form.targetValue),
        direction: form.direction,
        unit: form.unit.trim() || undefined,
      });
    } catch (e) {
      setErr(e.message);
      setSaving(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h3 className={styles.formTitle}>Set a New Health Goal</h3>

      <div className={styles.formRow}>
        <label className={styles.label}>Metric name</label>
        <input
          className={styles.input}
          list="metrics-list"
          value={form.metricName}
          onChange={(e) => {
            const val = e.target.value;
            const match = metrics.find((m) => m.metricName === val);
            setForm((f) => ({ ...f, metricName: val, unit: match?.unit ?? f.unit }));
          }}
          placeholder="e.g. Haemoglobin, Blood Pressure"
          required
        />
        <datalist id="metrics-list">
          {metrics.map((m) => <option key={m.metricName} value={m.metricName} />)}
        </datalist>
      </div>

      <div className={styles.formGrid}>
        <div>
          <label className={styles.label}>Target value</label>
          <input
            className={styles.input}
            type="number"
            step="any"
            value={form.targetValue}
            onChange={(e) => set('targetValue', e.target.value)}
            placeholder="e.g. 13.5"
            required
          />
        </div>
        <div>
          <label className={styles.label}>Unit (optional)</label>
          <input
            className={styles.input}
            value={form.unit}
            onChange={(e) => set('unit', e.target.value)}
            placeholder="e.g. g/dL, mmHg"
          />
        </div>
      </div>

      <div className={styles.formRow}>
        <label className={styles.label}>Direction</label>
        <div className={styles.radioGroup}>
          {['above', 'below'].map((d) => (
            <label key={d} className={`${styles.radioLabel} ${form.direction === d ? styles.radioActive : ''}`}>
              <input
                type="radio"
                name="direction"
                value={d}
                checked={form.direction === d}
                onChange={() => set('direction', d)}
                className={styles.radioInput}
              />
              {d === 'above' ? 'Keep above target' : 'Keep below target'}
            </label>
          ))}
        </div>
      </div>

      {err && <div className={styles.formError}>{err}</div>}

      <div className={styles.formActions}>
        <button type="button" className={styles.cancelBtn} onClick={onCancel}>Cancel</button>
        <button type="submit" className={styles.saveBtn} disabled={saving}>
          {saving ? 'Saving…' : 'Save Goal'}
        </button>
      </div>
    </form>
  );
}

export default function HealthGoalsPage() {
  const { getToken } = useAuth();
  const [goals, setGoals] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([fetchGoals(getToken), fetchAvailableMetrics(getToken)])
      .then(([g, m]) => { setGoals(g); setMetrics(m); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [getToken]);

  const handleAdd = async (data) => {
    const newGoal = await createGoal(getToken, data);
    setGoals((prev) => [newGoal, ...prev]);
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    await deleteGoal(getToken, id);
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  const activeGoals = goals.filter((g) => g.isActive);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Health Goals</h1>
          <p className={styles.subtitle}>Set targets for your health metrics and track your progress</p>
        </div>
        {!showForm && (
          <button className={styles.addBtn} onClick={() => setShowForm(true)}>
            <PlusIcon /> Add Goal
          </button>
        )}
      </div>

      {showForm && (
        <AddGoalForm
          metrics={metrics}
          onAdd={handleAdd}
          onCancel={() => setShowForm(false)}
        />
      )}

      {error && <div className={styles.error}>{error}</div>}

      {loading && (
        <div className={styles.grid}>
          {[1, 2, 3].map((n) => (
            <div key={n} className={`${styles.card} ${styles.skeleton}`}>
              <div className={styles.skeletonLine} style={{ width: '60%', height: '18px' }} />
              <div className={styles.skeletonLine} style={{ width: '40%', height: '14px' }} />
              <div className={styles.skeletonLine} style={{ height: '10px', marginTop: '1rem' }} />
            </div>
          ))}
        </div>
      )}

      {!loading && !error && activeGoals.length === 0 && !showForm && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}><TargetIcon /></div>
          <h3>No health goals yet</h3>
          <p>Click "Add Goal" to set a target for a health metric and track how your values compare over time.</p>
          <button className={styles.addBtn} onClick={() => setShowForm(true)}>
            <PlusIcon /> Set Your First Goal
          </button>
        </div>
      )}

      {!loading && activeGoals.length > 0 && (
        <div className={styles.grid}>
          {activeGoals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
