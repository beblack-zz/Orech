/**
 * Průvodce: Vázička v pravém dolním rohu (místo dřívější jízdenky
 * k rezervaci). Sedí tam jako stín — tatáž kresba, jen černá. Po klepnutí
 * nabídne tři otázky podle stránky (data/pruvodce.ts); po výběru ožije,
 * stránka sjede k cíli, Vázička k němu doletí, cíl se rozzáří a ona řekne
 * větu v bublině — přitom se zatočí a vymění si květy za další měsíc.
 * Pak se vrátí do rohu a zase zčerná. Stín zapíná `STIN` — 16. 10. je
 * vypnutý, ať jsou v rohu vidět její výrazy.
 *
 * Mluví jako hostitelka — nabízí, že uvede, ukáže, doprovodí (texty
 * v data/pruvodce.ts). Čárkou nad ní se dá schovat: zmizí a v rohu
 * zůstane jen malá čárka (pamatuje si to localStorage). Aby úplně
 * nezanikla, kolem čárky se každých 30 vteřin štětcem vykreslí a protočí
 * ensō z loga. Klepnutí na čárku ji vrátí.
 *
 * Na úvodu se jednou za návštěvu webu (localStorage, při vývoji pokaždé)
 * představí: přiletí doprostřed obrazovky, větší, řekne, kdo je, a odletí
 * do rohu, kde zčerná. Kdo na roh mezitím klepne, pošle ji tam hned.
 * Schovanou do čárky nevyruší. Při představení nikdy nenese uzlík šátku
 * (malý ani velký) ani odkaz s pečetí — vezme si ho až potom doma.
 *
 * Pohyb (oblouky letu, natáčení podle rychlosti, protivítr, pohled) je
 * převzatý ze společnice, která dřív létala po Dílně a schovávala se za
 * karty. Kresbu a její běh má scripts/vazicka-gejsa; prvek se tu vyrobí
 * a beh.js ho rozběhne (spustVse). Klepnout jde na tlačítko v rohu, ne na
 * kresbu — ta klikání na stránku nepřekáží.
 *
 * Myš: když se kurzor přiblíží, stín si ho všimne — trochu prosvětlí,
 * natočí se k němu a kouká za ním; mávnutí kolem ní je vítr a kurzor
 * na tváři ji schová za vějíř. To všechno umí kresba sama, jen k ní myš
 * přes `pointer-events: none` nedojde — poloha kurzoru se jí posílá odsud.
 * Každá replika nese výraz (data/pruvodce.ts), se kterým ji řekne.
 *
 * Co o hostovi ví (pruvodce-host.ts): jen to, co v domě sám udělal —
 * podpis, mistrovský list, zkoušky, nalezené kami, šátek, slepené číslo,
 * uzlíky, lístek ze svatyně, dárkovou jízdenku, noc v hlavičce. Podle toho
 * ho vítá, mistrovi se ukáže i s kruhem dvanácti květů a v noci nese
 * lucernu. Sama od sebe řekne nejvýš jednu stopu za stránku a na to, co
 * host právě udělal (našel kami, převzal list, zapnul noc), reaguje hned,
 * jak nikomu nepřekáží. Nic nového si neukládá.
 *
 * Co se děje teď (třetí kolo, počítadla platí jen na téhle stránce): rychlý
 * scroll je vítr — přidrží si vlasy a přísně se podívá, napodruhé
 * a napotřetí to řekne; klepání dokola na ni — napotřetí se otočí zády;
 * v tichu si upraví květy, ovívá se a po minutě zadřímne; ve vlasech nosí
 * květy skutečného měsíce (otočka je jen obnoví) a jednou za stránku
 * poznamená, co je zrovna na obrazovce.
 *
 * Šátek z krámku: co si host v Obchodě vybral, to mu nese v pravé ruce
 * zavázané v uzlíku furoshiki ve vzoru, který si u šátku vybral (kresba
 * kami-kvety.js, `vstup.satek`). Drží ho, když v šátku něco je, šátek není
 * na obrazovce a ona není schovaná do čárky. Přes uzlík leží odkaz
 * `.pruvodce-satek` k šátku (na stránce se šátkem k němu plynule sjede,
 * jinde vede na /obchod#satek) s rumělkovou pečetí s počtem kusů na boku
 * uzlíku; každý snímek ho posune na uzlík (`dyn.satekBod`, po kroku ho
 * kresba pošle i sama přes `vstup.uzlikJe`), i když letí. Doma se
 * s uzlíkem posune o kus dovnitř okna, ať uzlík ani pečeť neuřízne okraj —
 * tlačítko, nabídka a bubliny jdou s ní. Šátek (scripts/obchod2/satek.ts)
 * jí posílá na document
 * `satek:zmena` { pocet, vzor }, `satek:videt` { videt } a `satek:pridano`
 * { id, videt }; na stránce bez šátku si počet a vzor přečte z úložiště
 * šátku sama. Když do uzlíku doletí kus, chytí ho — poskočí, uzlík se
 * zhoupne a pečeť cinkne — a poprvé za stránku řekne, že šátek podrží.
 * Když se schová do čárky a když se zase ukáže, pošle `pruvodce:schovana`
 * { schovana } — šátek pak místo ní ukáže svoje plovoucí tlačítko.
 *
 * Uzlík je ve dvou verzích k porovnání: malý v ruce, nebo velký skoro jako
 * ona, který nese pod sebou jako včelka (`druh` ve `vstup.satek`, kresba
 * kami-kvety.js). Vybírá se v adrese ?uzlik=velky / ?uzlik=maly, pamatuje si
 * to localStorage (`pruvodce-uzlik`) i pro další stránky; výchozí je velký.
 * S velkým pořád letí, i doma se vznáší (to umí kresba, rámeček se doma
 * nevlní) — o kus výš, ať se uzlík pod ní vejde do okna (tlačítko, čárka,
 * nabídka a bubliny jdou s ní i nahoru); letí ztěžka — pomaleji, cesta se
 * jí pod vahou prohne dolů, ne však níž, než sedí doma, a vlní se hlouběji —,
 * po radě se netočí, místo poskoku se po dopadnutém kusu i po úleku ze
 * spánku propadne (kresba, `cuk` a `lek`) a věta přijde až po úleku.
 * Stěžuje si elegantně (`tezkySatek` v data/pruvodce.ts): k dalším kusům,
 * když ho dlouho drží a nic se neděje, a v nabídce. Lucernu s ním nenosí;
 * v noci má barvy stejné jako ve dne (žádné ztmavení).
 * Odkaz s pečetí má u velkého jen malý okraj, ať tlačítko s ní nepřekrývá víc
 * než malý.
 *
 * Spouští ji hlavicka.ts na každé stránce s hlavičkou nového vzhledu.
 */
import { rekni, dobaPsani } from "./kami";
import { samisen, dozvuk } from "./pruvodce-hlas";
import { rozhoupejZaves } from "./zaves";
import { NALEZEN } from "./sber";
import { MISTR_ZMENA } from "./mistr";
import { zjisti, vypln, vyplnRepliku, radaPro, coVimPolozky, coVimTitul } from "./pruvodce-host";
import type { Host } from "./pruvodce-host";
import { spustVse, zahraj } from "../vazicka-gejsa/beh.js";
import { toraTora } from "./ozashiki";
import { nacti } from "./stav";
import { pocetKusu } from "../../data/pocty";
import { vzorPodleId, VYCHOZI_VZOR } from "../../data/furoshiki";
import type { VzorSatku } from "../../data/furoshiki";
import { rady, hlasky, uvitani, mistrovskyList, kNalezu, stopy, naNoc, doSatku, tezkySatek, coVim, pomalu, klepani, probuzeni, veVlasech, povidani, ozashiki, naObrazovce as poznamky } from "../../data/pruvodce";
import { hlavni as ensoTah, kapka as ensoKapka, W as ENSO_W } from "../../components/navrhy-loga/enso-tvar";
import type { Gesto, Rada, Replika, Vyraz } from "../../data/pruvodce";
import type { PostavaId } from "../../data/parta";

type Bod = { x: number; y: number };
type Drzeni = { naklon: number; otoc: number; pohled: [number, number] } | null;
interface Akce { delka: number; krok: (q: number) => void; start?: () => void }
/** Co si vyměňuje s kresbou (beh.js ji rozběhne, kami-kvety.js čte `vstup` a `dyn.otoc` a zapisuje `dyn.satekBod`) */
type Scena = {
  /** Překreslí kresbu od čisté simulace a `bdi` s ji nechá běžet — s omezeným pohybem jinak stojí na jednom snímku (beh.js) */
  znovu?: (bdi?: number) => number;
  stav: () => {
    /** `satekBod` je střed uzlíku a jeho poloměr v rámečku 180 × 180 */
    dyn: { otoc?: number; satekBod?: [number, number, number] | null };
    vstup: {
      /** Uzlík šátku v pravé ruce: vzor látky, kolik je v něm kusů, kolikrát do něj kus dopadl (zhoupne se), kolikrát se s velkým lekla (propadne se) a jestli malý, nebo velký */
      satek?: { vzor: VzorSatku["id"]; pocet: number; cuk: number; lek: number; druh: Druh } | null;
      /** Kresba ho zavolá, jakmile v kroku spočítá uzlík (`dyn.satekBod`) — ať odkaz sedí už v tomtéž snímku */
      uzlikJe?: (bod: [number, number, number]) => void;
      kliky: Bod[];
      vitr?: number;
      pohled?: [number, number];
      mys?: Bod | null;
      vitrMysi?: number;
      vyraz?: Vyraz;
      lucerna?: boolean;
      mesic?: number;
      bezOtocek?: boolean;
      vlasy?: boolean;
      ovivani?: boolean;
      spi?: boolean;
      uklon?: boolean;
      vejir?: boolean;
    };
  };
};

