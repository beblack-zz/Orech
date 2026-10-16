/**
 * Rezervace na serveru — co dělají adresy v src/pages/api a /k/[token].
 *
 * Rezervovat smí jen lidi z tabulky `clenove` v Supabase: dílna tam člověka
 * zapíše, databáze si řekne webu (pozvi) a ten mu pošle mail s osobním
 * odkazem /k/<token>. Odkaz uloží token do cookie a s ní už jde rezervovat
 * a rušit. Kdo cookie nemá, vidí jen, co je volné.
 *
 * Funkce tu nevědí nic o Astru: dostanou nastavení a data, vrátí stav
 * a odpověď. Dá se tak zkoušet bez serveru.
 */
import { rezervace as R, permanentka as P } from "../../data/rezervace";
import { rpc, ChybaDb } from "./db";
import type { Pripojeni } from "./db";
import { posli, pozvanka, potvrzeni, zruseni } from "./posta";
import type { Posta } from "./posta";
import { over, ted, jeUuid, naCas, zCasu, konecPermanentky } from "./pravidla";
import type { Chyba, Druh, Odpoved, Volno } from "./typy";

/** Cookie s tokenem člena — nastavuje ji /k/[token] */
export const COOKIE = "clen";
/** Jak dlouho si web člena pamatuje, ve vteřinách */
export const COOKIE_PLATI = 400 * 86_400;

export interface Nastaveni {
  db: Pripojeni;
  /** Bez pošty se rezervuje dál, jen nechodí maily */
  posta: Posta | null;
  /** Čím se databáze prokazuje, když žádá o odeslání pozvánky */
  tajemstvi?: string;
}

export interface Vysledek<T> {
  stav: number;
  telo: T;
}

const NE: Record<string, number> = { neznamy: 401, spatne: 400, vypnuto: 503, chyba: 500 };
const ne = (chyba: Chyba): Vysledek<Odpoved> => ({ stav: NE[chyba] ?? 409, telo: { ok: false, chyba } });
const ANO: Vysledek<Odpoved> = { stav: 200, telo: { ok: true } };

/** Hlášky, kterými umí odmítnout databáze (supabase/schema.sql) */
const Z_DB: Chyba[] = ["neznamy", "obsazeno", "plno", "zavreno", "vyluka", "nejede", "pozde", "permanentka", "nenalezeno"];
function zDb(e: unknown): Vysledek<Odpoved> {
  if (e instanceof ChybaDb && (Z_DB as string[]).includes(e.kod)) return ne(e.kod as Chyba);
  /* Dva lidi ve stejnou vteřinu: zámek to chytí, index je pojistka */
  if (e instanceof ChybaDb && e.stav === 409) return ne("obsazeno");
  console.error("[rezervace] databáze", e);
  return ne("chyba");
}

const PRAZDNO: Volno = { zive: false, obsazeno: [], zavreno: [], kurzy: [], permanentky: [], clen: null, moje: [] };

interface VolnoDb {
  obsazeno: { den: string; cas: string; osob: number }[];
  zavreno: { den: string; cas: string | null }[];
  kurzy: Volno["kurzy"];
  permanentky: { dt: number; cas: string; osob: number; do: string }[];
  clen: Volno["clen"];
  moje: { id: number; druh: Druh; den: string; do: string | null; cas: string | null; osob: number }[];
}

/** Co je zamluvené ode dneška dál; s platným tokenem i kdo se ptá a jeho jízdenky */
export async function volno(n: Nastaveni | null, token: string | undefined, nyni = ted()): Promise<Vysledek<Volno>> {
  if (!n) return { stav: 200, telo: PRAZDNO };
  try {
    const v = await rpc<VolnoDb>(n.db, "volno", { p_od: nyni.den, p_token: jeUuid(token) ? token : null });
    return {
      stav: 200,
      telo: {
        zive: true,
        obsazeno: v.obsazeno.map((o) => ({ den: o.den, h: zCasu(o.cas), osob: o.osob })),
        zavreno: v.zavreno.map((z) => ({ den: z.den, h: z.cas === null ? null : zCasu(z.cas) })),
        kurzy: v.kurzy,
        permanentky: v.permanentky.map((p) => ({ dt: p.dt, h: zCasu(p.cas), osob: p.osob, do: p.do })),
        clen: v.clen,
        moje: v.moje.map((m) => ({ id: m.id, druh: m.druh, den: m.den, do: m.do, h: m.cas === null ? null : zCasu(m.cas), osob: m.osob })),
      },
    };
  } catch (e) {
    console.error("[rezervace] volno", e);
    return { stav: 502, telo: PRAZDNO };
  }
}

