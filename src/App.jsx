import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Float, Preload, ContactShadows, Sparkles, Center } from '@react-three/drei'
import { EffectComposer, Noise, Bloom } from '@react-three/postprocessing'
import { Suspense, useRef, useEffect } from 'react'
import { ReactLenis } from 'lenis/react'
import gsap from 'gsap'
import { useStore } from './store'

import Book from './components/Book.jsx'
import Overlay from './components/Overlay.jsx'

function CameraSetup() {
  useThree(({ camera }) => {
    camera.lookAt(0, 0, 0);
  });
  return null;
}

function SceneLighting() {
  const hoveredNode = useStore(state => state.hoveredNode);
  const ambLight = useRef();
  const dirLight = useRef();

  useEffect(() => {
    if (hoveredNode) {
      // Warm Green shift
      gsap.to(ambLight.current, { intensity: 1.5, duration: 1 });
      gsap.to(ambLight.current.color, { r: 0.88, g: 0.95, b: 0.89, duration: 1 }); // #e2f3e5 approx
    } else {
      // Clinical Grey/White
      gsap.to(ambLight.current, { intensity: 0.8, duration: 1 });
      gsap.to(ambLight.current.color, { r: 1, g: 1, b: 1, duration: 1 });
    }
  }, [hoveredNode]);

  return (
    <>
      <Environment preset="studio" />
      <ambientLight ref={ambLight} intensity={0.8} color="#ffffff" />
      <directionalLight ref={dirLight} position={[10, 20, 15]} intensity={1.5} color="#ffffff" />
    </>
  )
}

export default function App() {
  return (
    <ReactLenis root options={{ smoothWheel: true, duration: 1.4 }}>
      <div className="app-container">
        
        {/* R3F Canvas - Now rendered ON TOP of the DOM layout, just like the original */}
        <div className="canvas-container" id="canvas-container" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 10, pointerEvents: 'none', background: 'transparent', transition: 'opacity 0.1s' }}>
          <Canvas
            camera={{ position: [0, 0.3, 5], fov: 32 }}
            dpr={[1, 2]}
            gl={{ antialias: false, powerPreference: "high-performance" }}
          >
            <CameraSetup />
            <Suspense fallback={null}>
              <Environment preset="city" environmentIntensity={0.6} />
              <ambientLight intensity={0.5} color="#F5E6D3" />
              <directionalLight position={[5, 10, 8]} intensity={1.2} color="#FFF8F0" />
              <directionalLight position={[-6, 4, -3]} intensity={0.4} color="#D4E8DF" />
              <directionalLight position={[-2, -3, -8]} intensity={0.3} color="#FFE4CC" />
              <directionalLight position={[0, 12, 2]} intensity={0.2} color="#FFFFFF" />
              
              <Book />
              
              {/* The "Life" Particles */}
              <Sparkles count={100} scale={15} size={2} speed={0.2} opacity={0.5} color="#2D5A27" />
              
              <EffectComposer multisampling={0}>
                <Noise opacity={0.03} />
              </EffectComposer>
              
              <Preload all />
            </Suspense>
          </Canvas>
        </div>

        {/* DOM Overlay - Exact Vanilla Structure */}
        <Overlay />
      </div>
    </ReactLenis>
  )
}
