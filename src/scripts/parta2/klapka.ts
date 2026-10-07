/**
 * Klapka odjezdové tabule (pata-pata) — sdílí ji Úvod 2 (uvod2/tabule.ts)
 * a Rezervace (rezervace/odjezdy.ts). Markup je components/uvod2/Flap.astro,
 * vzhled si každá stránka kreslí sama (uvod2.css, rezervace.css).
 *
 * Klapka umí překlapnout na nový nápis přes pár mezikroků — číslice jdou
 * po řadě (3, 4, 5…), nápisy přeskakují přes jiná slova z bubnu. Jeden
 * krok jsou dvě půlky: horní padá, dolní vstává. Animace se restartuje
 * přepnutím třídy .liche, ne vynuceným přepočtem stránky. S omezeným
 * pohybem se nápis mění rovnou.
 */
import { klid } from "./stav";

export const KLAP = 64;
export const CISLICE = "0123456789";
export const nahodne = <T,>(pole: T[]) => pole[Math.floor(Math.random() * pole.length)];

export class Klapka {
  readonly cislice: boolean;
  hodnota: string;
  private readonly el: HTMLElement;
  private readonly hore: HTMLElement;
  private readonly dole: HTMLElement;
  private readonly pada: HTMLElement;
  private readonly vstava: HTMLElement;
  private fronta: string[] = [];
  private bezi = false;
  private krok = 0;

  constructor(el: HTMLElement) {
    this.el = el;
    this.cislice = el.classList.contains("flap-cislice");
    this.hore = el.querySelector<HTMLElement>(".flap-hore .flap-t")!;
    this.dole = el.querySelector<HTMLElement>(".flap-dole .flap-t")!;
    this.hodnota = this.hore.textContent ?? "";
    const pul = (trida: string) => {
      const p = document.createElement("span");
      p.className = `flap-p ${trida}`;
      p.hidden = true;
      const t = document.createElement("span");
      t.className = "flap-t";
      p.append(t);
      el.append(p);
      return t;
    };
    this.pada = pul("flap-pada");
    this.vstava = pul("flap-vstava");
  }

  okamzite(t: string) {
    this.fronta = [];
    this.hodnota = t;
    this.hore.textContent = t;
    this.dole.textContent = t;
    this.pada.parentElement!.hidden = true;
    this.vstava.parentElement!.hidden = true;
  }

  nastav(cilova: string, mezikroky: string[]) {
    if (klid) return this.okamzite(cilova);
    this.fronta = [...mezikroky, cilova];
    if (!this.bezi) this.dalsi();
  }

  private dalsi() {
    const nova = this.fronta.shift();
    if (nova === undefined) {
      this.bezi = false;
      this.pada.parentElement!.hidden = true;
      this.vstava.parentElement!.hidden = true;
      return;
    }
    this.bezi = true;
    const stara = this.hodnota;
    this.hodnota = nova;
    this.hore.textContent = nova;
    this.dole.textContent = stara;
    this.pada.textContent = stara;
    this.vstava.textContent = nova;
    this.pada.parentElement!.hidden = false;
    this.vstava.parentElement!.hidden = false;
    this.krok++;
    this.el.classList.toggle("liche", this.krok % 2 === 1);
    window.setTimeout(() => {
      this.dole.textContent = nova;
      this.dalsi();
    }, KLAP * 2 + 8);
  }
}

/** Číslice jdou po řadě od staré k nové, aspoň tři kroky */
export const cesta = (od: string, kam: string) => {
  const a = CISLICE.indexOf(od);
  const b = CISLICE.indexOf(kam);
  if (a < 0 || b < 0) return Array.from({ length: 4 }, () => nahodne([...CISLICE]));
  const kroky: string[] = [];
  let i = a;
  do {
    i = (i + 1) % 10;
    if (i !== b) kroky.push(CISLICE[i]);
  } while (i !== b && kroky.length < 9);
  while (kroky.length < 3) kroky.unshift(CISLICE[(b + 7 + kroky.length) % 10]);
  return kroky;
};
