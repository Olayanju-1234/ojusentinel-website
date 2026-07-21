# OjuSentinel — marketing site

Anti-piracy intelligence for music and film. Static-first marketing site built
for performance on mid-range devices over slow connections.

The vesica "eye" — two overlapping circles whose intersection is a verified
match — is the whole identity system.

## Stack

- **Astro** (static output, islands) — ships almost no JS by default.
- **TypeScript**, **Tailwind CSS v4** (CSS-first, semantic light/dark tokens).
- **Three.js** — the one signature 3D moment (hero eye), a lazy, capability-gated island.
- **GSAP + ScrollTrigger** — scroll choreography, deferred and skipped under reduced-motion.
- Deploy target: **Cloudflare Pages** (edge delivery + Pages Functions for the lead form).

## Develop

```bash
pnpm install
pnpm dev          # http://localhost:4321
pnpm build        # → dist/
pnpm preview      # serve the static build (Functions NOT included)
pnpm format       # prettier (astro + tailwind plugins)
```

Local preview **with** the `/api/report` Function needs Wrangler:

```bash
pnpm build && npx wrangler pages dev dist
```

Dev query params: `?theme=light|dark` forces a theme for that view (also a shareable deep-link).

## Performance budget (mid-tier Android, 4G) — as built

| Metric                  | Budget                              | Built                          |
| ----------------------- | ----------------------------------- | ------------------------------ |
| Eager first-party JS    | ≤ 20 KB gz                          | **~3 KB gz**                   |
| CSS (inlined into HTML) | ≤ 20 KB gz                          | **~6 KB gz**                   |
| Three.js eye            | lazy, gated, 0 on low-power         | **134 KB gz**, separate chunk  |
| GSAP + ScrollTrigger    | deferred, off under reduced-motion  | **~44 KB gz**, separate chunks |
| LCP element             | hero H1 text — never waits on WebGL | ✓                              |

The page renders, reads, and works before any island loads.

## Architecture notes

- **Capability-aware hero eye** (`src/lib/capability.ts`). Three.js loads only on
  capable devices. On reduced-motion, Save-Data, slow connections (2g/3g), low
  memory (<4 GB) or no WebGL, the static SVG eye stays — no 3D downloaded. This is
  separate from reduced-motion: a fast phone with motion on still gets gated on
  device/connection capability.
- **Persistent eye (mode A)** — `src/scripts/eye.ts` is one control surface for
  every eye (nav mark, hero, CTA, sample-card). Flip `PERSIST_EYE` to `false` for
  hero+CTA-only; section punctuation becomes a no-op, no rearchitecting.
- **Reveals can't get stuck hidden** — content is hidden only with JS present, and
  a guaranteed inline failsafe reveals everything if the module bundle never loads.
- **Reduced motion** — full static fallback for eye, ticker, sweeps, reveals, case file.
- **Manual case file** — ARIA tablist, no timed auto-advance; the visitor sets the pace.
- **Self-hosted fonts** — subset woff2, no CDN. Regenerate with
  `node scripts/fetch-fonts.mjs .` (writes `public/fonts/` + `src/styles/fonts.css`).

## Deploy — Cloudflare Pages

Connect the repo (or `npx wrangler pages deploy dist`) with:

- **Build command:** `pnpm build`
- **Output directory:** `dist`
- **Node version:** 20+ (`.node-version` / project setting)
- **Functions:** auto-detected from `./functions` (`/api/report`).
- **Environment variable:** `REPORT_DESTINATION` — where a submitted lead is
  forwarded (email/Sheet/CRM webhook). Wire it in `functions/api/report.ts`
  (marked `TODO`). Until set, leads are accepted but not persisted.

Caching + security headers are in `public/_headers`; `public/_routes.json` routes
only `/api/*` through Functions so every page stays static and edge-cached.

## Honesty

All product scenes and telemetry on the site are **illustrative** and labelled as
such — the DEMO ticker, the case file, the network ("not a live map"), the SAMPLE
report. This is deliberate: the product hasn't launched, and the site says so.
