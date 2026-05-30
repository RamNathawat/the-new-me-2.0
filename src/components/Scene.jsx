import { Canvas, useThree } from '@react-three/fiber'
import { Environment, Preload, Sparkles } from '@react-three/drei'
import { EffectComposer, Noise } from '@react-three/postprocessing'
import { Suspense, lazy } from 'react'
import * as THREE from 'three'
import { useStore } from '../store'

const Book = lazy(() => import('./Book.jsx'));

function CameraSetup() {
  useThree(({ camera }) => {
    camera.lookAt(0, 0, 0);
  });
  return null;
}

export default function Scene() {
  const viewMode = useStore(state => state.viewMode);
  const frameloop = viewMode === 'takeover' || viewMode === 'transition' ? 'demand' : 'always';

  return (
    <Canvas
      frameloop={frameloop}
      camera={{ position: [0, 0.3, 5], fov: 32, near: 0.01 }}
      dpr={[1, 1.5]}
      gl={{ antialias: false, powerPreference: "high-performance" }}
    >
      <CameraSetup />
      <Suspense fallback={null}>
        
        <ambientLight intensity={1.5} color="#F5E6D3" />
        <directionalLight position={[5, 10, 8]} intensity={3.0} color="#FFF8F0" />
        <directionalLight position={[-6, 4, -3]} intensity={0.8} color="#D4E8DF" />
        
        <Sparkles 
          count={25} 
          scale={12} 
          size={2.5} 
          speed={0.2} 
          opacity={0.3} 
          color="#6fa380" 
          noise={1}
        />
        
        <Book />
        
        <EffectComposer multisampling={0}>
          <Noise opacity={0.03} />
        </EffectComposer>
        
        <Preload all />
      </Suspense>
    </Canvas>
  );
}
