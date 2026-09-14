/**
 * 3D Interactive Wave & Acoustics Laboratory
 * Visual Overlays, Distance Measurement Lines, Node/Antinode Markers
 */

import * as THREE from 'three';

export class VisualOverlays {
  constructor(scene) {
    this.scene = scene;

    this.overlayGroup = new THREE.Group();
    this.scene.add(this.overlayGroup);

    // Measurement lines
    this.measureLineA = this.createMeasurementLine(0x38bdf8);
    this.measureLineB = this.createMeasurementLine(0xf43f5e);
    this.overlayGroup.add(this.measureLineA);
    this.overlayGroup.add(this.measureLineB);

    // Standing wave node markers
    this.standingNodesGroup = new THREE.Group();
    this.overlayGroup.add(this.standingNodesGroup);

    // Refraction boundary mesh
    this.refractionBoundaryMesh = null;

    this.showMeasurements = true;
    this.showNodes = true;
  }

  createMeasurementLine(color) {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0)
    ]);
    const mat = new THREE.LineDashedMaterial({
      color: color,
      dashSize: 0.5,
      gapSize: 0.25,
      transparent: true,
      opacity: 0.75,
      depthTest: false
    });
    const line = new THREE.Line(geo, mat);
    line.computeLineDistances();
    line.visible = false;
    return line;
  }

  updateMeasurements(sources, receiver) {
    if (!this.showMeasurements || !receiver || sources.length === 0) {
      this.measureLineA.visible = false;
      this.measureLineB.visible = false;
      return;
    }

    const rPos = new THREE.Vector3(receiver.position.x, 0.4, receiver.position.z);

    if (sources[0] && sources[0].active) {
      const sPosA = new THREE.Vector3(sources[0].position.x, 0.4, sources[0].position.z);
      this.measureLineA.geometry.setFromPoints([sPosA, rPos]);
      this.measureLineA.computeLineDistances();
      this.measureLineA.visible = true;
    } else {
      this.measureLineA.visible = false;
    }

    if (sources[1] && sources[1].active) {
      const sPosB = new THREE.Vector3(sources[1].position.x, 0.4, sources[1].position.z);
      this.measureLineB.geometry.setFromPoints([sPosB, rPos]);
      this.measureLineB.computeLineDistances();
      this.measureLineB.visible = true;
    } else {
      this.measureLineB.visible = false;
    }
  }

  updateStandingNodes(standingData, wall1Pos, wall2Pos) {
    while (this.standingNodesGroup.children.length > 0) {
      const c = this.standingNodesGroup.children[0];
      this.standingNodesGroup.remove(c);
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    }

    if (!this.showNodes || !standingData || !standingData.nodes) return;

    const minX = Math.min(wall1Pos.x, wall2Pos.x);
    const z = wall1Pos.z || 0;

    // Node markers (blue pins where amplitude is always 0)
    standingData.nodes.forEach((nx) => {
      const posX = minX + nx;
      const pinGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 12);
      const pinMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const pin = new THREE.Mesh(pinGeo, pinMat);
      pin.position.set(posX, 0.6, z);
      this.standingNodesGroup.add(pin);
    });

    // Antinode markers (yellow diamond markers where amplitude oscillates to max)
    if (standingData.antinodes) {
      standingData.antinodes.forEach((ax) => {
        const posX = minX + ax;
        const antinodeGeo = new THREE.OctahedronGeometry(0.18);
        const antinodeMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
        const antinode = new THREE.Mesh(antinodeGeo, antinodeMat);
        antinode.position.set(posX, 0.9, z);
        this.standingNodesGroup.add(antinode);
      });
    }
  }

  setRefractionBoundary(visible, zPos = 0, speed1 = 4.0, speed2 = 2.0) {
    if (!visible) {
      if (this.refractionBoundaryMesh) {
        this.overlayGroup.remove(this.refractionBoundaryMesh);
        this.refractionBoundaryMesh = null;
      }
      return;
    }

    if (!this.refractionBoundaryMesh) {
      const group = new THREE.Group();
      
      // Interface dividing line
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-18, 0.1, zPos),
        new THREE.Vector3(18, 0.1, zPos)
      ]);
      const lineMat = new THREE.LineBasicMaterial({ color: 0x06b6d4, linewidth: 2 });
      const line = new THREE.Line(lineGeo, lineMat);
      group.add(line);

      // Medium 2 subtle tint (denser region)
      const planeGeo = new THREE.PlaneGeometry(36, 18);
      planeGeo.rotateX(-Math.PI / 2);
      const planeMat = new THREE.MeshBasicMaterial({
        color: 0x0284c7,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide
      });
      const plane = new THREE.Mesh(planeGeo, planeMat);
      plane.position.set(0, 0.04, zPos + 9);
      group.add(plane);

      this.refractionBoundaryMesh = group;
      this.overlayGroup.add(this.refractionBoundaryMesh);
    }
  }

  setMeasurementsVisible(visible) {
    this.showMeasurements = visible;
    if (!visible) {
      this.measureLineA.visible = false;
      this.measureLineB.visible = false;
    }
  }

  setNodesVisible(visible) {
    this.showNodes = visible;
    this.standingNodesGroup.visible = visible;
  }
}
