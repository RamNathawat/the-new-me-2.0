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
  fill: { x: -28.0, y: 28.0, z: 1.5, rx: 0, ry: 0, rz: 0, sc: 42.0 }, // Zooming deep into a blank beige corner to create the Match Cut
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
  const introAnim = useRef({ y: 0, ry: Math.PI * -2 });

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
    // 360 spin jump animation on load
    gsap.to(introAnim.current, {
      ry: 0,
      duration: 2.0,
      ease: 'power3.inOut',
      delay: 0.2
    });
    
    gsap.to(introAnim.current, {
      y: 1.2,
      duration: 1.0,
      ease: 'power2.out',
      delay: 0.2
    });
    
    gsap.to(introAnim.current, {
      y: 0,
      duration: 1.0,
      ease: 'bounce.out',
      delay: 1.2
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

      // Book Fade out for Map (This is exactly when we enter the Map section!)
      ScrollTrigger.create({
        trigger: '#s-map', start: 'top 20%', end: 'top top',
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

      // Book Author entry
      ScrollTrigger.create({
        trigger: '#s-author', start: 'top 90%', end: 'top 40%',
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
    
    // Calculate book opacity for map fade transition
    const bookOpacity = Math.max(0, Math.min(1, 1 - s.toMapFade + s.toAuthor));
    
    // Skip rendering entirely when invisible
    if (bookOpacity < 0.01) {
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

    // Add intro animation (jump + spin)
    target.y += introAnim.current.y;
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
    // AMPLIFIED BREATHING — 3× more alive
    // ══════════════════════════════════════════════════
    const fm = 1 - fillAmt * 0.7; // reduce breathing when zoomed in
    target.x += Math.sin(t * 0.38 + 0.7) * 0.04 * fm;
    target.y += Math.sin(t * 0.6) * 0.12 * fm;
    target.ry += Math.sin(t * 0.22) * 0.05 * fm;
    target.rx += Math.sin(t * 0.32 + 1.2) * 0.01 * fm;
    target.rz += Math.sin(t * 0.18 + 2) * 0.006 * fm;

    // ══════════════════════════════════════════════════
    // SCROLL-VELOCITY TILT — Forward/backward lean
    // ══════════════════════════════════════════════════
    const tiltAmount = Math.max(-0.12, Math.min(0.12, smoothScrollVel.current * 0.003));
    target.rx += tiltAmount * (1 - fillAmt);

    // ══════════════════════════════════════════════════
    // DRAMATIC CURSOR-REACTIVE TILT — "Curiosity Peek"
    // ══════════════════════════════════════════════════
    const mx = mouseSmooth.current.x, my = mouseSmooth.current.y;
    const hs = Math.max(0.1, 1 - s.toSide * 0.6 - fillAmt * 0.8);
    
    // Enhanced tilt: left mouse = peek at cover, right = peek at spine
    target.ry += mx * 0.22 * hs;
    target.rx += my * 0.12 * hs;
    // Position parallax
    target.x += mx * 0.1 * hs;
    target.y += my * -0.06 * hs;
    // Z-axis repulsion: cursor near center pushes book slightly away
    const mouseProximity = 1 - Math.sqrt(mx * mx + my * my);
    target.z += mouseProximity * -0.08 * hs;

    // ══════════════════════════════════════════════════
    // BOUNCY SPRING PHYSICS — Elastic, organic feel
    // ══════════════════════════════════════════════════
    const stiffness = 0.05;
    const damping = 0.65; // Creates more overshoot/bounce

    vel.current.x += (target.x - cur.current.x) * stiffness;
    vel.current.y += (target.y - cur.current.y) * stiffness;
    vel.current.z += (target.z - cur.current.z) * stiffness;
    vel.current.rx += (target.rx - cur.current.rx) * stiffness;
    vel.current.ry += (target.ry - cur.current.ry) * stiffness;
    vel.current.rz += (target.rz - cur.current.rz) * stiffness;
    vel.current.sc += (target.sc - cur.current.sc) * stiffness;

    vel.current.x *= damping;
    vel.current.y *= damping;
    vel.current.z *= damping;
    vel.current.rx *= damping;
    vel.current.ry *= damping;
    vel.current.rz *= damping;
    vel.current.sc *= damping;

    cur.current.x += vel.current.x;
    cur.current.y += vel.current.y;
    cur.current.z += vel.current.z;
    cur.current.rx += vel.current.rx;
    cur.current.ry += vel.current.ry;
    cur.current.rz += vel.current.rz;
    cur.current.sc += vel.current.sc;

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
