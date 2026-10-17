/**
 * /k/<odkaz> — jednorázový odkaz z přihlašovacího mailu. Tady se ještě
 * nespotřebuje: pošta (Outlook, antiviry) odkazy v mailech sama otevírá
 * a jednorázový odkaz by tím propadl dřív, než na něj člověk klikne.
 * Proto se jen přesměruje na /rezervace s odkazem za mřížkou — tu server
 * nevidí — a přihlásí až skript stránky (/api/overit), který roboti
 * nepouštějí.
 */
import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = ({ params }) =>
  new Response(null, {
    status: 302,
    headers: { Location: `/rezervace#k=${encodeURIComponent(params.odkaz ?? "")}`, "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" },
  });
