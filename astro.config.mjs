import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// Static-first. No SSR adapter — the marketing page is fully static; the lead
// form posts to a Cloudflare Pages Function (functions/api/report.ts) that ships
// alongside the static output, so no adapter is required.
export default defineConfig({
  site: 'https://ojusentinel.com',
  output: 'static',
  compressHTML: true,
  build: {
    // Inline the (small) CSS so first paint never waits on a separate,
    // render-blocking stylesheet request over patchy mobile data.
    inlineStylesheets: 'always',
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      cssMinify: 'lightningcss',
    },
  },
});
