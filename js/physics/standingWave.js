/**
 * 3D Interactive Wave & Acoustics Laboratory
 * Standing Wave and Resonator Physics
 */

export class StandingWaveCalculator {
  /**
   * Calculates resonant frequencies for a 1D cavity of length L with fixed ends
   */
  static getResonantModes(length, waveSpeed = 3.0, maxHarmonics = 6) {
    const modes = [];
    for (let n = 1; n <= maxHarmonics; n++) {
      const wavelength = (2 * length) / n;
      const frequency = (n * waveSpeed) / (2 * length);
      modes.push({
        harmonic: n,
        name: n === 1 ? 'Fundamental (1st Harmonic)' : `${n}th Harmonic`,
        wavelength,
        frequency,
        nodeCount: n + 1,
        antinodeCount: n
      });
    }
    return modes;
  }

  /**
   * Find nearest harmonic for given current frequency
   */
  static analyzeCurrentResonance(length, currentFreq, waveSpeed = 3.0) {
    const wavelength = waveSpeed / currentFreq;
    const nExact = (2 * length) / wavelength;
    const nNearest = Math.round(nExact);
    const resonanceQuality = Math.max(0, 1.0 - Math.abs(nExact - nNearest) * 4); // 1 = perfect resonance
    const isResonant = Math.abs(nExact - nNearest) < 0.12;

    // Node and Antinode coordinates along length [0, L]
    const nodes = [];
    const antinodes = [];
    
    if (nNearest > 0) {
      const nodeStep = wavelength / 2;
      for (let x = 0; x <= length + 0.001; x += nodeStep) {
        nodes.push(Number(x.toFixed(2)));
      }
      for (let x = nodeStep / 2; x < length; x += nodeStep) {
        antinodes.push(Number(x.toFixed(2)));
      }
    }

    return {
      nExact,
      nNearest,
      isResonant,
      resonanceQuality,
      wavelength,
      nodes,
      antinodes
    };
  }

  /**
   * Evaluates standing wave profile: y(x,t) = 2A * sin(kx) * cos(wt)
   */
  static evaluateStandingWave(x, t, length, frequency, waveSpeed, amplitude) {
    const k = (2 * Math.PI * frequency) / waveSpeed;
    const omega = 2 * Math.PI * frequency;
    return 2 * amplitude * Math.sin(k * x) * Math.cos(omega * t);
  }
}
