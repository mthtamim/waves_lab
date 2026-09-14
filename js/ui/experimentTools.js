/**
 * 3D Interactive Wave & Acoustics Laboratory
 * Experiment Tools: Undo/Redo, Formula Inspector, Teacher Annotation, Presentation Mode, Glossary & Snapshot
 */

export class ExperimentTools {
  constructor(appRef) {
    this.app = appRef;

    // Undo / Redo history stack
    this.undoStack = [];
    this.redoStack = [];
    this.maxHistory = 30;
    this.isApplyingHistory = false;

    // Annotation drawing layer
    this.annotationCanvas = null;
    this.annotationCtx = null;
    this.isDrawing = false;
    this.drawMode = 'pen'; // 'pen', 'arrow', 'clear'
    this.drawColor = '#fbbf24';

    // Presentation mode flag
    this.isPresentationMode = false;

    // Low power mode flag
    this.isLowPowerMode = false;

    this.setupKeyboardShortcuts();
  }

  /**
   * Universal keyboard shortcuts (Escape exits presentation mode, Ctrl+Z undo, Ctrl+Y redo)
   */
  setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Don't intercept when user is actively typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      // Escape to exit Presentation Mode
      if (e.key === 'Escape' && this.isPresentationMode) {
        this.togglePresentationMode();
        return;
      }

