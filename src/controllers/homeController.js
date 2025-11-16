const API_BASE = process.env.REACT_APP_API_BASE_URL || '';

async function fetchUsers(page = 1, limit = 10, search = '') {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search && String(search).trim()) params.append('search', String(search).trim());
  const res = await fetch(`${API_BASE}/api/users?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = err.message || `Request failed: ${res.status}`;
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  return await res.json();
}

async function fetchUserById(id) {
  const res = await fetch(`${API_BASE}/api/users/${id}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = err.message || `Request failed: ${res.status}`;
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  return await res.json();
}

async function updateUser(id, data, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/api/users/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = err.message || `Request failed: ${res.status}`;
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  return await res.json();
}

async function createUser(data, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/api/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = err.message || `Request failed: ${res.status}`;
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  return await res.json();
}

async function deleteUser(id, token) {
  if (!id) {
    const error = new Error('Missing user id');
    error.status = 400;
    throw error;
  }
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/api/users/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = err.message || `Request failed: ${res.status}`;
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  return await res.json();
}

export { fetchUsers, fetchUserById, updateUser, createUser, deleteUser };


