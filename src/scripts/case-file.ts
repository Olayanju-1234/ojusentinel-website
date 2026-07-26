/*
  The case file — manual step chips as the primary control. No timed auto-advance;
  the visitor sets the pace. Implemented as an ARIA tablist: every step's content
  is server-rendered and present in the DOM, switching is instant, and the reveal
  is a ≤350ms cosmetic entrance that never gates reading. Verify is the one place
  --match is earned; the eye flicks to match only there.
*/
import { setIris } from './eye';

const CLOCKS = ['21:52 — SWEEP', '22:00 — REVIEW', '22:04 — NOTICE'];

export function initCaseFile(): void {
  const root = document.querySelector<HTMLElement>('[data-casefile]');
  if (!root) return;

  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const panels = Array.from(root.querySelectorAll<HTMLElement>('[role="tabpanel"]'));
  const clock = root.querySelector<HTMLElement>('[data-stage-clock]');
  const verify = root.querySelector<HTMLElement>('.oju-verify');
  const stage = root.querySelector<HTMLElement>('[data-stage]');
  if (!tabs.length) return;

  // On narrow screens the stage sits well below the chips; when a chip is tapped
  // we bring the stage into view so the change is actually seen.
  const revealStage = (): void => {
    if (!stage) return;
    const r = stage.getBoundingClientRect();
    const offscreen = r.top > window.innerHeight * 0.6 || r.bottom < window.innerHeight * 0.3;
    if (offscreen) {
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      stage.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    }
  };

  const select = (i: number, focus = false): void => {
    tabs.forEach((t, n) => {
      const on = n === i;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      t.dataset.active = String(on);
      if (on && focus) t.focus();
    });
    panels.forEach((p, n) => {
      const on = n === i;
      p.hidden = !on;
      p.dataset.active = String(on);
    });
    if (clock) clock.textContent = CLOCKS[i] ?? '';
    verify?.classList.toggle('is-match', i === 1);
    setIris(i === 1 ? 'match' : 'watch');
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => {
      select(i);
      revealStage();
    });
    tab.addEventListener('keydown', (e: KeyboardEvent) => {
      let next = -1;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (i + 1) % tabs.length;
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft')
        next = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = tabs.length - 1;
      if (next >= 0) {
        e.preventDefault();
        select(next, true);
      }
    });
  });

  select(0);
}
