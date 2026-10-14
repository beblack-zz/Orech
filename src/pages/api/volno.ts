/** GET /api/volno — co je zamluvené ode dneška dál. Tabule na /rezervace se z toho kreslí. */
import type { APIRoute } from "astro";
import { nastaveni, json } from "../../lib/rezervace/nastaveni";
import { volno, COOKIE } from "../../lib/rezervace/sluzba";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const v = await volno(nastaveni(), cookies.get(COOKIE)?.value);
  return json(v.telo, v.stav);
};
