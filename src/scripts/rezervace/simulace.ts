/**
 * Simulovaná obsazenost odjezdů na /rezervace — dokud nemáme skutečný
 * kalendář. Jsou tu tři věci, které se dají koupit:
 *
 *   odjezd       hodina a půl v dílně s pár místy; plní se po skupinách
 *                (jeden až čtyři lidi), takže se na něm můžou potkat
 *                cizí lidi (v kódu se mu pořád říká hodina)
 *   kurz         zvláštní vlak na celý den, jezdí v sobotu; má pár míst
 *                a ta se plní po jednom
 *   permanentka  odjezd, který se tři měsíce opakuje každý týden ve stejný
 *                den a hodinu; sedí na místech odjezdu jako ostatní
 *
 * Počítá se z data a hodiny pevnou „náhodou“, takže se při každém
 * načtení ukáže stejná obsazenost. Některé dny jsou rozebrané víc než
 * jiné a občas je obsazený celý den. Odjezdy, které dnes už začaly, se
 * nabízet nedají.
 *
 * Kurzy s termínem v datech jedou v ten termín. Kurzy bez termínu rozdává
 * ukázka: jeden na sobotu každého třetího týdne, kurzy se střídají — podle
 * kalendáře, ne podle dneška, takže stejná sobota má pořád stejný kurz.
 * Na měsíc dopředu tak vyjdou jeden nebo dva, víc jich naráz vypsaných
 * nebývá (`kurzuNaraz` v datech).
 *
 * Skutečný kalendář je v kalendar.ts: když jsou rezervace zapojené, dny
 * postaví z toho, co je opravdu zamluvené, a tahle ukázka se nepoužije —
 * tabule a jízdenka počítají jen s tím, co dostanou. Typy dnů a pomocné
 * funkce odsud bere i on. (Archivní /rezervace-ema má vlastní simulaci,
 * ema-simulace.ts.)
 */
import { rezervace as R, kurzy, permanentka as P, odjezdyDne } from "../../data/rezervace";
import type { KurzVlak } from "../../data/rezervace";
import type { Volno } from "../../lib/rezervace/typy";

/** Prodaná permanentka: den v týdnu, hodina, kolik lidí a od–do jako RRRR-MM-DD */
export type Pas = Volno["permanentky"][number];

export interface Hodina {
  /** Začátek odjezdu — hodina dne i s půlkou: 10.5 je 10:30 */
  h: number;
  /** Kolik míst je na ní ještě volných (z `rezervace.mist`) — po jízdenkách i permanentkách; zavřený odjezd má 0 */
  volno: number;
  /** Dnes už začala */
  probehlo: boolean;
}
export interface KurzDne {
  kurz: KurzVlak;
  /** Kolik míst už je pryč */
  obsazeno: number;
  /** Vlak už vyjel */
  probehlo: boolean;
}
export interface Den {
  datum: Date;
  klic: string;
  hodiny: Hodina[];
  /** Ten den jede zvláštní vlak a hodinové spoje ne — v sobotu, nebo jako výluka v úterý či v pátek */
  kurz?: KurzDne;
}

const dvoj = (n: number) => String(n).padStart(2, "0");
export const klicDne = (d: Date) => `${d.getFullYear()}-${dvoj(d.getMonth() + 1)}-${dvoj(d.getDate())}`;

/** Pevná náhoda z textu — stejný den a hodina dají vždycky stejné číslo 0–1 */
export const nahoda = (s: string) => {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  h ^= h >>> 13;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

/** Kolikátý týden od pondělí 5. 1. 1970 — podle něj ukázka rozdává kurzy */
const tyden = (d: Date) => Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(1970, 0, 5)) / 604_800_000);

/** Který kurz ten den jede — nebo žádný */
export function kurzDne(d: Date): KurzVlak | null {
  const klic = klicDne(d);
  const pevny = kurzy.find((k) => k.terminy?.includes(klic));
  if (pevny) return pevny;
  const ukazkove = kurzy.filter((k) => !k.terminy?.length);
  if (!ukazkove.length || d.getDay() !== R.denKurzu) return null;
  const t = tyden(d);
  return t % 3 === 2 ? ukazkove[Math.floor(t / 3) % ukazkove.length] : null;
}

/** Kolik lidí s permanentkou sedí na odjezdu dne `klic` (RRRR-MM-DD) v `h` — týdny, které má permanentka vynechané (bylo plno), se nepočítají */
export const naPermanentku = (pasy: readonly Pas[], klic: string, denVTydnu: number, h: number) =>
  pasy.reduce((a, p) => (p.dt === denVTydnu && p.h === h && p.od <= klic && p.do >= klic && !p.vynechat.includes(klic) ? a + p.osob : a), 0);

/**
 * Ukázkové prodané permanentky: na některých odjezdech sedí jeden nebo dva
 * stálí lidé. Platí přes celé čtvrtletí kolem dneška, ať jsou vidět ve
 * všech týdnech, na které se dá permanentka koupit.
 */
export function ukazkovePermanentky(dnes: Date): Pas[] {
  const ctvrt = `${dnes.getFullYear()}-${Math.floor(dnes.getMonth() / 3)}`;
  const od = klicDne(new Date(dnes.getFullYear(), dnes.getMonth() - 1, 1));
  const doDne = klicDne(new Date(dnes.getFullYear(), dnes.getMonth() + P.mesicu + 2, 0));
  return R.dny.flatMap((dt) =>
    odjezdyDne(dt).flatMap((h) => {
      const n = nahoda(`teikiken-${ctvrt}-${dt}-${h}`);
      const osob = n < 0.5 ? 0 : n < 0.85 ? 1 : 2;
      return osob ? [{ dt, h, osob, od, do: doDne, vynechat: [] }] : [];
    }),
  );
}