/** Kde je postava v rámečku 180 × 180, v násobcích jeho strany od středu (změřeno z kresby) */
const POSTAVA = { l: -0.21, r: 0.22, t: -0.24, b: 0.43 };
/** Jak daleko od pravého a dolního okraje okna sedí */
const OKRAJ = { r: 14, b: 10 };
/**
 * S uzlíkem šátku v ruce sahá dál doprava: uzlík visí vpravo od ní a na
 * jeho pravém boku sedí pečeť s počtem. `UZLIK_DOMA` je střed
 * uzlíku doma (i s náklonem) a jeho poloměr v násobcích strany rámečku od
 * středu a rezerva na houpání (změřeno z kresby); `PECET` je, kde na uzlíku
 * sedí pečeť (v poloměrech uzlíku), a kolik px má od středu k okraji i
 * natočená. `UZLIK_NAHRADNI` platí, dokud kresba nepošle `dyn.satekBod`.
 */
const UZLIK_DOMA = { x: 0.18, r: 0.145, rezerva: 0.015 };
const PECET = { dx: 0.9, dy: 0.45, pul: 12 };
const UZLIK_NAHRADNI: [number, number, number] = [120, 147.6, 22.8];
/**
 * Velký uzlík (druhá verze) jí visí pod tělem a ona se s ním vznáší: dno
 * sahá i při nejhlubším propadu (kus dopadne, zrovna když se propadla
 * a ukloní se, a uzlík jí natáhne paže) `dolni` stran rámečku pod jeho
 * střed, doprava sahá uzlík i rozhoupaný
 * `pravy` stran a doleva vějíř, který ji ovívá, `levy` stran — i rozevřený
 * na gesto (změřeno z kresby). Doma proto sedí o tolik výš; vedle cíle
 * nechá místo i pro vějíř. Pečeť sedí uvnitř uzlíku na jeho pravém dolním
 * boku. Klikací krabička je jen o `okraj` px větší než uzlík, ať nepřekrývá
 * tlačítko s ní víc než malý.
 */
const VELKY = { pravy: 0.25, levy: 0.42, dolni: 0.91, okraj: 2 };
const PECET_VELKEHO = { dx: 0.42, dy: 0.42 };
const VELKY_NAHRADNI: [number, number, number] = [90, 195, 32.7];
/** Velikost uzlíku k porovnání: ?uzlik=velky / ?uzlik=maly v adrese, pak si ji pamatuje (i na dalších stránkách); výchozí je velký */
type Druh = "velky" | "maly";
const KLIC_UZLIK = "pruvodce-uzlik";
const zjistiDruh = (): Druh => {
  const zAdresy = new URLSearchParams(window.location.search).get("uzlik");
  try {
    if (zAdresy === "velky" || zAdresy === "maly") localStorage.setItem(KLIC_UZLIK, zAdresy);
    const ulozeny = localStorage.getItem(KLIC_UZLIK);
    if (ulozeny === "velky" || ulozeny === "maly") return ulozeny;
  } catch {
    /* bez úložiště platí jen to, co je v adrese */
  }
  return zAdresy === "maly" ? "maly" : "velky";
};
/** Šátek z krámku: klíče úložiště, které zapisuje scripts/obchod2/satek.ts — tady se jen čtou */
const SATEK = { klic: "obchod2-satek", vzor: "obchod2-satek-vzor" };
/** Jak často se kolem čárky protočí ensō, v milisekundách */
const ENSO_KAZDYCH = 30_000;
/** Kurzor blíž než tolik velikostí postavy od jejího středu: všimne si ho; dál než `pusti` už ne */
const VNIMA = { od: 3, pusti: 3.6 };
/** Doma sedí jako stín (černá silueta, v barvě až v letu); vypnuto, ať jsou vidět výrazy — stín vrátí `true` */
const STIN = false;
/** Jak moc ji ofoukne mávnutí myší — v rohu je malá, plná síla z /marcel by s ní cloumala */
const VITR_MYSI = 0.25;
/**
 * Sama od sebe (stopa v domě) promluví nejdřív `poNacteni` ms po načtení
 * stránky a pak nejvýš jednou za `rozestup`. Na to, co host právě udělal,
 * reaguje hned, jak nikomu nepřekáží — ale do `cerstve` ms, pak už to
 * nemá smysl říkat.
 */
const SAMA = { poNacteni: 6_000, rozestup: 90_000, cerstve: 20_000 };
/** Kdy naposledy promluvila sama od sebe — žije v modulu, takže platí i přes přechody mezi stránkami (nic se neukládá) */
let posledniSama = -Infinity;
/** Rychlý scroll (px/s, vyhlazeně): nad tím je to vítr; jedna epizoda spěchu končí po `klid` ms bez něj */
const SPECH = { rychlost: 2600, klid: 1500 };
/** Jak dlouho (s) drží velký uzlík bez nového kusu, než si jednou za stránku postěžuje */
const DRZI_DLOUHO = 40;
/** Klepání dokola: tolik klepnutí během `okno` ms je jedna epizoda; napotřetí se otočí zády na `zady` s */
const KLEPANI = { klepnuti: 4, okno: 3_000, zady: 2.6 };
/** Ticho: po `zabava` ms bez pohybu se zabývá sama sebou (každých `rozestup` ms), po `spanek` ms zadřímne */
const TICHO = { zabava: 15_000, rozestup: 9_000, spanek: 60_000 };
/** Otočená zády, když je uražená */
const ZADY: Drzeni = { naklon: 0, otoc: 180, pohled: [0, 0] };
/** Na kterých stránkách (data-stranka) se jednou za návštěvu webu představí, a jak si to pamatuje */
const PREDSTAVENI = { stranky: ["domek-2"], klic: "pruvodce-predstavena" };
const VYVOJ = !!import.meta.env?.DEV;
/** Pamatuje si, že je schovaná do čárky */
const KLIC_SCHOVANA = "pruvodce-schovana";
const nactiSchovanou = () => {
  try {
    return localStorage.getItem(KLIC_SCHOVANA) === "1";
  } catch {
    return false;
  }
};
const ulozSchovanou = (ano: boolean) => {
  try {
    if (ano) localStorage.setItem(KLIC_SCHOVANA, "1");
    else localStorage.removeItem(KLIC_SCHOVANA);
  } catch {
    /* bez úložiště se po načtení zase ukáže — nevadí */
  }
};
/** Kolik je v šátku kusů a jaký má vzor — z úložiště šátku; na stránce se šátkem jen do první zprávy od satek.ts */
const nactiPocet = () => {
  const s = nacti<unknown>(SATEK.klic, []);
  return Array.isArray(s) ? s.filter((id) => typeof id === "string").length : 0;
};
const nactiVzor = (): VzorSatku["id"] => vzorPodleId(nacti<unknown>(SATEK.vzor, VYCHOZI_VZOR))?.id ?? VYCHOZI_VZOR;
/** Odhad, jestli je šátek na obrazovce, než to řekne satek.ts: aspoň pětina sekce (stejný práh jako tam) */
const jeVidet = (el: Element) => {
  const r = el.getBoundingClientRect();
  return r.height > 0 && (Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0)) / r.height >= 0.2;
};
/** Ikonky bublin vedle ní: bublina s třemi tečkami (povídání) a postava (co o hostovi ví) — tah tuší jako zbytek nabídky */
const IKONA_POVIDANI = `<svg viewBox="0 0 24 24"><path d="M4.5 6.5 Q4.5 4 7 4 H17 Q19.5 4 19.5 6.5 V13 Q19.5 15.5 17 15.5 H11 L7 19.5 V15.5 Q4.5 15.5 4.5 13 Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="8.6" cy="9.8" r="1.1" fill="currentColor"/><circle cx="12" cy="9.8" r="1.1" fill="currentColor"/><circle cx="15.4" cy="9.8" r="1.1" fill="currentColor"/></svg>`;
const IKONA_CO_VIM = `<svg viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="3.6" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M5.2 19.5 Q5.8 13.6 12 13.6 Q18.2 13.6 18.8 19.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`;
/** Ensō z loga (tah štětce, kapka na začátku) v soumrakových barvách loga; maska ho kreslí po směru tahu */
const ensoSvg = () => `<svg class="pruvodce-enso" viewBox="0 0 200 200" aria-hidden="true">
  <defs>
    <linearGradient id="pruvodce-enso-barva" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#C4432B"/><stop offset="0.4" stop-color="#A0527A"/><stop offset="0.75" stop-color="#5E4E86"/><stop offset="1" stop-color="#2A2C5E"/>
    </linearGradient>
    <mask id="pruvodce-enso-maska" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">
      <circle class="pruvodce-enso-odhal" cx="100" cy="100" r="68" pathLength="1" fill="none" stroke="#fff" stroke-width="46" transform="rotate(-30 100 100)"/>
    </mask>
  </defs>
  <g mask="url(#pruvodce-enso-maska)" fill="url(#pruvodce-enso-barva)">
    <path d="${ensoTah}"/>
    <ellipse cx="${ensoKapka.x}" cy="${ensoKapka.y}" rx="${(ENSO_W * 0.6).toFixed(2)}" ry="${(ENSO_W * 0.53).toFixed(2)}" transform="rotate(${ensoKapka.uhel} ${ensoKapka.x} ${ensoKapka.y})"/>
  </g>
</svg>`;

