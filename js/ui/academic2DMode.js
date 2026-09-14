/**
 * 3D Interactive Wave & Acoustics Laboratory
 * Full-Screen 2D Academic Classroom Studio & Textbook Wave Analysis Engine
 * 
 * Features:
 * 1. Full-screen dedicated 2D physics studio (3D viewport completely suppressed).
 * 2. Wave Propagation Model Toggle:
 *    - 'ideal': Constant amplitude, zero energy loss with distance (আদর্শ তরঙ্গ).
 *    - 'practical': 1/r spherical wave attenuation (ব্যবহারিক তরঙ্গ).
 * 3. Axis Propagation Domain Toggle:
 *    - 'both': Both axes [-15m, +15m] (উভয় অক্ষ).
 *    - 'positive': Positive axis only [0m, +16m] (শুধু ধনাত্মক অক্ষ).
 *    - 'negative': Negative axis only [-16m, 0m] (শুধু ঋণাত্মক অক্ষ).
 * 4. Four Interactive Graphing Modes:
 *    - 'stacked': Separate individual source wave graphs (y1, y2) + Resultant (Psi = y1 + y2).
 *    - 'superimposed': All sources + Resultant together on one shared coordinate system.
 *    - 'resultant': Pure resultant wave with Node (N) and Antinode (A) markers.
 *    - 'intensity': Textbook golden fringe intensity I(x) + simulated optical screen interferogram.
 * 5. Live Rotating Phasor Vector Diagram (Argand Circle) showing rotating vectors A1, A2 and resultant Ares.
 * 6. Direct Keyboard Numeric Input Parameter Console (f1, f2, A1, A2, phi1, phi2, v, D, d, xR).
 * 7. Dynamic Textbook Formula Blackboard with live substituted numbers and step-by-step derivations.
 * 8. Quick Classroom Navigation Buttons (Central Max, +beta, -beta, beta/2 Minimum).
 */

import { WaveMath } from '../physics/waveMath.js';

export class Academic2DMode {
  constructor(app) {
    this.app = app;
    this.active = false;
    this.container = null;

    // View modes: 'stacked' | 'superimposed' | 'resultant' | 'intensity'
    this.graphMode = 'stacked';

    // Axis domain: 'both' | 'positive' | 'negative'
    this.axisDomain = 'both';
    this.xMin = -15.0; // meters
    this.xMax = 15.0;  // meters
    this.sampleCount = 360;

    // Canvases
    this.mainCanvas = null;
    this.mainCtx = null;
    this.phasorCanvas = null;
    this.phasorCtx = null;

    // Interactive pointer state
    this.hoverX = null;
    this.isHovering = false;

    // Wave Motion Nature:
    // 'traveling': Progressive Continuous Traveling Wave (চলমান প্রগামী তরঙ্গ: y = A*sin(kx - wt))
    // 'standing': Standing Superposition Wave (ব্যতিচার ও স্থির তরঙ্গ: 2A*cos(kx)*cos(wt))
    // 'timedomain': Particle Oscillation y vs t at Receiver
    this.waveMotionType = 'traveling';
    this.waveDirection = 'forward'; // 'forward' (+x) | 'backward' (-x)
    this.showParticles = true;
    this.showCrestTroughs = true;
    this.timeHistory = []; // Rolling buffer for y vs t mode
  }

