/**
 * 3D Interactive Wave & Acoustics Laboratory
 * Right Panel: Object Inspector, 3D Vector Math, Lock Controls,
 * Formula Buttons & Universal Keyboard Numeric Input System
 */

export class RightPanel {
  constructor(containerElement, onParamChange) {
    this.container = containerElement;
    this.onParamChange = onParamChange;
    this.selectedObject = null;
    this.unitSystem = 'm'; // 'm' or 'cm'
  }

  setSelectedObject(objData) {
    this.selectedObject = objData;
    this.render();
  }

  render() {
    if (!this.container) return;

    if (!this.selectedObject || !this.selectedObject.dataRef) {
      this.container.innerHTML = `
        <div class="empty-inspector">
          <div class="inspector-icon">🎯</div>
          <h4>No Object Selected</h4>
          <p>Click any Wave Source, Receiver Sensor, Wall, or Slit in the 3D viewport to inspect its coordinates, vectors, and physics parameters.</p>
        </div>
      `;
      return;
    }

    const { type, dataRef } = this.selectedObject;

    if (type === 'source') {
      this.renderSourceInspector(dataRef);
    } else if (type === 'receiver') {
      this.renderReceiverInspector(dataRef);
    } else if (type === 'wall') {
      this.renderWallInspector(dataRef);
    } else if (type === 'slit') {
      this.renderSlitInspector(dataRef);
    }
  }

