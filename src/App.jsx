import { Suspense, useEffect, useState, lazy } from 'react'
import { ReactLenis } from 'lenis/react'
import Overlay from './components/Overlay.jsx'

const Scene = lazy(() => import('./components/Scene.jsx'));

export default function App() {
  // Defer 3D canvas rendering to prioritize HTML LCP
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Wait for the main thread to paint the HTML before parsing Three.js
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ReactLenis root options={{ smoothWheel: true, duration: 1.4 }}>
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

