/** POST /api/objednavka — šátek z obchodu nebo dárková jízdenka. Veřejné, bez přihlášení (src/lib/objednavky.ts). */
import type { APIRoute } from "astro";
import { json, telo, odNas } from "../../lib/rezervace/nastaveni";
import { precti, prijmi, prilisCasto } from "../../lib/objednavky";

export const prerender = false;

export const POST: APIRoute = async ({ request, url, clientAddress }) => {
  if (!odNas(request, url)) return json({ ok: false, chyba: "spatne" }, 403);
  const t = await telo(request);
  /* Skryté pole „web“ vyplní jen robot — dostane „hotovo“, ať nezkouší dál, ale nic se nestane */
  if (t && typeof t === "object" && (t as Record<string, unknown>).web) return json({ ok: true, naoko: true });
  if (prilisCasto(clientAddress ?? request.headers.get("x-nf-client-connection-ip") ?? "?")) return json({ ok: false, chyba: "moc" }, 429);
  const o = precti(t);
  if (!o) return json({ ok: false, chyba: "spatne" }, 400);
  const v = await prijmi(o);
  return json(v, v.ok ? 200 : v.chyba === "posta" ? 502 : 400);
};
