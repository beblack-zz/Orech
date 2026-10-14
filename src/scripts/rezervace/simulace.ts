/**
 * Simulovaná obsazenost odjezdů na /rezervace — dokud nemáme skutečný
 * kalendář. Jsou tu tři věci, které se dají koupit:
 *
 *   odjezd       hodina a půl v dílně; buď volný, nebo obsazený: rezervuje
 *                se celý, pro jednoho až čtyři lidi jako jednu skupinu,
 *                žádná místa (v kódu se mu pořád říká hodina)
 *   kurz         zvláštní vlak na celý den, jezdí v sobotu; má pár míst
 *                a ta se plní po jednom
 *   permanentka  první nebo poslední spoj jednoho dne v týdnu na tři
 *                měsíce, taky s místy
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
import { rezervace as R, kurzy, permanentka as P, odjezdy } from "../../data/rezervace";
import type { KurzVlak } from "../../data/rezervace";

export interface Hodina {
  /** Začátek odjezdu — hodina dne i s půlkou: 10.5 je 10:30 */
  h: number;
  /** Nikdo ji ještě nezamluvil */
  volno: boolean;
  /** Dnes už začala */
  probehlo: boolean;
  /** Spoj vyhrazený permanentkám — na hodinovou jízdenku se nedá */
  pas: boolean;
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

export const jeSpojPermanentky = (h: number) => P.spoje.some((s) => s.h === h);

export function simuluj(dnes: Date, ted = new Date()): Den[] {
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
    for (const h of odjezdy) {
      const obsazena = naval > 0.92 || nahoda(`${klic}-${h}`) < 0.14 + naval * 0.42;
      const zacatek = new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(h), (h % 1) * 60);
      hodiny.push({ h, volno: !obsazena, probehlo: zacatek <= ted, pas: jeSpojPermanentky(h) });
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

/** Hodiny, které se ten den dají koupit na hodinovou jízdenku */
export const volneHodiny = (d: Den) => (d.kurz ? [] : d.hodiny.filter((h) => !h.probehlo && h.volno && !h.pas));

/** Kolik míst zbývá ve zvláštním vlaku — 0, když už vyjel */
export const volnoVKurzu = (k: KurzDne) => (k.probehlo ? 0 : k.kurz.mist - k.obsazeno);

/**
 * Kolik permanentek je na který spoj už prodaných. Permanentka je na jeden
 * den v týdnu, takže úterky mají svoje místa a pátky svoje. Drží se celé
 * čtvrtletí, permanentka je na tři měsíce.
 */
export function obsazenoPermanentek(dnes: Date, denVTydnu: number): Map<number, number> {
  const ctvrt = `${dnes.getFullYear()}-${Math.floor(dnes.getMonth() / 3)}`;
  return new Map(P.spoje.map((s) => [s.h, Math.min(P.mist, Math.floor(nahoda(`teikiken-${ctvrt}-${denVTydnu}-${s.h}`) * (P.mist + 0.3)))]));
}

export interface Jizda {
  datum: Date;
  /** Ten den jede kurz — permanentka neplatí */
  vyluka: boolean;
}

/**
 * Na které dny permanentka platí, když se začne jezdit od daného dne:
 * každý týden ve stejný den, po celou dobu platnosti. Kdy jede kurz, říká
 * `jeKurz` — bez něj ukázka.
 */
export function platnostPermanentky(od: Date, jeKurz = (d: Date) => !!kurzDne(d)): { od: Date; do: Date; jizdy: Jizda[] } {
  const konec = new Date(od.getFullYear(), od.getMonth() + P.mesicu, od.getDate() - 1);
  const jizdy: Jizda[] = [];
  for (let d = new Date(od.getFullYear(), od.getMonth(), od.getDate()); d <= konec; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7)) {
    jizdy.push({ datum: d, vyluka: jeKurz(d) });
  }
  return { od, do: konec, jizdy };
}
