// Updated SalaryPage.js with narrower quick-filter buttons
import React, { useEffect, useState } from 'react';
import '../styles/payments.css';
import { createSalaryPayment, listSalaryPayments } from '../controllers/doctorSalaryPaymentsController';
import { fetchUsers } from '../controllers/homeController';

function formatLocalDateYYYYMMDD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const SalaryPage = () => {
  const [authUser, setAuthUser] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [activeRange, setActiveRange] = useState(''); // '', 'today', 'last7', 'month'
  const [authLoaded, setAuthLoaded] = useState(false);

  const [doctorId, setDoctorId] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [doctorQuery, setDoctorQuery] = useState('');
  const [doctorResults, setDoctorResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [amount, setAmount] = useState('');
  const [payDate, setPayDate] = useState('');
  const [payStatus, setPayStatus] = useState('paid');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('auth');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.user) setAuthUser(parsed.user);
      }
    } catch {}
    setAuthLoaded(true);
  }, []);

  useEffect(() => {
    if (!authLoaded) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoaded, authUser, status, startDate, endDate]);

  useEffect(() => {
    if (!showModal) return;
    if (!doctorQuery.trim()) {
      setDoctorResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetchUsers(1, 5, doctorQuery.trim());
        const arr = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        setDoctorResults(arr);
      } catch {
        setDoctorResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [doctorQuery, showModal]);

  async function load() {
    setItems([]);
    setLoading(true);
    try {
      const params = {};
      if (status) params.status = status;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (authUser?.role === 3 && (authUser?._id || authUser?.id)) params.doctor = authUser._id || authUser.id;

      const list = await listSalaryPayments(params);
      const arr = Array.isArray(list) ? list : Array.isArray(list?.data) ? list.data : [];
      setItems(arr);
    } catch (e) {
      console.error('list salary payments error', e);
      alert(e.message || 'Failed to load salary payments');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!doctorId) return alert('Enter doctor id');
    if (!amount || Number(amount) < 0) return alert('Enter valid amount');

    try {
      const stored = localStorage.getItem('auth');
      const token = stored ? JSON.parse(stored).token : null;

      const payload = {
        doctor: doctorId,
        amount: Number(amount),
        status: payStatus || undefined,
        date: payDate ? new Date(payDate).toISOString() : undefined,
      };

      await createSalaryPayment(payload, token);
      setShowModal(false);
      setDoctorId('');
      setSelectedDoctor(null);
      setDoctorQuery('');
      setDoctorResults([]);
      setAmount('');
      setPayDate('');
      setPayStatus('paid');
      await load();
      alert('Salary payment created');
    } catch (e) {
      console.error('create salary payment error', e);
      alert(e.message || 'Failed to create salary payment');
    }
  }

  return (
    <div className="PaymentsPage">
      <header className="home-header">
        <h1 className="manage">Salary</h1>
      </header>

      <main className="payments-section">
        <section>
          <div className="payments-toolbar">
            <div className="payments-toolbar-row">
              <h3>Recent salary payments</h3>
              <div className="spacer" />
              <select className="payments-select" value={status} onChange={(e)=>setStatus(e.target.value)}>
                <option value="">All</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <div className="payments-toolbar-row" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, alignItems:'end' }}>
              <div>
                <label style={{ display:'block', fontSize:12, color:'#64748b', marginBottom:4 }}>Start date</label>
                <input type="date" className="payments-search" value={startDate} style={{ width:'100%', minWidth:0, textAlign:'left' }}
                  onChange={(e)=>{
                    const v = e.target.value;
                    setStartDate(v);
                    if (v && endDate && new Date(endDate) < new Date(v)) setEndDate(v);
                    setActiveRange('');
                  }} />
              </div>

              <div>
                <label style={{ display:'block', fontSize:12, color:'#64748b', marginBottom:4 }}>End date</label>
                <input type="date" className="payments-search" value={endDate} style={{ width:'100%', minWidth:0, textAlign:'left' }}
                  onChange={(e)=>{
                    const v = e.target.value;
                    setEndDate(v);
                    if (v && startDate && new Date(v) < new Date(startDate)) setStartDate(v);
                    setActiveRange('');
                  }} />
              </div>

              {/* QUICK-FILTER BUTTONS — compact grid */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4, minmax(60px, 1fr))', gap:6, gridColumn:'1 / -1' }}>
                {(() => {
                  const btns = [
                    { key:'today', label:'Today', onClick:()=>{
                      const t = new Date();
                      const s = formatLocalDateYYYYMMDD(t);
                      setStartDate(s); setEndDate(s); setActiveRange('today');
                    }},
                    { key:'last7', label:'Last 7', onClick:()=>{
                      const t = new Date();
                      const end = new Date(t.getFullYear(), t.getMonth(), t.getDate());
                      const start = new Date(end); start.setDate(start.getDate()-6);
                      setStartDate(formatLocalDateYYYYMMDD(start));
                      setEndDate(formatLocalDateYYYYMMDD(end));
                      setActiveRange('last7');
                    }},
                    { key:'month', label:'Month', onClick:()=>{
                      const t = new Date();
                      const start = new Date(t.getFullYear(), t.getMonth(), 1);
                      const end = new Date(t.getFullYear(), t.getMonth(), t.getDate());
                      setStartDate(formatLocalDateYYYYMMDD(start));
                      setEndDate(formatLocalDateYYYYMMDD(end));
                      setActiveRange('month');
                    }},
                    { key:'clear', label:'Clear', onClick:()=>{ setStartDate(''); setEndDate(''); setActiveRange(''); }},
                  ];
                  return btns.map(b => {
                    const isActive = activeRange === b.key;
                    const style = isActive
                      ? { width:'100%', padding:'8px 0', fontSize:12, lineHeight:1.1, background:'var(--primary-color)', color:'#fff', border:'none' }
                      : { width:'100%', padding:'8px 0', fontSize:12, lineHeight:1.1 };
                    return (
                      <button key={b.key} type="button" className="btn-outline" style={style} onClick={b.onClick}>{b.label}</button>
                    );
                  });
                })()}
              </div>
            </div>
          </div>

          {loading && <div>Loading…</div>}
          {!loading && items.length === 0 && <div>No salary payments</div>}

          {!loading && (
            <div className="payments-grid">
              {items.map((it) => (
                <div key={it._id} className="doc-card payment-card">
                  <div className="payment-left">
                    <div className="payment-title">{it.doctor?.name || 'Doctor'}</div>
                    <div className="payment-phone">{it.doctor?.phoneNumber || ''}</div>
                    <div className="payment-date">{new Date(it.date || it.createdAt || Date.now()).toLocaleString()}</div>
                  </div>
                  <div className="payment-right">
                    <div className="payment-amount">₹{Number(it.amount || 0).toFixed(2)}</div>
                    <div className="payment-status">{it.status || 'paid'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      {authUser?.role === 1 && (
        <button
          className="fab"
          onClick={() => setShowModal(true)}
          aria-label="Create salary payment"
        >
          +
        </button>
      )}

      {showModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000 }} onClick={()=>setShowModal(false)}>
          <div style={{ width:'100%', maxWidth:640, margin:'0 16px' }} onClick={(e)=>e.stopPropagation()}>
            <div className="profile-card" style={{ padding: 20 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <h2 style={{ margin:0 }}>Create Salary Payment</h2>
              </div>
              <div style={{ display:'grid', gap:12 }}>
                <div>
                  <label style={{ display:'block', marginBottom:6 }}>Select Doctor</label>
                  {selectedDoctor ? (
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                      <div style={{ background:'#f1f5f9', padding:'6px 10px', borderRadius:8 }}>
                        {selectedDoctor.name} {selectedDoctor.phoneNumber ? `(${selectedDoctor.phoneNumber})` : ''}
                      </div>
                      <button className="btn-outline" onClick={()=>{ setSelectedDoctor(null); setDoctorId(''); setDoctorQuery(''); }}>
                        Change
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        value={doctorQuery}
                        onChange={(e)=>setDoctorQuery(e.target.value)}
                        className="text-input"
                        placeholder="Search doctor by name or phone"
                      />
                      {doctorQuery && (
                        <div style={{ marginTop:6, border:'1px solid #e5e7eb', borderRadius:8, maxHeight:180, overflow:'auto', background:'#fff' }}>
                          {searching && <div style={{ padding:8, color:'#64748b' }}>Searching…</div>}
                          {!searching && doctorResults.length === 0 && (
                            <div style={{ padding:8, color:'#64748b' }}>No doctors</div>
                          )}
                          {!searching && doctorResults.map((u)=> (
                            <button
                              key={u._id || u.id}
                              onClick={()=>{ setSelectedDoctor(u); setDoctorId(u._id || u.id); setDoctorResults([]); }}
                              style={{ display:'flex', width:'100%', textAlign:'left', gap:8, padding:'8px 10px', borderBottom:'1px solid #f1f5f9', background:'transparent', cursor:'pointer' }}
                            >
                              <span style={{ fontWeight:600 }}>{u.name}</span>
                              <span style={{ color:'#64748b' }}>{u.phoneNumber || ''}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div>
                    <label style={{ display:'block', marginBottom:6 }}>Amount (₹)</label>
                    <input value={amount} onChange={(e)=>setAmount(e.target.value)} className="text-input" placeholder="e.g., 5000" />
                  </div>
                  <div>
                    <label style={{ display:'block', marginBottom:6 }}>Date</label>
                    <input type="date" value={payDate} onChange={(e)=>setPayDate(e.target.value)} className="text-input" />
                  </div>
                </div>
                <div>
                  <label style={{ display:'block', marginBottom:6 }}>Status</label>
                  <select className="text-input" value={payStatus} onChange={(e)=>setPayStatus(e.target.value)}>
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button className="btn-primary btn-large" style={{ flex:1 }} onClick={handleCreate} disabled={loading}>{loading ? 'Creating...' : 'Create'}</button>
                  <button className="btn-outline btn-large" style={{ flex:1 }} onClick={()=>setShowModal(false)}>Cancel</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryPage;