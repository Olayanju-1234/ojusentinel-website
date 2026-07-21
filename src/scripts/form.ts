/*
  Progressive enhancement for the report form. Without JS the form does a native
  POST to the Pages Function and gets an HTML confirmation back. With JS we
  intercept, POST via fetch, and show inline status — no navigation.
*/
type Tone = 'mut' | 'watch' | 'alert';

function setStatus(el: HTMLElement | null, msg: string, tone: Tone): void {
  if (!el) return;
  el.textContent = msg;
  el.style.color = `var(--${tone})`;
}

export function initReportForm(): void {
  const form = document.querySelector<HTMLFormElement>('[data-report-form]');
  if (!form) return;
  const status = form.querySelector<HTMLElement>('[data-report-status]');
  const btn = form.querySelector<HTMLButtonElement>('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    if (data.get('company')) return; // honeypot — silently drop bots

    if (btn) btn.disabled = true;
    setStatus(status, 'Sending…', 'mut');
    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(String(res.status));
      form.reset();
      setStatus(
        status,
        'Got it — we’ll sweep, verify, and send your report. Watch your inbox.',
        'watch',
      );
    } catch {
      setStatus(
        status,
        'Something went wrong. Email hello@ojusentinel.com and we’ll sort it.',
        'alert',
      );
    } finally {
      if (btn) btn.disabled = false;
    }
  });
}
