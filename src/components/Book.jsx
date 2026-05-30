import { useGLTF } from '@react-three/drei'
import { useRef, useLayoutEffect, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { CustomEase } from 'gsap/CustomEase'
import * as THREE from 'three'
import { useStore } from '../store'

gsap.registerPlugin(ScrollTrigger, CustomEase)
CustomEase.create("snappy", "M0,0 C0.094,0.026 0.124,0.127 0.157,0.29 0.197,0.486 0.254,0.8 0.348 1 0.456,1 1,1 1,1")

const POSE = {
  hero: { x: 0, y: 0, z: 0, rx: -0.08, ry: -0.25, rz: 0.05, sc: 1.1 },
  side: { x: -1.0, y: 0.05, z: 0, rx: -0.04, ry: -0.15, rz: 0.03, sc: 0.75 },
  sideRight: { x: 0.85, y: 0.05, z: 0, rx: -0.04, ry: 0.15, rz: -0.03, sc: 0.75 },
  fill: { x: -15, y: 36.6, z: -2.0, rx: 0, ry: 0, rz: 0, sc: 55.0 }, // Scaled up but targeting the exact same beige corner as original
};

function lerp(a, b, t) { return a + (b - a) * t; }
function lerpPose(a, b, t) {
  return {
    x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t),
    rx: lerp(a.rx, b.rx, t), ry: lerp(a.ry, b.ry, t), rz: lerp(a.rz, b.rz, t),
    sc: lerp(a.sc, b.sc, t),
  };
}

