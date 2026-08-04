// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // Nutné pro kanonické URL a absolutní adresy v OG tazích.
  // Až bude web na jiné doméně, změň tady.
  site: 'https://orechovahlina.cz',
  vite: {
    plugins: [tailwindcss()]
  }
});