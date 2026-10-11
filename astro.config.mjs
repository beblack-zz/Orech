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
    // Starý vzhled je pochovaný v src/pages/_stare (podtržítko = Astro ho nestaví).
    // Jeho adresy vedou na dvojky; Pro děti dvojku nemá, termíny dílen byly mezi kurzy.
    '/kurzy': '/kurzy-2',
    '/obchod': '/obchod-2',
    '/parta': '/parta-2',
    '/o-nas': '/o-nas-2',
    '/deti': '/kurzy-2',
  },
  vite: {
    plugins: [tailwindcss()]
  }
});