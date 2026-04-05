import { useState, useCallback, useRef, useEffect } from 'react';

export function useAlarm() {
  const [isAlarming, setIsAlarming] = useState(false);
  const [alarmMessage, setAlarmMessage] = useState(null);
  const audioRef = useRef(null);
  const vibrateIntervalRef = useRef(null);
  const timeoutRef = useRef(null);

  const stopAlarm = useCallback(() => {
    setIsAlarming(false);
    setAlarmMessage(null);
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (vibrateIntervalRef.current) {
      clearInterval(vibrateIntervalRef.current);
      vibrateIntervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    // Stop vibration
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
  }, []);

  const triggerAlarm = useCallback((message) => {
    setIsAlarming(true);
    setAlarmMessage(message);

    // Play alarm sound using Web Audio API for a generated tone
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      
      const playTone = (freq, startTime, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        gain.gain.value = 0.3;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      
      // Create repeating alarm pattern for 30 seconds
      const now = ctx.currentTime;
      for (let i = 0; i < 30; i++) {
        playTone(880, now + (i * 1), 0.25);
        playTone(660, now + (i * 1) + 0.3, 0.25);
        playTone(880, now + (i * 1) + 0.6, 0.15);
      }
      
      audioRef.current = { pause: () => ctx.close(), currentTime: 0 };
    } catch (e) {
      console.warn('Audio not available:', e);
    }

    // Vibration pattern (repeating)
    if ('vibrate' in navigator) {
      const pattern = [500, 200, 500, 200, 500, 500];
      vibrateIntervalRef.current = setInterval(() => {
        navigator.vibrate(pattern);
      }, 2400);
      navigator.vibrate(pattern);
    }

    // Auto-stop after 30 seconds
    timeoutRef.current = setTimeout(() => {
      stopAlarm();
    }, 30000);
  }, [stopAlarm]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopAlarm();
  }, [stopAlarm]);

  return { isAlarming, alarmMessage, triggerAlarm, stopAlarm };
}
