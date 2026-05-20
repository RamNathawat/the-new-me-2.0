/* ═══════════════════════════════════════════════════
   THE NEW ME 2.0 — Main entry
   Three.js + GSAP + Lenis
   Pivot-centered model, pose keyframes, cursor
   tracking, scroll-driven hero choreography,
   zoom transition, interactive pillar map
   ═══════════════════════════════════════════════════ */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import './map.css';

gsap.registerPlugin(ScrollTrigger);

/* ─── Helpers ─────────────────────────────────── */
function lerp(a, b, t) { return a + (b - a) * t; }
function lerpPose(a, b, t) {
  return {
    x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t),
    rx: lerp(a.rx, b.rx, t), ry: lerp(a.ry, b.ry, t), rz: lerp(a.rz, b.rz, t),
    sc: lerp(a.sc, b.sc, t),
  };
}

/* ─── Particles ───────────────────────────────── */
function spawnParticles() {
  const box = document.getElementById('particles');
  if (!box) return;
  const n = innerWidth < 768 ? 12 : 24;
  const kinds = ['dot','ring','leaf'];
  for (let i = 0; i < n; i++) {
    const d = document.createElement('div');
    d.className = `particle particle--${kinds[~~(Math.random()*3)]}`;
    d.style.left = `${Math.random()*100}%`;
    d.style.animationDuration = `${22+Math.random()*28}s`;
    d.style.animationDelay = `${-Math.random()*30}s`;
    d.style.transform = `scale(${.35+Math.random()*.7})`;
    box.appendChild(d);
  }
}

/* ═══════════════════════════════════════════════════
   POSE KEYFRAMES
   ═══════════════════════════════════════════════════ */
const POSE = {
  hidden: {
    x: 0.1, y: -3, z: 0,
    rx: 1.35, ry: -0.25, rz: 0.18,
    sc: 2.2,
  },
  hero: {
    x: 0.1, y: 0, z: 0,
    rx: 1.42, ry: -0.18, rz: 0.12,
    sc: 2.2,
  },
  heroSettled: {
    x: 0, y: 0, z: 0,
    rx: 1.48, ry: -0.1, rz: 0.06,
    sc: 2.0,
  },
  left: {
    x: -0.85, y: 0.05, z: 0,
    rx: 1.50, ry: -0.06, rz: 0.05,
    sc: 1.5,
  },
  right: {
    x: 0.85, y: 0.05, z: 0,
    rx: 1.50, ry: -0.22, rz: -0.05,
    sc: 1.5,
  },
  // ZOOM: centered, face-on, filling the screen dramatically
  zoom: {
    x: 0, y: 0, z: 1.5,
    rx: 1.57, ry: 0, rz: 0,
    sc: 6.0,
  },
  // AUTHOR: book on left side for about-the-author section
  author: {
    x: -0.85, y: 0.05, z: 0,
    rx: 1.50, ry: -0.06, rz: 0.05,
    sc: 1.5,
  },
};

/* ─── 3-D Book ────────────────────────────────── */
class Book3D {
  constructor(cv) {
    this.cv = cv;
    this.pivot = null;
    this.mdl = null;
    this.clk = new THREE.Clock();
    this.ok = false;
    this._cb = null;

    // ── Scroll state ──
    this.reveal     = 0;
    this.settle     = 0;
    this.toSide     = 0;
    this.toZoom     = 0;   // 0→1: side → zoom center
    this.toAuthor   = 0;   // 0→1: zoom → author (left side)
    this.canvasOn   = false; // CSS class toggle
    this.canvasFade = 1;    // 1=full, 0=hidden (zoom out)
    this.activePose = 'left';

    // ── Mouse ──
    this.mouse = { x: 0, y: 0 };
    this.mouseSmooth = { x: 0, y: 0 };

    // ── Current rendered values ──
    this.cur = { ...POSE.hidden };

    this._build();
    this._initMouse();
  }

  _initMouse() {
    document.addEventListener('mousemove', (e) => {
      this.mouse.x = (e.clientX / innerWidth - 0.5) * 2;
      this.mouse.y = (e.clientY / innerHeight - 0.5) * 2;
    });
  }

