/*
  Entry orchestrator — the page's only eager first-party JS. Everything here is
  lightweight and dependency-free (theme, eye dock, section reveals, case file,
  hero-eye gate). Three.js loads only on capable devices; GSAP loads only after
  idle and never under reduced-motion. The page reads and works before either.
*/
import { initTheme } from './theme';
import { initHeroEye } from './hero-eye';
import { initCaseFile } from './case-file';
import { initReportForm } from './form';
import { punctuate } from './eye';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

function initReveals(): void {
  // Claim the reveal job so the inline failsafe (Base.astro) stands down.
  document.documentElement.classList.add('reveal-js');

  const targets = Array.from(document.querySelectorAll<HTMLElement>('.oju-reveal'));
  if (reduced) {
    targets.forEach((t) => t.classList.add('is-in'));
    return;
  }

  const io = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        if ((e.target as HTMLElement).dataset.punctuate === 'alert') punctuate('alert', 1600);
        obs.unobserve(e.target);
      });
    },
    { threshold: 0.2, rootMargin: '0px 0px -8% 0px' },
  );
  targets.forEach((t) => io.observe(t));
}

function initDock(): void {
  const root = document.documentElement;
  let ticking = false;
  const update = (): void => {
    ticking = false;
    root.toggleAttribute('data-docked', window.scrollY > 320);
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true },
  );
  update();
}

function start(): void {
  initTheme();
  initDock();
  initReveals();
  initCaseFile();
  initReportForm();

  const heroEye = document.getElementById('hero-eye');
  if (heroEye) void initHeroEye(heroEye);

  if (!reduced) {
    const load = (): void => {
      void import('./choreography').then((m) => m.initChoreography()).catch(() => {});
    };
    if ('requestIdleCallback' in window) {
      requestIdleCallback(load, { timeout: 2000 });
    } else {
      window.setTimeout(load, 1200);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
