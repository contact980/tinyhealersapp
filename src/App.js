import React, { useState } from 'react';
import './App.css';
import './styles/colors.css';
import HomePage2 from './pages/HomePage2';
import AuthPage from './pages/AuthPage';

function App() {
  const [view, setView] = useState(() => {
    try {
      const stored = localStorage.getItem('auth');
      return stored ? 'home' : 'auth';
    } catch (e) {
      return 'auth';
    }
  }); // 'home' | 'auth'

  return (
    <div className="App">
      {view === 'auth' ? <AuthPage onLogin={() => setView('home')} /> : <HomePage2 onShowAuth={() => setView('auth')} />}
    </div>
  );
}

export default App;
