import { Suspense, useEffect, useState, lazy, useRef } from 'react'
import { ReactLenis } from 'lenis/react'
import gsap from 'gsap'
import Overlay from './components/Overlay.jsx'

import { CustomEase } from 'gsap/CustomEase'
import { Observer } from 'gsap/Observer'

const Scene = lazy(() => import('./components/Scene.jsx'));

gsap.registerPlugin(CustomEase, Observer);
CustomEase.create("snappy", "M0,0 C0.094,0.026 0.124,0.127 0.157,0.29 0.197,0.486 0.254,0.8 0.348 1 0.456,1 1,1 1,1");

export default function App() {
  const lenisRef = useRef(null);

  // Sync ReactLenis with GSAP Ticker for perfect 60fps fast scroll
  useEffect(() => {
    function update(time) {
      const lenis = lenisRef.current?.lenis || lenisRef.current;
      lenis?.raf(time * 1000)
    }
    gsap.ticker.add(update)
    gsap.ticker.lagSmoothing(0) // Prevent GSAP from trying to auto-adjust frames, which breaks Lenis
    return () => {
      gsap.ticker.remove(update)
    }
  }, [])

  useEffect(() => {
    const lenis = lenisRef.current?.lenis || lenisRef.current;
    if (!lenis) return;

    let isAnimating = false;
    let currentIndex = 0;
    const stops = ['#s-hero', '#s-story-1', '#s-story-2', '#s-map', '#s-author'];

    const gotoStop = (index) => {
      if (index < 0 || index >= stops.length) return;
      isAnimating = true;
      currentIndex = index;
      const target = document.querySelector(stops[index]);
      
      if (target) {
        lenis.scrollTo(target, {
          duration: 1.5,
          easing: CustomEase.get("snappy"),
          onComplete: () => {
            setTimeout(() => { isAnimating = false; }, 100);
          }
        });
      } else {
        isAnimating = false;
      }
    };

    const obs = Observer.create({
      target: window,
      type: "wheel,touch,pointer",
      wheelSpeed: -1,
      preventDefault: true,
      onDown: () => {
        if (!isAnimating) gotoStop(currentIndex + 1);
      },
      onUp: () => {
        if (!isAnimating) gotoStop(currentIndex - 1);
      }
    });

    return () => obs.kill();
  }, []);

  // Defer 3D canvas rendering to prioritize HTML LCP
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ReactLenis root ref={lenisRef} autoRaf={false} options={{ 
      smoothWheel: true, 
      duration: 1.2,
      wheelEventsTarget: null,
      touchEventsTarget: null
    }}>
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
