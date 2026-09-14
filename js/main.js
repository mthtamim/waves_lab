/**
 * 3D Interactive Wave & Acoustics Laboratory
 * Master Application Controller with 50 Integrated Advanced Capabilities
 */

import { SceneManager } from './scene/sceneManager.js';
import { WaveRenderer } from './scene/waveRenderer.js';
import { ObjectGizmos } from './scene/objectGizmos.js';
import { VisualOverlays } from './scene/visualOverlays.js';
import { AudioEngine } from './audio/audioEngine.js';
import { Oscilloscope } from './ui/oscilloscope.js';
import { LeftPanel } from './ui/leftPanel.js';
import { RightPanel } from './ui/rightPanel.js';
import { EducationalGuide } from './ui/educationalGuide.js';
import { WaveMath } from './physics/waveMath.js';
import { StandingWaveCalculator } from './physics/standingWave.js';
import { PRESET_EXPERIMENTS, exportExperimentToJSON, importExperimentFromJSON } from './presets/presetLibrary.js';

// Advanced Subsystems
import { ProbesAndAnalysis } from './physics/probesAndAnalysis.js';
import { MovingSourceManager } from './physics/movingSources.js';
import { PhaseWheelUI } from './ui/phaseWheel.js';
import { ChallengeModeEngine } from './ui/challengeMode.js';
import { ExperimentTools } from './ui/experimentTools.js';
import { Academic2DMode } from './ui/academic2DMode.js';
import { CustomEquationEngine } from './physics/customEquationEngine.js';

class WaveLabApp {
  constructor() {
    // Simulation state
    this.isPlaying = true;
    this.simTime = 0;
    this.simSpeed = 1.0;
    this.lastFrameTime = performance.now();

    // Data model
    this.sources = [];
    this.receiver = { id: 'recv_1', position: { x: 0, y: 0, z: 5 }, active: true };
    this.walls = [];
    this.slits = [];
    this.isBeatMode = false;
    this.isRefraction = false;
    this.waveModel = 'ideal';
    WaveMath.waveModel = 'ideal';

    this.init();
  }

  async init() {
    // 1. DOM Elements
    const viewportContainer = document.getElementById('viewport-3d');
    const viewportWrapper = document.getElementById('viewport-wrapper');
    const oscilloscopeCanvas = document.getElementById('oscilloscope-canvas');
    const phaseWheelCanvas = document.getElementById('phasewheel-canvas');
    const leftPanelEl = document.getElementById('left-panel');
    const rightPanelEl = document.getElementById('right-panel-content');
    const eduGuideEl = document.getElementById('edu-guide-content');

    // 2. Subsystems
    this.sceneMgr = new SceneManager(viewportContainer);
    this.waveRenderer = new WaveRenderer(this.sceneMgr.scene);
    this.visualOverlays = new VisualOverlays(this.sceneMgr.scene);
    this.audioEngine = new AudioEngine();
    this.oscilloscope = new Oscilloscope(oscilloscopeCanvas);

    // Advanced Subsystems
    this.probesMgr = new ProbesAndAnalysis(this.sceneMgr.scene);
    this.movingSrcMgr = new MovingSourceManager(this.sceneMgr.scene);
    this.phaseWheel = new PhaseWheelUI(phaseWheelCanvas);
    this.challengeEngine = new ChallengeModeEngine(this);
    this.tools = new ExperimentTools(this);
    this.tools.initAnnotationCanvas(viewportWrapper);
    this.academic2D = new Academic2DMode(this);
    this.academic2D.init(viewportWrapper);
    this.customEquationEngine = new CustomEquationEngine();
    WaveMath.customEquation.engine = this.customEquationEngine;

    // 3. Gizmos & Interactions
    this.gizmos = new ObjectGizmos(
      this.sceneMgr.scene,
      this.sceneMgr.camera,
      this.sceneMgr.renderer.domElement,
      this.sceneMgr.controls,
      (action, objData) => this.handleGizmoEvent(action, objData)
    );

    // 4. Panels
    this.eduGuide = new EducationalGuide(eduGuideEl);

    this.rightPanel = new RightPanel(rightPanelEl, (type, id, prop, val) => {
      this.handleParamChange(type, id, prop, val);
    });

    this.leftPanel = new LeftPanel(leftPanelEl, {
      onPresetSelect: (id) => this.loadPreset(id),
      onAddObject: (type) => this.addObject(type),
      onFieldStyleChange: (style) => this.waveRenderer.setFieldRenderStyle(style),
      onAddProbe: () => this.addProbeAtDefaultPos(),
      onExportCSV: () => this.exportProbesCSV(),
      onStrobeToggle: (enabled, freq) => {
        this.phaseWheel.strobeEnabled = enabled;
        this.phaseWheel.strobeFreq = freq;
      },
      onToggleDraw: () => this.toggleAnnotationToolbar(),
      onTogglePresentation: () => this.tools.togglePresentationMode(),
      onTakeSnapshot: () => this.tools.takeSnapshot(),
      onOpenGlossary: () => this.openGlossaryModal(),
      onLayerToggle: (layer, val) => this.toggleLayer(layer, val),
      onCameraChange: (view) => this.changeCameraView(view),
      onExport: () => this.exportCurrentExperiment(),
      onImport: (json) => this.importExperiment(json)
    });

    // 5. Controls & Tabs
    this.setupTopControls();
    this.setupTabs();
    this.setupChallengeControls();
    this.setupOscilloscopeControls();
    this.setupModals();

    // 6. Load default preset
    this.loadPreset('two_sources_in_phase');

    // 7. Initial snapshot for undo
    this.tools.pushStateSnapshot();

    // 8. Start main animation loop
    requestAnimationFrame((t) => this.loop(t));

    // Listen for any user click/touch to safely enable Web Audio
    const startAudioListener = () => {
      try {
        this.audioEngine.init();
      } catch (err) {
        console.warn('AudioContext init on interaction:', err);
      }
      window.removeEventListener('pointerdown', startAudioListener);
      window.removeEventListener('touchstart', startAudioListener);
    };
    window.addEventListener('pointerdown', startAudioListener, { passive: true });
    window.addEventListener('touchstart', startAudioListener, { passive: true });
  }

