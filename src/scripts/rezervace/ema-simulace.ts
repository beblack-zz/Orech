/**
 * ARCHIV pro /rezervace-ema — simulace obsazenosti s místy: každá hodina
 * měla šest háčků (KAPACITA) a za obsazená místa visely destičky party.
 * Platná rezervace počítá hodinu jako celek, volnou nebo obsazenou
 * (scripts/rezervace/simulace.ts).
 *
 * Počítá se z data a hodiny pevnou „náhodou“, takže se při každém
 * načtení ukáže stejná obsazenost. Kami visí jen tam, kam podle `chodi`
 * v data/rezervace.ts chodí, takže nápovědy v sešitě sedí vždycky.
 */
import { rezervace as R, prani } from "../../data/rezervace";
import type { Prani } from "../../data/rezervace";
import type { PostavaId } from "../../data/parta";

export interface Hodina {
  h: number;
  obsazeno: number;
  volno: number;
  probehlo: boolean;
  /** Kdo sedí na obsazených místech, v pořadí míst; null = cizí (stín, na ema tabuli cizí destička) */
  kami: (PostavaId | null)[];
}
export interface Den {
  datum: Date;
  klic: string;
  hodiny: Hodina[];
}

const dvoj = (n: number) => String(n).padStart(2, "0");

/** Háčků na jednu hodinu na archivní tabuli */
export const KAPACITA = 6;

/** Pevná náhoda z textu — stejný den a hodina dají vždycky stejné číslo 0–1 */
export const nahoda = (s: string) => {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  h ^= h >>> 13;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

const sedi = (p: Prani, den: Date, h: number, volno: number) => {
  const c = p.chodi;
  if (c.dny && !c.dny.includes(den.getDay())) return false;
  if (c.hodiny && (h < c.hodiny[0] || h >= c.hodiny[1])) return false;
  if (c.plno && volno > 0) return false;
  if (c.klid && volno < 3) return false;
  return true;
};

export function kdoVisi(klic: string, den: Date, h: number, obsazeno: number, volno: number): (PostavaId | null)[] {
  // Kami, kteří sem chodí, v pevně zamíchaném pořadí — kolik se vejde
  const jejich = prani
    .filter((p) => sedi(p, den, h, volno))
    .map((p) => p.kdo)
    .sort((a, b) => nahoda(`${klic}-${h}-${a}`) - nahoda(`${klic}-${h}-${b}`))
    .slice(0, obsazeno);
  const visi: (PostavaId | null)[] = [...jejich, ...Array<null>(obsazeno - jejich.length).fill(null)];
  // Promíchat místa, ať parta nesedí vždycky vlevo
  return visi
    .map((x, i) => ({ x, r: nahoda(`${klic}-${h}-hacek-${i}`) }))
    .sort((a, b) => a.r - b.r)
    .map((v) => v.x);
}

export function simuluj(dnes: Date, ted = new Date()): Den[] {
  const dny: Den[] = [];
  for (let i = 0; i <= R.dniDopredu; i++) {
    const d = new Date(dnes.getFullYear(), dnes.getMonth(), dnes.getDate() + i);
    if (!R.dny.includes(d.getDay())) continue;
    const klic = `${d.getFullYear()}-${dvoj(d.getMonth() + 1)}-${dvoj(d.getDate())}`;
    // Některé dny jsou rozebrané víc než jiné: 0 = klid, 1 = plno
    const naval = nahoda(`${klic}-den`);
    const hodiny: Hodina[] = [];
    for (let h = R.od; h < R.do; h++) {
      const r = nahoda(`${klic}-${h}`);
      const obsazeno = naval > 0.88 ? KAPACITA : Math.min(KAPACITA, Math.floor(r * (KAPACITA + 1) * 0.72 + naval * 2.6));
      const volno = KAPACITA - obsazeno;
      const zacatek = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h);
      hodiny.push({ h, obsazeno, volno, probehlo: zacatek <= ted, kami: kdoVisi(klic, d, h, obsazeno, volno) });
    }
    dny.push({ datum: d, klic, hodiny });
  }
  return dny;
}
