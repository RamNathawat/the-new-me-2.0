import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../store';
import gsap from 'gsap';

const vertexShader = `
uniform float uTime;
uniform float uTransition;
uniform vec3 uMouse;
attribute float aSize;
attribute vec3 aRandomPhase;
attribute vec3 aPosSphere;
attribute vec3 aPosHelix;
attribute vec3 aPosPlane;
attribute vec3 aPosTorus;

uniform float uWeightSphere;
uniform float uWeightHelix;
uniform float uWeightPlane;
uniform float uWeightTorus;

varying vec3 vColor;
varying float vAlpha;

// Noise function
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 = v - i + dot(i, C.xxx) ;
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute( permute( permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
  float n_ = 0.14285714285714285714;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
}

vec3 snoiseVec3( vec3 x ){
  float s  = snoise(vec3( x ));
  float s1 = snoise(vec3( x.y - 19.1 , x.z + 33.4 , x.x + 47.2 ));
  float s2 = snoise(vec3( x.z + 74.2 , x.x - 124.5 , x.y + 99.4 ));
  return vec3( s , s1 , s2 );
}

vec3 curlNoise( vec3 p ){
  const float e = 0.1;
  vec3 dx = vec3( e   , 0.0 , 0.0 );
  vec3 dy = vec3( 0.0 , e   , 0.0 );
  vec3 dz = vec3( 0.0 , 0.0 , e   );

  vec3 p_x0 = snoiseVec3( p - dx );
  vec3 p_x1 = snoiseVec3( p + dx );
  vec3 p_y0 = snoiseVec3( p - dy );
  vec3 p_y1 = snoiseVec3( p + dy );
  vec3 p_z0 = snoiseVec3( p - dz );
  vec3 p_z1 = snoiseVec3( p + dz );

  float x = p_y1.z - p_y0.z - p_z1.y + p_z0.y;
  float y = p_z1.x - p_z0.x - p_x1.z + p_x0.z;
  float z = p_x1.y - p_x0.y - p_y1.x + p_y0.x;

  const float divisor = 1.0 / ( 2.0 * e );
  return normalize( vec3( x , y , z ) * divisor );
}


void main() {
  vec3 pos = position;
  
  // --- Awwwards-Level Curl Noise Flow (Idle State) ---
  float flowFreq = 0.15;
  float flowSpeed = 0.05; // Much slower and calmer
  // Offset based on random phase so particles don't all clump identically
  vec3 curlPos = pos * flowFreq + aRandomPhase * 2.0;
  vec3 flow = curlNoise(curlPos + uTime * flowSpeed);
  
  // Apply flow field to base position
  pos += flow * 0.6; // Less chaotic displacement
  
  // Calculate final target position based on shape weights (Hover State)
  vec3 targetPos = pos;
  targetPos = mix(targetPos, aPosSphere, uWeightSphere);
  targetPos = mix(targetPos, aPosHelix, uWeightHelix);
  targetPos = mix(targetPos, aPosPlane, uWeightPlane);
  targetPos = mix(targetPos, aPosTorus, uWeightTorus);

  // Soft calm wave on target shape
  targetPos.z += snoise(targetPos + uTime * 0.2) * 0.2;
  
  // Overall transition weight (if any shape is active, it calms down)
  float totalWeight = clamp(uWeightSphere + uWeightHelix + uWeightPlane + uWeightTorus, 0.0, 1.0);
  
  // Mix from chaotic to structured
  pos = mix(pos, targetPos, totalWeight);

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  
  // Size attenuation
  gl_PointSize = aSize * (10.0 / -mvPosition.z);
  
  // Colors: Deep, dark ink-like tones for a light background
  vec3 colorSageDeep = vec3(0.07, 0.15, 0.09); // Very dark forest green
  vec3 colorOlive = vec3(0.2, 0.25, 0.2); // Dark muted grey-green
  vec3 colorGold = vec3(0.5, 0.3, 0.1); // Deep burnt orange/brown for contrast
  
  // Blend colors organically based on particle's noise phase and position
  float mixFactor = smoothstep(-1.0, 1.0, sin(pos.x * 0.5 + aRandomPhase.z * 10.0));
  vec3 baseColor = mix(colorSageDeep, colorOlive, mixFactor);
  
  // Add subtle gold highlights to 20% of particles
  float highlight = smoothstep(0.8, 1.0, aRandomPhase.y);
  vec3 idleColor = mix(baseColor, colorGold, highlight * 0.8);
  
  // When forming shapes (totalWeight > 0), they unify into a solid vibrant tone slightly
  vec3 shapeColor = mix(colorSageDeep, colorGold, aRandomPhase.x * 0.3);
  
  vColor = mix(idleColor, shapeColor, totalWeight);
  
  // Alpha fading at edges
  float edgeFade = 1.0 - smoothstep(10.0, 15.0, length(pos.xy));
  vAlpha = mix(0.4, 0.8, totalWeight) * edgeFade;
}
`;