export default function Book() {
  const { scene } = useGLTF('/book-updated.glb', 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/')
  const group = useRef()
  const setIsMapVisible = useStore(state => state.setIsMapVisible);
  const isLoaded = useStore(state => state.isLoaded);
  const wasVisibleRef = useRef(false);
  
  // State refs for animation
  const scrollState = useRef({
    toSide: 0,
    toSideRight: 0,
    toFill: 0,
    toMapFade: 0,
    toAuthor: 0,
  });
  
  const cur = useRef({ ...POSE.hero });
  const vel = useRef({ x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, sc: 0 });
  const mouse = useRef({ x: 0, y: 0 });
  const mouseSmooth = useRef({ x: 0, y: 0 });
  const introAnim = useRef({ y: -1.0, rx: 0.15, ry: 0.15 });
  const introProgress = useRef(0);

  // Scroll velocity tracking
  const scrollVel = useRef(0);
  const lastScrollY = useRef(0);
  const smoothScrollVel = useRef(0);

  // Lemniscate (figure-8) orbit phase
  const orbitPhase = useRef(0);
  // How strongly the orbit is active (1 = full drift, 0 = scroll overriding)
  const orbitStrength = useRef(1);
  const lastScrollTime = useRef(0);

  useEffect(() => {
    const handleMove = (e) => {
      mouse.current.x = (e.clientX / innerWidth) * 2 - 1;
      mouse.current.y = -(e.clientY / innerHeight) * 2 + 1;
    };

    const handleScroll = () => {
      const currentY = window.scrollY || window.pageYOffset;
      scrollVel.current = currentY - lastScrollY.current;
      lastScrollY.current = currentY;
      lastScrollTime.current = performance.now();
      // Suppress orbit while scrolling
      orbitStrength.current = 0;
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useLayoutEffect(() => {
    // Only center the geometry ONCE to prevent it from shifting up during hot-reloads or state changes
    if (scene.userData.centered) return;

    // Temporarily reset group transform so we get a clean, un-animated bounding box
    const oldPos = group.current.position.clone();
    const oldScale = group.current.scale.clone();
    
    group.current.position.set(0, 0, 0);
    group.current.scale.set(1, 1, 1);
    group.current.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    
    // Book base needs to sit properly
    scene.position.sub(center);
    scene.userData.centered = true;

    // Restore transforms
    group.current.position.copy(oldPos);
    group.current.scale.copy(oldScale);
    group.current.updateMatrixWorld(true);
  }, [scene])



  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // Book: Hero → Side
      ScrollTrigger.create({
        trigger: '#s-story-1', start: 'top 85%', end: 'top 25%',
        scrub: true,
        onUpdate: (s) => { scrollState.current.toSide = s.progress; }
      });

      // Book: Side (Left) → SideRight (Right)
      ScrollTrigger.create({
        trigger: '#s-story-2', start: 'top 85%', end: 'top 25%',
        scrub: true,
        onUpdate: (s) => { scrollState.current.toSideRight = s.progress; }
      });

      // Book Zoom: completes BEFORE map section reaches top
      ScrollTrigger.create({
        trigger: '#s-map', start: 'top 100%', end: 'top 30%',
        scrub: true,
        onUpdate: (s) => { scrollState.current.toFill = s.progress; }
      });

      // Book Fade out for Map (Starts EXACTLY when zoom completes, so it covers screen fully before fading)
      ScrollTrigger.create({
        trigger: '#s-map', start: 'top 30%', end: 'top 10%',
        scrub: true,
        onUpdate: (s) => { 
          scrollState.current.toMapFade = s.progress; 
          
          // Toggle the global state to restrict particle rendering
          const mapVisible = s.progress > 0;
          if (wasVisibleRef.current !== mapVisible) {
            wasVisibleRef.current = mapVisible;
            setIsMapVisible(mapVisible);
          }
        }
      });

      // Book Author entry (Starts zooming out after map fades out)
      ScrollTrigger.create({
        trigger: '#s-author', start: 'top 70%', end: 'top 30%',
        scrub: true,
        onUpdate: (s) => { 
          scrollState.current.toAuthor = s.progress; 
        }
      });
    });
    return () => ctx.revert()
  }, [])

  useFrame((state, delta) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    const s = scrollState.current;
    
    // Calculate global opacity for map fade transition
    // Map section fades it out, Author section fades it back in (accelerated so it's solid before shrinking too much)
    const opacityAmt = Math.max(0, Math.min(1, 1 - s.toMapFade + (s.toAuthor * 5)));
    
    // Apply CSS opacity and blur to the canvas container
    // Blur is tied to physical proximity (toFill) so it blurs BEFORE fading out!
    const closeToCamera = Math.max(0, s.toFill - s.toAuthor);
    // Start the blur earlier (at 50% of the zoom) and ramp it up smoothly
    const blurAmt = Math.max(0, (closeToCamera - 0.5) * 2) * 30; // Max 30px blur
    
    const canvasEl = document.getElementById('canvas-container');
    if (canvasEl) {
      canvasEl.style.opacity = opacityAmt;
      canvasEl.style.filter = blurAmt > 0.1 ? `blur(${blurAmt}px)` : 'none';
    }

    // Skip rendering entirely when invisible
    if (opacityAmt < 0.01) {
      group.current.visible = false;
      return;
    }
    group.current.visible = true;

    // Sync intro animation perfectly with the render loop to prevent GSAP ticker-desync jitter
    if (isLoaded && introProgress.current < 1) {
      introProgress.current += delta * 0.4; // 2.5s duration
      if (introProgress.current > 1) introProgress.current = 1;
      
      const t = introProgress.current;
      const easeOutCubic = 1 - Math.pow(1 - t, 3);
      
      introAnim.current.y = -1.0 * (1 - easeOutCubic);
      introAnim.current.rx = 0.15 * (1 - easeOutCubic);
      introAnim.current.ry = 0.15 * (1 - easeOutCubic);
    }

    // ── Smooth scroll velocity (for tilt reactivity) ──
    smoothScrollVel.current = lerp(smoothScrollVel.current, scrollVel.current, 0.08);
    // Decay raw scroll velocity so it doesn't persist
    scrollVel.current *= 0.9;

    // ── Orbit strength recovery ──
    // After scrolling stops, gradually restore the ambient orbit
    const timeSinceScroll = performance.now() - lastScrollTime.current;
    if (timeSinceScroll > 300) {
      orbitStrength.current = lerp(orbitStrength.current, 1, 0.008);
    }

    // ── Mouse smoothing ──
    // ── Mouse smoothing ──
    mouseSmooth.current.x = lerp(mouseSmooth.current.x, mouse.current.x, 0.07);
    mouseSmooth.current.y = lerp(mouseSmooth.current.y, mouse.current.y, 0.07);

    // Apply the cinematic "snappy" curve to ALL scroll transitions
    const snappyToSide = CustomEase.get("snappy")(s.toSide);
    const snappyToSideRight = CustomEase.get("snappy")(s.toSideRight);
    const snappyToFill = CustomEase.get("snappy")(s.toFill);
    const snappyAuthorProgress = CustomEase.get("snappy")(s.toAuthor);

    // Pose interpolation: hero → side → sideRight → fill → side(author)
    const atSide = lerpPose(POSE.hero, POSE.side, snappyToSide);
    const atSideRight = lerpPose(atSide, POSE.sideRight, snappyToSideRight);
    const atFill = lerpPose(atSideRight, POSE.fill, snappyToFill);
    let target = lerpPose(atFill, POSE.side, snappyAuthorProgress);

    // ── How "zoomed-in" are we? ──
    const fillAmt = s.toFill * (1 - s.toAuthor);

    // ══════════════════════════════════════════════════
    // FLOATING MEDITATION — Lemniscate Orbital Drift
    // ══════════════════════════════════════════════════
    // Advance the figure-8 phase continuously
    orbitPhase.current += delta * 0.15; // Very slow orbit speed
    const orbitAmp = orbitStrength.current * (1 - fillAmt * 0.9); // Suppress during zoom
    
    // Lemniscate parametric equations (figure-8)
    const lemnT = orbitPhase.current;
    const orbitX = Math.sin(lemnT) * 0.08 * orbitAmp;
    const orbitY = Math.sin(lemnT * 2) * 0.04 * orbitAmp;
    const orbitZ = Math.cos(lemnT * 0.7) * 0.03 * orbitAmp;
    
    target.x += orbitX;
    target.y += orbitY;
    target.z += orbitZ;
    // Subtle rotation drift from the orbit
    target.ry += Math.sin(lemnT * 0.5) * 0.03 * orbitAmp;
    target.rz += Math.cos(lemnT * 0.8) * 0.008 * orbitAmp;

    // ══════════════════════════════════════════════════
    // SUBTLE BREATHING — Slow, majestic levitation
    // ══════════════════════════════════════════════════
    const fm = 1 - fillAmt * 0.7; // reduce breathing when zoomed in
    target.x += Math.sin(t * 0.25 + 0.7) * 0.02 * fm;
    target.y += Math.sin(t * 0.35) * 0.06 * fm;
    target.ry += Math.sin(t * 0.15) * 0.025 * fm;
    target.rx += Math.sin(t * 0.2 + 1.2) * 0.005 * fm;
    target.rz += Math.sin(t * 0.12 + 2) * 0.003 * fm;

    // ══════════════════════════════════════════════════
    // SUBTLE CURSOR PARALLAX — Premium weight
    // ══════════════════════════════════════════════════
    const mx = mouseSmooth.current.x, my = mouseSmooth.current.y;
    const hs = Math.max(0.1, 1 - s.toSide * 0.6 - fillAmt * 0.8);
    
    // Slight tilt: left mouse = peek at cover, right = peek at spine
    target.ry += mx * 0.06 * hs;
    target.rx += my * 0.03 * hs;
    // Position parallax
    target.x += mx * 0.03 * hs;
    target.y += my * -0.02 * hs;
    // Z-axis repulsion reduced significantly
    const mouseProximity = 1 - Math.sqrt(mx * mx + my * my);
    target.z += mouseProximity * -0.02 * hs;

    // ══════════════════════════════════════════════════
    // SMOOTH PHYSICS — Premium, heavy weight (Zero Bounce)
    // ══════════════════════════════════════════════════
    const smoothing = 0.08; 

    cur.current.x = lerp(cur.current.x, target.x, smoothing);
    cur.current.y = lerp(cur.current.y, target.y, smoothing);
    cur.current.z = lerp(cur.current.z, target.z, smoothing);
    cur.current.rx = lerp(cur.current.rx, target.rx, smoothing);
    cur.current.ry = lerp(cur.current.ry, target.ry, smoothing);
    cur.current.rz = lerp(cur.current.rz, target.rz, smoothing);
    cur.current.sc = lerp(cur.current.sc, target.sc, smoothing);
    
    // Apply intro animation directly on top of the smoothed coordinates to prevent double-easing lag
    const finalY = cur.current.y + introAnim.current.y;
    const finalRX = cur.current.rx + introAnim.current.rx;
    const finalRY = cur.current.ry + introAnim.current.ry;

    group.current.position.set(cur.current.x, finalY, cur.current.z);
    group.current.rotation.set(finalRX, finalRY, cur.current.rz);
    // Adjust book length (Y-axis) based on feedback
    group.current.scale.set(cur.current.sc, cur.current.sc * 0.935, cur.current.sc);
  });

  return (
    <group ref={group} dispose={null}>
      {/* We center the geometry bounds just like the original logic */}
      <primitive object={scene} />
    </group>
  )
}

useGLTF.preload('/book-updated.glb', 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/')
