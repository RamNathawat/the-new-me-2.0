import React, { useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store';

// ─── Seeded random ───
function seedRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// ─── Generate a single Arrival-style logogram ───
function generateLogogram(seed, opts = {}) {
  const {
    radius = 140,
    strokeWidth = 6,
    poolCount = 2,
    poolSize = 30,
    splatterCount = 15,
    tendrilCount = 5,
    arcWobble = 14,      // how irregular the ring is
    arcWidthVar = 1.5,   // thickness variation
    tendrilLength = 300,  // how far tendrils reach
    tendrilCurve = 0.4,  // how much tendrils bend
  } = opts;

  const rng = seedRandom(seed);
  const strokes = [];

  // 1. Main circular ring — overlapping thick bezier arcs
  const arcCount = 28 + Math.floor(rng() * 12);
  for (let i = 0; i < arcCount; i++) {
    const a0 = (i / arcCount) * Math.PI * 2;
    const a1 = ((i + 1) / arcCount) * Math.PI * 2;
    const aMid = (a0 + a1) / 2;

    const r0 = radius + (rng() - 0.5) * arcWobble;
    const r1 = radius + (rng() - 0.5) * arcWobble;
    const rMid = radius + (rng() - 0.5) * arcWobble * 1.4;

    const width = strokeWidth * (0.5 + rng() * arcWidthVar);

    strokes.push({
      type: 'arc',
      x0: Math.cos(a0) * r0,
      y0: Math.sin(a0) * r0,
      cx: Math.cos(aMid) * rMid,
      cy: Math.sin(aMid) * rMid,
      x1: Math.cos(a1) * r1,
      y1: Math.sin(a1) * r1,
      width,
      order: i / arcCount,
    });
  }

  // 2. Dense ink pools
  for (let p = 0; p < poolCount; p++) {
    const angle = rng() * Math.PI * 2;
    const r = radius + (rng() - 0.5) * 20;
    const size = poolSize * (0.5 + rng());
    strokes.push({
      type: 'pool',
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r,
      size,
      order: angle / (Math.PI * 2),
    });
  }

  // 3. Splatters
  for (let s = 0; s < splatterCount; s++) {
    const angle = rng() * Math.PI * 2;
    const dist = radius + 8 + rng() * 40;
    const size = 1.5 + rng() * 3.5;
    strokes.push({
      type: 'splatter',
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      size,
      order: angle / (Math.PI * 2),
    });
  }

  // 4. Tendrils
  for (let t = 0; t < tendrilCount; t++) {
    const angle = rng() * Math.PI * 2;
    const startR = radius + (rng() - 0.5) * 10;
    const len = tendrilLength * (0.5 + rng());
    const endR = startR + len;
    const midAngle = angle + (rng() - 0.5) * tendrilCurve;
    const midR = startR + len * (0.3 + rng() * 0.4);

    const width = strokeWidth * (0.15 + rng() * 0.5);

    strokes.push({
      type: 'tendril',
      x0: Math.cos(angle) * startR,
      y0: Math.sin(angle) * startR,
      cx: Math.cos(midAngle) * midR,
      cy: Math.sin(midAngle) * midR,
      x1: Math.cos(angle) * endR,
      y1: Math.sin(angle) * endR,
      width,
      order: 0.82 + rng() * 0.18,
    });
  }

  return strokes;
}

const LOGOGRAMS = {
  'ch-nutrition': generateLogogram(42, {
    radius: 170, strokeWidth: 10, arcWobble: 12, arcWidthVar: 1.8,
    poolCount: 3, poolSize: 50, splatterCount: 8, tendrilCount: 0,
    tendrilLength: 350, tendrilCurve: 0.25,
  }),
  'ch-fitness': generateLogogram(137, {
    radius: 180, strokeWidth: 5, arcWobble: 24, arcWidthVar: 2.5,
    poolCount: 1, poolSize: 25, splatterCount: 35, tendrilCount: 0,
    tendrilLength: 500, tendrilCurve: 0.7,
  }),
  'ch-sleep': generateLogogram(291, {
    radius: 160, strokeWidth: 12, arcWobble: 6, arcWidthVar: 0.8,
    poolCount: 1, poolSize: 22, splatterCount: 5, tendrilCount: 0,
    tendrilLength: 200, tendrilCurve: 0.15,
  }),
  'ch-mindset': generateLogogram(777, {
    radius: 175, strokeWidth: 7, arcWobble: 16, arcWidthVar: 1.4,
    poolCount: 4, poolSize: 35, splatterCount: 20, tendrilCount: 0,
    tendrilLength: 400, tendrilCurve: 0.6,
  }),
};

// Organic warp function applied to point coordinates based on mouse proximity
function getWarpedPoint(px, py, cx, cy, scale, mx, my, isTransitioning, transitionProgress) {
  // Global position of point
  let gx = cx + px * scale;
  let gy = cy + py * scale;
  
  if (isTransitioning) {
    // During transition, points fly outward from the center
    const expandForce = transitionProgress * 1500;
    const angle = Math.atan2(py, px);
    return {
      x: gx + Math.cos(angle) * expandForce,
      y: gy + Math.sin(angle) * expandForce
    };
  }

  // Hover magnetic warp
  if (mx === 0 && my === 0) return { x: gx, y: gy }; // No mouse

  const dx = gx - mx;
  const dy = gy - my;
  const distSq = dx * dx + dy * dy;
  
  if (distSq < 40000) { // 200*200
    const dist = Math.sqrt(distSq);
    const force = Math.pow(1 - dist / 200, 2) * 35; // Maximum 35px pull
    return {
      x: gx - (dx / dist) * force,
      y: gy - (dy / dist) * force
    };
  }
  
  return { x: gx, y: gy };
}

// ─── Draw a logogram at a given progress ───
function drawLogogram(ctx, strokes, progress, cx, cy, color, scale, mx, my, isTransitioning, transitionProgress, contactAngle) {
  ctx.save();

  for (const s of strokes) {
    let dynamicOrder = s.order;
    if (contactAngle !== undefined && contactAngle !== null) {
      const strokeAngle = s.order * 2 * Math.PI;
      let diff = Math.abs(strokeAngle - contactAngle);
      diff = diff % (Math.PI * 2);
      if (diff > Math.PI) diff = 2 * Math.PI - diff;
      dynamicOrder = diff / Math.PI;
    }

    let strokeProgress = Math.max(0, Math.min(1, (progress * 1.15 - dynamicOrder) / 0.15));
    if (isTransitioning) strokeProgress = 1;
    if (strokeProgress <= 0) continue;

    const alpha = isTransitioning ? (1 - transitionProgress) : strokeProgress;
    if (alpha <= 0) continue;

    if (s.type === 'arc') {
      const p0 = getWarpedPoint(s.x0, s.y0, cx, cy, scale, mx, my, isTransitioning, transitionProgress);
      const p1 = getWarpedPoint(s.x1, s.y1, cx, cy, scale, mx, my, isTransitioning, transitionProgress);
      const pMid = getWarpedPoint(s.cx, s.cy, cx, cy, scale, mx, my, isTransitioning, transitionProgress);

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha * 0.92;
      ctx.lineWidth = s.width * strokeProgress * scale * (isTransitioning ? 1 + transitionProgress * 3 : 1);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(p0.x, p0.y);
      ctx.quadraticCurveTo(pMid.x, pMid.y, p1.x, p1.y);
      ctx.stroke();
    } else if (s.type === 'pool') {
      const p = getWarpedPoint(s.x, s.y, cx, cy, scale, mx, my, isTransitioning, transitionProgress);
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha * 0.85;
      const count = 5;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const ox = Math.cos(angle) * s.size * 0.25 * scale;
        const oy = Math.sin(angle) * s.size * 0.25 * scale;
        ctx.moveTo(p.x + ox + s.size * 0.45 * strokeProgress * scale, p.y + oy);
        ctx.arc(p.x + ox, p.y + oy, s.size * 0.45 * strokeProgress * scale * (isTransitioning ? 1 + transitionProgress * 5 : 1), 0, Math.PI * 2);
      }
      ctx.fill();
    } else if (s.type === 'splatter') {
      const p = getWarpedPoint(s.x, s.y, cx, cy, scale, mx, my, isTransitioning, transitionProgress);
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha * 0.65;
      ctx.arc(p.x, p.y, s.size * strokeProgress * scale * (isTransitioning ? 1 + transitionProgress * 2 : 1), 0, Math.PI * 2);
      ctx.fill();
    } else if (s.type === 'tendril') {
      const tx = s.x0 + (s.x1 - s.x0) * strokeProgress;
      const ty = s.y0 + (s.y1 - s.y0) * strokeProgress;
      const tcx = s.x0 + (s.cx - s.x0) * strokeProgress;
      const tcy = s.y0 + (s.cy - s.y0) * strokeProgress;
      
      const p0 = getWarpedPoint(s.x0, s.y0, cx, cy, scale, mx, my, isTransitioning, transitionProgress);
      const p1 = getWarpedPoint(tx, ty, cx, cy, scale, mx, my, isTransitioning, transitionProgress);
      const pMid = getWarpedPoint(tcx, tcy, cx, cy, scale, mx, my, isTransitioning, transitionProgress);

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha * 0.6;
      ctx.lineWidth = s.width * strokeProgress * scale * (isTransitioning ? 1 + transitionProgress * 2 : 1);
      ctx.lineCap = 'round';
      ctx.moveTo(p0.x, p0.y);
      ctx.quadraticCurveTo(pMid.x, pMid.y, p1.x, p1.y);
      ctx.stroke();
    }
  }

  ctx.restore();
}

