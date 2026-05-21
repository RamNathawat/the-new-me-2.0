
const chaptersData = [
  {
    title: "The Seed of Discipline",
    subtitle: "Building the foundation of intentionality.",
    body: "<p>Before any lasting change can occur, there must be a mechanism for consistency. This chapter explores the neurology of habit formation and the psychological resistance we face when establishing new routines.</p><p>We dismantle the myth of motivation, replacing it with the mechanics of discipline: small, compounding actions that rewire the brain's reward pathways over time.</p>"
  },
  {
    title: "Kinetic Potential",
    subtitle: "Harnessing movement to alter cognition.",
    body: "<p>Movement is not just a physical requirement; it is a cognitive catalyst. This chapter examines how varying states of physical exertion influence our mental clarity, emotional resilience, and creative output.</p><p>You will learn to treat physical training not as a chore, but as a lever to manipulate your mental state.</p>"
  },
  {
    title: "The Art of Rest",
    subtitle: "Strategic recovery as a performance multiplier.",
    body: "<p>In a culture obsessed with optimization, rest is often viewed as a weakness. Here, we reframe recovery as the essential counterweight to effort.</p><p>We dive into the architecture of sleep, the importance of parasympathetic activation, and how to structure downtime to maximize physical adaptation and cognitive consolidation.</p>"
  },
  {
    title: "Cognitive Alignment",
    subtitle: "Calibrating your inner narrative.",
    body: "<p>The final frontier is the mind itself. Even with perfect discipline and optimal recovery, a misaligned internal narrative will sabotage progress.</p><p>This section provides tools for identifying cognitive distortions, cultivating a growth-oriented mindset, and aligning your daily actions with your overarching sense of purpose.</p>"
  }
];
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
  const kinds = ['dot', 'ring', 'leaf'];
  for (let i = 0; i < n; i++) {
    const d = document.createElement('div');
    d.className = `particle particle--${kinds[~~(Math.random() * 3)]}`;
    d.style.left = `${Math.random() * 100}%`;
    d.style.animationDuration = `${22 + Math.random() * 28}s`;
    d.style.animationDelay = `${-Math.random() * 30}s`;
    d.style.transform = `scale(${.35 + Math.random() * .7})`;
    box.appendChild(d);
  }
}

/* ═══════════════════════════════════════════════════
   POSE KEYFRAMES
   ═══════════════════════════════════════════════════ */
