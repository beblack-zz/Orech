/**
 * Nastavení rezervací z proměnných prostředí (vzor je v .env.example,
 * seznam v astro.config.mjs). Bez Supabase vrací null: rezervace nejsou
 * zapojené a stránka jede na ukázce.
 */
import { SUPABASE_URL, SUPABASE_SECRET_KEY, RESEND_API_KEY, REZERVACE_OD, REZERVACE_KOPIE, POZVANKY_TAJEMSTVI } from "astro:env/server";
import type { Nastaveni } from "./sluzba";

export function nastaveni(): Nastaveni | null {
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) return null;
  return {
    db: { url: SUPABASE_URL, klic: SUPABASE_SECRET_KEY },
    posta: RESEND_API_KEY && REZERVACE_OD ? { klic: RESEND_API_KEY, od: REZERVACE_OD, kopie: REZERVACE_KOPIE } : null,
    tajemstvi: POZVANKY_TAJEMSTVI,
  };
}

/** Odpověď v JSON, kterou si nikdo po cestě neuloží — obsazenost se mění a je v ní i jméno člena */
export const json = (telo: unknown, stav = 200) =>
  new Response(JSON.stringify(telo), { status: stav, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "private, no-store" } });

/** Tělo požadavku jako JSON — nebo null, když to JSON není */
export const telo = (request: Request) => request.json().catch(() => null) as Promise<unknown>;

/** Požadavek poslala naše stránka, ne cizí web (prohlížeč u POST posílá hlavičku Origin) */
export const odNas = (request: Request, url: URL) => {
  const origin = request.headers.get("origin");
  return !origin || origin === url.origin;
};
