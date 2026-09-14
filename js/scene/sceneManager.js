/**
 * 3D Interactive Wave & Acoustics Laboratory
 * Three.js Scene & Camera Manager
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class SceneManager {
  constructor(container) {
    this.container = container;
    
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c0f1d); // Deep cosmic dark lab background
    this.scene.fog = new THREE.FogExp2(0x0c0f1d, 0.015);

    // Camera setup
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    this.camera.position.set(0, 22, 28);

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // Orbit Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.1; // Allow slight under-angle
    this.controls.minDistance = 5;
    this.controls.maxDistance = 120;
    this.controls.target.set(0, 0, 0);

    // Lighting
    this.setupLighting();

    // Environment grids & axes
    this.setupEnvironment();

    // Raycaster for object interaction
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // X-Z horizontal plane

    // Resize listener
    window.addEventListener('resize', () => this.onWindowResize());
  }

  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x70a5ff, 0.8);
    dirLight1.position.set(15, 30, 20);
    dirLight1.castShadow = true;
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xff70a5, 0.4);
    dirLight2.position.set(-20, 20, -15);
    this.scene.add(dirLight2);
  }

  setupEnvironment() {
    // 3D Grid
    this.grid = new THREE.GridHelper(50, 50, 0x3b82f6, 0x1e293b);
    this.grid.position.y = -0.02;
    this.scene.add(this.grid);

    // XYZ Coordinate Axes
    this.axes = new THREE.AxesHelper(8);
    this.axes.position.set(-20, 0.01, -20);
    this.scene.add(this.axes);

    // Lab floor glow ring / subtle backdrop
    const floorGeo = new THREE.PlaneGeometry(80, 80);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x090d18,
      roughness: 0.9,
      metalness: 0.1,
      depthWrite: false
    });
    this.floor = new THREE.Mesh(floorGeo, floorMat);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = -0.05;
    this.floor.receiveShadow = true;
    this.scene.add(this.floor);
  }

  setGridVisible(visible) {
    if (this.grid) this.grid.visible = visible;
  }

  setAxesVisible(visible) {
    if (this.axes) this.axes.visible = visible;
  }

  resetCamera() {
    this.camera.position.set(0, 22, 28);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  setTopView() {
    this.camera.position.set(0, 42, 0.001);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  setSideView() {
    this.camera.position.set(40, 2, 0);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  onWindowResize() {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  render() {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
