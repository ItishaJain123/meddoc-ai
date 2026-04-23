const API_URL = import.meta.env.VITE_API_URL;

async function getHeaders(getToken) {
  const token = await getToken();
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export async function fetchGoals(getToken) {
  const headers = await getHeaders(getToken);
  const res = await fetch(`${API_URL}/goals`, { headers });
  if (!res.ok) throw new Error('Failed to fetch goals');
  return res.json();
}

export async function fetchAvailableMetrics(getToken) {
  const headers = await getHeaders(getToken);
  const res = await fetch(`${API_URL}/goals/metrics`, { headers });
  if (!res.ok) throw new Error('Failed to fetch metrics');
  return res.json(); // [{ metricName, unit }]
}

export async function createGoal(getToken, data) {
  const headers = await getHeaders(getToken);
  const res = await fetch(`${API_URL}/goals`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create goal');
  }
  return res.json();
}

export async function deleteGoal(getToken, id) {
  const headers = await getHeaders(getToken);
  const res = await fetch(`${API_URL}/goals/${id}`, { method: 'DELETE', headers });
  if (!res.ok) throw new Error('Failed to delete goal');
  return res.json();
}
