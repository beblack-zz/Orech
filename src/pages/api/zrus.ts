/** POST /api/zrus — člen zruší vlastní jízdenku. */
import type { APIRoute } from "astro";
import { nastaveni, json, telo, odNas } from "../../lib/rezervace/nastaveni";
import { zrus, COOKIE } from "../../lib/rezervace/sluzba";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, url }) => {
  if (!odNas(request, url)) return json({ ok: false, chyba: "neznamy" }, 403);
  const v = await zrus(nastaveni(), cookies.get(COOKIE)?.value, await telo(request));
  return json(v.telo, v.stav);
};
