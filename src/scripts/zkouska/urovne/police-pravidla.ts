/**
 * Pravidla úrovně 七 Police — Skládání pece. Jen čísla a výpočty, bez DOM,
 * takže je používá kresba (components/zkouska/urovne/police-kresba.ts),
 * hra (police.ts) i zkušební roboti.
 *
 * Pec je hlavolam ve třech patrech: dole leží Šamotka, nad ní dvě police
 * na sloupcích. Výška sloupků jde přepínat (6, 9, 12, 15 cm), a tím se
 * mění, co se kam vejde. Kus v peci platí, když:
 *
 *   stojí celý na polici a od stěn má aspoň 1,5 cm (topné spirály),
 *   od sousedů na téže polici aspoň 1 cm (glazované kusy by se slepily),
 *   nad sebou má aspoň 1,5 cm do police nad ním (nahoře do víka),
 *   jeho patro unese, co na něm stojí (Šamotka 4 kg, police 3 kg),
 *   a dno má otřené od glazury.
 *
 * Sedm kusů je povinných, dva navíc (čajová miska a malá váza) jsou na
 * výbornou. Čísla jsou spočítaná tak, aby se sedm vešlo pohodlně (různě),
 * osm s rozmyslem a všech devět jediným způsobem: sloupky 12 a 12, na
 * Šamotce mísa s miskou, na první polici talíř, hrnek a čajová miska
 * (přesně do posledního centimetru) a nahoře váza, malá váza, miska
 * a hrnek — přesně na šířku i na váhu.
 *
 * Délky jsou v milimetrech a váhy v gramech, ať se nesčítají desetinná čísla.
 */

/** 0 = Šamotka (dno pece), 1 = první police, 2 = horní police */
export type Patro = 0 | 1 | 2;
export const PATRA: Patro[] = [0, 1, 2];

export const PEC = {
  /** Vnitřek pece */
  sirka: 480,
  vyska: 540,
  /** Odstup kusů od stěn se spirálami */
  okraj: 15,
  /** Mezera mezi kusy na jedné polici */
  mezera: 10,
  /** Volno nad kusem do police nad ním nebo do víka */
  nad: 15,
  /** Tloušťka police */
  deska: 15,
};

/** Výšky sloupků, mezi kterými se přepíná */
export const SLOUPKY = [60, 90, 120, 150];
/** Jak pec stojí na začátku: obě police nízko — mísa ani hrnky se pod ně nevejdou */
export const VYCHOZI_SLOUPKY: [number, number] = [90, 90];
/** Kolik které patro unese, v gramech */
export const NOSNOST: [number, number, number] = [4000, 3000, 3000];
/** Na skládání jsou tři minuty */
export const LIMIT = 180_000;

export const VLEVO = PEC.okraj;
export const VPRAVO = PEC.sirka - PEC.okraj;

export interface KusDef {
  id: string;
  nazev: string;
  /** Šířka a výška v mm (u hrnku i s uchem) */
  sirka: number;
  vyska: number;
  /** Váha v gramech */
  vaha: number;
  /** Kus navíc — pro výbornou */
  navic: boolean;
  /** Glazura stekla až na dno — před pecí se musí otřít */
  glazovaneDno: boolean;
}

export const KUSY: KusDef[] = [
  { id: "vaza", nazev: "Váza", sirka: 120, vyska: 240, vaha: 1600, navic: false, glazovaneDno: false },
  { id: "hrnek-a", nazev: "Hrnek", sirka: 90, vyska: 100, vaha: 400, navic: false, glazovaneDno: false },
  { id: "hrnek-b", nazev: "Hrnek", sirka: 90, vyska: 100, vaha: 400, navic: false, glazovaneDno: true },
  { id: "misa", nazev: "Mísa", sirka: 300, vyska: 90, vaha: 2600, navic: false, glazovaneDno: true },
  { id: "talir", nazev: "Talíř", sirka: 240, vyska: 40, vaha: 1200, navic: false, glazovaneDno: false },
  { id: "miska-a", nazev: "Miska", sirka: 130, vyska: 70, vaha: 500, navic: false, glazovaneDno: false },
  { id: "miska-b", nazev: "Miska", sirka: 130, vyska: 70, vaha: 500, navic: false, glazovaneDno: false },
  { id: "mala-vaza", nazev: "Malá váza", sirka: 80, vyska: 160, vaha: 500, navic: true, glazovaneDno: false },
  { id: "cajova", nazev: "Čajová miska", sirka: 100, vyska: 80, vaha: 400, navic: true, glazovaneDno: true },
];

export const kusPodleId = (id: string) => {
  const k = KUSY.find((x) => x.id === id);
  if (!k) throw new Error(`Neznámý kus ${id}`);
  return k;
};
export const POVINNYCH = KUSY.filter((k) => !k.navic).length;

/* ——— Patra ——— */

export type Sloupky = [number, number];

