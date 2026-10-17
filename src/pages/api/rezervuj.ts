/** POST /api/rezervuj — zamluví, co je na jízdence. Jen pro přihlášeného člena (cookie z /api/overit). */
import type { APIRoute } from "astro";
import { nastaveni, json, telo, odNas } from "../../lib/rezervace/nastaveni";
import { rezervuj, COOKIE } from "../../lib/rezervace/sluzba";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, url }) => {
  if (!odNas(request, url)) return json({ ok: false, chyba: "neznamy" }, 403);
  const v = await rezervuj(nastaveni(), cookies.get(COOKIE)?.value, await telo(request), url.origin);
  return json(v.telo, v.stav);
};
