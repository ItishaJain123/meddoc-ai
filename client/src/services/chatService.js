const API_URL = import.meta.env.VITE_API_URL;

async function getAuthHeaders(getToken) {
  const token = await getToken();
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export async function askQuestion(question, conversationId, getToken) {
  const headers = await getAuthHeaders(getToken);
  const res = await fetch(`${API_URL}/chat/ask`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ question, conversationId }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to get answer');
  }
  return res.json();
}

export async function fetchConversations(getToken) {
  const headers = await getAuthHeaders(getToken);
  const res = await fetch(`${API_URL}/chat/conversations`, { headers });
  if (!res.ok) throw new Error('Failed to fetch conversations');
  return res.json();
}

export async function fetchConversation(id, getToken) {
  const headers = await getAuthHeaders(getToken);
  const res = await fetch(`${API_URL}/chat/conversations/${id}`, { headers });
  if (!res.ok) throw new Error('Failed to fetch conversation');
  return res.json();
}

export async function deleteConversation(id, getToken) {
  const headers = await getAuthHeaders(getToken);
  const res = await fetch(`${API_URL}/chat/conversations/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) throw new Error('Failed to delete conversation');
  return res.json();
}
