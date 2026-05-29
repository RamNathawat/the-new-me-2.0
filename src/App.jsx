import { Suspense, useEffect, useState, lazy, useRef } from 'react'
import { ReactLenis } from 'lenis/react'
import gsap from 'gsap'
import Overlay from './components/Overlay.jsx'

const Scene = lazy(() => import('./components/Scene.jsx'));

export default function App() {
  const lenisRef = useRef(null);

  // Sync ReactLenis with GSAP Ticker for perfect 60fps fast scroll
  useEffect(() => {
    function update(time) {
      lenisRef.current?.lenis?.raf(time * 1000)
    }
    gsap.ticker.add(update)
    gsap.ticker.lagSmoothing(0) // Prevent GSAP from trying to auto-adjust frames, which breaks Lenis
    return () => {
      gsap.ticker.remove(update)
    }
  }, [])

  // Defer 3D canvas rendering to prioritize HTML LCP
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Wait for the main thread to paint the HTML before parsing Three.js
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ReactLenis root ref={lenisRef} autoRaf={false} options={{ smoothWheel: true, duration: 1.2 }}>
      <div className="app-container">
        
        {/* R3F Canvas - Deferred until after initial paint */}
        <div className="canvas-container" id="canvas-container" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 10, pointerEvents: 'none', background: 'transparent', transition: 'opacity 0.1s' }}>
          {mounted && (
            <Suspense fallback={null}>
              <Scene />
            </Suspense>
          )}
        </div>

        {/* DOM Overlay - Exact Vanilla Structure */}
        <Overlay />
      </div>
    </ReactLenis>
  )
}

