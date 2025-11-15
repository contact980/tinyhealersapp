import React, { useState, useEffect, useRef } from 'react';
import '../styles/doctor-details.css';
import { updateUser, createUser, deleteUser } from '../controllers/homeController';
import { fetchDoctorStatsForDoctor, createDoctorStat, createOrUpdateDoctorStat, fetchDoctorStatByDate, appendToggleForDate, updateDoctorStat } from '../controllers/doctorStatsController';

// Helper: format seconds into human-friendly string
function formatDuration(totalSeconds) {
  const s = Number(totalSeconds) || 0;
  if (s <= 0) return '0s';
  const hours = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hours > 0) {
    return `${hours}h${mins ? ' ' + mins + 'm' : ''}`;
  }
  if (mins > 0) {
    return `${mins}m${secs ? ' ' + secs + 's' : ''}`;
  }
  return `${secs}s`;
}

// compute online/offline seconds from toggles within the same date
function computeOnlineOfflineFromToggles(toggles = [], dateISO = null) {
  if (!Array.isArray(toggles) || toggles.length === 0) return { online: 0, offline: 0 };
  // normalize and sort
  const arr = toggles
    .map((t) => ({ at: new Date(t.at).getTime(), isOnline: !!t.isOnline }))
    .sort((a, b) => a.at - b.at);
  // determine day bounds if dateISO provided, else use first toggle's date
  let dayStart;
  if (dateISO) {
    dayStart = new Date(dateISO);
    dayStart.setUTCHours(0, 0, 0, 0);
  } else {
    const d = new Date(arr[0].at);
    dayStart = new Date(d);
    dayStart.setUTCHours(0, 0, 0, 0);
  }
  const dayStartTs = dayStart.getTime();
  const dayEndTs = dayStartTs + 24 * 3600 * 1000;

  let onlineMs = 0;
  for (let i = 0; i < arr.length; i++) {
    const cur = arr[i];
    const next = arr[i + 1];
    if (cur.isOnline) {
      const from = Math.max(cur.at, dayStartTs);
      const to = next ? Math.min(next.at, dayEndTs) : Math.min(Date.now(), dayEndTs);
      if (to > from) onlineMs += to - from;
    }
  }
  const online = Math.floor(onlineMs / 1000);
  const offline = Math.max(0, 24 * 3600 - online);
  return { online, offline };
}

const Stat = ({ title, value }) => (
  <div className="stat">
    <div className="stat-title">{title}</div>
    <div className="stat-value">{value}</div>
  </div>
);