  _build() {
    const W = innerWidth, H = innerHeight;
    this.r = new THREE.WebGLRenderer({ canvas: this.cv, antialias: true, alpha: true });
    this.r.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.r.setSize(W, H);
    this.r.outputColorSpace = THREE.SRGBColorSpace;
    this.r.toneMapping = THREE.ACESFilmicToneMapping;
    this.r.toneMappingExposure = 1.2;

    this.scene = new THREE.Scene();

    this.cam = new THREE.PerspectiveCamera(32, W / H, 0.1, 1000);
    this.cam.position.set(0, 0.3, 5);
    this.cam.lookAt(0, 0, 0);

    // ── Studio lighting ──
    this.scene.add(new THREE.AmbientLight(0xF5E6D3, 0.6));

    const key = new THREE.DirectionalLight(0xFFF8F0, 1.5);
    key.position.set(5, 10, 8);
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0xD4E8DF, 0.45);
    fill.position.set(-6, 4, -3);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight(0xFFE4CC, 0.3);
    rim.position.set(-2, -3, -8);
    this.scene.add(rim);

    const top = new THREE.DirectionalLight(0xFFFFFF, 0.2);
    top.position.set(0, 12, 2);
    this.scene.add(top);

    // ── Load model ──
    new GLTFLoader().load('/book/scene.gltf',
      (gltf) => {
        this.mdl = gltf.scene;

        this.mdl.traverse((child) => {
          if (!child.isMesh) return;
          child.frustumCulled = false;
          if (child.material.name === 'Architexture') {
            child.material = new THREE.MeshStandardMaterial({
              color: new THREE.Color('#7A9E8E'),
              roughness: 0.3, metalness: 0.03,
              side: THREE.DoubleSide,
            });
          } else if (child.material.name === 'Bookpage') {
            child.material = new THREE.MeshStandardMaterial({
              color: new THREE.Color('#F5EFE0'),
              roughness: 0.85, metalness: 0,
              side: THREE.DoubleSide,
            });
          }
        });

        // CENTER the model on a pivot group
        const box = new THREE.Box3().setFromObject(this.mdl);
        const center = new THREE.Vector3();
        box.getCenter(center);
        this.mdl.position.sub(center);

        this.pivot = new THREE.Group();
        this.pivot.add(this.mdl);
        this.pivot.scale.setScalar(POSE.hidden.sc);
        this.pivot.position.set(POSE.hidden.x, POSE.hidden.y, POSE.hidden.z);
        this.scene.add(this.pivot);

        this.ok = true;
        if (this._cb) this._cb();
      },
      (p) => {
        const f = document.querySelector('.loader__fill');
        if (f && p.total) f.style.width = `${Math.min(p.loaded / p.total * 100, 92)}%`;
      },
      (err) => { console.warn('GLTF error', err); this.ok = true; if (this._cb) this._cb(); }
    );