/** Kolik je v patře místa na výšku: od povrchu ke spodku police nad ním (nahoře k víku) */
export const svetlost = (s: Sloupky, p: Patro) => (p === 0 ? s[0] : p === 1 ? s[1] : PEC.vyska - s[0] - s[1] - 2 * PEC.deska);
/** Výška povrchu patra nad Šamotkou */
export const povrch = (s: Sloupky, p: Patro) => (p === 0 ? 0 : p === 1 ? s[0] + PEC.deska : s[0] + s[1] + 2 * PEC.deska);
/** Nejvyšší kus, který se do patra vejde */
export const nejvyssi = (s: Sloupky, p: Patro) => svetlost(s, p) - PEC.nad;
/** Další výška sloupků po kliknutí (dokola) */
export const dalsiVyska = (v: number, smer: 1 | -1 = 1) => {
  const i = SLOUPKY.indexOf(v);
  return SLOUPKY[(Math.max(0, i) + smer + SLOUPKY.length) % SLOUPKY.length];
};

/* ——— Rozmístění na polici ——— */

export interface Misto {
  id: string;
  /** Levý okraj kusu v mm od levé stěny */
  x: number;
  w: number;
}

/**
 * Nový kus chce stát na `novy.x`. Sousedé mu uhnou, jak je potřeba, ale
 * pořadí zůstane (podle středů) a nikdo nepřeleze okraj u stěny. Null,
 * když se na polici všechno nevejde ani natěsno.
 */
export function rozmisti(ostatni: Misto[], novy: Misto): Map<string, number> | null {
  const vsichni = [...ostatni.filter((m) => m.id !== novy.id), { ...novy, x: Math.min(Math.max(novy.x, VLEVO), VPRAVO - novy.w) }];
  const celkem = vsichni.reduce((s, m) => s + m.w, 0) + (vsichni.length - 1) * PEC.mezera;
  if (celkem > VPRAVO - VLEVO) return null;
  /* Při shodě středů jde nový kus doleva — ať se dá přisunout i k prvnímu */
  vsichni.sort((a, b) => a.x + a.w / 2 - (b.x + b.w / 2) || (a.id === novy.id ? -1 : b.id === novy.id ? 1 : 0));
  const x = vsichni.map((m) => m.x);
  for (let i = 0; i < x.length; i++) x[i] = Math.max(x[i], i === 0 ? VLEVO : x[i - 1] + vsichni[i - 1].w + PEC.mezera);
  for (let i = x.length - 1; i >= 0; i--) x[i] = Math.min(x[i], i === x.length - 1 ? VPRAVO - vsichni[i].w : x[i + 1] - PEC.mezera - vsichni[i].w);
  return new Map(vsichni.map((m, i) => [m.id, Math.round(x[i] * 10) / 10]));
}

/** Kolik mm chybí, aby se kus na polici vešel (0 = vejde se) */
export function chybiMista(ostatni: Misto[], w: number) {
  const celkem = ostatni.reduce((s, m) => s + m.w, 0) + ostatni.length * PEC.mezera + w;
  return Math.max(0, celkem - (VPRAVO - VLEVO));
}

/** Nejbližší místo vlevo od ostatních, kam se kus vejde bez posouvání — pro klávesnici */
export function prvniVolne(ostatni: Misto[], w: number) {
  const serazeni = [...ostatni].sort((a, b) => a.x - b.x);
  let x = VLEVO;
  for (const m of serazeni) {
    if (x + w + PEC.mezera <= m.x) return x;
    x = Math.max(x, m.x + m.w + PEC.mezera);
  }
  return Math.min(x, VPRAVO - w);
}

/* ——— Kontrola ——— */

export interface Umisteni {
  patro: Patro;
  x: number;
}

export interface StavPece {
  sloupky: Sloupky;
  /** Kde kus stojí; null = na stole */
  kde: Record<string, Umisteni | null>;
  /** Dno otřené houbičkou */
  otreno: Record<string, boolean>;
}

export type DruhPotize = "vyska" | "vaha" | "dno" | "kraj" | "dotek";
export interface Potiz {
  druh: DruhPotize;
  /** Celou větou — do nápovědy pod scénou a pro čtečky */
  text: string;
  /** Na štítek přímo na kusu — vejde se i na telefonu */
  kratce: string;
}

export interface Kontrola {
  potize: Record<string, Potiz[]>;
  zatez: [number, number, number];
  pretizeno: [boolean, boolean, boolean];
  vPeci: string[];
  povinnych: number;
  navic: number;
  /** Dá se zavřít víko */
  pripraveno: boolean;
  /** Proč ne — jedna věta pro nápovědu a pro výsledek */
  proc: string | null;
}

const SLOVY = ["nula", "jeden", "dva", "tři", "čtyři", "pět", "šest", "sedm", "osm", "devět"];
export const cm = (mm: number) => `${(Math.round(mm) / 10).toLocaleString("cs-CZ", { maximumFractionDigits: 1 })} cm`;
export const kg = (g: number) => `${(Math.round(g / 100) / 10).toLocaleString("cs-CZ", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`;

