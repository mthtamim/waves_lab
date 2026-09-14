/**
 * 3D Interactive Wave & Acoustics Laboratory
 * Educational Guidance & Interactive Challenge System
 */

export class EducationalGuide {
  constructor(containerElement) {
    this.container = containerElement;
    this.currentMode = 'guided'; // 'guided' or 'free'
    this.currentPreset = null;
  }

  setMode(mode) {
    this.currentMode = mode;
    this.render();
  }

  updatePreset(preset) {
    this.currentPreset = preset;
    this.render();
  }

  render() {
    if (!this.container) return;

    if (this.currentMode === 'free') {
      this.container.innerHTML = `
        <div class="edu-card free-mode">
          <div class="edu-badge free">🔬 Free Experiment Lab</div>
          <h3 class="edu-title">Sandbox Mode Active</h3>
          <p class="edu-desc">
            You have full freedom to add, remove, and reposition wave sources, reflective barriers, and apertures. Explore how custom geometries shape interference, diffraction, and standing wave modes.
          </p>
          <div class="edu-tip">
            💡 <em>Tip: Place a receiver anywhere in the 3D space to monitor the combined waveform and phase in the oscilloscope below.</em>
          </div>
        </div>
      `;
      return;
    }

    if (!this.currentPreset || !this.currentPreset.explanation) {
      this.container.innerHTML = `
        <div class="edu-card">
          <div class="edu-badge">🎓 Guided Learning</div>
          <h3 class="edu-title">Select an Experiment</h3>
          <p class="edu-desc">Choose a preset from the left panel to begin exploring wave phenomena step-by-step.</p>
        </div>
      `;
      return;
    }

    const exp = this.currentPreset.explanation;

    this.container.innerHTML = `
      <div class="edu-card">
        <div class="edu-header">
          <span class="edu-badge">🎓 Guided Learning</span>
          <span class="edu-tag">${this.currentPreset.name.split('.')[1] || this.currentPreset.name}</span>
        </div>
        <h3 class="edu-title">${this.currentPreset.tagline || this.currentPreset.name}</h3>
        <p class="edu-desc">${this.currentPreset.description}</p>

        <div class="edu-section observation">
          <div class="section-title">
            <span class="icon">👁️</span> <strong>What to Observe:</strong>
          </div>
          <p class="section-text">${exp.observation}</p>
        </div>

        <div class="edu-section why">
          <div class="section-title">
            <span class="icon">🧠</span> <strong>Why? (Physics Principle):</strong>
          </div>
          <p class="section-text">${exp.why}</p>
        </div>

        <div class="edu-section try-this">
          <div class="section-title">
            <span class="icon">🎯</span> <strong>Try This (Hands-On):</strong>
          </div>
          <p class="section-text">${exp.tryThis}</p>
        </div>
      </div>
    `;
  }
}
