/**
 * Rezervace na serveru — co dělají adresy v src/pages/api a /k/[odkaz].
 *
 * Rezervovat smí jen lidi z tabulky `clenove` v Supabase s potvrzeným
 * e-mailem. Na /rezervace se člověk zaregistruje jménem a e-mailem
 * (registruj) a přijde mu mail s jednorázovým odkazem /k/<odkaz> a kódem;
 * kliknutím registraci potvrdí a je rovnou přihlášený. Dílna může člověka
 * zapsat i sama a databáze si pak řekne webu (pozvi) o uvítací mail.
 * Další přihlášení je bez hesla: zadá e-mail (posliOdkaz) a přijde mu
 * odkaz s kódem, platí PRIHLASENI_MINUT a jednou. Kdo není mezi členy,
 * nedostane nic; kdo se zaregistroval a nepotvrdil, dostane znovu
 * potvrzení. Odpověď je pokaždé stejná, ať se nedá zkoušet, kdo je členem. Odkaz nebo opsaný kód (prihlasOdkazem,
 * prihlasKodem) vrátí klíč člena a ten si prohlížeč uloží do cookie; s ní
 * jde rezervovat a rušit. Kdo cookie nemá, vidí jen, co je volné.
 *
 * Funkce tu nevědí nic o Astru: dostanou nastavení a data, vrátí stav
 * a odpověď. Dá se tak zkoušet bez serveru.
 */
import { createHash, randomBytes, randomInt } from "node:crypto";
import { rezervace as R, permanentka as P } from "../../data/rezervace";
import { rpc, ChybaDb } from "./db";
import type { Pripojeni } from "./db";
import { posli, vitej, prihlaseni, registrace, potvrzeni, zruseni } from "./posta";
import type { Posta } from "./posta";
import { over, ted, jeUuid, naCas, zCasu, konecPermanentky } from "./pravidla";
import type { Chyba, Druh, Odpoved, Volno } from "./typy";

/** Cookie s klíčem člena — nastavuje ji /api/overit po přihlášení */
export const COOKIE = "clen";
/** Jak dlouho platí odkaz a kód z přihlašovacího mailu a z potvrzení registrace (data/rezervace.ts) */
export const PRIHLASENI_MINUT = R.prihlaseniMinut;
export const REGISTRACE_MINUT = R.registraceMinut;
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

/* ——— Přihlášení bez hesla ——— */

/** V databázi je jen otisk odkazu a kódu — kdo ji přečte, přihlásit se s tím nemůže */
const otisk = (s: string) => createHash("sha256").update(s).digest("hex");
/** Kód je jen šest číslic, tak se otiskuje i s e-mailem, ke kterému patří */
const otiskKodu = (email: string, kod: string) => otisk(`${email.trim().toLowerCase()}:${kod}`);
const jeEmail = (x: unknown): x is string => typeof x === "string" && x.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.trim());
/** Odkaz z mailu: 32 náhodných bajtů v base64url */
const jeOdkaz = (x: unknown): x is string => typeof x === "string" && /^[A-Za-z0-9_-]{43}$/.test(x);

/** Jméno z registrace: bez řídicích znaků a zdvojených mezer, nejvýš 60 znaků */
const cisteJmeno = (x: unknown) =>
  typeof x === "string" ? x.replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim() : "";

/** Komu poslat mail z prihlas_zadost a registrace — a jestli už potvrdil registraci */
type Komu = { jmeno: string; email: string; potvrzeny: boolean } | null;

/**
 * Pošle mail podle toho, jak je na tom člověk: potvrzený dostane přihlášení,
 * nepotvrzený potvrzení registrace (to ho zároveň přihlásí).
 */