      // Undo: Ctrl+Z / Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        this.undo();
        return;
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
          ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')) {
        e.preventDefault();
        this.redo();
        return;
      }
    });

    // Also bind click on floating exit presentation button
    const btnExit = document.getElementById('btn-exit-presentation');
    if (btnExit) {
      btnExit.addEventListener('click', () => {
        if (this.isPresentationMode) this.togglePresentationMode();
      });
    }
  }

  /**
   * Pushes a state snapshot to undo stack
   */
  pushStateSnapshot() {
    if (this.isApplyingHistory) return;

    const snapshot = JSON.stringify({
      sources: this.app.sources,
      receiver: this.app.receiver,
      walls: this.app.walls,
      slits: this.app.slits,
      isBeatMode: this.app.isBeatMode,
      isRefraction: this.app.isRefraction
    });

    this.undoStack.push(snapshot);
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    this.redoStack = []; // Clear redo on new action
  }

  undo() {
    if (this.undoStack.length === 0) return;

    // Save current to redo
    const current = JSON.stringify({
      sources: this.app.sources,
      receiver: this.app.receiver,
      walls: this.app.walls,
      slits: this.app.slits,
      isBeatMode: this.app.isBeatMode,
      isRefraction: this.app.isRefraction
    });
    this.redoStack.push(current);

    const prevJSON = this.undoStack.pop();
    this.applyState(prevJSON);
  }

  redo() {
    if (this.redoStack.length === 0) return;

    const current = JSON.stringify({
      sources: this.app.sources,
      receiver: this.app.receiver,
      walls: this.app.walls,
      slits: this.app.slits,
      isBeatMode: this.app.isBeatMode,
      isRefraction: this.app.isRefraction
    });
    this.undoStack.push(current);

    const nextJSON = this.redoStack.pop();
    this.applyState(nextJSON);
  }

  applyState(jsonStr) {
    this.isApplyingHistory = true;
    try {
      const data = JSON.parse(jsonStr);
      this.app.sources = data.sources;
      this.app.receiver = data.receiver;
      this.app.walls = data.walls;
      this.app.slits = data.slits;
      this.app.isBeatMode = data.isBeatMode;
      this.app.isRefraction = data.isRefraction;

      this.app.updateSlitWavelets();
      this.app.rebuildGizmos();
      this.app.oscilloscope.clear();
      this.app.rightPanel.render();
    } catch (e) {
      console.warn('Error applying state:', e);
    }
    this.isApplyingHistory = false;
  }

  /**
   * Teacher Annotation Canvas Overlay
   */
  initAnnotationCanvas(container) {
    this.annotationCanvas = document.createElement('canvas');
    this.annotationCanvas.id = 'annotation-canvas';
    this.annotationCanvas.style.position = 'absolute';
    this.annotationCanvas.style.top = '0';
    this.annotationCanvas.style.left = '0';
    this.annotationCanvas.style.width = '100%';
    this.annotationCanvas.style.height = '100%';
    this.annotationCanvas.style.pointerEvents = 'none'; // Off by default so 3D orbit works
    this.annotationCanvas.style.zIndex = '50';

    container.appendChild(this.annotationCanvas);
    this.annotationCtx = this.annotationCanvas.getContext('2d');

    const resize = () => {
      this.annotationCanvas.width = container.clientWidth;
      this.annotationCanvas.height = container.clientHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Drawing listeners
    let lastX = 0, lastY = 0;
    this.annotationCanvas.addEventListener('pointerdown', (e) => {
      this.isDrawing = true;
      const rect = this.annotationCanvas.getBoundingClientRect();
      lastX = e.clientX - rect.left;
      lastY = e.clientY - rect.top;
    });

    this.annotationCanvas.addEventListener('pointermove', (e) => {
      if (!this.isDrawing) return;
      const rect = this.annotationCanvas.getBoundingClientRect();
      const currX = e.clientX - rect.left;
      const currY = e.clientY - rect.top;

      const ctx = this.annotationCtx;
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(currX, currY);
      ctx.strokeStyle = this.drawColor;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.stroke();

      lastX = currX;
      lastY = currY;
    });

    window.addEventListener('pointerup', () => this.isDrawing = false);
  }

  toggleAnnotationMode(enabled) {
    if (this.annotationCanvas) {
      this.annotationCanvas.style.pointerEvents = enabled ? 'auto' : 'none';
      if (this.app.sceneMgr && this.app.sceneMgr.controls) {
        this.app.sceneMgr.controls.enabled = !enabled;
      }
    }
  }

  clearAnnotations() {
    if (this.annotationCtx && this.annotationCanvas) {
      this.annotationCtx.clearRect(0, 0, this.annotationCanvas.width, this.annotationCanvas.height);
    }
  }

  /**
   * Presentation Mode (Distraction-Free)
   */
  togglePresentationMode() {
    this.isPresentationMode = !this.isPresentationMode;
    document.body.classList.toggle('presentation-mode', this.isPresentationMode);
    
    // Trigger window resize to refit canvas
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 150);

    return this.isPresentationMode;
  }

  /**
   * Take High-Res Snapshot of 3D Canvas
   */
  takeSnapshot() {
    const renderer = this.app.sceneMgr.renderer;
    if (!renderer) return;

    // Force a fresh render
    this.app.sceneMgr.render();
    const dataUrl = renderer.domElement.toDataURL('image/png');

    const link = document.createElement('a');
    link.download = `wave_lab_snapshot_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  }

  /**
   * Low-Power Mode Toggle
   */
  toggleLowPowerMode() {
    this.isLowPowerMode = !this.isLowPowerMode;
    const res = this.isLowPowerMode ? 32 : 60;
    this.app.waveRenderer.fieldResolution = res;
    // Rebuild geometry
    this.app.waveRenderer.fieldMesh.geometry.dispose();
    this.app.waveRenderer.setupAmplitudeField();
    return this.isLowPowerMode;
  }

  /**
   * Keyboard shortcuts
   */
  setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Don't capture when typing in text/number inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        const playBtn = document.getElementById('btn-play');
        if (playBtn) playBtn.click();
      } else if (e.key === 'r' || e.key === 'R') {
        const resetBtn = document.getElementById('btn-reset');
        if (resetBtn) resetBtn.click();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) {
          this.redo();
        } else {
          this.undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        this.redo();
      } else if (e.key === 'm' || e.key === 'M') {
        const muteBtn = document.getElementById('btn-audio-toggle');
        if (muteBtn) muteBtn.click();
      } else if (e.key === 'f' || e.key === 'F') {
        // Focus camera on selected object
        const sel = this.app.rightPanel.selectedObject;
        if (sel && sel.dataRef) {
          const pos = sel.dataRef.position;
          this.app.sceneMgr.controls.target.set(pos.x, 0, pos.z);
          this.app.sceneMgr.controls.update();
        }
      }
    });
  }

  /**
   * Physics Formula Inspector Modal (Feature 23)
   */
  openFormulaInspector(topic, data = {}) {
    const modal = document.getElementById('modal-formula');
    const titleEl = document.getElementById('formula-modal-title');
    const bodyEl = document.getElementById('formula-body-content');
    if (!modal || !bodyEl) return;

    let title = '📐 Physics Formula Inspector';
    let html = '';

    const src = data.source || (this.app.sources && this.app.sources[0]) || { frequency: 1.0, speed: 3.0, amplitude: 1.0, position: { x: -2.5, z: 0 }, phase: 0 };
    const rPos = (this.app.receiver && this.app.receiver.position) || { x: 0, z: 5 };
    const v = src.speed || 3.0;
    const f = src.frequency || 1.0;
    const lambda = (v / f).toFixed(3);
    const k = ((2 * Math.PI) / (v / f)).toFixed(3);
    const omega = (2 * Math.PI * f).toFixed(3);

    if (topic === 'wavelength') {
      title = '📐 Wavelength & Dispersion Relation (λ = v / f)';
      html = `
        <div class="formula-breakdown-card" style="display: flex; flex-direction: column; gap: 12px;">
          <div style="padding: 12px; background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 8px; text-align: center;">
            <div style="font-size: 22px; font-family: monospace; font-weight: bold; color: #38bdf8;">λ = v / f</div>
            <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">[m] = [m/s] / [Hz]</div>
          </div>
          <p style="font-size: 13px; line-height: 1.5; color: #cbd5e1;">
            The wavelength <strong>λ</strong> represents the spatial period of the acoustic disturbance—the physical distance between two consecutive wave crests.
          </p>
          <div style="display: flex; flex-direction: column; gap: 6px; background: rgba(15, 23, 42, 0.5); padding: 10px; border-radius: 6px; font-size: 13px;">
            <div style="display: flex; justify-content: space-between;"><span>Wave Speed (v):</span><strong>${v.toFixed(2)} m/s</strong></div>
            <div style="display: flex; justify-content: space-between;"><span>Oscillation Frequency (f):</span><strong>${f.toFixed(2)} Hz</strong></div>
            <div style="display: flex; justify-content: space-between; color: #38bdf8; font-weight: bold; border-top: 1px solid #334155; padding-top: 4px;"><span>Calculated Wavelength (λ):</span><strong>${lambda} m</strong></div>
            <div style="display: flex; justify-content: space-between;"><span>Angular Frequency (ω = 2πf):</span><strong>${omega} rad/s</strong></div>
            <div style="display: flex; justify-content: space-between;"><span>Wave Number (k = 2π/λ):</span><strong>${k} rad/m</strong></div>
          </div>
          <div style="padding: 8px 12px; background: rgba(251, 191, 36, 0.1); border-left: 3px solid #fbbf24; border-radius: 4px; font-size: 12px; color: #fde68a;">
            💡 <em>Rule of Thumb:</em> Higher frequency sound produces shorter wavelengths and tighter spatial interference fringes.
          </div>
        </div>
      `;
    } else if (topic === 'doppler') {
      title = '🚗 Doppler Frequency Shift';
      const motion = this.app.movingSrcMgr ? this.app.movingSrcMgr.getMotion(src.id) : null;
      const vs = motion ? motion.speed : 1.5;
      const fAppr = (f * (v / Math.max(0.1, v - vs))).toFixed(2);
      const fRec = (f * (v / (v + vs))).toFixed(2);

      html = `
        <div class="formula-breakdown-card" style="display: flex; flex-direction: column; gap: 12px;">
          <div style="padding: 12px; background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 8px; text-align: center;">
            <div style="font-size: 20px; font-family: monospace; font-weight: bold; color: #38bdf8;">f' = f · [ v / (v - v_s · r̂) ]</div>
          </div>
          <p style="font-size: 13px; line-height: 1.5; color: #cbd5e1;">
            When a wave source moves relative to the medium and observer, emitted wavefronts bunch up ahead of the motion (shorter apparent wavelength, higher pitch) and stretch out behind it.
          </p>
          <div style="display: flex; flex-direction: column; gap: 6px; background: rgba(15, 23, 42, 0.5); padding: 10px; border-radius: 6px; font-size: 13px;">
            <div style="display: flex; justify-content: space-between;"><span>Rest Frequency (f₀):</span><strong>${f.toFixed(2)} Hz</strong></div>
            <div style="display: flex; justify-content: space-between;"><span>Wave Speed (v):</span><strong>${v.toFixed(2)} m/s</strong></div>
            <div style="display: flex; justify-content: space-between;"><span>Source Speed (|v_s|):</span><strong>${vs.toFixed(2)} m/s</strong></div>
            <div style="display: flex; justify-content: space-between; color: #38bdf8; font-weight: bold; border-top: 1px solid #334155; padding-top: 4px;"><span>Approaching Frequency:</span><strong>${fAppr} Hz (Shifted higher)</strong></div>
            <div style="display: flex; justify-content: space-between; color: #f43f5e; font-weight: bold;"><span>Receding Frequency:</span><strong>${fRec} Hz (Shifted lower)</strong></div>
          </div>
          <div style="padding: 8px 12px; background: rgba(56, 189, 248, 0.1); border-left: 3px solid #38bdf8; border-radius: 4px; font-size: 12px; color: #bae6fd;">
            💡 <em>Mach Number:</em> M = v_s / v = ${(vs / v).toFixed(2)}. Subsonic motion causes clean compression without shock cones.
          </div>
        </div>
      `;
    } else if (topic === 'superposition') {
      title = '🌊 Superposition & Total Phase Difference';
      const sA = (this.app.sources && this.app.sources[0]) || src;
      const sB = (this.app.sources && this.app.sources[1]) || src;
      const rA = Math.hypot(rPos.x - sA.position.x, rPos.z - sA.position.z);
      const rB = Math.hypot(rPos.x - sB.position.x, rPos.z - sB.position.z);
      const dr = Math.abs(rA - rB);
      const dphi = Math.abs((sA.phase || 0) - (sB.phase || 0));

      html = `
        <div class="formula-breakdown-card" style="display: flex; flex-direction: column; gap: 12px;">
          <div style="padding: 12px; background: rgba(52, 211, 153, 0.1); border: 1px solid rgba(52, 211, 153, 0.3); border-radius: 8px; text-align: center;">
            <div style="font-size: 18px; font-family: monospace; font-weight: bold; color: #34d399;">ΔΦ = (k·r_A - ω·t + ϕ_A) - (k·r_B - ω·t + ϕ_B)</div>
          </div>
          <p style="font-size: 13px; line-height: 1.5; color: #cbd5e1;">
            The resultant amplitude depends strictly on the <strong>total phase difference</strong> ΔΦ, combining spatial path difference Δr and initial phase offset Δϕ.
          </p>
          <div style="display: flex; flex-direction: column; gap: 6px; background: rgba(15, 23, 42, 0.5); padding: 10px; border-radius: 6px; font-size: 13px;">
            <div style="display: flex; justify-content: space-between;"><span>Distance to Source A (r_A):</span><strong>${rA.toFixed(2)} m</strong></div>
            <div style="display: flex; justify-content: space-between;"><span>Distance to Source B (r_B):</span><strong>${rB.toFixed(2)} m</strong></div>
            <div style="display: flex; justify-content: space-between;"><span>Path Difference (Δr):</span><strong>${dr.toFixed(2)} m (${(dr / (v / f)).toFixed(2)} λ)</strong></div>
            <div style="display: flex; justify-content: space-between;"><span>Initial Phase Offset (Δϕ₀):</span><strong>${((dphi * 180) / Math.PI).toFixed(0)}°</strong></div>
            <div style="display: flex; justify-content: space-between; color: #34d399; font-weight: bold; border-top: 1px solid #334155; padding-top: 4px;"><span>Constructive:</span><strong>ΔΦ = 2mπ (Peak Reinforcement)</strong></div>
            <div style="display: flex; justify-content: space-between; color: #f43f5e; font-weight: bold;"><span>Destructive:</span><strong>ΔΦ = (2m+1)π (Node Cancellation)</strong></div>
          </div>
        </div>
      `;
    } else if (topic === 'position') {
      const p = src.position;
      const dist = Math.hypot(p.x, p.z);
      const ux = dist > 0 ? (p.x / dist).toFixed(3) : '0.000';
      const uz = dist > 0 ? (p.z / dist).toFixed(3) : '0.000';

      title = '📍 3D Position & Unit Direction Vector';
      html = `
        <div class="formula-breakdown-card" style="display: flex; flex-direction: column; gap: 12px;">
          <div style="padding: 12px; background: rgba(168, 85, 247, 0.1); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 8px; text-align: center;">
            <div style="font-size: 18px; font-family: monospace; font-weight: bold; color: #c084fc;">r⃗ = (x, 0, z), |r⃗| = √(x² + z²), û = r⃗ / |r⃗|</div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 6px; background: rgba(15, 23, 42, 0.5); padding: 10px; border-radius: 6px; font-size: 13px;">
            <div style="display: flex; justify-content: space-between;"><span>Coordinates:</span><strong>(${p.x.toFixed(2)}, 0.00, ${p.z.toFixed(2)}) m</strong></div>
            <div style="display: flex; justify-content: space-between;"><span>Euclidean Distance (|r⃗|):</span><strong>${dist.toFixed(2)} m</strong></div>
            <div style="display: flex; justify-content: space-between; color: #c084fc; font-weight: bold; border-top: 1px solid #334155; padding-top: 4px;"><span>Unit Direction (û):</span><strong>(${ux}, 0.000, ${uz})</strong></div>
          </div>
        </div>
      `;
    } else if (topic === 'diffraction') {
      title = '🚪 Huygens-Fresnel Diffraction & Slits';
      const slit = data.slit || (this.app.slits && this.app.slits[0]) || { width: 1.2, separation: 2.5, type: 'single' };
      const isDouble = slit.type === 'double';

      html = `
        <div class="formula-breakdown-card" style="display: flex; flex-direction: column; gap: 12px;">
          <div style="padding: 12px; background: rgba(244, 63, 94, 0.1); border: 1px solid rgba(244, 63, 94, 0.3); border-radius: 8px; text-align: center;">
            <div style="font-size: 18px; font-family: monospace; font-weight: bold; color: #fb7185;">${isDouble ? 'd · sin(θ) = m · λ' : 'w · sin(θ) = m · λ'}</div>
          </div>
          <p style="font-size: 13px; line-height: 1.5; color: #cbd5e1;">
            According to Huygens' Principle, the wave aperture acts as a set of coherent secondary wavelets propagating outward beyond the opaque barrier plane.
          </p>
          <div style="display: flex; flex-direction: column; gap: 6px; background: rgba(15, 23, 42, 0.5); padding: 10px; border-radius: 6px; font-size: 13px;">
            <div style="display: flex; justify-content: space-between;"><span>Aperture Width (w):</span><strong>${(slit.width || 1.2).toFixed(2)} m</strong></div>
            ${isDouble ? `<div style="display: flex; justify-content: space-between;"><span>Slit Separation (d):</span><strong>${(slit.separation || 2.5).toFixed(2)} m</strong></div>` : ''}
            <div style="display: flex; justify-content: space-between;"><span>Wavelength (λ):</span><strong>${lambda} m</strong></div>
            <div style="display: flex; justify-content: space-between; color: #fb7185; font-weight: bold; border-top: 1px solid #334155; padding-top: 4px;"><span>Width/Wavelength Ratio:</span><strong>${((slit.width || 1.2) / (v / f)).toFixed(2)}</strong></div>
          </div>
        </div>
      `;
    }

    if (titleEl) titleEl.textContent = title;
    bodyEl.innerHTML = html;
    modal.style.display = 'flex';
  }

  /**
   * Initialize Prediction Mode hypothesis testing (Feature 10)
   */
  setupPredictionMode() {
    const btnSubmit = document.getElementById('btn-submit-prediction');
    const feedbackEl = document.getElementById('prediction-feedback');
    if (!btnSubmit || !feedbackEl) return;

    btnSubmit.addEventListener('click', () => {
      const selected = document.querySelector('input[name="pred-choice"]:checked');
      if (!selected) {
        alert('Please choose a prediction hypothesis first!');
        return;
      }

      feedbackEl.style.display = 'block';
      if (selected.value === 'cancels') {
        feedbackEl.style.background = 'rgba(52, 211, 153, 0.15)';
        feedbackEl.style.border = '1px solid #10b981';
        feedbackEl.style.color = '#34d399';
        feedbackEl.innerHTML = '🎉 <strong>Correct Hypothesis!</strong> A 180° (π) phase shift causes destructive interference along the centerline where Δr = 0, producing near-zero resultant amplitude.';
      } else {
        feedbackEl.style.background = 'rgba(244, 63, 94, 0.15)';
        feedbackEl.style.border = '1px solid #ef4444';
        feedbackEl.style.color = '#fca5a5';
        feedbackEl.innerHTML = '❌ <strong>Incorrect Hypothesis:</strong> When equidistant waves arrive with a 180° phase difference, their crests meet troughs and cancel destructively to 0 amplitude!';
      }
    });
  }

  /**
   * Returns Glossary HTML content
   */
  static getGlossaryHTML() {
    const terms = [
      { name: 'Superposition', def: 'When two or more waves travel through the same medium simultaneously, the resultant displacement at any point is the vector sum of the individual displacements.' },
      { name: 'Constructive Interference', def: 'Occurs when waves arrive in-phase (crests meet crests), resulting in a wave of maximum amplitude (A_total = A1 + A2).' },
      { name: 'Destructive Interference', def: 'Occurs when waves arrive out-of-phase by 180° (crests meet troughs), leading to cancellation or zero resultant displacement.' },
      { name: 'Acoustic Beats', def: 'Periodic amplitude pulsing produced when two sound waves of slightly different frequencies superpose: f_beat = |f1 - f2|.' },
      { name: 'Standing Wave', def: 'A wave pattern formed by the superposition of two identical waves traveling in opposite directions, characterized by fixed nodes and antinodes.' },
      { name: 'Node & Antinode', def: 'A Node is a point of permanent zero amplitude along a standing wave. An Antinode is a point of maximum oscillation amplitude.' },
      { name: 'Huygens Principle', def: 'Every point on a wavefront serves as a secondary source of spherical wavelets spreading out in all directions at the wave speed.' },
      { name: 'Diffraction', def: 'The bending and spreading of waves around obstacles and through openings whose size is comparable to the wavelength.' },
      { name: 'Doppler Effect', def: 'The observed change in frequency of a wave resulting from relative motion between the wave source and the observer.' },
      { name: 'Snell’s Law (Refraction)', def: 'The relationship describing wave bending across a medium boundary: sin(θ1)/sin(θ2) = v1/v2.' }
    ];

    return `
      <div class="glossary-modal-inner">
        <h3>📖 Wave Physics Glossary</h3>
        <p class="glossary-subtitle">Core acoustic and wave terminology definitions</p>
        <div class="glossary-list">
          ${terms.map(t => `
            <div class="glossary-item">
              <strong class="glossary-term">${t.name}:</strong>
              <span class="glossary-def">${t.def}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
}
