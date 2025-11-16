const API_BASE = process.env.REACT_APP_API_BASE_URL || '';

async function fetchDoctorStatsForDoctor(doctorId, page = 1, limit = 10) {
  const res = await fetch(`${API_BASE}/api/doctor-stats?doctor=${doctorId}&page=${page}&limit=${limit}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = err.message || `Request failed: ${res.status}`;
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  // if API returns wrapper with items, normalize to array
  if (data && Array.isArray(data.items)) return data.items;
  return data;
}

async function createDoctorStat(payload, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/api/doctor-stats`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
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

async function updateDoctorStat(id, payload, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/api/doctor-stats/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
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
async function fetchDoctorStatByDate(doctorId, dateISO) {
  // normalize date to yyyy-mm-dd
  const target = new Date(dateISO).toISOString().slice(0,10);
  const list = await fetchDoctorStatsForDoctor(doctorId, 1, 200);
  if (!Array.isArray(list)) return null;
  return list.find((it) => {
    if (!it.date) return false;
    const d = new Date(it.date).toISOString().slice(0,10);
    return d === target;
  }) || null;
}

async function createOrUpdateDoctorStat(payload, token) {
  // payload must include doctor and date
  if (!payload || !payload.doctor || !payload.date) {
    throw new Error('doctor and date required');
  }
  const existing = await fetchDoctorStatByDate(payload.doctor, payload.date);
  if (existing && existing._id) {
    // merge numeric totals (add) and append toggles if provided
    const merged = {};
    merged.totalConsultations = (existing.totalConsultations || 0) + (payload.totalConsultations || 0);
    merged.totalFollowUps = (existing.totalFollowUps || 0) + (payload.totalFollowUps || 0);
    merged.dailySalary = (existing.dailySalary || 0) + (payload.dailySalary || 0);
    // new fields: sum existing + payload where provided
    merged.numberofdayconsultation = (existing.numberofdayconsultation || 0) + (payload.numberofdayconsultation || 0);
    merged.noofnightconsultation = (existing.noofnightconsultation || 0) + (payload.noofnightconsultation || 0);
    // audio/video counters
    merged.totaldayaudio = (existing.totaldayaudio || 0) + (payload.totaldayaudio || 0);
    merged.totaldayvideo = (existing.totaldayvideo || 0) + (payload.totaldayvideo || 0);
    merged.totalnightaudio = (existing.totalnightaudio || 0) + (payload.totalnightaudio || 0);
    merged.totalnightvideo = (existing.totalnightvideo || 0) + (payload.totalnightvideo || 0);
    if (Array.isArray(existing.toggles) || Array.isArray(payload.toggles)) {
      merged.toggles = (existing.toggles || []).concat(payload.toggles || []);
    }
    // allow overriding other scalar fields if provided
    if (typeof payload.totalAppointments === 'number') merged.totalAppointments = payload.totalAppointments;
    return await updateDoctorStat(existing._id, merged, token);
  }
  return await createDoctorStat(payload, token);
}

export { fetchDoctorStatsForDoctor, createDoctorStat, updateDoctorStat, fetchDoctorStatByDate, createOrUpdateDoctorStat };

async function appendToggleForDate(doctorId, dateISO, toggleObj, token) {
  if (!doctorId || !dateISO || !toggleObj) throw new Error('doctor, date and toggle required');
  const existing = await fetchDoctorStatByDate(doctorId, dateISO);
  if (existing && existing._id) {
    const toggles = (existing.toggles || []).concat([toggleObj]);
    return await updateDoctorStat(existing._id, { toggles }, token);
  }
  // create new record for date with the toggle
  return await createDoctorStat({
    doctor: doctorId,
    date: new Date(dateISO).toISOString(),
    toggles: [toggleObj],
  }, token);
}

export { appendToggleForDate };

async function deleteDoctorStat(id, token) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/api/doctor-stats/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}));
    const message = err.message || `Request failed: ${res.status}`;
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  try {
    return await res.json();
  } catch (e) {
    return null;
  }
}

export { deleteDoctorStat };


