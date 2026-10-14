/**
 * Smlouva mezi rámcem komnaty U mistra (/zkouska, scripts/zkouska/uroven.ts)
 * a devíti úrovněmi ve scripts/zkouska/urovne.
 *
 * Úroveň je funkce, která dostane prostředí a vrátí hru se start a stop:
 *
 *   const hra = hrouda(p)   úroveň se otevřela: scéna je vidět pod úvodní
 *                           kartou a hra si ji uvede do výchozího stavu
 *                           (DOM scény zůstává z minulého pokusu)
 *   hra.start()             člověk klikl na Začít — teprve teď běží čas
 *   p.konec(vysledek)       hra skončila: rámec spočítá známku, dá razítko
 *                           a ukáže výsledkovou kartu
 *   hra.stop()              zavřelo se okno, nebo se jde znovu: zastavit
 *                           smyčky, časovače, zvuky a odebrat posluchače
 *
 * Na „Znovu“ rámec zavolá stop() a pak úroveň vytvoří znovu a rovnou
 * spustí. Posluchače na prvcích scény se proto musí odebírat — nejsnáz
 * přes AbortController, jehož signál se předá addEventListener.
 */
import type { PostavaId } from "../../data/parta";
import type { Kus } from "../../components/dilna/kus";

export interface Vysledek {
  /** 0–100. Rámec z nich dělá známku: od 85 je 優, od 65 je 良, jinak 可 */
  body: number;
  /** Prošlo to? Když ne, razítko není a hraje se znovu */
  proslo: boolean;
  /** Co k tomu řekne kami úrovně */
  veta: string;
  /** Řádky do výsledkové karty: [popisek, hodnota] — třeba ["Průměrná odchylka", "12 g"] */
  udaje: [string, string][];
  /** Kus, který v úrovni vznikl — z Tvaru jde ten nejlepší na mistrovský list */
  kus?: Kus;
}

export interface Prostredi {
  /** Kořen scény úrovně (div.mu-scena) */
  koren: HTMLElement;
  /** Méně pohybu — hra má jít hrát, jen bez ozdobných animací */
  klid: boolean;
  /**
   * Kami úrovně (nebo `kdo`) řekne větu v bublině. Bez `kotva` ukazuje
   * na postavičku v záhlaví okna, s ní na prvek ve scéně.
   */
  rekni(text: string, kotva?: Element | null, kdo?: PostavaId): void;
  /** Krátká zpráva dole přes scénu, sama zmizí — „Ke kruhu!“ */
  zprava(text: string): void;
  /** Ukazatel vpravo v záhlaví: čas, počet, skóre… co úroveň potřebuje */
  ukazatel(text: string): void;
  /** Konec hry. Volat jednou; po něm už hra nic nekreslí ani neposlouchá */
  konec(v: Vysledek): void;
}

export interface Hra {
  start(): void;
  stop(): void;
}

export type Uroven = (p: Prostredi) => Hra;

/** 0:42 — s desetinou 0:42,3 */
export function casText(ms: number, presne = false) {
  const s = Math.max(0, ms) / 1000;
  const m = Math.floor(s / 60);
  const zbytek = s - m * 60;
  const cele = Math.floor(zbytek);
  const text = `${m}:${String(cele).padStart(2, "0")}`;
  return presne ? `${text},${Math.floor((zbytek - cele) * 10)}` : text;
}