  loadPreset(presetId) {
    const preset = PRESET_EXPERIMENTS[presetId];
    if (!preset) return;

    this.sources = JSON.parse(JSON.stringify(preset.sources));
    this.receiver = JSON.parse(JSON.stringify(preset.receiver));
    this.walls = JSON.parse(JSON.stringify(preset.walls || []));
    this.slits = JSON.parse(JSON.stringify(preset.slits || []));
    this.isBeatMode = !!preset.isBeatMode;
    this.isRefraction = !!preset.isRefraction;

    this.audioEngine.setBeatMode(this.isBeatMode);
    this.updateSlitWavelets();
    this.rebuildGizmos();

    if (this.academic2D && this.academic2D.active) {
      this.academic2D.setMode('2d');
    } else if (preset.cameraPos) {
      this.sceneMgr.camera.position.set(preset.cameraPos.x, preset.cameraPos.y, preset.cameraPos.z);
      this.sceneMgr.controls.target.set(0, 0, 0);
      this.sceneMgr.controls.update();
    }

    this.visualOverlays.setRefractionBoundary(this.isRefraction);
    this.eduGuide.updatePreset(preset);

    const defaultSelect = this.sources[0] || this.receiver;
    if (defaultSelect) {
      this.rightPanel.setSelectedObject({
        type: defaultSelect.id.startsWith('recv') ? 'receiver' : 'source',
        dataRef: defaultSelect
      });
    }

    this.oscilloscope.clear();
    this.leftPanel.setActivePreset(presetId);
    this.renderChallengeUI();
  }

  rebuildGizmos() {
    this.gizmos.clearGizmos();
    this.sources.forEach(s => this.gizmos.createSourceGizmo(s));
    if (this.receiver) {
      this.gizmos.createReceiverGizmo(this.receiver);
    }
    this.walls.forEach(w => this.gizmos.createWallGizmo(w));
    this.slits.forEach(sl => this.gizmos.createSlitGizmo(sl));
  }

  updateSlitWavelets() {
    if (this.slits.length > 0 && this.sources.length > 0) {
      const incident = this.sources[0];
      this.slits.forEach(slit => {
        slit.wavelets = WaveMath.generateSlitWavelets(slit, incident, slit.type === 'double' ? 5 : 9);
      });
    }
  }

  handleGizmoEvent(action, objData) {
    if (action === 'select') {
      this.rightPanel.setSelectedObject(objData);
      const tabInspBtn = document.getElementById('tab-inspector-btn');
      if (tabInspBtn) tabInspBtn.click();
    } else if (action === 'move') {
      if (this.rightPanel.selectedObject && this.rightPanel.selectedObject.dataRef.id === objData.dataRef.id) {
        this.rightPanel.render();
      }
      this.updateSlitWavelets();
      this.tools.pushStateSnapshot();
    }
  }

  handleParamChange(type, id, prop, val) {
    if (type === 'source') {
      const src = this.sources.find(s => s.id === id);
      if (src) {
        if (prop === 'motion') {
          this.movingSrcMgr.configureMotion(id, val);
        } else {
          src[prop] = val;
          this.updateSlitWavelets();
        }
      }
    } else if (type === 'receiver') {
      this.receiver[prop] = val;
    } else if (type === 'wall') {
      const wall = this.walls.find(w => w.id === id);
      if (wall) wall[prop] = val;
    } else if (type === 'slit') {
      const slit = this.slits.find(sl => sl.id === id);
      if (slit) {
        slit[prop] = val;
        this.updateSlitWavelets();
      }
    }

    this.tools.pushStateSnapshot();
  }

