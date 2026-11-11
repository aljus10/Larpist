// -------------------------------------------------------------
// EARTHTONE STUDIO - GPU MORPHING HOLOGRAPHIC ATLAS
// Real-time GPU Vertex Morphing (3D Sphere <-> 2:1 Flat Map Plane)
// with 2-Texture Ping-Pong Buffer & Latitude Band Highlights
// -------------------------------------------------------------

import * as THREE from 'three';
import { store, bands } from '../core/JukeboxStore.js';

export class HoloMorphDisplay {
  constructor(options = {}) {
    this.radius = options.radius || 1.05;
    this.planeWidth = options.planeWidth || 2.8;
    this.planeHeight = options.planeHeight || 1.4;

    this.group = new THREE.Group();
    this.group.name = 'HoloMorphDisplay';

    // 23.5-degree axial tilt group for spherical realism
    this.tiltGroup = new THREE.Group();
    this.group.add(this.tiltGroup);

    // Texture ping-ponging (only 2 active WebGL textures in VRAM)
    this.textureLoader = new THREE.TextureLoader();
    this.textures = { a: null, b: null };
    this.activeSlot = 'a';
    this.loadedYear = null;
    this.isLoadingTexture = false;

    // Morph state
    this.targetMorph = 1.0; // 1.0 = sphere, 0.0 = flat
    this.currentMorph = 1.0;

    this._buildMorphMesh();
    this._buildHighlightBand();
    this._buildScanline();
    this._bindStoreEvents();

    // Initial texture load (1980)
    this.loadYearTexture(store.currentPoint.year);
  }

  _buildMorphMesh() {
    const cols = 64;
    const rows = 32;
    const geom = new THREE.PlaneGeometry(this.planeWidth, this.planeHeight, cols, rows);

    const pos = geom.attributes.position;
    const uvs = geom.attributes.uv;
    const count = pos.count;

    // Morph target array for sphere
    const spherePositions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const u = uvs.getX(i);
      const v = uvs.getY(i);

      // Spherical coordinates
      const lambda = (u - 0.5) * Math.PI * 2; // Longitude [-PI, PI]
      const phi = (v - 0.5) * Math.PI;       // Latitude [-PI/2, PI/2]

      spherePositions[i * 3]     = this.radius * Math.cos(phi) * Math.sin(lambda);
      spherePositions[i * 3 + 1] = this.radius * Math.sin(phi);
      spherePositions[i * 3 + 2] = this.radius * Math.cos(phi) * Math.cos(lambda);
    }

    geom.morphAttributes.position = [
      new THREE.BufferAttribute(spherePositions, 3)
    ];

