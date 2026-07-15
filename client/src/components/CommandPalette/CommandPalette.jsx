import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, TrendingUp, History, ListOrdered,
  MessageSquare, Pill, Target, GitCompareArrows, Info, Upload,
  Moon, Search, CornerDownLeft,
} from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import styles from './CommandPalette.module.css';

function useCommands() {
  const navigate = useNavigate();
  const { isDark, toggle } = useTheme();

  return useMemo(() => [
    { id: 'dashboard', label: 'Go to Dashboard',       hint: 'Overview of your health data', icon: LayoutDashboard, run: () => navigate('/dashboard') },
    { id: 'documents', label: 'Go to Documents',       hint: 'Upload and manage reports',    icon: FileText,        run: () => navigate('/documents') },
    { id: 'trends',    label: 'Go to Health Trends',   hint: 'Metric charts over time',      icon: TrendingUp,      run: () => navigate('/trends') },
    { id: 'timeline',  label: 'Go to Health Timeline', hint: 'Chronological event feed',     icon: History,         run: () => navigate('/timeline') },
    { id: 'summary',   label: 'Go to Summary',         hint: 'AI health briefing',           icon: ListOrdered,     run: () => navigate('/summary') },
    { id: 'chat',      label: 'Go to Smart Chat',      hint: 'Ask about your documents',     icon: MessageSquare,   run: () => navigate('/chat') },
    { id: 'meds',      label: 'Go to Medications',     hint: 'Prescriptions and reminders',  icon: Pill,            run: () => navigate('/medications') },
    { id: 'goals',     label: 'Go to Health Goals',    hint: 'Targets for your metrics',     icon: Target,          run: () => navigate('/goals') },
    { id: 'compare',   label: 'Go to Compare Reports', hint: 'Side-by-side comparison',      icon: GitCompareArrows, run: () => navigate('/compare') },
    { id: 'about',     label: 'Go to About',           hint: 'What MedDoc AI does',          icon: Info,            run: () => navigate('/about') },
    { id: 'upload',    label: 'Upload a report',       hint: 'Opens the Documents page',     icon: Upload,          run: () => navigate('/documents') },
    { id: 'theme',     label: isDark ? 'Switch to light mode' : 'Switch to dark mode', hint: 'Toggle the theme', icon: Moon, run: toggle },
  ], [navigate, isDark, toggle]);
}

function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);
  const commands = useCommands();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) => c.label.toLowerCase().includes(q) || c.hint.toLowerCase().includes(q)
    );
  }, [commands, query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setSelected(0);
  }, []);

  // Global Ctrl+K / Cmd+K
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape' && open) {
        close();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 10);
  }, [open]);

  useEffect(() => { setSelected(0); }, [query]);

  if (!open) return null;

  function runCommand(cmd) {
    close();
    cmd.run();
  }

  function onInputKey(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === 'Enter' && results[selected]) {
      e.preventDefault();
      runCommand(results[selected]);
    }
  }

  return (
    <div className={styles.overlay} onClick={close}>
      <div className={styles.palette} onClick={(e) => e.stopPropagation()}>
        <div className={styles.inputRow}>
          <Search size={16} className={styles.searchIcon} />
          <input
            ref={inputRef}
            className={styles.input}
            placeholder="Search pages and actions…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKey}
          />
          <kbd className={styles.kbd}>esc</kbd>
        </div>
        <div className={styles.results}>
          {results.length === 0 && <p className={styles.noResults}>No matches for “{query}”</p>}
          {results.map((cmd, i) => {
            const Icon = cmd.icon;
            return (
              <button
                key={cmd.id}
                className={`${styles.item} ${i === selected ? styles.itemActive : ''}`}
                onMouseEnter={() => setSelected(i)}
                onClick={() => runCommand(cmd)}
              >
                <span className={styles.itemIcon}><Icon size={15} /></span>
                <span className={styles.itemLabel}>{cmd.label}</span>
                <span className={styles.itemHint}>{cmd.hint}</span>
                {i === selected && <CornerDownLeft size={13} className={styles.enterIcon} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
