/**
 * 3D Interactive Wave & Acoustics Laboratory
 * Analytical Wave Physics & Mathematical Engine (Fully Audited & Hardened)
 */

export class WaveMath {
  // Wave propagation model: 'ideal' (constant amplitude, zero energy loss) | 'practical' (1/r distance attenuation)
  static waveModel = 'ideal';

  // Custom mathematical equation engine reference
  static customEquation = {
    active: false,
    engine: null
  };

  /**
   * Evaluates the contribution of a single spherical point source at target point r(x,y,z) at time t.
   * Handles free space propagation as well as medium refraction boundary transitions.
   */
  static evaluatePointSource(source, targetPos, t, rMin = 0.4, isRefraction = false, overrideModel = null) {
    if (!source.active) return 0;
    
    const dx = targetPos.x - source.position.x;
    const dy = (targetPos.y || 0) - (source.position.y || 0);
    const dz = (targetPos.z || 0) - (source.position.z || 0);
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    const baseSpeed = Math.max(0.2, source.speed || 3.0); // m/s
    const freq = Math.max(0.05, source.frequency || 1.0); // Hz
    const omega = 2 * Math.PI * freq;
    const phase = source.phase || 0; // radians
    const amp = source.amplitude || 1.0;
    
    // Attenuation factor: 'ideal' = constant amplitude, zero energy loss; 'practical' = 1/r geometric spreading
    const activeModel = overrideModel || WaveMath.waveModel || 'ideal';
    const atten = (activeModel === 'ideal') ? amp : (amp / Math.max(dist, rMin));

    let phaseArg;

    // Refraction mode: boundary at Z = 0
    // Medium 1 (Z < 0): speed v1 = baseSpeed (e.g. 4.0 m/s)
    // Medium 2 (Z >= 0): speed v2 = baseSpeed / 2.0 (e.g. 2.0 m/s)
    if (isRefraction && source.position.z < 0 && targetPos.z > 0) {
      const v1 = baseSpeed;
      const v2 = Math.max(0.5, baseSpeed * 0.5); // Slower, denser medium
      
      // Calculate boundary crossing point on plane Z = 0
      const totalSpanZ = targetPos.z - source.position.z;
      const fractionZ = totalSpanZ !== 0 ? -source.position.z / totalSpanZ : 0.5;
      const crossX = source.position.x + fractionZ * (targetPos.x - source.position.x);
      
      const d1 = Math.hypot(crossX - source.position.x, -source.position.z);
      const d2 = Math.hypot(targetPos.x - crossX, targetPos.z);
      
      const accumulatedPhase = (omega / v1) * d1 + (omega / v2) * d2;
      phaseArg = accumulatedPhase - omega * t + phase;
    } else {
      const speed = (isRefraction && targetPos.z > 0) ? Math.max(0.5, baseSpeed * 0.5) : baseSpeed;
      const k = omega / speed;
      phaseArg = k * dist - omega * t + phase;
    }
    
    return atten * Math.cos(phaseArg);
  }