  init(parentContainer) {
    this.container = document.createElement('div');
    this.container.id = 'academic-2d-overlay';
    this.container.className = 'academic-2d-studio';
    this.container.style.display = 'none';

    this.container.innerHTML = `
      <!-- Top Studio Navigation Bar -->
      <div class="a2d-studio-topbar">
        <div class="a2d-brand-group">
          <span class="a2d-badge-pulse">📐 2D CLASSROOM STUDIO</span>
          <h2 class="a2d-studio-title" id="a2d-exp-title">Textbook Wave Superposition & Interference</h2>
        </div>

        <!-- Wave Model Toggle (আদর্শ তরঙ্গ vs ব্যবহারিক তরঙ্গ) -->
        <div class="a2d-wave-model-toggle" id="a2d-model-tabs" title="তরঙ্গ মডেল নির্বাচন করুন">
          <button class="btn-wave-type active" data-type="ideal" title="Ideal Wave: Constant Amplitude, Zero Energy Loss (আদর্শ তরঙ্গ)">🌟 Ideal (আদর্শ)</button>
          <button class="btn-wave-type" data-type="practical" title="Practical Wave: 1/r Attenuation (ব্যবহারিক তরঙ্গ)">🌊 Practical (ব্যবহারিক)</button>
        </div>

        <!-- Axis Range / Direction Selector (অক্ষ বরাবর দিক নির্বাচন) -->
        <div class="a2d-axis-selector" id="a2d-axis-tabs" title="অক্ষ দেখার ক্ষেত্র নির্বাচন">
          <span class="axis-lbl">অক্ষ:</span>
          <button class="btn-axis-mode" data-axis="negative" title="Negative Axis Only (-x to 0)">◀️ -x Only</button>
          <button class="btn-axis-mode active" data-axis="both" title="Both Axes (-x to +x)">↔️ Both (±x)</button>
          <button class="btn-axis-mode" data-axis="positive" title="Positive Axis Only (0 to +x)">▶️ +x Only</button>
        </div>

        <!-- Motion Nature Selector (প্রগামী চলমান তরঙ্গ vs স্থির ব্যতিচার তরঙ্গ vs কণার স্পন্দন) -->
        <div class="a2d-motion-selector" id="a2d-motion-tabs" title="তরঙ্গের গতি প্রকৃতি নির্বাচন">
          <button class="btn-motion-mode active" data-motion="traveling" title="Continuous Progressive Traveling Wave (চলমান প্রগামী তরঙ্গ: ক্রেস্ট-ট্রাফ অনুভূমিক অক্ষ বরাবর গতিশীল)">
            🌊 Traveling (চলমান প্রগামী)
          </button>
          <button class="btn-motion-mode" data-motion="standing" title="Standing Superposition Wave (ব্যতিচার ও স্থির তরঙ্গ: নিস্পন্দ-সুস্পন্দ বিন্দু)">
            ⚡ Standing (স্থির তরঙ্গ)
          </button>
          <button class="btn-motion-mode" data-motion="timedomain" title="Time Domain Graph: y vs t (কণার সময়-সরণ স্পন্দন)">
            ⏱️ y vs t (কণার স্পন্দন)
          </button>
        </div>

        <!-- Wave Flow & Particle Feature Toggles -->
        <div class="a2d-feature-toggles">
          <button class="btn-feat-toggle active" id="a2d-toggle-dir" title="Toggle Wave Propagation Direction (+x or -x)">
            ▶ দিক: +x
          </button>
          <button class="btn-feat-toggle active" id="a2d-toggle-particles" title="Toggle Medium Particle Vibration Beads (মাধ্যমের কণা স্পন্দন)">
            🟢 কণার স্পন্দন
          </button>
          <button class="btn-feat-toggle active" id="a2d-toggle-tags" title="Toggle Crest & Trough Marker Tags">
            🏷️ শীর্ষ/খাঁদ
          </button>
        </div>

        <!-- 4 Graph Display Mode Selectors -->
        <div class="a2d-mode-selector" id="a2d-mode-tabs">
          <button class="btn-graph-mode active" data-mode="stacked" title="Separate graph for each source + Resultant below them">
            🥞 Stacked
          </button>
          <button class="btn-graph-mode" data-mode="superimposed" title="All sources and resultant on one shared graph">
            📊 Superimposed
          </button>
          <button class="btn-graph-mode" data-mode="resultant" title="Only resultant superposition wave with Nodes & Antinodes">
            ⚡ Resultant
          </button>
          <button class="btn-graph-mode" data-mode="intensity" title="Textbook golden intensity curve and optical screen interferogram">
            🌟 Intensity
          </button>
        </div>

        <div class="a2d-studio-actions">
          <button class="a2d-btn-action" id="a2d-btn-play" title="Play / Pause Simulation (Space)">⏸ Pause</button>
          <button class="a2d-btn-action" id="a2d-btn-reset" title="Reset Simulation Time">↻ Reset</button>
          <button class="a2d-btn-exit" id="a2d-btn-exit" title="Return to 3D Arena">🧊 Return to 3D Arena</button>
        </div>
      </div>

      <!-- Custom Wave Equation Banner in 2D Classroom -->
      <div class="a2d-custom-eq-banner">
        <span class="eq-symbol">ƒ(x, t) = </span>
        <input type="text" id="a2d-custom-eq-input" placeholder="e.g. 2.0 * sin(2*x - 4*t) বা A*sin(kx - wt)" value="2.0 * sin(2*x - 4*t)">
        <select id="a2d-custom-eq-templates">
          <option value="">⚡ প্রিসেট সমীকরণ বেছে নিন...</option>
          <option value="2.0 * sin(2*x - 4*t)">1. Traveling Harmonic Wave: 2.0·sin(2x - 4t)</option>
          <option value="A * sin(k*x - w*t)">2. Textbook Symbols Formula: A·sin(kx - wt)</option>
          <option value="2.0 * sin(1.5*x) * cos(4*t)">3. Standing Wave: 2.0·sin(1.5x)·cos(4t)</option>
          <option value="2.0 * exp(-pow(((x - 2.5*t + 15) % 30) - 15, 2) / 6.0) * cos(6*x - 12*t)">4. Continuous Wave Packet</option>
          <option value="2.0 * cos(0.35*t) * sin(3*x - 6*t)">5. Acoustic Beats Modulation</option>
          <option value="(4 / PI) * (sin(x - 3*t) + (1/3)*sin(3*(x - 3*t)) + (1/5)*sin(5*(x - 3*t)))">6. Fourier Square Wave (3 Harmonics)</option>
          <option value="2.5 / pow(cosh(0.6*(((x - 3*t + 15) % 30) - 15)), 2)">7. Soliton Pulse (Continuous)</option>
          <option value="2.0 * sin(2*r - 5*t) / (1 + 0.15*r)">8. Radial Ripple: 2·sin(2r - 5t)/(1+0.15r)</option>
          <option value="2.0 * exp(-0.12*abs(x)) * sin(2*x - 4*t)">9. Spatially Damped Wave</option>
        </select>
        <button id="a2d-custom-eq-apply" class="btn-eq-apply">▶ Apply Formula</button>
        <button id="a2d-custom-eq-toggle" class="btn-eq-toggle">✨ Custom Eq: OFF</button>
        <span id="a2d-custom-eq-status" class="eq-status-pill"></span>
      </div>

      <!-- Live Parameter Input Console & Formula Blackboard -->
      <div class="a2d-controls-ribbon">
        <!-- Direct Keyboard Input Console -->
        <div class="a2d-param-console">
          <div class="console-title">⌨️ Direct Keyboard Parameter Controls (মান পরিবর্তন)</div>
          <div class="console-inputs-grid">
            <div class="inp-field-group">
              <label><span class="dot-s1">●</span> Src 1 Freq (f₁):</label>
              <div class="input-wrap">
                <input type="number" id="a2d-inp-f1" step="0.05" min="0.1" max="10.0" value="1.20">
                <span class="u">Hz</span>
              </div>
            </div>

            <div class="inp-field-group">
              <label><span class="dot-s1">●</span> Src 1 Amp (A₁):</label>
              <div class="input-wrap">
                <input type="number" id="a2d-inp-a1" step="0.1" min="0.0" max="5.0" value="1.0">
                <span class="u">arb</span>
              </div>
            </div>

            <div class="inp-field-group">
              <label><span class="dot-s1">●</span> Src 1 Phase (ϕ₁):</label>
              <div class="input-wrap">
                <input type="number" id="a2d-inp-p1" step="15" min="-360" max="360" value="0">
                <span class="u">°</span>
              </div>
            </div>

            <div class="inp-field-group">
              <label><span class="dot-s2">●</span> Src 2 Freq (f₂):</label>
              <div class="input-wrap">
                <input type="number" id="a2d-inp-f2" step="0.05" min="0.1" max="10.0" value="1.20">
                <span class="u">Hz</span>
              </div>
            </div>

            <div class="inp-field-group">
              <label><span class="dot-s2">●</span> Src 2 Amp (A₂):</label>
              <div class="input-wrap">
                <input type="number" id="a2d-inp-a2" step="0.1" min="0.0" max="5.0" value="1.0">
                <span class="u">arb</span>
              </div>
            </div>

            <div class="inp-field-group">
              <label><span class="dot-s2">●</span> Src 2 Phase (ϕ₂):</label>
              <div class="input-wrap">
                <input type="number" id="a2d-inp-p2" step="15" min="-360" max="360" value="0">
                <span class="u">°</span>
              </div>
            </div>

            <div class="inp-field-group">
              <label>🌊 Wave Speed (v):</label>
              <div class="input-wrap">
                <input type="number" id="a2d-inp-v" step="0.2" min="0.5" max="20.0" value="3.0">
                <span class="u">m/s</span>
              </div>
            </div>

            <div class="inp-field-group">
              <label>↔️ Separation (d):</label>
              <div class="input-wrap">
                <input type="number" id="a2d-inp-d" step="0.2" min="0.4" max="16.0" value="4.0">
                <span class="u">m</span>
              </div>
            </div>

            <div class="inp-field-group">
              <label>📏 Screen Dist (D):</label>
              <div class="input-wrap">
                <input type="number" id="a2d-inp-dist" step="0.5" min="1.0" max="16.0" value="5.0">
                <span class="u">m</span>
              </div>
            </div>

            <div class="inp-field-group highlight">
              <label>🎯 Receiver x (x_R):</label>
              <div class="input-wrap">
                <input type="number" id="a2d-inp-rx" step="0.1" min="-16.0" max="16.0" value="0.0">
                <span class="u">m</span>
              </div>
            </div>
          </div>

          <!-- Classroom Navigation Quick Buttons -->
          <div class="console-quick-actions">
            <span class="quick-label">Fringe Snapper:</span>
            <button class="a2d-btn-snap" id="a2d-snap-center">🎯 Central Max (m=0)</button>
            <button class="a2d-btn-snap" id="a2d-snap-pos">▶ +β (Next Maxima)</button>
            <button class="a2d-btn-snap" id="a2d-snap-neg">◀ -β (Prev Maxima)</button>
            <button class="a2d-btn-snap" id="a2d-snap-dark">🌑 Minima (β/2 Dark)</button>
          </div>
        </div>

        <!-- Live Physics Formula Blackboard & Phasor Diagram -->
        <div class="a2d-formula-blackboard">
          <div class="blackboard-body">
            <div class="calc-row">
              <span class="formula">Path Diff: Δr = |r₂ - r₁| =</span>
              <strong id="a2d-calc-pathdiff">0.00 m (0.00 λ)</strong>
            </div>
            <div class="calc-row">
              <span class="formula">Phase Diff: Δϕ = (2π/λ)Δr =</span>
              <strong id="a2d-calc-phasediff">0° (0.00 rad)</strong>
            </div>
            <div class="calc-row">
              <span class="formula">Resultant Amp: A_res = √(A₁² + A₂² + 2A₁A₂cosΔϕ) =</span>
              <strong id="a2d-calc-ares">2.00 arb</strong>
            </div>
            <div class="calc-row">
              <span class="formula">Fringe Width: β = λD / d =</span>
              <strong id="a2d-calc-beta">3.12 m</strong>
            </div>
            <div style="margin-top: 4px; text-align: center;">
              <span class="condition-chip" id="a2d-chip-condition">🟢 Constructive Maxima</span>
            </div>
          </div>

          <!-- Live Rotating Phasor Widget -->
          <div class="phasor-widget-box">
            <canvas id="a2d-phasor-canvas" width="130" height="110"></canvas>
            <div class="phasor-legend">Phasor Superposition: <span style="color:#38bdf8">A₁</span> + <span style="color:#f43f5e">A₂</span> = <span style="color:#fbbf24">A_res</span></div>
          </div>
        </div>
      </div>

      <!-- Main Dynamic Canvas Area -->
      <div class="a2d-canvas-main-viewport" id="a2d-canvas-viewport">
        <canvas id="a2d-studio-canvas"></canvas>
        <div class="a2d-hint-banner">
          🖱️ <strong>Interactive Classroom:</strong> Click anywhere on the graph to jump Receiver Sensor (R) | Hover to inspect coordinates (x, y, Ψ)
        </div>
      </div>
    `;

    document.body.appendChild(this.container);

    this.mainCanvas = document.getElementById('a2d-studio-canvas');
    this.mainCtx = this.mainCanvas.getContext('2d');
    this.phasorCanvas = document.getElementById('a2d-phasor-canvas');
    this.phasorCtx = this.phasorCanvas.getContext('2d');

    this.setupListeners();
    this.resizeCanvases();
    window.addEventListener('resize', () => this.resizeCanvases());
  }