    addEventListener('resize', () => this._rs());
  }

  onReady(fn) { this._cb = fn; if (this.ok) fn(); }

  tick() {
    if (!this.pivot) { this.r.render(this.scene, this.cam); return; }

    const t = this.clk.getElapsedTime();

    // ── Smooth mouse ──
    this.mouseSmooth.x = lerp(this.mouseSmooth.x, this.mouse.x, 0.035);
    this.mouseSmooth.y = lerp(this.mouseSmooth.y, this.mouse.y, 0.035);

    // ── Compute target pose via keyframe blending ──
    const re = this.reveal;
    const se = this.settle;
    const ts = this.toSide;
    const tz = this.toZoom;
    const ta = this.toAuthor;

    let target;

    // Step 1: hidden → hero
    const heroBase = lerpPose(POSE.hidden, POSE.hero, re);

    // Step 2: hero → heroSettled
    const settled = lerpPose(heroBase, POSE.heroSettled, se);

    // Step 3: heroSettled → side
    const sidePose = POSE[this.activePose];
    const atSide = lerpPose(settled, sidePose, ts);

    // Step 4: side → zoom
    const atZoom = lerpPose(atSide, POSE.zoom, tz);

    // Step 5: zoom → author (reverse zoom, book goes to left side)
    target = lerpPose(atZoom, POSE.author, ta);

    // ── Breathing / ambient float ──
    // Reduce float when zooming, restore when back to author
    const zoomAmount = tz * (1 - ta);  // only suppress float while actually zoomed
    const floatMul = 1 - zoomAmount * 0.85;
    const floatY   = Math.sin(t * 0.6) * 0.03 * floatMul;
    const floatX   = Math.sin(t * 0.38 + 0.7) * 0.008 * floatMul;
    const breathRY = Math.sin(t * 0.22) * 0.008 * floatMul;
    const breathRX = Math.sin(t * 0.32 + 1.2) * 0.005 * floatMul;
    const breathRZ = Math.sin(t * 0.18 + 2) * 0.003 * floatMul;

    target.x  += floatX;
    target.y  += floatY;
    target.ry += breathRY;
    target.rx += breathRX;
    target.rz += breathRZ;

    // ── Cursor influence ──
    const mx = this.mouseSmooth.x;
    const my = this.mouseSmooth.y;
    const cStr = Math.max(0.1, 1 - ts * 0.7 - zoomAmount * 0.9);
    target.ry += mx * 0.08 * cStr;
    target.rx += my * 0.04 * cStr;
    target.x  += mx * 0.04 * cStr;
    target.y  += my * -0.02 * cStr;

    // ── LERP (floaty lag) ──
    const spd = 0.09;
    this.cur.x  = lerp(this.cur.x,  target.x,  spd);
    this.cur.y  = lerp(this.cur.y,  target.y,  spd);
    this.cur.z  = lerp(this.cur.z,  target.z,  spd);
    this.cur.rx = lerp(this.cur.rx, target.rx, spd);
    this.cur.ry = lerp(this.cur.ry, target.ry, spd);
    this.cur.rz = lerp(this.cur.rz, target.rz, spd);
    this.cur.sc = lerp(this.cur.sc, target.sc, spd);

    // ── Apply to pivot ──
    this.pivot.position.set(this.cur.x, this.cur.y, this.cur.z);
    this.pivot.rotation.set(this.cur.rx, this.cur.ry, this.cur.rz);
    this.pivot.scale.setScalar(this.cur.sc);

    // Canvas opacity
    this.cv.style.opacity = (this.canvasOn ? 1 : 0) * this.canvasFade;

    this.r.render(this.scene, this.cam);
  }

  _rs() {
    this.cam.aspect = innerWidth / innerHeight;
    this.cam.updateProjectionMatrix();
    this.r.setSize(innerWidth, innerHeight);
  }
}

/* ═══════════════════════════════════════════════════
   CHAPTER MAP — Data & Draggable Interaction
   ═══════════════════════════════════════════════════ */