  /**
   * Superposition of all active point sources at target position r at time t.
   * Includes boundary occlusion by slit barriers and wall half-spaces.
   */
  static evaluateSuperposition(sources, targetPos, t, walls = [], slits = [], isRefraction = false, overrideModel = null) {
    // If Custom Mathematical Equation mode is active, evaluate user custom formula directly
    if (WaveMath.customEquation && WaveMath.customEquation.active && WaveMath.customEquation.engine) {
      const r = Math.hypot(targetPos.x, targetPos.z || 0);
      return WaveMath.customEquation.engine.evaluate(targetPos.x, targetPos.z || 0, t, r);
    }

    let totalDisplacement = 0;
    const activeModel = overrideModel || WaveMath.waveModel || 'ideal';
    
    // 1. Direct source contributions (with slit barrier occlusion)
    for (let i = 0; i < sources.length; i++) {
      const src = sources[i];
      if (!src.active) continue;

      // Barrier occlusion check: If a slit exists at barrier Z, direct wave from source on
      // one side cannot directly penetrate through solid wall to target on the other side.
      let isBlockedByBarrier = false;
      if (slits && slits.length > 0) {
        for (const slit of slits) {
          if (!slit.active) continue;
          const barrierZ = slit.position.z || 0;
          if ((src.position.z < barrierZ && targetPos.z > barrierZ) ||
              (src.position.z > barrierZ && targetPos.z < barrierZ)) {
            isBlockedByBarrier = true;
            break;
          }
        }
      }

      if (!isBlockedByBarrier) {
        totalDisplacement += this.evaluatePointSource(src, targetPos, t, 0.4, isRefraction, activeModel);
      }
    }
    
    // 2. Wall reflected contributions (Image source method & cavity multi-bounce)
    if (walls && walls.length > 0) {
      // Check for two parallel walls forming a standing wave resonant cavity
      if (walls.length === 2 && Math.abs(walls[0].position.z - walls[1].position.z) < 0.5) {
        const minX = Math.min(walls[0].position.x, walls[1].position.x);
        const maxX = Math.max(walls[0].position.x, walls[1].position.x);

        // If point is inside the cavity, compute multiple image reflections
        if (targetPos.x >= minX && targetPos.x <= maxX) {
          const L = Math.max(0.1, maxX - minX);
          const src = sources[0];
          if (src && src.active) {
            const isIdeal = activeModel === 'ideal';
            for (let bounce = 1; bounce <= 3; bounce++) {
              const reflFactor = Math.pow(0.88, bounce);
              const sign = bounce % 2 === 1 ? -1 : 1;
              
              // Virtual image across left wall
              const imgLeftX = minX - (bounce * L);
              const dLeft = Math.hypot(targetPos.x - imgLeftX, targetPos.z - src.position.z);
              const k = (2 * Math.PI * src.frequency) / Math.max(0.1, src.speed);
              const ampLeft = isIdeal ? src.amplitude : (src.amplitude / Math.max(dLeft, 0.5));
              totalDisplacement += sign * reflFactor * ampLeft * Math.cos(k * dLeft - 2 * Math.PI * src.frequency * t + src.phase);

              // Virtual image across right wall
              const imgRightX = maxX + (bounce * L);
              const dRight = Math.hypot(targetPos.x - imgRightX, targetPos.z - src.position.z);
              const ampRight = isIdeal ? src.amplitude : (src.amplitude / Math.max(dRight, 0.5));
              totalDisplacement += sign * reflFactor * ampRight * Math.cos(k * dRight - 2 * Math.PI * src.frequency * t + src.phase);
            }
          }
        }
      } else {
        // Standard single/multiple wall reflection with half-space check
        for (const wall of walls) {
          if (!wall.active) continue;
          const normal = wall.normal || { x: 0, y: 0, z: 1 };
          const p = wall.position || { x: 0, y: 0, z: 0 };

          for (const src of sources) {
            if (!src.active) continue;
            
            // Half-space test: target and source must be on the same reflective side of wall plane
            const dotTarget = (targetPos.x - p.x) * normal.x + (targetPos.z - p.z) * normal.z;
            const dotSource = (src.position.x - p.x) * normal.x + (src.position.z - p.z) * normal.z;
            
            if ((dotTarget >= 0 && dotSource >= 0) || (dotTarget <= 0 && dotSource <= 0)) {
              const imageSrc = this.getImageSource(src, wall);
              if (imageSrc) {
                const reflectedAmp = this.evaluatePointSource(imageSrc, targetPos, t, 0.4, isRefraction, activeModel);
                totalDisplacement += reflectedAmp * (wall.reflectivity || 0.85);
              }
            }
          }
        }
      }
    }

    // 3. Slit Huygens secondary wavelets
    if (slits && slits.length > 0) {
      for (const slit of slits) {
        if (!slit.active) continue;
        const wavelets = slit.wavelets || [];
        for (const w of wavelets) {
          totalDisplacement += this.evaluatePointSource(w, targetPos, t, 0.2, isRefraction, activeModel);
        }
      }
    }

    return totalDisplacement;
  }

  /**
   * Calculates the image source of a real source across a planar wall.
   */
  static getImageSource(source, wall) {
    const normal = wall.normal || { x: 0, y: 0, z: 1 };
    const p = wall.position || { x: 0, y: 0, z: 0 };
    
    const v = {
      x: source.position.x - p.x,
      y: source.position.y - p.y,
      z: source.position.z - p.z
    };
    
    const distToPlane = v.x * normal.x + v.y * normal.y + v.z * normal.z;
    
    const imgPos = {
      x: source.position.x - 2 * distToPlane * normal.x,
      y: source.position.y - 2 * distToPlane * normal.y,
      z: source.position.z - 2 * distToPlane * normal.z
    };
    
    const phaseShift = wall.phaseInversion ? Math.PI : 0;
    
    return {
      position: imgPos,
      frequency: source.frequency,
      amplitude: source.amplitude,
      speed: source.speed,
      phase: (source.phase || 0) + phaseShift,
      active: true
    };
  }

