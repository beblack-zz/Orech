/**
 * POST /api/registrace — { jmeno, email }: nový člověk se zapíše
 * a přijde mu mail, kterým registraci potvrdí (a rovnou se přihlásí).
 * Kdo už je členem, dostane přihlášení. Odpověď je pokaždé stejná.
 */
import type { APIRoute } from "astro";
import { nastaveni, json, telo, odNas } from "../../lib/rezervace/nastaveni";
import { registruj } from "../../lib/rezervace/sluzba";

export const prerender = false;

export const POST: APIRoute = async ({ request, url }) => {
  if (!odNas(request, url)) return json({ ok: false, chyba: "neznamy" }, 403);
  const v = await registruj(nastaveni(), await telo(request), url.origin);
  return json(v.telo, v.stav);
};
