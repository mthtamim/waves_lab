/**
 * 3D Interactive Wave & Acoustics Laboratory
 * Phase Wheel, Synchronization Status, Virtual Stroboscope & Wavefront Counter
 */

export class PhaseWheelUI {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement ? canvasElement.getContext('2d') : null;

    // Stroboscope settings
    this.strobeEnabled = false;
    this.strobeFreq = 1.0; // Hz
    this.lastStrobeSampleTime = 0;
    this.strobeHeldTime = 0;

    // Wavefront counters
    this.wavefrontCounts = new Map(); // srcId -> count
  }

  /**
   * Evaluates stroboscope sample-and-hold time
   */
  getStroboscopicTime(simTime) {
    if (!this.strobeEnabled) return simTime;

    const period = 1.0 / Math.max(0.1, this.strobeFreq);
    if (simTime - this.lastStrobeSampleTime >= period) {
      this.lastStrobeSampleTime = simTime;
      this.strobeHeldTime = simTime;
    }
    return this.strobeHeldTime;
  }

  /**
   * Updates emitted wavefront count for each source
   */
  updateWavefrontCounts(simTime, sources) {
    sources.forEach(src => {
      if (!src.active) return;
      const count = Math.floor(simTime * (src.frequency || 1.0));
      this.wavefrontCounts.set(src.id, count);
    });
  }

  /**
   * Computes synchronization state between active sources
   */
  static getSyncStatus(sources) {
    const active = sources.filter(s => s.active);
    if (active.length < 2) {
      return { status: 'single', label: 'Single Active Source', color: '#38bdf8' };
    }

    const s1 = active[0];
    const s2 = active[1];
    const df = Math.abs(s1.frequency - s2.frequency);
    const dPhi = Math.abs((s1.phase || 0) - (s2.phase || 0)) % (2 * Math.PI);

    if (df > 0.02) {
      return {
        status: 'async',
        label: `Asynchronous (Beats: Δf = ${df.toFixed(2)} Hz)`,
        color: '#f43f5e',
        icon: '🔴'
      };
    } else if (dPhi < 0.05 || Math.abs(dPhi - 2 * Math.PI) < 0.05) {
      return {
        status: 'sync',
        label: 'Synchronized (In-Phase Coherent)',
        color: '#10b981',
        icon: '🟢'
      };
    } else {
      const deg = Math.round((dPhi * 180) / Math.PI);
      return {
        status: 'shifted',
        label: `Phase Shifted (Δϕ = ${deg}°)`,
        color: '#fbbf24',
        icon: '🟡'
      };
    }
  }

  /**
   * Calculates wave travel time between source and receiver
   */
  static getTravelTime(source, receiverPos) {
    if (!source || !receiverPos) return { dist: 0, time: 0 };
    const dist = Math.hypot(
      receiverPos.x - source.position.x,
      (receiverPos.y || 0) - (source.position.y || 0),
      (receiverPos.z || 0) - (source.position.z || 0)
    );
    const speed = source.speed || 3.0;
    const time = dist / speed;
    return { dist, time };
  }

  /**
   * Renders circular phase dials for active sources
   */
  render(simTime, sources) {
    if (!this.ctx || !this.canvas) return;

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    const activeSources = sources.filter(s => s.active);
    if (activeSources.length === 0) return;

    const radius = Math.min(w / (activeSources.length * 2.2), h * 0.38);

    activeSources.forEach((src, idx) => {
      const centerX = ((idx + 0.5) / activeSources.length) * w;
      const centerY = h / 2;

      const omega = 2 * Math.PI * (src.frequency || 1.0);
      const theta = (omega * simTime - (src.phase || 0)) % (2 * Math.PI);

      // Dial circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Cardinal tick markers
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      for (let a = 0; a < 4; a++) {
        const ang = (a * Math.PI) / 2;
        ctx.beginPath();
        ctx.moveTo(centerX + (radius - 5) * Math.cos(ang), centerY + (radius - 5) * Math.sin(ang));
        ctx.lineTo(centerX + radius * Math.cos(ang), centerY + radius * Math.sin(ang));
        ctx.stroke();
      }

      // Phasor rotating vector
      const vx = centerX + (radius - 6) * Math.cos(theta);
      const vy = centerY + (radius - 6) * Math.sin(theta);

      const colorHex = '#' + (src.color ? src.color.toString(16).padStart(6, '0') : '38bdf8');
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(vx, vy);
      ctx.strokeStyle = colorHex;
      ctx.lineWidth = 3;
      ctx.stroke();

      // Vector head arrow/dot
      ctx.beginPath();
      ctx.arc(vx, vy, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Source Name & Angle Label
      const deg = Math.round((((theta * 180) / Math.PI) % 360 + 360) % 360);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${src.name}: ${deg}°`, centerX, centerY + radius + 14);
    });
  }
}
