import React, { useCallback, useEffect, useState } from 'react';
import '../styles/payments.css';
import { createPaymentLink, listPayments } from '../controllers/paymentController';

const PaymentsPage = () => {
  const [amount, setAmount] = useState('');
  // description and doctorPhoneNumber removed from create modal per request
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [payments, setPayments] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // debounce search text
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listPayments(statusFilter, 1, 50, undefined, debouncedSearch);
      const items = Array.isArray(list) ? list : Array.isArray(list?.data) ? list.data : [];
      // Client-side normalization + fallback filtering in case API ignores status
      const getStatus = (obj) => {
        const raw = (obj?.status || obj?.record?.status || obj?.payment_status || obj?.state || '').toString();
        return raw.trim().toLowerCase();
      };
      let filtered = items;
      if (statusFilter) {
        filtered = items.filter((it) => {
          const s = getStatus(it);
          if (statusFilter === 'paid') {
            return s === 'paid' || s === 'success' || s === 'captured' || s === 'completed';
          }
          if (statusFilter === 'created') {
            return s === 'created' || s === 'issued' || s === 'pending' || s === 'unpaid' || s === 'open';
          }
          return true;
        });
      }
      setPayments(filtered);
    } catch (e) {
      console.error('list payments error', e);
      alert(e.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleGenerate() {
    if (!amount || Number(amount) <= 0) {
      alert('Enter a valid amount (in rupees)');
      return;
    }
    try {
      const rupees = Number(amount);
      const paise = Math.round(rupees * 100);
      const payload = {
        amount: paise,
        currency: 'INR',
        customerName: customerName || undefined,
        customer: { name: customerName || undefined, email: customerEmail || undefined },
      };
      setLoading(true);
      const res = await createPaymentLink(payload);
      await load();
      setAmount('');
      setCustomerName('');
      setCustomerEmail('');
      setShowModal(false);
      if (res && res.paymentLink && res.paymentLink.short_url) {
        try {
          await navigator.clipboard.writeText(res.paymentLink.short_url);
          alert('Payment link created and copied to clipboard');
        } catch {
          window.open(res.paymentLink.short_url, '_blank');
        }
      } else {
        alert('Payment link created');
      }
    } catch (e) {
      console.error('create link error', e);
      alert(e.message || 'Failed to create link');
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text, id) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => {
      alert('Copy failed');
    });
  }

  return (
    <div className="PaymentsPage">
      <header className="home-header">
        <h1 className="manage">Customer Payments</h1>
      </header>

      <main className="payments-section">
        <section>
          <div className="payments-toolbar">
            <div className="payments-toolbar-row">
              <h3>Recent links</h3>
              <div className="spacer" />
              <select className="payments-select" value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)}>
                <option value="">All</option>
                <option value="created">Created</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            <div className="payments-toolbar-row">
              <input
                className="payments-search"
                value={search}
                onChange={(e)=>setSearch(e.target.value)}
                placeholder="Search (phone, desc, amount)"
                aria-label="Search payments"
              />
            </div>
          </div>
          {loading && <div>Loading…</div>}
          {!loading && payments.length === 0 && <div>No payment links</div>}
          <div className="payments-grid">
            {payments.map((p) => {
              const url = p.shortUrl || p.record?.shortUrl || p.short_url || p.razorpayLinkId || '';
              return (
                <div key={p._id || url} className="doc-card payment-card">
                  <div className="payment-left">
                    <div className="payment-title">{p.customer?.name || p.record?.customer?.name || p.record?.customerName || p.customerName || 'Payment'}</div>
                    <div className="payment-phone">{p.doctorPhoneNumber || p.doctor?.phoneNumber || ''}</div>
                    <div className="payment-url">{url}</div>
                    <div className="payment-date">{new Date(p.createdAt || p.record?.createdAt || Date.now()).toLocaleString()}</div>
                  </div>
                  <div className="payment-right">
                    <div className="payment-amount">₹{((p.amount||p.record?.amount||0)/100).toFixed(2)}</div>
                    <div className="payment-status">{p.status || p.record?.status || 'unknown'}</div>
                    <div className="payment-actions">
                      { url && (
                        <button className="btn-outline" onClick={() => copyToClipboard(url, p._id)}>
                          {copiedId === p._id ? 'Copied' : 'Copy link'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Floating action button to open create form */}
      <button
        className="fab"
        onClick={() => setShowModal(true)}
        aria-label="Create payment link"
      >
        +
      </button>

      {/* Modal for create */}
      {showModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
        }} onClick={() => setShowModal(false)}>
          <div style={{ width: '100%', maxWidth: 640, margin: '0 16px' }} onClick={(e)=>e.stopPropagation()}>
            <div className="profile-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h2 style={{ margin: 0 }}>Create Payment Link</h2>
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 6 }}>Customer name</label>
                    <input value={customerName} onChange={(e)=>setCustomerName(e.target.value)} className="text-input" placeholder="Customer name" />
                  </div>
                  {/* <div>
                    <label style={{ display: 'block', marginBottom: 6 }}>Customer email</label>
                    <input value={customerEmail} onChange={(e)=>setCustomerEmail(e.target.value)} className="text-input" placeholder="customer@example.com" />
                  </div> */}
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6 }}>Amount (₹)</label>
                  <input value={amount} onChange={(e)=>setAmount(e.target.value)} className="text-input" placeholder="e.g., 100" />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-primary btn-large" style={{ flex: 1 }} onClick={handleGenerate} disabled={loading}>{loading ? 'Creating...' : 'Generate Link'}</button>
                  <button className="btn-outline btn-large" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentsPage;