// ─── React Component ───
export default function InkCanvas() {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null); // Cache canvas context
  const progressRef = useRef(0);
  const targetProgressRef = useRef(0);
  const activeLogogramRef = useRef(null);
  const targetPosRef = useRef({ x: 0, y: 0 });
  const currentPosRef = useRef({ x: 0, y: 0 });
  const mousePosRef = useRef({ x: 0, y: 0 });
  const timeRef = useRef(0);
  
  // Transition state
  const transitionProgressRef = useRef(0);

  const rafRef = useRef(null);
  const contactAngleRef = useRef(0);
  const particlesRef = useRef([]);
  const lastHitTimesRef = useRef({});
  const canvasDirtyRef = useRef(false);
  
  // Cached dimensions (updated on resize only)
  const dimsRef = useRef({ w: window.innerWidth, h: window.innerHeight });
  
  // Cache ink-char elements per pillar to avoid querySelectorAll in hot path
  const charCacheRef = useRef({});

  const INK_COLOR = 'rgb(3, 8, 3)';
  const hoveredNode = useStore((state) => state.hoveredNode);
  const isMapVisible = useStore((state) => state.isMapVisible);
  const activePillar = useStore((state) => state.activePillar);
  const viewMode = useStore((state) => state.viewMode);

  // Mouse tracking
  useEffect(() => {
    const handleMouseMove = (e) => {
      mousePosRef.current.x = e.clientX;
      mousePosRef.current.y = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Update target pos on hover
  useEffect(() => {
    if (viewMode === 'map') {
      if (hoveredNode && LOGOGRAMS[hoveredNode]) {
        if (activeLogogramRef.current !== hoveredNode) {
          progressRef.current = 0;
        }
        activeLogogramRef.current = hoveredNode;
        targetProgressRef.current = 1;
        const el = document.getElementById(hoveredNode);
        if (el) {
          const rect = el.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          
          targetPosRef.current = { x: cx, y: cy };
          if (progressRef.current === 0) {
             currentPosRef.current.x = cx;
             currentPosRef.current.y = cy;
          }
        }
        
        // Pre-cache ink-char elements for this pillar
        if (!charCacheRef.current[hoveredNode]) {
          charCacheRef.current[hoveredNode] = Array.from(
            document.querySelectorAll(`#${hoveredNode} .ink-char`)
          );
        }
      } else {
        targetProgressRef.current = 0;
        
        const dx = mousePosRef.current.x - targetPosRef.current.x;
        const dy = mousePosRef.current.y - targetPosRef.current.y;
        if (dx !== 0 || dy !== 0) {
           contactAngleRef.current = Math.atan2(dy, dx);
        }
      }
    }
  }, [hoveredNode, viewMode]);

  // Handle ViewMode changes
  useEffect(() => {
    if (viewMode === 'transition') {
      targetProgressRef.current = 1;
    } else if (viewMode === 'retract') {
      targetProgressRef.current = 0;
    }
  }, [viewMode, activePillar]);

  // Animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    const { w, h } = dimsRef.current;
    timeRef.current += 0.016;

    // ViewMode state machine updates
    if (viewMode === 'transition') {
      transitionProgressRef.current += (1 - transitionProgressRef.current) * 0.05;
    } else if (viewMode === 'takeover') {
      transitionProgressRef.current = 1;
    } else if (viewMode === 'retract') {
      transitionProgressRef.current += (0 - transitionProgressRef.current) * 0.08;
    } else {
      transitionProgressRef.current = 0;
    }

    const speed = targetProgressRef.current > progressRef.current ? 0.045 : 0.035;
    progressRef.current += (targetProgressRef.current - progressRef.current) * speed;

    // Magnetic pull of the center point toward the mouse
    const mx = mousePosRef.current.x;
    const my = mousePosRef.current.y;
    
    let drawCx = currentPosRef.current.x;
    let drawCy = currentPosRef.current.y;

    if (viewMode === 'map') {
      const maxDrift = 40;
      const dx = mx - targetPosRef.current.x;
      const dy = my - targetPosRef.current.y;
      const distSq = dx*dx + dy*dy;
      
      if (distSq < 62500 && distSq > 0) { // 250*250
        const dist = Math.sqrt(distSq);
        const pull = Math.min(dist * 0.15, maxDrift);
        const targetCx = targetPosRef.current.x + (dx/dist) * pull;
        const targetCy = targetPosRef.current.y + (dy/dist) * pull;
        currentPosRef.current.x += (targetCx - currentPosRef.current.x) * 0.08;
        currentPosRef.current.y += (targetCy - currentPosRef.current.y) * 0.08;
      } else {
        currentPosRef.current.x += (targetPosRef.current.x - currentPosRef.current.x) * 0.08;
        currentPosRef.current.y += (targetPosRef.current.y - currentPosRef.current.y) * 0.08;
      }
      
      drawCx = currentPosRef.current.x;
      drawCy = currentPosRef.current.y;
      
      if (activeLogogramRef.current) {
        if (targetProgressRef.current === 1 && progressRef.current < 0.05) {
          contactAngleRef.current = Math.atan2(dy, dx);
        }
      }
    } else if (viewMode === 'takeover' || viewMode === 'transition' || viewMode === 'retract') {
      const rightSideTargetX = w * 0.75;
      const rightSideTargetY = h * 0.5;
      
      if (viewMode === 'transition') {
        currentPosRef.current.x += (rightSideTargetX - currentPosRef.current.x) * 0.04;
        currentPosRef.current.y += (rightSideTargetY - currentPosRef.current.y) * 0.04;
      }
      drawCx = currentPosRef.current.x;
      drawCy = currentPosRef.current.y;
    }

    if (Math.abs(progressRef.current - targetProgressRef.current) < 0.005) {
      progressRef.current = targetProgressRef.current;
    }

    // Determine if we actually need to redraw this frame
    const isTransitioning = viewMode === 'transition' || viewMode === 'retract';
    const isFullyDrawn = progressRef.current === 1 && targetProgressRef.current === 1;
    const isFullyHidden = progressRef.current === 0 && targetProgressRef.current === 0;
    const hasParticles = particlesRef.current.length > 0;
    
    // Read store state once per frame (not per particle)
    const storeState = useStore.getState();
    const currentPulling = storeState.pullingPillar;
    
    const dxMouse = mx - drawCx;
    const dyMouse = my - drawCy;
    const distToMouseSq = dxMouse * dxMouse + dyMouse * dyMouse;
    const isSettled = Math.abs(currentPosRef.current.x - targetPosRef.current.x) < 0.5 && 
                      Math.abs(currentPosRef.current.y - targetPosRef.current.y) < 0.5;

    const needsRedraw = 
      (!isFullyDrawn && !isFullyHidden) ||
      hasParticles ||
      isTransitioning ||
      (distToMouseSq < 67600) || // 260*260
      !!currentPulling ||
      !isSettled;

    if (!needsRedraw) {
      if (isFullyHidden && canvasDirtyRef.current) {
        ctx.clearRect(0, 0, w, h);
        canvasDirtyRef.current = false;
      }
      rafRef.current = requestAnimationFrame(animate);
      return;
    }

    canvasDirtyRef.current = true;
    ctx.clearRect(0, 0, w, h);

    const scale = Math.min(w, h) / 900;
    
    // Draw the base logogram (or explosion)
    if ((progressRef.current > 0.001 || isTransitioning) && activeLogogramRef.current) {
      const strokes = LOGOGRAMS[activeLogogramRef.current];
      if (strokes && transitionProgressRef.current < 0.95) {
        drawLogogram(
          ctx, strokes, progressRef.current, drawCx, drawCy, INK_COLOR, scale, mx, my, 
          isTransitioning, transitionProgressRef.current, contactAngleRef.current
        );
      }
    }
    
    // Process Gravity Well Droplets — spawn more readily (user request)
    if (currentPulling && progressRef.current === 0) {
       // INCREASED spawn rates for "easier pull" feel
       const spawnChance = currentPulling.isHovered ? 0.85 : 0.5;
       
       if (Math.random() < spawnChance) {
          const dx = currentPulling.cx - mx;
          const dy = currentPulling.cy - my;
          const distSq = dx * dx + dy * dy;
          
          if (distSq > 0 || currentPulling.isHovered) {
             const dist = Math.sqrt(distSq);
             const angle = Math.atan2(dy, dx);
             
             const speed = 1 + Math.random() * 3;
             const spread = (Math.random() - 0.5) * 1.2;
             const startX = mx + (Math.random() - 0.5) * 12;
             const startY = my + (Math.random() - 0.5) * 12;

             particlesRef.current.push({
                x: startX,
                y: startY,
                vx: Math.cos(angle + spread) * speed,
                vy: Math.sin(angle + spread) * speed,
                target: currentPulling,
                size: 3 + Math.random() * 6,
                life: 1.0,
                decay: 0.01 + Math.random() * 0.02
             });
          }
       }
    }

    // Process and draw all active droplets — swap-remove instead of splice
    const particles = particlesRef.current;
    if (particles.length > 0) {
      ctx.fillStyle = INK_COLOR;
      let i = 0;
      while (i < particles.length) {
        const p = particles[i];
        
        p.x += p.vx;
        p.y += p.vy;
        
        // Gravity pull towards the pillar
        if (p.target) {
           const dx = p.target.cx - p.x;
           const dy = p.target.cy - p.y;
           const distSq = dx * dx + dy * dy;
           if (distSq > 0) {
              const dist = Math.sqrt(distSq);
              const pullForce = 80 / (dist + 20);
              p.vx += (dx / dist) * pullForce;
              p.vy += (dy / dist) * pullForce;
              
              if (dist < 60) {
                if (!p.hit) {
                  p.hit = true;
                  if (p.target.id) {
                     const now = performance.now();
                     const lastHit = lastHitTimesRef.current[p.target.id] || 0;
                     if (now - lastHit > 250) {
                        lastHitTimesRef.current[p.target.id] = now;
                        
                        // Use cached chars instead of querySelectorAll
                        const chars = charCacheRef.current[p.target.id] || 
                          Array.from(document.querySelectorAll(`#${p.target.id} .ink-char`));
                        if (chars.length > 0) {
                           let closestIdx = 0;
                           let minCharDist = Infinity;
                           for (let ci = 0; ci < chars.length; ci++) {
                              const rect = chars[ci].getBoundingClientRect();
                              const charCx = rect.left + rect.width / 2;
                              const charCy = rect.top + rect.height / 2;
                              const d = Math.hypot(p.x - charCx, p.y - charCy);
                              if (d < minCharDist) {
                                 minCharDist = d;
                                 closestIdx = ci;
                              }
                           }

                           const triggerAbsorb = (idx, delay, isCore) => {
                              if (idx < 0 || idx >= chars.length) return;
                              setTimeout(() => {
                                 const el = chars[idx];
                                 const className = isCore ? 'ink-hit-core' : 'ink-hit-ripple';
                                 el.classList.remove('ink-hit-core', 'ink-hit-ripple');
                                 void el.offsetWidth;
                                 el.classList.add(className);
                              }, delay);
                           };

                           triggerAbsorb(closestIdx, 0, true);
                           for (let wi = 1; wi <= 4; wi++) {
                              triggerAbsorb(closestIdx - wi, wi * 50, false);
                              triggerAbsorb(closestIdx + wi, wi * 50, false);
                           }
                        }
                     }
                  }
                }
                p.life -= 0.15;
              }
           }
        }
        
        p.vx *= 0.92;
        p.vy *= 0.92;
        p.life -= p.decay;
        
        if (p.life <= 0) {
          // Swap-remove: O(1) instead of splice O(n)
          particles[i] = particles[particles.length - 1];
          particles.pop();
          continue; // Don't increment i, re-check the swapped element
        }
        
        // Draw droplet
        ctx.beginPath();
        const currentSize = p.size * Math.pow(Math.max(0, p.life), 0.5);
        ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
        ctx.fill();
        
        i++;
      }
    }

    rafRef.current = requestAnimationFrame(animate);
  }, [hoveredNode, viewMode, activePillar]);

  // Setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap DPR at 2
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      ctxRef.current = ctx;
      dimsRef.current = { w, h };
    };

    resize();
    window.addEventListener('resize', resize);
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [animate]);

  return (
    <canvas
      ref={canvasRef}
      id="ink-canvas"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 15,
        opacity: isMapVisible ? 1 : 0,
        transition: 'opacity 0.5s ease',
      }}
    />
  );
}
