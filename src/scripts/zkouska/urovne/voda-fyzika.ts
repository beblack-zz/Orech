/**
 * Fyzika úrovně 三 Voda — centrování hlíny na kruhu. Bez DOM, ať jde
 * přetočit v Node a ladit roboty (hru a kresbu obsluhuje voda.ts).
 *
 * Hrouda leží na kruhu mimo osu o vektor o (mm, v soustavě kruhu — točí se
 * s ním, proto hrouda obíhá). Vlhkost w je 0–1, rozmočení s 0–1.
 *
 *   ruce na hlíně      vysychá rychleji (tření), bez rukou pomalu
 *   voda               w + 0,16, nejvýš jednou za 0,4 s
 *   moc vody (> 0,82)  hlína měkne: s roste, v 1 se hrouda sesune
 *                      a znovu se usadí mimo osu; druhé sesunutí je konec
 *   sucho (< 0,25)     suchou hlínu ruce chytají: každou půlvteřinu
 *                      cukne o 2–5 mm a vrzne to
 *   centrování         ruce u osy, v klidu a voda v pásmu 0,3–0,8:
 *                      r se zmenšuje o 35 % za vteřinu a k tomu o 0,25 mm
 *                      (poslední milimetry se usadí rychleji), obojí krát
 *                      klid rukou a jejich vzdálenost od osy
 *   cukání rukou       rychlý pohyb = žádný klid a hlína cuká ven
 *   bez rukou          hlína se sama nevycentruje, r pomalu roste
 *
 * Cíl: r pod 1,5 mm tři vteřiny s rukama na hlíně, pak pustit (s r pořád
 * pod 1,5 mm). Držení se při cuknutí nebo puštění nenuluje, jen ubývá
 * (o 1,5 s za vteřinu) — krátké zaváhání stojí chvilku, ne všechno.
 * Na všechno je 50 vteřin.
 */

export const P = {
  /** Počáteční vyosení (mm) od–do */
  start: [14, 18] as [number, number],
  vlhkostStart: 0.55,
  suseniTlak: 0.07,
  suseniKlid: 0.02,
  voda: 0.16,
  vodaPauza: 0.4,
  pasmo: [0.3, 0.8] as [number, number],
  sucho: 0.25,
  mokro: 0.82,
  mokneni: 0.18,
  osychani: 0.05,
  /** Rychlost centrování: podíl r za vteřinu a k tomu mm za vteřinu */
  centrovani: 0.35,
  centrovaniMm: 0.25,
  /** Bez rukou se hrouda rozbíhá (mm/s) */
  drift: 0.25,
  /** Ruce dál od osy tlačí hlínu ven (mm/s naplno) */
  mimoOsu: 1.5,
  /** Ruce úplně v klidu do téhle rychlosti (jednotky scény za vteřinu), bez klidu od klidDo */
  klidOd: 30,
  klidDo: 200,
  /** Od téhle rychlosti hlína pod rukama cuká */
  cukRychlost: 260,
  /** Poloha rukou jako podíl poloměru hlavy kruhu: naplno do zonaOd, vůbec od zonaDo */
  zonaOd: 0.14,
  zonaDo: 0.34,
  /** Ruce dál než tohle už na hlíně nejsou */
  naHline: 0.75,
  /** Suchá hlína cukne každých … s o 2–5 mm */
  chytKazdych: 0.5,
  cil: 1.5,
  drzet: 3,
  /** Jak rychle držení ubývá mimo cíl (s za s) */
  drzetUbyva: 1.5,
  /** Dál než tohle hlína neuteče (mm) */
  rMax: 28,
  limit: 50,
  /** Po sesunutí se hrouda usadí znovu takhle daleko (mm) */
  poSesuvu: [11, 14] as [number, number],
};

export interface Stav {
  /** Vyosení v mm, v soustavě kruhu */
  ox: number;
  oy: number;
  w: number;
  s: number;
  sesuvy: number;
  /** Herní čas (s) */
  cas: number;
  /** Jak dlouho už se drží na středu s rukama na hlíně (s); mimo cíl ubývá */
  drzi: number;
  /** Je hrouda právě v cíli s rukama na hlíně */
  naStredu: boolean;
  /** Jak dlouho byly ruce na hlíně a z toho s vodou mimo pásmo (s) */
  tlaciCelkem: number;
  tlaciSpatne: number;
  /** Odpočty */
  chyt: number;
  cuk: number;
  pauzaVody: number;
}

export interface Vstup {
  /** Ruce jsou na hlíně */
  tlaci: boolean;
  /** Jak daleko od osy jsou ruce — podíl poloměru hlavy kruhu */
  odOsy: number;
  /** Rychlost rukou v jednotkách scény za vteřinu (čistý posun za poslední čtvrtvteřinu) */
  rychlost: number;
}

export type Udalost = "chyt" | "cuk" | "sesuv" | "stred" | "samo";

const omez = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const hladce = (t: number) => t * t * (3 - 2 * t);

export const vyoseni = (S: Stav) => Math.hypot(S.ox, S.oy);

/** Klid rukou 0–1 podle rychlosti */
export const klidRukou = (v: number) => 1 - omez((v - P.klidOd) / (P.klidDo - P.klidOd));
/** Jak moc ruce v dané vzdálenosti od osy centrují, 0–1 */
export const polohaRukou = (odOsy: number) => 1 - hladce(omez((odOsy - P.zonaOd) / (P.zonaDo - P.zonaOd)));
export const vPasmu = (w: number) => w >= P.pasmo[0] && w <= P.pasmo[1];

