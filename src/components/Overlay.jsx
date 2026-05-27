import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useStore } from '../store';
import { useGLTF } from '@react-three/drei';
import layoutHTML from '../vanilla-layout.html?raw';
import InkCanvas from './InkCanvas.jsx';

gsap.registerPlugin(ScrollTrigger);

export default function Overlay() {
  const setHoveredNode = useStore(state => state.setHoveredNode);
  const setActivePillar = useStore(state => state.setActivePillar);
  const setViewMode = useStore(state => state.setViewMode);
  
  const overlayRef = useRef(null);
  const takeoverRef = useRef(null);

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
    const mapTakeover = document.getElementById('map-takeover');
    const takeoverClose = document.getElementById('takeover-close');
    takeoverRef.current = mapTakeover;

    // Premium Editorial Content
    const chapterData = {
      'ch-nutrition': { num: '01', category: 'Nutrition', title: 'Food as Fuel.', sub: 'Reversing markers through plant-based inquiry.', body: "<p>When high cholesterol and rising sugar levels threatened a lifetime of daily pills, Gagan chose a different path: complete biological reboot. He removed animal products, refined sugars, and processed oils entirely, shifting his body's fuel source to organic, nutrient-dense plants.</p><p>Within ninety days, the blood panels told a different story. The markers didn't just improve; they completely normalized. Nutrition was no longer a matter of taste, but a form of biochemistry—a precise tool to restore equilibrium and reverse the indicators of age and stress.</p><p>This chapter is the blueprint of that transition: how to restructure your plates, decode the body's responses, and treat nutrition as the first line of defense.</p>" },
      'ch-fitness': { num: '02', category: 'Movement', title: 'Disciplined Motion.', sub: 'Biomechanical resilience and functional power over time.', body: "<p>Fitness is not a temporary phase or a vanity project; it is the physical framework that preserves your healthspan. Structured movement is the required daily ritual that rebuilds bone density, joint mobility, and cardiac output.</p><p>By focusing on biomechanical efficiency, compound strength, and cardiovascular thresholds, Gagan created a body capable of handling high stress and demanding physical loads well into his fifties.</p><p>Here lies the manual for sustainable physical empowerment: from mobility protocols and strength routines to aerobic foundations that prevent the typical physical decline accepted as inevitable by modern society.</p>" },
      'ch-sleep': { num: '03', category: 'Recovery', title: 'Restorative Sleep.', sub: 'Deep cellular repair and neural down-regulation.', body: "<p>Without recovery, effort is merely damage. The modern high-performance life glorifies sleeplessness, yet sleep is the single most powerful therapeutic mechanism available to the human body.</p><p>Gagan prioritized circadian alignment, sleep hygiene, and down-regulation protocols to achieve deep, uninterrupted REM and slow-wave sleep. This allowed his nervous system to clear metabolic waste and repair tissue damage.</p><p>In this chapter, explore the mechanics of sleep architecture: how to engineer your sleeping environment, manage blue-light exposure, and employ natural relaxation methods to wake up fully restored.</p>" },
      'ch-mindset': { num: '04', category: 'Mindset', title: 'The Mental Shift.', sub: 'Rewiring the subconscious for limitless ownership.', body: "<p>Every physical transformation is a mental conquest. Declining health is often accompanied by a sense of resignation, a belief that 'this is just what happens when you age.' The first and most critical hurdle is to reject that premise.</p><p>By shifting from passive compliance to active inquiry, Gagan took full ownership of his healthspan. Mindset is about developing the focus and consistency needed to execute these changes day in and day out, even when motivation fades.</p><p>This final chapter details the psychological tools of the transition: how to break toxic habits, build unbreakable consistency, and adopt the mental model of a self-repairing system.</p>" }
    };

    // Scroll lock logic will be handled below

    mapNodes.forEach((node) => {
      const pulse = document.createElement('div');
      pulse.className = 'bio-pulse';
      node.appendChild(pulse);

      node.addEventListener('mouseenter', () => {
        if (useStore.getState().viewMode !== 'map') return;
        setHoveredNode(node.id);

        const mapCanvas = document.getElementById('map-canvas');
        if (mapCanvas) mapCanvas.setAttribute('data-focused', node.id);

        // Camera zoom — scale up and translate toward the hovered word
        const rect = node.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const offsetX = (vw / 2 - (rect.left + rect.width / 2)) * 0.15;
        const offsetY = (vh / 2 - (rect.top + rect.height / 2)) * 0.15;

        gsap.to('#map-canvas', {
          scale: 1.12,
          x: offsetX,
          y: offsetY,
          duration: 0.9,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      });
      
      node.addEventListener('mouseleave', () => {
        if (useStore.getState().viewMode !== 'map') return;
        setHoveredNode(null);

        const mapCanvas = document.getElementById('map-canvas');
        if (mapCanvas) mapCanvas.removeAttribute('data-focused');

        gsap.to('#map-canvas', {
          scale: 1,
          x: 0,
          y: 0,
          duration: 0.7,
          ease: 'power2.inOut',
          overwrite: 'auto',
        });
      });
      
      node.addEventListener('click', () => {
        const currentMode = useStore.getState().viewMode;
        if (currentMode !== 'map') return;
        
        const data = chapterData[node.id];
        if (!data) return;

        // Reset camera instantly for the transition
        gsap.to('#map-canvas', { scale: 1, x: 0, y: 0, duration: 0.3 });

        setActivePillar(node.id);
        setViewMode('transition');
        
        // Lock scroll
        document.body.style.overflow = 'hidden';

        // Set illustration image
        const imgMap = {
          'ch-nutrition': '/img/nutrition.png',
          'ch-fitness': '/img/movement.png',
          'ch-sleep': '/img/recovery.png',
          'ch-mindset': '/img/mindset.png'
        };
        const takeoverImg = document.getElementById('takeover-image');
        if (takeoverImg) takeoverImg.src = imgMap[node.id];

        // Prepare content
        document.getElementById('takeover-num').textContent = data.num;
        document.getElementById('takeover-category').textContent = data.category;
        document.getElementById('takeover-title').textContent = data.title;
        document.getElementById('takeover-subtitle').textContent = data.sub;
        document.getElementById('takeover-body').innerHTML = data.body;

        // Prepare the elements for animation
        const contentElements = mapTakeover.querySelectorAll('.takeover__content > *');
        gsap.set(contentElements, { opacity: 0, y: 30, filter: 'blur(10px)' });
        if (takeoverImg) gsap.set(takeoverImg, { opacity: 0 });

        // Fade out map nodes and DNA bar
        gsap.to(['.map__ch', '#dna-bar'], { opacity: 0, pointerEvents: 'none', duration: 0.5 });

        // Timeline for the visual storytelling reveal
        setTimeout(() => {
          mapTakeover.classList.add('open');
          
          gsap.to(contentElements, {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: 1.2,
            stagger: 0.1,
            ease: 'power3.out',
            onComplete: () => {
              setViewMode('takeover');
            }
          });
          
          if (takeoverImg) {
            gsap.to(takeoverImg, {
              opacity: 1,
              duration: 2,
              ease: 'power2.out'
            });
          }
        }, 600);
      });
    });

    const closeTakeover = () => {
      if (useStore.getState().viewMode !== 'takeover') return;
      setViewMode('retract');
      
      // Unlock scroll
      document.body.style.overflow = '';

      // Fade map nodes and DNA bar back in
      gsap.to(['.map__ch', '#dna-bar'], { opacity: 1, pointerEvents: 'auto', duration: 0.8, delay: 0.2 });

      const contentElements = mapTakeover.querySelectorAll('.takeover__content > *');
      const takeoverImg = document.getElementById('takeover-image');
      
      gsap.to(contentElements, {
        opacity: 0,
        y: -20,
        duration: 0.6,
        stagger: 0.05,
        ease: 'power3.in'
      });
      
      if (takeoverImg) {
        gsap.to(takeoverImg, { opacity: 0, duration: 0.6 });
      }
      
      // Animate the map back into view
      setTimeout(() => {
        gsap.to('#map-canvas', {
          scale: window.innerWidth < 768 ? 0.7 : 0.9,
          x: 0,
          y: 0,
          duration: 1.2,
          ease: 'power3.out',
        });

        mapTakeover.classList.remove('open');
        setTimeout(() => {
          setViewMode('map');
          setActivePillar(null);
        }, 1200);
      }, 300);
    };

    if (takeoverClose) {
      takeoverClose.addEventListener('click', closeTakeover);
    }

    // Force close if user aggressively scrolls while locked
    const onWheel = (e) => {
      const mode = useStore.getState().viewMode;
      if ((mode === 'takeover' || mode === 'transition') && Math.abs(e.deltaY) > 20) {
        closeTakeover();
      }
    };
    window.addEventListener('wheel', onWheel, { passive: true });
    
    return () => {
      window.removeEventListener('wheel', onWheel);
    };
  }, []);
  return (
    <div className="overlay-wrapper" ref={overlayRef}>
      {/* Injecting the exact Vanilla HTML layout safely */}
      <div dangerouslySetInnerHTML={{ __html: layoutHTML }} />

      {/* Arrival-style ink canvas — renders behind the map buttons */}
      <InkCanvas />

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