const fragmentShader = `
varying vec3 vColor;
varying float vAlpha;

void main() {
  // Soft circle
  float d = distance(gl_PointCoord, vec2(0.5));
  if (d > 0.5) discard;
  
  float alpha = smoothstep(0.5, 0.1, d) * vAlpha;
  gl_FragColor = vec4(vColor, alpha);
}
`;

export function BioNetwork() {
  const lineRef = useRef();

  const [lineGeometry, points] = useMemo(() => {
    const pts = [];
    const numNodes = 150;
    const nodes = [];
    
    // Core pillar positions roughly mapped to screen layout
    const pillars = [
      new THREE.Vector3(-8, 3, -2),   // Nutrition
      new THREE.Vector3(-3, -4, -2),  // Movement
      new THREE.Vector3(3, 3, -2),    // Recovery
      new THREE.Vector3(8, -4, -2)    // Mindset
    ];
    nodes.push(...pillars);

    // Generate random background nodes
    for (let i = 0; i < numNodes; i++) {
      nodes.push(new THREE.Vector3(
        (Math.random() - 0.5) * 35,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 15 - 5
      ));
    }

    // Connect nodes to form an organic web
    nodes.forEach((n1, i) => {
      const others = [...nodes].filter((_, j) => j !== i);
      others.sort((a, b) => n1.distanceToSquared(a) - n1.distanceToSquared(b));
      
      // Connect to 2-3 closest to form branching paths
      pts.push(n1, others[0]);
      pts.push(n1, others[1]);
      if (Math.random() > 0.5) pts.push(n1, others[2]);
    });
    
    // Also draw an explicit thick path connecting the pillars
    for (let i=0; i < pillars.length - 1; i++) {
       pts.push(pillars[i], pillars[i+1]);
    }
    
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    return [geo, pts];
  }, []);

  useFrame((state) => {
    if (lineRef.current) {
      // Gentle breathing/swaying of the network
      lineRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.5;
      lineRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.1) * 0.02;
    }
  });

  return (
    <lineSegments ref={lineRef} geometry={lineGeometry}>
      <lineBasicMaterial 
        color={0x2d5a27} 
        transparent={true} 
        opacity={0.18} 
        linewidth={1} 
      />
    </lineSegments>
  );
}