const CHAPTERS = [
  {
    ch: 'CH. ONE',
    title: 'NUTRITION',
    subtitle: 'Plant-based fuel for lasting recovery',
    body: `<p>Gagan's transformation began in the kitchen. Not with a fad diet, but with a fundamental rethinking of what food is for.</p>
<p>He moved toward <strong>whole, plant-based nutrition</strong> — not because it was trendy, but because the evidence was undeniable. His cholesterol dropped. His sugar markers normalized. His energy returned.</p>
<p>The New Me doesn't prescribe a single meal plan. It shares the principles that turned food from a source of disease into a source of recovery.</p>
<p><strong>What you eat is either building you or breaking you.</strong> There is no neutral ground.</p>`,
  },
  {
    ch: 'CH. TWO',
    title: 'FITNESS',
    subtitle: 'Movement as daily medicine',
    body: `<p>Movement is not optional — it is medicine. But the fitness industry has made it feel like punishment.</p>
<p>Gagan's approach is different. He didn't train to look good. He trained to <strong>stay alive</strong>. To reverse what years of sedentary corporate life had done to his body.</p>
<p>The book covers strength, consistency, and the kind of movement that doesn't require a gym membership — just discipline and a decision to show up every single day.</p>
<p><strong>Fitness isn't a goal. It's a practice.</strong> And the compound interest it pays is measured in decades, not weeks.</p>`,
  },
  {
    ch: 'CH. THREE',
    title: 'SLEEP',
    subtitle: 'The overlooked recovery pillar',
    body: `<p>The most overlooked pillar of health is the one we spend a third of our lives doing — or more accurately, doing badly.</p>
<p>Gagan discovered that <strong>sleep quality</strong> was as important as diet and exercise combined. Poor sleep was silently sabotaging his recovery, his hormones, and his mental clarity.</p>
<p>The New Me dedicates serious attention to sleep hygiene, circadian rhythm, and the practices that transform rest from a passive activity into an active investment in longevity.</p>
<p><strong>You cannot out-train, out-eat, or out-work bad sleep.</strong> Fix this first, and everything else becomes easier.</p>`,
  },
  {
    ch: 'CH. FOUR',
    title: 'MINDSET',
    subtitle: 'Discipline, purpose & resilience',
    body: `<p>The body follows the mind. Every lasting transformation Gagan made started with a <strong>decision</strong>, not a discovery.</p>
<p>Discipline, consistency, and the ability to resist short-term comfort for long-term freedom — these are not personality traits. They are skills. And they can be built.</p>
<p>The New Me explores how to rewire your relationship with discomfort, build systems that outlast motivation, and find purpose in the daily repetition that most people quit too early to benefit from.</p>
<p><strong>The mind is not the enemy. An untrained mind is.</strong> This pillar is what holds the other three together.</p>`,
  },
];

let currentCh = -1;
let cardOpen = false;

function initChapterMap() {
  const canvas  = document.getElementById('map-canvas');
  const card    = document.getElementById('map-card');
  const chEl    = document.getElementById('card-ch');
  const titleEl = document.getElementById('card-title');
  const subEl   = document.getElementById('card-subtitle');
  const bodyEl  = document.getElementById('card-body');
  const closeBtn  = document.getElementById('map-card-close');
  const prevBtn   = document.getElementById('card-prev');
  const nextBtn   = document.getElementById('card-next');
  const chapters  = document.querySelectorAll('.map__ch');
  const badge     = document.getElementById('map-badge');

  // ── Drag state ──
  let isDragging = false;
  let startX = 0, startY = 0;
  let currentX = 0, currentY = 0;
  let dragStartX = 0, dragStartY = 0;
  let dragDist = 0;

  const vp = document.getElementById('map-viewport');

  function clampPosition() {
    // Limit drag bounds so user can't drag too far
    const canvasW = canvas.offsetWidth;
    const canvasH = canvas.offsetHeight;
    const vpW = vp.offsetWidth;
    const vpH = vp.offsetHeight;

    // canvas starts at left: -75vw, so the base offset accounts for that
    const minX = -(canvasW - vpW) * 0.6;
    const maxX = (canvasW - vpW) * 0.4;
    const minY = -(canvasH - vpH) * 0.4;
    const maxY = (canvasH - vpH) * 0.5;

    currentX = Math.max(minX, Math.min(maxX, currentX));
    currentY = Math.max(minY, Math.min(maxY, currentY));
  }

  function applyTransform() {
    canvas.style.transform = `translate(${currentX}px, ${currentY}px)`;
  }

  // Mouse drag
  vp.addEventListener('mousedown', (e) => {
    if (e.target.closest('.map__card')) return;
    isDragging = true;
    dragDist = 0;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    startX = e.clientX - currentX;
    startY = e.clientY - currentY;
    vp.style.cursor = 'grabbing';
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    currentX = e.clientX - startX;
    currentY = e.clientY - startY;
    dragDist = Math.abs(e.clientX - dragStartX) + Math.abs(e.clientY - dragStartY);
    clampPosition();
    applyTransform();
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
    vp.style.cursor = 'grab';
  });

  // Touch drag
  vp.addEventListener('touchstart', (e) => {
    if (e.target.closest('.map__card')) return;
    isDragging = true;
    dragDist = 0;
    const t = e.touches[0];
    dragStartX = t.clientX;
    dragStartY = t.clientY;
    startX = t.clientX - currentX;
    startY = t.clientY - currentY;
  }, { passive: true });

  vp.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const t = e.touches[0];
    currentX = t.clientX - startX;
    currentY = t.clientY - startY;
    dragDist = Math.abs(t.clientX - dragStartX) + Math.abs(t.clientY - dragStartY);
    clampPosition();
    applyTransform();
  }, { passive: true });

  vp.addEventListener('touchend', () => { isDragging = false; });

  // ── Card logic ──
  function openChapter(idx) {
    idx = ((idx % CHAPTERS.length) + CHAPTERS.length) % CHAPTERS.length;
    currentCh = idx;
    const c = CHAPTERS[idx];

    chEl.textContent = c.ch;
    titleEl.textContent = c.title;
    subEl.textContent = c.subtitle;
    bodyEl.innerHTML = c.body;

    chapters.forEach((ch, i) => {
      ch.classList.toggle('map__ch--active', i === idx);
    });

    if (!cardOpen) {
      card.classList.add('open');
      cardOpen = true;
    }
  }

  function closeChapter() {
    card.classList.remove('open');
    cardOpen = false;
    chapters.forEach(ch => ch.classList.remove('map__ch--active'));
    currentCh = -1;
  }

  // Chapter clicks — only open if user didn't drag more than 5px
  chapters.forEach((ch, i) => {
    ch.addEventListener('click', (e) => {
      e.stopPropagation();
      if (dragDist < 5) openChapter(i);
    });
  });

  // Close / Nav
  closeBtn.addEventListener('click', closeChapter);
  prevBtn.addEventListener('click', () => {
    if (currentCh >= 0) openChapter(currentCh - 1);
  });
  nextBtn.addEventListener('click', () => {
    if (currentCh >= 0) openChapter(currentCh + 1);
  });

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && cardOpen) closeChapter();
  });
}