  addObject(type) {
    if (type === 'source') {
      const id = `src_${Date.now()}`;
      const count = this.sources.length + 1;
      const colors = [0x38bdf8, 0xf43f5e, 0x10b981, 0xfacc15, 0xa855f7];
      const color = colors[(count - 1) % colors.length];

      const newSrc = {
        id,
        name: `Source ${String.fromCharCode(64 + count)}`,
        position: { x: (count - 2) * 2.5, y: 0, z: 0 },
        frequency: 1.2,
        amplitude: 1.0,
        speed: 3.0,
        phase: 0,
        active: true,
        color
      };
      this.sources.push(newSrc);
      this.gizmos.createSourceGizmo(newSrc);
      this.rightPanel.setSelectedObject({ type: 'source', dataRef: newSrc });
    } else if (type === 'wall') {
      const id = `wall_${Date.now()}`;
      const newWall = {
        id,
        name: `Wall ${this.walls.length + 1}`,
        position: { x: 0, y: 0, z: 4.0 },
        width: 14,
        height: 2.5,
        reflectivity: 0.85,
        phaseInversion: true,
        normal: { x: 0, y: 0, z: -1 },
        active: true
      };
      this.walls.push(newWall);
      this.gizmos.createWallGizmo(newWall);
      this.rightPanel.setSelectedObject({ type: 'wall', dataRef: newWall });
    } else if (type === 'slit') {
      const id = `slit_${Date.now()}`;
      const newSlit = {
        id,
        type: 'single',
        name: `Slit ${this.slits.length + 1}`,
        position: { x: 0, y: 0, z: 2.0 },
        width: 1.5,
        active: true
      };
      this.slits.push(newSlit);
      this.updateSlitWavelets();
      this.gizmos.createSlitGizmo(newSlit);
      this.rightPanel.setSelectedObject({ type: 'slit', dataRef: newSlit });
    } else if (type === 'receiver') {
      if (!this.receiver) {
        this.receiver = { id: 'recv_1', position: { x: 0, y: 0, z: 5 }, active: true };
        this.gizmos.createReceiverGizmo(this.receiver);
        this.rightPanel.setSelectedObject({ type: 'receiver', dataRef: this.receiver });
      }
    }
    this.tools.pushStateSnapshot();
  }

  // Probe tools
  addProbeAtDefaultPos() {
    const rx = (Math.random() - 0.5) * 12;
    const rz = (Math.random() - 0.5) * 12;
    this.probesMgr.addProbe({ x: rx, z: rz });
    this.renderProbesTable();
  }

