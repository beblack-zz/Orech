/**
 * Mapa webu pro vyhledávače — jen stránky, které do nich patří. Komnaty hry
 * (Papírna, U mistra, Svatyně), pracovní Marcel a 404 mají noindex, tak tu nejsou.
 * Dokud je robots.txt zavřený (Disallow: /), vyhledávače ji stejně nečtou.
 */
import type { APIRoute } from "astro";

const STRANKY = ["/", "/dilna", "/rezervace", "/obchod", "/obchod/futatsu", "/parta", "/o-nas", "/kontakt"];

export const GET: APIRoute = ({ site }) => {
  const web = site ?? new URL("https://orechovahlina.cz");
  const radky = STRANKY.map((s) => `  <url><loc>${new URL(s, web).href}</loc></url>`).join("\n");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${radky}\n</urlset>\n`, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