const DoctorDetails = ({ doctor = null, mode = 'view', onClose = () => {} }) => {
  const [name, setName] = useState(doctor?.name || '');
  const [degree, setDegree] = useState(doctor?.title || '');
  const [hospital, setHospital] = useState('');
  const [phone, setPhone] = useState(doctor?.phone?.replace(/\+91\s?/, '') || '');
  const [online, setOnline] = useState(doctor?.online ?? false);
  const [isDoctorRole, setIsDoctorRole] = useState(false);
  const [stats, setStats] = useState([]);
  const [creditAmount, setCreditAmount] = useState('');
  const [showCreditForm, setShowCreditForm] = useState(false);
  const [creditDate, setCreditDate] = useState(() => new Date().toISOString().slice(0,10));
  const [creditConsultations, setCreditConsultations] = useState(0);
  const [creditFollowUps, setCreditFollowUps] = useState(0);
  const [modalStat, setModalStat] = useState(null);
  const [modalSalary, setModalSalary] = useState('');
  const [modalConsultations, setModalConsultations] = useState(0);
  const [modalFollowUps, setModalFollowUps] = useState(0);
  const [modalDayConsultations, setModalDayConsultations] = useState(0);
  const [modalNightConsultations, setModalNightConsultations] = useState(0);
  const pushedRef = useRef(false);
  const closingOptsRef = useRef(null);

  // push a history state so browser "back" closes this panel via popstate
  useEffect(() => {
    if (typeof window === 'undefined' || !window.history || !window.history.pushState) return;
    try {
      window.history.pushState({ doctorDetails: true }, '');
      pushedRef.current = true;
    } catch (e) {
      // ignore
    }

    const onPop = () => {
      if (closingOptsRef.current) {
        const opts = closingOptsRef.current;
        closingOptsRef.current = null;
        onClose && onClose(opts);
      } else {
        onClose && onClose();
      }
    };

    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      pushedRef.current = false;
      closingOptsRef.current = null;
    };
  }, [onClose]);

  // determine if current local user is role 3 (doctor) and should be view-only
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('auth');
      if (!stored) {
        setIsDoctorRole(false);
        return;
      }
      const parsed = JSON.parse(stored);
      setIsDoctorRole(!!(parsed && parsed.user && parsed.user.role === 3));
    } catch (e) {
      setIsDoctorRole(false);
    }
  }, []);

  function closeWithHistory(opts) {
    if (pushedRef.current && typeof window !== 'undefined' && window.history && window.history.back) {
      closingOptsRef.current = opts || null;
      window.history.back();
    } else {
      onClose && onClose(opts);
    }
  }

  useEffect(() => {
    setName(doctor?.name || '');
    setDegree(doctor?.degree || doctor?.title || '');
    setHospital(doctor?.hospital || '');
    setPhone(doctor?.phoneNumber || doctor?.phone || '');
    setOnline(doctor?.isOnline ?? doctor?.online ?? false);

    // load stats only when viewing an existing doctor
    if (mode === 'view' && doctor && (doctor._id || doctor.id)) {
      (async () => {
        try {
          const list = await fetchDoctorStatsForDoctor(doctor._id || doctor.id);
          setStats(list || []);
        } catch (e) {
          console.error('fetchDoctorStats error', e);
        }
      })();
    }
  }, [doctor, mode]);

  useEffect(() => {
    // initialize modal edit fields when modalStat opens
    if (modalStat) {
      setModalSalary(modalStat.dailySalary || 0);
      setModalConsultations(modalStat.totalConsultations || 0);
      setModalFollowUps(modalStat.totalFollowUps || 0);
      setModalDayConsultations(modalStat.numberofdayconsultation || 0);
      setModalNightConsultations(modalStat.noofnightconsultation || 0);
    }
  }, [modalStat]);

  async function handleSubmit() {
    if (!doctor) {
      // creating flow: call API to create user/doctor
      if (!name) {
        alert('Please enter name');
        return;
      }
      try {
        const stored = localStorage.getItem('auth');
        let token = null;
        if (stored) {
          const parsed = JSON.parse(stored);
          token = parsed.token;
        }
        const payload = {
          name,
          degree,
          hospital,
          phoneNumber: phone ? String(phone).replace(/\D/g, '') : undefined,
          role: 3,
          isOnline: online,
        };
        const created = await createUser(payload, token);
        // optionally you could propagate created user to parent
        alert('Doctor created');
        closeWithHistory({ reload: true });
        return;
      } catch (e) {
        console.error('create doctor error', e);
        alert(e.message || 'Failed to create doctor');
        return;
      }
    }

    try {
      // send update to server
      const stored = localStorage.getItem('auth');
      let token = null;
      if (stored) {
        const parsed = JSON.parse(stored);
        token = parsed.token;
      }
      const updated = await updateUser(doctor._id || doctor.id, { name, degree, hospital, isOnline: online }, token);
      // update local doctor reference (caller holds it)
      alert('Doctor updated');
      closeWithHistory();
    } catch (e) {
      console.error('updateUser error', e);
      alert(e.message || 'Failed to update doctor');
    }
  }

  function handleDelete() {
    if (!doctor || !(doctor._id || doctor.id)) {
      alert('No doctor selected');
      return;
    }
    if (!window.confirm('Delete this doctor?')) return;
    (async () => {
      try {
        const stored = localStorage.getItem('auth');
        let token = null;
        if (stored) {
          const parsed = JSON.parse(stored);
          token = parsed.token;
        }
        await deleteUser(doctor._id || doctor.id, token);
        alert('Doctor deleted');
        closeWithHistory({ reload: true });
      } catch (e) {
        console.error('delete error', e);
        alert(e.message || 'Failed to delete');
      }
    })();
  }

  async function handleCredit() {
    // validate
    if (!creditAmount || isNaN(Number(creditAmount))) {
      alert('Enter a valid amount');
      return;
    }
    try {
      const amt = Number(creditAmount);
      const payload = {
        doctor: doctor._id || doctor.id,
        date: new Date(creditDate).toISOString(),
        dailySalary: amt,
        totalConsultations: Number(creditConsultations) || 0,
        totalFollowUps: Number(creditFollowUps) || 0,
      };
      const res = await createOrUpdateDoctorStat(payload);
      // prepend to stats
      setStats((s) => [res, ...s]);
      setCreditAmount('');
      setCreditConsultations(0);
      setCreditFollowUps(0);
      setShowCreditForm(false);
      alert('Salary credited');
    } catch (e) {
      console.error('credit error', e);
      alert(e.message || 'Failed to credit salary');
    }
  }

  async function handleToggleOnline(newState) {
    try {
      const stored = localStorage.getItem('auth');
      let token = null;
      if (stored) {
        const parsed = JSON.parse(stored);
        token = parsed.token;
      }
      // update user isOnline
      await updateUser(doctor._id || doctor.id, { isOnline: newState }, token);
      setOnline(newState);

      // append toggle event to today's stat (creates doc if missing)
      const nowISO = new Date().toISOString();
      const toggle = { at: nowISO, isOnline: newState };
      await appendToggleForDate(doctor._id || doctor.id, nowISO, toggle, token);
      // refresh stats list
      const list = await fetchDoctorStatsForDoctor(doctor._id || doctor.id);
      setStats(list || []);
    } catch (e) {
      console.error('toggle online error', e);
      alert(e.message || 'Failed to toggle online');
    }
  }

  async function handleSaveModal() {
    if (!modalStat || !modalStat._id) return;
    try {
      const stored = localStorage.getItem('auth');
      let token = null;
      if (stored) {
        const parsed = JSON.parse(stored);
        token = parsed.token;
      }
      const payload = {
        dailySalary: Number(modalSalary) || 0,
        totalConsultations: Number(modalConsultations) || 0,
        totalFollowUps: Number(modalFollowUps) || 0,
        numberofdayconsultation: Number(modalDayConsultations) || 0,
        noofnightconsultation: Number(modalNightConsultations) || 0,
      };
      const updated = await updateDoctorStat(modalStat._id, payload, token);
      // replace in stats list
      setStats((s) => s.map((it) => (it._id === updated._id ? updated : it)));
      setModalStat(null);
      alert('Record updated');
    } catch (e) {
      console.error('save modal error', e);
      alert(e.message || 'Failed to save');
    }
  }

  return (
    <div className="DoctorDetails">
      <header className="dd-header">
        <div className="dd-left">
          <button className="back-icon" onClick={() => closeWithHistory()} aria-label="back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="dd-title">
          <h2>{mode === 'create' ? 'Create Doctor' : 'Doctor Details'}</h2>
        </div>

        <div className="dd-right">
          {/* header-right intentionally left empty (delete handled in actions) */}
        </div>
      </header>

      <main className="dd-main">
        <section className="profile-card">
          <h3>Profile Details</h3>
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
          <label>Degree</label>
          <input value={degree} onChange={(e) => setDegree(e.target.value)} />
          <label>Hospital (Optional)</label>
          <input value={hospital} onChange={(e) => setHospital(e.target.value)} />
          <label>Phone Number</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} />

          <div className="toggle-row">
            <div>Doctor is Online</div>
            <label className="switch">
          <input type="checkbox" checked={online} onChange={() => handleToggleOnline(!online)} disabled={isDoctorRole} />
              <span className="slider" />
            </label>
          </div>
        </section>

        {mode === 'view' && (
          <>
            <section className="stats-grid">
              {(() => {
                // aggregate totals over stats array
                const totalConsultations = stats.reduce((s, it) => s + (it.totalConsultations || 0), 0);
                const totalFollowUps = stats.reduce((s, it) => s + (it.totalFollowUps || 0), 0);
                const totalOnlineSeconds = stats.reduce((s, it) => s + (it.totalOnlineSeconds || it.onlineSeconds || computeOnlineOfflineFromToggles(it.toggles || [], it.date).online || 0), 0);
                const totalOfflineSeconds = stats.reduce((s, it) => s + (it.totalOfflineSeconds || computeOnlineOfflineFromToggles(it.toggles || [], it.date).offline || 0), 0);
                const dayCount = stats.reduce((s, it) => s + (it.isDayShift ? 1 : 0), 0);
                const nightCount = stats.reduce((s, it) => s + (it.isDayShift ? 0 : 1), 0);

                return [
                  <Stat key="cons" title="Total Consultations" value={totalConsultations} />,
                  <Stat key="follow" title="Total Follow-ups" value={totalFollowUps} />,
                  <Stat key="online" title="Total Online" value={formatDuration(totalOnlineSeconds)} />,
                  <Stat key="offline" title="Total Offline" value={formatDuration(totalOfflineSeconds)} />,
                ];
              })()}
            </section>

            <section className="salary-card">
              <div className="salary-head">
                <div>Salary History</div>
                <div className="total-paid">₹{stats.reduce((s, it) => s + (it.dailySalary||0), 0)}</div>
              </div>
              <div className="salary-list">
                {stats.map((it, i) => (
                  <div key={it._id || i} className="salary-row" onClick={() => setModalStat(it)} style={{cursor:'pointer'}}>
                    <div>
                      <div className="label">Consultations: {it.totalConsultations || 0}</div>
                      <div className="date">{new Date(it.date).toLocaleDateString()}</div>
                    </div>
                    <div className="amount">₹{it.dailySalary || 0}</div>
                  </div>
                ))}
              </div>
              {!isDoctorRole && (
                <div style={{marginTop:12}}>
                  {!showCreditForm && (
                    <button className="btn-primary btn-large credit-btn" onClick={() => setShowCreditForm(true)} style={{display:'inline-block', width:'100%'}}>+ Credit Salary</button>
                  )}
                  {showCreditForm && (
                    <div className="credit-form" style={{marginTop:8}}>
                      <label style={{display:'block', marginBottom:6}}>Select date</label>
                      <input type="date" value={creditDate} onChange={(e)=>setCreditDate(e.target.value)} style={{padding:'8px', borderRadius:6, border:'1px solid #ddd', width:'100%', marginBottom:12}} />

                      <div style={{display:'flex', gap:8, marginBottom:8}}>
                        <div style={{flex:1}}>
                          <label style={{display:'block', marginBottom:6}}>Consultations</label>
                          <div className="stepper">
                            <button type="button" className="stepper-btn" onClick={()=>setCreditConsultations((v)=>Math.max(0, Number(v)-1))}>−</button>
                            <div className="stepper-value">{creditConsultations}</div>
                            <button type="button" className="stepper-btn" onClick={()=>setCreditConsultations((v)=>Number(v)+1)}>+</button>
                          </div>
                        </div>

                        <div style={{flex:1}}>
                          <label style={{display:'block', marginBottom:6}}>Follow-ups</label>
                          <div className="stepper">
                            <button type="button" className="stepper-btn" onClick={()=>setCreditFollowUps((v)=>Math.max(0, Number(v)-1))}>−</button>
                            <div className="stepper-value">{creditFollowUps}</div>
                            <button type="button" className="stepper-btn" onClick={()=>setCreditFollowUps((v)=>Number(v)+1)}>+</button>
                          </div>
                        </div>
                      </div>

                      {/* shift selection removed - use default on server */}

                      <label style={{display:'block', marginBottom:6}}>Amount</label>
                      <input placeholder="Amount" value={creditAmount} onChange={(e)=>setCreditAmount(e.target.value)} style={{padding:'8px 12px', borderRadius:6, border:'1px solid #ddd', width:'100%', marginBottom:8}} />
                      <div style={{display:'flex', gap:8}}>
                        <button className="btn-outline btn-large" onClick={()=>setShowCreditForm(false)} style={{flex:1}}>Cancel</button>
                        <button className="btn-primary btn-large" onClick={handleCredit} style={{flex:1}}>Credit</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          </>
        )}

        {/* modal for salary detail */}
        {modalStat && (
          <div className="modal-overlay" onClick={()=>setModalStat(null)}>
            <div className="modal" onClick={(e)=>e.stopPropagation()}>
              <h3>Details - {new Date(modalStat.date).toLocaleDateString()}</h3>
              <div style={{marginTop:8}}>
              <div className="modal-row">
                  <div className="modal-key">Online</div>
                  <div className="modal-value">{formatDuration(modalStat.totalOnlineSeconds || computeOnlineOfflineFromToggles(modalStat.toggles || [], modalStat.date).online || 0)}</div>
                </div>
                <div className="modal-row">
                  <div className="modal-key">Offline</div>
                  <div className="modal-value">{formatDuration(modalStat.totalOfflineSeconds || computeOnlineOfflineFromToggles(modalStat.toggles || [], modalStat.date).offline || 0)}</div>
                </div>
                <div className="modal-row">
                  <div className="modal-key">Consultations</div>
                  <div className="modal-value">
                    <input className="text-input modal-input" type="number" value={modalConsultations} onChange={(e)=>setModalConsultations(e.target.value)} />
                  </div>
                </div>
                <div className="modal-row">
                  <div className="modal-key">Day Consults</div>
                  <div className="modal-value">
                    <input className="text-input modal-input" type="number" value={modalDayConsultations} onChange={(e)=>setModalDayConsultations(e.target.value)} />
                  </div>
                </div>
                <div className="modal-row">
                  <div className="modal-key">Night Consults</div>
                  <div className="modal-value">
                    <input className="text-input modal-input" type="number" value={modalNightConsultations} onChange={(e)=>setModalNightConsultations(e.target.value)} />
                  </div>
                </div>
                <div className="modal-row">
                  <div className="modal-key">Follow-ups</div>
                  <div className="modal-value">
                    <input className="text-input modal-input" type="number" value={modalFollowUps} onChange={(e)=>setModalFollowUps(e.target.value)} />
                  </div>
                </div>
                <div className="modal-row">
                  <div className="modal-key">Daily Salary</div>
                  <div className="modal-value">
                    <input className="text-input modal-input" type="number" value={modalSalary} onChange={(e)=>setModalSalary(e.target.value)} />
                  </div>
                </div>
                {/* Shift not displayed per request */}
              </div>
              <div className="modal-actions" style={{marginTop:12}}>
                {!isDoctorRole && (
                  <button className="btn-primary update-btn save-btn" onClick={handleSaveModal}>Save</button>
                )}
                <button
                  className="btn-outline logout-btn close-btn"
                  onClick={()=>setModalStat(null)}
                  style={isDoctorRole ? { width: '100%' } : {}}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {!isDoctorRole && (
          <div className="dd-actions">
            <button className="btn-outline logout-btn" onClick={() => (mode === 'create' ? closeWithHistory() : handleDelete())}>{mode === 'create' ? 'Cancel' : 'Delete'}</button>
            <button className="btn-primary update-btn" onClick={handleSubmit}>{mode === 'create' ? 'Create' : 'Update'}</button>
          </div>
        )}
      </main>
    </div>
  );
};

export default DoctorDetails;


