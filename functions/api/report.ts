/*
  POST /api/report — the free-report lead endpoint (Cloudflare Pages Function).
  Validates, drops honeypot hits, and returns JSON to the enhanced form or an
  HTML confirmation to the no-JS native POST.

  TODO(REPORT_DESTINATION): wire the accepted lead to its real destination
  (transactional email / Google Sheet / CRM webhook). Bind REPORT_DESTINATION in
  the Pages project settings and forward there. Until then the lead is accepted
  (so the UX is real) but not persisted server-side.
*/
interface Env {
  REPORT_DESTINATION?: string;
}
interface Ctx {
  request: Request;
  env: Env;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const onRequestPost = async (ctx: Ctx): Promise<Response> => {
  const { request } = ctx;
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return respond(request, false, 'Could not read the form.', 400);
  }

  const name = String(form.get('name') ?? '').trim();
  const email = String(form.get('email') ?? '').trim();
  const honeypot = String(form.get('company') ?? '').trim();

  // Bot tripped the honeypot — look successful, do nothing.
  if (honeypot) return respond(request, true);

  if (!name || name.length > 200 || !EMAIL_RE.test(email) || email.length > 320) {
    return respond(request, false, 'Please give a name and a valid email.', 400);
  }

  // TODO(REPORT_DESTINATION): forward { name, email, ts } to the real sink, e.g.
  // if (ctx.env.REPORT_DESTINATION) {
  //   await fetch(ctx.env.REPORT_DESTINATION, {
  //     method: 'POST',
  //     headers: { 'content-type': 'application/json' },
  //     body: JSON.stringify({ name, email, ts: new Date().toISOString() }),
  //   });
  // }

  return respond(request, true);
};

function respond(request: Request, ok: boolean, message = '', status = 200): Response {
  const wantsJson = (request.headers.get('accept') ?? '').includes('application/json');
  if (wantsJson) {
    return new Response(JSON.stringify({ ok, message }), {
      status: ok ? 200 : status,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }
  return new Response(ok ? THANKS_HTML : errorHtml(message), {
    status: ok ? 200 : status,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

const PAGE = (title: string, body: string): string => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — OjuSentinel</title>
<style>
  :root { color-scheme: dark; }
  body { margin:0; min-height:100vh; display:grid; place-items:center; background:#080C10; color:#F0EEE6;
    font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; padding:24px; }
  .card { max-width:520px; text-align:center; }
  h1 { font-size:28px; letter-spacing:-.01em; margin:0 0 12px; }
  p { color:#9FB1BF; line-height:1.6; margin:0 0 22px; }
  a { display:inline-block; background:#F2B544; color:#141008; text-decoration:none;
    padding:12px 22px; border-radius:12px; font-weight:700; }
  small { display:block; margin-top:26px; color:#5E7284; font-size:11px; letter-spacing:.08em; }
</style></head><body><div class="card">${body}</div></body></html>`;

const THANKS_HTML = PAGE(
  'Thanks',
  `<h1>Got it.</h1>
   <p>We’ll sweep, verify, and send your free piracy report to the email you gave us. Every finding is human-checked before it reaches you.</p>
   <a href="/">Back to OjuSentinel</a>
   <small>ALL PRODUCT SCENES &amp; TELEMETRY ON THE SITE ARE ILLUSTRATIVE</small>`,
);

const errorHtml = (message: string): string =>
  PAGE(
    'Something went wrong',
    `<h1>That didn’t send.</h1>
     <p>${message || 'Please go back and try again.'}</p>
     <a href="/#cta">Back to the form</a>`,
  );
