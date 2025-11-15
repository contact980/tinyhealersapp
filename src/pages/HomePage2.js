import React, { useState, useEffect } from 'react';
import '../styles/homepage.css';
import DoctorDetails from './DoctorDetails';
import { fetchUsers, fetchUserById } from '../controllers/homeController';
const ProfilePage = React.lazy(() => import('./ProfilePage'));
const PaymentsPage = React.lazy(() => import('./PaymentsPage'));

const doctors = [
  { name: 'rakshitha di 2', title: 'petful', online: false, phone: '+91 7829999992' },
  { name: 'Dr. Sneha Reddy', title: 'General Physician', online: true, phone: '+91 1098765432' },
  { name: 'Dr. tirumareddi naresh', title: 'mbbs', online: true, phone: '+91 1234567898' },
  { name: 'Dr. Rahul Sharma', title: 'Orthopedic', online: true, phone: '+91 8765432109' },
];

const HomePage2 = ({ onShowAuth }) => {
  const [active, setActive] = useState('home'); // 'home' | 'profile'
  const [openDoctor, setOpenDoctor] = useState(null);
  const [creating, setCreating] = useState(false);
  const [savedScroll, setSavedScroll] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [authUser, setAuthUser] = useState(null);

  useEffect(() => {
    // load auth from localStorage if present
    try {
      const stored = localStorage.getItem('auth');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.user) setAuthUser(parsed.user);
      }
    } catch (e) {}
  }, []);

  // Prevent browser "back" from navigating away while on this page.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.history || !window.history.pushState) return;
    try {
      window.history.pushState({ stayOnHome: true }, '');
    } catch (e) {}
    const onPop = () => {
      try {
        // re-push state to keep user on this page
        window.history.pushState({ stayOnHome: true }, '');
      } catch (e) {}
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    // if role is 3 (doctor) show only that user
    if (authUser && authUser.role === 3) {
      setUsers([authUser]);
      setHasMore(false);
      return;
    }

    // otherwise load first page
    loadUsers(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser]);

  useEffect(() => {
    function onScroll() {
      if (!hasMore || loading || active !== 'home') return;
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 300) {
        loadUsers(page + 1);
      }
    }
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, loading, hasMore, active]);

  // show "move to top" button when scrolled down
  useEffect(() => {
    function checkScroll() {
      const y = typeof window !== 'undefined' ? (window.scrollY || window.pageYOffset) : 0;
      setShowScrollTop(y > 220);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', checkScroll);
      checkScroll();
    }
    return () => {
      if (typeof window !== 'undefined') window.removeEventListener('scroll', checkScroll);
    };
  }, []);

  async function loadUsers(nextPage = 1) {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetchUsers(nextPage, 10);
      // assume res is array
      if (Array.isArray(res)) {
        setUsers((prev) => (nextPage === 1 ? res : [...prev, ...res]));
        setPage(nextPage);
        setHasMore(res.length === 10);
      } else {
        // if API returns wrapper { data, total } adapt as needed
        setHasMore(false);
      }
    } catch (e) {
      console.error('fetchUsers error', e);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }

  const formatPhone = (p) => {
    if (!p) return '';
    const s = String(p).trim();
    if (s.startsWith('+91')) return s;
    const digits = s.replace(/\D/g, '');
    if (digits.length === 10) return `+91 ${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return `+${digits.slice(0,2)} ${digits.slice(2)}`;
    return s;
  };

  const capitalizeWords = (str) => {
    if (!str) return '';
    return String(str)
      .split(' ')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  // determine which users to show: if logged-in user is a doctor (role 3) show only them
  const visibleUsers = authUser && authUser.role === 3 ? [authUser] : users;

  return (
    <div className="Home2">
      {openDoctor || creating ? (
        <DoctorDetails
          doctor={openDoctor}
          mode={creating ? 'create' : 'view'}
          onClose={(opts) => {
            setOpenDoctor(null);
            setCreating(false);
            if (opts && opts.reload) {
              loadUsers(1);
            }
            if (typeof window !== 'undefined') {
              // restore scroll after closing (allow DOM to settle)
              setTimeout(() => window.scrollTo({ top: savedScroll }), 0);
            }
          }}
        />
      ) : active === 'home' ? (
        <>
          <header className="home-header">
            <div className="greeting">Welcome, Admin!</div>
            <h1 className="manage">Manage your Dashboard</h1>
          </header>

          <main className="home-main">
            {visibleUsers.map((d, i) => (
              <article
                key={d._id || i}
                className="doc-card"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    setSavedScroll(window.scrollY || window.pageYOffset);
                    window.scrollTo({ top: 0 });
                  }
                  setOpenDoctor(d);
                }}
              >
                <div className="doc-left">
                  <div className="doc-name">{capitalizeWords(d.name)}</div>
                  <div className="doc-title">{capitalizeWords(d.degree || d.title)}</div>
                  <div className="doc-phone">{formatPhone(d.phoneNumber || d.phone)}</div>
                </div>
                <div className="doc-right">
                  <div className="doc-status">
                    <span className={`status-dot ${d.isOnline ? 'online' : 'offline'}`} />
                    <span className={`status-text ${d.isOnline ? 'online' : 'offline'}`}>{d.isOnline ? 'Online' : 'Offline'}</span>
                  </div>
                  <button
                    className="call-btn"
                    aria-label={`call ${d.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      const raw = d.phoneNumber || d.phone || '';
                      const digits = String(raw).replace(/\D/g, '');
                      if (!digits) {
                        alert('No phone number available');
                        return;
                      }
                      // open system dialer with digits only (no "+91" prefix)
                      window.location.href = `tel:${digits}`;
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.06-.24c1.2.48 2.5.74 3.85.74a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 5a1 1 0 011-1h3.5a1 1 0 011 1c0 1.35.26 2.65.74 3.85a1 1 0 01-.24 1.06l-2.21 2.21z" fill="#fff"/>
                    </svg>
                  </button>
                </div>
              </article>
            ))}
            {loading && <div style={{textAlign: 'center', padding: 12}}>Loading…</div>}
          </main>
          <button
            className={`scroll-top-btn ${showScrollTop ? 'show' : ''}`}
            aria-label="Move to top"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <svg className="icon" viewBox="0 0 24 24" fill="none" width="18" height="18" aria-hidden="true">
              <path d="M12 8l4 4H8l4-4z" fill="currentColor"/>
            </svg>
            Move to top
          </button>
        </>
      ) : active === 'profile' ? (
        <React.Suspense fallback={<div style={{textAlign:'center'}}>Loading...</div>}>
          <ProfilePage onLogout={() => {
            if (window.confirm('Logout?')) {
              onShowAuth && onShowAuth();
            }
          }} />
        </React.Suspense>
      ) : active === 'payments' ? (
        <React.Suspense fallback={<div style={{textAlign:'center'}}>Loading...</div>}>
          <PaymentsPage />
        </React.Suspense>
      ) : null}

      {active === 'home' && !(openDoctor || creating) && !(authUser && authUser.role === 3) && (
        <button
          className="fab"
          aria-label="add"
          onClick={() => {
            if (typeof window !== 'undefined') {
              setSavedScroll(window.scrollY || window.pageYOffset);
              window.scrollTo({ top: 0 });
            }
            setCreating(true);
          }}
        >
          +
        </button>
      )}

      <nav className="bottom-nav" role="navigation" aria-label="main navigation">
        <button className={`nav-item ${active === 'home' ? 'active' : ''}`} aria-label="home" onClick={() => { 
            // restore scroll when returning to home
            setActive('home'); 
            setOpenDoctor(null); 
            setCreating(false); 
            if (typeof window !== 'undefined' && savedScroll) {
              setTimeout(() => window.scrollTo({ top: savedScroll }), 0);
            }
          }}>
          <svg className="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M3 10.5L12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10.5z" fill="currentColor"/>
          </svg>
          <span className="nav-label">Home</span>
        </button>
        {!(authUser && authUser.role === 3) && (
          <button className={`nav-item ${active === 'payments' ? 'active' : ''}`} aria-label="payments" onClick={() => { 
              // save scroll and open payments at top
              if (typeof window !== 'undefined') {
                setSavedScroll(window.scrollY || window.pageYOffset);
                window.scrollTo({ top: 0 });
              }
              setActive('payments'); 
              setOpenDoctor(null); 
              setCreating(false); 
            }}>
            <svg className="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <text x="12" y="18" textAnchor="middle" fontSize="20" fontWeight="700" fill="currentColor">₹</text>
            </svg>
            <span className="nav-label">Payments</span>
          </button>
        )}
        <button className={`nav-item ${active === 'profile' ? 'active' : ''}`} aria-label="profile" onClick={() => { 
            // save scroll and open profile at top
            if (typeof window !== 'undefined') {
              setSavedScroll(window.scrollY || window.pageYOffset);
              window.scrollTo({ top: 0 });
            }
            setActive('profile'); 
            setOpenDoctor(null); 
            setCreating(false); 
          }}>
          <svg className="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-5 0-9 2.5-9 5v1h18v-1c0-2.5-4-5-9-5z" fill="currentColor"/>
          </svg>
          <span className="nav-label">Profile</span>
        </button>
      </nav>
    </div>
  );
};

export default HomePage2;


