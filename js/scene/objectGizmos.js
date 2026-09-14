/**
 * 3D Interactive Wave & Acoustics Laboratory
 * 3D Interactive Gizmos (Sources, Receiver, Walls, Slits, Drag Controller & Coordinate Badges)
 */

import * as THREE from 'three';

export class ObjectGizmos {
  constructor(scene, camera, domElement, controls, onObjectChange) {
    this.scene = scene;
    this.camera = camera;
    this.domElement = domElement;
    this.controls = controls;
    this.onObjectChange = onObjectChange;

    this.gizmoGroup = new THREE.Group();
    this.scene.add(this.gizmoGroup);

    this.draggableObjects = [];
    this.selectedObject = null;
    this.isDragging = false;
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.intersectionPoint = new THREE.Vector3();

    this.setupInteractionListeners();
  }

  setupInteractionListeners() {
    this.domElement.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    this.domElement.addEventListener('pointermove', (e) => this.onPointerMove(e));
    window.addEventListener('pointerup', () => this.onPointerUp());
    window.addEventListener('pointercancel', () => this.onPointerUp());
  }

  getPointerPos(e) {
    const rect = this.domElement.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
      y: -((e.clientY - rect.top) / rect.height) * 2 + 1
    };
  }

  onPointerDown(e) {
    if (e.pointerType !== 'touch' && e.button !== undefined && e.button !== 0) return; // Allow touch or left mouse click

    const p = this.getPointerPos(e);
    this.mouse.set(p.x, p.y);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObjects(this.draggableObjects, true);
    if (intersects.length > 0) {
      let target = intersects[0].object;
      while (target.parent && target.parent !== this.gizmoGroup) {
        target = target.parent;
      }
      this.selectedObject = target;
      
      const isLocked = target.userData && target.userData.dataRef && target.userData.dataRef.locked;
      if (!isLocked) {
        this.isDragging = true;
        // Disable orbit controls while dragging an object
        if (this.controls) {
          this.controls.enabled = false;
        }
      }

      if (this.onObjectChange) {
        this.onObjectChange('select', this.selectedObject.userData);
      }
    }
  }

  onPointerMove(e) {
    if (!this.isDragging || !this.selectedObject) return;

    const p = this.getPointerPos(e);
    this.mouse.set(p.x, p.y);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    if (this.raycaster.ray.intersectPlane(this.dragPlane, this.intersectionPoint)) {
      const clampedX = Math.max(-17, Math.min(17, this.intersectionPoint.x));
      const clampedZ = Math.max(-17, Math.min(17, this.intersectionPoint.z));

      this.selectedObject.position.x = clampedX;
      this.selectedObject.position.z = clampedZ;

      // Update backing data model
      if (this.selectedObject.userData && this.selectedObject.userData.dataRef) {
        const ref = this.selectedObject.userData.dataRef;
        ref.position.x = clampedX;
        ref.position.z = clampedZ;

        // Update floating coordinate label sprite
        this.updateGizmoLabel(this.selectedObject);
      }

      if (this.onObjectChange) {
        this.onObjectChange('move', this.selectedObject.userData);
      }
    }
  }

  onPointerUp() {
    if (this.isDragging) {
      this.isDragging = false;
      if (this.controls) {
        this.controls.enabled = true;
      }
    }
  }

  clearGizmos() {
    while (this.gizmoGroup.children.length > 0) {
      const obj = this.gizmoGroup.children[0];
      this.gizmoGroup.remove(obj);
      this.disposeObject(obj);
    }
    this.draggableObjects = [];
  }

  disposeObject(obj) {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) {
        obj.material.forEach(m => m.dispose());
      } else {
        obj.material.dispose();
      }
    }
    if (obj.children) {
      obj.children.forEach(c => this.disposeObject(c));
    }
  }

  /**
   * Generates a 2D/3D billboard canvas texture for coordinate labels
   */
  createBillboardSprite(text, bgColor = 'rgba(15, 23, 42, 0.85)', textColor = '#38bdf8') {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    // Rounded rectangle background
    ctx.fillStyle = bgColor;
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 3;
    const r = 12;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(canvas.width - r, 0);
    ctx.quadraticCurveTo(canvas.width, 0, canvas.width, r);
    ctx.lineTo(canvas.width, canvas.height - r);
    ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - r, canvas.height);
    ctx.lineTo(r, canvas.height);
    ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(3.6, 0.9, 1.0);
    sprite.userData = { canvas, ctx, bgColor, textColor };
    return sprite;
  }

  updateGizmoLabel(gizmo) {
    const sprite = gizmo.getObjectByName('labelSprite');
    if (!sprite || !sprite.userData.canvas) return;

    const ref = gizmo.userData.dataRef;
    const name = ref.name || gizmo.userData.type.toUpperCase();
    const text = `${name} (${ref.position.x.toFixed(1)}, ${ref.position.z.toFixed(1)})`;

    const { canvas, ctx, bgColor, textColor } = sprite.userData;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = bgColor;
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 3;
    const r = 12;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(canvas.width - r, 0);
    ctx.quadraticCurveTo(canvas.width, 0, canvas.width, r);
    ctx.lineTo(canvas.width, canvas.height - r);
    ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - r, canvas.height);
    ctx.lineTo(r, canvas.height);
    ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    sprite.material.map.needsUpdate = true;
  }

  /**
   * Builds 3D visual mesh for a Point Source
   */
  createSourceGizmo(source) {
    const group = new THREE.Group();
    group.position.set(source.position.x, 0.6, source.position.z);
    group.userData = { type: 'source', id: source.id, dataRef: source };

    const colorHex = source.color || 0x38bdf8;

    // Center pulsating sphere
    const sphereGeo = new THREE.SphereGeometry(0.55, 32, 32);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      emissive: colorHex,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.5
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    sphere.castShadow = true;
    group.add(sphere);

    // Glowing outer ring
    const auraGeo = new THREE.TorusGeometry(0.75, 0.04, 16, 48);
    auraGeo.rotateX(Math.PI / 2);
    const auraMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.8
    });
    const aura = new THREE.Mesh(auraGeo, auraMat);
    group.add(aura);

    // Vertical stem
    const stemGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.6, 12);
    const stemMat = new THREE.MeshBasicMaterial({ color: 0x64748b });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = -0.3;
    group.add(stem);

    // Base contact disc
    const discGeo = new THREE.RingGeometry(0.05, 0.35, 24);
    discGeo.rotateX(-Math.PI / 2);
    const discMat = new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.position.y = -0.58;
    group.add(disc);

    // Billboard coordinate label
    const hexStr = '#' + (source.color ? source.color.toString(16).padStart(6, '0') : '38bdf8');
    const labelText = `${source.name || 'Source'} (${source.position.x.toFixed(1)}, ${source.position.z.toFixed(1)})`;
    const labelSprite = this.createBillboardSprite(labelText, 'rgba(15, 23, 42, 0.85)', hexStr);
    labelSprite.name = 'labelSprite';
    labelSprite.position.y = 1.3;
    group.add(labelSprite);

    this.gizmoGroup.add(group);
    this.draggableObjects.push(group);
    return group;
  }

  /**
   * Builds 3D visual mesh for the Receiver Sensor
   */
  createReceiverGizmo(receiver) {
    const group = new THREE.Group();
    group.position.set(receiver.position.x, 0.7, receiver.position.z);
    group.userData = { type: 'receiver', id: receiver.id, dataRef: receiver };

    const colorHex = 0x10b981;

    // Probe cylinder & sensor head
    const headGeo = new THREE.CylinderGeometry(0.35, 0.45, 0.6, 24);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0x059669,
      emissive: colorHex,
      emissiveIntensity: 0.4,
      metalness: 0.8,
      roughness: 0.2
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.castShadow = true;
    group.add(head);

    // Sensor probe pin
    const pinGeo = new THREE.ConeGeometry(0.12, 0.4, 16);
    pinGeo.rotateX(Math.PI);
    const pinMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
    const pin = new THREE.Mesh(pinGeo, pinMat);
    pin.position.y = -0.45;
    group.add(pin);

    // Antenna
    const needleGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.7, 8);
    const needleMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });
    const needle = new THREE.Mesh(needleGeo, needleMat);
    needle.position.y = 0.55;
    group.add(needle);

    // Glowing tip
    const tipGeo = new THREE.SphereGeometry(0.08, 12, 12);
    const tipMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.position.y = 0.9;
    group.add(tip);

    // Range ring
    const ringGeo = new THREE.RingGeometry(0.4, 0.48, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = -0.68;
    group.add(ring);

    // Billboard coordinate label
    const labelText = `Receiver (${receiver.position.x.toFixed(1)}, ${receiver.position.z.toFixed(1)})`;
    const labelSprite = this.createBillboardSprite(labelText, 'rgba(15, 23, 42, 0.85)', '#10b981');
    labelSprite.name = 'labelSprite';
    labelSprite.position.y = 1.4;
    group.add(labelSprite);

    this.gizmoGroup.add(group);
    this.draggableObjects.push(group);
    return group;
  }

  /**
   * Builds 3D visual mesh for a Reflective Wall
   */
  createWallGizmo(wall) {
    const group = new THREE.Group();
    group.position.set(wall.position.x, 1.2, wall.position.z);
    group.rotation.y = wall.rotationY || 0;
    group.userData = { type: 'wall', id: wall.id, dataRef: wall };

    const width = wall.width || 12;
    const height = wall.height || 2.4;
    const depth = 0.4;

    const wallGeo = new THREE.BoxGeometry(width, height, depth);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.3,
      metalness: 0.6
    });
    const wallMesh = new THREE.Mesh(wallGeo, wallMat);
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    group.add(wallMesh);

    // Reflective surface highlight strip
    const stripGeo = new THREE.PlaneGeometry(width * 0.98, height * 0.9);
    const stripMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.75
    });
    const strip1 = new THREE.Mesh(stripGeo, stripMat);
    strip1.position.z = depth / 2 + 0.01;
    group.add(strip1);

    const strip2 = new THREE.Mesh(stripGeo, stripMat);
    strip2.position.z = -depth / 2 - 0.01;
    strip2.rotation.y = Math.PI;
    group.add(strip2);

    this.gizmoGroup.add(group);
    this.draggableObjects.push(group);
    return group;
  }

  /**
   * Builds 3D visual mesh for Slit Barriers
   */
  createSlitGizmo(slit) {
    const group = new THREE.Group();
    group.position.set(slit.position.x, 1.2, slit.position.z);
    group.userData = { type: 'slit', id: slit.id, dataRef: slit };

    const totalWidth = 20;
    const height = 2.4;
    const depth = 0.3;
    const slitWidth = slit.width || 1.2;

    const mat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.4,
      roughness: 0.5
    });

    if (slit.type === 'single') {
      const sideWidth = (totalWidth - slitWidth) / 2;

      const leftGeo = new THREE.BoxGeometry(sideWidth, height, depth);
      const leftMesh = new THREE.Mesh(leftGeo, mat);
      leftMesh.position.x = -slitWidth / 2 - sideWidth / 2;
      group.add(leftMesh);

      const rightGeo = new THREE.BoxGeometry(sideWidth, height, depth);
      const rightMesh = new THREE.Mesh(rightGeo, mat);
      rightMesh.position.x = slitWidth / 2 + sideWidth / 2;
      group.add(rightMesh);
    } else if (slit.type === 'double') {
      const sep = slit.separation || 2.5;
      const centerWidth = Math.max(0.2, sep - slitWidth);
      const sideWidth = Math.max(0.5, (totalWidth - sep - slitWidth) / 2);

      const centerGeo = new THREE.BoxGeometry(centerWidth, height, depth);
      const centerMesh = new THREE.Mesh(centerGeo, mat);
      group.add(centerMesh);

      const leftGeo = new THREE.BoxGeometry(sideWidth, height, depth);
      const leftMesh = new THREE.Mesh(leftGeo, mat);
      leftMesh.position.x = -(sep / 2 + slitWidth / 2 + sideWidth / 2);
      group.add(leftMesh);

      const rightGeo = new THREE.BoxGeometry(sideWidth, height, depth);
      const rightMesh = new THREE.Mesh(rightGeo, mat);
      rightMesh.position.x = sep / 2 + slitWidth / 2 + sideWidth / 2;
      group.add(rightMesh);
    }

    this.gizmoGroup.add(group);
    this.draggableObjects.push(group);
    return group;
  }
}
