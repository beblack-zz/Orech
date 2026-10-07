/**
 * Simulovaná obsazenost odjezdů na /rezervace — dokud nemáme skutečný
 * kalendář. Hodina je buď volná, nebo obsazená: rezervuje se celá, pro
 * jednoho až čtyři lidi jako jednu skupinu, takže tu nejsou žádná místa.
 *
 * Počítá se z data a hodiny pevnou „náhodou“, takže se při každém
 * načtení ukáže stejná obsazenost. Některé dny jsou rozebrané víc než
 * jiné a občas je obsazený celý den. Odjezdy, které dnes už začaly, se
 * nabízet nedají.
 *
 * Až bude skutečný kalendář, stačí místo simuluj() načíst, které hodiny
 * jsou zamluvené — tabule, jízdenka i e-mail počítají jen s `volno`.
 * (Archivní /rezervace-ema má vlastní simulaci s místy, ema-simulace.ts.)
 */
import { rezervace as R } from "../../data/rezervace";

export interface Hodina {
  /** Začátek odjezdu — hodina dne */
  h: number;
  /** Nikdo ji ještě nezamluvil */
  volno: boolean;
  /** Dnes už začala */
  probehlo: boolean;
}
export interface Den {
  datum: Date;
  klic: string;
  hodiny: Hodina[];
}

const dvoj = (n: number) => String(n).padStart(2, "0");

/** Pevná náhoda z textu — stejný den a hodina dají vždycky stejné číslo 0–1 */
export const nahoda = (s: string) => {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  h ^= h >>> 13;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

export function simuluj(dnes: Date, ted = new Date()): Den[] {
  const dny: Den[] = [];
  for (let i = 0; i <= R.dniDopredu; i++) {
    const d = new Date(dnes.getFullYear(), dnes.getMonth(), dnes.getDate() + i);
    if (!R.dny.includes(d.getDay())) continue;
    const klic = `${d.getFullYear()}-${dvoj(d.getMonth() + 1)}-${dvoj(d.getDate())}`;
    // Jak moc je den rozebraný: 0 = klid, nad 0,92 je obsazený celý
    const naval = nahoda(`${klic}-den`);
    const hodiny: Hodina[] = [];
    for (let h = R.od; h < R.do; h++) {
      const obsazena = naval > 0.92 || nahoda(`${klic}-${h}`) < 0.14 + naval * 0.42;
      const zacatek = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h);
      hodiny.push({ h, volno: !obsazena, probehlo: zacatek <= ted });
    }
    dny.push({ datum: d, klic, hodiny });
  }
  return dny;
}
