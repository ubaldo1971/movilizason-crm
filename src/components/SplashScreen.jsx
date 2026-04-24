import { useState, useEffect } from 'react';
import './SplashScreen.css';
import oblivionLogo from '../assets/oblivion_logo.png';
import SoundService from '../services/SoundService';

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    // Check if splash has already been shown in this session
    const hasShown = sessionStorage.getItem('splash_shown');
    
    if (!hasShown) {
      setShouldRender(true);
      setIsVisible(true);
    }
  }, []);

  const handleInitialize = () => {
    if (hasInteracted) return;
    setHasInteracted(true);
    
    // Play the atmospheric intro sound
    SoundService.playIntro();

    // Set timer to start fading out
    const fadeTimer = setTimeout(() => {
      setIsVisible(false);
      sessionStorage.setItem('splash_shown', 'true');
    }, 2800); // 3 seconds visible

    // Set timer to remove from DOM
    const destroyTimer = setTimeout(() => {
      setShouldRender(false);
    }, 4000); // 3s + 1s transition
  };

  if (!shouldRender) return null;

  return (
    <div 
      className={`splash-container ${!isVisible ? 'hidden' : ''}`}
      onClick={handleInitialize}
      style={{ cursor: !hasInteracted ? 'pointer' : 'default' }}
    >
      <div className="splash-logo-wrapper">
        <img src={oblivionLogo} alt="Oblivion Inc" className="splash-logo" />
      </div>
      
      <div className="splash-branding">
        <h2 className="splash-title">OBLIVION INC</h2>
        <p className="splash-subtitle">INTELIGENCIA ESTATAL</p>
      </div>

      {!hasInteracted && (
        <div className="splash-interaction-hint">
          <span className="blink-text">[ PULSA PARA ESTABLECER CONEXIÓN SEGURA ]</span>
        </div>
      )}

      <div className="splash-footer">
        Powered by High-End Tactical Systems
      </div>
    </div>
  );
}
