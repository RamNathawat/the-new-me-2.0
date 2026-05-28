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
  authorStart: { x: -3.0, y: 0.05, z: 0, rx: -0.04, ry: -0.15, rz: 0.03, sc: 0.75 }, // Hidden offscreen left for the author entry
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
  const { scene } = useGLTF('/book.glb')
  const group = useRef()
  const setIsMapVisible = useStore(state => state.setIsMapVisible);
  const wasVisibleRef = useRef(false);
  
  // State refs for animation
  const scrollState = useRef({
    toSide: 0,
    toSideRight: 0,
    toFill: 0,
    toMapFade: 0,
    toAuthorStart: 0,
    toAuthor: 0,
  });
  
  const cur = useRef({ ...POSE.hero });
  const vel = useRef({ x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, sc: 0 });
  const mouse = useRef({ x: 0, y: 0 });
  const mouseSmooth = useRef({ x: 0, y: 0 });
  const introAnim = useRef({ y: 0, ry: Math.PI * -2 });

  useEffect(() => {
    const handleMove = (e) => {
      mouse.current.x = (e.clientX / innerWidth) * 2 - 1;
      mouse.current.y = -(e.clientY / innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
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

      // Invisible transition from Fill to AuthorStart (happens while book is faded out)
      ScrollTrigger.create({
        trigger: '#s-map', start: 'top -20%', end: 'bottom 100%',
        scrub: true,
        onUpdate: (s) => { scrollState.current.toAuthorStart = s.progress; }
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

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    const s = scrollState.current;
    
    // We no longer fade the entire canvas! That hid the particles.
    // Instead, we calculate the book's opacity so we can fade out the 3D model itself.
    const bookOpacity = 1 - s.toMapFade + s.toAuthor;
    
    // Apply opacity to the book materials
    scene.traverse((child) => {
      if (child.isMesh && child.material) {
        // Enable transparency if we need to fade
        if (!child.material.transparent) {
          child.material.transparent = true;
          child.material.needsUpdate = true;
        }
        child.material.opacity = Math.max(0, Math.min(1, bookOpacity));
      }
    });
    
    mouseSmooth.current.x = lerp(mouseSmooth.current.x, mouse.current.x, 0.03);
    mouseSmooth.current.y = lerp(mouseSmooth.current.y, mouse.current.y, 0.03);

    // Pose interpolation: hero → side → sideRight → fill → authorStart → side(author)
    const atSide = lerpPose(POSE.hero, POSE.side, s.toSide);
    const atSideRight = lerpPose(atSide, POSE.sideRight, s.toSideRight);
    const atFill = lerpPose(atSideRight, POSE.fill, s.toFill);
    const atAuthorStart = lerpPose(atFill, POSE.authorStart, s.toAuthorStart);
    let target = lerpPose(atAuthorStart, POSE.side, s.toAuthor);

    // Add intro animation (jump + spin)
    target.y += introAnim.current.y;
    target.ry += introAnim.current.ry;

    // Breathing
    const fillAmt = s.toFill * (1 - s.toAuthor);
    const fm = 1 - fillAmt * 0.7; // reduce breathing when zoomed in
    target.x += Math.sin(t * 0.38 + 0.7) * 0.01 * fm;
    target.y += Math.sin(t * 0.6) * 0.03 * fm;
    target.ry += Math.sin(t * 0.22) * 0.012 * fm;
    target.rx += Math.sin(t * 0.32 + 1.2) * 0.002 * fm;
    target.rz += Math.sin(t * 0.18 + 2) * 0.001 * fm;

    // Cursor
    const mx = mouseSmooth.current.x, my = mouseSmooth.current.y;
    const hs = Math.max(0.1, 1 - s.toSide * 0.6 - fillAmt * 0.8);
    target.ry += mx * 0.16 * hs;
    target.rx += my * 0.08 * hs;
    target.x += mx * 0.08 * hs;
    target.y += my * -0.04 * hs;

    // Spring physics for a bouncy, elastic animation
    const stiffness = 0.06;
    const damping = 0.88; // Creates clean settling without overshoot

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
    
    // We removed the manual canvasFade logic so the 3D book acts as a persistent, 
    // beautiful cinematic backdrop during the map section.
    group.current.visible = true;
  });

  return (
    <group ref={group} dispose={null}>
      {/* We center the geometry bounds just like the original logic */}
      <primitive object={scene} />
    </group>
  )
}

useGLTF.preload('/book.glb')