const POSE = {
  hero: {
    x: 0, y: 0, z: 0,
    rx: -0.08, ry: -0.25, rz: 0.05,
    sc: 1.1,
  },
  side: {
    x: -0.85, y: 0.05, z: 0,
    rx: -0.04, ry: -0.15, rz: 0.03,
    sc: 0.75,
  },
  sideRight: {
    x: 0.85, y: 0.05, z: 0,
    rx: -0.04, ry: 0.15, rz: -0.03,
    sc: 0.75,
  },
  fill: {
    x: 0, y: 0, z: 1.8,
    rx: 0, ry: 0, rz: 0,
    sc: 3.2,
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

    this.toSide = 0;
    this.toFill = 0;
    this.toAuthor = 0;
    this.toSideRight = 0;
    this.canvasFade = 1;

    this.mouse = { x: 0, y: 0 };
    this.mouseSmooth = { x: 0, y: 0 };
    this.cur = { ...POSE.hero };

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

    this.scene.add(new THREE.AmbientLight(0xF5E6D3, 0.6));
    const key = new THREE.DirectionalLight(0xFFF8F0, 1.5);
    key.position.set(5, 10, 8); this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xD4E8DF, 0.45);
    fill.position.set(-6, 4, -3); this.scene.add(fill);
    const rim = new THREE.DirectionalLight(0xFFE4CC, 0.3);
    rim.position.set(-2, -3, -8); this.scene.add(rim);
    const top = new THREE.DirectionalLight(0xFFFFFF, 0.2);
    top.position.set(0, 12, 2); this.scene.add(top);

    new GLTFLoader().load('/book.glb',
      (gltf) => {
        this.mdl = gltf.scene;
        this.mdl.traverse((child) => {
          if (child.isMesh) child.frustumCulled = false;
        });

        const box = new THREE.Box3().setFromObject(this.mdl);
        const center = new THREE.Vector3();
        box.getCenter(center);
        this.mdl.position.sub(center);

        this.pivot = new THREE.Group();
        this.pivot.add(this.mdl);
        this.pivot.scale.setScalar(POSE.hero.sc);
        this.pivot.position.set(POSE.hero.x, POSE.hero.y, POSE.hero.z);
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

    this.mouseSmooth.x = lerp(this.mouseSmooth.x, this.mouse.x, 0.07);
    this.mouseSmooth.y = lerp(this.mouseSmooth.y, this.mouse.y, 0.07);

    // Pose interpolation: hero → side → sideRight → fill → side(author)
    const atSide = lerpPose(POSE.hero, POSE.side, this.toSide);
    const atSideRight = lerpPose(atSide, POSE.sideRight, this.toSideRight);
    const atFill = lerpPose(atSideRight, POSE.fill, this.toFill);
    let target = lerpPose(atFill, POSE.side, this.toAuthor);

    // Breathing
    const fillAmt = this.toFill * (1 - this.toAuthor);
    const fm = 1 - fillAmt * 0.7;
    target.x += Math.sin(t * 0.38 + 0.7) * 0.004 * fm;
    target.y += Math.sin(t * 0.6) * 0.015 * fm;
    target.ry += Math.sin(t * 0.22) * 0.005 * fm;
    target.rx += Math.sin(t * 0.32 + 1.2) * 0.003 * fm;
    target.rz += Math.sin(t * 0.18 + 2) * 0.002 * fm;

    // Cursor
    const mx = this.mouseSmooth.x, my = this.mouseSmooth.y;
    const hs = Math.max(0.1, 1 - this.toSide * 0.6 - fillAmt * 0.8);
    target.ry += mx * 0.16 * hs;
    target.rx += my * 0.08 * hs;
    target.x += mx * 0.08 * hs;
    target.y += my * -0.04 * hs;

    // LERP
    const spd = 0.08;
    this.cur.x = lerp(this.cur.x, target.x, spd);
    this.cur.y = lerp(this.cur.y, target.y, spd);
    this.cur.z = lerp(this.cur.z, target.z, spd);
    this.cur.rx = lerp(this.cur.rx, target.rx, spd);
    this.cur.ry = lerp(this.cur.ry, target.ry, spd);
    this.cur.rz = lerp(this.cur.rz, target.rz, spd);
    this.cur.sc = lerp(this.cur.sc, target.sc, spd);

    this.pivot.position.set(this.cur.x, this.cur.y, this.cur.z);
    this.pivot.rotation.set(this.cur.rx, this.cur.ry, this.cur.rz);
    this.pivot.scale.setScalar(this.cur.sc);

    this.cv.style.opacity = this.canvasFade;

    // Canvas must be on top during zoom and author re-entry, 
    // BUT must not block clicks when invisible
    if (this.canvasFade < 0.01) {
      this.cv.style.zIndex = '0';
      this.cv.style.pointerEvents = 'none';
    } else {
      this.cv.style.pointerEvents = 'auto';
      if (this.toFill > 0.3 || this.toAuthor > 0.1) {
        this.cv.style.zIndex = '30';
      } else {
        this.cv.style.zIndex = '10';
      }
    }

    this.r.render(this.scene, this.cam);
  }

  _rs() {
    this.cam.aspect = innerWidth / innerHeight;
    this.cam.updateProjectionMatrix();
    this.r.setSize(innerWidth, innerHeight);
  }
}

/* ═══════════════════════════════════════════════════
   CHAPTER DATA
   ═══════════════════════════════════════════════════ */
const CHAPTERS = [
  {
    ch: 'CH. ONE', title: 'NUTRITION', subtitle: 'Plant-based fuel for lasting recovery',
    body: `<p>Gagan's transformation began in the kitchen. Not with a fad diet, but with a fundamental rethinking of what food is for.</p>
<p>He moved toward <strong>whole, plant-based nutrition</strong> — not because it was trendy, but because the evidence was undeniable. His cholesterol dropped. His sugar markers normalized. His energy returned.</p>
<p>The New Me doesn't prescribe a single meal plan. It shares the principles that turned food from a source of disease into a source of recovery.</p>
<p><strong>What you eat is either building you or breaking you.</strong> There is no neutral ground.</p>`,
  },
  {
    ch: 'CH. TWO', title: 'FITNESS', subtitle: 'Movement as daily medicine',
    body: `<p>Movement is not optional — it is medicine. But the fitness industry has made it feel like punishment.</p>
<p>Gagan's approach is different. He didn't train to look good. He trained to <strong>stay alive</strong>. To reverse what years of sedentary corporate life had done to his body.</p>
<p>The book covers strength, consistency, and the kind of movement that doesn't require a gym membership — just discipline and a decision to show up every single day.</p>
<p><strong>Fitness isn't a goal. It's a practice.</strong> And the compound interest it pays is measured in decades, not weeks.</p>`,
  },
  {
    ch: 'CH. THREE', title: 'SLEEP', subtitle: 'The overlooked recovery pillar',
    body: `<p>The most overlooked pillar of health is the one we spend a third of our lives doing — or more accurately, doing badly.</p>
<p>Gagan discovered that <strong>sleep quality</strong> was as important as diet and exercise combined. Poor sleep was silently sabotaging his recovery, his hormones, and his mental clarity.</p>
<p>The New Me dedicates serious attention to sleep hygiene, circadian rhythm, and the practices that transform rest from a passive activity into an active investment in longevity.</p>
<p><strong>You cannot out-train, out-eat, or out-work bad sleep.</strong> Fix this first, and everything else becomes easier.</p>`,
  },
  {
    ch: 'CH. FOUR', title: 'MINDSET', subtitle: 'Discipline, purpose & resilience',
    body: `<p>The body follows the mind. Every lasting transformation Gagan made started with a <strong>decision</strong>, not a discovery.</p>
<p>Discipline, consistency, and the ability to resist short-term comfort for long-term freedom — these are not personality traits. They are skills. And they can be built.</p>
<p>The New Me explores how to rewire your relationship with discomfort, build systems that outlast motivation, and find purpose in the daily repetition that most people quit too early to benefit from.</p>
<p><strong>The mind is not the enemy. An untrained mind is.</strong> This pillar is what holds the other three together.</p>`,
  },
];

let currentCh = -1;
let sheetOpen = false;


/* ═══════════════════════════════════════════════════
   CHAPTER SCENE CONTROLLER
   Scroll-driven cinematic progression
   ═══════════════════════════════════════════════════ */

function initChapterMap() {
  const chapters = document.querySelectorAll('.map__ch');
  const card = document.getElementById('map-card');
  const closeBtn = document.getElementById('map-card-close');
  const closeFloat = document.getElementById('map-close-float');
  const prevBtn = document.getElementById('card-prev');
  const nextBtn = document.getElementById('card-next');
  
  const mcCh = document.getElementById('card-ch');
  const mcTitle = document.getElementById('card-title');
  const mcSub = document.getElementById('card-subtitle');
  const mcBody = document.getElementById('card-body');
  
  let currentCh = -1;
  let cardOpen = false;

  function openChapter(idx) {
    if (idx < 0 || idx >= chaptersData.length) return;
    currentCh = idx;
    cardOpen = true;

    const data = chaptersData[idx];
    mcCh.textContent = `CHAPTER 0${idx + 1}`;
    mcTitle.innerHTML = data.title;
    mcSub.textContent = data.subtitle;
    mcBody.innerHTML = data.body;

    card.classList.add('open');
    closeFloat.style.display = 'flex';
  }

  function closeChapter() {
    cardOpen = false;
    card.classList.remove('open');
    closeFloat.style.display = 'none';
  }

  chapters.forEach((chBtn) => {
    chBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(chBtn.getAttribute('data-ch'), 10);
      openChapter(idx);
    });
  });

  closeBtn.addEventListener('click', closeChapter);
  closeFloat.addEventListener('click', closeChapter);
  
  prevBtn.addEventListener('click', () => {
    if (currentCh > 0) openChapter(currentCh - 1);
  });
  nextBtn.addEventListener('click', () => {
    if (currentCh < chaptersData.length - 1) openChapter(currentCh + 1);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && cardOpen) closeChapter();
  });
}



