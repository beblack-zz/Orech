// @ts-check
import { defineConfig, envField } from 'astro/config';

import netlify from '@astrojs/netlify';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // Nutné pro kanonické URL a absolutní adresy v OG tazích.
  // Až bude web na jiné doméně, změň tady.
  site: 'https://orechovahlina.cz',
  // Open studio se přejmenovalo na Dílnu — staré odkazy a záložky vedou dál.
  redirects: {
    '/open-studio': '/dilna',
    // Starý vzhled je pochovaný v src/pages/_stare (podtržítko = Astro ho nestaví).
    // Jeho adresy vedou na dvojky; Pro děti dvojku nemá, termíny dílen byly mezi kurzy.
    '/kurzy': '/kurzy-2',
    '/obchod': '/obchod-2',
    '/parta': '/parta-2',
    '/o-nas': '/o-nas-2',
    '/deti': '/kurzy-2',
  },
  // Web je statický; na serveru běží jen rezervace (src/pages/api a /k/[token]),
  // které mají `prerender = false`. Jiný hosting = jiný adaptér, nic dalšího.
  adapter: netlify(),
  // Klíče k rezervacím — jen na serveru, do prohlížeče se nedostanou. Všechny
  // jsou nepovinné: dokud chybí Supabase, /rezervace ukazuje ukázkovou
  // obsazenost a jízdenka odchází mailem jako dřív. Vzor je v .env.example.
  env: {
    schema: {
      SUPABASE_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      SUPABASE_SECRET_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      RESEND_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      REZERVACE_OD: envField.string({ context: 'server', access: 'secret', optional: true }),
      REZERVACE_KOPIE: envField.string({ context: 'server', access: 'secret', optional: true }),
      POZVANKY_TAJEMSTVI: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
  vite: {
    plugins: [tailwindcss()]
  }
});