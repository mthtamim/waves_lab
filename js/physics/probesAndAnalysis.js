/**
 * 3D Interactive Wave & Acoustics Laboratory
 * Probes, Spatial Scan, Cross-Section, Intensity Heatmap & CSV Export
 */

import * as THREE from 'three';
import { WaveMath } from './waveMath.js';

export class ProbesAndAnalysis {
  constructor(scene) {
    this.scene = scene;
    this.probes = []; // Array of { id, name, position: {x, z}, color, pinMesh, history }
    this.probeGroup = new THREE.Group();
    this.scene.add(this.probeGroup);

    // Scan line points
    this.scanLine = {
      active: false,
      start: { x: -10, z: 5 },
      end: { x: 10, z: 5 },
      samples: 50,
      data: []
    };

    // Cross-section cutting plane
    this.crossSection = {
      active: false,
      axis: 'x', // 'x' cuts along Z, 'z' cuts along X
      position: 0,
      data: []
    };

    // Colors for probes
    this.probeColors = [0xf59e0b, 0x10b981, 0x8b5cf6, 0xec4899, 0x06b6d4];
  }

  addProbe(pos, name = null) {
    const id = `probe_${Date.now()}_${this.probes.length + 1}`;
    const color = this.probeColors[this.probes.length % this.probeColors.length];
    const probeName = name || `Probe ${String.fromCharCode(65 + this.probes.length)}`;

    // 3D Pin Mesh
    const pinGroup = new THREE.Group();
    pinGroup.position.set(pos.x, 0, pos.z);

    // Vertical needle
    const needleGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.4, 8);
    const needleMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 });
    const needle = new THREE.Mesh(needleGeo, needleMat);
    needle.position.y = 0.7;
    pinGroup.add(needle);

    // Glowing sphere head
    const headGeo = new THREE.SphereGeometry(0.2, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.8,
      metalness: 0.5,
      roughness: 0.2
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.4;
    pinGroup.add(head);

    // Base ring
    const ringGeo = new THREE.RingGeometry(0.15, 0.22, 16);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.05;
    pinGroup.add(ring);

    this.probeGroup.add(pinGroup);

    const newProbe = {
      id,
      name: probeName,
      position: { x: pos.x, z: pos.z },
      color,
      mesh: pinGroup,
      history: []
    };

    this.probes.push(newProbe);
    return newProbe;
  }

  removeProbe(id) {
    const idx = this.probes.findIndex(p => p.id === id);
    if (idx !== -1) {
      const p = this.probes[idx];
      this.probeGroup.remove(p.mesh);
      this.probes.splice(idx, 1);
    }
  }

  clearProbes() {
    while (this.probeGroup.children.length > 0) {
      this.probeGroup.remove(this.probeGroup.children[0]);
    }
    this.probes = [];
  }

  /**
   * Samples all active probes at current simulation time
   */
  sampleProbes(simTime, sources, walls, slits, isRefraction) {
    const results = [];

    this.probes.forEach(probe => {
      const pos = { x: probe.position.x, y: 0, z: probe.position.z };
      const displacement = WaveMath.evaluateSuperposition(sources, pos, simTime, walls, slits, isRefraction);
      
      // Calculate instantaneous and time-averaged intensity approximation
      const instIntensity = displacement * displacement;

      // Contribution from individual sources
      const contributions = sources.map(s => ({
        sourceName: s.name,
        disp: WaveMath.evaluatePointSource(s, pos, simTime, 0.4, isRefraction)
      }));

      const record = {
        id: probe.id,
        name: probe.name,
        x: probe.position.x,
        z: probe.position.z,
        time: simTime,
        displacement,
        instIntensity,
        contributions
      };

      probe.history.push(record);
      if (probe.history.length > 100) probe.history.shift();

      results.push(record);
    });

    return results;
  }

  /**
   * Spatial scan along a 1D transect line
   */
  performSpatialScan(simTime, sources, walls, slits, isRefraction) {
    const start = this.scanLine.start;
    const end = this.scanLine.end;
    const N = this.scanLine.samples;
    const points = [];

    for (let i = 0; i <= N; i++) {
      const frac = i / N;
      const x = start.x + frac * (end.x - start.x);
      const z = start.z + frac * (end.z - start.z);
      const pos = { x, y: 0, z };
      const disp = WaveMath.evaluateSuperposition(sources, pos, simTime, walls, slits, isRefraction);
      const intensity = disp * disp;
      points.push({ frac, x, z, displacement: disp, intensity });
    }

    this.scanLine.data = points;
    return points;
  }

  /**
   * Generates a downloadable CSV string from probe measurements
   */
  exportProbesToCSV() {
    if (this.probes.length === 0) return null;

    let csv = 'Probe Name,X (m),Z (m),Time (s),Instantaneous Displacement,Instantaneous Intensity\n';
    this.probes.forEach(probe => {
      probe.history.forEach(h => {
        csv += `"${probe.name}",${h.x.toFixed(2)},${h.z.toFixed(2)},${h.time.toFixed(3)},${h.displacement.toFixed(4)},${h.instIntensity.toFixed(4)}\n`;
      });
    });

    return csv;
  }
}
