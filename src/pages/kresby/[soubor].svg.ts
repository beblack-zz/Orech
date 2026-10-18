/**
 * Kresby z patičky a velké kresby stránek (Dílna, O nás) jako samostatné
 * soubory /kresby/<jméno>.svg (obsah v _kresby.ts). Staví se při buildu
 * jako statické soubory.
 */
import type { APIRoute, GetStaticPaths } from "astro";
import { kresby } from "./_kresby";

export const getStaticPaths = (async () =>
  [...(await kresby()).keys()].map((soubor) => ({ params: { soubor } }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const obsah = (await kresby()).get(params.soubor!);
  if (!obsah) return new Response(null, { status: 404 });
  return new Response(obsah, { headers: { "Content-Type": "image/svg+xml; charset=utf-8" } });
};
