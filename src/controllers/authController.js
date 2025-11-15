const API_BASE = process.env.REACT_APP_API_BASE_URL || '';

async function requestOtp(phoneNumber) {
  const res = await fetch(`${API_BASE}/api/auth/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber }),
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

async function verifyOtp(phoneNumber, otp) {
  const res = await fetch(`${API_BASE}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber, otp }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = err.message || `Request failed: ${res.status}`;
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }

  const data = await res.json();

  // persist auth response (token + user) to localStorage for later use
  try {
    if (data && (data.token || data.user)) {
      localStorage.setItem('auth', JSON.stringify(data));
    }
  } catch (e) {
    // ignore storage errors (e.g., in private mode)
    // but still return the data to caller
    // console.warn('Failed to persist auth data', e);
  }

  return data;
}

export { requestOtp, verifyOtp };


