/**
 * 3D Interactive Wave & Acoustics Laboratory
 * 2D Canvas Oscilloscope & Real-Time Wave Analyzer
 */

import { WaveMath } from '../physics/waveMath.js';

export class Oscilloscope {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');

    // Display options
    this.showSourceA = true;
    this.showSourceB = true;
    this.showResultant = true;
    this.showEnvelope = true;

    this.timeScale = 1.0; // zoom
    this.ampScale = 1.0;
    this.isFrozen = false;

    // History buffer for smooth oscilloscope sweep
    this.bufferLength = 300;
    this.history = {
      time: [],
      sourceA: [],
      sourceB: [],
      resultant: [],
      envelope: []
    };

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * (window.devicePixelRatio || 1);
    this.canvas.height = rect.height * (window.devicePixelRatio || 1);
    this.width = this.canvas.width;
    this.height = this.canvas.height;
  }

  pushSample(simTime, sources, receiverPos, walls = [], slits = [], isRefraction = false) {
    if (this.isFrozen || !receiverPos) return;

    let sampleA = 0;
    let sampleB = 0;

    if (sources[0] && sources[0].active) {
      sampleA = WaveMath.evaluatePointSource(sources[0], receiverPos, simTime, 0.4, isRefraction);
    }
    if (sources[1] && sources[1].active) {
      sampleB = WaveMath.evaluatePointSource(sources[1], receiverPos, simTime, 0.4, isRefraction);
    }

    const res = WaveMath.evaluateSuperposition(sources, receiverPos, simTime, walls, slits, isRefraction);

    // Envelope for beats (only when frequency mismatch deltaF >= 0.03 Hz exists)
    let env = 0;
    if (sources.length >= 2 && sources[0].active && sources[1].active) {
      const deltaF = Math.abs(sources[0].frequency - sources[1].frequency);
      if (deltaF >= 0.03) {
        const aMax = (sources[0].amplitude || 1) + (sources[1].amplitude || 1);
        env = aMax * Math.abs(Math.cos(Math.PI * deltaF * simTime));
      }
    }

    this.history.time.push(simTime);
    this.history.sourceA.push(sampleA);
    this.history.sourceB.push(sampleB);
    this.history.resultant.push(res);
    this.history.envelope.push(env);

    if (this.history.time.length > this.bufferLength) {
      this.history.time.shift();
      this.history.sourceA.shift();
      this.history.sourceB.shift();
      this.history.resultant.shift();
      this.history.envelope.shift();
    }
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Dark oscilloscope background
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, w, h);

    // Reticle grid
    this.drawReticle(ctx, w, h);

    const len = this.history.resultant.length;
    if (len < 2) return;

    const midY = h / 2;
    const yScale = h * 0.22; // Scale factor for amplitude ±2.5

    const drawTrace = (dataArray, color, lineWidth, isDashed = false) => {
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      if (isDashed) {
        ctx.setLineDash([5, 4]);
      } else {
        ctx.setLineDash([]);
      }

      for (let i = 0; i < len; i++) {
        const x = (i / (this.bufferLength - 1)) * w;
        const y = midY - dataArray[i] * yScale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    };

    // 1. Source A trace (Cyan/Sky)
    if (this.showSourceA) {
      drawTrace(this.history.sourceA, '#38bdf8', 1.6);
    }

    // 2. Source B trace (Pink/Red)
    if (this.showSourceB) {
      drawTrace(this.history.sourceB, '#f43f5e', 1.6);
    }

    // 3. Beat Envelope trace (Dashed Gold - only when beats actually exist)
    const hasActiveBeats = this.history.envelope.some(v => v > 0.05);
    if (this.showEnvelope && hasActiveBeats) {
      drawTrace(this.history.envelope, '#fbbf24', 1.8, true);
      // Mirrored bottom envelope
      const negEnv = this.history.envelope.map(v => -v);
      drawTrace(negEnv, '#fbbf24', 1.8, true);
    }

    // 4. Resultant Superposition trace (Glowing Emerald/White)
    if (this.showResultant) {
      drawTrace(this.history.resultant, '#34d399', 2.6);
    }
  }

  drawReticle(ctx, w, h) {
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;

    // Horizontal divisions
    const hDivs = 8;
    for (let i = 0; i <= hDivs; i++) {
      const y = (i / hDivs) * h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Vertical divisions
    const vDivs = 12;
    for (let i = 0; i <= vDivs; i++) {
      const x = (i / vDivs) * w;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // Center crosshair axis
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.stroke();

    // Voltage / Displacement Y-Axis Scale Markers
    const midY = h / 2;
    const yScale = h * 0.22;
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const yMarks = [
      { val: '+2.0', y: midY - 2.0 * yScale },
      { val: '+1.0', y: midY - 1.0 * yScale },
      { val: ' 0.0', y: midY },
      { val: '-1.0', y: midY + 1.0 * yScale },
      { val: '-2.0', y: midY + 2.0 * yScale }
    ];

    yMarks.forEach(m => {
      if (m.y >= 10 && m.y <= h - 10) {
        ctx.fillText(m.val, 6, m.y);
      }
    });

    // Time Axis Label
    ctx.textAlign = 'right';
    ctx.fillStyle = '#475569';
    ctx.fillText('Time t →', w - 12, h - 8);

    // Indicator
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0ea5e9';
    ctx.fillText('Ψ(R, t) at Receiver', 48, 14);

    if (WaveMath.customEquation && WaveMath.customEquation.active) {
      ctx.fillStyle = '#a855f7';
      ctx.fillText('✨ Custom Equation Active', 180, 14);
    }
  }

  clear() {
    this.history.time = [];
    this.history.sourceA = [];
    this.history.sourceB = [];
    this.history.resultant = [];
    this.history.envelope = [];
  }
}