export function simuluj(dnes: Date, pasy: readonly Pas[] = [], ted = new Date()): Den[] {
  const dny: Den[] = [];
  for (let i = 0; i <= R.dniDopredu; i++) {
    const d = new Date(dnes.getFullYear(), dnes.getMonth(), dnes.getDate() + i);
    const kurz = kurzDne(d);
    /* Zvláštní vlak jezdí v sobotu, kdy jinak otevřeno není */
    if (!kurz && !R.dny.includes(d.getDay())) continue;
    const klic = klicDne(d);
    // Jak moc je den rozebraný: 0 = klid, nad 0,92 je obsazený celý
    const naval = nahoda(`${klic}-den`);
    const hodiny: Hodina[] = [];
    for (const h of odjezdyDne(d.getDay())) {
      /* Odjezd je plný, nebo na něm už pár lidí sedí — častěji ve dnech, které jsou víc rozebrané */
      const plna = naval > 0.92 || nahoda(`${klic}-${h}`) < 0.14 + naval * 0.42;
      const nekdo = nahoda(`${klic}-${h}-mista`);
      const obsazeno = plna ? R.mist : nekdo < 0.45 - naval * 0.3 ? 0 : Math.min(R.mist - 1, 1 + Math.floor(nahoda(`${klic}-${h}-kolik`) * (R.mist - 1)));
      const zacatek = new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(h), (h % 1) * 60);
      /* Stálí lidé s permanentkou sedí navíc — kolik se jich vejde */
      const stali = naPermanentku(pasy, klic, d.getDay(), h);
      hodiny.push({ h, volno: Math.max(0, R.mist - obsazeno - stali), probehlo: zacatek <= ted });
    }
    const den: Den = { datum: d, klic, hodiny };
    if (kurz) {
      /* Většinou je ještě kde sedět, občas je vlak plný */
      const obsazeno = Math.min(kurz.mist, Math.floor(nahoda(`${klic}-kurz`) * (kurz.mist + 0.4)));
      const prvni = Math.min(...kurz.program.map((z) => z.h), R.od);
      den.kurz = { kurz, obsazeno, probehlo: new Date(d.getFullYear(), d.getMonth(), d.getDate(), prvni) <= ted };
    }
    dny.push(den);
  }
  return dny;
}

/** Hodiny, které se ten den dají koupit na hodinovou jízdenku — a kam se vejde `osob` lidí */
export const volneHodiny = (d: Den, osob = 1) => (d.kurz ? [] : d.hodiny.filter((h) => !h.probehlo && h.volno >= osob));

/** Kolik míst zbývá ve zvláštním vlaku — 0, když už vyjel */
export const volnoVKurzu = (k: KurzDne) => (k.probehlo ? 0 : k.kurz.mist - k.obsazeno);

export interface Jizda {
  datum: Date;
  /** Ten den jede kurz — permanentka neplatí */
  vyluka: boolean;
  /** Hodiny permanentky, na kterých ten týden není místo (nebo je zavřeno) — vynechají se a neplatí */
  plno: number[];
}

/**
 * Na které dny permanentka platí, když se začne jezdit od daného dne:
 * každý týden ve stejný den, po celou dobu platnosti. Kdy jede kurz, říká
 * `jeKurz` — bez něj ukázka. S `volno` se u každého týdne zjistí, na které
 * z `hodiny` se `osob` lidí nevejde: ty týdny se vynechají a neplatí
 * (rozhodnuto 8. 11. 2026).
 */
export function platnostPermanentky(
  od: Date,
  jeKurz = (d: Date) => !!kurzDne(d),
  volno?: (datum: Date, h: number) => number,
  hodiny: readonly number[] = [],
  osob = 1,
): { od: Date; do: Date; jizdy: Jizda[] } {
  const konec = new Date(od.getFullYear(), od.getMonth() + P.mesicu, od.getDate() - 1);
  const jizdy: Jizda[] = [];
  for (let d = new Date(od.getFullYear(), od.getMonth(), od.getDate()); d <= konec; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7)) {
    const vyluka = jeKurz(d);
    jizdy.push({ datum: d, vyluka, plno: vyluka || !volno ? [] : hodiny.filter((h) => volno(d, h) < osob) });
  }
  return { od, do: konec, jizdy };
}

/** Kolik jízd má permanentka na hodinu `h` — týdny bez výluky, kdy na ní je místo */
export const jizdNaHodinu = (jizdy: readonly Jizda[], h: number) => jizdy.filter((j) => !j.vyluka && !j.plno.includes(h)).length;

/**
 * Kolik míst je volných na odjezdu dne `datum` v hodinu `h`. Dny na tabuli
 * berou volno odtamtud (jízdenky i permanentky; zavřený den nebo odjezd = 0);
 * dál než měsíc dopředu se hodinové jízdenky koupit nedají, tak tam sedí
 * jen permanentky.
 */
export function volnoTydne(dny: readonly Den[], pasy: readonly Pas[], datum: Date, h: number): number {
  const klic = klicDne(datum);
  const posledni = dny[dny.length - 1]?.klic ?? "";
  if (klic <= posledni) return dny.find((x) => x.klic === klic)?.hodiny.find((x) => x.h === h)?.volno ?? 0;
  return Math.max(0, R.mist - naPermanentku(pasy, klic, datum.getDay(), h));
}
