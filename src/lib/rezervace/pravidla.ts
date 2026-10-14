/**
 * Pravidla rezervace na serveru: co z toho, co poslal prohlížeč, se smí
 * pustit do databáze. Čísla jsou z data/rezervace.ts, stejná jako na
 * stránce — prohlížeči se ale nevěří, tak se tu všechno ověří znovu.
 * Jestli je volno, tady neřešíme; to ví jen databáze.
 */
import { rezervace as R, permanentka as P, odjezdy } from "../../data/rezervace";
import type { Druh, Zadost } from "./typy";

const dvoj = (n: number) => String(n).padStart(2, "0");

/** 10.5 → „10:30“ (s nulou vpředu, jak to chce databáze) */
export const naCas = (h: number) => `${dvoj(Math.floor(h))}:${dvoj(Math.round((h % 1) * 60))}`;
/** „10:30“ → 10.5 */
export const zCasu = (cas: string) => Number(cas.slice(0, 2)) + Number(cas.slice(3, 5)) / 60;

export const jeUuid = (s: unknown): s is string => typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

/** Den jako půlnoc UTC — s daty se tu počítá bez časových pásem */
const utc = (den: string) => new Date(`${den}T00:00:00Z`);
const klic = (d: Date) => `${d.getUTCFullYear()}-${dvoj(d.getUTCMonth() + 1)}-${dvoj(d.getUTCDate())}`;
export const denVTydnu = (den: string) => utc(den).getUTCDay();

export interface Ted {
  /** Dnešek v dílně jako RRRR-MM-DD */
  den: string;
  /** Kolik je v dílně hodin, i s minutami: 10.5 je 10:30 */
  h: number;
}

/** Dnešek a čas v dílně — server běží kdekoli, dílna je v Česku */
export function ted(okamzik = new Date()): Ted {
  const c = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Prague", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(okamzik)
      .map((x) => [x.type, x.value]),
  );
  return { den: `${c.year}-${c.month}-${c.day}`, h: Number(c.hour) + Number(c.minute) / 60 };
}

/** Poslední den platnosti permanentky, která začíná daným dnem — stejně jako platnostPermanentky() na stránce */
export function konecPermanentky(den: string): string {
  const d = utc(den);
  return klic(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + P.mesicu, d.getUTCDate() - 1)));
}

const DRUHY: Druh[] = ["odjezd", "kurz", "permanentka"];

/** Vrátí žádost očištěnou a ověřenou, nebo null, když s pravidly nesedí */
export function over(telo: unknown, nyni: Ted): Zadost | null {
  if (!telo || typeof telo !== "object") return null;
  const t = telo as Record<string, unknown>;
  const druh = t.druh as Druh;
  if (!DRUHY.includes(druh)) return null;

  const den = t.den;
  if (typeof den !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(den) || Number.isNaN(utc(den).getTime()) || klic(utc(den)) !== den) return null;
  const zaDni = Math.round((utc(den).getTime() - utc(nyni.den).getTime()) / 86_400_000);
  if (zaDni < 0 || zaDni > R.dniDopredu) return null;

  const osob = t.osob;
  if (typeof osob !== "number" || !Number.isInteger(osob) || osob < 1 || osob > R.maxOsob) return null;

  let poznamka: string | undefined;
  if (t.poznamka !== undefined && t.poznamka !== null) {
    if (typeof t.poznamka !== "string" || t.poznamka.length > 300) return null;
    poznamka = t.poznamka.trim() || undefined;
  }

  if (druh === "kurz") {
    /* Jestli ten den kurz jede, ví databáze; tady jen že ještě nevyjel */
    if (zaDni === 0 && nyni.h >= R.od) return null;
    return { druh, den, hodiny: [], osob, poznamka };
  }

  if (!R.dny.includes(denVTydnu(den))) return null;
  if (!Array.isArray(t.hodiny) || !t.hodiny.length || new Set(t.hodiny).size !== t.hodiny.length) return null;
  const hodiny = t.hodiny as unknown[];
  const spoje = P.spoje.map((s) => s.h);
  /* První a poslední spoj dne patří permanentkám, zbytek hodinovým jízdenkám */
  const povolene = druh === "permanentka" ? spoje : odjezdy.filter((h) => !spoje.includes(h));
  for (const h of hodiny) {
    if (typeof h !== "number" || !povolene.includes(h)) return null;
    if (zaDni === 0 && h <= nyni.h) return null;
  }
  return { druh, den, hodiny: (hodiny as number[]).slice().sort((a, b) => a - b), osob, poznamka };
}
