/**
 * 3D Interactive Wave & Acoustics Laboratory
 * Moving Sources, Doppler Wave Dynamics, Trajectory Ribbons & Ghost Markers (Hardened)
 */

import * as THREE from 'three';

export class MovingSourceManager {
  constructor(scene) {
    this.scene = scene;
    this.movingSources = new Map(); // sourceId -> { trajectory, speed, mode, bounds, history, velocity }

    // Trajectory lines group
    this.trajectoryGroup = new THREE.Group();
    this.scene.add(this.trajectoryGroup);

    // Ghost position group
    this.ghostGroup = new THREE.Group();
    this.scene.add(this.ghostGroup);

    this.showTrajectories = true;
    this.showGhosts = true;

    // Cache of reusable trajectory line meshes
    this.trajectoryLines = new Map(); // sourceId -> THREE.Line
  }

  /**
   * Registers or updates a moving source configuration
   */
  configureMotion(sourceId, config = { enabled: false, speed: 1.5, mode: 'linear', axis: 'x', range: 8 }) {
    const existing = this.movingSources.get(sourceId) || { history: [] };
    this.movingSources.set(sourceId, {
      enabled: config.enabled !== undefined ? config.enabled : false,
      speed: config.speed !== undefined ? config.speed : 1.5,
      mode: config.mode || 'linear', // 'linear' or 'circular'
      axis: config.axis || 'x',
      range: config.range || 8,
      center: { x: 0, z: 0 },
      history: existing.history || [],
      velocity: { x: 0, z: 0 }
    });

    if (!config.enabled && this.trajectoryLines.has(sourceId)) {
      const line = this.trajectoryLines.get(sourceId);
      this.trajectoryGroup.remove(line);
      if (line.geometry) line.geometry.dispose();
      this.trajectoryLines.delete(sourceId);
    }
  }

  getMotion(sourceId) {
    return this.movingSources.get(sourceId);
  }

  getVelocity(sourceId) {
    const motion = this.movingSources.get(sourceId);
    return (motion && motion.enabled) ? motion.velocity : { x: 0, z: 0 };
  }

  getDopplerShift(source, receiverPos) {
    if (!source || !receiverPos) return source ? (source.frequency || 1.0) : 1.0;
    const vel = this.getVelocity(source.id);
    return MovingSourceManager.getDopplerShift(source, receiverPos, vel);
  }

  reset() {
    this.movingSources.forEach((m) => {
      m.history = [];
      m.velocity = { x: 0, z: 0 };
    });
    this.clearTrajectories();
    this.clearGhost();
  }

  update(dt, simTime, sources) {
    sources.forEach(src => {
      const motion = this.movingSources.get(src.id);
      if (!motion || !motion.enabled) return;

      let vx = 0;
      let vz = 0;

      if (motion.mode === 'linear') {
        const span = Math.max(1.0, motion.range);
        const cycle = span * 2;
        const phase = ((simTime * motion.speed) % cycle + cycle) % cycle;
        const isForward = phase < span;
        const offset = isForward ? phase - span / 2 : span * 1.5 - phase;
        
        const speedVal = isForward ? motion.speed : -motion.speed;
        if (motion.axis === 'x') {
          src.position.x = offset;
          vx = speedVal;
          vz = 0;
        } else {
          src.position.z = offset;
          vx = 0;
          vz = speedVal;
        }
      } else if (motion.mode === 'circular') {
        const radius = Math.max(1.0, motion.range / 2);
        const omega = motion.speed / radius;
        const angle = simTime * omega;
        
        src.position.x = radius * Math.cos(angle);
        src.position.z = radius * Math.sin(angle);
        vx = -motion.speed * Math.sin(angle);
        vz = motion.speed * Math.cos(angle);
      }

      motion.velocity = { x: vx, z: vz };

      // Record trajectory history for ribbon
      motion.history.push(new THREE.Vector3(src.position.x, 0.2, src.position.z));
      if (motion.history.length > 70) motion.history.shift();
    });

    if (this.showTrajectories) {
      this.renderTrajectories();
    }
  }

  renderTrajectories() {
    this.movingSources.forEach((motion, sourceId) => {
      if (!motion.enabled || motion.history.length < 2) {
        if (this.trajectoryLines.has(sourceId)) {
          const line = this.trajectoryLines.get(sourceId);
          this.trajectoryGroup.remove(line);
          if (line.geometry) line.geometry.dispose();
          this.trajectoryLines.delete(sourceId);
        }
        return;
      }

      let line = this.trajectoryLines.get(sourceId);
      if (!line) {
        const geo = new THREE.BufferGeometry().setFromPoints(motion.history);
        const mat = new THREE.LineDashedMaterial({
          color: 0x38bdf8,
          dashSize: 0.4,
          gapSize: 0.2,
          transparent: true,
          opacity: 0.7
        });
        line = new THREE.Line(geo, mat);
        this.trajectoryGroup.add(line);
        this.trajectoryLines.set(sourceId, line);
      } else {
        line.geometry.setFromPoints(motion.history);
        line.computeLineDistances();
      }
    });
  }

  clearTrajectories() {
    this.trajectoryLines.forEach((line) => {
      this.trajectoryGroup.remove(line);
      if (line.geometry) line.geometry.dispose();
      if (line.material) line.material.dispose();
    });
    this.trajectoryLines.clear();
  }

  setGhostPosition(position, colorHex = 0x38bdf8) {
    if (!this.showGhosts) return;

    this.clearGhost();

    const ghostGeo = new THREE.SphereGeometry(0.5, 16, 16);
    const ghostMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      wireframe: true,
      transparent: true,
      opacity: 0.35
    });
    const ghost = new THREE.Mesh(ghostGeo, ghostMat);
    ghost.position.set(position.x, 0.6, position.z);
    this.ghostGroup.add(ghost);
  }

  clearGhost() {
    while (this.ghostGroup.children.length > 0) {
      const c = this.ghostGroup.children[0];
      this.ghostGroup.remove(c);
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    }
  }

  /**
   * Calculates Doppler-shifted observed frequency at receiver
   */
  static getDopplerShift(source, receiverPos, sourceVelocity = { x: 0, z: 0 }) {
    const waveSpeed = Math.max(0.5, source.speed || 3.0);
    const dx = receiverPos.x - source.position.x;
    const dz = receiverPos.z - source.position.z;
    const dist = Math.hypot(dx, dz);

    if (dist < 0.05) return source.frequency || 1.0;

    // Unit vector pointing from source to receiver
    const rx = dx / dist;
    const rz = dz / dist;

    // Relative velocity along line of sight (positive if source moving toward receiver)
    const vRadial = sourceVelocity.x * rx + sourceVelocity.z * rz;

    // Doppler formula: f_obs = f_src * [v / (v - v_radial)]
    // Clamp denominator to prevent division by zero near acoustic Mach 1
    const denom = Math.max(0.25, waveSpeed - vRadial);
    const shiftedFreq = (source.frequency || 1.0) * (waveSpeed / denom);
    return shiftedFreq;
  }
}
