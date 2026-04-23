const API_URL = import.meta.env.VITE_API_URL;

async function getHeaders(getToken) {
  const token = await getToken();
  return { Authorization: `Bearer ${token}` };
}

export async function fetchMetrics(getToken) {
  const headers = await getHeaders(getToken);
  const res = await fetch(`${API_URL}/metrics`, { headers });
  if (!res.ok) throw new Error('Failed to fetch metrics');
  return res.json();
}

export async function fetchCriticalAlerts(getToken) {
  const headers = await getHeaders(getToken);
  const res = await fetch(`${API_URL}/metrics/critical`, { headers });
  if (!res.ok) throw new Error('Failed to fetch critical alerts');
  return res.json();
}

export async function fetchSummary(getToken) {
  const headers = await getHeaders(getToken);
  const res = await fetch(`${API_URL}/summary`, { headers });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to generate summary');
  }
  return res.json();
}
