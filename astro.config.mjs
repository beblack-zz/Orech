// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // Nutné pro kanonické URL a absolutní adresy v OG tazích.
  // Až bude web na jiné doméně, změň tady.
  site: 'https://orechovahlina.cz',
  // Open studio se přejmenovalo na Dílnu — staré odkazy a záložky vedou dál.
  redirects: {
    '/open-studio': '/dilna',
  },
  vite: {
    plugins: [tailwindcss()]
  }
});