  renderSourceInspector(src) {
    const phaseDeg = Math.round(((src.phase || 0) * 180) / Math.PI) % 360;
    const wavelength = ((src.speed || 3.0) / (src.frequency || 1.0)).toFixed(2);
    const distFromOrigin = Math.hypot(src.position.x, src.position.z).toFixed(2);
    const dirX = distFromOrigin > 0 ? (src.position.x / distFromOrigin).toFixed(2) : '0.00';
    const dirZ = distFromOrigin > 0 ? (src.position.z / distFromOrigin).toFixed(2) : '0.00';

    const motion = (window.app && window.app.movingSrcMgr) ? window.app.movingSrcMgr.getMotion(src.id) : null;
    const isMoving = motion && motion.enabled;

    this.container.innerHTML = `
      <div class="inspector-card">
        <div class="inspector-header">
          <div class="title-wrap">
            <span class="color-dot" style="background: #${(src.color || 0x38bdf8).toString(16).padStart(6, '0')}"></span>
            <input type="text" id="src-name-input" class="name-edit-input" value="${src.name || 'Wave Source'}" title="Edit Name">
          </div>
          <button id="btn-obj-lock" class="btn-lock ${src.locked ? 'locked' : ''}">
            ${src.locked ? '🔒 Locked' : '🔓 Lock'}
          </button>
        </div>

        <!-- 3D Vector Inspector -->
        <div class="vector-inspector-box">
          <div class="vec-row">
            <span>Position Vector:</span>
            <strong>r⃗ = (${src.position.x.toFixed(1)}, 0, ${src.position.z.toFixed(1)}) m</strong>
            <button class="btn-fx-inspect" data-formula="position" title="Inspect Vector Math">f(x)</button>
          </div>
          <div class="vec-row">
            <span>Distance from Origin:</span>
            <strong>|r⃗| = ${distFromOrigin} m</strong>
          </div>
          <div class="vec-row">
            <span>Direction Unit Vector:</span>
            <strong>û = (${dirX}, ${dirZ})</strong>
          </div>
        </div>

        <!-- Frequency with Direct Keyboard Input -->
        <div class="param-group">
          <div class="param-header">
            <span>Frequency (f)</span>
            <div class="num-input-wrap">
              <input type="number" id="src-freq-num" class="param-num-input" min="0.05" max="10.0" step="0.05" value="${(src.frequency || 1.0).toFixed(2)}">
              <span class="unit">Hz</span>
            </div>
          </div>
          <input type="range" id="src-freq" min="0.2" max="3.0" step="0.05" value="${src.frequency || 1.0}">
        </div>

        <!-- Amplitude with Direct Keyboard Input -->
        <div class="param-group">
          <div class="param-header">
            <span>Amplitude (A)</span>
            <div class="num-input-wrap">
              <input type="number" id="src-amp-num" class="param-num-input" min="0.0" max="5.0" step="0.05" value="${(src.amplitude || 1.0).toFixed(2)}">
              <span class="unit">arb</span>
            </div>
          </div>
          <input type="range" id="src-amp" min="0.1" max="2.5" step="0.05" value="${src.amplitude || 1.0}">
        </div>

        <!-- Phase with Direct Keyboard Input -->
        <div class="param-group">
          <div class="param-header">
            <span>Initial Phase (ϕ)</span>
            <div class="num-input-wrap">
              <input type="number" id="src-phase-num" class="param-num-input" min="-720" max="720" step="15" value="${phaseDeg}">
              <span class="unit">°</span>
            </div>
          </div>
          <input type="range" id="src-phase" min="0" max="360" step="15" value="${phaseDeg}">
        </div>

        <!-- Wave Speed with Direct Keyboard Input -->
        <div class="param-group">
          <div class="param-header">
            <span>Wave Speed (v)</span>
            <div class="num-input-wrap">
              <input type="number" id="src-speed-num" class="param-num-input" min="0.2" max="15.0" step="0.1" value="${(src.speed || 3.0).toFixed(1)}">
              <span class="unit">m/s</span>
            </div>
          </div>
          <input type="range" id="src-speed" min="1.0" max="6.0" step="0.5" value="${src.speed || 3.0}">
        </div>

        <div class="computed-badge">
          <span>Wavelength (λ = v/f):</span>
          <strong id="val-computed-lambda">${wavelength} m</strong>
          <button class="btn-fx-inspect" data-formula="wavelength" title="Inspect Formula">f(x)</button>
        </div>

        <!-- Motion & Doppler Controls -->
        <div class="motion-control-card" style="margin-top: 10px; padding: 10px; background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 8px;">
          <div class="motion-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <strong style="font-size: 13px; color: #38bdf8;">🚗 Source Motion (Doppler)</strong>
            <label style="display: flex; align-items: center; gap: 4px; font-size: 12px; cursor: pointer;">
              <input type="checkbox" id="chk-src-moving" ${isMoving ? 'checked' : ''}>
              <span>Enable</span>
            </label>
          </div>
          
          <div id="motion-settings-box" style="${isMoving ? '' : 'display: none;'}">
            <div class="param-group" style="margin-bottom: 6px;">
              <div class="param-header">
                <span style="font-size: 11px;">Motion Pattern</span>
              </div>
              <select id="sel-motion-mode" style="width: 100%; padding: 4px; background: var(--bg-input, #1e293b); color: #fff; border: 1px solid var(--border-color, #334155); border-radius: 4px; font-size: 12px;">
                <option value="linear" ${(!motion || motion.mode === 'linear') ? 'selected' : ''}>Linear (Reciprocating)</option>
                <option value="circular" ${(motion && motion.mode === 'circular') ? 'selected' : ''}>Circular Orbit</option>
              </select>
            </div>

            <div class="param-group" style="margin-bottom: 6px;">
              <div class="param-header">
                <span style="font-size: 11px;">Speed (v_s)</span>
                <div class="num-input-wrap">
                  <input type="number" id="num-motion-speed" class="param-num-input" min="0.1" max="10.0" step="0.1" value="${(motion ? motion.speed : 1.5).toFixed(1)}">
                  <span class="unit">m/s</span>
                </div>
              </div>
              <input type="range" id="slider-motion-speed" min="0.5" max="4.0" step="0.25" value="${motion ? motion.speed : 1.5}">
            </div>

            <div class="param-group">
              <div class="param-header">
                <span style="font-size: 11px;">Range / Radius</span>
                <div class="num-input-wrap">
                  <input type="number" id="num-motion-range" class="param-num-input" min="1" max="25" step="0.5" value="${(motion ? motion.range : 8).toFixed(1)}">
                  <span class="unit">m</span>
                </div>
              </div>
              <input type="range" id="slider-motion-range" min="3" max="14" step="1" value="${motion ? motion.range : 8}">
            </div>
            
            <div style="margin-top: 6px; text-align: right;">
              <button class="btn-fx-inspect" data-formula="doppler" title="Inspect Doppler Formula" style="font-size: 11px; padding: 2px 6px;">Doppler f(x)</button>
            </div>
          </div>
        </div>

        <div class="param-group-coords" style="margin-top: 10px;">
          <span class="coord-label">Coordinates:</span>
          <div class="coord-inputs">
            <label>X: <input type="number" id="src-pos-x" step="0.5" min="-17" max="17" value="${src.position.x.toFixed(1)}"></label>
            <label>Z: <input type="number" id="src-pos-z" step="0.5" min="-17" max="17" value="${src.position.z.toFixed(1)}"></label>
          </div>
        </div>
      </div>
    `;

    this.attachSourceListeners(src);
  }

