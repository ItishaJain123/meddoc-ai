const API_URL = import.meta.env.VITE_API_URL;

async function getAuthHeaders(getToken) {
  const token = await getToken();
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchDocuments(getToken) {
  const headers = await getAuthHeaders(getToken);
  const res = await fetch(`${API_URL}/documents`, { headers });
  if (!res.ok) throw new Error('Failed to fetch documents');
  return res.json();
}

export async function uploadDocument(file, getToken) {
  const headers = await getAuthHeaders(getToken);
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_URL}/documents/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Upload failed');
  }
  return res.json();
}

export async function deleteDocument(id, getToken) {
  const headers = await getAuthHeaders(getToken);
  const res = await fetch(`${API_URL}/documents/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) throw new Error('Failed to delete document');
  return res.json();
}

export async function fetchDocumentContent(id, getToken) {
  const headers = await getAuthHeaders(getToken);
  const res = await fetch(`${API_URL}/documents/${id}/content`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load document content');
  }
  return res.json();
}

export async function seedDemoData(getToken) {
  const headers = await getAuthHeaders(getToken);
  const res = await fetch(`${API_URL}/demo/seed`, { method: 'POST', headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load sample data');
  }
  return res.json();
}

export async function clearDemoData(getToken) {
  const headers = await getAuthHeaders(getToken);
  const res = await fetch(`${API_URL}/demo`, { method: 'DELETE', headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to clear sample data');
  }
  return res.json();
}

export async function pollDocumentStatus(id, getToken) {
  const headers = await getAuthHeaders(getToken);
  const res = await fetch(`${API_URL}/documents/${id}/status`, { headers });
  if (!res.ok) throw new Error('Failed to get status');
  return res.json();
}

export async function retryDocument(id, getToken) {
  const headers = await getAuthHeaders(getToken);
  const res = await fetch(`${API_URL}/documents/${id}/retry`, {
    method: 'POST',
    headers,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Retry failed');
  }
  return res.json();
}

export async function confirmDocumentIdentity(id, getToken) {
  const headers = await getAuthHeaders(getToken);
  const res = await fetch(`${API_URL}/documents/${id}/confirm-identity`, {
    method: 'POST',
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Could not confirm the report');
  }
  return res.json();
}

export async function reextractDocument(id, getToken) {
  const headers = await getAuthHeaders(getToken);
  const res = await fetch(`${API_URL}/documents/${id}/reextract`, {
    method: 'POST',
    headers,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Re-extraction failed');
  }
  return res.json();
}