export const vychoziStav = (): StavPece => ({
  sloupky: [...VYCHOZI_SLOUPKY],
  kde: Object.fromEntries(KUSY.map((k) => [k.id, null])),
  otreno: Object.fromEntries(KUSY.map((k) => [k.id, !k.glazovaneDno])),
});

export const NAZEV_PATRA = ["Šamotka", "první police", "horní police"];

export function zkontroluj(st: StavPece): Kontrola {
  const potize: Record<string, Potiz[]> = {};
  const zatez: [number, number, number] = [0, 0, 0];
  const naPatre: Misto[][] = [[], [], []];
  const vPeci: string[] = [];
  for (const k of KUSY) {
    const u = st.kde[k.id];
    potize[k.id] = [];
    if (!u) continue;
    vPeci.push(k.id);
    zatez[u.patro] += k.vaha;
    naPatre[u.patro].push({ id: k.id, x: u.x, w: k.sirka });
  }
  for (const id of vPeci) {
    const k = kusPodleId(id);
    const u = st.kde[id]!;
    const navic = k.vyska + PEC.nad - svetlost(st.sloupky, u.patro);
    if (navic > 0) potize[id].push({ druh: "vyska", text: `${u.patro === 2 ? "Narazí do víka" : "Narazí do police"} — o ${cm(navic)}`, kratce: `Narazí o ${cm(navic)}` });
    if (u.x < VLEVO - 0.01 || u.x + k.sirka > VPRAVO + 0.01) potize[id].push({ druh: "kraj", text: "Moc blízko spirál", kratce: "U spirál" });
    for (const m of naPatre[u.patro]) {
      if (m.id === id) continue;
      const mezera = Math.max(m.x - (u.x + k.sirka), u.x - (m.x + m.w));
      if (mezera < PEC.mezera - 0.01) {
        potize[id].push({ druh: "dotek", text: mezera < 0 ? "Stojí v sousedovi" : "Dotýká se souseda", kratce: "Dotýká se" });
        break;
      }
    }
    if (!st.otreno[id]) potize[id].push({ druh: "dno", text: "Glazura na dně — přilepí se", kratce: "Glazura na dně" });
  }
  const pretizeno = zatez.map((z, i) => z > NOSNOST[i]) as [boolean, boolean, boolean];
  for (const id of vPeci) {
    const p = st.kde[id]!.patro;
    if (pretizeno[p]) potize[id].push({ druh: "vaha", text: p === 0 ? "Šamotka to neunese" : "Police to neunese", kratce: "Neunese" });
  }
  const povinnych = vPeci.filter((id) => !kusPodleId(id).navic).length;
  const navic = vPeci.length - povinnych;
  const spatne = vPeci.filter((id) => potize[id].length > 0);
  let proc: string | null = null;
  if (spatne.length) {
    const id = spatne[0];
    const k = kusPodleId(id);
    const pz = potize[id][0];
    proc =
      pz.druh === "vaha"
        ? `${pz.text}: ${NAZEV_PATRA[st.kde[id]!.patro]} nese ${kg(zatez[st.kde[id]!.patro])}, unese ${kg(NOSNOST[st.kde[id]!.patro])}.`
        : pz.druh === "dno"
          ? `${k.nazev} má glazuru na dně. Nejdřív ji otři o houbičku.`
          : `${k.nazev}: ${pz.text.charAt(0).toLowerCase()}${pz.text.slice(1)}.`;
  } else if (povinnych < POVINNYCH) {
    const chybi = POVINNYCH - povinnych;
    proc = chybi === 1 ? "Chybí ještě jeden povinný kus." : chybi <= 4 ? `Chybí ještě ${SLOVY[chybi]} povinné kusy.` : `Chybí ještě ${SLOVY[chybi]} povinných kusů.`;
  }
  return { potize, zatez, pretizeno, vPeci, povinnych, navic, pripraveno: proc === null, proc };
}

/* ——— Hodnocení ——— */

/**
 * Body za zavřené víko: 70 za sedm povinných, 12 za každý kus navíc
 * a za rychlost do 6 (do minuty celých 6, od 150 s nic). Kdo zavírá až
 * po 150 s, ztrácí — v poslední vteřině až 14 bodů, to je 可.
 */
export function body(navic: number, ms: number) {
  const t = ms / 1000;
  const rychlost = t <= 60 ? 6 : t <= 150 ? (6 * (150 - t)) / 90 : (-14 * Math.min(30, t - 150)) / 30;
  return Math.round(Math.min(100, Math.max(0, 70 + 12 * navic + rychlost)));
}

/** „1 kus“, „3 kusy“, „9 kusů“ */
export const kusu = (n: number) => `${n} ${n === 1 ? "kus" : n >= 2 && n <= 4 ? "kusy" : "kusů"}`;
