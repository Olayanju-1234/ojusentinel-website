/*
  Hero-eye entry. Runs the capability gate; only capable devices dynamically
  import Three.js (so it never touches the low-power path or first paint). On
  success the static SVG fades out under the canvas; on any failure it simply
  stays — that IS the fallback, no error surfaced.
*/
import { shouldRunHeavyEye } from '../../lib/capability';
import { registerWebGLIris } from '../eye';

export async function initHeroEye(container: HTMLElement): Promise<void> {
  if (!shouldRunHeavyEye()) return;
  try {
    const { HeroEyeScene } = await import('./scene');
    const scene = new HeroEyeScene(container);
    registerWebGLIris((mode, css) => scene.setIris(mode, css));
    window.addEventListener('oju:theme', () => scene.refreshTheme());

    const svg = container.querySelector<SVGElement>('.oju-hero-static');
    if (svg) {
      svg.style.transition = 'opacity .6s ease';
      requestAnimationFrame(() => {
        svg.style.opacity = '0';
      });
    }
  } catch {
    // WebGL or scene init failed — the static SVG eye remains. Graceful by design.
  }
}