  exportProbesCSV() {
    const csv = this.probesMgr.exportProbesToCSV();
    if (!csv) {
      alert('No probe data collected yet. Drop at least one probe!');
      return;
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wave_probes_data_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  renderProbesTable() {
    const container = document.getElementById('probes-table-container');
    if (!container) return;

    if (this.probesMgr.probes.length === 0) {
      container.innerHTML = '<p class="empty-hint">Drop probes using the left panel button or click "Drop Probe" to measure spatial points.</p>';
      return;
    }

    let html = `
      <table class="probes-table">
        <thead>
          <tr>
            <th>Probe</th>
            <th>(X, Z)</th>
            <th>Ampl (Ψ)</th>
          </tr>
        </thead>
        <tbody>
    `;

    this.probesMgr.probes.forEach(p => {
      const last = p.history[p.history.length - 1];
      const disp = last ? last.displacement.toFixed(2) : '0.00';
      html += `
        <tr>
          <td style="color: #${p.color.toString(16).padStart(6, '0')}">● ${p.name}</td>
          <td>(${p.position.x.toFixed(1)}, ${p.position.z.toFixed(1)})</td>
          <td><strong>${disp}</strong></td>
        </tr>
      `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
  }

  // Annotation
  toggleAnnotationToolbar() {
    const toolbar = document.getElementById('annotation-toolbar');
    const isVisible = toolbar.style.display !== 'none';
    toolbar.style.display = isVisible ? 'none' : 'flex';
    this.tools.toggleAnnotationMode(!isVisible);
  }

  // Modals & Glossary
  openGlossaryModal() {
    const modal = document.getElementById('modal-glossary');
    const body = document.getElementById('glossary-body-content');
    if (modal && body) {
      body.innerHTML = ExperimentTools.getGlossaryHTML();
      modal.style.display = 'flex';
    }
  }

  setupModals() {
    const closeBtn = document.getElementById('btn-close-glossary');
    const modal = document.getElementById('modal-glossary');
    if (closeBtn && modal) {
      closeBtn.addEventListener('click', () => modal.style.display = 'none');
    }

    const closeFormulaBtn = document.getElementById('btn-close-formula');
    const modalFormula = document.getElementById('modal-formula');
    if (closeFormulaBtn && modalFormula) {
      closeFormulaBtn.addEventListener('click', () => modalFormula.style.display = 'none');
    }

    this.tools.setupPredictionMode();

    // Annotation toolbar buttons
    const annotPicker = document.getElementById('annot-color-picker');
    const btnAnnotClear = document.getElementById('btn-annot-clear');
    const btnAnnotDone = document.getElementById('btn-annot-done');

    if (annotPicker) annotPicker.addEventListener('change', (e) => this.tools.drawColor = e.target.value);
    if (btnAnnotClear) btnAnnotClear.addEventListener('click', () => this.tools.clearAnnotations());
    if (btnAnnotDone) btnAnnotDone.addEventListener('click', () => this.toggleAnnotationToolbar());

    const btnClearProbes = document.getElementById('btn-clear-probes');
    if (btnClearProbes) btnClearProbes.addEventListener('click', () => {
      this.probesMgr.clearProbes();
      this.renderProbesTable();
    });

    // Custom Equation Studio Modal Handlers
    const btnCustomEq = document.getElementById('btn-custom-eq');
    const modalCustomEq = document.getElementById('modal-custom-eq');
    const closeCustomEqBtn = document.getElementById('btn-close-custom-eq');
    const selectEqPreset = document.getElementById('select-eq-preset');
    const inputCustomEq = document.getElementById('input-custom-eq');
    const btnApplyCustomEq = document.getElementById('btn-apply-custom-eq');
    const btnDisableCustomEq = document.getElementById('btn-disable-custom-eq');
    const customEqError = document.getElementById('custom-eq-error');
    const eqChips = document.querySelectorAll('#eq-chips-container .chip-btn');

    if (selectEqPreset && this.customEquationEngine) {
      selectEqPreset.innerHTML = '<option value="">-- Choose an Equation Preset --</option>' + 
        this.customEquationEngine.presets.map(p => `<option value="${p.expr}">${p.name}</option>`).join('');
      
      selectEqPreset.addEventListener('change', (e) => {
        if (e.target.value) {
          inputCustomEq.value = e.target.value;
          if (customEqError) customEqError.style.display = 'none';
        }
      });
    }

    eqChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const ins = chip.getAttribute('data-ins') || '';
        inputCustomEq.value += (inputCustomEq.value ? ' ' : '') + ins;
        inputCustomEq.focus();
      });
    });

    if (btnCustomEq && modalCustomEq) {
      btnCustomEq.addEventListener('click', () => {
        modalCustomEq.style.display = 'flex';
        if (inputCustomEq) inputCustomEq.value = this.customEquationEngine.rawExpression;
        if (customEqError) customEqError.style.display = 'none';
      });
    }

    if (closeCustomEqBtn && modalCustomEq) {
      closeCustomEqBtn.addEventListener('click', () => modalCustomEq.style.display = 'none');
    }

    if (btnApplyCustomEq && inputCustomEq) {
      btnApplyCustomEq.addEventListener('click', () => {
        const res = this.customEquationEngine.compile(inputCustomEq.value);
        if (res.success) {
          WaveMath.customEquation.active = true;
          WaveMath.customEquation.engine = this.customEquationEngine;
          if (btnCustomEq) btnCustomEq.classList.add('active');
          if (modalCustomEq) modalCustomEq.style.display = 'none';
          this.oscilloscope.clear();
          if (this.academic2D && this.academic2D.syncCustomEq) {
            this.academic2D.syncCustomEq(inputCustomEq.value, true);
          }
          this.showCelebrationToast('✨ Custom Equation Active!', inputCustomEq.value);
        } else {
          if (customEqError) {
            customEqError.textContent = res.error || 'Syntax Error';
            customEqError.style.display = 'block';
          }
        }
      });
    }

    if (btnDisableCustomEq) {
      btnDisableCustomEq.addEventListener('click', () => {
        WaveMath.customEquation.active = false;
        if (btnCustomEq) btnCustomEq.classList.remove('active');
        if (modalCustomEq) modalCustomEq.style.display = 'none';
        if (this.academic2D && this.academic2D.syncCustomEq) {
          this.academic2D.syncCustomEq(inputCustomEq.value, false);
        }
      });
    }
  }

  showCelebrationToast(titleText, descText) {
    const toast = document.getElementById('celebration-toast');
    const title = document.getElementById('toast-title');
    const desc = document.getElementById('toast-desc');

    if (toast && title && desc) {
      title.textContent = titleText;
      desc.textContent = descText;
      toast.style.display = 'block';
      setTimeout(() => {
        toast.style.display = 'none';
      }, 4000);
    }
  }

  setupTabs() {
    const tabInsp = document.getElementById('tab-inspector-btn');
    const tabAnalysis = document.getElementById('tab-analysis-btn');
    const tabChallenge = document.getElementById('tab-challenge-btn');
    const tabEdu = document.getElementById('tab-edu-btn');

    const contentInsp = document.getElementById('right-panel-content');
    const contentAnalysis = document.getElementById('analysis-panel-content');
    const contentChallenge = document.getElementById('challenges-panel-content');
    const contentEdu = document.getElementById('edu-guide-content');

    const showTab = (activeTab, activeContent) => {
      [tabInsp, tabAnalysis, tabChallenge, tabEdu].forEach(t => t.classList.remove('active'));
      [contentInsp, contentAnalysis, contentChallenge, contentEdu].forEach(c => c.style.display = 'none');
      activeTab.classList.add('active');
      activeContent.style.display = 'block';
    };

    tabInsp.addEventListener('click', () => showTab(tabInsp, contentInsp));
    tabAnalysis.addEventListener('click', () => showTab(tabAnalysis, contentAnalysis));
    tabChallenge.addEventListener('click', () => {
      showTab(tabChallenge, contentChallenge);
      this.renderChallengeUI();
    });
    tabEdu.addEventListener('click', () => showTab(tabEdu, contentEdu));
  }