async function posliKlic(n: Nastaveni, funkce: "prihlas_zadost" | "registrace", parametry: Record<string, unknown>, email: string, web: string): Promise<Vysledek<Odpoved>> {
  if (!n.posta) return ne("vypnuto");
  const odkaz = randomBytes(32).toString("base64url");
  const kod = String(randomInt(0, 1_000_000)).padStart(6, "0");
  /* Kdo se právě registroval, čte mail později než ten, kdo se přihlašuje — má na něj déle */
  const minut = funkce === "registrace" ? REGISTRACE_MINUT : PRIHLASENI_MINUT;
  try {
    const c = await rpc<Komu>(n.db, funkce, { ...parametry, p_email: email, p_odkaz: otisk(odkaz), p_kod: otiskKodu(email, kod), p_minut: minut });
    const url = `${web}/k/${odkaz}`;
    if (c) await posli(n.posta, c.potvrzeny ? prihlaseni(c, url, kod, minut, web) : registrace(c, url, kod, minut, web));
  } catch (e) {
    /* Moc často, nebo dva lidi registrují stejnou adresu naráz — navenek se to nepozná */
    if (!(e instanceof ChybaDb && (e.kod === "casto" || e.stav === 409))) return zDb(e);
  }
  return ANO;
}

/**
 * Člověk zadal e-mail: když je mezi členy, pošle se mu odkaz a kód.
 * Odpověď je vždycky stejná, ať je, nebo není — i když žádá moc často.
 */
export async function posliOdkaz(n: Nastaveni | null, telo: unknown, web: string): Promise<Vysledek<Odpoved>> {
  if (!n || !n.posta) return ne("vypnuto");
  const email = (telo as { email?: unknown } | null)?.email;
  if (!jeEmail(email)) return ne("spatne");
  return posliKlic(n, "prihlas_zadost", {}, email.trim(), web);
}

/**
 * Registrace: jméno a e-mail. Nový člověk se zapíše jako nepotvrzený
 * a přijde mu potvrzení; kdo už je členem, dostane přihlášení. Odpověď
 * je pokaždé stejná.
 */
export async function registruj(n: Nastaveni | null, telo: unknown, web: string): Promise<Vysledek<Odpoved>> {
  if (!n || !n.posta) return ne("vypnuto");
  const t = telo as { jmeno?: unknown; email?: unknown } | null;
  const jmeno = cisteJmeno(t?.jmeno);
  if (jmeno.length < 2 || jmeno.length > 60 || !jeEmail(t?.email)) return ne("spatne");
  return posliKlic(n, "registrace", { p_jmeno: jmeno }, t.email.trim(), web);
}

/** Odkaz z mailu → klíč člena pro cookie, nebo null, když už neplatí */
export async function prihlasOdkazem(n: Nastaveni | null, odkaz: unknown): Promise<string | null> {
  if (!n || !jeOdkaz(odkaz)) return null;
  try {
    return await rpc<string | null>(n.db, "prihlas_odkaz", { p_odkaz: otisk(odkaz) });
  } catch (e) {
    console.error("[rezervace] přihlášení odkazem", e);
    return null;
  }
}

/** Kód opsaný na webu → klíč člena pro cookie, nebo null */
export async function prihlasKodem(n: Nastaveni | null, email: unknown, kod: unknown): Promise<string | null> {
  if (!n || !jeEmail(email) || typeof kod !== "string") return null;
  const cisla = kod.replace(/\D/g, "");
  if (cisla.length !== 6) return null;
  try {
    return await rpc<string | null>(n.db, "prihlas_kod", { p_email: email, p_kod: otiskKodu(email, cisla) });
  } catch (e) {
    console.error("[rezervace] přihlášení kódem", e);
    return null;
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
 * Pošle novému členovi uvítací mail. Volá to databáze, když v tabulce
 * `clenove` přibude člověk (nebo mu někdo smaže pozvanka_odeslana) —
 * prokáže se tajemstvím v hlavičce Authorization.
 */
export async function pozvi(n: Nastaveni | null, autorizace: string | null, telo: unknown, web: string): Promise<Vysledek<Odpoved>> {
  if (!n || !n.posta || !n.tajemstvi) return ne("vypnuto");
  if (!autorizace || !shodne(autorizace, `Bearer ${n.tajemstvi}`)) return ne("neznamy");
  const id = (telo as { id?: unknown } | null)?.id;
  if (typeof id !== "number" || !Number.isInteger(id)) return ne("spatne");
  try {
    const c = await rpc<{ jmeno: string; email: string } | null>(n.db, "pozvanka", { p_id: id });
    /* Už odešlo, nebo je člen vypnutý — není co dělat */
    if (!c) return ANO;
    if (!(await posli(n.posta, vitej(c, web)))) return ne("chyba");
    await rpc(n.db, "pozvanka_hotovo", { p_id: id });
    return ANO;
  } catch (e) {
    return zDb(e);
  }
}
