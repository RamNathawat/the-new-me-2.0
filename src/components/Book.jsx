import { useGLTF } from '@react-three/drei'
import { useRef, useLayoutEffect, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import * as THREE from 'three'
import { useStore } from '../store'

gsap.registerPlugin(ScrollTrigger)

const POSE = {
  hero: { x: 0, y: 0, z: 0, rx: -0.08, ry: -0.25, rz: 0.05, sc: 1.1 },
  side: { x: -1.0, y: 0.05, z: 0, rx: -0.04, ry: -0.15, rz: 0.03, sc: 0.75 },
  sideRight: { x: 0.85, y: 0.05, z: 0, rx: -0.04, ry: 0.15, rz: -0.03, sc: 0.75 },
  fill: { x: -36.6, y: 36.6, z: -2.0, rx: 0, ry: 0, rz: 0, sc: 55.0 }, // Scaled up but targeting the exact same beige corner as original
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
  const { scene } = useGLTF('/book.glb', 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/')
  const group = useRef()
  const setIsMapVisible = useStore(state => state.setIsMapVisible);
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
    // Center the geometry like the original script
    const box = new THREE.Box3().setFromObject(scene);
    const center = new THREE.Vector3();
    box.getCenter(center);
    scene.position.sub(center);
  }, [scene])

  useLayoutEffect(() => {
    // Majestic glide upward with subtle tilt correction on load
    gsap.to(introAnim.current, {
      y: 0,
      rx: 0,
      ry: 0,
      duration: 2.5,
      ease: 'power3.out',
      delay: 0.2
    });

    const ctx = gsap.context(() => {
      // Book: Hero → Side
      ScrollTrigger.create({
        trigger: '#s-story-1', start: 'top 85%', end: 'top 25%',
        scrub: 1.8,
        onUpdate: (s) => { scrollState.current.toSide = s.progress; }
      });

      // Book: Side (Left) → SideRight (Right)
      ScrollTrigger.create({
        trigger: '#s-story-2', start: 'top 85%', end: 'top 25%',
        scrub: 1.8,
        onUpdate: (s) => { scrollState.current.toSideRight = s.progress; }
      });

      // Book Zoom: completes BEFORE map section reaches top
      ScrollTrigger.create({
        trigger: '#s-map', start: 'top 100%', end: 'top 30%',
        scrub: 2,
        onUpdate: (s) => { scrollState.current.toFill = s.progress; }
      });

      // Book Fade out for Map (Starts EXACTLY when zoom completes, so it covers screen fully before fading)
      ScrollTrigger.create({
        trigger: '#s-map', start: 'top 30%', end: 'top 10%',
        scrub: 1.5,
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

      // Book Author entry (Starts zooming out as soon as the section enters the bottom of the screen)
      ScrollTrigger.create({
        trigger: '#s-author', start: 'top 100%', end: 'top 60%',
        scrub: 1.5,
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
    mouseSmooth.current.x = lerp(mouseSmooth.current.x, mouse.current.x, 0.07);
    mouseSmooth.current.y = lerp(mouseSmooth.current.y, mouse.current.y, 0.07);

    // Pose interpolation: hero → side → sideRight → fill → side(author)
    const atSide = lerpPose(POSE.hero, POSE.side, s.toSide);
    const atSideRight = lerpPose(atSide, POSE.sideRight, s.toSideRight);
    const atFill = lerpPose(atSideRight, POSE.fill, s.toFill);
    let target = lerpPose(atFill, POSE.side, s.toAuthor);

    // Add intro animation (majestic glide)
    target.y += introAnim.current.y;
    target.rx += introAnim.current.rx;
    target.ry += introAnim.current.ry;

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
    const smoothing = 0.05; // 5% interpolation per frame, completely eliminates overshoot

    cur.current.x += (target.x - cur.current.x) * smoothing;
    cur.current.y += (target.y - cur.current.y) * smoothing;
    cur.current.z += (target.z - cur.current.z) * smoothing;
    cur.current.rx += (target.rx - cur.current.rx) * smoothing;
    cur.current.ry += (target.ry - cur.current.ry) * smoothing;
    cur.current.rz += (target.rz - cur.current.rz) * smoothing;
    cur.current.sc += (target.sc - cur.current.sc) * smoothing;

    group.current.position.set(cur.current.x, cur.current.y, cur.current.z);
    group.current.rotation.set(cur.current.rx, cur.current.ry, cur.current.rz);
    group.current.scale.setScalar(cur.current.sc);
  });

  return (
    <group ref={group} dispose={null}>
      {/* We center the geometry bounds just like the original logic */}
      <primitive object={scene} />
    </group>
  )
}

useGLTF.preload('/book.glb', 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/')