  setupChallengeControls() {
    const prevBtn = document.getElementById('btn-prev-challenge');
    const nextBtn = document.getElementById('btn-next-challenge');
    const mysteryBtn = document.getElementById('btn-random-mystery');

    if (prevBtn) prevBtn.addEventListener('click', () => {
      const idx = (this.challengeEngine.activeChallengeIndex - 1 + this.challengeEngine.challenges.length) % this.challengeEngine.challenges.length;
      this.challengeEngine.selectChallenge(idx);
      this.renderChallengeUI();
    });

    if (nextBtn) nextBtn.addEventListener('click', () => {
      const idx = (this.challengeEngine.activeChallengeIndex + 1) % this.challengeEngine.challenges.length;
      this.challengeEngine.selectChallenge(idx);
      this.renderChallengeUI();
    });

    if (mysteryBtn) mysteryBtn.addEventListener('click', () => {
      const exp = this.challengeEngine.generateMysteryExperiment();
      this.sources = exp.sources;
      this.receiver = exp.receiver;
      this.walls = [];
      this.slits = [];
      this.rebuildGizmos();
      this.oscilloscope.clear();
      alert('Mystery experiment generated! Probe the field and oscilloscope to discover the hidden parameters.');
    });
  }

  renderChallengeUI() {
    const container = document.getElementById('mission-box');
    if (!container) return;

    const ch = this.challengeEngine.getCurrentChallenge();
    const isCompleted = this.challengeEngine.completedChallenges.has(ch.id);

    container.innerHTML = `
      <span class="mission-badge">${ch.difficulty}</span>
      <h4 class="mission-title">${isCompleted ? '✅ ' : ''}${ch.title}</h4>
      <p class="mission-desc">${ch.description}</p>
      <div class="mission-hint">💡 <strong>Hint:</strong> ${ch.hint}</div>
      <div style="font-size: 11px; margin-top: 4px; color: ${isCompleted ? '#34d399' : '#94a3b8'}">
        Status: <strong>${isCompleted ? 'Completed' : 'In Progress...'}</strong>
      </div>
    `;
  }

  showCelebration(ch) {
    const toast = document.getElementById('celebration-toast');
    const title = document.getElementById('toast-title');
    const desc = document.getElementById('toast-desc');

    if (toast && title && desc) {
      title.textContent = `Mission Accomplished: ${ch.title}!`;
      desc.textContent = 'Physics objective successfully verified.';
      toast.style.display = 'block';
      setTimeout(() => {
        toast.style.display = 'none';
      }, 4500);
    }
  }

  toggleLayer(layer, val) {
    if (layer === 'visualMode') {
      this.waveRenderer.setVisualMode(val);
    } else if (layer === 'grid') {
      this.sceneMgr.setGridVisible(val);
    } else if (layer === 'axes') {
      this.sceneMgr.setAxesVisible(val);
    } else if (layer === 'measurements') {
      this.visualOverlays.setMeasurementsVisible(val);
    } else if (layer === 'nodes') {
      this.visualOverlays.setNodesVisible(val);
    } else if (layer === 'wireframe') {
      this.waveRenderer.setWireframe(val);
    }
  }

  changeCameraView(view) {
    if (view === 'persp' || view === 'reset') {
      this.sceneMgr.resetCamera();
    } else if (view === 'top') {
      this.sceneMgr.setTopView();
    } else if (view === 'side') {
      this.sceneMgr.setSideView();
    }
  }

  setWaveModel(model) {
    this.waveModel = model;
    WaveMath.waveModel = model;
    const btnIdeal = document.getElementById('btn-model-ideal');
    const btnPractical = document.getElementById('btn-model-practical');
    if (btnIdeal) btnIdeal.classList.toggle('active', model === 'ideal');
    if (btnPractical) btnPractical.classList.toggle('active', model === 'practical');

    if (this.academic2D) {
      this.academic2D.syncWaveModel(model);
    }
  }

