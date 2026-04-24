import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import { Delete, Shield } from 'lucide-react';
import './MobileLogin.css';
import oblivionLogo from '../assets/oblivion_logo.png';
import SoundService from '../services/SoundService';

export default function MobileLogin() {
  const navigate = useNavigate();
  const { allUsers, setCurrentUser } = useRole();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (pin.length === 6) {
      handleLogin();
    }
  }, [pin]);

  const handleKeyPress = (num) => {
    if (pin.length < 6) {
      SoundService.playKeyClick();
      if (window.navigator.vibrate) window.navigator.vibrate(10);
      setPin(prev => prev + num);
      setError('');
    }
  };

  const handleDelete = () => {
    if (window.navigator.vibrate) window.navigator.vibrate(5);
    setPin(prev => prev.slice(0, -1));
  };

  const handleLogin = () => {
    setLoading(true);
    
    // Simulate thinking delay for premium feel
    setTimeout(() => {
      const foundUser = allUsers.find(u => String(u.pin) === pin);
      
      if (foundUser) {
        SoundService.playAccessGranted();
        if (window.navigator.vibrate) window.navigator.vibrate([20, 10, 20]);
        setCurrentUser(foundUser);
        navigate('/dashboard');
      } else {
        SoundService.playAccessDenied();
        setError('PIN de acceso denegado');
        setPin('');
        setLoading(false);
        if (window.navigator.vibrate) window.navigator.vibrate(200);
      }
    }, 600);
  };

  const keypadItems = [
    { num: '1', letters: '' },
    { num: '2', letters: 'ABC' },
    { num: '3', letters: 'DEF' },
    { num: '4', letters: 'GHI' },
    { num: '5', letters: 'JKL' },
    { num: '6', letters: 'MNO' },
    { num: '7', letters: 'PQRS' },
    { num: '8', letters: 'TUV' },
    { num: '9', letters: 'WXYZ' },
    { num: '', letters: '', type: 'empty' },
    { num: '0', letters: '+' },
    { num: 'back', letters: '', type: 'back' }
  ];

  return (
    <div className="mobile-login-container">
      <div className="mobile-login-header">
        <img src={oblivionLogo} alt="Logo" className="mobile-login-logo" />
        <h1 className="mobile-login-title">MovilizaSon</h1>
        <p className="mobile-login-subtitle">Inteligencia Electoral</p>
      </div>

      <div className="pin-display">
        {[...Array(6)].map((_, i) => (
          <div key={i} className={`pin-dot ${i < pin.length ? 'filled' : ''}`} />
        ))}
      </div>

      <div className="mobile-login-error">
        {error}
      </div>

      <div className="keypad-grid">
        {keypadItems.map((item, idx) => (
          <button 
            key={idx}
            className={`keypad-btn ${item.type ? 'action' : ''}`}
            onClick={() => {
              if (item.type === 'back') handleDelete();
              else if (item.num) handleKeyPress(item.num);
            }}
            disabled={loading || (item.type === 'empty')}
          >
            {item.type === 'back' ? (
              <Delete size={24} color="rgba(255,255,255,0.6)" />
            ) : item.type === 'empty' ? null : (
              <>
                <span className="keypad-number">{item.num}</span>
                <span className="keypad-letters">{item.letters}</span>
              </>
            )}
          </button>
        ))}
      </div>

      <div className="mobile-login-footer">
        ACCESO RESTRINGIDO<br />
        Desarrollado por Oblivion Inc © 2026
      </div>
    </div>
  );
}
