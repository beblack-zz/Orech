/**
 * POST /api/prihlas — člověk zadal e-mail; když je mezi členy, přijde mu
 * jednorázový odkaz s kódem. Odpověď je pokaždé stejná.
 */
import type { APIRoute } from "astro";
import { nastaveni, json, telo, odNas } from "../../lib/rezervace/nastaveni";
import { posliOdkaz } from "../../lib/rezervace/sluzba";

export const prerender = false;

export const POST: APIRoute = async ({ request, url }) => {
  if (!odNas(request, url)) return json({ ok: false, chyba: "neznamy" }, 403);
  const v = await posliOdkaz(nastaveni(), await telo(request), url.origin);
  return json(v.telo, v.stav);
};
