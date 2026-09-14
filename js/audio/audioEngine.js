/**
 * 3D Interactive Wave & Acoustics Laboratory
 * Web Audio API Synthesis Engine
 */

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.compressor = null;
    this.sourceNodes = new Map(); // id -> { osc, gain, panner }
    this.isMuted = true; // Start muted until user clicks Enable Sound
    this.masterVolume = 0.5;
    this.isInitialized = false;
    
    // Pitch mapping base frequency (Hz)
    this.basePitch = 220; // A3
    this.isBeatMode = false;
    this.isPaused = false;
  }

  /**
   * Initializes or resumes AudioContext upon user gesture
   */
  async init() {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      // Dynamics compressor / brickwall limiter to protect hearing
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-12, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(4, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);

      this.masterGain = this.ctx.createGain();
      const initialGain = (this.isMuted || this.isPaused) ? 0 : this.masterVolume;
      this.masterGain.gain.setValueAtTime(initialGain, this.ctx.currentTime);

      this.compressor.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.isInitialized = true;
    } catch (e) {
      console.warn('AudioContext initialization failed:', e);
    }
  }

  /**
   * Smoothly pause or resume audio playback with simulation state
   */
  setSimulationPaused(isPaused) {
    this.isPaused = isPaused;
    if (this.masterGain && this.ctx) {
      const target = (this.isMuted || this.isPaused) ? 0 : this.masterVolume;
      this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.04);
    }
  }

  /**
   * Update or sync audio oscillators with simulation sources
   */
  syncWithSources(sources, receiverPos = null, movingSrcMgr = null) {
    if (!this.isInitialized || !this.ctx || this.ctx.state !== 'running') {
      return;
    }

    const currentIds = new Set();

    sources.forEach((src, idx) => {
      if (!src.active) return;
      currentIds.add(src.id);

      // Compute observed frequency with Doppler effect if source is moving
      let effFreq = src.frequency || 1.0;
      if (movingSrcMgr && receiverPos) {
        try {
          if (typeof movingSrcMgr.getDopplerShift === 'function') {
            effFreq = movingSrcMgr.getDopplerShift(src, receiverPos);
          }
        } catch (err) {
          console.warn('Audio Doppler calculation warning:', err);
          effFreq = src.frequency || 1.0;
        }
      }

      // Map simulation frequency to audible pitch
      let audiblePitch;
      if (this.isBeatMode) {
        // Direct audible beat demonstration mode: base around 440 Hz
        // Simulation detuning translates directly into audible acoustic beat rate
        audiblePitch = 440 + (effFreq - 1.0) * 100;
      } else {
        // Proportional pitch scaling (e.g. 1.0 Hz -> 220 Hz, 2.0 Hz -> 440 Hz)
        audiblePitch = Math.max(80, Math.min(1200, this.basePitch * effFreq));
      }

      // Distance attenuation relative to receiver
      let distFactor = 1.0;
      if (receiverPos) {
        const dist = Math.hypot(
          receiverPos.x - src.position.x,
          (receiverPos.y || 0) - (src.position.y || 0),
          (receiverPos.z || 0) - (src.position.z || 0)
        );
        distFactor = 1.0 / Math.max(1.0, dist * 0.25);
      }

      const targetGain = (src.amplitude || 1.0) * 0.25 * distFactor * (src.volume !== undefined ? src.volume : 1.0);

      if (this.sourceNodes.has(src.id)) {
        // Smooth parameter updates
        const node = this.sourceNodes.get(src.id);
        const t = this.ctx.currentTime;
        node.osc.frequency.setTargetAtTime(audiblePitch, t, 0.05);
        node.gain.gain.setTargetAtTime(targetGain, t, 0.05);
      } else {
        // Create new oscillator chain
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(audiblePitch, this.ctx.currentTime);
        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);

        osc.connect(gain);
        gain.connect(this.compressor);
        osc.start();

        this.sourceNodes.set(src.id, { osc, gain });
      }
    });

    // Remove stopped sources
    for (const [id, node] of this.sourceNodes.entries()) {
      if (!currentIds.has(id)) {
        const t = this.ctx.currentTime;
        node.gain.gain.setTargetAtTime(0, t, 0.05);
        setTimeout(() => {
          try {
            node.osc.stop();
            node.osc.disconnect();
            node.gain.disconnect();
          } catch (_) {}
        }, 100);
        this.sourceNodes.delete(id);
      }
    }
  }

  setMasterVolume(val) {
    this.masterVolume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      const target = (this.isMuted || this.isPaused) ? 0 : this.masterVolume;
      this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.02);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      const target = (this.isMuted || this.isPaused) ? 0 : this.masterVolume;
      this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.02);
    }
    return this.isMuted;
  }

  setBeatMode(enabled) {
    this.isBeatMode = enabled;
  }

  stopAll() {
    for (const [, node] of this.sourceNodes.entries()) {
      try {
        node.osc.stop();
        node.osc.disconnect();
        node.gain.disconnect();
      } catch (_) {}
    }
    this.sourceNodes.clear();
  }
}
