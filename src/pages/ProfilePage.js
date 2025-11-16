import React, { useState, useEffect } from 'react';
import '../styles/profile.css';
import { updateUser } from '../controllers/homeController';

const ProfilePage = ({ onLogout }) => {
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [degree, setDegree] = useState('');
  const [hospital, setHospital] = useState('');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('auth');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.user) {
          setUser(parsed.user);
          setName(parsed.user.name || '');
          setDegree(parsed.user.degree || '');
          setHospital(parsed.user.hospital || '');
        }
      }
    } catch (e) {}
  }, []);

  // Prevent browser back navigation from leaving the profile page
  useEffect(() => {
    if (typeof window === 'undefined' || !window.history || !window.history.pushState) return;
    try {
      window.history.pushState({ stayOnProfile: true }, '');
    } catch (e) {}
    const onPop = () => {
      try {
        window.history.pushState({ stayOnProfile: true }, '');
      } catch (e) {}
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  async function handleUpdate() {
    if (!user) return;
    try {
      const stored = localStorage.getItem('auth');
      let token = null;
      if (stored) {
        const parsed = JSON.parse(stored);
        token = parsed.token;
      }
      const payload = user?.role === 1 ? { name } : { name, degree, hospital };
      const updated = await updateUser(user._id, payload, token);
      // persist updated user in localStorage
      try {
        const stored = localStorage.getItem('auth');
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.user = updated;
          localStorage.setItem('auth', JSON.stringify(parsed));
        }
      } catch (e) {}
      setUser(updated);
      alert('Profile updated');
    } catch (e) {
      console.error('updateUser error', e);
      alert(e.message || 'Failed to update profile');
    }
  }

  function handleLogout() {
    if (!window.confirm('Are you sure you want to logout?')) return;
    // clear all local storage data (including auth)
    try {
      localStorage.clear();
    } catch (e) {}
    // navigate via parent
    if (onLogout) onLogout();
  }

  return (
    <div className="ProfilePage">
      <header className="profile-header">
        <h2>{user?.role === 1 ? 'Admin Profile' : 'Doctor Profile'}</h2>
      </header>

      <main className="profile-main">
        <section className="profile-card">
          <h3 className="card-title">Profile Details</h3>

          <label className="field-label">Name</label>
          <input className="text-input" value={name} onChange={(e) => setName(e.target.value)} />

          {user?.role !== 1 && (
            <>
              <label className="field-label">Degree</label>
              <input className="text-input" value={degree} onChange={(e) => setDegree(e.target.value)} />

              <label className="field-label">Current Hospital Working at (Optional)</label>
              <input className="text-input" value={hospital} onChange={(e) => setHospital(e.target.value)} />
            </>
          )}

          <label className="field-label">Phone Number</label>
          <input className="text-input disabled" defaultValue={user?.phoneNumber || user?.phone || ''} disabled />
        </section>

        <button className="btn-primary btn-large update-btn" onClick={handleUpdate}>Update</button>
        <button className="btn-outline btn-large logout-btn" onClick={handleLogout}>Logout</button>
      </main>
    </div>
  );
};

export default ProfilePage;


