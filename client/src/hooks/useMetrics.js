import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { fetchMetrics, fetchCriticalAlerts, fetchSummary } from '../services/metricsService';

export function useMetrics() {
  const { getToken } = useAuth();
  const [metrics, setMetrics] = useState({});
  const [criticalAlerts, setCriticalAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const [m, c] = await Promise.all([
        fetchMetrics(getToken),
        fetchCriticalAlerts(getToken),
      ]);
      setMetrics(m);
      setCriticalAlerts(c);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState(null);

  const generateSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const s = await fetchSummary(getToken);
      setSummary(s);
      return s;
    } catch (err) {
      setSummaryError(err.message);
      return null;
    } finally {
      setSummaryLoading(false);
    }
  }, [getToken]);

  return {
    metrics,
    criticalAlerts,
    loading,
    error,
    summary,
    summaryLoading,
    summaryError,
    generateSummary,
    reload: load,
  };
}