/* ─── Scroll Choreography ─────────────────────── */
function choreograph(book) {
  const g = gsap;

  // ━━━━ ATMOSPHERE ENTRANCE ━━━━
  g.delayedCall(0.5, () => {
    g.to('#atmo-kicker', { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out' });
  });
  g.delayedCall(0.8, () => {
    document.getElementById('scroll-cue')?.classList.add('on');
    document.querySelectorAll('.wr').forEach((w, i) => {
      g.to(w, { opacity: 1, y: 0, duration: 1, delay: i * 0.12, ease: 'power3.out' });
    });
  });
  g.delayedCall(1.6, () => {
    g.to('#atmo-sub', { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out' });
  });

  g.to('.atmo__center', {
    opacity: 0, y: -100,
    scrollTrigger: { trigger: '#s-atmo', start: 'top top', end: '60% top', scrub: 1.5 }
  });
  g.to('#scroll-cue', {
    opacity: 0,
    scrollTrigger: { trigger: '#s-atmo', start: '5% top', end: '18% top', scrub: 1 }
  });
  g.to('.atmo__orbs', {
    opacity: 0,
    scrollTrigger: { trigger: '#s-atmo', start: '20% top', end: '70% top', scrub: 1.5 }
  });
  g.to('.atmo__ring', {
    opacity: 0,
    scrollTrigger: { trigger: '#s-atmo', start: '15% top', end: '50% top', scrub: 1 }
  });

  // ━━━━ HEADER ━━━━
  ScrollTrigger.create({
    trigger: '#s-reveal', start: 'top 85%',
    onEnter: () => document.getElementById('site-header').classList.add('on'),
    onLeaveBack: () => document.getElementById('site-header').classList.remove('on')
  });

  // ━━━━ CANVAS FADE IN ━━━━
  ScrollTrigger.create({
    trigger: '#s-reveal', start: 'top 98%',
    onEnter: () => { book.canvasOn = true; },
    onLeaveBack: () => { book.canvasOn = false; }
  });

  // ━━━━ PHASE 1 — Book Rise (hidden → hero) ━━━━
  // reveal stays at 1 once the trigger is passed, only reverses if scrolling back to top
  ScrollTrigger.create({
    trigger: '#s-reveal', start: 'top bottom', end: '30% center',
    scrub: 1.5,
    onUpdate: (s) => { book.reveal = s.progress; },
    onLeave: () => { book.reveal = 1; },
  });

  // ━━━━ PHASE 2 — Book Settle (hero → heroSettled) ━━━━
  ScrollTrigger.create({
    trigger: '#s-reveal', start: '25% center', end: '60% center',
    scrub: 1.5,
    onUpdate: (s) => { book.settle = s.progress; },
    onLeave: () => { book.settle = 1; },
  });

  // ━━━━ BACKGROUND TEXT ━━━━
  g.fromTo('.bg-char',
    { opacity: 0, y: 100, scale: 0.88 },
    {
      opacity: 0.1, y: 0, scale: 1,
      stagger: 0.05,
      scrollTrigger: {
        trigger: '#s-reveal', start: 'top 70%', end: '25% center',
        scrub: 1.8
      }
    }
  );
  g.to('.bg-char', {
    opacity: 0, y: -50,
    scrollTrigger: { trigger: '#s-story-1', start: 'top 100%', end: 'top 45%', scrub: 1.5 }
  });

  // ━━━━ SIGNATURE ━━━━
  ScrollTrigger.create({
    trigger: '#s-reveal', start: '30% center',
    onEnter: () => document.getElementById('signature').classList.add('on'),
    onLeaveBack: () => document.getElementById('signature').classList.remove('on')
  });
  g.to('#signature', {
    opacity: 0,
    scrollTrigger: { trigger: '#s-story-1', start: 'top 95%', end: 'top 45%', scrub: 1 }
  });

  // ━━━━ BG: Sage → Cream ━━━━
  g.to('body', {
    backgroundColor: '#F5F2EA',
    scrollTrigger: { trigger: '#s-story-1', start: 'top 90%', end: 'top 30%', scrub: 2 }
  });

  // ━━━━ PHASE 3 — Book to Side (heroSettled → side) ━━━━
  book.activePose = 'left';
  ScrollTrigger.create({
    trigger: '#s-story-1', start: 'top 75%', end: 'top 15%',
    scrub: 1.8,
    onUpdate: (s) => { book.toSide = s.progress; }
  });

  // ━━━━ SIDE SWITCHES ━━━━
  ScrollTrigger.create({
    trigger: '#s-story-2', start: 'top 70%',
    onEnter: () => { book.activePose = 'right'; },
    onLeaveBack: () => { book.activePose = 'left'; }
  });
  ScrollTrigger.create({
    trigger: '#s-story-3', start: 'top 70%',
    onEnter: () => { book.activePose = 'left'; },
    onLeaveBack: () => { book.activePose = 'right'; }
  });

  // ━━━━ BG: Cream ↔ Warm between stories ━━━━
  g.to('body', {
    backgroundColor: '#EDE8DE',
    scrollTrigger: { trigger: '#s-story-2', start: 'top 80%', end: 'top 25%', scrub: 1.5 }
  });
  g.to('body', {
    backgroundColor: '#F5F2EA',
    scrollTrigger: { trigger: '#s-story-3', start: 'top 80%', end: 'top 25%', scrub: 1.5 }
  });

  // ━━━━ TEXT REVEALS ━━━━
  document.querySelectorAll('.s--story .tr').forEach((el) => {
    g.to(el, {
      opacity: 1, y: 0, duration: 1.2, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 92%', toggleActions: 'play none none reverse' }
    });
  });

  // ━━━━ PARTICLES ━━━━
  g.to('#particles', {
    opacity: 0.06,
    scrollTrigger: { trigger: '#s-story-1', start: 'top center', end: 'top top', scrub: 1 }
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //   PHASE 4 — FULL ZOOM INTO BOOK
  //   Book centers and scales up dramatically.
  //   Only AFTER full zoom does the map appear.
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // 4a: Book zooms to center (side → zoom pose)
  ScrollTrigger.create({
    trigger: '#s-zoom', start: 'top 80%', end: '50% center',
    scrub: 1.8,
    onUpdate: (s) => { book.toZoom = s.progress; }
  });

  // 4b: Canvas fades out ONLY in last part (book fully zoomed first)
  ScrollTrigger.create({
    trigger: '#s-zoom', start: '55% center', end: '90% center',
    scrub: 2,
    onUpdate: (s) => { book.canvasFade = 1 - s.progress; }
  });

  // 4c: BG turns white for map
  g.to('body', {
    backgroundColor: '#FAFAF7',
    scrollTrigger: { trigger: '#s-zoom', start: '60% center', end: '95% center', scrub: 2 }
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //   MAP SECTION ENTRANCE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // Chapter labels stagger in
  const chs = document.querySelectorAll('.map__ch');
  chs.forEach((ch, i) => {
    g.fromTo(ch,
      { opacity: 0, y: 40, scale: 0.9 },
      {
        opacity: 1, y: 0, scale: 1,
        duration: 0.8,
        delay: i * 0.12,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '#s-map', start: 'top 70%',
          toggleActions: 'play none none reverse',
        }
      }
    );
  });

  // Auto-hide drag badge after 3s
  ScrollTrigger.create({
    trigger: '#s-map', start: 'top 50%',
    onEnter: () => {
      const badge = document.getElementById('map-badge');
      if (badge) {
        badge.classList.add('visible');
        setTimeout(() => badge.classList.remove('visible'), 3500);
      }
    },
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //   ZOOM OUT FROM MAP → BOOK REAPPEARS
  //   Guard: zoom-out triggers only activate AFTER
  //   the zoom-in has completed (prevents overriding
  //   canvasFade at page load).
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  let zoomInComplete = false;

  // Detect when zoom-in finishes (canvasFade has gone to 0)
  ScrollTrigger.create({
    trigger: '#s-zoom', start: '90% center',
    onEnter: () => { zoomInComplete = true; },
    onLeaveBack: () => { zoomInComplete = false; }
  });

  // 5a: Canvas fades back in (only after zoom-in is done)
  ScrollTrigger.create({
    trigger: '#s-zoom-out', start: 'top top', end: '25% top',
    onUpdate: (s) => {
      if (zoomInComplete) book.canvasFade = s.progress;
    }
  });

  // 5b: Book un-zooms from fullscreen to left-side author pose
  ScrollTrigger.create({
    trigger: '#s-zoom-out', start: '10% top', end: '60% top',
    onUpdate: (s) => {
      if (zoomInComplete) book.toAuthor = s.progress;
    }
  });

  // 5c: BG transitions to cream for author section
  g.to('body', {
    backgroundColor: '#F5F2EA',
    scrollTrigger: { trigger: '#s-zoom-out', start: '20% top', end: '55% top', scrub: 2 }
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //   ABOUT THE AUTHOR — book stays on left
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // Ensure book pose is 'left' for author section
  ScrollTrigger.create({
    trigger: '#s-author', start: 'top 80%',
    onEnter: () => { book.activePose = 'left'; },
    onLeaveBack: () => { book.activePose = 'left'; }
  });

  // Author text reveals (all .tr inside author section)
  document.querySelectorAll('.s--author .tr').forEach((el) => {
    g.to(el, {
      opacity: 1, y: 0, duration: 1.2, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 92%', toggleActions: 'play none none reverse' }
    });
  });

  g.delayedCall(0.5, () => ScrollTrigger.refresh());
}

/* ─── Boot ────────────────────────────────────── */
function boot() {
  spawnParticles();
  initChapterMap();

  const lenis = new Lenis({
    duration: 1.4,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true
  });
  lenis.on('scroll', ScrollTrigger.update);

  // Smooth scroll nav links
  document.querySelectorAll('.nav-pill[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      if (target) lenis.scrollTo(target, { duration: 2 });
    });
  });

  const book = new Book3D(document.getElementById('book-canvas'));

  (function raf(t) { lenis.raf(t); book.tick(); requestAnimationFrame(raf); })(0);

  let go = false;
  const launch = () => {
    if (go) return; go = true;
    const f = document.querySelector('.loader__fill');
    if (f) f.style.width = '100%';
    setTimeout(() => {
      document.getElementById('loader')?.classList.add('hide');
      choreograph(book);
    }, 650);
  };

  book.onReady(launch);
  setTimeout(launch, 5000);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

