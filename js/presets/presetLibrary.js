/**
 * 3D Interactive Wave & Acoustics Laboratory
 * 10 Experiment Presets & Experiment Save/Load Serialization
 */

export const PRESET_EXPERIMENTS = {
  'single_source': {
    id: 'single_source',
    name: '1. Single Point Source',
    tagline: 'Spherical Wavefront Propagation & Amplitude Attenuation',
    description: 'A single isotropic source radiating spherical wavefronts in 3D space. Notice how amplitude attenuates with distance according to spherical spreading.',
    explanation: {
      observation: 'Wavefronts emerge as concentric circles/spheres expanding outward at constant wave speed v.',
      why: 'Energy radiates uniformly in all directions. As the surface area of the wavefront grows, energy density decreases with distance.',
      tryThis: 'Drag the source or change its frequency slider. Notice how higher frequency leads to shorter wavelength (λ = v / f).'
    },
    sources: [
      { id: 'src_A', name: 'Source A', position: { x: 0, y: 0, z: 0 }, frequency: 1.0, amplitude: 1.2, speed: 3.0, phase: 0, active: true, color: 0x38bdf8 }
    ],
    receiver: { id: 'recv_1', position: { x: 6, y: 0, z: 0 }, active: true },
    walls: [],
    slits: [],
    isBeatMode: false,
    cameraPos: { x: 0, y: 24, z: 26 }
  },

  'two_sources_in_phase': {
    id: 'two_sources_in_phase',
    name: '2. Two Equal Sources (In-Phase)',
    tagline: 'Coherent Interference & Hyperbolic Nodal Lines',
    description: 'Two identical coherent point sources vibrating in phase. Constructive interference creates bright bands (antinodal lines); destructive interference forms dark nodal curves.',
    explanation: {
      observation: 'Along the perpendicular bisector (centerline), the path difference is zero (Δr = 0), producing permanent constructive interference.',
      why: 'When crests meet crests (in-phase), amplitudes add: A_total = A1 + A2. When crests meet troughs, they cancel.',
      tryThis: 'Drag the green receiver into a dark valley on the 3D surface. Watch the resultant wave on the oscilloscope collapse to a flat line!'
    },
    sources: [
      { id: 'src_A', name: 'Source A', position: { x: -4.0, y: 0, z: 0 }, frequency: 1.2, amplitude: 1.0, speed: 3.0, phase: 0, active: true, color: 0x38bdf8 },
      { id: 'src_B', name: 'Source B', position: { x: 4.0, y: 0, z: 0 }, frequency: 1.2, amplitude: 1.0, speed: 3.0, phase: 0, active: true, color: 0xf43f5e }
    ],
    receiver: { id: 'recv_1', position: { x: 0, y: 0, z: 5 }, active: true },
    walls: [],
    slits: [],
    isBeatMode: false,
    cameraPos: { x: 0, y: 25, z: 28 }
  },

  'phase_difference': {
    id: 'phase_difference',
    name: '3. Phase Shift & Beam Steering',
    tagline: 'Interference with 180° Phase Difference',
    description: 'Two coherent sources with a 180° (π radians) phase offset. The centerline now exhibits total destructive interference instead of constructive.',
    explanation: {
      observation: 'The center line (equidistant from both sources) is now a silent, zero-amplitude nodal line.',
      why: 'Because Source B emits a trough exactly when Source A emits a crest, their equal distances result in exact cancellation at all points on the bisector.',
      tryThis: 'Slide the Phase slider of Source B from 180° back to 0° and observe the entire interference pattern shift dynamically across space.'
    },
    sources: [
      { id: 'src_A', name: 'Source A', position: { x: -4.0, y: 0, z: 0 }, frequency: 1.2, amplitude: 1.0, speed: 3.0, phase: 0, active: true, color: 0x38bdf8 },
      { id: 'src_B', name: 'Source B', position: { x: 4.0, y: 0, z: 0 }, frequency: 1.2, amplitude: 1.0, speed: 3.0, phase: Math.PI, active: true, color: 0xf43f5e }
    ],
    receiver: { id: 'recv_1', position: { x: 0, y: 0, z: 5 }, active: true },
    walls: [],
    slits: [],
    isBeatMode: false,
    cameraPos: { x: 0, y: 25, z: 28 }
  },

  'acoustic_beats': {
    id: 'acoustic_beats',
    name: '4. Acoustic Beat Phenomenon',
    tagline: 'Superposition of Slightly Different Frequencies',
    description: 'Two sources with slightly mismatched frequencies (e.g. 1.0 Hz vs 1.1 Hz, or audible 440 Hz vs 444 Hz). Superposition creates periodic amplitude throbbing.',
    explanation: {
      observation: 'The sound and visual displacement throb louder and softer in a rhythmic pulse (Beat Envelope).',
      why: 'Waves alternate between being in-phase (constructive, maximum volume) and out-of-phase (destructive, silence) at the beat frequency f_beat = |f1 - f2|.',
      tryThis: 'Turn on audio! Adjust Source B frequency closer to Source A. The beating rhythm slows down until they become one smooth tone.'
    },
    sources: [
      { id: 'src_A', name: 'Source A (440 Hz tone)', position: { x: -3.0, y: 0, z: 0 }, frequency: 1.0, amplitude: 1.0, speed: 3.0, phase: 0, active: true, color: 0x38bdf8 },
      { id: 'src_B', name: 'Source B (444 Hz tone)', position: { x: 3.0, y: 0, z: 0 }, frequency: 1.08, amplitude: 1.0, speed: 3.0, phase: 0, active: true, color: 0xf43f5e }
    ],
    receiver: { id: 'recv_1', position: { x: 0, y: 0, z: 6 }, active: true },
    walls: [],
    slits: [],
    isBeatMode: true,
    cameraPos: { x: 0, y: 22, z: 26 }
  },

  'wall_reflection': {
    id: 'wall_reflection',
    name: '5. Single Wall Reflection',
    tagline: 'Echo & Boundary Superposition',
    description: 'A point source placed in front of a flat rigid reflector. Waves bounce back and superpose with oncoming incident waves.',
    explanation: {
      observation: 'Concentric wavefronts reflect off the barrier, appearing as if radiating from a mirror image source behind the wall.',
      why: 'The rigid boundary forces a boundary condition causing reflection with phase inversion.',
      tryThis: 'Move the source closer to the wall and observe stationary standing-wave ripples forming in front of the wall.'
    },
    sources: [
      { id: 'src_A', name: 'Source A', position: { x: 0, y: 0, z: -5.0 }, frequency: 1.2, amplitude: 1.2, speed: 3.0, phase: 0, active: true, color: 0x38bdf8 }
    ],
    receiver: { id: 'recv_1', position: { x: 0, y: 0, z: -1.0 }, active: true },
    walls: [
      { id: 'wall_1', name: 'Reflective Wall', position: { x: 0, y: 0, z: 4.0 }, width: 18, height: 3.0, reflectivity: 0.9, phaseInversion: true, normal: { x: 0, y: 0, z: -1 }, active: true }
    ],
    slits: [],
    isBeatMode: false,
    cameraPos: { x: 0, y: 24, z: 28 }
  },

  'standing_waves': {
    id: 'standing_waves',
    name: '6. Standing Waves & Cavity Resonance',
    tagline: 'Resonant Nodes and Antinodes between Boundaries',
    description: 'Two parallel walls forming an acoustic resonant cavity. At resonant frequencies, waves form stationary standing wave patterns with distinct nodes and antinodes.',
    explanation: {
      observation: 'Specific stationary points (Nodes) never move, while midway points (Antinodes) oscillate with double amplitude.',
      why: 'Resonance occurs when cavity length L = n * (λ / 2). Forward and backward reflected waves continuously interfere constructively.',
      tryThis: 'Use the Frequency slider in the inspector to tune into the exact resonant harmonics marked on the 3D floor.'
    },
    sources: [
      { id: 'src_A', name: 'Exciter Source', position: { x: 0, y: 0, z: 0 }, frequency: 1.0, amplitude: 1.0, speed: 3.0, phase: 0, active: true, color: 0x38bdf8 }
    ],
    receiver: { id: 'recv_1', position: { x: 0, y: 0, z: 0 }, active: true },
    walls: [
      { id: 'wall_left', name: 'Left Wall', position: { x: -6.0, y: 0, z: 0 }, width: 12, height: 3.0, reflectivity: 0.95, phaseInversion: true, normal: { x: 1, y: 0, z: 0 }, active: true },
      { id: 'wall_right', name: 'Right Wall', position: { x: 6.0, y: 0, z: 0 }, width: 12, height: 3.0, reflectivity: 0.95, phaseInversion: true, normal: { x: -1, y: 0, z: 0 }, active: true }
    ],
    slits: [],
    isBeatMode: false,
    cameraPos: { x: 0, y: 22, z: 28 }
  },

  'single_slit': {
    id: 'single_slit',
    name: '7. Single Slit Diffraction',
    tagline: 'Wave Bending & Aperture Spreading',
    description: 'A plane or spherical wave encounters a barrier with a single narrow opening. Waves spread out into the geometrical shadow zone.',
    explanation: {
      observation: 'The wave bends around the edges of the opening, emerging as curved secondary wavefronts.',
      why: 'According to the Huygens-Fresnel principle, every point across the slit acts as a secondary source of spherical wavelets.',
      tryThis: 'Decrease the slit width slider. Notice how a narrower slit produces greater angular spreading (wider diffraction)!'
    },
    sources: [
      { id: 'src_A', name: 'Incident Source', position: { x: 0, y: 0, z: -8.0 }, frequency: 1.4, amplitude: 1.2, speed: 3.0, phase: 0, active: true, color: 0x38bdf8 }
    ],
    receiver: { id: 'recv_1', position: { x: 0, y: 0, z: 5.0 }, active: true },
    walls: [],
    slits: [
      { id: 'slit_single', type: 'single', name: 'Single Slit Aperture', position: { x: 0, y: 0, z: 0 }, width: 1.8, active: true }
    ],
    isBeatMode: false,
    cameraPos: { x: 0, y: 25, z: 26 }
  },

  'double_slit': {
    id: 'double_slit',
    name: "8. Young's Double Slit Experiment",
    tagline: 'Combined Wavelet Interference and Diffraction Fringes',
    description: 'An incident wave reaches a barrier with two slits. Two coherent secondary wave trains emerge and interfere in the observation space.',
    explanation: {
      observation: 'Multiple alternating bright and dark fringe bands appear on the far side of the barrier.',
      why: 'Path difference from the two slits Δr = d sin(θ). Bright fringes occur at d sin(θ) = mλ, dark fringes at (m + 1/2)λ.',
      tryThis: 'Drag the receiver horizontally along z = 7 to map out the constructive peaks and destructive minima on the oscilloscope.'
    },
    sources: [
      { id: 'src_A', name: 'Primary Source', position: { x: 0, y: 0, z: -8.0 }, frequency: 1.4, amplitude: 1.2, speed: 3.0, phase: 0, active: true, color: 0x38bdf8 }
    ],
    receiver: { id: 'recv_1', position: { x: 0, y: 0, z: 6.0 }, active: true },
    walls: [],
    slits: [
      { id: 'slit_double', type: 'double', name: 'Double Slit Barrier', position: { x: 0, y: 0, z: 0 }, width: 1.0, separation: 3.2, active: true }
    ],
    isBeatMode: false,
    cameraPos: { x: 0, y: 25, z: 28 }
  },

  'refraction': {
    id: 'refraction',
    name: '9. Refraction & Medium Speed Transition',
    tagline: "Wavefront Compression & Snell's Law",
    description: 'Waves propagate from a faster medium (v1 = 4.0 m/s) across a boundary (z = 0) into a slower/denser medium (v2 = 2.0 m/s).',
    explanation: {
      observation: 'As waves enter the slower medium, the distance between wavefronts (wavelength λ) noticeably compresses.',
      why: 'Frequency f remains constant across boundaries, so when speed drops (v2 < v1), wavelength must decrease proportionally: λ2 = v2 / f.',
      tryThis: 'Switch to "Ray Mode" or observe the compressed wavefront spacing in the lower half of the 3D arena.'
    },
    sources: [
      { id: 'src_A', name: 'Source A', position: { x: 0, y: 0, z: -7.0 }, frequency: 1.2, amplitude: 1.2, speed: 4.0, phase: 0, active: true, color: 0x38bdf8 }
    ],
    receiver: { id: 'recv_1', position: { x: 0, y: 0, z: 4.0 }, active: true },
    walls: [],
    slits: [],
    isBeatMode: false,
    isRefraction: true,
    cameraPos: { x: 0, y: 26, z: 24 }
  },

  'multi_source_array': {
    id: 'multi_source_array',
    name: '10. Quad Multi-Source Array',
    tagline: 'Phased Array Synthesis & Directional Superposition',
    description: 'Four point sources arranged in a linear array. Demonstrates how acoustic arrays and antenna arrays focus wave energy into directed lobes.',
    explanation: {
      observation: 'Energy concentrates into strong forward and backward directional lobes with minimal side radiation.',
      why: 'Multiple wave trains constructively reinforce along the array normal while destructively canceling along side angles.',
      tryThis: 'Progressively disable sources A, B, C, D in the inspector to see how multi-element reinforcement builds sharpness.'
    },
    sources: [
      { id: 'src_A', name: 'Source 1', position: { x: -4.5, y: 0, z: 0 }, frequency: 1.2, amplitude: 0.8, speed: 3.0, phase: 0, active: true, color: 0x38bdf8 },
      { id: 'src_B', name: 'Source 2', position: { x: -1.5, y: 0, z: 0 }, frequency: 1.2, amplitude: 0.8, speed: 3.0, phase: 0, active: true, color: 0x06b6d4 },
      { id: 'src_C', name: 'Source 3', position: { x: 1.5, y: 0, z: 0 }, frequency: 1.2, amplitude: 0.8, speed: 3.0, phase: 0, active: true, color: 0xa855f7 },
      { id: 'src_D', name: 'Source 4', position: { x: 4.5, y: 0, z: 0 }, frequency: 1.2, amplitude: 0.8, speed: 3.0, phase: 0, active: true, color: 0xf43f5e }
    ],
    receiver: { id: 'recv_1', position: { x: 0, y: 0, z: 7 }, active: true },
    walls: [],
    slits: [],
    isBeatMode: false,
    cameraPos: { x: 0, y: 26, z: 28 }
  },

  'doppler_effect': {
    id: 'doppler_effect',
    name: '11. Doppler Effect & Moving Source',
    tagline: 'Wavefront Compression (f_apparent > f_0) & Sound Pitch Shift',
    description: 'A point source traveling across the arena while continuously emitting circular wave crests. Notice compressed wavefronts ahead and elongated wavefronts behind.',
    explanation: {
      observation: 'Wavefronts bunch together tightly in front of the moving source (shortened wavelength λ′), and spread farther apart behind (elongated wavelength λ″).',
      why: 'Apparent frequency f′ = f₀·(v / (v ∓ v_s)). The observer ahead perceives a higher pitch; the observer behind hears a lower pitch.',
      tryThis: 'Position the green receiver at (x: 6, z: 0) directly in the forward path of the source to hear and measure the heightened apparent frequency!'
    },
    sources: [
      { id: 'src_A', name: 'Moving Source', position: { x: -6.0, y: 0, z: 0 }, velocity: { x: 1.2, y: 0, z: 0 }, frequency: 1.2, amplitude: 1.2, speed: 3.0, phase: 0, active: true, color: 0x38bdf8 }
    ],
    receiver: { id: 'recv_1', position: { x: 5.0, y: 0, z: 0 }, active: true },
    walls: [],
    slits: [],
    isBeatMode: false,
    cameraPos: { x: 0, y: 24, z: 24 }
  },

  'wave_packet': {
    id: 'wave_packet',
    name: '12. Wave Packet & Group Velocity',
    tagline: 'Gaussian Envelope & Phase vs Group Propagation',
    description: 'A spatially localized wave packet consisting of an envelope modulating high-frequency carrier oscillations. Demonstrates phase velocity vs group envelope velocity.',
    explanation: {
      observation: 'A pulse with defined width travels without spreading indefinitely under non-dispersive boundary conditions.',
      why: 'The envelope travels at group velocity v_g = dω/dk while individual phase ripples travel at phase velocity v_p = ω/k.',
      tryThis: 'Switch to Custom Equation mode to experiment with different pulse widths σ and dispersion coefficients!'
    },
    sources: [
      { id: 'src_A', name: 'Wave Packet Generator', position: { x: -6.0, y: 0, z: 0 }, frequency: 1.5, amplitude: 1.4, speed: 3.0, phase: 0, active: true, color: 0x38bdf8 }
    ],
    receiver: { id: 'recv_1', position: { x: 0, y: 0, z: 0 }, active: true },
    walls: [],
    slits: [],
    isBeatMode: false,
    cameraPos: { x: 0, y: 24, z: 26 }
  },

  'fourier_synthesis': {
    id: 'fourier_synthesis',
    name: '13. Fourier Harmonic Wave Synthesis',
    tagline: 'Fundamental (f₀) + 3rd Harmonic (3f₀) Acoustic Timbre',
    description: 'Two harmonically locked sources at fundamental frequency f₀ = 1.0 Hz and 3rd harmonic 3f₀ = 3.0 Hz with amplitude ratio 1 : 1/3, synthesizing odd-harmonic sound.',
    explanation: {
      observation: 'The combined wave profile flattens at peaks and steepens at flanks, approaching the profile of a square wave.',
      why: 'According to Fourier theorem, any periodic complex waveform is a linear superposition of sinusoidal harmonic components: Ψ(t) = Σ Aₙ sin(nω₀t).',
      tryThis: 'Adjust the 3rd harmonic amplitude slider in the inspector to hear the acoustic overtone sharpen or mellow the timbre tone.'
    },
    sources: [
      { id: 'src_A', name: 'Fundamental (f₀ = 1.0 Hz)', position: { x: -2.0, y: 0, z: 0 }, frequency: 1.0, amplitude: 1.2, speed: 3.0, phase: 0, active: true, color: 0x38bdf8 },
      { id: 'src_B', name: '3rd Harmonic (3f₀ = 3.0 Hz)', position: { x: 2.0, y: 0, z: 0 }, frequency: 3.0, amplitude: 0.4, speed: 3.0, phase: 0, active: true, color: 0xf43f5e }
    ],
    receiver: { id: 'recv_1', position: { x: 0, y: 0, z: 5 }, active: true },
    walls: [],
    slits: [],
    isBeatMode: false,
    cameraPos: { x: 0, y: 25, z: 28 }
  },

  'corner_reflector': {
    id: 'corner_reflector',
    name: '14. Corner Reflector & Acoustic Retroreflection',
    tagline: '90° Orthogonal Double Boundary Reflection',
    description: 'Two rigid reflectors set at a 90° right angle forming a retroreflecting acoustic corner. Demonstrates sonar/radar retroreflection.',
    explanation: {
      observation: 'Wavefronts reflecting from the two perpendicular surfaces bounce twice and propagate back antiparallel to their original incident direction.',
      why: 'Each reflection reverses one component of the wave vector: (k_x, k_z) -> (-k_x, -k_z), guaranteeing return towards the origin regardless of incident angle.',
      tryThis: 'Drag the source around in the quadrant and notice how the returned reflected echo always heads straight back towards the source!'
    },
    sources: [
      { id: 'src_A', name: 'Radar / Sonar Emitter', position: { x: -4.0, y: 0, z: -4.0 }, frequency: 1.2, amplitude: 1.2, speed: 3.0, phase: 0, active: true, color: 0x38bdf8 }
    ],
    receiver: { id: 'recv_1', position: { x: -4.0, y: 0, z: -2.5 }, active: true },
    walls: [
      { id: 'wall_x', name: 'Horizontal Reflector', position: { x: 2.0, y: 0, z: 0 }, width: 12, height: 3.0, reflectivity: 0.95, phaseInversion: true, normal: { x: 0, y: 0, z: -1 }, active: true },
      { id: 'wall_z', name: 'Vertical Reflector', position: { x: 0, y: 0, z: 2.0 }, width: 12, height: 3.0, reflectivity: 0.95, phaseInversion: true, normal: { x: -1, y: 0, z: 0 }, active: true }
    ],
    slits: [],
    isBeatMode: false,
    cameraPos: { x: -5, y: 28, z: 20 }
  }
};

/**
 * Serializes current state to a portable JSON string
 */
export function exportExperimentToJSON(state) {
  const exportData = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    sources: state.sources,
    receiver: state.receiver,
    walls: state.walls,
    slits: state.slits,
    isBeatMode: state.isBeatMode,
    isRefraction: state.isRefraction
  };
  return JSON.stringify(exportData, null, 2);
}

/**
 * Validates and imports experiment state from JSON
 */
export function importExperimentFromJSON(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    if (!data.sources || !data.receiver) {
      throw new Error('Invalid experiment file format');
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
