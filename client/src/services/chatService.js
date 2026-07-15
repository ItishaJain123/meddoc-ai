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

/**
 * Streaming ask over SSE. Calls handlers as events arrive:
 *   onMeta({ conversationId })  onToken(text)  onDone({ conversationId, message, sources })
 * Returns when the stream closes. Throws on transport / server errors.
 */
export async function askQuestionStream(question, conversationId, getToken, { onMeta, onToken, onDone }) {
  const headers = await getAuthHeaders(getToken);
  const res = await fetch(`${API_URL}/chat/ask/stream`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ question, conversationId }),
  });

  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to get answer');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let done = false;

  while (!done) {
    const { value, done: streamDone } = await reader.read();
    if (streamDone) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by a blank line
    const frames = buffer.split('\n\n');
    buffer = frames.pop();

    for (const frame of frames) {
      let event = 'message';
      let data = '';
      for (const line of frame.split('\n')) {
        if (line.startsWith('event: ')) event = line.slice(7).trim();
        else if (line.startsWith('data: ')) data += line.slice(6);
      }
      if (!data) continue;
      const payload = JSON.parse(data);

      if (event === 'meta') onMeta?.(payload);
      else if (event === 'token') onToken?.(payload.text);
      else if (event === 'done') { done = true; onDone?.(payload); }
      else if (event === 'error') throw new Error(payload.error || 'Failed to get answer');
    }
  }
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