  setupTopControls() {
    const btnPlay = document.getElementById('btn-play');
    const btnReset = document.getElementById('btn-reset');
    const btnUndo = document.getElementById('btn-undo');
    const btnRedo = document.getElementById('btn-redo');
    const speedSelect = document.getElementById('speed-select');
    const btnAudioToggle = document.getElementById('btn-audio-toggle');
    const volSlider = document.getElementById('master-volume');
    const btnModelIdeal = document.getElementById('btn-model-ideal');
    const btnModelPractical = document.getElementById('btn-model-practical');
    const btnDim3D = document.getElementById('btn-dim-3d');
    const btnDim2D = document.getElementById('btn-dim-2d');
    const btnModeGuided = document.getElementById('btn-mode-guided');
    const btnModeFree = document.getElementById('btn-mode-free');
    const btnModeChallenge = document.getElementById('btn-mode-challenge');

    if (btnModelIdeal) {
      btnModelIdeal.addEventListener('click', () => this.setWaveModel('ideal'));
    }

    if (btnModelPractical) {
      btnModelPractical.addEventListener('click', () => this.setWaveModel('practical'));
    }

    if (btnDim3D) {
      btnDim3D.addEventListener('click', () => {
        this.academic2D.setMode('3d');
      });
    }

    if (btnDim2D) {
      btnDim2D.addEventListener('click', () => {
        this.academic2D.setMode('2d');
      });
    }

    btnPlay.addEventListener('click', () => {
      this.isPlaying = !this.isPlaying;
      btnPlay.innerHTML = this.isPlaying ? '<span>⏸</span> Pause' : '<span>▶</span> Play';
      btnPlay.classList.toggle('paused', !this.isPlaying);
      this.audioEngine.setSimulationPaused(!this.isPlaying);
    });

    btnReset.addEventListener('click', () => {
      this.simTime = 0;
      this.movingSrcMgr.reset();
      this.oscilloscope.clear();
    });

    btnUndo.addEventListener('click', () => this.tools.undo());
    btnRedo.addEventListener('click', () => this.tools.redo());

    speedSelect.addEventListener('change', (e) => {
      this.simSpeed = parseFloat(e.target.value) || 1.0;
    });

    btnAudioToggle.addEventListener('click', async () => {
      await this.audioEngine.init();
      const isMuted = this.audioEngine.toggleMute();
      btnAudioToggle.innerHTML = isMuted ? '<span>🔇</span> Sound Off' : '<span>🔊</span> Sound On';
      btnAudioToggle.classList.toggle('muted', isMuted);
    });

    volSlider.addEventListener('input', (e) => {
      this.audioEngine.setMasterVolume(parseFloat(e.target.value));
    });

    btnModeGuided.addEventListener('click', () => {
      btnModeGuided.classList.add('active');
      btnModeFree.classList.remove('active');
      btnModeChallenge.classList.remove('active');
      document.getElementById('tab-edu-btn').click();
      this.eduGuide.setMode('guided');
    });

    btnModeFree.addEventListener('click', () => {
      btnModeFree.classList.add('active');
      btnModeGuided.classList.remove('active');
      btnModeChallenge.classList.remove('active');
      document.getElementById('tab-inspector-btn').click();
      this.eduGuide.setMode('free');
    });

    btnModeChallenge.addEventListener('click', () => {
      btnModeChallenge.classList.add('active');
      btnModeGuided.classList.remove('active');
      btnModeFree.classList.remove('active');
      document.getElementById('tab-challenge-btn').click();
    });

    // Mobile Floating Dock Event Handlers
    const btnMobileLeft = document.getElementById('btn-mobile-left');
    const btnMobileRight = document.getElementById('btn-mobile-right');
    const btnMobileScope = document.getElementById('btn-mobile-scope');
    const leftPanel = document.getElementById('left-panel');
    const rightPanel = document.querySelector('.right-panel');
    const mobileBackdrop = document.getElementById('mobile-drawer-backdrop');
    const scopePanel = document.querySelector('.bottom-measurement-panel');

    const closeDrawers = () => {
      if (leftPanel) leftPanel.classList.remove('mobile-open');
      if (rightPanel) rightPanel.classList.remove('mobile-open');
      if (mobileBackdrop) mobileBackdrop.classList.remove('active');
      if (btnMobileLeft) btnMobileLeft.classList.remove('active');
      if (btnMobileRight) btnMobileRight.classList.remove('active');
    };

    if (btnMobileLeft && leftPanel) {
      btnMobileLeft.addEventListener('click', () => {
        const isOpen = leftPanel.classList.toggle('mobile-open');
        btnMobileLeft.classList.toggle('active', isOpen);
        if (rightPanel) rightPanel.classList.remove('mobile-open');
        if (btnMobileRight) btnMobileRight.classList.remove('active');
        if (mobileBackdrop) mobileBackdrop.classList.toggle('active', isOpen);
      });
    }

    if (btnMobileRight && rightPanel) {
      btnMobileRight.addEventListener('click', () => {
        const isOpen = rightPanel.classList.toggle('mobile-open');
        btnMobileRight.classList.toggle('active', isOpen);
        if (leftPanel) leftPanel.classList.remove('mobile-open');
        if (btnMobileLeft) btnMobileLeft.classList.remove('active');
        if (mobileBackdrop) mobileBackdrop.classList.toggle('active', isOpen);
      });
    }

    if (mobileBackdrop) {
      mobileBackdrop.addEventListener('click', closeDrawers);
    }

    if (btnMobileScope && scopePanel) {
      btnMobileScope.addEventListener('click', () => {
        const isExp = scopePanel.classList.toggle('expanded-mobile');
        btnMobileScope.classList.toggle('active', isExp);
        setTimeout(() => {
          window.dispatchEvent(new Event('resize'));
          if (this.sceneMgr) this.sceneMgr.onWindowResize();
          if (this.oscilloscope) this.oscilloscope.resize();
        }, 100);
      });
    }
  }

