const API_BASE = '/api/v1';

function getHeaders(token) {
  const h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, options);
  if (res.status === 204 || res.headers.get('content-length') === '0') return null;
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error(data?.error || data?.message || `Request failed (${res.status})`);
  return data;
}

/* Auth */
export const authApi = {
  register: (email, password) =>
    request('/auth/register', { method: 'POST', headers: getHeaders(), body: JSON.stringify({ email, password }) }),
  login: (email, password) =>
    request('/auth/login', { method: 'POST', headers: getHeaders(), body: JSON.stringify({ email, password }) }),
  refresh: (refreshToken) =>
    request('/auth/refresh', { method: 'POST', headers: getHeaders(), body: JSON.stringify({ refreshToken }) }),
  logout: (refreshToken) =>
    request('/auth/logout', { method: 'POST', headers: getHeaders(), body: JSON.stringify({ refreshToken }) }),
};

/* User */
export const userApi = {
  updateLlmToken: (token, llmApiToken) =>
    request('/users/me/llm-token', { method: 'PUT', headers: getHeaders(token), body: JSON.stringify({ llmApiToken }) }),
};

/* Books */
export const booksApi = {
  list: (token) =>
    request('/books', { headers: getHeaders(token) }),
  upload: (token, file, provider) => {
    const formData = new FormData();
    formData.append('file', file);
    if (provider) formData.append('provider', provider);
    return fetch(`${API_BASE}/books/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    }).then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Upload failed');
      return data;
    });
  },
  search: (token, bookId, query, limit = 5, provider) =>
    request(`/books/${bookId}/search`, { method: 'POST', headers: getHeaders(token), body: JSON.stringify({ query, limit, provider }) }),
  chat: (token, bookId, query, limit = 5, provider) =>
    request(`/books/${bookId}/chat`, { method: 'POST', headers: getHeaders(token), body: JSON.stringify({ query, limit, provider }) }),
  summary: (token, bookId, provider) =>
    request(`/books/${bookId}/summary`, { method: 'POST', headers: getHeaders(token), body: JSON.stringify({ provider }) }),
  flashcards: (token, bookId, provider, count = 10) =>
    request(`/books/${bookId}/flashcards`, { method: 'POST', headers: getHeaders(token), body: JSON.stringify({ provider, count }) }),
  getSummaries: (token, bookId) =>
    request(`/books/${bookId}/summaries`, { headers: getHeaders(token) }),
  getFlashcards: (token, bookId) =>
    request(`/books/${bookId}/flashcards`, { headers: getHeaders(token) }),
  getChats: (token, bookId) =>
    request(`/books/${bookId}/chats`, { headers: getHeaders(token) }),
};

/* Admin */
export const adminApi = {
  auditLogs: (token, limit = 100) =>
    request(`/admin/audit-logs?limit=${limit}`, { headers: getHeaders(token) }),
  deadLetters: (token, sinceHours = 24) =>
    request(`/admin/dead-letters?sinceHours=${sinceHours}`, { headers: getHeaders(token) }),
};
