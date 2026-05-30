import { Suspense, useEffect, useState, lazy, useRef, useCallback } from 'react'
import { ReactLenis } from 'lenis/react'
import { useProgress } from '@react-three/drei'
import { useStore } from './store'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Overlay from './components/Overlay.jsx'

import { CustomEase } from 'gsap/CustomEase'

const Scene = lazy(() => import('./components/Scene.jsx'));

gsap.registerPlugin(ScrollTrigger, CustomEase);
CustomEase.create("snappy", "M0,0 C0.094,0.026 0.124,0.127 0.157,0.29 0.197,0.486 0.254,0.8 0.348 1 0.456,1 1,1 1,1");

export default function App() {
  const lenisRef = useRef(null);
  const isLoaded = useStore(state => state.isLoaded);

  // Lock scroll while loading to prevent book from shifting up out of position
  useEffect(() => {
    if (!isLoaded) {
      document.body.style.overflow = 'hidden';
      window.scrollTo(0, 0);
      lenisRef.current?.lenis?.stop();
    } else {
      document.body.style.overflow = '';
      lenisRef.current?.lenis?.start();
      ScrollTrigger.refresh();
    }
  }, [isLoaded]);

  return (
    <ReactLenis root ref={lenisRef} options={{ 
      smoothWheel: true, 
      duration: 1.2
    }}>
      <div className="app-container">
        <Loader />
        
        {/* R3F Canvas - Loads immediately behind the mask */}
        <div className="canvas-container" id="canvas-container" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 10, pointerEvents: 'none', background: 'transparent', transition: 'opacity 0.1s' }}>
          <Suspense fallback={null}>
            <Scene />
          </Suspense>
        </div>

        {/* DOM Overlay - Exact Vanilla Structure */}
        <Overlay />
      </div>
    </ReactLenis>
  )
}

function ProgressBar({ onComplete }) {
  const { progress } = useProgress();
  
  useEffect(() => {
    if (progress === 100) {
      onComplete();
    }
  }, [progress, onComplete]);

  return <div className="loader__fill" style={{ width: `${progress}%` }}></div>;
}

function Loader() {
  const setIsLoaded = useStore(state => state.setIsLoaded);
  const [hidden, setHidden] = useState(false);

  const handleComplete = useCallback(() => {
    // Cinematic pause before fading out the loader
    const timer = setTimeout(() => {
      setHidden(true);
      setIsLoaded(true); // Tell Book to start animating immediately
    }, 800);
  }, [setIsLoaded]);

  useEffect(() => {
    gsap.to('.wr', {
      y: 0,
      opacity: 1,
      duration: 1.2,
      stagger: 0.15,
      ease: 'power3.out',
      delay: 0.2
    });
    gsap.to('.loader__byline', {
      y: 0,
      opacity: 1,
      duration: 1.2,
      ease: 'power3.out',
      delay: 0.8
    });
  }, []);

  return (
    <div className={`loader ${hidden ? 'hide' : ''}`}>
      <div className="loader__inner">
        <div className="loader__wordmark">THE NEW ME</div>
        <div className="loader__bar">
          <ProgressBar onComplete={handleComplete} />
        </div>
        <div className="loader__tagline">
          <span className="wr" style={{ display: 'inline-block' }}>Decline</span>
          <span className="wr" style={{ display: 'inline-block' }}>is</span>
          <span className="wr" style={{ display: 'inline-block' }}>Optional.</span>
        </div>
        <div className="loader__byline" style={{ display: 'inline-block' }}>Gagan Dhawan</div>
      </div>
    </div>
  );
}
