/**
 * POST /api/overit — přihlášení: { odkaz } z mailu (posílá ho skript
 * stránky, viz /k/[odkaz]), nebo { email, kod } opsaný kód. Když platí,
 * uloží klíč člena do cookie, kterou skripty nepřečtou.
 */
import type { APIRoute } from "astro";
import { nastaveni, json, telo, odNas, prihlasCookie } from "../../lib/rezervace/nastaveni";
import { prihlasOdkazem, prihlasKodem } from "../../lib/rezervace/sluzba";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, url }) => {
  if (!odNas(request, url)) return json({ ok: false, chyba: "neznamy" }, 403);
  const n = nastaveni();
  if (!n) return json({ ok: false, chyba: "vypnuto" }, 503);
  const t = (await telo(request)) as { odkaz?: unknown; email?: unknown; kod?: unknown } | null;
  const token = t?.odkaz !== undefined ? await prihlasOdkazem(n, t.odkaz) : await prihlasKodem(n, t?.email, t?.kod);
  if (!token) return json({ ok: false, chyba: "neznamy" }, 401);
  prihlasCookie(cookies, token, url);
  return json({ ok: true });
};
