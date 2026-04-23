const API_URL = import.meta.env.VITE_API_URL;

async function getHeaders(getToken) {
  const token = await getToken();
  return { Authorization: `Bearer ${token}` };
}

export async function fetchDashboard(getToken) {
  const headers = await getHeaders(getToken);
  const res = await fetch(`${API_URL}/dashboard`, { headers });
  if (!res.ok) throw new Error('Failed to fetch dashboard');
  return res.json();
}
