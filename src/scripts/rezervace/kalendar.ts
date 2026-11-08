/**
 * Kalendář rezervací: odkud stránka ví, co je volné a kdo se dívá.
 *
 * Když jsou rezervace zapojené (Supabase, viz src/lib/rezervace), bere se
 * skutečná obsazenost z /api/volno. Kdo je přihlášený (cookie po odkazu
 * nebo kódu z mailu), dostane s ní i své jméno a jízdenky a může
 * rezervovat; ostatní vidí tabuli jen ke čtení a místo označení jízdenky
 * dostanou registraci (prihlaseni.ts).
 *
 * Když zapojené nejsou (nebo server neodpoví), zůstává ukázka ze
 * simulace.ts a rezervovat nemůže nikdo. Zbytek stránky rozdíl nepozná:
 * dostane dny ve stejném tvaru.
 */
import { rezervace as R, kurzy, odjezdyDne } from "../../data/rezervace";
import { simuluj, ukazkovePermanentky, kurzDne, klicDne, naPermanentku, volnoTydne } from "./simulace";
import type { Den, Hodina } from "./simulace";
import type { Volno, Moje, Zadost, Odpoved } from "../../lib/rezervace/typy";

export interface Kalendar {
  /** false = ukázka: obsazenost je vymyšlená a rezervovat nejde */
  zive: boolean;
  dny: Den[];
  /** Kolik míst je volných na odjezdu dne `datum` v hodinu `h` — i za měsícem, kam sahá permanentka */
  volnoTydne(datum: Date, h: number): number;
  /** Jede ten den kurz? Permanentka má ten den výluku. */
  jeKurz(d: Date): boolean;
  /** Člen, který přišel přes svůj odkaz — smí rezervovat rovnou */
  clen: { jmeno: string } | null;
  moje: Moje[];
}

export function ukazka(dnes: Date): Kalendar {
  const pasy = ukazkovePermanentky(dnes);
  const dny = simuluj(dnes, pasy);
  const jeKurz = (d: Date) => !!kurzDne(d);
  return {
    zive: false,
    dny,
    volnoTydne: (datum, h) => volnoTydne(dny, pasy, datum, h),
    jeKurz,
    clen: null,
    moje: [],
  };
}

/** Ze seznamu toho, co je zamluvené, udělá dny, jak je čeká tabule */
export function zVolna(v: Volno, dnes: Date, ted = new Date()): Kalendar {
  /* Kolik míst je na kterém odjezdu pryč — server je posílá sečtené, ale kdyby ne, sečtou se tady */
  const obsazeno = new Map<string, number>();
  for (const o of v.obsazeno) obsazeno.set(`${o.den}-${o.h}`, (obsazeno.get(`${o.den}-${o.h}`) ?? 0) + o.osob);
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
    const hodiny: Hodina[] = odjezdyDne(d.getDay()).map((h) => ({
      h,
      /* Na místech odjezdu sedí jízdenky toho dne i permanentky, které ten den platí */
      volno: zavreno.has(`${klic}-${h}`) ? 0 : Math.max(0, R.mist - (obsazeno.get(`${klic}-${h}`) ?? 0) - naPermanentku(v.permanentky, klic, d.getDay(), h)),
      probehlo: new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(h), (h % 1) * 60) <= ted,
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
  const jeKurz = (d: Date) => kurzDny.has(klicDne(d));
  return {
    zive: true,
    dny,
    volnoTydne: (datum, h) => volnoTydne(dny, v.permanentky, datum, h),
    jeKurz,
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
    /* server neodpověděl nebo na hostingu není — zůstane ukázka */
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
