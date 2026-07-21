/*
  The persistent eye (mode A). One control surface for every incarnation of the
  eye — nav mark, hero (SVG or WebGL), CTA eyebrow, sample-card seal — so they
  react as a single organism at defined checkpoints and never during reading.
  The iris rests on --watch (the one status-true element) and only flicks to
  --alert / --match at earned moments.

  PERSIST_EYE gates the page-wide punctuation. Flip it to false and the eye lives
  in hero + CTA only, with no rearchitecting — section checkpoints simply no-op.
*/
export type IrisMode = 'watch' | 'alert' | 'match';

const PERSIST_EYE = true;

type WebGLIris = (mode: IrisMode, cssColor: string) => void;

let webglIris: WebGLIris | null = null;
let current: IrisMode = 'watch';
let revertTimer: number | undefined;

export const persistEye = PERSIST_EYE;

/** Resolve a CSS custom property to its computed value (for the WebGL core). */
export function resolveToken(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function paint(mode: IrisMode): void {
  const value = `var(--${mode})`;
  document.querySelectorAll<SVGElement | HTMLElement>('[data-oju-iris]').forEach((el) => {
    el.style.fill = value;
  });
  webglIris?.(mode, resolveToken(`--${mode}`));
}

/** Set the resting iris colour (persists until changed). */
export function setIris(mode: IrisMode): void {
  current = mode;
  window.clearTimeout(revertTimer);
  paint(mode);
}

/** Flick to a mode at a checkpoint, then settle back to --watch. */
export function flickIris(mode: IrisMode, ms = 1600): void {
  window.clearTimeout(revertTimer);
  paint(mode);
  revertTimer = window.setTimeout(() => paint('watch'), ms);
  current = 'watch';
}

/** Section-punctuation flick — a no-op when persistence is off. */
export function punctuate(mode: IrisMode, ms = 1600): void {
  if (!PERSIST_EYE) return;
  flickIris(mode, ms);
}

/** Register the WebGL core's colour setter; syncs it to the current mode. */
export function registerWebGLIris(fn: WebGLIris): void {
  webglIris = fn;
  fn(current, resolveToken(`--${current}`));
}

/** Re-resolve tokens after a theme change (DOM fills follow var() automatically;
    the WebGL core needs the fresh computed colour). */
export function refreshEyeTheme(): void {
  webglIris?.(current, resolveToken(`--${current}`));
}