  renderReceiverInspector(recv) {
    const distFromOrigin = Math.hypot(recv.position.x, recv.position.z).toFixed(2);
    const dirX = distFromOrigin > 0 ? (recv.position.x / distFromOrigin).toFixed(2) : '0.00';
    const dirZ = distFromOrigin > 0 ? (recv.position.z / distFromOrigin).toFixed(2) : '0.00';

    this.container.innerHTML = `
      <div class="inspector-card">
        <div class="inspector-header">
          <div class="title-wrap">
            <span class="color-dot" style="background: #10b981"></span>
            <h4>Receiver Sensor (R)</h4>
          </div>
          <button id="btn-obj-lock" class="btn-lock ${recv.locked ? 'locked' : ''}">
            ${recv.locked ? '🔒 Locked' : '🔓 Lock'}
          </button>
        </div>

        <!-- 3D Vector Inspector -->
        <div class="vector-inspector-box">
          <div class="vec-row">
            <span>Position Vector:</span>
            <strong>r⃗ = (${recv.position.x.toFixed(1)}, 0, ${recv.position.z.toFixed(1)}) m</strong>
            <button class="btn-fx-inspect" data-formula="superposition" title="Inspect Superposition Formula">f(x)</button>
          </div>
          <div class="vec-row">
            <span>Distance from Origin:</span>
            <strong>|r⃗| = ${distFromOrigin} m</strong>
          </div>
          <div class="vec-row">
            <span>Unit Vector:</span>
            <strong>û = (${dirX}, ${dirZ})</strong>
          </div>
        </div>

        <div class="param-group-coords">
          <span class="coord-label">Sensor Coordinates (Direct Type):</span>
          <div class="coord-inputs">
            <label>X: <input type="number" id="recv-pos-x" step="0.25" min="-17" max="17" value="${recv.position.x.toFixed(2)}"></label>
            <label>Z: <input type="number" id="recv-pos-z" step="0.25" min="-17" max="17" value="${recv.position.z.toFixed(2)}"></label>
          </div>
        </div>
      </div>
    `;

    this.container.querySelector('#btn-obj-lock').addEventListener('click', () => {
      recv.locked = !recv.locked;
      this.renderReceiverInspector(recv);
    });

    const clampCoord = (val) => Math.max(-17, Math.min(17, isNaN(val) ? 0 : val));
    const inpX = this.container.querySelector('#recv-pos-x');
    const inpZ = this.container.querySelector('#recv-pos-z');

    inpX.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        recv.position.x = clampCoord(val);
        this.onParamChange('receiver', recv.id, 'position', recv.position);
      }
    });

    inpZ.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        recv.position.z = clampCoord(val);
        this.onParamChange('receiver', recv.id, 'position', recv.position);
      }
    });

    this.container.querySelectorAll('.btn-fx-inspect').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const formulaType = e.currentTarget.getAttribute('data-formula');
        if (window.app && window.app.tools && window.app.tools.openFormulaInspector) {
          window.app.tools.openFormulaInspector(formulaType, { receiver: recv });
        }
      });
    });
  }

  renderWallInspector(wall) {
    this.container.innerHTML = `
      <div class="inspector-card">
        <div class="inspector-header">
          <div class="title-wrap">
            <span class="color-dot" style="background: #64748b"></span>
            <h4>${wall.name || 'Reflective Wall'}</h4>
          </div>
          <button id="btn-obj-lock" class="btn-lock ${wall.locked ? 'locked' : ''}">
            ${wall.locked ? '🔒 Locked' : '🔓 Lock'}
          </button>
        </div>

        <div class="param-group">
          <div class="param-header">
            <span>Reflectivity (R)</span>
            <div class="num-input-wrap">
              <input type="number" id="wall-refl-num" class="param-num-input" min="0" max="100" step="1" value="${Math.round((wall.reflectivity || 0.85) * 100)}">
              <span class="unit">%</span>
            </div>
          </div>
          <input type="range" id="wall-refl" min="0.1" max="1.0" step="0.05" value="${wall.reflectivity || 0.85}">
        </div>

        <div class="param-group">
          <div class="param-header">
            <span>Width</span>
            <div class="num-input-wrap">
              <input type="number" id="wall-width-num" class="param-num-input" min="1" max="40" step="0.5" value="${(wall.width || 12).toFixed(1)}">
              <span class="unit">m</span>
            </div>
          </div>
          <input type="range" id="wall-width" min="4" max="24" step="1" value="${wall.width || 12}">
        </div>

        <div class="param-group-coords">
          <span class="coord-label">Wall Position:</span>
          <div class="coord-inputs">
            <label>X: <input type="number" id="wall-pos-x" step="0.5" min="-17" max="17" value="${wall.position.x.toFixed(1)}"></label>
            <label>Z: <input type="number" id="wall-pos-z" step="0.5" min="-17" max="17" value="${wall.position.z.toFixed(1)}"></label>
          </div>
        </div>
      </div>
    `;

    this.container.querySelector('#btn-obj-lock').addEventListener('click', () => {
      wall.locked = !wall.locked;
      this.renderWallInspector(wall);
    });

    const clampCoord = (val) => Math.max(-17, Math.min(17, isNaN(val) ? 0 : val));
    const reflSlider = this.container.querySelector('#wall-refl');
    const reflNum = this.container.querySelector('#wall-refl-num');
    const widthSlider = this.container.querySelector('#wall-width');
    const widthNum = this.container.querySelector('#wall-width-num');
    const wallX = this.container.querySelector('#wall-pos-x');
    const wallZ = this.container.querySelector('#wall-pos-z');

    const updateRefl = (val) => {
      wall.reflectivity = Math.max(0, Math.min(1.0, val));
      reflSlider.value = wall.reflectivity;
      reflNum.value = Math.round(wall.reflectivity * 100);
      this.onParamChange('wall', wall.id, 'reflectivity', wall.reflectivity);
    };

    reflSlider.addEventListener('input', (e) => updateRefl(parseFloat(e.target.value)));
    reflNum.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      if (!isNaN(v)) updateRefl(v / 100);
    });

    const updateWidth = (val) => {
      wall.width = Math.max(1, Math.min(40, val));
      widthSlider.value = wall.width;
      widthNum.value = wall.width.toFixed(1);
      this.onParamChange('wall', wall.id, 'width', wall.width);
    };

    widthSlider.addEventListener('input', (e) => updateWidth(parseFloat(e.target.value)));
    widthNum.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      if (!isNaN(v)) updateWidth(v);
    });

    wallX.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      if (!isNaN(v)) {
        wall.position.x = clampCoord(v);
        this.onParamChange('wall', wall.id, 'position', wall.position);
      }
    });

    wallZ.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      if (!isNaN(v)) {
        wall.position.z = clampCoord(v);
        this.onParamChange('wall', wall.id, 'position', wall.position);
      }
    });
  }

  renderSlitInspector(slit) {
    const isDouble = slit.type === 'double';

    this.container.innerHTML = `
      <div class="inspector-card">
        <div class="inspector-header">
          <div class="title-wrap">
            <span class="color-dot" style="background: #a855f7"></span>
            <h4>${slit.name || (isDouble ? 'Double Slit' : 'Single Slit')}</h4>
          </div>
          <button id="btn-obj-lock" class="btn-lock ${slit.locked ? 'locked' : ''}">
            ${slit.locked ? '🔒 Locked' : '🔓 Lock'}
          </button>
        </div>

        <div class="param-group">
          <div class="param-header">
            <span>Slit Width (w)</span>
            <div class="num-input-wrap">
              <input type="number" id="slit-w-num" class="param-num-input" min="0.1" max="10.0" step="0.1" value="${(slit.width || 1.2).toFixed(1)}">
              <span class="unit">m</span>
            </div>
          </div>
          <input type="range" id="slit-w" min="0.4" max="3.0" step="0.1" value="${slit.width || 1.2}">
        </div>

        ${isDouble ? `
        <div class="param-group">
          <div class="param-header">
            <span>Slit Separation (d)</span>
            <div class="num-input-wrap">
              <input type="number" id="slit-sep-num" class="param-num-input" min="0.5" max="15.0" step="0.1" value="${(slit.separation || 2.5).toFixed(1)}">
              <span class="unit">m</span>
            </div>
          </div>
          <input type="range" id="slit-sep" min="1.0" max="6.0" step="0.2" value="${slit.separation || 2.5}">
        </div>
        ` : ''}

        <div class="param-group-coords">
          <span class="coord-label">Barrier Position Z:</span>
          <div class="coord-inputs">
            <label>Z: <input type="number" id="slit-pos-z" step="0.5" min="-17" max="17" value="${slit.position.z.toFixed(1)}"></label>
            <button class="btn-fx-inspect" data-formula="diffraction" title="Inspect Diffraction Formula">f(x)</button>
          </div>
        </div>
      </div>
    `;

    this.container.querySelector('#btn-obj-lock').addEventListener('click', () => {
      slit.locked = !slit.locked;
      this.renderSlitInspector(slit);
    });

    const clampCoord = (val) => Math.max(-17, Math.min(17, isNaN(val) ? 0 : val));
    const slitZ = this.container.querySelector('#slit-pos-z');
    if (slitZ) {
      slitZ.addEventListener('input', (e) => {
        const v = parseFloat(e.target.value);
        if (!isNaN(v)) {
          slit.position.z = clampCoord(v);
          this.onParamChange('slit', slit.id, 'position', slit.position);
        }
      });
    }

    const widthSlider = this.container.querySelector('#slit-w');
    const widthNum = this.container.querySelector('#slit-w-num');
    const updateWidth = (val) => {
      slit.width = Math.max(0.1, Math.min(10.0, val));
      widthSlider.value = slit.width;
      widthNum.value = slit.width.toFixed(1);
      this.onParamChange('slit', slit.id, 'width', slit.width);
    };
    widthSlider.addEventListener('input', (e) => updateWidth(parseFloat(e.target.value)));
    widthNum.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      if (!isNaN(v)) updateWidth(v);
    });

    if (isDouble) {
      const sepSlider = this.container.querySelector('#slit-sep');
      const sepNum = this.container.querySelector('#slit-sep-num');
      const updateSep = (val) => {
        slit.separation = Math.max(0.2, Math.min(15.0, val));
        sepSlider.value = slit.separation;
        sepNum.value = slit.separation.toFixed(1);
        this.onParamChange('slit', slit.id, 'separation', slit.separation);
      };
      sepSlider.addEventListener('input', (e) => updateSep(parseFloat(e.target.value)));
      sepNum.addEventListener('input', (e) => {
        const v = parseFloat(e.target.value);
        if (!isNaN(v)) updateSep(v);
      });
    }

    this.container.querySelectorAll('.btn-fx-inspect').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const formulaType = e.currentTarget.getAttribute('data-formula');
        if (window.app && window.app.tools && window.app.tools.openFormulaInspector) {
          window.app.tools.openFormulaInspector(formulaType, { slit });
        }
      });
    });
  }

  attachSourceListeners(src) {
    const lockBtn = this.container.querySelector('#btn-obj-lock');
    const nameInput = this.container.querySelector('#src-name-input');
    const freqSlider = this.container.querySelector('#src-freq');
    const freqNum = this.container.querySelector('#src-freq-num');
    const ampSlider = this.container.querySelector('#src-amp');
    const ampNum = this.container.querySelector('#src-amp-num');
    const phaseSlider = this.container.querySelector('#src-phase');
    const phaseNum = this.container.querySelector('#src-phase-num');
    const speedSlider = this.container.querySelector('#src-speed');
    const speedNum = this.container.querySelector('#src-speed-num');
    const posX = this.container.querySelector('#src-pos-x');
    const posZ = this.container.querySelector('#src-pos-z');
    const lambdaBadge = this.container.querySelector('#val-computed-lambda');

    // Motion elements
    const chkMoving = this.container.querySelector('#chk-src-moving');
    const motionBox = this.container.querySelector('#motion-settings-box');
    const selMode = this.container.querySelector('#sel-motion-mode');
    const sliderSpeed = this.container.querySelector('#slider-motion-speed');
    const numSpeed = this.container.querySelector('#num-motion-speed');
    const sliderRange = this.container.querySelector('#slider-motion-range');
    const numRange = this.container.querySelector('#num-motion-range');

    lockBtn.addEventListener('click', () => {
      src.locked = !src.locked;
      this.renderSourceInspector(src);
    });

    nameInput.addEventListener('change', (e) => {
      src.name = e.target.value.trim() || 'Source';
      this.onParamChange('source', src.id, 'name', src.name);
    });

    const updateLambda = () => {
      if (lambdaBadge) {
        lambdaBadge.textContent = `${((src.speed || 3.0) / (src.frequency || 1.0)).toFixed(2)} m`;
      }
    };

    // Frequency dual binding
    const updateFreq = (val) => {
      src.frequency = Math.max(0.05, Math.min(10.0, val));
      freqSlider.value = src.frequency;
      freqNum.value = src.frequency.toFixed(2);
      updateLambda();
      this.onParamChange('source', src.id, 'frequency', src.frequency);
    };
    freqSlider.addEventListener('input', (e) => updateFreq(parseFloat(e.target.value)));
    freqNum.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      if (!isNaN(v)) updateFreq(v);
    });

    // Amplitude dual binding
    const updateAmp = (val) => {
      src.amplitude = Math.max(0, Math.min(5.0, val));
      ampSlider.value = src.amplitude;
      ampNum.value = src.amplitude.toFixed(2);
      this.onParamChange('source', src.id, 'amplitude', src.amplitude);
    };
    ampSlider.addEventListener('input', (e) => updateAmp(parseFloat(e.target.value)));
    ampNum.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      if (!isNaN(v)) updateAmp(v);
    });

    // Phase dual binding
    const updatePhase = (deg) => {
      src.phase = (deg * Math.PI) / 180;
      phaseSlider.value = ((deg % 360) + 360) % 360;
      phaseNum.value = deg;
      this.onParamChange('source', src.id, 'phase', src.phase);
    };
    phaseSlider.addEventListener('input', (e) => updatePhase(parseFloat(e.target.value)));
    phaseNum.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      if (!isNaN(v)) updatePhase(v);
    });

    // Speed dual binding
    const updateSpeed = (val) => {
      src.speed = Math.max(0.2, Math.min(20.0, val));
      speedSlider.value = src.speed;
      speedNum.value = src.speed.toFixed(1);
      updateLambda();
      this.onParamChange('source', src.id, 'speed', src.speed);
    };
    speedSlider.addEventListener('input', (e) => updateSpeed(parseFloat(e.target.value)));
    speedNum.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      if (!isNaN(v)) updateSpeed(v);
    });

    const clampCoord = (val) => Math.max(-17, Math.min(17, isNaN(val) ? 0 : val));

    posX.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      if (!isNaN(v)) {
        src.position.x = clampCoord(v);
        this.onParamChange('source', src.id, 'position', src.position);
      }
    });

    posZ.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      if (!isNaN(v)) {
        src.position.z = clampCoord(v);
        this.onParamChange('source', src.id, 'position', src.position);
      }
    });

    // Motion listeners
    const applyMotionConfig = () => {
      const enabled = chkMoving ? chkMoving.checked : false;
      const mode = selMode ? selMode.value : 'linear';
      const speed = sliderSpeed ? parseFloat(sliderSpeed.value) : 1.5;
      const range = sliderRange ? parseFloat(sliderRange.value) : 8;

      if (window.app && window.app.movingSrcMgr) {
        window.app.movingSrcMgr.configureMotion(src.id, {
          enabled,
          mode,
          speed,
          range,
          axis: 'x'
        });
      }
      this.onParamChange('source', src.id, 'motion', { enabled, mode, speed, range });
    };

    if (chkMoving) {
      chkMoving.addEventListener('change', (e) => {
        if (motionBox) motionBox.style.display = e.target.checked ? 'block' : 'none';
        applyMotionConfig();
      });
    }

    if (selMode) {
      selMode.addEventListener('change', applyMotionConfig);
    }

    if (sliderSpeed && numSpeed) {
      sliderSpeed.addEventListener('input', (e) => {
        numSpeed.value = parseFloat(e.target.value).toFixed(1);
        applyMotionConfig();
      });
      numSpeed.addEventListener('input', (e) => {
        const v = parseFloat(e.target.value);
        if (!isNaN(v)) {
          sliderSpeed.value = v;
          applyMotionConfig();
        }
      });
    }

    if (sliderRange && numRange) {
      sliderRange.addEventListener('input', (e) => {
        numRange.value = parseFloat(e.target.value).toFixed(1);
        applyMotionConfig();
      });
      numRange.addEventListener('input', (e) => {
        const v = parseFloat(e.target.value);
        if (!isNaN(v)) {
          sliderRange.value = v;
          applyMotionConfig();
        }
      });
    }

    // Formula buttons
    this.container.querySelectorAll('.btn-fx-inspect').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const formulaType = e.currentTarget.getAttribute('data-formula');
        if (window.app && window.app.tools && window.app.tools.openFormulaInspector) {
          window.app.tools.openFormulaInspector(formulaType, { source: src });
        }
      });
    });
  }
}
