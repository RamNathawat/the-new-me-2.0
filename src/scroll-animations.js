/* ═══════════════════════════════════════════════════
   Scroll Animations — GSAP ScrollTrigger
   Orchestrates the four-section editorial experience
   ═══════════════════════════════════════════════════ */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initScrollAnimations(bookScene) {

  // ── Section 1: Atmosphere — Word reveals ──────────
  const words = document.querySelectorAll('.word-reveal');
  const scrollHint = document.getElementById('scroll-hint');

  // Stagger word reveals on load (after loader hides)
  gsap.delayedCall(1.5, () => {
    if (scrollHint) scrollHint.classList.add('is-visible');

    words.forEach((word, i) => {
      gsap.to(word, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        delay: i * 0.12,
        ease: 'power3.out',
        onStart: () => word.classList.add('is-visible')
      });
    });
  });

  // Fade out atmosphere text and scroll hint as user scrolls
  gsap.to('.atmosphere__content', {
    opacity: 0,
    y: -80,
    scrollTrigger: {
      trigger: '#section-atmosphere',
      start: 'top top',
      end: '60% top',
      scrub: 1
    }
  });

  gsap.to('#scroll-hint', {
    opacity: 0,
    scrollTrigger: {
      trigger: '#section-atmosphere',
      start: '10% top',
      end: '30% top',
      scrub: 1
    }
  });

  // ── Section 2: Book Reveal ────────────────────────

  // Show header once we're past the atmosphere
  ScrollTrigger.create({
    trigger: '#section-book-reveal',
    start: 'top 80%',
    onEnter: () => document.getElementById('site-header').classList.add('is-visible'),
    onLeaveBack: () => document.getElementById('site-header').classList.remove('is-visible')
  });

  // Show canvas once book section begins
  ScrollTrigger.create({
    trigger: '#section-book-reveal',
    start: 'top 90%',
    onEnter: () => document.getElementById('book-canvas').classList.add('is-visible'),
    onLeaveBack: () => document.getElementById('book-canvas').classList.remove('is-visible')
  });

  // Book reveal progress — drives 3D book entrance
  ScrollTrigger.create({
    trigger: '#section-book-reveal',
    start: 'top bottom',
    end: 'center center',
    scrub: 1.5,
    onUpdate: (self) => {
      if (bookScene) bookScene.setBookReveal(self.progress);
    }
  });

  // Page spread — second half of book reveal section
  ScrollTrigger.create({
    trigger: '#section-book-reveal',
    start: 'center center',
    end: 'bottom top',
    scrub: 1.5,
    onUpdate: (self) => {
      if (bookScene) bookScene.setPageSpread(self.progress * 0.4);
    }
  });

  // ABOUT typography — parallax reveal
  gsap.fromTo('.about-letter', {
    opacity: 0,
    y: 100,
    scale: 0.9
  }, {
    opacity: 0.12,
    y: 0,
    scale: 1,
    stagger: 0.05,
    scrollTrigger: {
      trigger: '#section-book-reveal',
      start: 'top 60%',
      end: 'center center',
      scrub: 1
    }
  });

  // Signature reveal
  ScrollTrigger.create({
    trigger: '#section-book-reveal',
    start: '40% center',
    onEnter: () => document.getElementById('author-signature').classList.add('is-visible'),
    onLeaveBack: () => document.getElementById('author-signature').classList.remove('is-visible')
  });

  // Signature fade-out before author section
  gsap.to('#author-signature', {
    opacity: 0,
    scrollTrigger: {
      trigger: '#section-author',
      start: 'top 80%',
      end: 'top 20%',
      scrub: 1
    }
  });

  // ── Section 3: Author ─────────────────────────────

  // Background color transition (sage → cream)
  gsap.to('body', {
    backgroundColor: '#F5F2EA',
    scrollTrigger: {
      trigger: '#section-author',
      start: 'top 80%',
      end: 'top 20%',
      scrub: 1
    }
  });

  // Book slides to left for author section
  ScrollTrigger.create({
    trigger: '#section-author',
    start: 'top 60%',
    end: 'top top',
    scrub: 1.5,
    onUpdate: (self) => {
      if (bookScene) bookScene.setAuthorPosition(self.progress);
    }
  });

  // Text reveals — staggered entrance
  const textReveals = document.querySelectorAll('#author-text .text-reveal');
  textReveals.forEach((el, i) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        end: 'top 50%',
        toggleActions: 'play none none reverse'
      }
    });
  });

  // ── Section 4: Gallery ────────────────────────────

  // Gallery header reveals
  gsap.utils.toArray('#section-gallery .text-reveal').forEach((el) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        toggleActions: 'play none none reverse'
      }
    });
  });

  // Gallery cards — staggered entrance
  const cards = document.querySelectorAll('.gallery__card');
  cards.forEach((card, i) => {
    gsap.to(card, {
      opacity: 1,
      y: 0,
      duration: 0.8,
      delay: i * 0.1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '#section-gallery',
        start: 'top 70%',
        toggleActions: 'play none none reverse'
      },
      onStart: () => card.classList.add('is-visible')
    });
  });

  // Horizontal scroll for gallery on desktop
  if (window.innerWidth > 768) {
    const track = document.getElementById('gallery-track');
    if (track) {
      const scrollWidth = track.scrollWidth - track.clientWidth;
      if (scrollWidth > 0) {
        gsap.to(track, {
          scrollLeft: scrollWidth,
          ease: 'none',
          scrollTrigger: {
            trigger: '#section-gallery',
            start: 'center center',
            end: `+=${scrollWidth}`,
            scrub: 1,
            pin: true
          }
        });
      }
    }
  }

  // ── Particle opacity follows sections ─────────────
  gsap.to('#particles', {
    opacity: 0.3,
    scrollTrigger: {
      trigger: '#section-author',
      start: 'top center',
      end: 'top top',
      scrub: 1
    }
  });

  // Refresh ScrollTrigger after everything is set up
  gsap.delayedCall(0.5, () => ScrollTrigger.refresh());
}