export default function ParticleMap() {
  const pointsRef = useRef();
  const materialRef = useRef();
  const { size, viewport } = useThree();
  const hoveredNode = useStore(state => state.hoveredNode);
  const transitionTarget = useRef(0);

  const count = 8000;
  
  const [positions, sizes, randomPhases, posSphere, posHelix, posPlane, posTorus] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const siz = new Float32Array(count);
    const phases = new Float32Array(count * 3);
    const sphere = new Float32Array(count * 3);
    const helix = new Float32Array(count * 3);
    const plane = new Float32Array(count * 3);
    const torus = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      
      // Base random positions
      pos[idx + 0] = (Math.random() - 0.5) * 20;
      pos[idx + 1] = (Math.random() - 0.5) * 15;
      pos[idx + 2] = (Math.random() - 0.5) * 10 - 2;
      
      siz[i] = Math.random() * 8 + 2;
      
      phases[idx + 0] = Math.random();
      phases[idx + 1] = Math.random();
      phases[idx + 2] = Math.random();
      
      // 1. The Atom (Nutrition) - Core + 2 Rings
      if (i % 3 === 0) {
        // Dense Core
        const phi = Math.random() * Math.PI * 2;
        const costheta = (Math.random() * 2) - 1;
        const theta = Math.acos(costheta);
        const rSphere = 1.0 + Math.random() * 0.5; // dense small core
        sphere[idx + 0] = rSphere * Math.sin(theta) * Math.cos(phi);
        sphere[idx + 1] = rSphere * Math.sin(theta) * Math.sin(phi);
        sphere[idx + 2] = rSphere * Math.cos(theta);
      } else if (i % 3 === 1) {
        // Horizontal Ring
        const angle = Math.random() * Math.PI * 2;
        const rRing = 4.0 + (Math.random() - 0.5) * 0.5;
        sphere[idx + 0] = Math.cos(angle) * rRing;
        sphere[idx + 1] = (Math.random() - 0.5) * 0.5; // slight thickness
        sphere[idx + 2] = Math.sin(angle) * rRing;
      } else {
        // Vertical Ring
        const angle = Math.random() * Math.PI * 2;
        const rRing = 4.0 + (Math.random() - 0.5) * 0.5;
        sphere[idx + 0] = Math.cos(angle) * rRing;
        sphere[idx + 1] = Math.sin(angle) * rRing;
        sphere[idx + 2] = (Math.random() - 0.5) * 0.5; // slight thickness
      }

      // 2. The Double Helix (Movement) - Tighter, taller, spinning
      const t = Math.random() * Math.PI * 12; // taller
      const strand = i % 2 === 0 ? 0 : Math.PI; // dual strand
      const rHelix = 1.2; // tighter radius
      helix[idx + 0] = Math.cos(t + strand) * rHelix;
      helix[idx + 1] = (t / (Math.PI * 12)) * 14 - 7; // Y from -7 to 7
      helix[idx + 2] = Math.sin(t + strand) * rHelix;

      // 3. The Sleep Wave (Recovery) - Smooth Sine Wave
      const waveX = (Math.random() - 0.5) * 20;
      const waveZ = (Math.random() - 0.5) * 12;
      const waveY = Math.sin(waveX * 0.5) * 1.5 + Math.cos(waveZ * 0.5) * 1.5;
      plane[idx + 0] = waveX;
      plane[idx + 1] = waveY - 2.0; // lower down
      plane[idx + 2] = waveZ;

      // 4. The Neural Spiral (Mindset) - Galaxy
      const arms = 3;
      const armIndex = i % arms;
      const angle = (Math.random() * Math.PI * 4); // swirl length
      const radius = angle * 0.6 + (Math.random() * 1.5); // spread
      const armOffset = (Math.PI * 2 / arms) * armIndex;
      torus[idx + 0] = Math.cos(angle + armOffset) * radius;
      torus[idx + 1] = (Math.random() - 0.5) * 1.0; // flat galaxy
      torus[idx + 2] = Math.sin(angle + armOffset) * radius;
    }
    return [pos, siz, phases, sphere, helix, plane, torus];
  }, [count]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uWeightSphere: { value: 0 },
    uWeightHelix: { value: 0 },
    uWeightPlane: { value: 0 },
    uWeightTorus: { value: 0 },
    uMouse: { value: new THREE.Vector3() }
  }), []);

  useEffect(() => {
    if (!materialRef.current) return;
    const u = materialRef.current.uniforms;
    
    // Animate weights based on hovered node
    gsap.to(u.uWeightSphere, { value: hoveredNode === 'ch-nutrition' ? 1 : 0, duration: 1.2, ease: "power2.out" });
    gsap.to(u.uWeightHelix, { value: hoveredNode === 'ch-fitness' ? 1 : 0, duration: 1.2, ease: "power2.out" });
    gsap.to(u.uWeightPlane, { value: hoveredNode === 'ch-sleep' ? 1 : 0, duration: 1.2, ease: "power2.out" });
    gsap.to(u.uWeightTorus, { value: hoveredNode === 'ch-mindset' ? 1 : 0, duration: 1.2, ease: "power2.out" });
  }, [hoveredNode]);

  useEffect(() => {
    const onMouseMove = (e) => {
      // normalized coordinates -1 to +1
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;
      // Convert to world space roughly based on camera z=5
      const worldX = (x * viewport.width) / 2;
      const worldY = (y * viewport.height) / 2;
      
      if (materialRef.current) {
        gsap.to(materialRef.current.uniforms.uMouse.value, {
          x: worldX,
          y: worldY,
          duration: 0.2,
          ease: 'power2.out'
        });
      }
    };
    
    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, [viewport]);

  const groupRef = useRef();
  const isMapVisible = useStore(state => state.isMapVisible);

  useFrame((state) => {
    // ----------------------------------------------------
    // PERFORMANCE OPTIMIZATION: Viewport Culling
    // ----------------------------------------------------
    // We only render particles when the Map Section is active.
    if (groupRef.current) {
      groupRef.current.visible = isMapVisible;
    }

    if (!isMapVisible) return; // Skip all heavy math if hidden

    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
    
    // Camera zoom when a node is actively hovered/clicked
    if (hoveredNode) {
      // Pull back to perfectly frame the large 3D structures
      state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, 12.0, 0.04);
    } else {
      // Return to standard map view
      state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, 5.0, 0.03);
    }
    
    // Slowly rotate the entire field
    if (pointsRef.current) {
      const u = materialRef.current.uniforms;
      const totalWeight = u.uWeightSphere.value + u.uWeightHelix.value + u.uWeightPlane.value + u.uWeightTorus.value;
      
      // Base slow rotation, speeds up when a shape forms
      const spinSpeed = 0.05 + (totalWeight * 0.5);
      pointsRef.current.rotation.y = state.clock.elapsedTime * spinSpeed;
      // Slight tilt for better viewing angles
      pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.1 * totalWeight;
    }
  });

  return (
    <group ref={groupRef}>
      <BioNetwork />
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
          <bufferAttribute attach="attributes-aSize" count={count} array={sizes} itemSize={1} />
          <bufferAttribute attach="attributes-aRandomPhase" count={count} array={randomPhases} itemSize={3} />
          <bufferAttribute attach="attributes-aPosSphere" count={count} array={posSphere} itemSize={3} />
          <bufferAttribute attach="attributes-aPosHelix" count={count} array={posHelix} itemSize={3} />
          <bufferAttribute attach="attributes-aPosPlane" count={count} array={posPlane} itemSize={3} />
          <bufferAttribute attach="attributes-aPosTorus" count={count} array={posTorus} itemSize={3} />
        </bufferGeometry>
        <shaderMaterial
          ref={materialRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          transparent={true}
          depthWrite={false}
          blending={THREE.NormalBlending}
        />
      </points>
    </group>
  );
}
