/** POST /api/odhlas — zapomene přihlášení v tomhle prohlížeči. */
import type { APIRoute } from "astro";
import { json, odNas } from "../../lib/rezervace/nastaveni";
import { COOKIE } from "../../lib/rezervace/sluzba";

export const prerender = false;

export const POST: APIRoute = ({ request, cookies, url }) => {
  if (!odNas(request, url)) return json({ ok: false, chyba: "neznamy" }, 403);
  cookies.delete(COOKIE, { path: "/" });
  return json({ ok: true });
};
