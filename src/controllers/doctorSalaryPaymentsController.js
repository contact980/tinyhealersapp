const API_BASE = process.env.REACT_APP_API_BASE_URL || '';

async function createSalaryPayment(data, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/api/doctor-salary-payments`, {
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

async function listSalaryPayments({ doctor, status, startDate, endDate } = {}, token) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const params = new URLSearchParams();
  if (doctor) params.append('doctor', doctor);
  if (status) params.append('status', status);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  const q = params.toString();
  const url = `${API_BASE}/api/doctor-salary-payments${q ? `?${q}` : ''}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = err.message || `Request failed: ${res.status}`;
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  return await res.json();
}

async function getSalaryPaymentById(id, token) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/api/doctor-salary-payments/${id}`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = err.message || `Request failed: ${res.status}`;
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  return await res.json();
}

export { createSalaryPayment, listSalaryPayments, getSalaryPaymentById };
