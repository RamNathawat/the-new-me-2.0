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
function getWarpedPoint(px, py, cx, cy, scale, mx, my, isTransitioning, transitionProgress, time = 0) {
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
  const dist = Math.sqrt(dx * dx + dy * dy);
  
  if (dist < 200) {
    const force = Math.pow(1 - dist / 200, 2) * 35; // Maximum 35px pull
    return {
      x: gx - (dx / dist) * force,
      y: gy - (dy / dist) * force
    };
  }
  
  return { x: gx, y: gy };
}

// ─── Draw a logogram at a given progress ───
function drawLogogram(ctx, strokes, progress, cx, cy, color, scale, mx, my, isTransitioning, transitionProgress, contactAngle, time) {
  ctx.save();
  // We do NOT translate the context, because we calculate absolute warped positions

  for (const s of strokes) {
    let dynamicOrder = s.order;
    if (contactAngle !== undefined && contactAngle !== null) {
      // Re-map the stroke order so it starts at the contact angle and flows in both directions
      const strokeAngle = s.order * 2 * Math.PI;
      let diff = Math.abs(strokeAngle - contactAngle);
      diff = diff % (Math.PI * 2);
      if (diff > Math.PI) diff = 2 * Math.PI - diff;
      dynamicOrder = diff / Math.PI;
    }

    let strokeProgress = Math.max(0, Math.min(1, (progress * 1.15 - dynamicOrder) / 0.15));
    if (isTransitioning) strokeProgress = 1; // Fully drawn during transition
    if (strokeProgress <= 0) continue;

    const alpha = isTransitioning ? (1 - transitionProgress) : strokeProgress;
    if (alpha <= 0) continue;

    if (s.type === 'arc') {
      const p0 = getWarpedPoint(s.x0, s.y0, cx, cy, scale, mx, my, isTransitioning, transitionProgress, time);
      const p1 = getWarpedPoint(s.x1, s.y1, cx, cy, scale, mx, my, isTransitioning, transitionProgress, time);
      const pMid = getWarpedPoint(s.cx, s.cy, cx, cy, scale, mx, my, isTransitioning, transitionProgress, time);

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
      const p = getWarpedPoint(s.x, s.y, cx, cy, scale, mx, my, isTransitioning, transitionProgress, time);
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
      const p = getWarpedPoint(s.x, s.y, cx, cy, scale, mx, my, isTransitioning, transitionProgress, time);
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
      
      const p0 = getWarpedPoint(s.x0, s.y0, cx, cy, scale, mx, my, isTransitioning, transitionProgress, time);
      const p1 = getWarpedPoint(tx, ty, cx, cy, scale, mx, my, isTransitioning, transitionProgress, time);
      const pMid = getWarpedPoint(tcx, tcy, cx, cy, scale, mx, my, isTransitioning, transitionProgress, time);

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

// ─── Procedural Masterpieces for Fullscreen Takeover ───
// These generate static strokes that are drawn continually with hover warping
function generateNutritionRoots(w, h) {
  const strokes = [];
  const rng = seedRandom(123);
  for (let i = 0; i < 40; i++) {
    const angle = rng() * Math.PI - Math.PI / 2; // Right side spread
    const len = 300 + rng() * 500;
    const endX = Math.cos(angle) * len;
    const endY = Math.sin(angle) * len;
    strokes.push({
      type: 'tendril', x0: 0, y0: 0, cx: endX * 0.5, cy: endY * 0.3,
      x1: endX, y1: endY, width: 2 + rng() * 12, order: rng()
    });
    strokes.push({
      type: 'pool', x: endX, y: endY, size: 10 + rng() * 30, order: rng()
    });
  }
  return strokes;
}

function generateMovementSweeps(w, h) {
  const strokes = [];
  const rng = seedRandom(456);
  for (let i = 0; i < 30; i++) {
    const y0 = (rng() - 0.5) * h;
    const y1 = y0 + (rng() - 0.5) * 400;
    strokes.push({
      type: 'arc', x0: -100, y0: y0, cx: w*0.4, cy: y0 - 200,
      x1: w, y1: y1, width: 1 + rng() * 15, order: rng()
    });
    for (let j=0; j<3; j++) {
      strokes.push({
        type: 'splatter', x: w * rng(), y: y0 + (y1-y0)*rng() + (rng()-0.5)*100, size: 2 + rng() * 6, order: rng()
      });
    }
  }
  return strokes;
}

function generateRecoveryMist(w, h) {
  const strokes = [];
  const rng = seedRandom(789);
  for (let i = 0; i < 60; i++) {
    const y = (rng() - 0.5) * h * 0.8;
    strokes.push({
      type: 'arc', x0: -w*0.2, y0: y, cx: w*0.5, cy: y + (rng()-0.5)*100,
      x1: w*1.2, y1: y, width: 40 + rng() * 80, order: rng() // very wide and soft
    });
  }
  return strokes;
}

function generateMindsetWeb(w, h) {
  const strokes = [];
  const rng = seedRandom(101);
  const points = [];
  for (let i = 0; i < 25; i++) {
    points.push({ x: (rng() - 0.2) * w * 0.6, y: (rng() - 0.5) * h * 0.8 });
  }
  for (let i = 0; i < points.length; i++) {
    strokes.push({ type: 'pool', x: points[i].x, y: points[i].y, size: 8 + rng() * 12, order: rng() });
    for (let j = i + 1; j < points.length; j++) {
      const dx = points[i].x - points[j].x;
      const dy = points[i].y - points[j].y;
      if (Math.sqrt(dx*dx + dy*dy) < 300) {
        strokes.push({
          type: 'tendril', x0: points[i].x, y0: points[i].y, cx: (points[i].x+points[j].x)/2 + (rng()-0.5)*50,
          cy: (points[i].y+points[j].y)/2 + (rng()-0.5)*50, x1: points[j].x, y1: points[j].y,
          width: 1 + rng()*2, order: rng()
        });
      }
    }
  }
  return strokes;
}

// ─── React Component ───
export default function InkCanvas() {
  const canvasRef = useRef(null);
  const progressRef = useRef(0);
  const targetProgressRef = useRef(0);
  const activeLogogramRef = useRef(null);
  const targetPosRef = useRef({ x: 0, y: 0 });
  const currentPosRef = useRef({ x: 0, y: 0 });
  const mousePosRef = useRef({ x: 0, y: 0 });
  const timeRef = useRef(0);
  
  // Transition state
  const transitionProgressRef = useRef(0);
  const takeoverMasterpieceRef = useRef(null);

  const rafRef = useRef(null);
  const contactAngleRef = useRef(0);
  const particlesRef = useRef([]);
  const lastHitTimesRef = useRef({});

  const INK_COLOR = 'rgb(3, 8, 3)';
  const hoveredNode = useStore((state) => state.hoveredNode);
  const isMapVisible = useStore((state) => state.isMapVisible);
  const activePillar = useStore((state) => state.activePillar);
  const viewMode = useStore((state) => state.viewMode); // 'map', 'transition', 'takeover', 'retract'

  // Mouse tracking
  useEffect(() => {
    const handleMouseMove = (e) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Update target pos on hover
  useEffect(() => {
    if (viewMode === 'map') {
      if (hoveredNode && LOGOGRAMS[hoveredNode]) {
        activeLogogramRef.current = hoveredNode;
        targetProgressRef.current = 1;
        const el = document.getElementById(hoveredNode);
        if (el) {
          const rect = el.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          
          targetPosRef.current = { x: cx, y: cy };
        }
      } else {
        targetProgressRef.current = 0;
      }
    }
  }, [hoveredNode, viewMode]);

  // Handle ViewMode changes
  useEffect(() => {
    if (viewMode === 'transition') {
      targetProgressRef.current = 1;
      // Generate the masterpiece based on activePillar
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (activePillar === 'ch-nutrition') takeoverMasterpieceRef.current = generateNutritionRoots(w, h);
      else if (activePillar === 'ch-fitness') takeoverMasterpieceRef.current = generateMovementSweeps(w, h);
      else if (activePillar === 'ch-sleep') takeoverMasterpieceRef.current = generateRecoveryMist(w, h);
      else if (activePillar === 'ch-mindset') takeoverMasterpieceRef.current = generateMindsetWeb(w, h);
    } else if (viewMode === 'retract') {
      targetProgressRef.current = 0;
    }
  }, [viewMode, activePillar]);

  // Animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const w = window.innerWidth;
    const h = window.innerHeight;
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
      // Magnetic drift of the ring center toward the mouse
      const maxDrift = 40;
      const dx = mx - targetPosRef.current.x;
      const dy = my - targetPosRef.current.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      if (dist < 250 && dist > 0) {
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
      
      // Dynamic Angle Tracking for Liquid Retraction
      if (activeLogogramRef.current) {
        // Capture entry angle when we just start drawing
        if (targetProgressRef.current === 1 && progressRef.current < 0.05) {
          contactAngleRef.current = Math.atan2(dy, dx);
        }
        // Invisibly track exit angle while fully drawn
        if (targetProgressRef.current === 1 && progressRef.current > 0.98) {
          contactAngleRef.current = Math.atan2(dy, dx);
        }
      }
    } else if (viewMode === 'takeover' || viewMode === 'transition' || viewMode === 'retract') {
      // In takeover mode, the epicenter is on the right side of the screen
      const rightSideTargetX = w * 0.75;
      const rightSideTargetY = h * 0.5;
      
      if (viewMode === 'transition') {
        currentPosRef.current.x += (rightSideTargetX - currentPosRef.current.x) * 0.04;
        currentPosRef.current.y += (rightSideTargetY - currentPosRef.current.y) * 0.04;
      }
      drawCx = currentPosRef.current.x;
      drawCy = currentPosRef.current.y;
    }

    if (Math.abs(progressRef.current) < 0.001 && targetProgressRef.current === 0) {
      progressRef.current = 0;
    }

    ctx.clearRect(0, 0, w, h);

    const scale = Math.min(w, h) / 900;
    const isTransitioning = viewMode === 'transition' || viewMode === 'retract';
    
    // Draw the base logogram (or explosion)
    if ((progressRef.current > 0.001 || isTransitioning) && activeLogogramRef.current) {
      const strokes = LOGOGRAMS[activeLogogramRef.current];
      if (strokes && transitionProgressRef.current < 0.95) {
        drawLogogram(
          ctx, strokes, progressRef.current, drawCx, drawCy, INK_COLOR, scale, mx, my, 
          isTransitioning, transitionProgressRef.current, contactAngleRef.current, timeRef.current
        );
      }
    }
    
    // Process Gravity Well Droplets
    const currentPulling = useStore.getState().pullingPillar;
    
    // 1. Spawn new droplets from the cursor if being pulled but not latched
    if (currentPulling && progressRef.current === 0) {
       // Spawn randomly (1-2 droplets per frame)
       if (Math.random() > 0.3) {
          const dx = currentPulling.cx - mx;
          const dy = currentPulling.cy - my;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist > 0) {
             const angle = Math.atan2(dy, dx);
             const speed = 1 + Math.random() * 3;
             const spread = (Math.random() - 0.5) * 1.2; // slight chaotic ejection
             particlesRef.current.push({
                x: mx + (Math.random() - 0.5) * 12,
                y: my + (Math.random() - 0.5) * 12,
                vx: Math.cos(angle + spread) * speed,
                vy: Math.sin(angle + spread) * speed,
                target: currentPulling,
                size: 3 + Math.random() * 5,
                life: 1.0,
                decay: 0.01 + Math.random() * 0.02
             });
          }
       }
    }

    // 2. Process and draw all active droplets
    if (particlesRef.current.length > 0) {
      ctx.fillStyle = INK_COLOR;
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        
        p.x += p.vx;
        p.y += p.vy;
        
        // Gravity pull towards the pillar
        if (p.target) {
           const dx = p.target.cx - p.x;
           const dy = p.target.cy - p.y;
           const dist = Math.sqrt(dx * dx + dy * dy);
           if (dist > 0) {
              const pullForce = 80 / (dist + 20); // Acceleration increases as it gets closer
              p.vx += (dx / dist) * pullForce;
              p.vy += (dy / dist) * pullForce;
           }
           
           if (dist < 60) {
              if (!p.hit) {
                 p.hit = true;
                 if (p.target && p.target.id) {
                    const now = performance.now();
                    const lastHit = lastHitTimesRef.current[p.target.id] || 0;
                    if (now - lastHit > 250) { // Throttle slightly less to allow rapid hits
                       lastHitTimesRef.current[p.target.id] = now;
                       
                       const chars = Array.from(document.querySelectorAll(`#${p.target.id} .ink-char`));
                       if (chars.length > 0) {
                          // Find the closest letter to the droplet impact point
                          let closestIdx = 0;
                          let minCharDist = Infinity;
                          chars.forEach((charEl, idx) => {
                             const rect = charEl.getBoundingClientRect();
                             const charCx = rect.left + rect.width / 2;
                             const charCy = rect.top + rect.height / 2;
                             const d = Math.hypot(p.x - charCx, p.y - charCy);
                             if (d < minCharDist) {
                                minCharDist = d;
                                closestIdx = idx;
                             }
                          });

                          // Trigger the wave outward from the closest letter
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
                          for (let w = 1; w <= 4; w++) {
                             triggerAbsorb(closestIdx - w, w * 50, false); // Left ripple
                             triggerAbsorb(closestIdx + w, w * 50, false); // Right ripple
                          }
                       }
                    }
                 }
              }
              p.life -= 0.15; // Rapid decay
           }
        }
        
        p.vx *= 0.92; // fluid friction
        p.vy *= 0.92;
        p.life -= p.decay;
        
        if (p.life <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }
        
        // Draw droplet
        ctx.beginPath();
        const currentSize = p.size * Math.pow(Math.max(0, p.life), 0.5); // non-linear shrink
        ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // The takeover masterpiece procedural generation has been replaced with custom illustrations in the DOM.

    rafRef.current = requestAnimationFrame(animate);
  }, [hoveredNode, viewMode, activePillar]);

  // Setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
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
        pointerEvents: viewMode === 'takeover' ? 'auto' : 'none',
        zIndex: 15,
        opacity: isMapVisible ? 1 : 0,
        transition: 'opacity 0.5s ease',
      }}
    />
  );
}
