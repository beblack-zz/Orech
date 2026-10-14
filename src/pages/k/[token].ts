/**
 * /k/<token> — osobní odkaz člena z pozvánky. Platný token se uloží do
 * cookie, kterou skripty nepřečtou, a hned se jde na /rezervace, ať odkaz
 * nezůstane v adresním řádku. Neplatný jde tamtéž s poznámkou.
 */
import type { APIRoute } from "astro";
import { nastaveni } from "../../lib/rezervace/nastaveni";
import { znam, COOKIE, COOKIE_PLATI } from "../../lib/rezervace/sluzba";

export const prerender = false;

export const GET: APIRoute = async ({ params, cookies, redirect, url }) => {
  if (!(await znam(nastaveni(), params.token))) return redirect("/rezervace?odkaz=neplatny", 302);
  cookies.set(COOKIE, params.token!, { path: "/", httpOnly: true, secure: url.protocol === "https:", sameSite: "lax", maxAge: COOKIE_PLATI });
  return redirect("/rezervace", 302);
};
