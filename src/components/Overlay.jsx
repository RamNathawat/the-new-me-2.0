import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useStore } from '../store';
import layoutHTML from '../vanilla-layout.html?raw';

gsap.registerPlugin(ScrollTrigger);

export default function Overlay() {
  const setHoveredNode = useStore(state => state.setHoveredNode);
  const overlayRef = useRef();

  useEffect(() => {
    if (!overlayRef.current) return;

    // Remove the intro loader immediately since we are in dev/R3F now
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'none';

    // Make header visible
    const header = document.getElementById('site-header');
    if (header) {
      header.classList.add('on');
    }

    // Blur Reveal logic for headlines and body text
    gsap.utils.toArray('.headline, .story__panel--b, .tr, .label').forEach((el) => {
      gsap.fromTo(el, 
        { filter: 'blur(12px)', opacity: 0, y: 30 },
        { filter: 'blur(0px)', opacity: 1, y: 0, duration: 1.5, ease: 'power3.out', scrollTrigger: {
          trigger: el,
          start: 'top 85%'
        }}
      );
    });

    // Hero Background Text - Swipe in from right, transition from white to sage-deep
    gsap.fromTo('.bg-char',
      { x: 300, color: '#FFFFFF', opacity: 0 },
      {
        x: 0,
        color: '#2D5A27', // sage-deep
        opacity: 0.08,
        duration: 2.5,
        stagger: 0.15,
        ease: 'power4.out',
        delay: 0.5
      }
    );

    // DNA scrollbar logic
    gsap.to('#dna-fill', {
      height: '100%',
      ease: 'none',
      scrollTrigger: {
        trigger: '#scroll-container',
        start: 'top top',
        end: 'bottom bottom',
        scrub: true
      }
    });

    // Map bio-nodes interaction
    const mapNodes = document.querySelectorAll('.map__ch');
    mapNodes.forEach((node) => {
      // Add pulsing glow to each node
      const pulse = document.createElement('div');
      pulse.className = 'bio-pulse';
      node.appendChild(pulse);

      node.addEventListener('mouseenter', () => setHoveredNode(node.id));
      node.addEventListener('mouseleave', () => setHoveredNode(null));
    });

  }, []);

  return (
    <div className="overlay-wrapper" ref={overlayRef}>
      {/* Injecting the exact Vanilla HTML layout safely */}
      <div dangerouslySetInnerHTML={{ __html: layoutHTML }} />

      {/* Progress DNA Bar (Custom scrollbar as requested) */}
      <div id="dna-bar" style={{
        position: 'fixed', right: '1.5rem', top: '20%', height: '60%', width: '3px',
        backgroundColor: 'rgba(0,0,0,0.05)', zIndex: 100, borderRadius: '4px', overflow: 'hidden'
      }}>
        <div id="dna-fill" style={{
          width: '100%', backgroundColor: '#2D5A27', height: '0%',
          boxShadow: '0 0 10px #2D5A27'
        }}></div>
      </div>
    </div>
  );
}
