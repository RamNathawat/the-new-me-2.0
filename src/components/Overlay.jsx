import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useStore } from '../store';
import layoutHTML from '../vanilla-layout.html?raw';
import InkCanvas from './InkCanvas.jsx';

gsap.registerPlugin(ScrollTrigger);

export default function Overlay() {
  const setHoveredNode = useStore(state => state.setHoveredNode);
  const setActivePillar = useStore(state => state.setActivePillar);
  const setViewMode = useStore(state => state.setViewMode);
  const setContactAngle = useStore(state => state.setContactAngle);
  
  const overlayRef = useRef(null);
  const takeoverRef = useRef(null);
  const cursorRef = useRef(null);
  const cursorInnerRef = useRef(null);

  useEffect(() => {
    if (!overlayRef.current) return;

    // Custom ink cursor snap states
    let isSnapped = false;
    let snapTarget = null;
    const cursorInner = cursorInnerRef.current;

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
        { filter: 'blur(0px)', opacity: 1, y: 0, duration: 1.8, ease: 'expo.out', scrollTrigger: {
          trigger: el,
          start: 'top 85%'
        }}
      );
    });

    // Hero Ink Wipe Reveal
    const heroTl = gsap.timeline({ delay: 0.2 });
    
    // The text reveal precisely wipes into view
    heroTl.fromTo('#hero-reveal', 
      { clipPath: 'inset(0 100% 0 0)' }, 
      { clipPath: 'inset(0 0% 0 0)', duration: 2.2, ease: 'expo.inOut' }
    );

    // Scroll-driven parallax for the huge background text
    gsap.to('#hero-text', {
      x: '-30vw',
      opacity: 0,
      ease: 'none',
      scrollTrigger: {
        trigger: '#s-hero',
        start: 'top top',
        end: 'bottom top',
        scrub: 2.5
      }
    });

    // DNA scrollbar logic
    gsap.to('#dna-fill', {
      height: '100%',
      ease: 'none',
      scrollTrigger: {
        trigger: '#scroll-container',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 2.5
      }
    });

    // Map bio-nodes interaction
    const mapNodes = document.querySelectorAll('.map__ch');
    
    // Split map text into individual characters for localized droplet physics
    document.querySelectorAll('.map__ch-title').forEach(el => {
      if (!el.classList.contains('splitted')) {
        const text = el.innerText;
        el.innerHTML = text.split('').map(c => `<span class="ink-char">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
        el.classList.add('splitted');
      }
    });
    
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
        
        // Deactivate cursor snapping immediately on click
        orbitLatched = false;
        currentLatchedPillar = null;
        if (cursorInner) cursorInner.classList.remove('is-ring');
        
        const data = chapterData[node.id];
        if (!data) return;

        // Reset camera instantly for the transition
        gsap.to('#map-canvas', { scale: 1, x: 0, y: 0, duration: 0.3 });

        setActivePillar(node.id);
        setViewMode('transition');
        
        // Lock scroll
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';

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
      const currentMode = useStore.getState().viewMode;
      if (currentMode !== 'takeover' && currentMode !== 'transition') return;
      
      setViewMode('retract');
      
      // Release snapped state on close
      isSnapped = false;
      snapTarget = null;
      closeSnapCoords = null;
      if (cursorInner) {
        cursorInner.classList.remove('is-ring');
      }
      
      // Unlock scroll
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';

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

    // Delegate click to window to ensure it fires even if the button is within a complex stacking context
    const onGlobalClick = (e) => {
      if (e.target.closest('#takeover-close')) {
        closeTakeover();
      }
    };
    window.addEventListener('click', onGlobalClick);

    // Force close if user aggressively scrolls while locked
    const onWheel = (e) => {
      const mode = useStore.getState().viewMode;
      if ((mode === 'takeover' || mode === 'transition') && Math.abs(e.deltaY) > 20) {
        closeTakeover();
      }
    };
    window.addEventListener('wheel', onWheel, { passive: true });

    // ═══════════════════════════════════════════════════
    // PHYSICS-BASED INK CURSOR
    // ═══════════════════════════════════════════════════
    const cursor = cursorRef.current;
    const dot = cursorInnerRef.current;
    if (!cursor || !dot) {
      return () => { window.removeEventListener('wheel', onWheel); };
    }

    // Physics state
    let mx = window.innerWidth / 2, my = window.innerHeight / 2; // raw mouse
    let cx = mx, cy = my;    // current rendered position
    let vx = 0, vy = 0;      // velocity
    const spring = 0.1;      // Softer spring to reduce nervous energy
    const damping = 0.75;    // Higher damping prevents overshooting and wobble
    let cursorVisible = false;
    let cursorRafId = null;

    // Snap state
    let letterSnapCoords = null; // for text magnetism
    let closeSnapCoords = null;  // for back button magnetism
    
    // Liquid Orbit state
    let orbitSnapCoords = null;
    let orbitLatched = false;
    let currentLatchedPillar = null;
    const orbitRadius = 85;
    const orbitInfluence = 200;

    // Cache map nodes for proximity calculation
    const mapChNodes = Array.from(document.querySelectorAll('.map__ch'));

    // Set initial off-screen
    gsap.set(cursor, { x: mx, y: my, opacity: 0 });

    const onMouseMove = (e) => {
      mx = e.clientX;
      my = e.clientY;
      if (!cursorVisible) {
        cursorVisible = true;
        gsap.to(cursor, { opacity: 1, duration: 0.25, overwrite: true });
      }
    };

    // ── Physics tick ──
    const cursorTick = () => {
      let targetX, targetY;
      let distToPillar = 0;

      if (orbitSnapCoords) {
        // Liquid Magnetic Orbit: calculate distance to pillar center
        const dx = orbitSnapCoords.x - cx;
        const dy = orbitSnapCoords.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        distToPillar = dist;
        const angle = Math.atan2(dy, dx);
        
        if (orbitLatched) {
          // Anchor: lock strictly to the 85px orbital track
          targetX = orbitSnapCoords.x - Math.cos(angle) * orbitRadius;
          targetY = orbitSnapCoords.y - Math.sin(angle) * orbitRadius;
        } else {
          // Proximity Field: Still follows mouse, but stretch math will handle the viscous pull
          targetX = mx;
          targetY = my;
        }
      } else if (letterSnapCoords) {
        // Magnetic letter gravity: strong pull to the letter center
        targetX = letterSnapCoords.x;
        targetY = letterSnapCoords.y;
      } else if (closeSnapCoords) {
        // Magnetic pull to the back button circle
        targetX = closeSnapCoords.x;
        targetY = closeSnapCoords.y;
      } else {
        targetX = mx;
        targetY = my;
      }

      // Spring physics
      const ax = (targetX - cx) * spring;
      const ay = (targetY - cy) * spring;
      vx += ax;
      vy += ay;
      vx *= damping;
      vy *= damping;
      cx += vx;
      cy += vy;

      // Stretch calculation
      let angleDeg = 0;
      let sX = 1;
      let sY = 1;
      let isTeardrop = false;
      let teardropSharpness = 50; // 50% is a circle

      // Idle Breathing (pulsing scale)
      const time = performance.now() * 0.003;
      const breatheX = 1 + Math.sin(time) * 0.04;
      const breatheY = 1 + Math.cos(time * 1.1) * 0.04;

      if (orbitSnapCoords && !orbitLatched) {
        // Liquid orbit stretch: stretch heavily towards the pillar as we approach
        const dx = orbitSnapCoords.x - cx;
        const dy = orbitSnapCoords.y - cy;
        const angle = Math.atan2(dy, dx);
        angleDeg = angle * (180 / Math.PI);
        
        // The closer we get, the stronger the stretch (0 at edge, 1.5 at center)
        const pullFactor = Math.max(0, 1 - (distToPillar / orbitInfluence));
        const stretchAmt = pullFactor * 1.5;
        sX = (1 + stretchAmt) * breatheX;
        sY = Math.max(1 - stretchAmt * 0.4, 0.4) * breatheY;
        isTeardrop = true;
        teardropSharpness = Math.max(50 - (stretchAmt * 30), 0);
      } else if (letterSnapCoords) {
        // Just snap position, shrink to 0 for text gravity
        const dx = letterSnapCoords.x - cx;
        const dy = letterSnapCoords.y - cy;
        const distToCenter = Math.sqrt(dx * dx + dy * dy);
        
        if (distToCenter < 12) {
          sX = 0; sY = 0;
        } else {
          sX = 1 * breatheX; 
          sY = 1 * breatheY;
          isTeardrop = false;
        }
      } else {
        // Normal velocity-based stretch (used for free roaming and closeSnapCoords)
        // Normal velocity-based stretch
        const speed = Math.sqrt(vx * vx + vy * vy);
        const maxStretch = 0.45; // Increased max stretch for more fluid feel
        const stretchAmt = Math.min(speed / 40, maxStretch); // Stretches easier at lower speeds
        const angle = Math.atan2(vy, vx);
        angleDeg = angle * (180 / Math.PI);
        
        // Blend breathing out when moving fast
        const idleBlend = Math.max(0, 1 - speed / 5);
        const curBreatheX = 1 + (breatheX - 1) * idleBlend;
        const curBreatheY = 1 + (breatheY - 1) * idleBlend;

        sX = (1 + stretchAmt) * curBreatheX;
        sY = (1 - stretchAmt * 0.5) * curBreatheY;
        
        if (speed > 10) {
           isTeardrop = true;
           teardropSharpness = Math.max(50 - (stretchAmt * 80), 15);
        }
      }

      // Apply position via translate3d (GPU) and stretch via rotate+scale on the dot
      cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;

      if (!orbitLatched) {
        dot.style.transform = `rotate(${angleDeg}deg) scale(${sX}, ${sY})`;
        dot.style.setProperty('--cursor-rot', `${angleDeg}deg`);
        
        if (isTeardrop) {
          // Pause CSS animation and force teardrop shape pointing forward
          dot.style.animationPlayState = 'paused';
          dot.style.borderRadius = `50% ${teardropSharpness}% ${teardropSharpness}% 50%`;
        } else {
          // Revert to CSS blob morphing
          dot.style.animationPlayState = 'running';
          dot.style.borderRadius = '';
        }
      } else {
        // Clear transform when latched so CSS class .is-ring can scale it to 0
        dot.style.transform = '';
        dot.style.animationPlayState = 'running';
        dot.style.borderRadius = '';
      }

      cursorRafId = requestAnimationFrame(cursorTick);
    };
    cursorRafId = requestAnimationFrame(cursorTick);

    // ── Hover detection (links/buttons) ──
    const onMouseOver = (e) => {
      if (!dot) return;
      const t = e.target;
      const takeoverBtn = t ? t.closest('#takeover-close') : null;
      
      if (takeoverBtn) {
        dot.classList.add('is-close-btn');
        dot.classList.remove('is-link');
        const circle = takeoverBtn.querySelector('.takeover__close-circle');
        if (circle) {
          const rect = circle.getBoundingClientRect();
          closeSnapCoords = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        }
      } else if (t && t.closest && t.closest('a, button, .nav-pill, .header__cta, .takeover__close, [role="button"]')) {
        dot.classList.add('is-link');
        dot.classList.remove('is-close-btn');
        closeSnapCoords = null;
      } else {
        dot.classList.remove('is-link');
        dot.classList.remove('is-close-btn');
        closeSnapCoords = null;
      }
    };
    window.addEventListener('mouseover', onMouseOver);

    // (Magnetism handled in onMouseOver)

    const onMouseLeaveWindow = () => {
      cursorVisible = false;
      gsap.to(cursor, { opacity: 0, duration: 0.2, overwrite: true });
    };
    const onMouseEnterWindow = () => {
      cursorVisible = true;
      gsap.to(cursor, { opacity: 1, duration: 0.2, overwrite: true });
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseover', onMouseOver, { passive: true });
    document.documentElement.addEventListener('mouseleave', onMouseLeaveWindow);
    document.documentElement.addEventListener('mouseenter', onMouseEnterWindow);

    // ═══════════════════════════════════════════════════
    // JELLO TEXT INTERACTION (Portfolio-style, per-letter)
    // Split text into individual char spans, then hit-test each
    // ═══════════════════════════════════════════════════
    const jelloRoot = overlayRef.current;
    const jelloContainers = jelloRoot.querySelectorAll('.headline, .label');

    // Split each container's text into per-character spans
    jelloContainers.forEach((el) => {
      // Don't re-split if already done
      if (el.dataset.jelloSplit) return;
      el.dataset.jelloSplit = '1';

      const fragment = document.createDocumentFragment();
      // Walk childNodes to preserve <br> tags
      el.childNodes.forEach((child) => {
        if (child.nodeType === Node.ELEMENT_NODE && child.tagName === 'BR') {
          fragment.appendChild(child.cloneNode());
        } else if (child.nodeType === Node.TEXT_NODE) {
          const text = child.textContent;
          for (const ch of text) {
            if (ch === ' ') {
              // Non-breaking space wrapper
              const sp = document.createElement('span');
              sp.textContent = '\u00A0';
              sp.style.display = 'inline-block';
              fragment.appendChild(sp);
            } else {
              const span = document.createElement('span');
              span.textContent = ch;
              span.className = 'jello-char';
              span.style.display = 'inline-block';
              fragment.appendChild(span);
            }
          }
        }
      });
      el.textContent = '';
      el.appendChild(fragment);
    });

    // Now target every .jello-char for hit-testing
    const jelloChars = jelloRoot.querySelectorAll('.jello-char');
    const jelloState = new Map();

    jelloChars.forEach((el) => {
      jelloState.set(el, { inside: false, tween: null });
    });

    // Check interactions on each mouse move
    const checkProximity = (clientX, clientY) => {
      
      // 1. Check Pillars for Liquid Orbit
      let closestPillarDist = Infinity;
      let closestPillar = null;

      if (useStore.getState().viewMode === 'map') {
        mapChNodes.forEach((node) => {
          const rect = node.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const dist = Math.sqrt(Math.pow(clientX - cx, 2) + Math.pow(clientY - cy, 2));
          if (dist < closestPillarDist) {
            closestPillarDist = dist;
            closestPillar = { node, cx, cy };
          }
        });
      }

      const svgOrbit = null;
      const svgCircle = null;

      if (closestPillar && closestPillarDist < orbitInfluence) {
        orbitSnapCoords = { x: closestPillar.cx, y: closestPillar.cy };
        
        // Adjust mapCanvas data-focused logic (previously handled by mouseenter)
        const mapCanvas = document.getElementById('map-canvas');
        if (mapCanvas && mapCanvas.getAttribute('data-focused') !== closestPillar.node.id) {
            mapCanvas.setAttribute('data-focused', closestPillar.node.id);
        }

        const currentPulling = useStore.getState().pullingPillar;

        if (closestPillarDist <= orbitRadius) {
          if (currentPulling) useStore.getState().setPullingPillar(null);

          if (!orbitLatched || currentLatchedPillar !== closestPillar.node) {
            orbitLatched = true;
            currentLatchedPillar = closestPillar.node;
            
              const dx = clientX - closestPillar.cx;
              const dy = clientY - closestPillar.cy;
              const contactAngle = Math.atan2(dy, dx); // radians
              setContactAngle(contactAngle);
              
              // Latch impact: Hide the cursor dot
            if (cursorInner) cursorInner.classList.add('is-ring');
          }
        } else {
          // Within influence zone, but unlatched (Gravity Well active)
          if (!currentPulling || currentPulling.cx !== closestPillar.cx || currentPulling.cy !== closestPillar.cy) {
            useStore.getState().setPullingPillar({ cx: closestPillar.cx, cy: closestPillar.cy, id: closestPillar.node.id });
          }

          if (orbitLatched) {
             orbitLatched = false;
             currentLatchedPillar = null;
             if (cursorInner) cursorInner.classList.remove('is-ring');
          }
        }
      } else {
        // Outside influence zone completely
        orbitSnapCoords = null;
        
        const currentPulling = useStore.getState().pullingPillar;
        if (currentPulling) useStore.getState().setPullingPillar(null);

        if (orbitLatched) {
          orbitLatched = false;
          currentLatchedPillar = null;
          if (cursorInner) cursorInner.classList.remove('is-ring');
        }
        
        // Remove data-focused if moving away from all pillars
        const mapCanvas = document.getElementById('map-canvas');
        if (mapCanvas && mapCanvas.hasAttribute('data-focused')) {
            mapCanvas.removeAttribute('data-focused');
        }
      }

      // Track previous letter to detect transitions
      if (typeof window.previousClosestLetter === 'undefined') {
        window.previousClosestLetter = null;
      }

      // 2. Check Letters (only if not influenced by a pillar)
      if (orbitSnapCoords) {
        letterSnapCoords = null;
      } else {
        let closestLetter = null;
        let minDistance = 80;

        jelloChars.forEach((el) => {
          const rect = el.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          
          const dist = Math.sqrt(Math.pow(clientX - cx, 2) + Math.pow(clientY - cy, 2));

          if (dist < minDistance) {
            minDistance = dist;
            closestLetter = el;
            letterSnapCoords = { x: cx, y: cy };
          }
        });

        if (!closestLetter) {
          letterSnapCoords = null;
        }

        // Check if we moved from one letter to another
        if (closestLetter !== window.previousClosestLetter) {
           if (window.previousClosestLetter && closestLetter) {
               const parent = closestLetter.parentElement;
               if (parent === window.previousClosestLetter.parentElement) {
                 const rectA = window.previousClosestLetter.getBoundingClientRect();
                 const rectB = closestLetter.getBoundingClientRect();
                 
                 const ax = rectA.left + rectA.width / 2;
                 const ay = rectA.top + rectA.height / 2;
                 const bx = rectB.left + rectB.width / 2;
                 const by = rectB.top + rectB.height / 2;
                 
                 const dist = Math.sqrt(Math.pow(bx - ax, 2) + Math.pow(by - ay, 2));
                 
                 const svg = document.getElementById('ink-veins');
                 if (svg) {
                    const drawVein = (ox1, oy1, ox2, oy2, width, duration, delay) => {
                       const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                       line.setAttribute('x1', ax + ox1);
                       line.setAttribute('y1', ay + oy1);
                       line.setAttribute('x2', bx + ox2);
                       line.setAttribute('y2', by + oy2);
                       line.setAttribute('stroke', '#0d1311');
                       line.setAttribute('stroke-width', width);
                       line.setAttribute('stroke-linecap', 'round');
                       line.style.strokeDasharray = dist + 20;
                       line.style.strokeDashoffset = dist + 20;
                       svg.appendChild(line);
                       
                       gsap.to(line, {
                          strokeDashoffset: 0,
                          duration: duration,
                          ease: 'power2.out',
                          delay: delay,
                          onComplete: () => {
                             gsap.to(line, {
                                strokeDashoffset: -(dist + 20),
                                duration: duration,
                                ease: 'power2.in',
                                onComplete: () => line.remove()
                             });
                          }
                       });
                    };

                    // Core thick vein (center)
                    drawVein(0, 0, 0, 0, '6', 0.15, 0);
                    // Top structural string
                    drawVein(0, -12, 0, -8, '3', 0.18, 0.02);
                    // Bottom structural string
                    drawVein(0, 15, 0, 10, '2.5', 0.16, 0.04);
                    // Chaotic micro-string 1
                    drawVein(5, -20, -5, -15, '1.5', 0.22, 0.05);
                    // Chaotic micro-string 2
                    drawVein(-5, 20, 5, 25, '1', 0.25, 0.07);
                 }
               }
           }
           window.previousClosestLetter = closestLetter;
        }

        jelloChars.forEach((el) => {
          const state = jelloState.get(el);
          const isClosest = el === closestLetter;

          if (isClosest && !state.inside) {
            state.inside = true;
            el.classList.add('is-active-char');
            if (state.tween) state.tween.kill();
            state.tween = gsap.timeline()
              .to(el, { scaleX: 0.92, scaleY: 1.08, duration: 0.35, ease: 'power2.out' })
              .to(el, { scaleX: 1.04, scaleY: 0.96, duration: 0.15, ease: 'power1.inOut' })
              .to(el, { scaleX: 0.98, scaleY: 1.02, duration: 0.15, ease: 'power1.inOut' })
              .to(el, { scaleX: 1, scaleY: 1, duration: 0.35, ease: 'power2.out' });
          } else if (!isClosest && state.inside) {
            state.inside = false;
            el.classList.remove('is-active-char');
            if (state.tween) state.tween.kill();
            state.tween = gsap.to(el, { scale: 1, duration: 0.3, ease: 'power2.out' });
          }
        });
      }
    };

    // Piggyback on the existing mousemove — extend the handler
    const origMouseMove = onMouseMove;
    const jelloMouseMove = (e) => {
      origMouseMove(e);
      checkProximity(e.clientX, e.clientY);
    };
    // Replace the listener
    window.removeEventListener('mousemove', onMouseMove);
    window.addEventListener('mousemove', jelloMouseMove, { passive: true });

    return () => {
      window.removeEventListener('click', onGlobalClick);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('mousemove', jelloMouseMove);
      window.removeEventListener('mouseover', onMouseOver);
      document.documentElement.removeEventListener('mouseleave', onMouseLeaveWindow);
      document.documentElement.removeEventListener('mouseenter', onMouseEnterWindow);
      if (cursorRafId) cancelAnimationFrame(cursorRafId);
      jelloState.forEach((state) => { if (state.tween) state.tween.kill(); });
    };
  }, []);

  // Strict scroll lock during takeover
  useEffect(() => {
    const killScroll = (e) => {
      if (useStore.getState().viewMode === 'takeover') {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    
    // Bind at the capture phase to intercept before Lenis or any other listener gets it
    window.addEventListener('wheel', killScroll, { passive: false, capture: true });
    window.addEventListener('touchmove', killScroll, { passive: false, capture: true });
    
    return () => {
      window.removeEventListener('wheel', killScroll, { capture: true });
      window.removeEventListener('touchmove', killScroll, { capture: true });
    };
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

      {/* Master Wrapper for Liquid Fusion */}
      <div className="gooey-wrapper">
        <InkCanvas />
        <svg id="ink-veins" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 14 }}></svg>
        <div id="ink-cursor" ref={cursorRef}>
          <div className="ink-cursor__dot" ref={cursorInnerRef}></div>
        </div>
      </div>
      
      {/* SVG Goo Filter Definition */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true">
        <filter id="goo">
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
          <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8" result="goo" />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </svg>
    </div>
  );
}
