/**
 * POST /api/pozvanka — pošle novému členovi mail s jeho odkazem. Nevolá to
 * stránka, ale databáze (trigger v supabase/schema.sql), a prokazuje se
 * tajemstvím POZVANKY_TAJEMSTVI.
 */
import type { APIRoute } from "astro";
import { nastaveni, json, telo } from "../../lib/rezervace/nastaveni";
import { pozvi } from "../../lib/rezervace/sluzba";

export const prerender = false;

export const POST: APIRoute = async ({ request, url }) => {
  const v = await pozvi(nastaveni(), request.headers.get("authorization"), await telo(request), url.origin);
  return json(v.telo, v.stav);
};