  /**
   * Calculates Huygens secondary wavelets for a slit system
   */
  static generateSlitWavelets(slit, incidentSource, countPerSlit = 7) {
    const wavelets = [];
    const positions = [];
    
    const wallZ = slit.position.z || 0;
    const slitY = slit.position.y || 0;
    const slitWidth = Math.max(0.2, slit.width || 1.2);
    
    if (slit.type === 'single') {
      const startX = slit.position.x - slitWidth / 2;
      const step = countPerSlit > 1 ? slitWidth / (countPerSlit - 1) : 0;
      for (let i = 0; i < countPerSlit; i++) {
        positions.push({ x: startX + i * step, y: slitY, z: wallZ });
      }
    } else if (slit.type === 'double') {
      const sep = Math.max(slitWidth + 0.2, slit.separation || 2.5);
      const leftCenter = slit.position.x - sep / 2;
      const rightCenter = slit.position.x + sep / 2;
      
      const halfW = slitWidth / 2;
      const step = countPerSlit > 1 ? slitWidth / (countPerSlit - 1) : 0;
      for (let i = 0; i < countPerSlit; i++) {
        positions.push({ x: (leftCenter - halfW) + i * step, y: slitY, z: wallZ });
      }
      for (let i = 0; i < countPerSlit; i++) {
        positions.push({ x: (rightCenter - halfW) + i * step, y: slitY, z: wallZ });
      }
    }
    
    for (const pos of positions) {
      const dx = pos.x - incidentSource.position.x;
      const dy = pos.y - incidentSource.position.y;
      const dz = pos.z - incidentSource.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      const k = (2 * Math.PI * incidentSource.frequency) / Math.max(0.1, incidentSource.speed);
      const arrivalPhase = (incidentSource.phase || 0) + k * dist;
      const isIdeal = WaveMath.waveModel === 'ideal';
      const arrivalAmp = isIdeal
        ? (incidentSource.amplitude / positions.length)
        : (incidentSource.amplitude / Math.max(dist, 0.5) / positions.length);
      
      wavelets.push({
        position: pos,
        frequency: incidentSource.frequency,
        amplitude: arrivalAmp * (isIdeal ? 1.0 : 1.5),
        speed: incidentSource.speed,
        phase: arrivalPhase,
        active: true
      });
    }
    
    return wavelets;
  }

  /**
   * Path difference between two sources to a receiver point
   */
  static getPathDifference(sourceA, sourceB, receiverPos) {
    const distA = Math.hypot(
      receiverPos.x - sourceA.position.x,
      (receiverPos.y || 0) - (sourceA.position.y || 0),
      (receiverPos.z || 0) - (sourceA.position.z || 0)
    );
    const distB = Math.hypot(
      receiverPos.x - sourceB.position.x,
      (receiverPos.y || 0) - (sourceB.position.y || 0),
      (receiverPos.z || 0) - (sourceB.position.z || 0)
    );
    return Math.abs(distA - distB);
  }

  /**
   * Computes interference condition based on true total phase difference ΔΦ
   */
  static getInterferenceStatus(sourceA, sourceB, receiverPos, t = 0) {
    const pathDiff = this.getPathDifference(sourceA, sourceB, receiverPos);
    const speedA = Math.max(0.2, sourceA.speed || 3.0);
    const wavelengthA = speedA / Math.max(0.05, sourceA.frequency || 1.0);
    const ratio = pathDiff / wavelengthA;
    const nearestInt = Math.round(ratio);

    const distA = Math.hypot(
      receiverPos.x - sourceA.position.x,
      (receiverPos.y || 0) - (sourceA.position.y || 0),
      (receiverPos.z || 0) - (sourceA.position.z || 0)
    );
    const distB = Math.hypot(
      receiverPos.x - sourceB.position.x,
      (receiverPos.y || 0) - (sourceB.position.y || 0),
      (receiverPos.z || 0) - (sourceB.position.z || 0)
    );

    const kA = (2 * Math.PI * (sourceA.frequency || 1.0)) / speedA;
    const kB = (2 * Math.PI * (sourceB.frequency || 1.0)) / Math.max(0.2, sourceB.speed || 3.0);
    const omegaA = 2 * Math.PI * (sourceA.frequency || 1.0);
    const omegaB = 2 * Math.PI * (sourceB.frequency || 1.0);

    const phaseA = kA * distA - omegaA * t + (sourceA.phase || 0);
    const phaseB = kB * distB - omegaB * t + (sourceB.phase || 0);

    let phaseDiffDeg = (Math.abs(phaseA - phaseB) * 180 / Math.PI) % 360;
    if (phaseDiffDeg > 180) phaseDiffDeg = 360 - phaseDiffDeg;

    let type = 'Intermediate';

    // When frequencies are equal or very close, coherence allows stationary interference determination
    if (Math.abs((sourceA.frequency || 1.0) - (sourceB.frequency || 1.0)) < 0.02) {
      if (phaseDiffDeg <= 25) {
        type = 'Constructive (Crest + Crest Maxima)';
      } else if (phaseDiffDeg >= 155) {
        type = 'Destructive (Node / Cancellation)';
      } else {
        type = 'Intermediate Superposition';
      }
    } else {
      type = 'Acoustic Beats / Periodic Modulation';
    }

    return {
      pathDifference: pathDiff,
      wavelength: wavelengthA,
      ratio,
      order: nearestInt,
      phaseDiffDeg,
      type
    };
  }

  /**
   * Computes acoustic beat characteristics
   */
  static getBeatProperties(f1, f2, amp1 = 1.0, amp2 = 1.0) {
    const beatFreq = Math.abs(f1 - f2);
    const carrierFreq = (f1 + f2) / 2;
    const maxAmp = amp1 + amp2;
    const minAmp = Math.abs(amp1 - amp2);
    const beatPeriod = beatFreq > 0 ? 1 / beatFreq : Infinity;
    
    return {
      beatFreq,
      carrierFreq,
      maxAmp,
      minAmp,
      beatPeriod
    };
  }
}
