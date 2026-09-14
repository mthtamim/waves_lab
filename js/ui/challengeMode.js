/**
 * 3D Interactive Wave & Acoustics Laboratory
 * Physics Challenge Mode, Prediction Engine, Random Generator & Scientific Workspace
 */

export class ChallengeModeEngine {
  constructor(appRef) {
    this.app = appRef;

    this.challenges = [
      {
        id: 'challenge_destructive',
        title: 'Mission 1: Total Destructive Cancellation',
        difficulty: 'Beginner',
        description: 'Adjust the phase of Source B so that complete destructive cancellation occurs at Receiver R(0, 5).',
        hint: 'Two waves cancel when they arrive out-of-phase (180° or π radians phase difference) with equal distances.',
        check: (state) => {
          if (state.sources.length < 2) return false;
          const sA = state.sources[0];
          const sB = state.sources[1];
          const dPhase = Math.abs((sA.phase || 0) - (sB.phase || 0)) % (2 * Math.PI);
          const deg = (dPhase * 180) / Math.PI;
          return Math.abs(deg - 180) < 10 && Math.abs(sA.frequency - sB.frequency) < 0.05;
        }
      },
      {
        id: 'challenge_constructive',
        title: 'Mission 2: Superposition Amplitude Doubling',
        difficulty: 'Beginner',
        description: 'Position both Source A and Source B such that their crests reinforce constructively at the receiver (Δr = 0 or nλ).',
        hint: 'Keep Source A and Source B equidistant from the receiver, or set path difference equal to one full wavelength.',
        check: (state) => {
          if (state.sources.length < 2) return false;
          const rPos = state.receiver.position;
          const distA = Math.hypot(rPos.x - state.sources[0].position.x, rPos.z - state.sources[0].position.z);
          const distB = Math.hypot(rPos.x - state.sources[1].position.x, rPos.z - state.sources[1].position.z);
          const diff = Math.abs(distA - distB);
          return diff < 0.25 && Math.abs(state.sources[0].phase - state.sources[1].phase) < 0.15;
        }
      },
      {
        id: 'challenge_beat_tune',
        title: 'Mission 3: Precision Beat Tuning (3.0 Hz)',
        difficulty: 'Intermediate',
        description: 'Set Source A to 1.00 Hz, then tune Source B so that the beat frequency is exactly 3.00 Hz (Δf = 3.0 Hz).',
        hint: 'Beat frequency is the absolute difference f_beat = |f1 - f2|.',
        check: (state) => {
          if (state.sources.length < 2) return false;
          const df = Math.abs(state.sources[0].frequency - state.sources[1].frequency);
          return Math.abs(df - 3.0) < 0.15;
        }
      },
      {
        id: 'challenge_standing_res',
        title: 'Mission 4: Cavity Standing Wave 2nd Harmonic',
        difficulty: 'Advanced',
        description: 'In the Two-Wall resonator (Length L = 12m, v = 3.0 m/s), tune the exciter frequency to achieve the 2nd harmonic (f = 0.50 Hz).',
        hint: 'Resonant frequency f_n = n * v / (2 * L). For n = 2: f2 = 2 * 3.0 / (2 * 12) = 0.50 Hz.',
        check: (state) => {
          if (state.walls.length < 2) return false;
          const f = state.sources[0] ? state.sources[0].frequency : 0;
          return Math.abs(f - 0.50) < 0.05;
        }
      }
    ];

    this.activeChallengeIndex = 0;
    this.completedChallenges = new Set();
  }

  getCurrentChallenge() {
    return this.challenges[this.activeChallengeIndex];
  }

  checkCurrentChallenge(state) {
    const ch = this.getCurrentChallenge();
    if (!ch) return false;

    const isPassed = ch.check(state);
    if (isPassed && !this.completedChallenges.has(ch.id)) {
      this.completedChallenges.add(ch.id);
      return { justCompleted: true, challenge: ch };
    }
    return { justCompleted: false, isPassed, challenge: ch };
  }

  selectChallenge(idx) {
    if (idx >= 0 && idx < this.challenges.length) {
      this.activeChallengeIndex = idx;
    }
  }

  /**
   * Generates a random mystery configuration for student discovery
   */
  generateMysteryExperiment() {
    const mysteryFreq = Number((0.6 + Math.random() * 1.8).toFixed(2));
    const mysteryPhase = Math.random() > 0.5 ? Math.PI : 0;
    const spacing = Number((3.0 + Math.random() * 4.0).toFixed(1));

    return {
      name: '🔍 Mystery Lab Challenge',
      hiddenAnswer: { frequency: mysteryFreq, phase: mysteryPhase, spacing },
      sources: [
        { id: 'src_A', name: 'Mystery Source A', position: { x: -spacing / 2, y: 0, z: 0 }, frequency: mysteryFreq, amplitude: 1.0, speed: 3.0, phase: 0, active: true, color: 0x38bdf8 },
        { id: 'src_B', name: 'Mystery Source B', position: { x: spacing / 2, y: 0, z: 0 }, frequency: mysteryFreq, amplitude: 1.0, speed: 3.0, phase: mysteryPhase, active: true, color: 0xf43f5e }
      ],
      receiver: { id: 'recv_1', position: { x: 0, y: 0, z: 5 }, active: true }
    };
  }
}
