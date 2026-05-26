import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useStore } from '../store';
import { useGLTF } from '@react-three/drei';
import layoutHTML from '../vanilla-layout.html?raw';

gsap.registerPlugin(ScrollTrigger);

export default function Overlay() {
  const setHoveredNode = useStore(state => state.setHoveredNode);
  const overlayRef = useRef(null);
  const hoverMaskRef = useRef(null);
  const hoverImgRef = useRef(null);
  const mapCardRef = useRef(null);

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

    let cardOpen = false;

    // Map bio-nodes interaction
    const mapNodes = document.querySelectorAll('.map__ch');
    const mapCard = document.getElementById('map-card');
    const mapBackdrop = document.getElementById('map-backdrop');
    const mapClose = document.getElementById('map-card-close');
    mapCardRef.current = mapCard;

    // Data for the chapters (adding images for the wow factor hover)
    const chapterData = {
      'ch-nutrition': { img: '/abstract-nutrition.jpg', ch: '01 — Nutrition', title: 'Food as Fuel.', sub: 'Reversing markers through plant-based nutrition.', body: "<p>When the numbers demanded change, the first shift was on the plate. Nutrition became the primary tool to combat high cholesterol and sugar markers without relying on lifelong prescriptions.</p>" },
      'ch-fitness': { img: '/abstract-fitness.jpg', ch: '02 — Movement', title: 'Disciplined Motion.', sub: 'Building resilience over time.', body: "<p>Fitness is not a trend, but a required daily habit. Structured movement rebuilds the body's capacity to handle stress and prevents the physical decline that many accept as normal.</p>" },
      'ch-sleep': { img: '/abstract-sleep.jpg', ch: '03 — Recovery', title: 'Restorative Sleep.', sub: 'The most underrated pillar of health.', body: "<p>Without proper recovery, every other effort is compromised. Deep, restorative sleep allows the body to repair the damage of the day and reset for the next.</p>" },
      'ch-mindset': { img: '/abstract-mindset.jpg', ch: '04 — Mindset', title: 'The Mental Shift.', sub: 'Choosing inquiry over resignation.', body: "<p>Transformation requires a complete shift in how you view yourself and your future. It is about believing that decline is optional and taking ownership of your healthspan.</p>" }
    };

    // Close function with fluid GSAP
    const closeCard = () => {
      if (!cardOpen) return;
      cardOpen = false;
      mapBackdrop.classList.remove('on');
      
      gsap.to(mapCard, {
        y: '100%',
        duration: 0.6,
        ease: "power3.inOut",
        onComplete: () => {
          mapCard.classList.remove('open');
          // Important: remove inline styles so CSS bottom takes over if needed
          gsap.set(mapCard, { clearProps: "y" });
        }
      });
      setHoveredNode(null);
    };

    // Close on scroll mechanic
    const onScroll = () => {
      if (cardOpen) closeCard();
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    // Track mouse for the hover mask
    const onMouseMove = (e) => {
      if (hoverMaskRef.current) {
        gsap.to(hoverMaskRef.current, {
          x: e.clientX,
          y: e.clientY,
          duration: 0.6,
          ease: "power2.out",
          overwrite: "auto"
        });
      }
    };
    window.addEventListener('mousemove', onMouseMove);

    mapNodes.forEach((node) => {
      // Add pulsing glow to each node
      const pulse = document.createElement('div');
      pulse.className = 'bio-pulse';
      node.appendChild(pulse);

      node.addEventListener('mouseenter', () => {
        if (cardOpen) return;
        setHoveredNode(node.id);
        const data = chapterData[node.id];
        if (data && hoverMaskRef.current && hoverImgRef.current) {
          // You can replace these image sources with actual assets later
          // hoverImgRef.current.src = data.img; 
          // For now, let's just make the mask a stunning solid vibrant gradient based on the node
          const gradients = {
            'ch-nutrition': 'radial-gradient(circle at center, rgba(197, 216, 109, 0.8) 0%, rgba(45, 90, 39, 0) 70%)',
            'ch-fitness': 'radial-gradient(circle at center, rgba(244, 162, 97, 0.8) 0%, rgba(231, 111, 81, 0) 70%)',
            'ch-sleep': 'radial-gradient(circle at center, rgba(138, 150, 144, 0.8) 0%, rgba(26, 26, 26, 0) 70%)',
            'ch-mindset': 'radial-gradient(circle at center, rgba(232, 77, 49, 0.8) 0%, rgba(45, 90, 39, 0) 70%)'
          };
          const keywords = {
            'ch-nutrition': 'NOURISH',
            'ch-fitness': 'MOTION',
            'ch-sleep': 'REST',
            'ch-mindset': 'BELIEVE'
          };
          hoverImgRef.current.style.background = gradients[node.id];
          if (hoverTextRef.current) hoverTextRef.current.textContent = keywords[node.id];
          
          gsap.to(hoverMaskRef.current, {
            scale: 1,
            opacity: 1,
            duration: 0.8,
            ease: "elastic.out(1, 0.75)"
          });
        }
      });
      
      node.addEventListener('mouseleave', () => {
        if (cardOpen) return;
        setHoveredNode(null);
        if (hoverMaskRef.current) {
          gsap.to(hoverMaskRef.current, {
            scale: 0,
            opacity: 0,
            duration: 0.4,
            ease: "power2.in"
          });
        }
      });
      
      node.addEventListener('click', () => {
        const data = chapterData[node.id];
        if (data && !cardOpen) {
          cardOpen = true;
          document.getElementById('map-card-ch').textContent = data.ch;
          document.getElementById('map-card-title').textContent = data.title;
          document.getElementById('map-card-subtitle').textContent = data.sub;
          document.getElementById('map-card-body').innerHTML = data.body;
          
          // Hide hover mask when clicked
          if (hoverMaskRef.current) {
            gsap.to(hoverMaskRef.current, { scale: 0, opacity: 0, duration: 0.3 });
          }
          
          mapBackdrop.classList.add('on');
          mapCard.classList.add('open');
          
          // Fluid GSAP entry animation
          gsap.fromTo(mapCard, 
            { y: '100%' }, 
            { y: '0%', duration: 0.8, ease: "elastic.out(1, 0.8)" }
          );
          
          // Also set hover state to stick to this node while open
          setHoveredNode(node.id);
        }
      });
    });

    if (mapClose && mapBackdrop) {
      mapClose.addEventListener('click', closeCard);
      mapBackdrop.addEventListener('click', closeCard);
    }
    
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  // Added ref for the text inside the blob
  const hoverTextRef = useRef(null);

  return (
    <div className="overlay-wrapper" ref={overlayRef}>
      {/* Expanding Hover Preview Mask (Elegant & Airy) */}
      <div ref={hoverMaskRef} style={{
        position: 'fixed',
        top: 0, left: 0,
        width: '180px', height: '180px',
        marginLeft: '-90px', marginTop: '-90px',
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: 50,
        overflow: 'hidden',
        scale: 0,
        opacity: 0,
        boxShadow: '0 20px 40px rgba(0,0,0,0.1), inset 0 0 20px rgba(255,255,255,0.5)',
        transformOrigin: 'center center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.2)'
      }}>
        <div ref={hoverImgRef} style={{
          position: 'absolute',
          top: '-20%', left: '-20%',
          width: '140%', height: '140%',
          background: 'var(--sage)',
          zIndex: 1,
          filter: 'blur(30px)', /* Creates the ethereal aurora light leak */
          opacity: 0.8
        }}></div>
        <span ref={hoverTextRef} style={{
          position: 'relative',
          zIndex: 2,
          fontFamily: 'var(--fe)',
          fontSize: '1.4rem',
          fontWeight: '400',
          letterSpacing: '0.15em',
          color: 'var(--dark)',
          textAlign: 'center',
          lineHeight: 1,
          textTransform: 'uppercase'
        }}></span>
      </div>

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
