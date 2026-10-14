/**
 * Kalendář rezervací: odkud stránka ví, co je volné a kdo se dívá.
 *
 * Když jsou rezervace zapojené (Supabase, viz src/lib/rezervace), bere se
 * skutečná obsazenost z /api/volno. Kdo přišel přes svůj odkaz z pozvánky,
 * dostane s ní i své jméno a jízdenky a může rezervovat rovnou; ostatní
 * vidí tabuli jen ke čtení a jízdenka jim odchází mailem.
 *
 * Když zapojené nejsou (nebo server neodpoví), zůstává ukázka ze
 * simulace.ts a mail — tak jako dřív. Zbytek stránky rozdíl nepozná:
 * dostane dny ve stejném tvaru.
 */
import { rezervace as R, kurzy, permanentka as P, odjezdy } from "../../data/rezervace";
import { simuluj, obsazenoPermanentek, kurzDne, klicDne, jeSpojPermanentky } from "./simulace";
import type { Den, Hodina } from "./simulace";
import type { Volno, Moje, Zadost, Odpoved } from "../../lib/rezervace/typy";

export interface Kalendar {
  /** false = ukázka: obsazenost je vymyšlená a jízdenka odchází mailem */
  zive: boolean;
  dny: Den[];
  /** Kolik permanentek je na který spoj prodaných, když by se začalo jezdit tímhle dnem */
  pas(d: Den | undefined): Map<number, number>;
  /** Jede ten den kurz? Permanentka má ten den výluku. */
  jeKurz(d: Date): boolean;
  /** Člen, který přišel přes svůj odkaz — smí rezervovat rovnou */
  clen: { jmeno: string } | null;
  moje: Moje[];
}

export function ukazka(dnes: Date): Kalendar {
  const podleDne = new Map<number, Map<number, number>>();
  return {
    zive: false,
    dny: simuluj(dnes),
    /* Úterky mají svoje místa a pátky svoje */
    pas(d) {
      if (!d) return new Map();
      const dt = d.datum.getDay();
      if (!podleDne.has(dt)) podleDne.set(dt, obsazenoPermanentek(dnes, dt));
      return podleDne.get(dt)!;
    },
    jeKurz: (d) => !!kurzDne(d),
    clen: null,
    moje: [],
  };
}

/** Ze seznamu toho, co je zamluvené, udělá dny, jak je čeká tabule */
export function zVolna(v: Volno, dnes: Date, ted = new Date()): Kalendar {
  const obsazeno = new Set(v.obsazeno.map((o) => `${o.den}-${o.h}`));
  const zavreno = new Set(v.zavreno.map((z) => (z.h === null ? z.den : `${z.den}-${z.h}`)));
  const kurzDny = new Map(v.kurzy.map((k) => [k.den, k]));
  const dny: Den[] = [];
  for (let i = 0; i <= R.dniDopredu; i++) {
    const d = new Date(dnes.getFullYear(), dnes.getMonth(), dnes.getDate() + i);
    const klic = klicDne(d);
    const vypsany = kurzDny.get(klic);
    /* Kurz, který web nezná (překlep v tabulce), se neukáže */
    const kurz = vypsany && kurzy.find((k) => k.id === vypsany.kurz);
    if (!kurz && (!R.dny.includes(d.getDay()) || zavreno.has(klic))) continue;
    const hodiny: Hodina[] = odjezdy.map((h) => ({
      h,
      volno: !obsazeno.has(`${klic}-${h}`) && !zavreno.has(`${klic}-${h}`),
      probehlo: new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(h), (h % 1) * 60) <= ted,
      pas: jeSpojPermanentky(h),
    }));
    const den: Den = { datum: d, klic, hodiny };
    if (kurz && vypsany) {
      const prvni = Math.min(...kurz.program.map((z) => z.h), R.od);
      den.kurz = {
        /* Kolik je míst, říká tabulka kurzů — může se lišit termín od termínu */
        kurz: { ...kurz, mist: vypsany.mist },
        obsazeno: Math.min(vypsany.mist, vypsany.obsazeno),
        probehlo: new Date(d.getFullYear(), d.getMonth(), d.getDate(), prvni) <= ted,
      };
    }
    dny.push(den);
  }
  const pasy = new Map<string, Map<number, number>>();
  return {
    zive: true,
    dny,
    /* Kryjí se ty permanentky na stejný den v týdnu, které ten den ještě platí */
    pas(d) {
      if (!d) return new Map();
      if (!pasy.has(d.klic)) {
        const dt = d.datum.getDay();
        pasy.set(d.klic, new Map(P.spoje.map((s) => [s.h, Math.min(P.mist, v.permanentky.filter((p) => p.dt === dt && p.h === s.h && p.do >= d.klic).reduce((a, p) => a + p.osob, 0))])));
      }
      return pasy.get(d.klic)!;
    },
    jeKurz: (d) => kurzDny.has(klicDne(d)),
    clen: v.clen,
    moje: v.moje,
  };
}

/** Skutečný kalendář, když je — jinak ukázka */
export async function nactiKalendar(dnes: Date): Promise<Kalendar> {
  const stop = new AbortController();
  const limit = window.setTimeout(() => stop.abort(), 6000);
  try {
    const r = await fetch("/api/volno", { headers: { Accept: "application/json" }, signal: stop.signal });
    const v = (await r.json()) as Volno;
    if (r.ok && v.zive) return zVolna(v, dnes);
  } catch {
    /* server neodpověděl nebo na hostingu není — zůstane ukázka a mail */
  } finally {
    window.clearTimeout(limit);
  }
  return ukazka(dnes);
}

/** Zamluvit nebo zrušit. Když se to nepovede ani odeslat, vrátí obecnou chybu. */
export async function posli(cesta: "/api/rezervuj", telo: Zadost): Promise<Odpoved>;
export async function posli(cesta: "/api/zrus", telo: { id: number }): Promise<Odpoved>;
export async function posli(cesta: string, telo: unknown): Promise<Odpoved> {
  try {
    const r = await fetch(cesta, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(telo) });
    return (await r.json()) as Odpoved;
  } catch {
    return { ok: false, chyba: "chyba" };
  }
}
