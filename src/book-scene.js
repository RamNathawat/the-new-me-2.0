/* ═══════════════════════════════════════════════════
   Three.js Book Scene
   Loads and animates the rigged 3D book model
   ═══════════════════════════════════════════════════ */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class BookScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.scrollProgress = 0;       // 0→1 overall scroll progress
    this.bookRevealProgress = 0;   // 0→1 for book entrance
    this.pageSpreadProgress = 0;   // 0→1 for pages fanning open
    this.authorProgress = 0;       // 0→1 for author section position
    this.model = null;
    this.pages = [];
    this.clock = new THREE.Clock();
    this.isLoaded = false;
    this.onLoadCallback = null;

    this._init();
  }

  _init() {
    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      25,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 5, 50);
    this.camera.lookAt(0, 5, 0);

    // Lighting — warm, natural, studio-like
    const ambientLight = new THREE.AmbientLight(0xF5E6D3, 0.6);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xFFF8F0, 1.4);
    mainLight.position.set(10, 20, 15);
    mainLight.castShadow = false;
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xD4E8DF, 0.5);
    fillLight.position.set(-10, 5, -5);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xFFE4CC, 0.3);
    rimLight.position.set(0, -5, -15);
    this.scene.add(rimLight);

    // Load model
    this._loadModel();

    // Handle resize
    window.addEventListener('resize', () => this._onResize());
  }

  _loadModel() {
    const loader = new GLTFLoader();

    loader.load(
      '/book.gltf',
      (gltf) => {
        this.model = gltf.scene;

        // Create page materials — warm cream with subtle variations
        const pageMaterials = [];
        for (let i = 0; i < 20; i++) {
          const hue = 35 + Math.random() * 10;
          const sat = 15 + Math.random() * 10;
          const light = 88 + Math.random() * 8;
          const color = new THREE.Color().setHSL(hue / 360, sat / 100, light / 100);

          const mat = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.85,
            metalness: 0.0,
            side: THREE.DoubleSide,
          });
          pageMaterials.push(mat);
        }

        // Cover material — darker, richer
        const coverMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color('#7A9E8E'),
          roughness: 0.4,
          metalness: 0.05,
          side: THREE.DoubleSide,
        });

        // Apply materials and collect page references
        let pageIndex = 0;
        this.model.traverse((child) => {
          if (child.isMesh) {
            if (child.name.includes('page_1') && !child.name.includes('page_1_') && !child.name.includes('page_10')) {
              // First and last pages get cover material
              child.material = coverMat;
            } else if (child.name.includes('page_20')) {
              child.material = coverMat;
            } else {
              child.material = pageMaterials[pageIndex % pageMaterials.length];
            }
            this.pages.push(child);
            pageIndex++;
          }
        });

        // Scale and position
        this.model.scale.set(0.6, 0.6, 0.6);
        this.model.position.set(0, -30, 0); // Start below viewport
        this.model.rotation.set(0, 0, 0);

        this.scene.add(this.model);
        this.isLoaded = true;

        if (this.onLoadCallback) this.onLoadCallback();
      },
      (progress) => {
        const pct = progress.total > 0 ? (progress.loaded / progress.total) * 100 : 0;
        // Update loader bar
        const fill = document.querySelector('.loader__fill');
        if (fill) fill.style.width = `${Math.min(pct, 95)}%`;
      },
      (error) => {
        console.warn('GLTF load error:', error);
        // Still resolve — show experience without 3D
        this.isLoaded = true;
        if (this.onLoadCallback) this.onLoadCallback();
      }
    );
  }

  onLoad(callback) {
    this.onLoadCallback = callback;
    if (this.isLoaded) callback();
  }

  setBookReveal(progress) {
    this.bookRevealProgress = Math.max(0, Math.min(1, progress));
  }

  setPageSpread(progress) {
    this.pageSpreadProgress = Math.max(0, Math.min(1, progress));
  }

  setAuthorPosition(progress) {
    this.authorProgress = Math.max(0, Math.min(1, progress));
  }

  update() {
    if (!this.model) return;

    const time = this.clock.getElapsedTime();

    // ── Book entrance: rise from below ──
    const revealEased = this._easeOutCubic(this.bookRevealProgress);
    const startY = -30;
    const midY = 3;
    const yPos = startY + (midY - startY) * revealEased;
    this.model.position.y = yPos;

    // ── Rotation: gentle tilt that settles ──
    const baseRotY = -0.4 + revealEased * 0.6; // -0.4 → 0.2 (slight angle)
    const baseRotX = 0.15 - revealEased * 0.1;
    const baseRotZ = 0.05 * (1 - revealEased);

    // Idle breathing
    const breatheY = Math.sin(time * 0.5) * 0.02;
    const breatheX = Math.sin(time * 0.7 + 1) * 0.01;

    this.model.rotation.y = baseRotY + breatheY;
    this.model.rotation.x = baseRotX + breatheX;
    this.model.rotation.z = baseRotZ;

    // ── Author section: slide book left ──
    if (this.authorProgress > 0) {
      const authorEased = this._easeOutCubic(this.authorProgress);
      const isMobile = window.innerWidth < 768;

      if (isMobile) {
        // On mobile, book fades away
        this.model.position.y = yPos - authorEased * 15;
        this.canvas.style.opacity = 1 - authorEased;
      } else {
        // On desktop, book slides to left column
        const targetX = -12;
        const targetScale = 0.45;
        this.model.position.x = authorEased * targetX;
        const s = 0.6 + (targetScale - 0.6) * authorEased;
        this.model.scale.set(s, s, s);
        // Flatten rotation to face-on
        this.model.rotation.y = baseRotY + breatheY + authorEased * 0.3;
      }
    } else {
      this.model.position.x = 0;
      this.model.scale.set(0.6, 0.6, 0.6);
    }

    // ── Page spread animation ──
    this._animatePages(this.pageSpreadProgress, time);

    // Render
    this.renderer.render(this.scene, this.camera);
  }

  _animatePages(spreadProgress, time) {
    if (this.pages.length === 0) return;

    const totalPages = this.pages.length;
    const spreadAngle = Math.PI * 0.65; // Max spread angle

    this.pages.forEach((page, i) => {
      // Stagger: earlier pages open first
      const normalizedIndex = i / (totalPages - 1);
      const staggeredProgress = Math.max(0, Math.min(1,
        (spreadProgress - normalizedIndex * 0.3) / 0.7
      ));

      const eased = this._easeOutCubic(staggeredProgress);

      // Pages rotate around their spine edge (X axis in the model)
      const angle = eased * spreadAngle * (0.5 + normalizedIndex * 0.5);

      // Alternate pages fan in opposite directions slightly
      const sign = i < totalPages / 2 ? 1 : -1;
      const offset = (i - totalPages / 2) * 0.15 * eased;

      // Apply rotation to create fan effect
      page.rotation.x = angle * sign * 0.3;
      page.position.y = offset;

      // Subtle per-page breathing
      const breathe = Math.sin(time * 0.8 + i * 0.5) * 0.005 * eased;
      page.rotation.x += breathe;
    });
  }

  _easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  _onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  dispose() {
    window.removeEventListener('resize', this._onResize);
    this.renderer.dispose();
    this.scene.traverse((child) => {
      if (child.isMesh) {
        child.geometry.dispose();
        if (child.material.dispose) child.material.dispose();
      }
    });
  }
}