/** Patří token některému členovi? Ptá se /k/[token], než ho uloží do cookie. */
export async function znam(n: Nastaveni | null, token: string | undefined): Promise<boolean> {
  if (!n || !jeUuid(token)) return false;
  try {
    return !!(await rpc<string | null>(n.db, "clen", { p_token: token }));
  } catch (e) {
    console.error("[rezervace] odkaz", e);
    return false;
  }
}

export async function rezervuj(n: Nastaveni | null, token: string | undefined, telo: unknown, web: string, nyni = ted()): Promise<Vysledek<Odpoved>> {
  if (!n) return ne("vypnuto");
  if (!jeUuid(token)) return ne("neznamy");
  const z = over(telo, nyni);
  if (!z) return ne("spatne");
  /* vyluk = kolik týdnů permanentky má výluku (jede kurz) — ty se neplatí */
  let r: { jmeno: string; email: string; kurz: string | null; vyluk: number | null };
  try {
    r = await rpc(n.db, "rezervuj", {
      p_token: token,
      p_druh: z.druh,
      p_den: z.den,
      p_hodiny: z.hodiny.map(naCas),
      p_osob: z.osob,
      p_den_do: z.druh === "permanentka" ? konecPermanentky(z.den) : null,
      /* Kolik míst má odjezd nebo spoj permanentky — kurz má svá v tabulce kurzů */
      p_mist: z.druh === "permanentka" ? P.mist : z.druh === "odjezd" ? R.mist : null,
      p_poznamka: z.poznamka ?? null,
    });
  } catch (e) {
    return zDb(e);
  }
  /* Zamluveno je, i kdyby mail neodešel — ten je jen potvrzení */
  if (n.posta) await posli(n.posta, potvrzeni(r, z, r.kurz, web, r.vyluk ?? 0));
  return ANO;
}

export async function zrus(n: Nastaveni | null, token: string | undefined, telo: unknown): Promise<Vysledek<Odpoved>> {
  if (!n) return ne("vypnuto");
  if (!jeUuid(token)) return ne("neznamy");
  const id = (telo as { id?: unknown } | null)?.id;
  if (typeof id !== "number" || !Number.isInteger(id)) return ne("spatne");
  let r: { druh: Druh; den: string; cas: string | null; osob: number; jmeno: string; email: string };
  try {
    r = await rpc(n.db, "zrus", { p_token: token, p_id: id, p_hodin: R.zrusitHodinPredem });
  } catch (e) {
    return zDb(e);
  }
  if (n.posta) await posli(n.posta, zruseni(r, { druh: r.druh, den: r.den, h: r.cas === null ? null : zCasu(r.cas), osob: r.osob }));
  return ANO;
}

/** Stejné texty? Porovnává vždycky celé, ať se z doby odpovědi nedá hádat. */
function shodne(a: string, b: string) {
  let rozdil = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) rozdil |= a.charCodeAt(i) ^ b.charCodeAt(i % (b.length || 1));
  return rozdil === 0;
}

/**
 * Pošle členovi mail s jeho odkazem. Volá to databáze, když v tabulce
 * `clenove` přibude člověk (nebo mu někdo smaže pozvanka_odeslana) —
 * prokáže se tajemstvím v hlavičce Authorization.
 */
export async function pozvi(n: Nastaveni | null, autorizace: string | null, telo: unknown, web: string): Promise<Vysledek<Odpoved>> {
  if (!n || !n.posta || !n.tajemstvi) return ne("vypnuto");
  if (!autorizace || !shodne(autorizace, `Bearer ${n.tajemstvi}`)) return ne("neznamy");
  const id = (telo as { id?: unknown } | null)?.id;
  if (typeof id !== "number" || !Number.isInteger(id)) return ne("spatne");
  try {
    const c = await rpc<{ jmeno: string; email: string; token: string } | null>(n.db, "pozvanka", { p_id: id });
    /* Už odešla, nebo je člen vypnutý — není co dělat */
    if (!c) return ANO;
    if (!(await posli(n.posta, pozvanka(c, `${web}/k/${c.token}`)))) return ne("chyba");
    await rpc(n.db, "pozvanka_hotovo", { p_id: id });
    return ANO;
  } catch (e) {
    return zDb(e);
  }
}
