const API_BASE = process.env.REACT_APP_API_BASE_URL || '';

async function createPaymentLink(data, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/api/payments/create-link`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = err.message || err.error || `Request failed: ${res.status}`;
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  return await res.json();
}

async function listPayments(status = '', page = 1, limit = 50, token, search = '') {
  const qs = new URLSearchParams();
  // allow single status, comma-separated, or array
  if (Array.isArray(status)) {
    const s = status.filter(Boolean).join(',');
    if (s) qs.set('status', s);
  } else if (typeof status === 'string' && status.trim()) {
    qs.set('status', status.trim());
  }
  if (search && String(search).trim()) qs.set('search', String(search).trim());
  qs.set('page', String(page));
  qs.set('limit', String(limit));
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/api/payments?${qs.toString()}`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = err.message || `Request failed: ${res.status}`;
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  return await res.json();
}

async function getPayment(id, token) {
  if (!id) {
    const err = new Error('Missing id');
    err.status = 400;
    throw err;
  }
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/api/payments/${id}`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = err.message || `Request failed: ${res.status}`;
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  return await res.json();
}

export { createPaymentLink, listPayments, getPayment };