/** Nastaví vyosení na r (mm); směr zachová, nebo ho trochu (o rozptyl rad) pootočí */
function nastavR(S: Stav, r: number, nahoda: () => number, rozptyl = 0) {
  const ted = vyoseni(S);
  let uhel = ted > 0.02 ? Math.atan2(S.oy, S.ox) : nahoda() * Math.PI * 2;
  uhel += (nahoda() - 0.5) * 2 * rozptyl;
  S.ox = Math.cos(uhel) * r;
  S.oy = Math.sin(uhel) * r;
}

export function novyStav(nahoda: () => number = Math.random): Stav {
  const r = P.start[0] + (P.start[1] - P.start[0]) * nahoda();
  const uhel = nahoda() * Math.PI * 2;
  return {
    ox: Math.cos(uhel) * r,
    oy: Math.sin(uhel) * r,
    w: P.vlhkostStart,
    s: 0,
    sesuvy: 0,
    cas: 0,
    drzi: 0,
    naStredu: false,
    tlaciCelkem: 0,
    tlaciSpatne: 0,
    chyt: P.chytKazdych,
    cuk: 0,
    pauzaVody: 0,
  };
}

/** Přidat vodu. Vrátí false, když se ještě ždímá (pauza 0,4 s). */
export function zalij(S: Stav) {
  if (S.pauzaVody > 0) return false;
  S.w = Math.min(1, S.w + P.voda);
  S.pauzaVody = P.vodaPauza;
  return true;
}

/** Ruce pustily hlínu. Vrátí true, když to bylo po třech vteřinách na středu — hotovo. */
export const pust = (S: Stav) => S.drzi >= P.drzet && vyoseni(S) < P.cil;

/** Hrouda se sesunula: znovu ji usadit mimo osu, bez rozmočení */
export function sesun(S: Stav, nahoda: () => number = Math.random) {
  S.sesuvy++;
  S.s = 0;
  S.w = 0.5;
  S.drzi = 0;
  S.naStredu = false;
  S.ox = 0;
  S.oy = 0;
  nastavR(S, P.poSesuvu[0] + (P.poSesuvu[1] - P.poSesuvu[0]) * nahoda(), nahoda);
}

/** Jeden krok simulace o dt sekund */
export function krok(S: Stav, v: Vstup, dt: number, nahoda: () => number = Math.random): Udalost[] {
  const u: Udalost[] = [];
  S.cas += dt;
  S.pauzaVody = Math.max(0, S.pauzaVody - dt);
  S.w = Math.max(0, S.w - (v.tlaci ? P.suseniTlak : P.suseniKlid) * dt);
  if (S.w > P.mokro) S.s += P.mokneni * dt;
  else S.s = Math.max(0, S.s - P.osychani * dt);
  if (S.s >= 1) {
    S.s = 1;
    u.push("sesuv");
    return u;
  }

  const r = vyoseni(S);
  if (v.tlaci) {
    S.tlaciCelkem += dt;
    if (!vPasmu(S.w)) S.tlaciSpatne += dt;
    let nove = r;
    if (vPasmu(S.w)) {
      const k = klidRukou(v.rychlost) * polohaRukou(v.odOsy);
      nove = Math.max(0, nove * Math.exp(-P.centrovani * k * dt) - P.centrovaniMm * k * dt);
    }
    if (v.odOsy > P.zonaDo) nove += P.mimoOsu * omez((v.odOsy - P.zonaDo) / 0.3) * dt;
    if (S.w < P.sucho) {
      S.chyt -= dt;
      if (S.chyt <= 0) {
        S.chyt = P.chytKazdych;
        nove += 2 + 3 * nahoda();
        u.push("chyt");
      }
    } else S.chyt = P.chytKazdych;
    if (v.rychlost > P.cukRychlost) {
      S.cuk -= dt;
      if (S.cuk <= 0) {
        S.cuk = 0.25;
        nove += (0.15 + 0.3 * nahoda()) * Math.min(2, v.rychlost / P.cukRychlost);
        u.push("cuk");
      }
    } else S.cuk = 0;
    nastavR(S, Math.min(P.rMax, nove), nahoda, nove > r + 0.3 ? 0.6 : 0);
  } else {
    nastavR(S, Math.min(P.rMax, r + P.drift * dt), nahoda);
  }

  const naStredu = v.tlaci && vyoseni(S) < P.cil;
  if (naStredu && !S.naStredu) u.push("stred");
  S.naStredu = naStredu;
  const predtim = S.drzi;
  S.drzi = naStredu ? Math.min(P.drzet + 0.5, S.drzi + dt) : Math.max(0, S.drzi - P.drzetUbyva * dt);
  if (predtim < P.drzet && S.drzi >= P.drzet) u.push("samo");
  return u;
}

/** Podíl času s rukama na hlíně, kdy voda nebyla v pásmu */
export const spatneVody = (S: Stav) => (S.tlaciCelkem > 0 ? S.tlaciSpatne / S.tlaciCelkem : 0);

/**
 * Body 0–100: čas nad 14 s stojí 2,2 bodu za vteřinu, voda mimo pásmo až
 * 80 bodů (podle podílu času s rukama na hlíně), každé sesunutí 25.
 * Kdo projde, má aspoň 40 (známka 可).
 */
export function body(S: Stav, cas: number, proslo: boolean) {
  const b = 100 - Math.max(0, cas - 14) * 2.2 - spatneVody(S) * 80 - S.sesuvy * 25;
  const zaokr = Math.round(omez(b, 0, 100));
  return proslo ? Math.max(40, zaokr) : Math.min(39, zaokr);
}
