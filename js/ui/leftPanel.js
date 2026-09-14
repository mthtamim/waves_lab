/**
 * 3D Interactive Wave & Acoustics Laboratory
 * Left Panel: Presets, Tools, Advanced Analysis, Probes, and Presentation Controls
 */

import { PRESET_EXPERIMENTS } from '../presets/presetLibrary.js';

export class LeftPanel {
  constructor(containerElement, callbacks) {
    this.container = containerElement;
    this.callbacks = callbacks;
    this.activePresetId = 'two_sources_in_phase';
    this.render();
  }

  setActivePreset(id) {
    this.activePresetId = id;
    const select = this.container.querySelector('#preset-select');
    if (select) select.value = id;
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="panel-section">
        <label class="section-label">🧪 Experiment Presets</label>
        <select id="preset-select" class="preset-dropdown">
          ${Object.values(PRESET_EXPERIMENTS).map(p => `
            <option value="${p.id}" ${p.id === this.activePresetId ? 'selected' : ''}>
              ${p.name}
            </option>
          `).join('')}
        </select>
      </div>

      <div class="panel-section">
        <label class="section-label">➕ Add Laboratory Object</label>
        <div class="object-buttons-grid">
          <button class="btn-tool" id="btn-add-source"><span class="btn-icon">💡</span> Source</button>
          <button class="btn-tool" id="btn-add-wall"><span class="btn-icon">🧱</span> Wall</button>
          <button class="btn-tool" id="btn-add-slit"><span class="btn-icon">🚪</span> Slit</button>
          <button class="btn-tool" id="btn-add-receiver"><span class="btn-icon">📡</span> Receiver</button>
        </div>
      </div>

      <!-- Feature 2 & 23: Field Colormap & Highlight Modes -->
      <div class="panel-section">
        <label class="section-label">🎨 Surface Style & Highlights</label>
        <select id="select-field-style" class="preset-dropdown">
          <option value="standard">Standard Continuous Wave</option>
          <option value="crest">⭐ Crest Highlight Only</option>
          <option value="trough">🌊 Trough Highlight Only</option>
          <option value="zero">🟢 Zero-Crossing Nodal Lines</option>
          <option value="heatmap">🔥 3D Intensity Heatmap</option>
        </select>
      </div>

      <div class="panel-section">
        <label class="section-label">👁️ Wave Mode</label>
        <div class="mode-select-grid">
          <button class="btn-mode active" data-mode="both">Both</button>
          <button class="btn-mode" data-mode="field">Field</button>
          <button class="btn-mode" data-mode="wavefronts">Rings</button>
          <button class="btn-mode" data-mode="rays">Rays</button>
        </div>
      </div>

      <!-- Features 30, 31, 32, 33: Measurement Probes & Data Export -->
      <div class="panel-section">
        <label class="section-label">📍 Numerical Probes & Data</label>
        <div class="object-buttons-grid">
          <button class="btn-tool" id="btn-add-probe">📍 Drop Probe</button>
          <button class="btn-tool" id="btn-export-csv">📊 Export CSV</button>
        </div>
      </div>

      <!-- Feature 5: Virtual Stroboscope -->
      <div class="panel-section">
        <label class="section-label">⚡ Virtual Stroboscope</label>
        <div class="strobe-row">
          <label class="chk-label">
            <input type="checkbox" id="chk-strobe">
            <span>Freeze Wave (Strobe)</span>
          </label>
          <input type="range" id="strobe-freq" min="0.5" max="3.0" step="0.1" value="1.2" title="Strobe Frequency">
        </div>
      </div>

      <!-- Features 34, 35, 43, 44: Presentation & Classroom Tools -->
      <div class="panel-section">
        <label class="section-label">🎓 Presentation & Teaching</label>
        <div class="cam-buttons-grid">
          <button class="btn-cam" id="btn-toggle-draw">✏️ Annotate</button>
          <button class="btn-cam" id="btn-fullscreen-mode">🖥️ Present</button>
          <button class="btn-cam" id="btn-take-snapshot">📸 Snapshot</button>
          <button class="btn-cam" id="btn-open-glossary">📖 Glossary</button>
        </div>
      </div>

      <div class="panel-section">
        <label class="section-label">🗺️ Overlays & Environment</label>
        <div class="checkbox-list">
          <label class="chk-label">
            <input type="checkbox" id="chk-grid" checked>
            <span>3D Ground Grid</span>
          </label>
          <label class="chk-label">
            <input type="checkbox" id="chk-axes" checked>
            <span>XYZ Coordinate Axes</span>
          </label>
          <label class="chk-label">
            <input type="checkbox" id="chk-measure" checked>
            <span>Distance Path Lines (r1, r2)</span>
          </label>
          <label class="chk-label">
            <input type="checkbox" id="chk-nodes" checked>
            <span>Standing Nodes & Antinodes</span>
          </label>
          <label class="chk-label">
            <input type="checkbox" id="chk-wireframe">
            <span>Wave Wireframe Mesh</span>
          </label>
        </div>
      </div>

      <div class="panel-section">
        <label class="section-label">🎥 Camera Perspective</label>
        <div class="cam-buttons-grid">
          <button class="btn-cam" id="btn-cam-persp">Perspective</button>
          <button class="btn-cam" id="btn-cam-top">Top (2D)</button>
          <button class="btn-cam" id="btn-cam-side">Side</button>
          <button class="btn-cam" id="btn-cam-reset">Reset</button>
        </div>
      </div>

      <div class="panel-section">
        <label class="section-label">💾 Save & Share Lab</label>
        <div class="share-buttons-grid">
          <button class="btn-secondary" id="btn-export-json">Export JSON</button>
          <button class="btn-secondary" id="btn-import-json">Import JSON</button>
        </div>
        <input type="file" id="file-import" accept=".json" style="display: none">
      </div>
    `;

    this.attachEventListeners();
  }

  attachEventListeners() {
    const presetSelect = this.container.querySelector('#preset-select');
    presetSelect.addEventListener('change', (e) => {
      this.activePresetId = e.target.value;
      if (this.callbacks.onPresetSelect) {
        this.callbacks.onPresetSelect(e.target.value);
      }
    });

    // Add Object Buttons
    this.container.querySelector('#btn-add-source').addEventListener('click', () => this.callbacks.onAddObject('source'));
    this.container.querySelector('#btn-add-wall').addEventListener('click', () => this.callbacks.onAddObject('wall'));
    this.container.querySelector('#btn-add-slit').addEventListener('click', () => this.callbacks.onAddObject('slit'));
    this.container.querySelector('#btn-add-receiver').addEventListener('click', () => this.callbacks.onAddObject('receiver'));

    // Colormap style
    this.container.querySelector('#select-field-style').addEventListener('change', (e) => {
      if (this.callbacks.onFieldStyleChange) {
        this.callbacks.onFieldStyleChange(e.target.value);
      }
    });

    // Probes & CSV
    this.container.querySelector('#btn-add-probe').addEventListener('click', () => {
      if (this.callbacks.onAddProbe) this.callbacks.onAddProbe();
    });
    this.container.querySelector('#btn-export-csv').addEventListener('click', () => {
      if (this.callbacks.onExportCSV) this.callbacks.onExportCSV();
    });

    // Stroboscope
    const chkStrobe = this.container.querySelector('#chk-strobe');
    const strobeFreqSlider = this.container.querySelector('#strobe-freq');
    chkStrobe.addEventListener('change', (e) => {
      if (this.callbacks.onStrobeToggle) this.callbacks.onStrobeToggle(e.target.checked, parseFloat(strobeFreqSlider.value));
    });
    strobeFreqSlider.addEventListener('input', (e) => {
      if (this.callbacks.onStrobeToggle) this.callbacks.onStrobeToggle(chkStrobe.checked, parseFloat(e.target.value));
    });

    // Presentation tools
    this.container.querySelector('#btn-toggle-draw').addEventListener('click', () => {
      if (this.callbacks.onToggleDraw) this.callbacks.onToggleDraw();
    });
    this.container.querySelector('#btn-fullscreen-mode').addEventListener('click', () => {
      if (this.callbacks.onTogglePresentation) this.callbacks.onTogglePresentation();
    });
    this.container.querySelector('#btn-take-snapshot').addEventListener('click', () => {
      if (this.callbacks.onTakeSnapshot) this.callbacks.onTakeSnapshot();
    });
    this.container.querySelector('#btn-open-glossary').addEventListener('click', () => {
      if (this.callbacks.onOpenGlossary) this.callbacks.onOpenGlossary();
    });

    // Visualization modes
    const modeButtons = this.container.querySelectorAll('.btn-mode');
    modeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        modeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (this.callbacks.onLayerToggle) {
          this.callbacks.onLayerToggle('visualMode', btn.dataset.mode);
        }
      });
    });

    // Checkboxes
    this.container.querySelector('#chk-grid').addEventListener('change', (e) => this.callbacks.onLayerToggle('grid', e.target.checked));
    this.container.querySelector('#chk-axes').addEventListener('change', (e) => this.callbacks.onLayerToggle('axes', e.target.checked));
    this.container.querySelector('#chk-measure').addEventListener('change', (e) => this.callbacks.onLayerToggle('measurements', e.target.checked));
    this.container.querySelector('#chk-nodes').addEventListener('change', (e) => this.callbacks.onLayerToggle('nodes', e.target.checked));
    this.container.querySelector('#chk-wireframe').addEventListener('change', (e) => this.callbacks.onLayerToggle('wireframe', e.target.checked));

    // Cameras
    this.container.querySelector('#btn-cam-persp').addEventListener('click', () => this.callbacks.onCameraChange('persp'));
    this.container.querySelector('#btn-cam-top').addEventListener('click', () => this.callbacks.onCameraChange('top'));
    this.container.querySelector('#btn-cam-side').addEventListener('click', () => this.callbacks.onCameraChange('side'));
    this.container.querySelector('#btn-cam-reset').addEventListener('click', () => this.callbacks.onCameraChange('reset'));

    // Export & Import
    const btnExport = this.container.querySelector('#btn-export-json');
    const btnImport = this.container.querySelector('#btn-import-json');
    const fileImport = this.container.querySelector('#file-import');

    btnExport.addEventListener('click', () => this.callbacks.onExport());
    btnImport.addEventListener('click', () => fileImport.click());

    fileImport.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => this.callbacks.onImport(event.target.result);
        reader.readAsText(file);
      }
    });
  }
}
