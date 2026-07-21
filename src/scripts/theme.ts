/*
  Theme toggle. The pre-paint inline script in Base.astro already applied any
  saved choice (no flash); this wires the toggle, persists the choice, keeps the
  address-bar colour in sync, and re-inks the WebGL eye. With no saved choice the
  page follows the OS and reacts to OS changes live.
*/
import { refreshEyeTheme } from './eye';

const KEY = 'oju-theme';
const SURFACE = { dark: '#080C10', light: '#F6F3EC' } as const;
type Theme = keyof typeof SURFACE;

function effective(): Theme {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'light' || attr === 'dark') return attr;
  return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function setThemeColor(theme: Theme): void {
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', SURFACE[theme]);
}

function stored(): Theme | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

function apply(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* private mode — theme still applies for the session */
  }
  setThemeColor(theme);
  syncToggles(theme);
  window.dispatchEvent(new CustomEvent('oju:theme', { detail: theme }));
  refreshEyeTheme();
}

function syncToggles(theme: Theme): void {
  document.querySelectorAll<HTMLElement>('[data-theme-toggle]').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(theme === 'light'));
  });
}

export function initTheme(): void {
  const start = effective();
  setThemeColor(start);
  syncToggles(start);

  document.querySelectorAll<HTMLElement>('[data-theme-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => apply(effective() === 'light' ? 'dark' : 'light'));
  });

  matchMedia('(prefers-color-scheme: light)').addEventListener?.('change', () => {
    if (stored()) return; // explicit choice wins
    setThemeColor(effective());
    syncToggles(effective());
    window.dispatchEvent(new CustomEvent('oju:theme'));
    refreshEyeTheme();
  });
}