const omez = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const hladce = (q: number) => q * q * (3 - 2 * q);
const nahodne = (a: number, b: number) => a + Math.random() * (b - a);
const kCili = (v: number, cil: number, dt: number, tau: number) => v + (cil - v) * (1 - Math.exp(-dt / tau));
/** Kurzor v jednotkách kresby: přes postavu přesně, dál od ní stlačený, ať ji vzdálená myš neofukuje */
const stlac = (o: number) => (Math.abs(o) <= 90 ? o : Math.sign(o) * (90 + (Math.abs(o) - 90) * 0.2));
/** Jak dlouho visí bublina (rekni v kami.ts ji zavře za 3,6 s + 30 ms na znak, a když píše štětcem, ještě o dobu psaní později) */
const delkaBubliny = (text: string) => 3.9 + text.length * 0.03 + dobaPsani(text) / 1000;
/** Rozzáří závěs s kami a rozhoupe ho (animace zaves-zari v parta2.css doběhne sama) */
const rozzarZaves = () => {
  const z = document.querySelector<HTMLElement>("[data-zaves]");
  if (!z) return;
  z.classList.remove("zaves-zari");
  void z.offsetWidth;
  z.classList.add("zaves-zari");
  rozhoupejZaves();
};
/** Rozsvítí prvek, na který ukazuje (animace v parta2.css doběhne sama) */
const rozzar = (el: Element) => {
  el.classList.remove("pruvodce-ukazuje");
  void (el as HTMLElement).offsetWidth;
  el.classList.add("pruvodce-ukazuje");
};
/** Je prvek opravdu vidět — má rozměr a není ve schovaném rodiči */
const viditelny = (el: Element | null): el is HTMLElement => {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && !el.closest("[hidden]");
};