    this.material = new THREE.MeshStandardMaterial({
      roughness: 0.35,
      metalness: 0.15,
      side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh(geom, this.material);
    this.mesh.morphTargetInfluences = [1.0];
    this.tiltGroup.add(this.mesh);

    // Atmospheric limb glow (visible in sphere mode)
    this.atmoShell = new THREE.Mesh(
      new THREE.SphereGeometry(this.radius * 1.04, 48, 32),
      new THREE.MeshBasicMaterial({
        color: '#4df3ff',
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide
      })
    );
    this.tiltGroup.add(this.atmoShell);
  }

  _buildHighlightBand() {
    // Dynamic highlight ribbon matching active latitude band
    const cols = 64;
    const rows = 8;
    const geom = new THREE.PlaneGeometry(this.planeWidth, 0.2, cols, rows);
    const spherePositions = new Float32Array(geom.attributes.position.count * 3);
    geom.morphAttributes.position = [
      new THREE.BufferAttribute(spherePositions, 3)
    ];

    this.bandMaterial = new THREE.MeshBasicMaterial({
      color: '#e4b846', // Signal mustard
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.bandMesh = new THREE.Mesh(geom, this.bandMaterial);
    this.bandMesh.morphTargetInfluences = [1.0];
    this.tiltGroup.add(this.bandMesh);

    this.updateHighlightBand(store.state.bandIndex);
  }

  updateHighlightBand(bandIndex) {
    const band = bands[bandIndex] || bands[0];
    const geom = this.bandMesh.geometry;
    const pos = geom.attributes.position;
    const uvs = geom.attributes.uv;
    const count = pos.count;
    const r = this.radius * 1.015; // Float slightly above terrain

    // Band span in UV space:
    // start Y and end Y in [0, 1] where top is v=1, bottom is v=0
    const vStart = 1.0 - band.start;
    const vEnd = 1.0 - band.end;
    const morphAttr = geom.morphAttributes.position[0];

    for (let i = 0; i < count; i++) {
      const u = uvs.getX(i);
      const rowT = uvs.getY(i); // 0 to 1 inside the ribbon
      const v = vEnd + rowT * (vStart - vEnd);

      // Flat map coordinates
      const xFlat = (u - 0.5) * this.planeWidth;
      const yFlat = (v - 0.5) * this.planeHeight;
      pos.setXYZ(i, xFlat, yFlat, 0.015);

      // Sphere coordinates
      const lambda = (u - 0.5) * Math.PI * 2;
      const phi = (v - 0.5) * Math.PI;
      morphAttr.setXYZ(
        i,
        r * Math.cos(phi) * Math.sin(lambda),
        r * Math.sin(phi),
        r * Math.cos(phi) * Math.cos(lambda)
      );
    }

    pos.needsUpdate = true;
    morphAttr.needsUpdate = true;
  }

  _buildScanline() {
    // Horizontal glowing scan rule for north-to-south sweep
    const geom = new THREE.PlaneGeometry(this.planeWidth, 0.04, 64, 2);
    const spherePositions = new Float32Array(geom.attributes.position.count * 3);
    geom.morphAttributes.position = [
      new THREE.BufferAttribute(spherePositions, 3)
    ];

    this.scanMaterial = new THREE.MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.scanMesh = new THREE.Mesh(geom, this.scanMaterial);
    this.scanMesh.morphTargetInfluences = [1.0];
    this.scanMesh.visible = false;
    this.tiltGroup.add(this.scanMesh);
  }

  updateScanline(progressY) {
    if (!this.scanMesh.visible) return;
    const geom = this.scanMesh.geometry;
    const pos = geom.attributes.position;
    const uvs = geom.attributes.uv;
    const count = pos.count;
    const r = this.radius * 1.025;
    const vCenter = 1.0 - THREE.MathUtils.clamp(progressY, 0, 1);
    const thickness = 0.03;
    const morphAttr = geom.morphAttributes.position[0];

    for (let i = 0; i < count; i++) {
      const u = uvs.getX(i);
      const rowT = uvs.getY(i) - 0.5;
      const v = vCenter + rowT * thickness;

      // Flat
      pos.setXYZ(i, (u - 0.5) * this.planeWidth, (v - 0.5) * this.planeHeight, 0.025);

      // Sphere
      const lambda = (u - 0.5) * Math.PI * 2;
      const phi = (v - 0.5) * Math.PI;
      morphAttr.setXYZ(
        i,
        r * Math.cos(phi) * Math.sin(lambda),
        r * Math.sin(phi),
        r * Math.cos(phi) * Math.cos(lambda)
      );
    }
    pos.needsUpdate = true;
    morphAttr.needsUpdate = true;
  }

  async loadYearTexture(year) {
    if (this.loadedYear === year || this.isLoadingTexture) return;
    this.isLoadingTexture = true;
    const token = store.state.stateToken;
    const path = `assets/eic/${year}.webp`;

    this.textureLoader.load(
      path,
      (texture) => {
        if (token !== store.state.stateToken && store.currentPoint.year !== year) {
          texture.dispose();
          this.isLoadingTexture = false;
          return;
        }
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;

        // Dispose previous texture in this slot
        if (this.textures[this.activeSlot]) {
          this.textures[this.activeSlot].dispose();
        }

        this.textures[this.activeSlot] = texture;
        this.material.map = texture;
        this.material.needsUpdate = true;
        this.loadedYear = year;
        this.isLoadingTexture = false;

        // Toggle ping-pong slot
        this.activeSlot = this.activeSlot === 'a' ? 'b' : 'a';
      },
      undefined,
      (err) => {
        console.warn(`Could not load NASA frame for ${year}:`, err);
        this.isLoadingTexture = false;
      }
    );
  }

  _bindStoreEvents() {
    store.addEventListener('yearChange', (e) => {
      this.loadYearTexture(e.detail.point.year);
    });

    store.addEventListener('bandChange', (e) => {
      this.updateHighlightBand(e.detail.bandIndex);
    });

    store.addEventListener('projectionChange', (e) => {
      this.targetMorph = e.detail.projection === 'flat' ? 0.0 : 1.0;
    });

    store.addEventListener('scanUpdate', (e) => {
      this.scanMesh.visible = e.detail.isScanning;
      if (e.detail.isScanning) {
        this.updateScanline(e.detail.scanProgressY);
      }
    });

    store.addEventListener('rotationChange', (e) => {
      this.mesh.rotation.y = e.detail.rotation;
      this.bandMesh.rotation.y = e.detail.rotation;
      this.scanMesh.rotation.y = e.detail.rotation;
    });
  }

  update(delta) {
    // Smooth GPU morph transition (sphere <-> flat)
    if (Math.abs(this.currentMorph - this.targetMorph) > 0.001) {
      this.currentMorph = THREE.MathUtils.damp(this.currentMorph, this.targetMorph, 7.5, delta);
      this.mesh.morphTargetInfluences[0] = this.currentMorph;
      this.bandMesh.morphTargetInfluences[0] = this.currentMorph;
      this.scanMesh.morphTargetInfluences[0] = this.currentMorph;

      // Atmospheric limb glow fades out when unrolling to flat map
      this.atmoShell.material.opacity = 0.25 * this.currentMorph;
      this.atmoShell.visible = this.currentMorph > 0.05;

      // Axial tilt eases to zero in flat mode
      this.tiltGroup.rotation.z = -23.5 * (Math.PI / 180) * this.currentMorph;
    }
  }
}
