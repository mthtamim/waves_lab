/**
 * 3D Interactive Wave & Acoustics Laboratory
 * 3D Wave Visualization (Wavefronts, Amplitude Field Slice, Rays)
 * Optimized with Ring Mesh Pooling to eliminate GC pauses.
 */

import * as THREE from 'three';
import { WaveMath } from '../physics/waveMath.js';

export class WaveRenderer {
  constructor(scene) {
    this.scene = scene;
    
    // Visualization mode: 'field', 'wavefronts', 'both', 'rays'
    this.visualMode = 'both';

    // Field rendering style: 'standard', 'crest', 'trough', 'zero', 'heatmap'
    this.fieldRenderStyle = 'standard';
    
    // Wavefronts group
    this.wavefrontsGroup = new THREE.Group();
    this.scene.add(this.wavefrontsGroup);

    // Rays group
    this.raysGroup = new THREE.Group();
    this.scene.add(this.raysGroup);

    // Dynamic 2D/3D Amplitude Field Mesh
    this.fieldResolution = 60;
    this.fieldSize = 36;
    this.setupAmplitudeField();

    // Reusable unit ring geometry for ring mesh pooling
    this.unitRingGeo = new THREE.RingGeometry(0.96, 1.04, 64);
    this.unitRingGeo.rotateX(-Math.PI / 2);

    // Pool of reusable ring meshes
    this.ringPool = [];
    this.activeRingsCount = 0;
  }

