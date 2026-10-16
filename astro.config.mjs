// @ts-check
import { defineConfig, envField } from 'astro/config';

import netlify from '@astrojs/netlify';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // Nutné pro kanonické URL a absolutní adresy v OG tazích.
  // Až bude web na jiné doméně, změň tady.
  site: 'https://orechovahlina.cz',
  // Web je statický; na serveru běží jen rezervace a objednávky (src/pages/api
  // a /k/[token]), které mají `prerender = false`. Jiný hosting = jiný adaptér, nic dalšího.
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
      // Kam chodí objednávky šátku a dárkových jízdenek (bez ní na e-mail z kontaktu)
      OBJEDNAVKY_KOMU: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
  vite: {
    plugins: [tailwindcss()]
  }
});