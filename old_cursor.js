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

      if (closeSnapCoords) {
        // Magnetic pull to the back button circle or nav pills
        targetX = closeSnapCoords.x;
        targetY = closeSnapCoords.y;
        orbitLatched = true;
      } else if (letterSnapCoords) {
        // Magnetic letter gravity: strong pull to the letter center
        targetX = letterSnapCoords.x;
        targetY = letterSnapCoords.y;
      } else if (orbitSnapCoords) {
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

      if (orbitSnapCoords && !orbitLatched && !closeSnapCoords) {
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
      if (cursorTextWrapperRef.current) {
        cursorTextWrapperRef.current.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      }

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
