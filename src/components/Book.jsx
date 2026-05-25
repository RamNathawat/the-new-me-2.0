import { useGLTF } from '@react-three/drei'
import { useRef, useLayoutEffect, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import * as THREE from 'three'

gsap.registerPlugin(ScrollTrigger)

const POSE = {
  hero: { x: 0, y: 0, z: 0, rx: -0.08, ry: -0.25, rz: 0.05, sc: 1.1 },
  side: { x: -1.0, y: 0.05, z: 0, rx: -0.04, ry: -0.15, rz: 0.03, sc: 0.75 },
  sideRight: { x: 0.85, y: 0.05, z: 0, rx: -0.04, ry: 0.15, rz: -0.03, sc: 0.75 },
  fill: { x: 0, y: 0, z: 1.8, rx: 0, ry: 0, rz: 0, sc: 3.2 },
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
  
  // State refs for animation
  const scrollState = useRef({
    toSide: 0,
    toSideRight: 0,
    toFill: 0,
    toMapFade: 0,
    toAuthor: 0,
  });
  
  const cur = useRef({ ...POSE.hero });
  const mouse = useRef({ x: 0, y: 0 });
  const mouseSmooth = useRef({ x: 0, y: 0 });

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

      // Book Fade out for Map
      ScrollTrigger.create({
        trigger: '#s-map', start: 'top 20%', end: 'top top',
        scrub: 1.5,
        onUpdate: (s) => { scrollState.current.toMapFade = s.progress; }
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
    
    // Mathematically flawless opacity & blur!
    const canvasOpacity = 1 - s.toMapFade + s.toAuthor;
    const canvasBlur = (s.toFill * 15) - (s.toAuthor * 15);
    
    const cc = document.getElementById('canvas-container');
    if (cc) {
      cc.style.opacity = canvasOpacity;
      cc.style.filter = `blur(${Math.max(0, canvasBlur)}px)`;
    }
    
    mouseSmooth.current.x = lerp(mouseSmooth.current.x, mouse.current.x, 0.07);
    mouseSmooth.current.y = lerp(mouseSmooth.current.y, mouse.current.y, 0.07);

    // Pose interpolation: hero → side → sideRight → fill → side(author)
    const atSide = lerpPose(POSE.hero, POSE.side, s.toSide);
    const atSideRight = lerpPose(atSide, POSE.sideRight, s.toSideRight);
    const atFill = lerpPose(atSideRight, POSE.fill, s.toFill);
    let target = lerpPose(atFill, POSE.side, s.toAuthor);

    // Breathing
    const fillAmt = s.toFill * (1 - s.toAuthor);
    const fm = 1 - fillAmt * 0.7; // reduce breathing when zoomed in
    target.x += Math.sin(t * 0.38 + 0.7) * 0.015 * fm;
    target.y += Math.sin(t * 0.6) * 0.05 * fm;
    target.ry += Math.sin(t * 0.22) * 0.02 * fm;
    target.rx += Math.sin(t * 0.32 + 1.2) * 0.003 * fm;
    target.rz += Math.sin(t * 0.18 + 2) * 0.002 * fm;

    // Cursor
    const mx = mouseSmooth.current.x, my = mouseSmooth.current.y;
    const hs = Math.max(0.1, 1 - s.toSide * 0.6 - fillAmt * 0.8);
    target.ry += mx * 0.16 * hs;
    target.rx += my * 0.08 * hs;
    target.x += mx * 0.08 * hs;
    target.y += my * -0.04 * hs;

    // LERP
    const spd = 0.08;
    cur.current.x = lerp(cur.current.x, target.x, spd);
    cur.current.y = lerp(cur.current.y, target.y, spd);
    cur.current.z = lerp(cur.current.z, target.z, spd);
    cur.current.rx = lerp(cur.current.rx, target.rx, spd);
    cur.current.ry = lerp(cur.current.ry, target.ry, spd);
    cur.current.rz = lerp(cur.current.rz, target.rz, spd);
    cur.current.sc = lerp(cur.current.sc, target.sc, spd);

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