  setupOscilloscopeControls() {
    const chkSrcA = document.getElementById('chk-trace-a');
    const chkSrcB = document.getElementById('chk-trace-b');
    const chkRes = document.getElementById('chk-trace-res');
    const chkEnv = document.getElementById('chk-trace-env');
    const btnFreeze = document.getElementById('btn-freeze-scope');

    if (chkSrcA) chkSrcA.addEventListener('change', (e) => this.oscilloscope.showSourceA = e.target.checked);
    if (chkSrcB) chkSrcB.addEventListener('change', (e) => this.oscilloscope.showSourceB = e.target.checked);
    if (chkRes) chkRes.addEventListener('change', (e) => this.oscilloscope.showResultant = e.target.checked);
    if (chkEnv) chkEnv.addEventListener('change', (e) => this.oscilloscope.showEnvelope = e.target.checked);

    if (btnFreeze) {
      btnFreeze.addEventListener('click', () => {
        this.oscilloscope.isFrozen = !this.oscilloscope.isFrozen;
        btnFreeze.classList.toggle('active', this.oscilloscope.isFrozen);
        btnFreeze.textContent = this.oscilloscope.isFrozen ? 'Unfreeze' : 'Freeze';
      });
    }

    // Oscilloscope Drawer Toggle & Collapse Controls
    const btnToggleScope = document.getElementById('btn-toggle-scope');
    const btnMinimizeScope = document.getElementById('btn-minimize-scope');
    const btnHideScope = document.getElementById('btn-hide-scope');
    const scopePanel = document.querySelector('.bottom-measurement-panel');

    const handleScopeResize = () => {
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
        if (this.sceneMgr) this.sceneMgr.onWindowResize();
        if (this.oscilloscope) this.oscilloscope.resize();
      }, 80);
    };

    if (btnToggleScope && scopePanel) {
      btnToggleScope.addEventListener('click', () => {
        const isHidden = scopePanel.classList.toggle('hidden-panel');
        btnToggleScope.classList.toggle('active', !isHidden);
        if (!isHidden && scopePanel.classList.contains('collapsed')) {
          scopePanel.classList.remove('collapsed');
          if (btnMinimizeScope) btnMinimizeScope.textContent = '▼ Minimize';
        }
        handleScopeResize();
      });
    }

    if (btnMinimizeScope && scopePanel) {
      btnMinimizeScope.addEventListener('click', () => {
        const isCollapsed = scopePanel.classList.toggle('collapsed');
        btnMinimizeScope.textContent = isCollapsed ? '▲ Expand Scope' : '▼ Minimize';
        handleScopeResize();
      });
    }

    if (btnHideScope && scopePanel) {
      btnHideScope.addEventListener('click', () => {
        scopePanel.classList.add('hidden-panel');
        if (btnToggleScope) btnToggleScope.classList.remove('active');
        handleScopeResize();
      });
    }
  }

  updateLiveMeasurements() {
    if (!this.receiver) return;

    // Instantaneous amplitude at receiver
    const instDisp = WaveMath.evaluateSuperposition(this.sources, this.receiver.position, this.simTime, this.walls, this.slits, this.isRefraction);
    const dispEl = document.getElementById('readout-disp');
    if (dispEl) dispEl.textContent = instDisp.toFixed(2);

    // Two sources interference readout
    if (this.sources.length >= 2 && this.sources[0].active && this.sources[1].active) {
      const stat = WaveMath.getInterferenceStatus(this.sources[0], this.sources[1], this.receiver.position, this.simTime);
      
      const pathDiffEl = document.getElementById('readout-pathdiff');
      if (pathDiffEl) pathDiffEl.textContent = `${stat.pathDifference.toFixed(2)} m (${(stat.ratio).toFixed(2)} λ)`;

      const phaseDiffEl = document.getElementById('readout-phasediff');
      if (phaseDiffEl) phaseDiffEl.textContent = `${stat.phaseDiffDeg.toFixed(0)}°`;

      const conditionEl = document.getElementById('readout-condition');
      if (conditionEl) {
        conditionEl.textContent = stat.type;
        conditionEl.className = 'val-condition ' + (stat.type.startsWith('Constructive') ? 'constructive' : (stat.type.startsWith('Destructive') ? 'destructive' : 'intermediate'));
      }

      // Beat frequency readout
      const deltaF = Math.abs(this.sources[0].frequency - this.sources[1].frequency);
      const beatEl = document.getElementById('readout-beat');
      if (beatEl) {
        if (deltaF >= 0.03) {
          beatEl.textContent = `${deltaF.toFixed(2)} Hz (Period: ${(1 / deltaF).toFixed(2)} s)`;
        } else {
          beatEl.textContent = 'None (f₁ = f₂: Coherent Tone, Zero Beats)';
        }
      }
    } else {
      const pathDiffEl = document.getElementById('readout-pathdiff');
      if (pathDiffEl) pathDiffEl.textContent = 'N/A (Single source)';
      const conditionEl = document.getElementById('readout-condition');
      if (conditionEl) {
        conditionEl.textContent = 'Pure Monochromatic Wave';
        conditionEl.className = 'val-condition';
      }
    }

    // Standing wave analysis
    if (this.walls.length >= 2) {
      const w1 = this.walls[0];
      const w2 = this.walls[1];
      const length = Math.abs(w2.position.x - w1.position.x);
      const srcFreq = this.sources[0] ? this.sources[0].frequency : 1.0;
      const speed = this.sources[0] ? this.sources[0].speed : 3.0;

      const standingData = StandingWaveCalculator.analyzeCurrentResonance(length, srcFreq, speed);
      this.visualOverlays.updateStandingNodes(standingData, w1.position, w2.position);
    }

    // Source synchronization indicator
    const syncBadge = document.getElementById('sync-status-badge');
    if (syncBadge) {
      const syncInfo = PhaseWheelUI.getSyncStatus(this.sources);
      syncBadge.textContent = `${syncInfo.icon || ''} ${syncInfo.label}`;
      syncBadge.style.color = syncInfo.color;
      syncBadge.style.borderColor = syncInfo.color;
    }

    // Wave travel time & wavefront counter
    const travelEl = document.getElementById('readout-traveltime');
    if (travelEl && this.sources[0]) {
      const { time } = PhaseWheelUI.getTravelTime(this.sources[0], this.receiver.position);
      travelEl.textContent = `${time.toFixed(2)} s`;
    }

    const countEl = document.getElementById('readout-wavefront-count');
    if (countEl && this.sources[0]) {
      const count = Math.floor(this.simTime * (this.sources[0].frequency || 1.0));
      countEl.textContent = `${count}`;
    }
  }

  exportCurrentExperiment() {
    const json = exportExperimentToJSON({
      sources: this.sources,
      receiver: this.receiver,
      walls: this.walls,
      slits: this.slits,
      isBeatMode: this.isBeatMode,
      isRefraction: this.isRefraction
    });

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wave_lab_experiment_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importExperiment(jsonString) {
    const res = importExperimentFromJSON(jsonString);
    if (!res.success) {
      alert('Failed to import experiment: ' + res.error);
      return;
    }

    this.sources = res.data.sources || [];
    this.receiver = res.data.receiver || { id: 'recv_1', position: { x: 0, y: 0, z: 5 }, active: true };
    this.walls = res.data.walls || [];
    this.slits = res.data.slits || [];
    this.isBeatMode = !!res.data.isBeatMode;
    this.isRefraction = !!res.data.isRefraction;

    this.updateSlitWavelets();
    this.rebuildGizmos();
    this.audioEngine.setBeatMode(this.isBeatMode);
    this.visualOverlays.setRefractionBoundary(this.isRefraction);
    this.oscilloscope.clear();
    this.tools.pushStateSnapshot();

    alert('Experiment imported successfully!');
  }

  loop(currentTime) {
    requestAnimationFrame((t) => this.loop(t));

    const dt = (currentTime - this.lastFrameTime) / 1000;
    this.lastFrameTime = currentTime;

    if (this.isPlaying) {
      this.simTime += dt * this.simSpeed;
    }

    // Stroboscope time evaluation
    let effTime = this.simTime;
    try {
      effTime = this.phaseWheel.getStroboscopicTime(this.simTime);
    } catch (_) {}

    // 1. Update moving sources
    try {
      this.movingSrcMgr.update(dt, this.simTime, this.sources);
    } catch (e) {
      console.warn('Moving source update error:', e);
    }

    // 2. Update 3D Wave Visuals
    try {
      this.waveRenderer.update(effTime, this.sources, this.walls, this.slits, this.isRefraction);
    } catch (e) {
      console.warn('WaveRenderer update error:', e);
    }

    // 3. Update Overlays & Path Lines
    try {
      this.visualOverlays.updateMeasurements(this.sources, this.receiver);
    } catch (e) {
      console.warn('Visual overlays update error:', e);
    }

    // 4. Audio synthesis synchronization
    try {
      this.audioEngine.syncWithSources(this.sources, this.receiver ? this.receiver.position : null, this.movingSrcMgr);
    } catch (e) {
      console.warn('Audio sync error:', e);
    }

    // 5. Sample & Render Oscilloscope
    try {
      if (this.receiver) {
        this.oscilloscope.pushSample(effTime, this.sources, this.receiver.position, this.walls, this.slits, this.isRefraction);
      }
      this.oscilloscope.render();
    } catch (e) {
      console.warn('Oscilloscope update error:', e);
    }

    // 5b. Academic 2D Classroom & Textbook Wave Analysis
    try {
      if (this.academic2D && this.academic2D.active) {
        this.academic2D.update(effTime);
      }
    } catch (e) {
      console.warn('Academic 2D update error:', e);
    }

    // 6. Render Phase Wheel Phasors
    try {
      this.phaseWheel.render(effTime, this.sources);
    } catch (e) {
      console.warn('Phase wheel update error:', e);
    }

    // 7. Sample Probes
    try {
      this.probesMgr.sampleProbes(effTime, this.sources, this.walls, this.slits, this.isRefraction);
    } catch (e) {
      console.warn('Probes update error:', e);
    }

    // 8. Update numerical measurement badges
    try {
      this.updateLiveMeasurements();
    } catch (e) {
      console.warn('Measurement update error:', e);
    }

    // 9. Check Challenges
    try {
      const challengeResult = this.challengeEngine.checkCurrentChallenge(this);
      if (challengeResult && challengeResult.justCompleted) {
        this.showCelebration(challengeResult.challenge);
        this.renderChallengeUI();
      }
    } catch (e) {
      console.warn('Challenge check error:', e);
    }

    // 10. Render 3D Scene
    try {
      this.sceneMgr.render();
    } catch (e) {
      console.warn('3D Scene render error:', e);
    }
  }
}

// Instantiate application on window load
window.addEventListener('DOMContentLoaded', () => {
  window.app = new WaveLabApp();
});
