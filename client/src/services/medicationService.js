const API_URL = import.meta.env.VITE_API_URL;

async function getHeaders(getToken) {
  const token = await getToken();
  return { Authorization: `Bearer ${token}` };
}

export async function fetchMedications(getToken) {
  const headers = await getHeaders(getToken);
  const res = await fetch(`${API_URL}/medications`, { headers });
  if (!res.ok) throw new Error('Failed to fetch medications');
  return res.json();
}
