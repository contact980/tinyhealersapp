import React, { useState, useEffect, useRef } from 'react';
import '../styles/auth-page.css';
import { requestOtp, verifyOtp } from '../controllers/authController';

function formatTime(seconds) {
  const mm = String(Math.floor(seconds / 60)).padStart(1, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

const KEYPAD = [
  '1','2','3',
  '4','5','6',
  '7','8','9',
  '','0','back'
];

const AuthPage = ({ onLogin }) => {
  const [view, setView] = useState('landing'); // 'landing' | 'phone' | 'otp'
  const [role, setRole] = useState(null); // 'doctor' | 'admin'
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(300);
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);
  const otpInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    function check() {
      setIsMobile(window.innerWidth < 900);
    }
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  function startLogin(selectedRole) {
    setRole(selectedRole);
    setPhone('');
    setOtp('');
    setView('phone');
  }

  function startOtpTimer() {
    setSecondsLeft(300);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  function handleKeypadPress(key) {
    if (key === 'back') {
      handleBackspace();
      return;
    }
    if (!key) return;

    if (view === 'phone') {
      setPhone((p) => (p.length < 10 ? p + key : p));
    } else if (view === 'otp') {
      setOtp((o) => (o.length < 4 ? o + key : o));
    }
  }

  function handleBackspace() {
    if (view === 'phone') {
      setPhone((p) => p.slice(0, -1));
    } else if (view === 'otp') {
      setOtp((o) => o.slice(0, -1));
    }
  }

  function handleContinue() {
    if (phone.length === 10) {
      // call backend to request OTP
      (async () => {
        try {
          const numericRole = role === 'admin' ? 1 : 3;
          await requestOtp(phone, numericRole);
          setView('otp');
          setOtp('');
          startOtpTimer();
          setToast({ type: 'success', message: 'OTP sent' });
        } catch (err) {
          console.error('requestOtp error', err);
          let message = err.message || 'Failed to request OTP';
          const isMismatch = err && err.status === 403;
          if (isMismatch) {
            const suggestion = role === 'admin' ? 'Please login through Doctor.' : 'Please login through Admin.';
            message = `Role mismatch. ${suggestion}`;
          }
          setToast({ type: 'error', message });
          if (isMismatch) {
            // Navigate immediately but keep toast visible
            setView('landing');
            setPhone('');
            setOtp('');
            window.setTimeout(() => {
              setToast(null);
            }, 7000);
          }
        }
      })();
    }
  }

  function handleSubmit() {
    if (otp.length === 4) {
      (async () => {
        try {
          const result = await verifyOtp(phone, otp);
          // result expected to include token and user
          console.log('verifyOtp result', result);
          if (onLogin) onLogin();
        } catch (err) {
          console.error('verifyOtp error', err);
          alert(err.message || 'OTP verification failed');
        }
      })();
    }
  }

  function resendOtp() {
    setOtp('');
    startOtpTimer();
    // trigger resend in real app
  }

  function changeNumber() {
    setOtp('');
    setView('phone');
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  return (
    <div className="AuthPage">
      <div className="auth-card">
        {toast && (
          <div
            className={`toast ${toast.type}`}
            role="status"
            aria-live="polite"
            style={{
              position: 'fixed',
              top: 16,
              right: 16,
              background: toast.type === 'error' ? '#fef2f2' : '#ecfdf5',
              color: toast.type === 'error' ? '#991b1b' : '#065f46',
              border: `1px solid ${toast.type === 'error' ? '#fecaca' : '#a7f3d0'}`,
              borderRadius: 8,
              padding: '10px 12px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              zIndex: 1000,
              fontSize: 14,
            }}
          >
            {toast.message}
          </div>
        )}
        {!(isMobile && (view === 'phone' || view === 'otp')) && (
          <img
            className="auth-image"
            src="/image.png"
            alt="doctor"
          />
        )}

        {view === 'landing' && (
          <div className="auth-content">
            <h3 className="welcome">Welcome to</h3>
            <h1 className="brand">
              Tiny
              <br />
              Healers
            </h1>
            <button
              className="btn-primary btn-large"
              onClick={() => startLogin('doctor')}
            >
              Doctor Login
            </button>
            <button
              className="btn-outline btn-large"
              onClick={() => startLogin('admin')}
            >
              Admin Login
            </button>
            <p className="subtitle">Secure & Reliable Healthcare Management</p>
          </div>
        )}

        {view === 'phone' && (
          <div className="auth-content phone-screen">
            <h2 className="otp-title">
              OTP
              <br />
              VERIFICATION<span className="dot">.</span>
            </h2>
            <p className="otp-sub">Enter your mobile number to continue</p>

            <div className="phone-input">
              <div className="country">
                <span className="flag">🇮🇳</span>
                <span className="code">+91</span>
              </div>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Mobile Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="input-field"
              />
            </div>

            <button
              className={`btn-primary btn-large ${phone.length === 10 ? '' : 'disabled'}`}
              onClick={handleContinue}
              disabled={phone.length !== 10}
            >
              CONTINUE
            </button>

            <div className="keypad" role="application" aria-label="numeric keypad">
              {KEYPAD.map((k, idx) => (
                <button
                  key={idx}
                  className={`key ${k === 'back' ? 'key-back' : ''}`}
                  onClick={() => handleKeypadPress(k)}
                  aria-label={k === 'back' ? 'backspace' : `key ${k}`}
                >
                  {k === 'back' ? '⌫' : k}
                </button>
              ))}
            </div>
          </div>
        )}

        {view === 'otp' && (
          <div className="auth-content otp-screen">
            <h2 className="otp-title">
              OTP
              <br />
              VERIFICATION<span className="dot">.</span>
            </h2>
            <p className="otp-sub">Enter the OTP sent to {phone || 'xxxxxxx'}</p>

            {/* hidden input allows keyboard entry on mobile/desktop while visible boxes show values */}
            <input
              ref={otpInputRef}
              className="otp-hidden-input"
              type="tel"
              inputMode="numeric"
              maxLength={4}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
              aria-label="OTP input"
            />

            <div className="otp-boxes" aria-hidden="false" onClick={() => otpInputRef.current?.focus()}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="otp-box">
                  {otp[i] || ''}
                </div>
              ))}
            </div>

            <div className="otp-actions">
              <div className="resend">
                Didn't receive OTP? <button className="link" onClick={resendOtp}>Resend OTP</button>
              </div>
              <button className="link change" onClick={changeNumber}>Change number</button>
            </div>

            <div className="timer">Time remaining: {formatTime(secondsLeft)}</div>

            <button
              className={`btn-primary btn-large ${otp.length === 4 ? '' : 'disabled'}`}
              onClick={handleSubmit}
              disabled={otp.length !== 4}
            >
              SUBMIT
            </button>

            <div className="keypad" role="application" aria-label="numeric keypad">
              {KEYPAD.map((k, idx) => (
                <button
                  key={idx}
                  className={`key ${k === 'back' ? 'key-back' : ''}`}
                  onClick={() => handleKeypadPress(k)}
                >
                  {k === 'back' ? '⌫' : k}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthPage;