export function pruvodce() {
  if (document.querySelector(".pruvodce")) return;
  const stranka = document.body.dataset.stranka ?? "";
  const klidne = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

  /* Co o hostovi ví — jen z toho, co v domě sám udělal (pruvodce-host.ts) */
  let host = zjisti();
  const nacteno = performance.now();
  const hlava = document.querySelector(".hlava");
  const uvitaniPro = (h: Host) => (h.mistr ? (h.mistr.osloveni === "sensei" ? uvitani.sensei : uvitani.mistr) : h.noc ? uvitani.noc : h.jmeno ? uvitani.podpis : uvitani.host);

  /* Šátek z krámku, který jí host svěřil: kolik je v něm kusů, jaký má vzor a jestli je zrovna na obrazovce (pak ho nenese).
     Na stránce se šátkem to hlásí satek.ts, jinde se to čte z úložiště; `cuk` je, kolikrát do uzlíku doletěl kus */
  const sekceSatku = document.getElementById("satek");
  const satek = { pocet: nactiPocet(), vzor: nactiVzor(), videt: !!sekceSatku && jeVidet(sekceSatku), cuk: 0, lek: 0 };
  /** Zmizela do čárky (až doříká, že ustoupí) — uzlík pak nenese a šátek ukáže svoje tlačítko */
  let vCarce = false;
  /** Zrovna se představuje na úvodu — uzlík při tom nenese (malý ani velký), vezme si ho až potom doma */
  let predstavuje = false;
  /** Nese hostovi uzlík: v šátku něco je, šátek není na obrazovce, ona není v čárce a nepředstavuje se */
  const nese = () => satek.pocet > 0 && !satek.videt && !vCarce && !predstavuje;
  /** Který uzlík nese (k porovnání, ?uzlik=…) a jestli zrovna ten velký — s ním se trápí, letí ztěžka a netočí se */
  const druh = zjistiDruh();
  const tezky = () => druh === "velky" && nese();

  /* ——— Prvky: létající Vázička, tlačítko v rohu a nabídka ——— */
  const O = document.createElement("div");
  O.className = STIN ? "pruvodce stin" : "pruvodce";
  O.setAttribute("aria-hidden", "true");
  const T = document.createElement("div");
  T.className = "pruvodce-telo";
  const VG = document.createElement("div");
  VG.className = "vazicka-gejsa";
  /* Vlastní id (vgp-), ať se nepotká s jinou Vázičkou na stránce — viz kamiPruvodce; mistrovi se ukáže i s kruhem dvanácti květů */
  VG.dataset.vazickaGejsa = host.mistr ? "pruvodceMistr" : "pruvodce";
  T.append(VG);
  O.append(T);

  const tlacitko = document.createElement("button");
  tlacitko.type = "button";
  tlacitko.className = "pruvodce-tlacitko";
  tlacitko.setAttribute("aria-label", "Vázička — smí ti poradit?");
  tlacitko.setAttribute("aria-expanded", "false");
  tlacitko.setAttribute("aria-controls", "pruvodce-nabidka");
  const napoveda = document.createElement("span");
  napoveda.className = "pruvodce-napoveda";
  napoveda.setAttribute("aria-hidden", "true");
  napoveda.textContent = vypln(uvitaniPro(host).napoveda, host);
  tlacitko.append(napoveda);

  const nabidka = document.createElement("div");
  nabidka.className = "pruvodce-nabidka";
  nabidka.id = "pruvodce-nabidka";
  nabidka.setAttribute("role", "dialog");
  nabidka.setAttribute("aria-labelledby", "pruvodce-titul");
  nabidka.hidden = true;
  const titul = document.createElement("p");
  titul.className = "pruvodce-titul";
  titul.id = "pruvodce-titul";
  titul.textContent = vypln(uvitaniPro(host).titul, host);
  const seznam = document.createElement("div");
  seznam.className = "pruvodce-volby";
  nabidka.append(titul, seznam);
  /* Vedle ní vlevo dvě bubliny — povídání a co o hostovi ví. Vyskočí s nabídkou a s ní zmizí; popisek jen při najetí. Svítí ta, jejíž obsah nabídka zrovna ukazuje */
  const kulicky = document.createElement("div");
  kulicky.className = "pruvodce-kulicky";
  kulicky.hidden = true;
  const kulicka = (ikona: string, popis: string, celkem: string) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "pruvodce-kulicka";
    b.setAttribute("aria-label", celkem);
    b.setAttribute("aria-pressed", "false");
    b.setAttribute("aria-controls", "pruvodce-nabidka");
    b.innerHTML = `${ikona}<span class="pruvodce-kulicka-popis" aria-hidden="true">${popis}</span>`;
    kulicky.append(b);
    return b;
  };
  const kulickaPovidani = kulicka(IKONA_POVIDANI, povidani.kratce, povidani.otazka);
  const kulickaCoVim = kulicka(IKONA_CO_VIM, coVim.kratce, coVim.otazka);

  /* Čárkou nad ní se schová; v rohu pak zůstane jen malá čárka, kolem které se občas protočí ensō */
  const zmensit = document.createElement("button");
  zmensit.type = "button";
  zmensit.className = "pruvodce-zmensit";
  zmensit.setAttribute("aria-label", "Schovat Vázičku do čárky");
  zmensit.title = "Schovat";
  const carka = document.createElement("button");
  carka.type = "button";
  carka.className = "pruvodce-carka";
  carka.setAttribute("aria-label", "Zavolat Vázičku zpátky");
  carka.title = hlasky.carka;
  carka.innerHTML = `${ensoSvg()}<i class="pruvodce-carka-tah" aria-hidden="true"></i>`;
  carka.hidden = true;

  /* Odkaz k šátku leží přesně na uzlíku v její ruce (posouvá ho vykresli); počet je pečeť na kraji uzlíku */
  const satekOdkaz = document.createElement("a");
  satekOdkaz.className = "pruvodce-satek";
  satekOdkaz.href = sekceSatku ? "#satek" : "/obchod#satek";
  satekOdkaz.hidden = true;
  const satekPocet = document.createElement("span");
  satekPocet.className = "pruvodce-satek-pocet";
  satekPocet.setAttribute("aria-hidden", "true");
  satekOdkaz.append(satekPocet);

  /* Co řekne, slyší i čtečka */
  const hlas = document.createElement("p");
  hlas.className = "pruvodce-hlas";
  hlas.setAttribute("aria-live", "polite");

  document.body.append(O, tlacitko, zmensit, carka, satekOdkaz, nabidka, kulicky, hlas);
  spustVse();

  /* Po každé radě se zatočí a vymění si květy za další měsíc — umí to sama na klepnutí (beh.js, kami-kvety.js), tak se jí klepnutí jen pošle.
     S velkým uzlíkem v ruce se netočí — je na to moc těžký */
  const scena = () => (VG as HTMLElement & { __scena?: Scena }).__scena;
  const vymenKvety = () => {
    if (tezky()) return;
    scena()?.stav().vstup.kliky.push({ x: 90, y: 90 });
  };

  let bublina: (() => boolean) | null = null;
  /** S jakým výrazem to říká — kresba ho drží, dokud visí bublina */
  let vyrazBubliny: Vyraz | undefined;
  /* Píše štětcem a mluví šamisenem (pruvodce-hlas.ts), s omezeným pohybem jen ukáže hotovou větu; gesto k ní hned */
  const rekniTu = ({ text, vyraz, gesto }: Replika) => {
    bublina = rekni(VG, "vazicka", text, { pevne: true, cerna: true, pise: klidne ? undefined : samisen(text, vyraz) });
    if (!klidne) dozvuk(vyraz, dobaPsani(text) / 1000 + 0.15);
    vyrazBubliny = vyraz;
    ukazGesto(gesto);
    hlas.textContent = `Vázička: ${text}`;
  };

  /* ═══ Sama od sebe: stopa v domě, nalezený kami, mistrovský list, noc ═══ */
  const cekaji: { r: Replika; hned: boolean; platiOd: number; platiDo: number }[] = [];
  /** Co už na téhle stránce sama od sebe řekla — dvakrát totéž neřekne */
  const rekla = new Set<string>();
  /** `hned` = reakce na to, co host právě udělal (předběhne čekající stopy); `za` ms ji ještě podrží (třeba po úleku) */
  const rekniSama = (r: Replika, hned = false, za = 0) => {
    if (rekla.has(r.text) || cekaji.some((c) => c.r.text === r.text)) return;
    const ted = performance.now();
    cekaji.push({ r, hned, platiOd: ted + za, platiDo: hned ? ted + za + SAMA.cerstve : Infinity });
  };
  /** Host zrovna píše — do formuláře nemluví */
  const pise = () => {
    const a = document.activeElement;
    return !!a && a !== document.body && (a.matches("input, textarea, select") || (a as HTMLElement).isContentEditable);
  };

  /* ═══ Rozměry, kotva a klidové místo ═══ */
  let B = 80, W = 0, H = 0;
  const zmer = () => {
    W = document.documentElement.clientWidth;
    H = window.innerHeight;
    B = Math.round(omez(Math.min(W * 0.078, H * 0.13), 84, 124));
    O.style.width = O.style.height = `${B}px`;
    tlacitko.style.setProperty("--b", `${B}px`);
    nabidka.style.setProperty("--b", `${B}px`);
    kulicky.style.setProperty("--b", `${B}px`);
    zmensit.style.setProperty("--b", `${B}px`);
  };
  zmer();
  /** Jak daleko od středu rámečku sahá doprava (v px i s odstupem): postava, s uzlíkem v ruce uzlík i s pečetí */
  const pravyKraj = () =>
    Math.max(POSTAVA.r * B + 4, tezky() ? VELKY.pravy * B + 2 : nese() ? (UZLIK_DOMA.x + UZLIK_DOMA.r * PECET.dx + UZLIK_DOMA.rezerva) * B + PECET.pul + 2 : 0);
  /** Jak daleko od středu rámečku sahá dolů (v px): spodek postavy, s velkým uzlíkem jeho dno i při propadu */
  const spodniKraj = () => (tezky() ? VELKY.dolni * B + 2 : POSTAVA.b * B);
  /** Kde v rohu sedí — střed rámečku tak, aby spodek postavy (nebo velkého uzlíku pod ní) byl kousek nad okrajem okna a nic nepřečnívalo vpravo */
  const doma = (): Bod => ({ x: W - OKRAJ.r - pravyKraj(), y: H - OKRAJ.b - spodniKraj() });
  const DOMA_POZA: Drzeni = { naklon: -3, otoc: -22, pohled: [-0.9, 0.2] };

  /** Kotva, vůči které se drží poloha: prvek (jede s ním při scrollu), nebo okno */
  let kotva: Element | null = null;
  const puvod = (k: Element | null = kotva): Bod => {
    if (!k) return { x: 0, y: 0 };
    const r = k.getBoundingClientRect();
    return { x: r.left, y: r.top };
  };
  const poz = { ...doma(), m: 1 };
  let predX = poz.x, predY = poz.y;
  const naObrazovce = (): Bod => {
    const p = puvod();
    return { x: p.x + poz.x, y: p.y + poz.y };
  };
  const prekotvi = (nova: Element | null) => {
    const s = naObrazovce();
    kotva = nova;
    const p = puvod();
    poz.x = s.x - p.x;
    poz.y = s.y - p.y;
    predX = poz.x;
    predY = poz.y;
  };
  const hlavaDole = () => document.querySelector(".hlava")?.getBoundingClientRect().bottom ?? 0;

  /* ═══ Stav a akce ═══ */
  let drzi: Drzeni = DOMA_POZA;
  const vid = { otoc: -22, naklon: -3, vitr: 0, pohled: [-0.9, 0.2] as [number, number], vx: 0, vy: 0 };
  let cas = 0;
  let fronta: Akce[] = [];
  let akce: Akce | null = null;
  let akceCas = 0;
  /** Je pryč z rohu (letí, ukazuje, vrací se) */
  let venku = false;

  /**
   * Přelet obloukem na bod v souřadnicích kotvy (a s velikostí `m`); s omezeným pohybem se jen přenese.
   * S velkým uzlíkem letí ztěžka: pomaleji a místo oblouku nahoru se jí cesta pod vahou prohne dolů.
   */
  const let_ = (cil: () => Bod, m = 1): Akce => {
    let a: Bod = poz, b: Bod = poz, c: Bod = poz, m0 = 1;
    return {
      delka: 1,
      start() {
        a = { x: poz.x, y: poz.y };
        b = cil();
        m0 = poz.m;
        const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const tezce = tezky();
        this.delka = klidne ? 0.01 : omez(d / Math.max(300, W * 0.26), 0.7, 2.6) * (tezce ? 1.45 : 1);
        const o = (Math.random() < 0.5 ? -1 : 1) * nahodne(0.12, 0.28) * d;
        /* prohne se dolů, ale ne níž, než sedí doma — uzlík pod ní ať nevyjede pod spodek okna */
        c = tezce
          ? { x: (a.x + b.x) / 2 - ((b.y - a.y) / d) * o * 0.3, y: Math.min(Math.max(a.y, b.y) + 0.16 * d, H - OKRAJ.b - spodniKraj() - puvod().y) }
          : { x: (a.x + b.x) / 2 - ((b.y - a.y) / d) * o, y: Math.min((a.y + b.y) / 2 + ((b.x - a.x) / d) * o, Math.min(a.y, b.y) - 0.1 * d) };
        drzi = null;
      },
      krok(q) {
        const t = hladce(q);
        poz.x = (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * c.x + t * t * b.x;
        poz.y = (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * c.y + t * t * b.y;
        poz.m = m0 + (m - m0) * t;
      },
    };
  };
  const cekej = (delka: number, d?: Drzeni): Akce => ({ delka, start: () => { if (d !== undefined) drzi = d; }, krok: () => {} });
  const hned = (fn: () => void): Akce => ({ delka: 0.01, start: fn, krok: () => {} });
  const kotvi = (k: () => Element | null) => hned(() => prekotvi(k()));

  /** Zpátky do rohu a zčernat; po představení si teprve doma vezme uzlík (i když ji host zavolal zpátky dřív, než doříkala) */
  const domu = (): Akce[] => [
    kotvi(() => null),
    let_(doma),
    cekej(0.25, DOMA_POZA),
    hned(() => {
      O.classList.toggle("stin", STIN);
      venku = false;
      tlacitko.classList.remove("prazdno");
      zmensit.hidden = false;
      if (predstavuje) {
        predstavuje = false;
        ukazSatek();
      }
    }),
  ];

  /* ═══ Cíl rady: kam letí a jak se tváří ═══ */
  const najdi = (r: Rada): { el: HTMLElement; vHlavicce: boolean; menu: boolean } | null => {
    if (r.cil.startsWith("nav:")) {
      const odkaz = document.querySelector<HTMLElement>(`.hlava-nav a[href="${r.cil.slice(4)}"]`);
      if (viditelny(odkaz)) return { el: odkaz, vHlavicce: true, menu: false };
      const menu = document.querySelector<HTMLElement>(".hlava-menu-tlacitko");
      if (viditelny(menu)) return { el: menu, vHlavicce: true, menu: true };
      return null;
    }
    const el = document.querySelector<HTMLElement>(r.cil);
    return viditelny(el) ? { el, vHlavicce: false, menu: false } : null;
  };

  const ukaz = (r: Rada) => {
    const c = najdi(r);
    if (!c) return;
    const { el } = c;
    const veta = c.menu && r.vMenu ? r.vMenu : r.veta;
    /* Cíl mimo obraz: stránka k němu sjede; Vázička je ukotvená k němu, takže jede s ním */
    /* Hlavička i závěs pod ní stojí, i když se roluje — k nim se nesjíždí. S velkým uzlíkem pod sebou potřebuje pod cílem víc místa */
    if (!c.vHlavicce && !el.closest(".hlava, [data-zaves]")) {
      const rr = el.getBoundingClientRect();
      const pod = tezky() ? (VELKY.dolni - POSTAVA.b) * B : 0;
      if (rr.top < hlavaDole() + 20 || rr.bottom > H - 40 - pod) el.scrollIntoView({ block: "center", behavior: klidne ? "auto" : "smooth" });
    }
    venku = true;
    O.classList.remove("stin");
    tlacitko.classList.add("prazdno");
    zmensit.hidden = true;
    const k: Akce[] = [cekej(klidne ? 0.01 : 0.35, { naklon: 0, otoc: -10, pohled: [-0.6, -0.8] }), kotvi(() => el)];
    let poza: Drzeni;
    if (c.vHlavicce) {
      /* pod hlavičkou, pod odkazem nebo kousek vlevo pod tlačítkem menu, a kouká nahoru */
      k.push(
        let_(() => {
          const rr = el.getBoundingClientRect();
          return { x: c.menu ? -POSTAVA.r * B : rr.width / 2, y: hlavaDole() - rr.top + 10 - POSTAVA.t * B };
        }),
      );
      poza = c.menu ? { naklon: 5, otoc: 24, pohled: [1.4, -1.3] } : { naklon: 0, otoc: 0, pohled: [0, -1.3] };
    } else {
      /* vedle nadpisu nebo tlačítka: vlevo, když je tam místo, jinak vpravo; natočená k němu. S velkým uzlíkem jí vlevo poletuje vějíř, tak potřebuje víc místa */
      const rr = el.getBoundingClientRect();
      const prava = tezky() ? VELKY.pravy : POSTAVA.r, leva = tezky() ? VELKY.levy : -POSTAVA.l;
      const vlevo = rr.left > (prava + leva) * B + 24;
      k.push(
        let_(() => {
          const r2 = el.getBoundingClientRect();
          const y = Math.min(r2.height / 2, 34);
          return vlevo ? { x: -prava * B - 10, y } : { x: r2.width + leva * B + 10, y };
        }),
      );
      poza = vlevo ? { naklon: 7, otoc: 34, pohled: [1.9, 0.2] } : { naklon: -7, otoc: -34, pohled: [-1.9, 0.2] };
    }
    k.push(
      cekej(klidne ? 0.01 : 0.35, poza),
      hned(() => {
        if (r.efekt === "zaves") rozzarZaves();
        else rozzar(el);
        vymenKvety();
        rekniTu({ text: veta, vyraz: r.vyraz });
      }),
      cekej(delkaBubliny(veta)),
      ...domu(),
    );
    fronta = k;
    akce = null;
  };

  /* ═══ Nabídka ═══ */
  const volba = (text: string, naKlik: () => void) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "pruvodce-volba";
    b.textContent = text;
    b.addEventListener("click", naKlik);
    seznam.append(b);
    return b;
  };
  /** Co je v nabídce zrovna otevřené: rady stránky, nebo obsah jedné z bublin vedle ní */
  let obsah: "rady" | "povidani" | "coVim" = "rady";
  const otevreno = (o: typeof obsah) => {
    obsah = o;
    kulickaPovidani.setAttribute("aria-pressed", String(o === "povidani"));
    kulickaCoVim.setAttribute("aria-pressed", String(o === "coVim"));
  };
  /* Rady stránky (s větou podle toho, co host udělal); povídání a „co o tobě vím“ jsou bubliny vedle ní */
  const nabidni = () => {
    host = zjisti();
    otevreno("rady");
    /* s velkým uzlíkem uvádí pomalu — nese šátek */
    titul.textContent = tezky() ? tezkySatek.titul : vypln(uvitaniPro(host).titul, host);
    seznam.textContent = "";
    for (const puvodni of rady[stranka] ?? rady.vychozi) {
      const r = radaPro(puvodni, host, stranka);
      if (!r || !najdi(r)) continue;
      volba(r.otazka, () => {
        zavri(false);
        ukaz(r);
      });
    }
    if (!seznam.childElementCount) {
      const nic = document.createElement("p");
      nic.className = "pruvodce-nic";
      nic.textContent = hlasky.nic;
      seznam.append(nic);
    }
  };
  /** Bublina otevře v nabídce svůj obsah; když už je otevřený, vrátí se k radám */
  const kulickou = (o: "povidani" | "coVim", ukazat: () => void) => () => {
    if (obsah !== o) return ukazat();
    nabidni();
    seznam.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
  };
  kulickaPovidani.addEventListener("click", kulickou("povidani", () => ukazPovidani()));
  kulickaCoVim.addEventListener("click", kulickou("coVim", () => ukazCoVim()));
  /** „Popovídáme si?“ — místo rad tři témata a cesta zpátky */
  const ukazPovidani = () => {
    otevreno("povidani");
    titul.textContent = povidani.titul;
    seznam.textContent = "";
    volba(veVlasech.otazka, rekniVlasy);
    volba(povidani.ostatni, rekniOstatni);
    volba(ozashiki.otazka, hraj);
    const zpet = volba(coVim.zpet, () => {
      nabidni();
      seznam.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
    });
    zpet.classList.add("pruvodce-zpet");
    seznam.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
  };
  /** Co nosí ve vlasech: zůstane doma, zatočí se (květy měsíce se jen obnoví) a řekne, proč zrovna tyhle — a sáhne si na ně */
  const rekniVlasy = () => {
    zavri(false);
    const r = veVlasech.mesice[mesic];
    fronta = [hned(vymenKvety), cekej(klidne ? 0.01 : 1.3), hned(() => rekniTu({ gesto: "vlasy", ...r })), cekej(delkaBubliny(r.text))];
    akce = null;
  };
  /* ═══ Ozashiki: hra Tora-tora (ozashiki.ts) — doletí k panelu, hraje a po hře se vrátí do rohu ═══ */
  let hra: { zavri: () => void } | null = null;
  /** Doletí vedle panelu hry (vpravo; když tam není místo, nad jeho pravý roh), zůstane tam a řekne pravidla */
  const kHre = (panel: HTMLElement, uvod: Replika) => {
    venku = true;
    O.classList.remove("stin");
    O.classList.add("hraje");
    tlacitko.classList.add("prazdno");
    zmensit.hidden = true;
    const M = 1.25;
    const misto = (): Bod => {
      const r = panel.getBoundingClientRect();
      return r.right + B * M * 0.6 < W ? { x: r.width + B * M * 0.32, y: r.height * 0.42 } : { x: r.width - B * M * 0.3, y: -B * M * 0.22 };
    };
    fronta = [
      cekej(klidne ? 0.01 : 0.2, { naklon: 0, otoc: -14, pohled: [-1, 0.3] }),
      kotvi(() => panel),
      let_(misto, M),
      cekej(klidne ? 0.01 : 0.25, { naklon: -2, otoc: -26, pohled: [-1.6, 0.4] }),
      hned(() => rekniTu(uvod)),
    ];
    akce = null;
  };
  const hraj = () => {
    zavri(false);
    hra = toraTora({
      rekni: rekniTu,
      gesto: ukazGesto,
      zlozvyk: (ano) => {
        ovivaStale = ano && !klidne;
      },
      prilet: kHre,
      odlet: () => {
        hra = null;
        O.classList.remove("hraje");
        fronta = domu();
        akce = null;
        tlacitko.focus({ preventScroll: true });
      },
      zahraj,
      klidne,
    });
  };
  /** Co si myslí o ostatních: o kami, které host už našel (kromě ní), pokaždé o dalším; když nikoho, ať je jde najít */
  let oKom = 0;
  const rekniOstatni = () => {
    zavri(false);
    const nalezeni = zjisti().nalezeni.filter((id) => id !== "vazicka");
    const r = nalezeni.length ? kNalezu[nalezeni[oKom++ % nalezeni.length]] : povidani.nikoho;
    fronta = [hned(() => rekniTu(r)), cekej(delkaBubliny(r.text))];
    akce = null;
  };
  /** Místo voleb vyjmenuje, co o hostovi ví (jen co web opravdu má), a dá cestu zpátky */
  const ukazCoVim = () => {
    host = zjisti();
    otevreno("coVim");
    const polozky = coVimPolozky(host);
    titul.textContent = coVimTitul(polozky);
    seznam.textContent = "";
    if (polozky.length) {
      const ul = document.createElement("ul");
      ul.className = "pruvodce-vim";
      for (const p of polozky) {
        const li = document.createElement("li");
        li.textContent = p;
        ul.append(li);
      }
      seznam.append(ul);
    }
    const konec = document.createElement("p");
    konec.className = "pruvodce-vim-konec";
    konec.textContent = polozky.length ? coVim.konec : coVim.nic;
    seznam.append(konec);
    const zpet = volba(coVim.zpet, () => {
      nabidni();
      seznam.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
    });
    zpet.classList.add("pruvodce-zpet");
    zpet.focus({ preventScroll: true });
  };
  const otevri = () => {
    nabidni();
    nabidka.hidden = false;
    kulicky.hidden = false;
    tlacitko.setAttribute("aria-expanded", "true");
    O.classList.add("posloucha");
    drzi = { naklon: -2, otoc: -12, pohled: [-0.6, -0.9] };
    nabidka.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
  };
  function zavri(vratitFokus = true) {
    if (nabidka.hidden) return;
    nabidka.hidden = true;
    kulicky.hidden = true;
    tlacitko.setAttribute("aria-expanded", "false");
    O.classList.remove("posloucha");
    if (!venku) drzi = DOMA_POZA;
    if (vratitFokus) tlacitko.focus({ preventScroll: true });
  }

  tlacitko.addEventListener("click", () => {
    /* Klepnutí na roh během hry hru zavře (a ona se vrátí) */
    if (hra) {
      hra.zavri();
      return;
    }
    /* Když je zrovna pryč, klepnutí ji zavolá zpátky */
    if (venku) {
      fronta = domu();
      akce = null;
      return;
    }
    /* uražená zády chvíli neposlouchá; kdo klepe dokola, tomu odpoví po svém */
    if (cas < otocenaDo || klepeDokola()) return;
    if (nabidka.hidden) otevri();
    else zavri();
  });

  /* ═══ Šátek z krámku: nese ho v uzlíku a odkaz s pečetí leží přesně na něm ═══ */
  /** Kde byl rámeček kresby v posledním snímku (vykresli ho zapíše) — odkaz se k němu umí přepočítat i mezi snímky */
  const ram = { x0: 0, y0: 0 };
  let satekVel = 0;
  /** Posune odkaz na uzlík: střed uzlíku z kresby (rámeček 180 × 180) přes náklon a zvětšení těla na obrazovku */
  const umistiSatek = (bod: [number, number, number] = druh === "velky" ? VELKY_NAHRADNI : UZLIK_NAHRADNI) => {
    const k = B / 180, m = poz.m;
    const a = (vid.naklon * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    const px = bod[0] * k - 0.5 * B, py = bod[1] * k - 0.6 * B;
    const x = ram.x0 + 0.5 * B + (px * c - py * s) * m;
    const y = ram.y0 + 0.6 * B + (px * s + py * c) * m;
    const r = bod[2] * k * m;
    /* klepnout jde na celý uzlík i kousek kolem, nejmíň 44 × 44 px (velký uzlík je velký sám, okraj má jen malý) */
    const vel = Math.round(Math.max(44, 2 * r + (druh === "velky" ? 2 * VELKY.okraj : 14)));
    if (vel !== satekVel) {
      satekVel = vel;
      satekOdkaz.style.width = satekOdkaz.style.height = `${vel}px`;
    }
    /* střed krabičky je střed uzlíku (tam satek.ts posílá kus); pečeť sedí na pravém boku malého, na pravém dolním boku velkého uzlíku */
    const pecet = druh === "velky" ? PECET_VELKEHO : PECET;
    satekOdkaz.style.transform = `translate3d(${(x - vel / 2).toFixed(1)}px, ${(y - vel / 2).toFixed(1)}px, 0)`;
    satekPocet.style.setProperty("--x", `${(vel / 2 + r * pecet.dx).toFixed(1)}px`);
    satekPocet.style.setProperty("--y", `${(vel / 2 + r * pecet.dy).toFixed(1)}px`);
  };
  /**
   * Kresba (beh.js) počítá svůj snímek až po našem, takže uzlík, který si
   * ve vykresli přečteme, je o snímek starý — v letu by za ním odkaz o pár
   * px zaostával. Kresba proto, jakmile uzlík spočítá, zavolá `uzlikJe`
   * a odkaz se posune ještě jednou, v tomtéž snímku.
   */
  const uzlikJe = (bod: [number, number, number]) => {
    if (!satekOdkaz.hidden) umistiSatek(bod);
  };
  /** Co z toho potřebuje kresba (kami-kvety.js) */
  const vstupSatku = () => (nese() ? { vzor: satek.vzor, pocet: satek.pocet, cuk: satek.cuk, lek: satek.lek, druh } : null);
  /** Jaký uzlík je zrovna nakreslený (vzor a plnost) — s omezeným pohybem se kresba překresluje jen při změně */
  let kreslenyUzlik = "";
  /** Nápověda u ní (při najetí): s velkým uzlíkem, že má ruce plné; jinak podle toho, kdo přišel */
  const obnovNapovedu = () => {
    napoveda.textContent = tezky() ? tezkySatek.napoveda : vypln(uvitaniPro(host).napoveda, host);
  };
  /** Ukáže nebo schová odkaz a obnoví počet — hned při každé zprávě od šátku, ať satek.ts najde odkaz už na místě */
  const ukazSatek = () => {
    const ano = nese();
    satekPocet.textContent = String(satek.pocet);
    satekOdkaz.setAttribute("aria-label", `Šátek: ${pocetKusu(satek.pocet)}`);
    obnovNapovedu();
    const sc = scena();
    if (ano && satekOdkaz.hidden) umistiSatek(sc?.stav().dyn.satekBod ?? undefined);
    satekOdkaz.hidden = !ano;
    const klic = ano ? `${druh},${satek.vzor},${Math.min(satek.pocet, druh === "velky" ? 7 : 5)}` : "";
    if (klic === kreslenyUzlik || !sc) return;
    kreslenyUzlik = klic;
    sc.stav().vstup.satek = vstupSatku();
    /* s omezeným pohybem stojí kresba na jednom snímku (beh.js) — překreslí se, ať uzlík v ruce opravdu má (nebo už nemá) */
    if (klidne) sc.znovu?.(0.6);
  };
  /** Kolik kusů jí na téhle stránce doletělo do velkého uzlíku (k dalším si postěžuje po řadě) a od kdy ho drží bez nového kusu */
  let kusuDoVelkeho = 0, drziOd = -1, drziReceno = false;
  /**
   * Do uzlíku doletěl kus: chytí ho — poskočí, uzlík se zhoupne, pečeť
   * cinkne — a poprvé za stránku řekne, že šátek podrží. S velkým místo
   * poskoku propadne (kresba), věta přijde až po úleku a k dalším kusům si
   * po řadě elegantně postěžuje (každou větu jednou za stránku).
   */
  const chyt = () => {
    satek.cuk++;
    const velky = tezky();
    if (!klidne && !velky) skok = 1;
    satekOdkaz.classList.remove("cinkne");
    void satekOdkaz.offsetWidth;
    satekOdkaz.classList.add("cinkne");
    if (!velky) return rekniSama(doSatku, true);
    drziOd = cas;
    const k = kusuDoVelkeho++;
    rekniSama(k === 0 ? doSatku : tezkySatek.kus[(k - 1) % tezkySatek.kus.length], true, 800);
  };
  /** První kus, o kterém přišla zpráva dřív než nový počet (s omezeným pohybem kus neletí) — chytí ho, až počet dorazí */
  let chytPozdeji = false;
  const naPridano = (e: Event) => {
    if ((e as CustomEvent<{ videt?: unknown }>).detail?.videt) return;
    if (nese()) chyt();
    else if (satek.pocet === 0 && !satek.videt && !vCarce) chytPozdeji = true;
  };
  const naZmenuSatku = (e: Event) => {
    const d = (e as CustomEvent<{ pocet?: unknown; vzor?: unknown }>).detail;
    if (typeof d?.pocet === "number" && Number.isFinite(d.pocet)) satek.pocet = Math.max(0, Math.floor(d.pocet));
    const v = vzorPodleId(d?.vzor);
    if (v) satek.vzor = v.id;
    ukazSatek();
    if (chytPozdeji) {
      chytPozdeji = false;
      if (nese()) chyt();
    }
  };
  const naVidetSatek = (e: Event) => {
    satek.videt = !!(e as CustomEvent<{ videt?: unknown }>).detail?.videt;
    ukazSatek();
  };
  /* Šátek změněný v jiné záložce: na stránce bez šátku si počet a vzor přečte znovu (se šátkem platí, co hlásí satek.ts) */
  const naUlozeni = (e: StorageEvent) => {
    if (sekceSatku || (e.key !== null && e.key !== SATEK.klic && e.key !== SATEK.vzor)) return;
    satek.pocet = nactiPocet();
    satek.vzor = nactiVzor();
    ukazSatek();
  };
  document.addEventListener("satek:zmena", naZmenuSatku);
  document.addEventListener("satek:videt", naVidetSatek);
  document.addEventListener("satek:pridano", naPridano);
  window.addEventListener("storage", naUlozeni);
  /* Na stránce se šátkem k němu sjede plynule (s omezeným pohybem skokem) a z klávesnice tam pošle i fokus,
     ať se neztratí, až se odkaz u šátku schová; jinde vede odkaz na /obchod#satek sám */
  satekOdkaz.addEventListener("click", (e) => {
    const cil = document.getElementById("satek");
    /* s Ctrl, Shiftem a spol. ať si ho host otevře, kam chce */
    if (!cil || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    cil.scrollIntoView({ block: "start", behavior: klidne ? "auto" : "smooth" });
    if (e.detail === 0) {
      const nadpis = cil.querySelector<HTMLElement>("h2") ?? cil;
      if (!nadpis.hasAttribute("tabindex")) nadpis.setAttribute("tabindex", "-1");
      nadpis.focus({ preventScroll: true });
    }
  });
  /* po cinknutí třídu zase sundá, ať se při dalším ukázání pečeť vynoří, ne cinkne */
  satekOdkaz.addEventListener("animationend", () => satekOdkaz.classList.remove("cinkne"));
  /**
   * O kolik px sedí doma víc vlevo (a s velkým uzlíkem výš) než bez uzlíku —
   * tlačítko, čárka nad ní, nabídka a bubliny jdou s ní (`--posun`
   * a `--posun-y` v parta2.css)
   */
  let posun = 0, posunY = 0;
  const posunRoh = () => {
    const zaklad = W - OKRAJ.r - POSTAVA.r * B - 4, zakladY = H - OKRAJ.b - POSTAVA.b * B;
    const doma_ = !venku && !kotva;
    const p = doma_ ? omez(zaklad - poz.x, 0, 2 * B) : pravyKraj() - POSTAVA.r * B - 4;
    const py = doma_ ? omez(zakladY - poz.y, 0, 2 * B) : spodniKraj() - POSTAVA.b * B;
    if (Math.abs(p - posun) >= 0.3) {
      posun = p;
      for (const el of [tlacitko, zmensit, nabidka, kulicky]) el.style.setProperty("--posun", `${p.toFixed(1)}px`);
    }
    if (Math.abs(py - posunY) >= 0.3) {
      posunY = py;
      for (const el of [tlacitko, zmensit, nabidka, kulicky]) el.style.setProperty("--posun-y", `${py.toFixed(1)}px`);
    }
  };
  /** Schovaná do čárky / zase zpátky: šátek (satek.ts) podle toho ukáže nebo schová svoje plovoucí tlačítko */
  const ohlasSchovani = (ano: boolean) => document.dispatchEvent(new CustomEvent("pruvodce:schovana", { detail: { schovana: ano } }));

  /* ═══ Čárka ═══ */
  let schovana = false;
  let enso = 0;
  const protoc = () => {
    if (!schovana || document.hidden) return;
    carka.classList.remove("toci");
    void carka.offsetWidth;
    carka.classList.add("toci");
  };
  const schovej = (hned = false) => {
    zavri(false);
    schovana = true;
    ulozSchovanou(true);
    zmensit.hidden = true;
    const dorekni = () => {
      O.classList.add("schovana");
      tlacitko.hidden = true;
      carka.hidden = false;
      /* uzlík nesla, dokud doříkávala; teď ho šátek ukáže sám */
      vCarce = true;
      ukazSatek();
      ohlasSchovani(true);
      window.clearInterval(enso);
      enso = window.setInterval(protoc, ENSO_KAZDYCH);
      /* poprvé hned, ať je vidět, kam se schovala */
      if (!hned) window.setTimeout(protoc, 600);
    };
    if (hned || klidne) return dorekni();
    rekniTu(hlasky.schovat);
    window.setTimeout(dorekni, 1600);
  };
  const ukazSe = () => {
    schovana = false;
    ulozSchovanou(false);
    window.clearInterval(enso);
    carka.hidden = true;
    carka.classList.remove("toci");
    O.classList.remove("schovana");
    tlacitko.hidden = false;
    zmensit.hidden = false;
    vCarce = false;
    ukazSatek();
    ohlasSchovani(false);
    rekniTu(hlasky.zpatky);
    tlacitko.focus({ preventScroll: true });
  };
  zmensit.addEventListener("click", () => schovej());
  carka.addEventListener("click", ukazSe);

  const naKlavesu = (e: KeyboardEvent) => {
    aktivita();
    if (e.key === "Escape" && !nabidka.hidden) zavri();
  };
  const naKlik = (e: PointerEvent) => {
    aktivita();
    if (nabidka.hidden) return;
    const t = e.target as Node;
    if (!nabidka.contains(t) && !tlacitko.contains(t) && !kulicky.contains(t)) zavri(false);
  };
  document.addEventListener("keydown", naKlavesu);
  document.addEventListener("pointerdown", naKlik);

  /* ═══ Myš: kde je kurzor (myš a pero; dotyk nemá jak přijít blíž) ═══ */
  let kurzor: Bod | null = null;
  /** Všimla si kurzoru, protože je blízko — stín trochu prosvětlí (třída `vnima`) */
  let vnima = false;
  const naPohyb = (e: PointerEvent) => {
    aktivita();
    if (e.pointerType === "touch") return;
    kurzor = { x: e.clientX, y: e.clientY };
  };
  /* kurzor odešel z okna */
  const naOdchod = (e: PointerEvent) => {
    if (!e.relatedTarget) kurzor = null;
  };
  document.addEventListener("pointermove", naPohyb, { passive: true });
  document.addEventListener("pointerout", naOdchod);
  /** Doma s kurzorem blízko se k němu natočí: zleva skoro z profilu, shora čelem */
  const kKurzoru = (k: Bod, s: Bod): Drzeni => {
    const q = omez((k.x - s.x) / (2.5 * B), -1, 0.6);
    return { naklon: -1 + 3 * q, otoc: -8 + 22 * q, pohled: [-0.9, 0.2] };
  };

  /* ═══ Co se děje teď: spěch, klepání dokola, ticho (nic se neukládá, počítadla platí jen na téhle stránce) ═══ */
  /** Květy skutečného měsíce (leden = 0) */
  const mesic = new Date().getMonth();
  /** Výraz na chvíli bez bubliny: přísný pohled, úžas */
  let vyrazChvili: { vyraz: Vyraz; do: number } | null = null;
  /** Do kdy (`cas`) si drží vlasy, ovívá se, je otočená zády, klaní se a ukazuje vějířem */
  let vlasyDo = 0, ovivaDo = 0, otocenaDo = 0, uklonDo = 0, vejirDo = 0;
  /** Ovívá se, dokud se to nevypne — zlozvyk při Tora-tora, když si vybrala tygra (ozashiki.ts) */
  let ovivaStale = false;
  /** Gesto k replice (data/pruvodce.ts): na jak dlouho který pohyb — zády tolik, co při klepání dokola */
  function ukazGesto(g?: Gesto) {
    if (!g || klidne) return;
    if (g === "uklon") uklonDo = cas + 1.4;
    if (g === "vejir") vejirDo = cas + 2;
    if (g === "vlasy") vlasyDo = cas + 1.8;
    if (g === "ovivani") ovivaDo = cas + 3;
    if (g === "zady") otocenaDo = cas + KLEPANI.zady;
  }
  /** Vítr ze scrollu (0…1) a odkud fouká; leknutí — kolik ještě poskočí */
  let poryv = 0, poryvSmer = 1, skok = 0;
  let posledniAktivita = performance.now(), dalsiZabava = 0, zabav = 0;
  let spi = false, uzRekla = false;
  const pohled = (vyraz: Vyraz) => {
    vyrazChvili = { vyraz, do: cas + 1.6 };
  };
  /** Cokoli host udělá, je pohyb: vzbudí ji, a když spala, lekne se — poskočí, s velkým uzlíkem se propadne (kresba) — a poprvé to i řekne */
  const aktivita = () => {
    posledniAktivita = performance.now();
    if (!spi) return;
    spi = false;
    vyrazChvili = { vyraz: "uzas", do: cas + 1.1 };
    if (tezky()) satek.lek++;
    else skok = 1;
    if (!uzRekla) {
      uzRekla = true;
      /* nejdřív úlek, až pak věta */
      rekniSama(probuzeni, true, 1200);
    }
  };
  /* Rychlý scroll je vítr: poprvé jen pohled, napodruhé a napotřetí to řekne */
  let scrollY0 = window.scrollY, scrollT0 = performance.now(), rychlost = 0, spechu = 0, spechOd = 0, vSpechu = false;
  const naScroll = () => {
    aktivita();
    const ted = performance.now(), y = window.scrollY;
    const v = ((y - scrollY0) / Math.max(16, ted - scrollT0)) * 1000;
    rychlost = rychlost * 0.6 + Math.abs(v) * 0.4;
    if (Math.abs(v) > 1) poryvSmer = v > 0 ? 1 : -1;
    scrollY0 = y;
    scrollT0 = ted;
    if (rychlost < SPECH.rychlost || venku || schovana) return;
    spechOd = ted;
    if (!klidne) {
      poryv = Math.max(poryv, Math.min(1, rychlost / (SPECH.rychlost * 2)));
      vlasyDo = cas + 1.2;
    }
    if (vSpechu) return;
    vSpechu = true;
    spechu++;
    pohled("prisna");
    if (spechu === 2) rekniSama(pomalu[0], true);
    if (spechu === 3) rekniSama(pomalu[1], true);
  };
  /* Klepání dokola na ni: poprvé pohled, napodruhé věta, napotřetí „Hm.“ a zády; nabídku přitom zavře */
  const klepnuti: number[] = [];
  let epizodKlepani = 0;
  function klepeDokola() {
    const ted = performance.now();
    klepnuti.push(ted);
    while (klepnuti.length && ted - klepnuti[0] > KLEPANI.okno) klepnuti.shift();
    if (klepnuti.length < KLEPANI.klepnuti) return false;
    klepnuti.length = 0;
    epizodKlepani++;
    zavri(false);
    pohled("prisna");
    if (epizodKlepani === 2) rekniTu(klepani[0]);
    /* „Hm.“ má gesto zády (data/pruvodce.ts) — na tu chvíli pak klepání neposlouchá */
    if (epizodKlepani === 3) rekniTu(klepani[1]);
    return true;
  }
  /** Ticho: když se nic neděje, upraví si květy nebo se ovívá, po minutě zadřímne; když má co dělat, ticho se nepočítá */
  const ticho = (ted: number) => {
    if (klidne || venku || schovana || !nabidka.hidden || akce || fronta.length || bublina || cas < otocenaDo) {
      posledniAktivita = Math.max(posledniAktivita, ted - TICHO.zabava + 4000);
      return;
    }
    const klid = ted - posledniAktivita;
    if (!spi && klid > TICHO.spanek) {
      spi = true;
      return;
    }
    if (spi || klid < TICHO.zabava || ted < dalsiZabava) return;
    dalsiZabava = ted + TICHO.rozestup;
    if (zabav++ % 2 === 0) vlasyDo = cas + 1.8;
    else ovivaDo = cas + 3;
  };
  window.addEventListener("scroll", naScroll, { passive: true });
  for (const g of ["wheel", "touchstart"]) document.addEventListener(g, aktivita, { passive: true });

  /* ═══ Vykreslení ═══ */
  /** Jak hluboko se s velkým uzlíkem vlní rámeček (px): jen v letu — po vzletu i po přistání se to rozběhne a doběhne plynule, ať necukne */
  let vlnaVelkeho = 0;
  const vykresli = (dt: number) => {
    /* kurzoru si všimne jen doma — ne v letu a ne schovaná do čárky */
    const s0 = naObrazovce();
    const vRohu = !venku && !schovana;
    const daleko = kurzor && vRohu ? Math.hypot(kurzor.x - s0.x, kurzor.y - s0.y) / B : Infinity;
    const vidi = daleko < (vnima ? VNIMA.pusti : VNIMA.od);
    if (vidi !== vnima) {
      vnima = vidi;
      O.classList.toggle("vnima", vidi);
    }
    if (dt > 0) {
      /* rychlost z polohy vůči kotvě — scroll ji nenatáčí */
      vid.vx = kCili(vid.vx, (poz.x - predX) / dt, dt, 0.15);
      vid.vy = kCili(vid.vy, (poz.y - predY) / dt, dt, 0.15);
      const k = omez(vid.vx / 260, -1, 1);
      const kKurzoruTed = vnima && kurzor && nabidka.hidden && !akce && !fronta.length ? kKurzoru(kurzor, s0) : null;
      const cil = (cas < otocenaDo ? ZADY : null) ?? kKurzoruTed ?? drzi ?? { naklon: k * 9, otoc: k * 42, pohled: [k * 1.9, omez(vid.vy / 300, -1, 1) * 1.1] };
      poryv = kCili(poryv, 0, dt, 0.5);
      skok = kCili(skok, 0, dt, 0.12);
      if (performance.now() - spechOd > SPECH.klid) vSpechu = false;
      rychlost = kCili(rychlost, 0, dt, 0.25);
      vid.naklon = kCili(vid.naklon, cil.naklon, dt, 0.25);
      vid.otoc = kCili(vid.otoc, cil.otoc, dt, 0.3);
      vid.pohled = [kCili(vid.pohled[0], cil.pohled[0], dt, 0.2), kCili(vid.pohled[1], cil.pohled[1], dt, 0.2)];
      vid.vitr = kCili(vid.vitr, -omez(vid.vx / 200, -2.5, 2.5), dt, 0.2);
    }
    predX = poz.x;
    predY = poz.y;
    const s = naObrazovce();
    /* v letu se vlní; s velkým uzlíkem pomaleji a hlouběji, ztěžka — doma se s ním vznáší kresba sama (kami-kvety.js) */
    if (dt > 0) vlnaVelkeho = kCili(vlnaVelkeho, venku && tezky() ? 6.5 : 0, dt, 0.4);
    const vlna = klidne ? 0 : tezky() ? Math.sin(cas * 1.5) * vlnaVelkeho : Math.sin(cas * 2.3) * (venku ? 4 : 1.6);
    const x0 = s.x - B / 2, y0 = s.y - B / 2 + vlna - skok * 7;
    O.style.transform = `translate3d(${x0.toFixed(1)}px, ${y0.toFixed(1)}px, 0)`;
    T.style.transform = `rotate(${vid.naklon.toFixed(2)}deg) scale(${poz.m.toFixed(3)})`;
    ram.x0 = x0;
    ram.y0 = y0;
    posunRoh();
    if (bublina && !bublina()) bublina = null;

    /* Noc v hlavičce přepíná host tlačítkem: s ní nese lucernu, a když ji zapne, řekne si o ni (s velkým uzlíkem, že ji neunese) */
    const noc = !!hlava?.classList.contains("je-noc");
    if (noc !== host.noc) {
      host = { ...host, noc };
      obnovNapovedu();
      if (noc && performance.now() - nacteno > 1000) rekniSama(tezky() ? tezkySatek.noc : naNoc, true);
    }
    /* velký uzlík: když ho dlouho drží a nic nového nepřibude, jednou za stránku si elegantně postěžuje (až nikomu nepřekáží) */
    if (tezky()) {
      if (drziOd < 0) drziOd = cas;
      else if (!drziReceno && cas - drziOd > DRZI_DLOUHO) {
        drziReceno = true;
        rekniSama(tezkySatek.drzi);
      }
    } else drziOd = -1;

    const sc = scena();
    if (sc) {
      const { dyn, vstup } = sc.stav();
      dyn.otoc = vid.otoc;
      vstup.vitr = vid.vitr + poryv * 2.4 * poryvSmer;
      vstup.pohled = vid.pohled;
      vstup.lucerna = noc;
      vstup.mesic = mesic;
      vstup.bezOtocek = true;
      vstup.vlasy = cas < vlasyDo;
      vstup.ovivani = cas < ovivaDo || ovivaStale;
      vstup.spi = spi;
      vstup.uklon = cas < uklonDo;
      vstup.vejir = cas < vejirDo;
      /* kurzor v jednotkách kresby (180 × 180, tělo se zvětšuje kolem 50 % / 60 %); s otevřenou nabídkou kouká za ním, i když je dál */
      vstup.mys =
        kurzor && vRohu && (vnima || !nabidka.hidden)
          ? { x: 90 + stlac(((kurzor.x - x0 - 0.5 * B) / (B * poz.m)) * 180), y: 90 + stlac(((kurzor.y - y0 - 0.6 * B) / (B * poz.m)) * 180 + 18) }
          : null;
      vstup.vitrMysi = VITR_MYSI;
      vstup.vyraz = bublina ? vyrazBubliny : vyrazChvili && cas < vyrazChvili.do ? vyrazChvili.vyraz : undefined;
      /* uzlík šátku v pravé ruce; odkaz s pečetí jde za ním každý snímek, i když letí */
      vstup.satek = vstupSatku();
      vstup.uzlikJe = uzlikJe;
      if (!satekOdkaz.hidden) umistiSatek(dyn.satekBod ?? undefined);
    } else if (!satekOdkaz.hidden) umistiSatek();
  };
  /* Schovaná zůstane schovaná i na další stránce; jinak se na úvodu (jednou za návštěvu) představí — bez uzlíku, ten si vezme až doma */
  const schovanaOdMinule = nactiSchovanou();
  predstavuje = !schovanaOdMinule && smiSePredstavit();
  vykresli(0);
  O.classList.add("pripravena");
  ukazSatek();
  if (schovanaOdMinule) schovej(true);
  else if (predstavuje) predstavSe();

  /* ═══ Co host v domě udělal: stopa na stránce a reakce na to, co udělal právě teď ═══ */
  const plati = { futatsu: host.futatsuVSatku, slepeno: host.slepeno > 0, uzliky: host.uzliky > 0, listek: host.listek, darek: host.darek };
  const stopa = stopy.find((s) => s.kde.includes(stranka) && plati[s.co]);
  if (stopa) rekniSama(stopa.replika);
  const naNalez = (e: Event) => {
    const r = kNalezu[(e as CustomEvent<PostavaId>).detail];
    if (r) rekniSama(r, true);
  };
  const naMistra = () => {
    host = zjisti();
    obnovNapovedu();
    if (host.mistr) rekniSama(vyplnRepliku(mistrovskyList[host.mistr.osloveni], host), true);
  };
  /* slepené číslo na ztracené stránce (nenalezeno/hlavni.ts) */
  const scenaNenalezeno = document.querySelector("[data-nenalezeno]");
  const naSlepeni = () => {
    const s = stopy.find((x) => x.co === "slepeno");
    if (s) rekniSama(s.replika, true);
  };
  document.addEventListener(NALEZEN, naNalez);
  document.addEventListener(MISTR_ZMENA, naMistra);
  scenaNenalezeno?.addEventListener("nn:slepeno", naSlepeni);
  /* Poznámka k tomu, co je zrovna na obrazovce: první z téhle stránky, který je aspoň z půlky vidět, a pak už žádná */
  const mojePoznamky = poznamky.filter((p) => p.kde === stranka);
  let pozorovatel: IntersectionObserver | null = null;
  if (mojePoznamky.length && "IntersectionObserver" in window) {
    pozorovatel = new IntersectionObserver(
      (zaznamy) => {
        const z = zaznamy.find((x) => x.isIntersecting && x.intersectionRatio >= 0.5);
        const p = z && mojePoznamky.find((x) => document.querySelector(x.cil) === z.target);
        if (!p) return;
        rekniSama(p.replika);
        pozorovatel?.disconnect();
        pozorovatel = null;
      },
      { threshold: 0.5 },
    );
    for (const p of mojePoznamky) {
      const el = document.querySelector(p.cil);
      if (el) pozorovatel.observe(el);
    }
  }
  /** Řekne, co čeká, až nikomu nepřekáží: doma, s nabídkou zavřenou, bez cizí bubliny a oslavy devíti kami (sber.ts) a když host nepíše */
  const zkusPromluvit = (ted: number) => {
    for (let i = cekaji.length - 1; i >= 0; i--) if (cekaji[i].platiDo < ted) cekaji.splice(i, 1);
    if (!cekaji.length || venku || schovana || !nabidka.hidden || akce || fronta.length || bublina || document.querySelector(".bublina, .oslava-zprava") || pise()) return;
    /* reakce předbíhají; stopa a poznámka počkají na odstup po načtení i po minulé větě */
    const muze = (c: (typeof cekaji)[number]) => ted >= c.platiOd && (c.hned || (ted - nacteno >= SAMA.poNacteni && ted - posledniSama >= SAMA.rozestup));
    const i = cekaji.findIndex((c) => c.hned && muze(c));
    const j = i >= 0 ? i : cekaji.findIndex(muze);
    if (j < 0) return;
    const [c] = cekaji.splice(j, 1);
    rekla.add(c.r.text);
    posledniSama = ted;
    rekniTu(c.r);
  };

  /* ═══ Představení na úvodu ═══ */
  /** Představí se jen na úvodu a jen jednou za návštěvu webu (ve vývoji pokaždé) — a rovnou si poznamená, že už ano */
  function smiSePredstavit() {
    if (!PREDSTAVENI.stranky.includes(stranka)) return false;
    if (!VYVOJ) {
      try {
        if (localStorage.getItem(PREDSTAVENI.klic) === "1") return false;
        localStorage.setItem(PREDSTAVENI.klic, "1");
      } catch {
        /* bez úložiště se představí při každé návštěvě úvodu — nevadí */
      }
    }
    return true;
  }
  /** Přiletí, představí se uprostřed a doma řekne druhou větu — uzlík při tom nenese (`predstavuje`), vezme si ho na konci v `domu` */
  function predstavSe() {
    const [prvni, druha] = hlasky.predstaveni;
    venku = true;
    O.classList.remove("stin");
    tlacitko.classList.add("prazdno");
    zmensit.hidden = true;
    /* přiletí shora zprava, zpoza okraje okna */
    poz.x = predX = W + B;
    poz.y = predY = H * 0.12;
    poz.m = 1.5;
    const CELEM: Drzeni = { naklon: 0, otoc: 0, pohled: [0, 0.25] };
    fronta = [
      cekej(klidne ? 0.01 : 1.2),
      let_(() => ({ x: W * 0.5, y: H * 0.46 }), 1.6),
      cekej(klidne ? 0.01 : 0.4, CELEM),
      hned(() => rekniTu(prvni)),
      cekej(delkaBubliny(prvni.text)),
      let_(doma, 1),
      cekej(0.3, DOMA_POZA),
      hned(() => rekniTu(druha)),
      cekej(delkaBubliny(druha.text)),
      ...domu().slice(-1),
    ];
    akce = null;
  }

  /* ═══ Smyčka — skončí, když stránka odejde (přechod bez načtení ji vymění) ═══ */
  let minule: number | null = null;
  const smycka = (ted: number) => {
    if (!O.isConnected) {
      window.clearInterval(enso);
      document.removeEventListener("keydown", naKlavesu);
      document.removeEventListener("pointerdown", naKlik);
      window.removeEventListener("resize", naZmenu);
      document.removeEventListener("pointermove", naPohyb);
      document.removeEventListener("pointerout", naOdchod);
      document.removeEventListener(NALEZEN, naNalez);
      document.removeEventListener(MISTR_ZMENA, naMistra);
      scenaNenalezeno?.removeEventListener("nn:slepeno", naSlepeni);
      window.removeEventListener("scroll", naScroll);
      for (const g of ["wheel", "touchstart"]) document.removeEventListener(g, aktivita);
      document.removeEventListener("satek:zmena", naZmenuSatku);
      document.removeEventListener("satek:videt", naVidetSatek);
      document.removeEventListener("satek:pridano", naPridano);
      window.removeEventListener("storage", naUlozeni);
      pozorovatel?.disconnect();
      return;
    }
    requestAnimationFrame(smycka);
    const dt = minule == null ? 0 : Math.min(0.05, (ted - minule) / 1000);
    minule = ted;
    cas += dt;
    if (!akce && fronta.length) {
      akce = fronta.shift() ?? null;
      akceCas = 0;
      akce?.start?.();
    }
    if (akce) {
      akceCas += dt;
      const q = Math.min(1, akceCas / akce.delka);
      akce.krok(q);
      if (q >= 1) akce = null;
    }
    /* doma: když vezme nebo pustí uzlík, sedí o kus jinde — plynule se tam posune */
    if (!venku && !kotva && !akce && !fronta.length) {
      const d = doma();
      poz.x = klidne || !dt ? d.x : kCili(poz.x, d.x, dt, 0.35);
      poz.y = klidne || !dt ? d.y : kCili(poz.y, d.y, dt, 0.35);
    }
    zkusPromluvit(ted);
    ticho(ted);
    vykresli(dt);
  };
  requestAnimationFrame(smycka);
  /* Po změně velikosti okna se doma přesune do nového rohu */
  const naZmenu = () => {
    zmer();
    if (!venku && !kotva) {
      const d = doma();
      poz.x = predX = d.x;
      poz.y = predY = d.y;
    }
  };
  window.addEventListener("resize", naZmenu);
}