  setupListeners() {
    // Wave Model Toggle in 2D
    const modelTabs = document.getElementById('a2d-model-tabs');
    if (modelTabs) {
      modelTabs.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-wave-type');
        if (!btn) return;
        const type = btn.getAttribute('data-type');
        if (type && this.app.setWaveModel) {
          this.app.setWaveModel(type);
        }
      });
    }

    // Axis Selector in 2D
    const axisTabs = document.getElementById('a2d-axis-tabs');
    if (axisTabs) {
      axisTabs.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-axis-mode');
        if (!btn) return;
        const axis = btn.getAttribute('data-axis');
        if (axis) {
          this.setAxisDomain(axis);
        }
      });
    }

    // Mode tabs
    const modeTabs = document.getElementById('a2d-mode-tabs');
    if (modeTabs) {
      modeTabs.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-graph-mode');
        if (!btn) return;
        modeTabs.querySelectorAll('.btn-graph-mode').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.graphMode = btn.getAttribute('data-mode') || 'stacked';
        this.resizeCanvases();
      });
    }

    // Play/Pause and Reset
    const btnPlay = document.getElementById('a2d-btn-play');
    if (btnPlay) {
      btnPlay.addEventListener('click', () => {
        this.app.isPlaying = !this.app.isPlaying;
        btnPlay.textContent = this.app.isPlaying ? '⏸ Pause' : '▶ Play';
        if (this.app.audioEngine) this.app.audioEngine.setSimulationPaused(!this.app.isPlaying);
      });
    }

    const btnReset = document.getElementById('a2d-btn-reset');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        this.app.simTime = 0;
        if (this.app.oscilloscope) this.app.oscilloscope.clear();
      });
    }

    // Exit 2D Mode
    const btnExit = document.getElementById('a2d-btn-exit');
    if (btnExit) {
      btnExit.addEventListener('click', () => this.setMode('3d'));
    }

    // Custom Equation in 2D Classroom
    const eqInput = document.getElementById('a2d-custom-eq-input');
    const eqTemplates = document.getElementById('a2d-custom-eq-templates');
    const eqApply = document.getElementById('a2d-custom-eq-apply');
    const eqToggle = document.getElementById('a2d-custom-eq-toggle');
    const eqStatus = document.getElementById('a2d-custom-eq-status');

    const applyCustomEquation = () => {
      if (!this.app.customEquationEngine || !eqInput) return;
      const res = this.app.customEquationEngine.compile(eqInput.value);
      if (res.success) {
        WaveMath.customEquation.active = true;
        WaveMath.customEquation.engine = this.app.customEquationEngine;
        if (eqToggle) {
          eqToggle.textContent = '✨ Custom Eq: ON';
          eqToggle.classList.add('active');
        }
        if (eqStatus) {
          eqStatus.textContent = 'Active ✓';
          eqStatus.className = 'eq-status-pill active';
        }
        const btn3dEq = document.getElementById('btn-custom-eq');
        if (btn3dEq) btn3dEq.classList.add('active');
      } else {
        if (eqStatus) {
          eqStatus.textContent = res.error || 'Syntax Error';
          eqStatus.className = 'eq-status-pill error';
        }
      }
    };

    if (eqTemplates && eqInput) {
      eqTemplates.addEventListener('change', (e) => {
        if (e.target.value) {
          eqInput.value = e.target.value;
          applyCustomEquation();
        }
      });
    }

    if (eqApply) {
      eqApply.addEventListener('click', applyCustomEquation);
    }

    if (eqInput) {
      eqInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') applyCustomEquation();
      });
    }

    // Motion nature selector: Traveling vs Standing vs TimeDomain
    const motionTabs = document.getElementById('a2d-motion-tabs');
    if (motionTabs) {
      motionTabs.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-motion-mode');
        if (!btn) return;
        motionTabs.querySelectorAll('.btn-motion-mode').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.waveMotionType = btn.getAttribute('data-motion') || 'traveling';
      });
    }

    // Direction toggle (+x / -x)
    const btnToggleDir = document.getElementById('a2d-toggle-dir');
    if (btnToggleDir) {
      btnToggleDir.addEventListener('click', () => {
        this.waveDirection = (this.waveDirection === 'forward') ? 'backward' : 'forward';
        btnToggleDir.textContent = (this.waveDirection === 'forward') ? '▶ দিক: +x' : '◀ দিক: -x';
      });
    }

    // Medium particles toggle
    const btnToggleParticles = document.getElementById('a2d-toggle-particles');
    if (btnToggleParticles) {
      btnToggleParticles.addEventListener('click', () => {
        this.showParticles = !this.showParticles;
        btnToggleParticles.classList.toggle('active', this.showParticles);
      });
    }

    // Crest / Trough tags toggle
    const btnToggleTags = document.getElementById('a2d-toggle-tags');
    if (btnToggleTags) {
      btnToggleTags.addEventListener('click', () => {
        this.showCrestTroughs = !this.showCrestTroughs;
        btnToggleTags.classList.toggle('active', this.showCrestTroughs);
      });
    }

    if (eqToggle) {
      eqToggle.addEventListener('click', () => {
        WaveMath.customEquation.active = !WaveMath.customEquation.active;
        eqToggle.textContent = WaveMath.customEquation.active ? '✨ Custom Eq: ON' : '✨ Custom Eq: OFF';
        eqToggle.classList.toggle('active', WaveMath.customEquation.active);
        if (eqStatus) {
          eqStatus.textContent = WaveMath.customEquation.active ? 'Active ✓' : 'Inactive';
          eqStatus.className = 'eq-status-pill ' + (WaveMath.customEquation.active ? 'active' : '');
        }
        const btn3dEq = document.getElementById('btn-custom-eq');
        if (btn3dEq) btn3dEq.classList.toggle('active', WaveMath.customEquation.active);
      });
    }

    // Classroom quick snap buttons
    const btnCenter = document.getElementById('a2d-snap-center');
    if (btnCenter) btnCenter.addEventListener('click', () => this.setReceiverX(0));

    const btnPos = document.getElementById('a2d-snap-pos');
    if (btnPos) {
      btnPos.addEventListener('click', () => {
        const beta = this.calculateBeta() || 3.12;
        this.setReceiverX((this.app.receiver ? this.app.receiver.position.x : 0) + beta);
      });
    }

    const btnNeg = document.getElementById('a2d-snap-neg');
    if (btnNeg) {
      btnNeg.addEventListener('click', () => {
        const beta = this.calculateBeta() || 3.12;
        this.setReceiverX((this.app.receiver ? this.app.receiver.position.x : 0) - beta);
      });
    }

    const btnDark = document.getElementById('a2d-snap-dark');
    if (btnDark) {
      btnDark.addEventListener('click', () => {
        const beta = this.calculateBeta() || 3.12;
        this.setReceiverX(beta / 2);
      });
    }

    // Keyboard parameter input bindings
    this.bindNumericInputs();

    // Canvas mouse interactions
    if (this.mainCanvas) {
      this.mainCanvas.addEventListener('mousemove', (e) => {
        const rect = this.mainCanvas.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const t = Math.max(0, Math.min(1, px / rect.width));
        this.hoverX = this.xMin + t * (this.xMax - this.xMin);
        this.isHovering = true;
      });

      this.mainCanvas.addEventListener('mouseleave', () => {
        this.hoverX = null;
        this.isHovering = false;
      });

      this.mainCanvas.addEventListener('click', (e) => {
        const rect = this.mainCanvas.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const t = Math.max(0, Math.min(1, px / rect.width));
        const clickedX = this.xMin + t * (this.xMax - this.xMin);
        this.setReceiverX(clickedX);
      });
    }
  }

  syncWaveModel(model) {
    const tabs = document.querySelectorAll('.btn-wave-type');
    tabs.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-type') === model);
    });
  }

  setAxisDomain(domain) {
    this.axisDomain = domain;
    if (domain === 'positive') {
      this.xMin = 0.0;
      this.xMax = 16.0;
    } else if (domain === 'negative') {
      this.xMin = -16.0;
      this.xMax = 0.0;
    } else {
      this.xMin = -15.0;
      this.xMax = 15.0;
    }

    const axisTabs = document.querySelectorAll('.btn-axis-mode');
    axisTabs.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-axis') === domain);
    });

    this.resizeCanvases();
  }

  bindNumericInputs() {
    const bindInp = (id, onChange) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val)) onChange(val);
      });
    };

    bindInp('a2d-inp-f1', (val) => {
      if (this.app.sources[0]) {
        this.app.sources[0].frequency = Math.max(0.05, Math.min(10, val));
        this.app.handleParamChange('source', this.app.sources[0].id, 'frequency', this.app.sources[0].frequency);
      }
    });

    bindInp('a2d-inp-a1', (val) => {
      if (this.app.sources[0]) {
        this.app.sources[0].amplitude = Math.max(0, Math.min(5, val));
        this.app.handleParamChange('source', this.app.sources[0].id, 'amplitude', this.app.sources[0].amplitude);
      }
    });

    bindInp('a2d-inp-p1', (val) => {
      if (this.app.sources[0]) {
        this.app.sources[0].phase = (val * Math.PI) / 180;
        this.app.handleParamChange('source', this.app.sources[0].id, 'phase', this.app.sources[0].phase);
      }
    });

    bindInp('a2d-inp-f2', (val) => {
      if (this.app.sources[1]) {
        this.app.sources[1].frequency = Math.max(0.05, Math.min(10, val));
        this.app.handleParamChange('source', this.app.sources[1].id, 'frequency', this.app.sources[1].frequency);
      }
    });

    bindInp('a2d-inp-a2', (val) => {
      if (this.app.sources[1]) {
        this.app.sources[1].amplitude = Math.max(0, Math.min(5, val));
        this.app.handleParamChange('source', this.app.sources[1].id, 'amplitude', this.app.sources[1].amplitude);
      }
    });

    bindInp('a2d-inp-p2', (val) => {
      if (this.app.sources[1]) {
        this.app.sources[1].phase = (val * Math.PI) / 180;
        this.app.handleParamChange('source', this.app.sources[1].id, 'phase', this.app.sources[1].phase);
      }
    });

    bindInp('a2d-inp-v', (val) => {
      const v = Math.max(0.2, Math.min(20, val));
      this.app.sources.forEach(src => {
        src.speed = v;
        this.app.handleParamChange('source', src.id, 'speed', v);
      });
    });

    bindInp('a2d-inp-d', (val) => {
      const d = Math.max(0.4, Math.min(16, val));
      if (this.app.sources.length >= 2) {
        this.app.sources[0].position.x = -d / 2;
        this.app.sources[1].position.x = d / 2;
        this.app.rebuildGizmos();
      }
      if (this.app.slits && this.app.slits[0]) {
        this.app.slits[0].separation = d;
        this.app.updateSlitWavelets();
      }
    });

    bindInp('a2d-inp-dist', (val) => {
      const dist = Math.max(1, Math.min(16, val));
      if (this.app.receiver) {
        this.app.receiver.position.z = dist;
        this.app.rebuildGizmos();
      }
    });

    bindInp('a2d-inp-rx', (val) => {
      this.setReceiverX(val);
    });
  }

  setReceiverX(newX) {
    if (!this.app.receiver) return;
    this.app.receiver.position.x = Math.max(-16, Math.min(16, parseFloat(newX.toFixed(2))));
    const rxInp = document.getElementById('a2d-inp-rx');
    if (rxInp) rxInp.value = this.app.receiver.position.x.toFixed(2);
    if (this.app.rebuildGizmos) this.app.rebuildGizmos();
    if (this.app.rightPanel && this.app.rightPanel.selectedObject && this.app.rightPanel.selectedObject.type === 'receiver') {
      this.app.rightPanel.render();
    }
  }

  resizeCanvases() {
    if (!this.mainCanvas || !this.container) return;
    const vp = document.getElementById('a2d-canvas-viewport');
    if (!vp) return;

    const w = vp.clientWidth || 1000;
    const h = vp.clientHeight || 500;
    const dpr = window.devicePixelRatio || 1;

    this.mainCanvas.width = w * dpr;
    this.mainCanvas.height = h * dpr;
    this.mainCanvas.style.width = `${w}px`;
    this.mainCanvas.style.height = `${h}px`;
    this.mainCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.mainCtx.scale(dpr, dpr);

    if (this.phasorCanvas) {
      this.phasorCanvas.width = 130 * dpr;
      this.phasorCanvas.height = 110 * dpr;
      this.phasorCanvas.style.width = '130px';
      this.phasorCanvas.style.height = '110px';
      this.phasorCtx.setTransform(1, 0, 0, 1, 0, 0);
      this.phasorCtx.scale(dpr, dpr);
    }
  }

  setMode(mode) {
    const btn3d = document.getElementById('btn-dim-3d');
    const btn2d = document.getElementById('btn-dim-2d');
    const viewport3d = document.getElementById('viewport-3d');

    if (mode === '2d') {
      this.active = true;
      if (this.container) this.container.style.display = 'flex';
      if (viewport3d) viewport3d.style.display = 'none'; // Completely hide 3D arena
      if (btn2d) btn2d.classList.add('active');
      if (btn3d) btn3d.classList.remove('active');

      this.syncConsoleInputs();
      this.resizeCanvases();
    } else {
      this.active = false;
      if (this.container) this.container.style.display = 'none';
      if (viewport3d) viewport3d.style.display = 'block'; // Restore 3D arena
      if (btn3d) btn3d.classList.add('active');
      if (btn2d) btn2d.classList.remove('active');

      if (this.app.sceneMgr) {
        this.app.sceneMgr.controls.enableRotate = true;
        this.app.sceneMgr.resetCamera();
        this.app.sceneMgr.onWindowResize();
      }
    }
  }

  syncCustomEq(formulaStr, isActive) {
    const eqInput = document.getElementById('a2d-custom-eq-input');
    const eqToggle = document.getElementById('a2d-custom-eq-toggle');
    const eqStatus = document.getElementById('a2d-custom-eq-status');

    if (eqInput && formulaStr) eqInput.value = formulaStr;
    if (eqToggle) {
      eqToggle.textContent = isActive ? '✨ Custom Eq: ON' : '✨ Custom Eq: OFF';
      eqToggle.classList.toggle('active', isActive);
    }
    if (eqStatus) {
      eqStatus.textContent = isActive ? 'Active ✓' : 'Inactive';
      eqStatus.className = 'eq-status-pill ' + (isActive ? 'active' : '');
    }
  }

  syncConsoleInputs() {
    const s1 = this.app.sources[0];
    const s2 = this.app.sources[1];
    const r = this.app.receiver;

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el && val !== undefined) el.value = val;
    };

    if (s1) {
      setVal('a2d-inp-f1', (s1.frequency || 1.0).toFixed(2));
      setVal('a2d-inp-a1', (s1.amplitude || 1.0).toFixed(2));
      setVal('a2d-inp-p1', Math.round(((s1.phase || 0) * 180) / Math.PI));
      setVal('a2d-inp-v', (s1.speed || 3.0).toFixed(1));
    }

    if (s2) {
      setVal('a2d-inp-f2', (s2.frequency || 1.0).toFixed(2));
      setVal('a2d-inp-a2', (s2.amplitude || 1.0).toFixed(2));
      setVal('a2d-inp-p2', Math.round(((s2.phase || 0) * 180) / Math.PI));
    }

    if (s1 && s2) {
      setVal('a2d-inp-d', Math.abs(s2.position.x - s1.position.x).toFixed(1));
    }

    if (r) {
      setVal('a2d-inp-dist', r.position.z.toFixed(1));
      setVal('a2d-inp-rx', r.position.x.toFixed(2));
    }
  }

  calculateBeta() {
    const s1 = this.app.sources[0];
    const s2 = this.app.sources[1];
    const r = this.app.receiver;
    if (!s1 || !r) return 3.12;

    const lambda = (s1.speed || 3.0) / (s1.frequency || 1.0);
    const D = Math.abs(r.position.z - (s1.position.z || 0));
    let d = 4.0;
    if (s2) d = Math.abs(s2.position.x - s1.position.x) || 4.0;
    return (lambda * D) / Math.max(0.2, d);
  }

  update(simTime) {
    if (!this.active || !this.container || this.container.style.display === 'none') return;

    const sources = this.app.sources || [];
    const receiver = this.app.receiver || { position: { x: 0, y: 0, z: 5 } };
    const walls = this.app.walls || [];
    const slits = this.app.slits || [];
    const isRefraction = this.app.isRefraction || false;
    const zR = receiver.position.z;

    const s1 = sources[0];
    const s2 = sources[1];

    // Compute mathematical values
    const lambda = s1 ? (s1.speed || 3.0) / (s1.frequency || 1.0) : 2.5;
    const D = s1 ? Math.abs(zR - s1.position.z) : 5.0;
    const d = (s1 && s2) ? Math.abs(s2.position.x - s1.position.x) : 4.0;
    const beta = (d > 0.1) ? (lambda * D) / d : 3.12;

    // Sample along line z = zR across active [xMin, xMax] domain
    const samples = [];
    const dx = (this.xMax - this.xMin) / (this.sampleCount - 1);
    let maxIntensity = 1e-6;
    const isIdeal = WaveMath.waveModel === 'ideal';

    const A1 = s1 ? (s1.amplitude || 1.0) : 1.0;
    const f1 = s1 ? (s1.frequency || 1.0) : 1.0;
    const v1 = s1 ? (s1.speed || 3.0) : 3.0;
    const phi1 = s1 ? (s1.phase || 0) : 0;
    const k1 = (2 * Math.PI * f1) / Math.max(0.2, v1);
    const w1 = 2 * Math.PI * f1;

    const A2 = (s2 && s2.amplitude !== undefined) ? s2.amplitude : 1.0;
    const f2 = (s2 && s2.frequency !== undefined) ? s2.frequency : 1.0;
    const v2 = (s2 && s2.speed !== undefined) ? s2.speed : 3.0;
    const phi2 = (s2 && s2.phase !== undefined) ? s2.phase : 0;
    const k2 = (2 * Math.PI * f2) / Math.max(0.2, v2);
    const w2 = 2 * Math.PI * f2;

    const sign = (this.waveDirection === 'backward') ? 1 : -1;

    for (let i = 0; i < this.sampleCount; i++) {
      const x = this.xMin + i * dx;
      let y1 = 0;
      let y2 = 0;
      let psi = 0;
      let intensity = 0;

      if (WaveMath.customEquation && WaveMath.customEquation.active && WaveMath.customEquation.engine) {
        // In 2D classroom mode, set z = 0, so radial r = |x|
        psi = WaveMath.customEquation.engine.evaluate(x, 0, simTime, Math.abs(x));
        y1 = psi;
        y2 = 0;
        intensity = psi * psi;
      } else if (this.waveMotionType === 'traveling') {
        // Continuous Progressive Traveling Wave: y(x,t) = A*sin(kx -/+ wt + phi)
        // Crests and troughs physically travel horizontally across the x-axis!
        y1 = A1 * Math.sin(k1 * x + sign * w1 * simTime + phi1);
        if (s2 && s2.active) {
          y2 = A2 * Math.sin(k2 * x + sign * w2 * simTime + phi2);
        }
        psi = y1 + y2;
        intensity = psi * psi;
      } else {
        // Standing / Point Source Interference Mode
        const targetPos = { x, y: 0, z: zR };
        psi = WaveMath.evaluateSuperposition(sources, targetPos, simTime, walls, slits, isRefraction);
        if (s1 && s1.active) y1 = WaveMath.evaluatePointSource(s1, targetPos, simTime, 0.4, isRefraction);
        if (s2 && s2.active) y2 = WaveMath.evaluatePointSource(s2, targetPos, simTime, 0.4, isRefraction);

        let realSum = 0, imagSum = 0;
        for (const src of sources) {
          if (!src.active) continue;
          const dist = Math.hypot(x - src.position.x, zR - src.position.z);
          const k = (2 * Math.PI * (src.frequency || 1.0)) / Math.max(0.2, src.speed || 3.0);
          const phase = k * dist + (src.phase || 0);
          const amp = isIdeal ? (src.amplitude || 1.0) : ((src.amplitude || 1.0) / Math.max(dist, 0.4));
          realSum += amp * Math.cos(phase);
          imagSum += amp * Math.sin(phase);
        }
        intensity = realSum * realSum + imagSum * imagSum;
      }

      if (intensity > maxIntensity) maxIntensity = intensity;
      samples.push({ x, psi, y1, y2, intensity });
    }

    for (let i = 0; i < samples.length; i++) {
      samples[i].normIntensity = samples[i].intensity / maxIntensity;
    }

    // Record time history for y vs t mode
    const rx = receiver.position.x;
    let recvSample = 0;
    if (WaveMath.customEquation && WaveMath.customEquation.active && WaveMath.customEquation.engine) {
      recvSample = WaveMath.customEquation.engine.evaluate(rx, 0, simTime, Math.abs(rx));
    } else if (this.waveMotionType === 'traveling') {
      recvSample = A1 * Math.sin(k1 * rx + sign * w1 * simTime + phi1);
      if (s2 && s2.active) recvSample += A2 * Math.sin(k2 * rx + sign * w2 * simTime + phi2);
    } else {
      recvSample = WaveMath.evaluateSuperposition(sources, { x: rx, y: 0, z: zR }, simTime, walls, slits, isRefraction);
    }

    this.timeHistory.push({ t: simTime, y: recvSample });
    if (this.timeHistory.length > 250) this.timeHistory.shift();

    // Update Blackboard Math & Calculations
    this.updateBlackboardMath(s1, s2, receiver, lambda, D, d, beta, simTime);

    // Render Live Rotating Phasor Diagram
    this.renderPhasorDiagram(s1, s2, receiver.position, simTime);

    // Render Active Graph Mode or Time Domain Mode
    if (this.waveMotionType === 'timedomain') {
      this.renderTimeDomainGraph(receiver.position.x);
    } else if (this.graphMode === 'stacked') {
      this.renderStackedGraphs(samples, receiver.position.x);
    } else if (this.graphMode === 'superimposed') {
      this.renderSuperimposedGraph(samples, receiver.position.x);
    } else if (this.graphMode === 'resultant') {
      this.renderResultantGraph(samples, receiver.position.x);
    } else if (this.graphMode === 'intensity') {
      this.renderIntensityGraph(samples, receiver.position.x, beta);
    }
  }

  updateBlackboardMath(s1, s2, receiver, lambda, D, d, beta, t) {
    if (!s1) return;

    let pathDiff = 0;
    let phaseDiffDeg = 0;
    let aRes = s1.amplitude || 1.0;

    if (s1 && s2 && s2.active) {
      const r1 = Math.hypot(receiver.position.x - s1.position.x, receiver.position.z - s1.position.z);
      const r2 = Math.hypot(receiver.position.x - s2.position.x, receiver.position.z - s2.position.z);
      pathDiff = Math.abs(r1 - r2);

      const k = (2 * Math.PI) / lambda;
      const phi1 = k * r1 - 2 * Math.PI * s1.frequency * t + (s1.phase || 0);
      const phi2 = k * r2 - 2 * Math.PI * s2.frequency * t + (s2.phase || 0);
      let dPhi = (Math.abs(phi1 - phi2) * 180 / Math.PI) % 360;
      if (dPhi > 180) dPhi = 360 - dPhi;
      phaseDiffDeg = dPhi;

      const A1 = s1.amplitude || 1.0;
      const A2 = s2.amplitude || 1.0;
      aRes = Math.sqrt(Math.max(0, A1 * A1 + A2 * A2 + 2 * A1 * A2 * Math.cos(dPhi * Math.PI / 180)));
    }

    const pathEl = document.getElementById('a2d-calc-pathdiff');
    const phaseEl = document.getElementById('a2d-calc-phasediff');
    const aresEl = document.getElementById('a2d-calc-ares');
    const betaEl = document.getElementById('a2d-calc-beta');
    const chipCond = document.getElementById('a2d-chip-condition');

    if (pathEl) pathEl.textContent = `${pathDiff.toFixed(2)} m (${(pathDiff / lambda).toFixed(2)} λ)`;
    if (phaseEl) phaseEl.textContent = `${phaseDiffDeg.toFixed(0)}° (${(phaseDiffDeg * Math.PI / 180).toFixed(2)} rad)`;
    if (aresEl) aresEl.textContent = `${aRes.toFixed(2)} arb`;
    if (betaEl) betaEl.textContent = `${beta.toFixed(2)} m`;

    if (chipCond) {
      if (phaseDiffDeg <= 25) {
        chipCond.textContent = '🟢 Constructive Maxima (উজ্জ্বল ডোরা)';
        chipCond.className = 'condition-chip constructive';
      } else if (phaseDiffDeg >= 155) {
        chipCond.textContent = '🔴 Destructive Node (অন্ধকার ডোরা)';
        chipCond.className = 'condition-chip destructive';
      } else {
        chipCond.textContent = '🟡 Intermediate Superposition';
        chipCond.className = 'condition-chip intermediate';
      }
    }
  }

  renderPhasorDiagram(s1, s2, recvPos, t) {
    const canvas = this.phasorCanvas;
    const ctx = this.phasorCtx;
    if (!canvas || !ctx) return;

    const w = 130;
    const h = 110;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = '#0a101f';
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2 + 5;
    const maxRadius = 38;

    ctx.strokeStyle = 'rgba(51, 65, 85, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - maxRadius - 5, cy);
    ctx.lineTo(cx + maxRadius + 5, cy);
    ctx.moveTo(cx, cy - maxRadius - 5);
    ctx.lineTo(cx, cy + maxRadius + 5);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(51, 65, 85, 0.3)';
    ctx.beginPath();
    ctx.arc(cx, cy, maxRadius, 0, Math.PI * 2);
    ctx.stroke();

    if (!s1) return;

    const r1 = Math.hypot(recvPos.x - s1.position.x, recvPos.z - s1.position.z);
    const k1 = (2 * Math.PI * s1.frequency) / (s1.speed || 3.0);
    const angle1 = (k1 * r1 - 2 * Math.PI * s1.frequency * t + (s1.phase || 0)) % (Math.PI * 2);
    const len1 = (s1.amplitude || 1.0) * 16;

    const x1 = cx + len1 * Math.cos(-angle1);
    const y1 = cy + len1 * Math.sin(-angle1);

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x1, y1);
    ctx.stroke();

    let endX = x1;
    let endY = y1;

    if (s2 && s2.active) {
      const r2 = Math.hypot(recvPos.x - s2.position.x, recvPos.z - s2.position.z);
      const k2 = (2 * Math.PI * s2.frequency) / (s2.speed || 3.0);
      const angle2 = (k2 * r2 - 2 * Math.PI * s2.frequency * t + (s2.phase || 0)) % (Math.PI * 2);
      const len2 = (s2.amplitude || 1.0) * 16;

      endX = x1 + len2 * Math.cos(-angle2);
      endY = y1 + len2 * Math.sin(-angle2);

      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }

    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(endX, endY, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  getTickValues() {
    const ticks = [];
    if (this.axisDomain === 'positive') {
      for (let x = 0; x <= 16; x += 2) ticks.push(x);
    } else if (this.axisDomain === 'negative') {
      for (let x = -16; x <= 0; x += 2) ticks.push(x);
    } else {
      for (let x = -14; x <= 14; x += 2) ticks.push(x);
    }
    return ticks;
  }

  /* =========================================================================
     CARTESIAN COORDINATE FRAME (X & Y AXES, GRID, ORIGIN, VELOCITY VECTOR)
     ========================================================================= */
  drawCartesianCoordinateFrame(ctx, w, h, topY, botY, midY, toPxX, toPxY, isPrimary = true, title = '') {
    const ticks = this.getTickValues();

    // 1. Subtle Background Grid Lines
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const x of ticks) {
      const px = toPxX(x);
      ctx.moveTo(px, topY + 4);
      ctx.lineTo(px, botY - 4);
    }
    // Horizontal amplitude lines at y = +/- 1.0, +/- 2.0
    [-2.0, -1.0, 1.0, 2.0].forEach(yVal => {
      const py = toPxY(yVal);
      if (py >= topY + 8 && py <= botY - 8) {
        ctx.moveTo(0, py);
        ctx.lineTo(w, py);
      }
    });
    ctx.stroke();

    // 2. High-Contrast Horizontal X-Axis
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(w, midY);
    ctx.stroke();

    // 3. High-Contrast Vertical Y-Axis (Passing through x = 0)
    if (this.xMin <= 0 && this.xMax >= 0) {
      const zeroPx = toPxX(0);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(zeroPx, topY + 4);
      ctx.lineTo(zeroPx, botY - 4);
      ctx.stroke();

      // Origin Label (0,0)
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText('(0,0)', zeroPx - 6, midY + 13);

      // Y-axis numerical ticks
      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px monospace';
      ctx.textAlign = 'right';
      [2.0, 1.0, -1.0, -2.0].forEach(yVal => {
        const py = toPxY(yVal);
        if (py >= topY + 14 && py <= botY - 14) {
          ctx.beginPath();
          ctx.moveTo(zeroPx - 4, py);
          ctx.lineTo(zeroPx + 4, py);
          ctx.stroke();
          ctx.fillText(`${yVal > 0 ? '+' : ''}${yVal.toFixed(1)}m`, zeroPx - 6, py + 3);
        }
      });

      // Y-axis Label
      if (isPrimary) {
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('↑ Y অক্ষ (সরণ y [m])', zeroPx + 8, topY + 16);
      }
    }

    // X-axis Direction Label
    if (isPrimary) {
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('X অক্ষ (দূরত্ব x [m]) →', w - 16, midY - 7);
    }

    // 4. Wave Speed & Direction Indicator
    if (isPrimary && this.waveMotionType === 'traveling') {
      const isFwd = (this.waveDirection === 'forward');
      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'left';
      const arrow = isFwd ? '──► (+x ডানমুখী চলমান)' : '◄── (-x বামমুখী চলমান)';
      ctx.fillText(`🌊 তরঙ্গ বেগ: v = 3.0 m/s  ${arrow}`, 20, topY + (title ? 36 : 18));
    }
  }

  /* =========================================================================
     MEDIUM PARTICLES SHM BEADS (মাধ্যমের কণার স্পন্দন)
     ========================================================================= */
  drawMediumParticles(ctx, samples, toPxX, toPxY, rx) {
    if (!this.showParticles || samples.length === 0) return;

    const count = 21;
    const step = Math.floor(samples.length / (count + 1));

    for (let k = 1; k <= count; k++) {
      const idx = k * step;
      if (!samples[idx]) continue;
      const s = samples[idx];
      const px = toPxX(s.x);
      const py = toPxY(s.psi);

      // Vertical guide line showing the particle only oscillates along its column
      ctx.strokeStyle = 'rgba(251, 146, 60, 0.2)';
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(px, toPxY(2.2));
      ctx.lineTo(px, toPxY(-2.2));
      ctx.stroke();
      ctx.setLineDash([]);

      // Particle bead
      const isNearRecv = Math.abs(s.x - rx) < 0.6;
      ctx.fillStyle = isNearRecv ? '#fbbf24' : '#fb923c';
      ctx.beginPath();
      ctx.arc(px, py, isNearRecv ? 5.5 : 4, 0, Math.PI * 2);
      ctx.fill();

      // Velocity arrow
      const vY = (idx > 0 && idx < samples.length - 1) ? -(samples[idx + 1].psi - samples[idx - 1].psi) * 14 : 0;
      if (Math.abs(vY) > 2) {
        ctx.strokeStyle = '#fca5a5';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px, py - Math.sign(vY) * Math.min(14, Math.abs(vY)));
        ctx.stroke();
      }
    }
  }

  /* =========================================================================
     CREST & TROUGH MARKERS (শীর্ষ ও খাঁদ ট্র্যাক)
     ========================================================================= */
  drawCrestTroughMarkers(ctx, samples, toPxX, toPxY) {
    if (!this.showCrestTroughs || samples.length === 0) return;

    for (let i = 3; i < samples.length - 3; i++) {
      const prev2 = samples[i - 2].psi;
      const prev = samples[i - 1].psi;
      const curr = samples[i].psi;
      const next = samples[i + 1].psi;
      const next2 = samples[i + 2].psi;

      // Crest peak
      if (curr > 0.55 && curr >= prev && curr >= next && curr >= prev2 && curr >= next2) {
        const px = toPxX(samples[i].x);
        const py = toPxY(curr);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.9)';
        ctx.fillRect(px - 26, py - 20, 52, 15);
        ctx.fillStyle = '#070b14';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('শীর্ষ (+A)', px, py - 9);
        i += 6;
      }
      // Trough valley
      else if (curr < -0.55 && curr <= prev && curr <= next && curr <= prev2 && curr <= next2) {
        const px = toPxX(samples[i].x);
        const py = toPxY(curr);
        ctx.fillStyle = 'rgba(244, 63, 94, 0.9)';
        ctx.fillRect(px - 26, py + 6, 52, 15);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('খাঁদ (-A)', px, py + 17);
        i += 6;
      }
    }
  }

  /* =========================================================================
     TIME DOMAIN GRAPH: y vs t (কণার সময়-সরণ স্পন্দন)
     ========================================================================= */
  renderTimeDomainGraph(rx) {
    const canvas = this.mainCanvas;
    const ctx = this.mainCtx;
    const w = canvas.clientWidth || 1000;
    const h = canvas.clientHeight || 500;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#070b14';
    ctx.fillRect(0, 0, w, h);

    const midY = h / 2;
    const toPxY = (val) => midY - (val / 2.6) * (h * 0.42);

    // Title banner
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`⏱️ কণার সময়-সরণ স্পন্দন লেখচিত্র: y(t) বনাম সময় t  [কণার অবস্থান: x = ${rx.toFixed(2)} m]`, 20, 26);

    // Horizontal Time Axis
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(w, midY);
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('সময় অক্ষ t (Time [s]) →', w - 16, midY - 8);

    if (this.timeHistory.length < 2) return;

    const tMin = this.timeHistory[0].t;
    const tMax = this.timeHistory[this.timeHistory.length - 1].t;
    const toPxT = (t) => ((t - tMin) / Math.max(0.01, tMax - tMin)) * (w - 40) + 20;

    // Draw SHM oscillation trajectory
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 2.6;
    ctx.shadowColor = '#34d399';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    for (let i = 0; i < this.timeHistory.length; i++) {
      const pt = this.timeHistory[i];
      const px = toPxT(pt.t);
      const py = toPxY(pt.y);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Current particle position indicator
    const lastPt = this.timeHistory[this.timeHistory.length - 1];
    const lastPx = toPxT(lastPt.t);
    const lastPy = toPxY(lastPt.y);

    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(lastPx, lastPy, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`y(R) = ${lastPt.y.toFixed(2)} m`, lastPx - 10, lastPy - 8);
  }

  /* =========================================================================
     GRAPH MODE 1: STACKED (Separate Source 1, Source 2 & Resultant Wave)
     ========================================================================= */
  renderStackedGraphs(samples, rx) {
    const canvas = this.mainCanvas;
    const ctx = this.mainCtx;
    const w = canvas.clientWidth || 1000;
    const h = canvas.clientHeight || 500;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#070b14';
    ctx.fillRect(0, 0, w, h);

    const rowHeight = h / 3;
    const toPxX = (x) => ((x - this.xMin) / (this.xMax - this.xMin)) * w;
    const ticks = this.getTickValues();

    const drawSubGraph = (rowIdx, title, color, key, isResultant = false) => {
      const topY = rowIdx * rowHeight;
      const botY = topY + rowHeight;
      const midY = topY + rowHeight / 2;

      ctx.fillStyle = rowIdx % 2 === 0 ? 'rgba(15, 23, 42, 0.6)' : 'rgba(11, 17, 32, 0.6)';
      ctx.fillRect(0, topY, w, rowHeight);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, botY);
      ctx.lineTo(w, botY);
      ctx.stroke();

      const toPxY = (v) => midY - (v / 2.2) * (rowHeight * 0.38);
      this.drawCartesianCoordinateFrame(ctx, w, h, topY, botY, midY, toPxX, toPxY, isResultant, title);

      ctx.fillStyle = color;
      ctx.font = 'bold 12px -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(title, 14, topY + 20);

      // Waveform curve
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = isResultant ? 2.5 : 1.8;
      if (isResultant) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
      }
      const toPxY = (v) => midY - (v / 2.2) * (rowHeight * 0.38);

      for (let i = 0; i < samples.length; i++) {
        const px = toPxX(samples[i].x);
        const py = toPxY(samples[i][key]);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Nodes & Antinodes (Only on Resultant)
      if (isResultant) {
        for (let i = 1; i < samples.length - 1; i++) {
          const prev = samples[i - 1].psi;
          const curr = samples[i].psi;
          const next = samples[i + 1].psi;

          if ((prev <= 0 && next >= 0) || (prev >= 0 && next <= 0)) {
            if (Math.abs(curr) < 0.18) {
              const px = toPxX(samples[i].x);
              ctx.fillStyle = '#f97316';
              ctx.beginPath();
              ctx.arc(px, midY, 4, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#fdba74';
              ctx.font = 'bold 9px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText('N', px, midY - 6);
            }
          }

          if ((curr > prev && curr > next && curr > 0.35) || (curr < prev && curr < next && curr < -0.35)) {
            const px = toPxX(samples[i].x);
            const py = toPxY(curr);
            ctx.fillStyle = '#06b6d4';
            ctx.beginPath();
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#67e8f9';
            ctx.font = 'bold 9px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('A', px, curr > 0 ? py - 6 : py + 14);
          }
        }
      }

      // Receiver Line
      if (rx >= this.xMin && rx <= this.xMax) {
        const recvPx = toPxX(rx);
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(recvPx, topY);
        ctx.lineTo(recvPx, botY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (isResultant) {
        this.drawMediumParticles(ctx, samples, toPxX, toPxY, rx);
        this.drawCrestTroughMarkers(ctx, samples, toPxX, toPxY);
      }
    };

    drawSubGraph(0, 'Source 1 Waveform: y₁(x, t) = A₁·cos(k₁r₁ - ω₁t + ϕ₁)', '#38bdf8', 'y1');
    drawSubGraph(1, 'Source 2 Waveform: y₂(x, t) = A₂·cos(k₂r₂ - ω₂t + ϕ₂)', '#f43f5e', 'y2');
    drawSubGraph(2, 'Resultant Superposition: Ψ(x, t) = y₁ + y₂  [N: নিস্পন্দ বিন্দু, A: সুস্পন্দ বিন্দু]', '#34d399', 'psi', true);

    // Axis coordinate labels along bottom
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px -apple-system, monospace';
    ctx.textAlign = 'center';
    for (const x of ticks) {
      if (this.axisDomain === 'both' && Math.abs(x) % 4 !== 0) continue;
      const px = toPxX(x);
      ctx.fillText(`${x}m`, px, h - 6);
    }

    // Receiver Tag at Top
    if (rx >= this.xMin && rx <= this.xMax) {
      const recvPx = toPxX(rx);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(recvPx - 38, 4, 76, 18);
      ctx.fillStyle = '#070b14';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Recv (${rx.toFixed(2)}m)`, recvPx, 17);
    }

    if (this.isHovering && this.hoverX !== null) {
      const hPx = toPxX(this.hoverX);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(hPx, 0);
      ctx.lineTo(hPx, h);
      ctx.stroke();
    }
  }

  /* =========================================================================
     GRAPH MODE 2: SUPERIMPOSED (All Sources + Resultant on One Canvas)
     ========================================================================= */
  renderSuperimposedGraph(samples, rx) {
    const canvas = this.mainCanvas;
    const ctx = this.mainCtx;
    const w = canvas.clientWidth || 1000;
    const h = canvas.clientHeight || 500;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#070b14';
    ctx.fillRect(0, 0, w, h);

    const midY = h / 2;
    const toPxX = (x) => ((x - this.xMin) / (this.xMax - this.xMin)) * w;
    const toPxY = (val) => midY - (val / 2.6) * (h * 0.42);
    const ticks = this.getTickValues();

    this.drawCartesianCoordinateFrame(ctx, w, h, 20, h - 20, midY, toPxX, toPxY, true);

    // Axis labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px -apple-system, monospace';
    ctx.textAlign = 'center';
    for (const x of ticks) {
      if (this.axisDomain === 'both' && Math.abs(x) % 4 !== 0) continue;
      const px = toPxX(x);
      ctx.fillText(`${x}m`, px, h - 6);
    }

    // Source 1 dashed
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    for (let i = 0; i < samples.length; i++) {
      const px = toPxX(samples[i].x);
      const py = toPxY(samples[i].y1);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Source 2 dashed
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.6)';
    ctx.beginPath();
    for (let i = 0; i < samples.length; i++) {
      const px = toPxX(samples[i].x);
      const py = toPxY(samples[i].y2);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Resultant solid with glow
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(52, 211, 153, 0.7)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    for (let i = 0; i < samples.length; i++) {
      const px = toPxX(samples[i].x);
      const py = toPxY(samples[i].psi);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    this.drawMediumParticles(ctx, samples, toPxX, toPxY, rx);
    this.drawCrestTroughMarkers(ctx, samples, toPxX, toPxY);

    // Legend
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(16, 16, 340, 32);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(16, 16, 340, 32);
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('-- y₁(x) Src 1', 28, 36);
    ctx.fillStyle = '#f43f5e';
    ctx.fillText('-- y₂(x) Src 2', 125, 36);
    ctx.fillStyle = '#34d399';
    ctx.fillText('— Resultant Ψ(x)', 220, 36);

    // Receiver Line
    if (rx >= this.xMin && rx <= this.xMax) {
      const recvPx = toPxX(rx);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(recvPx, 0);
      ctx.lineTo(recvPx, h);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  /* =========================================================================
     GRAPH MODE 3: RESULTANT ONLY
     ========================================================================= */
  renderResultantGraph(samples, rx) {
    const canvas = this.mainCanvas;
    const ctx = this.mainCtx;
    const w = canvas.clientWidth || 1000;
    const h = canvas.clientHeight || 500;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#070b14';
    ctx.fillRect(0, 0, w, h);

    const midY = h / 2;
    const toPxX = (x) => ((x - this.xMin) / (this.xMax - this.xMin)) * w;
    const toPxY = (val) => midY - (val / 2.6) * (h * 0.42);
    const ticks = this.getTickValues();

    ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(w, midY);
    for (const x of ticks) {
      const px = toPxX(x);
      ctx.moveTo(px, 0);
      ctx.lineTo(px, h);
    }
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px -apple-system, monospace';
    ctx.textAlign = 'center';
    for (const x of ticks) {
      if (this.axisDomain === 'both' && Math.abs(x) % 4 !== 0) continue;
      const px = toPxX(x);
      ctx.fillText(`${x}m`, px, h - 6);
    }

    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 3.5;
    ctx.shadowColor = '#34d399';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    for (let i = 0; i < samples.length; i++) {
      const px = toPxX(samples[i].x);
      const py = toPxY(samples[i].psi);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Nodes & Antinodes
    for (let i = 1; i < samples.length - 1; i++) {
      const prev = samples[i - 1].psi;
      const curr = samples[i].psi;
      const next = samples[i + 1].psi;

      if ((prev <= 0 && next >= 0) || (prev >= 0 && next <= 0)) {
        if (Math.abs(curr) < 0.18) {
          const px = toPxX(samples[i].x);
          ctx.fillStyle = '#f97316';
          ctx.beginPath();
          ctx.arc(px, midY, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fdba74';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('N', px, midY - 8);
        }
      }

      if ((curr > prev && curr > next && curr > 0.35) || (curr < prev && curr < next && curr < -0.35)) {
        const px = toPxX(samples[i].x);
        const py = toPxY(curr);
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#67e8f9';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('A', px, curr > 0 ? py - 8 : py + 16);
      }
    }

    if (rx >= this.xMin && rx <= this.xMax) {
      const recvPx = toPxX(rx);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(recvPx, 0);
      ctx.lineTo(recvPx, h);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  /* =========================================================================
     GRAPH MODE 4: FRINGE INTENSITY & OPTICAL SCREEN
     ========================================================================= */
  renderIntensityGraph(samples, rx, beta) {
    const canvas = this.mainCanvas;
    const ctx = this.mainCtx;
    const w = canvas.clientWidth || 1000;
    const h = canvas.clientHeight || 500;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#070b14';
    ctx.fillRect(0, 0, w, h);

    const stripHeight = 36;
    const plotBottom = h - stripHeight - 14;
    const plotTop = 30;
    const plotHeight = plotBottom - plotTop;

    const toPxX = (x) => ((x - this.xMin) / (this.xMax - this.xMin)) * w;
    const toPxY = (normI) => plotBottom - normI * plotHeight;
    const ticks = this.getTickValues();

    ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
    ctx.beginPath();
    ctx.moveTo(0, plotBottom);
    ctx.lineTo(w, plotBottom);
    for (const x of ticks) {
      const px = toPxX(x);
      ctx.moveTo(px, plotTop);
      ctx.lineTo(px, plotBottom);
    }
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px -apple-system, monospace';
    ctx.textAlign = 'center';
    for (const x of ticks) {
      if (this.axisDomain === 'both' && Math.abs(x) % 4 !== 0) continue;
      const px = toPxX(x);
      ctx.fillText(`${x}m`, px, plotBottom + 12);
    }

    // Filled Golden Gradient Envelope
    ctx.beginPath();
    ctx.moveTo(toPxX(samples[0].x), plotBottom);
    for (let i = 0; i < samples.length; i++) {
      ctx.lineTo(toPxX(samples[i].x), toPxY(samples[i].normIntensity));
    }
    ctx.lineTo(toPxX(samples[samples.length - 1].x), plotBottom);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, plotTop, 0, plotBottom);
    gradient.addColorStop(0, 'rgba(251, 191, 36, 0.7)');
    gradient.addColorStop(0.5, 'rgba(245, 158, 11, 0.35)');
    gradient.addColorStop(1, 'rgba(180, 83, 9, 0.05)');
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < samples.length; i++) {
      const px = toPxX(samples[i].x);
      const py = toPxY(samples[i].normIntensity);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Optical Screen Strip
    const stripY = h - stripHeight;
    for (let i = 0; i < samples.length; i++) {
      const px1 = toPxX(samples[i].x);
      const px2 = i < samples.length - 1 ? toPxX(samples[i + 1].x) : w;
      const val = samples[i].normIntensity;
      const r = Math.floor(251 * val);
      const g = Math.floor(191 * val);
      const b = Math.floor(36 * val);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(px1, stripY, Math.max(1, px2 - px1 + 1), stripHeight);
    }

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0, stripY, w, stripHeight);

    ctx.fillStyle = '#000';
    ctx.fillRect(8, stripY + 6, 210, 20);
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Observation Screen Interferogram', 14, stripY + 20);

    // Fringe Width beta bracket
    if (beta && beta > 0.4 && beta < 14 && beta >= this.xMin && beta <= this.xMax && 0 >= this.xMin && 0 <= this.xMax) {
      const p0 = toPxX(0);
      const p1 = toPxX(beta);
      const bY = plotTop + 20;

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p0, bY);
      ctx.lineTo(p1, bY);
      ctx.moveTo(p0, bY - 5);
      ctx.lineTo(p0, bY + 5);
      ctx.moveTo(p1, bY - 5);
      ctx.lineTo(p1, bY + 5);
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Fringe Width β = ${beta.toFixed(2)}m`, (p0 + p1) / 2, bY - 7);
    }

    if (rx >= this.xMin && rx <= this.xMax) {
      const recvPx = toPxX(rx);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(recvPx, plotTop);
      ctx.lineTo(recvPx, h);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}
