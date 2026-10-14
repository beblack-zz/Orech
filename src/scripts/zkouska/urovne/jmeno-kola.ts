/**
 * Kola hry „Čí je která“ (úroveň 六 Jméno): kolik misek, kolik záměn, jak
 * rychle — a jaké záměny přesně. Čistý modul bez DOM, testuje se zvlášť.
 *
 * Záměna je vždy jen jedna dvojice naráz (ať se to dá sledovat i na
 * telefonu). Asi polovina záměn bere i tvoji misku, jinak by stačilo
 * nehýbat očima. Stejná dvojice nejde dvakrát po sobě (vypadalo by to
 * jako „zpátky“), a kolo vždycky skončí jinde, než začalo. Záměny se ke
 * konci kola zrychlují; delší skok (ob jednu misku) trvá o třetinu déle.
 * Klamná záměna se rozjede jako obyčejná a v půlce se vrátí.
 */

export interface DefiniceKola {
  misek: number;
  zamen: number;
  /** Průměrná doba jedné záměny (ms) */
  doba: number;
  /** Pauza mezi záměnami (ms) */
  mezera: number;
  klamu: number;
}

export const KOLA: DefiniceKola[] = [
  { misek: 3, zamen: 5, doba: 550, mezera: 120, klamu: 0 },
  { misek: 4, zamen: 8, doba: 420, mezera: 80, klamu: 0 },
  { misek: 5, zamen: 12, doba: 320, mezera: 60, klamu: 1 },
];

/** Tah: prohodí misky na místech a a b (zleva od 0). Klam se jen rozjede a vrátí. */
export interface Tah {
  a: number;
  b: number;
  doba: number;
  klam: boolean;
}

export interface Kolo {
  misek: number;
  /** Kde tvoje miska stojí na začátku a kde na konci */
  start: number;
  cil: number;
  tahy: Tah[];
}

/** Kde skončí miska z místa `start` po všech tazích */
export function kamDojde(start: number, tahy: Tah[]) {
  let m = start;
  for (const t of tahy) {
    if (t.klam) continue;
    if (m === t.a) m = t.b;
    else if (m === t.b) m = t.a;
  }
  return m;
}

function jednoKolo(d: DefiniceKola, rnd: () => number): Kolo {
  const n = d.misek;
  const start = Math.floor(rnd() * n);
  let kde = start;
  let sHracem = 0;
  let minula = "";
  const dvojice: [number, number][] = [];
  const kdeBylo: number[] = [];
  for (let k = 0; k < d.zamen; k++) {
    kdeBylo.push(kde);
    const zbyva = d.zamen - k;
    const chybi = Math.ceil(d.zamen * 0.45) - sHracem;
    const zapojit = chybi >= zbyva || rnd() < 0.5;
    let a = 0;
    let b = 1;
    for (let pokus = 0; pokus < 12; pokus++) {
      if (zapojit) {
        const skok = n >= 5 && rnd() < 0.3 ? 2 : 1;
        const smer = rnd() < 0.5 ? -1 : 1;
        a = kde;
        b = kde + smer * skok;
        if (b < 0 || b >= n) b = kde - smer * skok;
        if (b < 0 || b >= n) b = kde + (kde === 0 ? 1 : -1);
      } else {
        a = Math.floor(rnd() * (n - 1));
        b = n >= 4 && rnd() < 0.25 && a + 2 < n ? a + 2 : a + 1;
        if ((a === kde || b === kde) && pokus < 11) continue;
      }
      const klic = `${Math.min(a, b)}-${Math.max(a, b)}`;
      if (klic !== minula || pokus === 11) {
        minula = klic;
        break;
      }
    }
    if (a === kde || b === kde) sHracem++;
    if (kde === a) kde = b;
    else if (kde === b) kde = a;
    dvojice.push([a, b]);
  }

  /* Zrychlování: od 1,25× do 0,8× průměru, skok ob misku o 35 % déle; průměr zůstane `doba` */
  const m = dvojice.length;
  const vahy = dvojice.map(([a, b], k) => (1.25 - (0.45 * k) / Math.max(1, m - 1)) * (1 + 0.35 * (Math.abs(a - b) - 1)));
  const prumer = vahy.reduce((s, x) => s + x, 0) / m;
  const tahy: Tah[] = dvojice.map(([a, b], k) => ({ a, b, doba: Math.round((d.doba * vahy[k]) / prumer), klam: false }));

  /* Klamy: kolem půlky kola, vždycky s tvojí miskou — jinak by nikoho nenachytaly */
  for (let i = 0; i < d.klamu; i++) {
    const kam = Math.min(m, Math.floor(m * 0.55) + i * 2);
    const tam = kdeBylo[kam] ?? kde;
    const soused = tam + 1 < n ? tam + 1 : tam - 1;
    tahy.splice(kam + i, 0, { a: tam, b: soused, doba: Math.round(d.doba * 1.35), klam: true });
  }
  return { misek: n, start, cil: kde, tahy };
}

/** Nové kolo podle definice. Kolo, které by skončilo na startu, se losuje znovu. */
export function noveKolo(d: DefiniceKola, rnd: () => number = Math.random): Kolo {
  let k = jednoKolo(d, rnd);
  for (let i = 0; i < 40 && k.cil === k.start; i++) k = jednoKolo(d, rnd);
  return k;
}