  setupAmplitudeField() {
    this.fieldGeometry = new THREE.PlaneGeometry(
      this.fieldSize,
      this.fieldSize,
      this.fieldResolution,
      this.fieldResolution
    );
    this.fieldGeometry.rotateX(-Math.PI / 2);

    const count = this.fieldGeometry.attributes.position.count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      colors[i] = 0.2;
      colors[i + 1] = 0.5;
      colors[i + 2] = 0.9;
    }
    this.fieldGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.fieldMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.35,
      metalness: 0.2,
      wireframe: false,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide
    });

    this.fieldMesh = new THREE.Mesh(this.fieldGeometry, this.fieldMaterial);
    this.fieldMesh.position.y = 0.05;
    this.fieldMesh.receiveShadow = true;
    this.scene.add(this.fieldMesh);
  }

  setVisualMode(mode) {
    this.visualMode = mode;
    if (this.fieldMesh) {
      this.fieldMesh.visible = mode === 'field' || mode === 'both';
    }
    if (this.wavefrontsGroup) {
      this.wavefrontsGroup.visible = mode === 'wavefronts' || mode === 'both';
    }
    if (this.raysGroup) {
      this.raysGroup.visible = mode === 'rays';
    }
  }

  setFieldRenderStyle(style) {
    this.fieldRenderStyle = style;
  }

  setWireframe(enabled) {
    if (this.fieldMaterial) {
      this.fieldMaterial.wireframe = enabled;
    }
  }

  /**
   * Acquire a ring mesh from pool or create if needed
   */
  getRingMesh(colorHex) {
    let mesh;
    if (this.activeRingsCount < this.ringPool.length) {
      mesh = this.ringPool[this.activeRingsCount];
      mesh.visible = true;
    } else {
      const mat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
      });
      mesh = new THREE.Mesh(this.unitRingGeo, mat);
      this.wavefrontsGroup.add(mesh);
      this.ringPool.push(mesh);
    }
    this.activeRingsCount++;
    mesh.material.color.set(colorHex);
    return mesh;
  }

  /**
   * Updates all wave visuals for current simulation time t
   */
  update(simTime, sources, walls = [], slits = [], isRefraction = false) {
    const showField = this.visualMode === 'field' || this.visualMode === 'both';
    const showWavefronts = this.visualMode === 'wavefronts' || this.visualMode === 'both';
    const showRays = this.visualMode === 'rays';

    // 1. Update Amplitude Field Surface
    if (showField && this.fieldMesh.visible) {
      this.updateFieldMesh(simTime, sources, walls, slits, isRefraction);
    }

    // 2. Update Expanding Wavefronts
    if (showWavefronts && this.wavefrontsGroup.visible) {
      this.updateWavefronts(simTime, sources, walls, slits);
    }

    // 3. Update Propagation Rays
    if (showRays && this.raysGroup.visible) {
      this.updateRays(sources, walls);
    }
  }

  updateFieldMesh(simTime, sources, walls, slits, isRefraction) {
    const posAttr = this.fieldGeometry.attributes.position;
    const colorAttr = this.fieldGeometry.attributes.color;
    const vertex = new THREE.Vector3();
    const tempPos = { x: 0, y: 0, z: 0 };

    for (let i = 0; i < posAttr.count; i++) {
      vertex.fromBufferAttribute(posAttr, i);
      tempPos.x = vertex.x;
      tempPos.z = vertex.z;

      const displacement = WaveMath.evaluateSuperposition(sources, tempPos, simTime, walls, slits, isRefraction);
      
      posAttr.setY(i, displacement * 1.4);

      let r = 0, g = 0, b = 0;

      if (this.fieldRenderStyle === 'heatmap') {
        // Feature 23: 3D Intensity Heatmap I = psi^2
        const intensity = Math.min(1.0, (displacement * displacement) / 2.5);
        r = Math.min(1.0, intensity * 1.6);
        g = Math.max(0, Math.min(1.0, (intensity - 0.25) * 1.5));
        b = Math.max(0, Math.min(1.0, (intensity - 0.65) * 2.5));
      } else if (this.fieldRenderStyle === 'crest') {
        // Feature 2: Crest Highlight
        if (displacement > 0.8) {
          r = 1.0; g = 0.85; b = 0.1; // Golden crests
        } else {
          r = 0.1; g = 0.15; b = 0.25;
        }
      } else if (this.fieldRenderStyle === 'trough') {
        // Feature 2: Trough Highlight
        if (displacement < -0.8) {
          r = 0.9; g = 0.15; b = 0.6; // Magenta troughs
        } else {
          r = 0.1; g = 0.15; b = 0.25;
        }
      } else if (this.fieldRenderStyle === 'zero') {
        // Feature 2: Zero-Crossing Nodal Lines
        if (Math.abs(displacement) < 0.1) {
          r = 0.1; g = 1.0; b = 0.4; // Neon green nodal lines
        } else {
          r = 0.1; g = 0.12; b = 0.2;
        }
      } else {
        // Standard Colormap: [-1.8, +1.8]
        const norm = Math.max(-1, Math.min(1, displacement / 1.8));
        if (norm < 0) {
          const t = norm + 1; // 0 to 1
          r = 0.05 + 0.15 * t;
          g = 0.15 + 0.65 * t;
          b = 0.9;
        } else {
          const t = norm; // 0 to 1
          r = 0.2 + 0.8 * t;
          g = 0.8 - 0.4 * t;
          b = 0.9 * (1 - t);
        }
      }

      colorAttr.setXYZ(i, r, g, b);
    }

    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    this.fieldGeometry.computeVertexNormals();
  }

  updateWavefronts(simTime, sources, walls, slits) {
    // Reset pool counter
    this.activeRingsCount = 0;

    const ringCount = 10;
    const maxRadius = 18;

    // Direct sources
    sources.forEach(src => {
      if (!src.active) return;
      const speed = src.speed || 3.0;
      const freq = src.frequency || 1.0;
      const lambda = speed / freq;
      const period = 1.0 / freq;
      const phaseOffset = (((simTime - (src.phase || 0) / (2 * Math.PI * freq)) % period + period) % period) / period * lambda;

      const srcColor = src.color || 0x38bdf8;
      const vel = (window.app && window.app.movingSrcMgr) ? window.app.movingSrcMgr.getVelocity(src.id) : (src.velocity || { x: 0, z: 0 });

      for (let i = 0; i < ringCount; i++) {
        const radius = i * lambda + phaseOffset;
        if (radius <= 0.25 || radius > maxRadius) continue;

        // Wavefront emitted age tau = radius / speed
        const age = radius / speed;
        const emitX = src.position.x - (vel.x || 0) * age;
        const emitZ = src.position.z - (vel.z || 0) * age;

        const alpha = Math.max(0.04, 0.8 * (1 - radius / maxRadius));
        const mesh = this.getRingMesh(srcColor);
        mesh.scale.set(radius, radius, 1);
        mesh.position.set(emitX, 0.08, emitZ);
        mesh.material.opacity = alpha;
      }
    });

    // Huygens wavelets for slits
    slits.forEach(slit => {
      if (!slit.active || !slit.wavelets) return;
      slit.wavelets.forEach((w, idx) => {
        if (idx % 2 !== 0) return;
        const speed = w.speed || 3.0;
        const freq = w.frequency || 1.0;
        const lambda = speed / freq;
        const period = 1.0 / freq;
        const phaseOffset = (((simTime - (w.phase || 0) / (2 * Math.PI * freq)) % period + period) % period) / period * lambda;

        for (let i = 0; i < 5; i++) {
          const radius = i * lambda + phaseOffset;
          if (radius <= 0.25 || radius > 14) continue;

          const alpha = Math.max(0.04, 0.5 * (1 - radius / 14));
          const mesh = this.getRingMesh(0xa855f7);
          mesh.scale.set(radius, radius, 1);
          mesh.position.set(w.position.x, 0.08, w.position.z);
          mesh.material.opacity = alpha;
        }
      });
    });

    // Hide any unused rings in the pool
    for (let i = this.activeRingsCount; i < this.ringPool.length; i++) {
      this.ringPool[i].visible = false;
    }
  }

  updateRays(sources, walls) {
    while (this.raysGroup.children.length > 0) {
      const obj = this.raysGroup.children[0];
      this.raysGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    }

    const numRays = 16;
    sources.forEach(src => {
      if (!src.active) return;
      const angleStep = (2 * Math.PI) / numRays;

      for (let i = 0; i < numRays; i++) {
        const theta = i * angleStep;
        const dir = new THREE.Vector3(Math.cos(theta), 0, Math.sin(theta)).normalize();
        const start = new THREE.Vector3(src.position.x, 0.3, src.position.z);
        const rayLen = 15;
        const end = start.clone().add(dir.clone().multiplyScalar(rayLen));

        const points = [start, end];
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const lineMat = new THREE.LineBasicMaterial({
          color: src.color || 0x38bdf8,
          transparent: true,
          opacity: 0.65
        });

        const line = new THREE.Line(lineGeo, lineMat);
        this.raysGroup.add(line);
      }
    });
  }
}