/* ═══════════════════════════════════════════════════
   SCROLL CHOREOGRAPHY
   ═══════════════════════════════════════════════════ */
function choreograph(book) {
  const g = gsap;

  // ━━━━ HERO ━━━━
  g.delayedCall(0.3, () => document.getElementById('scroll-cue')?.classList.add('on'));

  g.to('#scroll-cue', {
    opacity: 0,
    scrollTrigger: { trigger: '#s-hero', start: '3% top', end: '12% top', scrub: 1 }
  });
  g.to('.atmo__orbs', {
    opacity: 0,
    scrollTrigger: { trigger: '#s-hero', start: '15% top', end: '50% top', scrub: 1.5 }
  });
  g.to('.atmo__ring', {
    opacity: 0,
    scrollTrigger: { trigger: '#s-hero', start: '10% top', end: '35% top', scrub: 1 }
  });
  g.to('.bg-char', {
    opacity: 0,
    scrollTrigger: { trigger: '#s-hero', start: '20% top', end: '45% top', scrub: 1.5 }
  });

  // Header
  ScrollTrigger.create({
    trigger: '#s-story-1', start: 'top 90%',
    onEnter: () => document.getElementById('site-header').classList.add('on'),
    onLeaveBack: () => document.getElementById('site-header').classList.remove('on')
  });

  // BG: Sage → Cream
  
  // ━━━━ CANVAS SCROLLS AWAY WITH FOOTER ━━━━
  ScrollTrigger.create({
    trigger: '.site-footer', 
    start: 'top bottom', 
    end: 'bottom top', 
    scrub: true,
    animation: gsap.fromTo('#book-canvas', 
      { y: 0 }, 
      { y: () => -document.querySelector('.site-footer').offsetHeight - window.innerHeight, ease: 'none' }
    )
  });

  g.to('body', {
    backgroundColor: '#F5F2EA',
    scrollTrigger: { trigger: '#s-hero', start: '60% top', end: '85% top', scrub: 2 }
  });

  // Book: Hero → Side
  ScrollTrigger.create({
    trigger: '#s-story-1', start: 'top 85%', end: 'top 25%',
    scrub: 1.8,
    onUpdate: (s) => { book.toSide = s.progress; }
  });

  // Book: Side (Left) → SideRight (Right)
  ScrollTrigger.create({
    trigger: '#s-story-2', start: 'top 85%', end: 'top 25%',
    scrub: 1.8,
    onUpdate: (s) => { book.toSideRight = s.progress; }
  });


  // ━━━━ STORY PANELS ━━━━
  g.fromTo('#s1-panel-a', { opacity: 0, y: 30 }, {
    opacity: 1, y: 0,
    scrollTrigger: { trigger: '#s-story-1', start: 'top 65%', end: '20% 40%', scrub: 2 }
  });
  g.fromTo('#s1-panel-b', { opacity: 0, y: 24 }, {
    opacity: 1, y: 0,
    scrollTrigger: { trigger: '#s-story-1', start: '25% 55%', end: '45% 40%', scrub: 2 }
  });
  g.to('#story-1-text', {
    opacity: 0, y: -20,
    scrollTrigger: { trigger: '#s-story-1', start: '70% 35%', end: '85% 15%', scrub: 2 }
  });

  g.fromTo('#s2-panel-a', { opacity: 0, y: 30 }, {
    opacity: 1, y: 0,
    scrollTrigger: { trigger: '#s-story-2', start: 'top 65%', end: '20% 40%', scrub: 2 }
  });
  g.fromTo('#s2-panel-b', { opacity: 0, y: 24 }, {
    opacity: 1, y: 0,
    scrollTrigger: { trigger: '#s-story-2', start: '25% 55%', end: '45% 40%', scrub: 2 }
  });
  g.to('#story-2-text', {
    opacity: 0, y: -20,
    scrollTrigger: { trigger: '#s-story-2', start: '70% 35%', end: '85% 15%', scrub: 2 }
  });

  // Particles fade
  g.to('#particles', {
    opacity: 0.04,
    scrollTrigger: { trigger: '#s-story-1', start: 'top center', end: 'top top', scrub: 1 }
  });

  // ━━━━ BOOK ZOOM — completes BEFORE chapters section reaches top ━━━━
  ScrollTrigger.create({
    trigger: '#s-map', start: 'top 100%', end: 'top 30%',
    scrub: 2,
    onUpdate: (s) => { book.toFill = s.progress; }
  });

  // Map fades in only AFTER zoom is near completion
  g.fromTo('#map-viewport', 
    { opacity: 0 },
    { opacity: 1, scrollTrigger: { trigger: '#s-map', start: 'top 35%', end: 'top 5%', scrub: 1.5 } }
  );

  // Book fades AFTER zoom completes, before intro appears
  ScrollTrigger.create({
    trigger: '#s-map', start: 'top 20%', end: 'top top',
    scrub: 1.5,
    onUpdate: (s) => { book.canvasFade = 1 - s.progress; }
  });

  // BG to warm for chapters
  
  // ━━━━ CANVAS SCROLLS AWAY WITH FOOTER ━━━━
  ScrollTrigger.create({
    trigger: '.site-footer', 
    start: 'top bottom', 
    end: 'bottom top', 
    scrub: true,
    animation: gsap.fromTo('#book-canvas', 
      { y: 0 }, 
      { y: () => -document.querySelector('.site-footer').offsetHeight - window.innerHeight, ease: 'none' }
    )
  });

  g.to('body', {
    backgroundColor: '#EDE8DE',
    scrollTrigger: { trigger: '#s-map', start: 'top 50%', end: 'top top', scrub: 2 }
  });


  // ━━━━ CHAPTER SCENES (handled by initChapterScenes) ━━━━
  initChapterMap();

  // ━━━━ CANVAS RETURNS for Author ━━━━
  ScrollTrigger.create({
    trigger: '#s-author', start: 'top 95%', end: 'top 40%',
    scrub: 2,
    onUpdate: (s) => {
      book.canvasFade = s.progress;
      book.toAuthor = s.progress;
    }
  });

  
  // ━━━━ CANVAS SCROLLS AWAY WITH FOOTER ━━━━
  ScrollTrigger.create({
    trigger: '.site-footer', 
    start: 'top bottom', 
    end: 'bottom top', 
    scrub: true,
    animation: gsap.fromTo('#book-canvas', 
      { y: 0 }, 
      { y: () => -document.querySelector('.site-footer').offsetHeight - window.innerHeight, ease: 'none' }
    )
  });

  g.to('body', {
    backgroundColor: '#F5F2EA',
    scrollTrigger: { trigger: '#s-author', start: 'top 85%', end: 'top 35%', scrub: 2 }
  });

  // Author reveals
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

  const lenis = new Lenis({
    duration: 1.4,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true
  });
  lenis.on('scroll', ScrollTrigger.update);

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

    document.querySelectorAll('.loader .wr').forEach((w, i) => {
      gsap.to(w, { opacity: 1, y: 0, duration: 0.9, delay: 0.3 + i * 0.08, ease: 'power3.out' });
    });

    setTimeout(() => {
      document.getElementById('loader-byline')?.classList.add('on');
    }, 1200);

    setTimeout(() => {
      document.getElementById('loader')?.classList.add('hide');
      choreograph(book);
    }, 2800);
  };

  book.onReady(launch);
  setTimeout(launch, 6000);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
