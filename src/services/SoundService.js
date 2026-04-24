/**
 * SoundService - Procedural Audio Synthesis Engine
 * Designed for MovilizaSon CRM "Editorial Noir" Interface.
 * Simulates a high-security electronic safe/vault.
 */

class SoundService {
  constructor() {
    this.context = null;
    this.masterGain = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.context.createGain();
      this.masterGain.connect(this.context.destination);
      this.initialized = true;
      console.log("Sound Engine Initialized");
    } catch (e) {
      console.error("Web Audio API not supported", e);
    }
  }

  resume() {
    if (this.context && this.context.state === 'suspended') {
      this.context.resume();
    }
  }

  /**
   * High-security keypad click
   * Mix of a low "thud" and a high digital "chirp"
   */
  playKeyClick() {
    if (!this.initialized) this.init();
    this.resume();

    const t = this.context.currentTime;
    
    // 1. Digital "Pik" (High transient)
    const osc1 = this.context.createOscillator();
    const gain1 = this.context.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1200, t);
    osc1.frequency.exponentialRampToValueAtTime(800, t + 0.05);
    
    gain1.gain.setValueAtTime(0.15, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    
    // 2. Mechanical "Clunk" (Low body)
    const osc2 = this.context.createOscillator();
    const gain2 = this.context.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(60, t);
    
    gain2.gain.setValueAtTime(0.2, t);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    // Stereo Depth (Short delay)
    const delay = this.context.createDelay(0.1);
    delay.delayTime.setValueAtTime(0.015, t);
    const delayGain = this.context.createGain();
    delayGain.gain.setValueAtTime(0.05, t);

    // Connections
    osc1.connect(gain1);
    osc2.connect(gain2);
    
    gain1.connect(this.masterGain);
    gain2.connect(this.masterGain);
    
    gain1.connect(delay);
    delay.connect(delayGain);
    delayGain.connect(this.masterGain);

    osc1.start(t);
    osc1.stop(t + 0.05);
    osc2.start(t);
    osc2.stop(t + 0.08);
  }

  /**
   * Heavy Vault Door Unlocked
   * Cinematic sub-thump and a mechanical sliding sound
   */
  playAccessGranted() {
    if (!this.initialized) this.init();
    this.resume();

    const t = this.context.currentTime;

    // 1. Sub-Bass Thump
    const sub = this.context.createOscillator();
    const subGain = this.context.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(30, t);
    sub.frequency.exponentialRampToValueAtTime(20, t + 0.5);
    subGain.gain.setValueAtTime(0.4, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

    // 2. Resonant Filter Sweep (Mechanical feel)
    const noise = this.context.createOscillator(); // Using sawtooth for texture
    const filter = this.context.createBiquadFilter();
    const noiseGain = this.context.createGain();
    
    noise.type = 'sawtooth';
    noise.frequency.setValueAtTime(40, t);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, t);
    filter.frequency.exponentialRampToValueAtTime(100, t + 0.6);
    filter.Q.setValueAtTime(10, t);

    noiseGain.gain.setValueAtTime(0.05, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

    // Final reverb-like envelope
    const verb = this.context.createDelay(1.0);
    verb.delayTime.setValueAtTime(0.1, t);
    const verbGain = this.context.createGain();
    verbGain.gain.setValueAtTime(0.1, t);
    verbGain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

    sub.connect(subGain);
    subGain.connect(this.masterGain);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    
    noiseGain.connect(verb);
    verb.connect(verbGain);
    verbGain.connect(this.masterGain);

    sub.start(t);
    sub.stop(t + 0.8);
    noise.start(t);
    noise.stop(t + 0.6);
  }

  /**
   * System Denied / Error
   * Low discordant pulse
   */
  playAccessDenied() {
    if (!this.initialized) this.init();
    this.resume();

    const t = this.context.currentTime;
    
    const o1 = this.context.createOscillator();
    const o2 = this.context.createOscillator();
    const g = this.context.createGain();

    o1.type = 'sawtooth';
    o2.type = 'sawtooth';
    o1.frequency.setValueAtTime(100, t);
    o2.frequency.setValueAtTime(103, t); // Dissonance

    g.gain.setValueAtTime(0.2, t);
    g.gain.setValueAtTime(0.001, t + 0.1);
    g.gain.setValueAtTime(0.2, t + 0.15);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    o1.connect(g);
    o2.connect(g);
    g.connect(this.masterGain);

    o1.start(t);
    o1.stop(t + 0.4);
    o2.start(t);
    o2.stop(t + 0.4);
  }

  /**
   * Splash Intro
   * Atmospheric cinematic sweep
   */
  playIntro() {
    if (!this.initialized) this.init();
    this.resume();

    const t = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(40, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 2);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(40, t);
    filter.frequency.exponentialRampToValueAtTime(1000, t + 1.5);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 2.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 2.5);
  }
}

export default new SoundService();
