/**
 * Odjezdová tabule s hodinami vybraného dne (components/rezervace/
 * Odjezdy.astro). Řádky s časy jsou v HTML; tady se dopisuje, co záleží
 * na dni: jestli je odjezd volný, obsazený, už odjel, nebo jestli na něj
 * nastupuješ ty. Odjezd (hodina a půl) má pár míst a plní se po skupinách:
 * sedačky v řádku ukazují, kolik jich je pryč a kam si sedáte vy.
 *
 * Řádek může být i něco jiného než hodina:
 *
 *   spoj permanentky  první a poslední odjezd dne má místa pro držitele
 *                     permanentky; klik na něj přidá permanentku na ten
 *                     den v týdnu, který je zrovna na tabuli
 *   zastávka kurzu    v den kurzu jsou řádky tratí zvláštního vlaku (jede
 *                     ve stejné časy jako odjezdy) —
 *                     u tečky pořadí, na klapce jméno zastávky a vedle,
 *                     co se na ní děje;
 *                     nastupuje se cedulí nad nimi, ne řádkem
 *
 * Při změně dne tabule překlapne — klapky (parta2/klapka.ts) přeběhnou
 * přes pár mezikroků jako buben se slovy a zaklapou (zvuk). Když člověk
 * jen přidá nebo ubere hodinu, překlapne jen ten jeden řádek.
 */
import { Klapka, cesta, nahodne } from "../parta2/klapka";
import { klid } from "../parta2/stav";
import { naObrazovce } from "../parta2/mimo";
import * as zvuk from "../parta2/zvuk";
import { sekkiDne } from "../../data/koyomi";
import { rezervace as R, permanentka as P, hhmm, cenaZaCloveka } from "../../data/rezervace";
import { sklonuj, zPoctu, volnaMista, jenMist, zbyvaMist } from "../../data/pocty";
import { zvlastniVlak } from "../../components/rezervace/vlak";
import type { Misto } from "../../components/rezervace/vlak";
import { volnoVKurzu } from "./simulace";
import type { Den, Hodina, KurzDne } from "./simulace";

/** malo = něco volného je, ale celá vaše skupina se nevejde */
export type StavHodiny = "volno" | "malo" | "plno" | "pryc";

/** Co má člověk zrovna na jízdence — tabule podle toho svítí */
export interface Vyber {
  osob: number;
  /** Hodinové odjezdy */
  hodiny: ReadonlySet<number>;
  /** Spoje, na které si bere permanentku */
  pasy: ReadonlySet<number>;
  /** Nastupuje do zvláštního vlaku */
  kurz: boolean;
  /** Kolik permanentek je na který spoj už prodaných — pro den v týdnu, který je na tabuli */
  pasObsazeno: ReadonlyMap<number, number>;
}

const DNY = ["neděle", "pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota"];
const MESICE_2 = ["ledna", "února", "března", "dubna", "května", "června", "července", "srpna", "září", "října", "listopadu", "prosince"];
export const BARVY_LIDI = ["#9C7860", "#D79A94", "#93B39B", "#E8B440"];
/** Permanentka je na jeden den v týdnu: „každé úterý“, „každý pátek“ … */
export const KAZDY = ["každou neděli", "každé pondělí", "každé úterý", "každou středu", "každý čtvrtek", "každý pátek", "každou sobotu"];
/** … a „na úterky“, „na pátky“ */
export const NA_DNY = ["na neděle", "na pondělky", "na úterky", "na středy", "na čtvrtky", "na pátky", "na soboty"];
const dvoj = (n: number) => String(n).padStart(2, "0");
const kc = (n: number) => `${n.toLocaleString("cs-CZ")} Kč`;

export const stavHodiny = (h: Hodina, osob = 1): StavHodiny => (h.probehlo ? "pryc" : h.volno <= 0 ? "plno" : h.volno < osob ? "malo" : "volno");

/** Kolik míst zbývá na spoji permanentky */
export const volnoNaSpoji = (v: Pick<Vyber, "pasObsazeno">, h: number) => P.mist - (v.pasObsazeno.get(h) ?? 0);

/**
 * Kdo sedí ve zvláštním vlaku: ostatní přihlášení jako stíny, rozsazení po
 * voze (ne namačkaní vepředu), a tvoje skupina na volných místech co
 * nejblíž středu. Stejné rozsazení ukazují sedačky na tabuli i okna vlaku.
 */
export function mistaKurzu(k: KurzDne, osob: number, mam: boolean): Misto[] {
  const n = k.kurz.mist;
  const mista: Misto[] = Array(n).fill(null);
  /* Krok nesoudělný s počtem míst projde všechna a rozhází lidi po voze */
  const krok = [3, 5, 2, 7].find((s) => s < n && n % s !== 0 && (s % 2 === 1 || n % 2 === 1)) ?? 1;
  for (let i = 0; i < k.obsazeno; i++) mista[(i * krok + 1) % n] = { kdo: "stin" };
  if (mam) {
    const stred = (n - 1) / 2;
    const volna = mista.map((m, i) => (m ? -1 : i)).filter((i) => i >= 0).sort((a, b) => Math.abs(a - stred) - Math.abs(b - stred) || a - b);
    volna.slice(0, osob).sort((a, b) => a - b).forEach((i, kolikaty) => (mista[i] = { kdo: "ty", barva: BARVY_LIDI[kolikaty % BARVY_LIDI.length] }));
  }
  return mista;
}

/** Co stojí v poznámce na tabuli */
const poznamka = (s: StavHodiny, mam: boolean, volno: number) => (mam ? "nastupuješ" : s === "pryc" ? "odjel" : s === "plno" ? "obsazeno" : s === "malo" ? jenMist(volno) : "volno");

/** Buben poznámek: slova, která můžou proletět, než se klapka ustálí */
const BUBEN = ["volno", "obsazeno", "odjel", "nastupuješ", "včas", "Ořech", "permanentka"];

const radaHodiny = (denVTydnu?: number) =>
  `Klikni na volnou hodinu — klidně na víc. Každá trvá 90 minut a má ${sklonuj(R.mist, "místo", "místa", "míst")}. ` +
  "Vedle je jízdné za člověka, kdybyste nastoupili teď — čím víc lidí v dílně opravdu bude, tím míň platí každý; platí se na místě. " +
  `První a poslední spoj dne jsou na permanentku: ${denVTydnu === undefined ? "jeden den v týdnu" : KAZDY[denVTydnu]} po ${P.mesicu} měsíce, ${P.mist} místa na spoji. ` +
  "Obloha nad mořem ukáže, jaké v tu dobu bude v dílně světlo.";
const RADA_KURZ =
  "Dnes jede jen zvláštní vlak — celý den, od první zastávky po poslední. Nastupuje se po jednom, dokud jsou místa. " +
  "Najeď na zastávku a obloha nad mořem ukáže, jaké při ní bude v dílně světlo.";

interface Radek {
  h: number;
  li: HTMLLIElement;
  btn: HTMLButtonElement;
  popis: HTMLElement;
  stav: Klapka;
  sedacky: SVGSVGElement[];
  poradi: HTMLElement;
  co: HTMLElement;
  /** Kolik by teď stál odjezd za člověka, kdybyste nastoupili — jen u hodin */
  jizdne: HTMLElement | null;
}

export interface TabuleNastaveni {
  /** Klik na řádek: přidat nebo ubrat hodinu (nebo permanentku, je-li to její spoj) */
  prepni: (h: number) => void;
  /** Klik na ceduli zvláštního vlaku: nastoupit nebo vystoupit */
  kurz: () => void;
  /** Ukazuje se na hodinu (najetí, focus) — obloha se k ní stočí; null = pryč */
  ukaz: (h: number | null) => void;
}

export function initOdjezdy(n: TabuleNastaveni) {
  const koren = document.getElementById("rz-odjezdy");
  if (!koren) return null;
  const sekki = koren.querySelector<HTMLElement>(".rz-tabule-sekki")!;
  const rada = koren.querySelector<HTMLElement>(".rz-tabule-rada");
  const hlaseni = koren.querySelector<HTMLElement>(".rz-hlaseni");
  const seznam = koren.querySelector<HTMLElement>(".rz-tabule-radky");
  const denKlapky = [...koren.querySelectorAll<HTMLElement>(".rz-tabule-den [data-flap]")].map((el) => new Klapka(el));
  const naRadek = (li: HTMLLIElement): Radek => ({
    h: Number(li.dataset.h),
    li,
    btn: li.querySelector<HTMLButtonElement>(".rz-o-volba")!,
    popis: li.querySelector<HTMLElement>(".rz-o-popis")!,
    stav: new Klapka(li.querySelector<HTMLElement>(".rz-o-stav [data-flap]")!),
    sedacky: [...li.querySelectorAll<SVGSVGElement>(".rz-o-mista .rz-sedacka")],
    poradi: li.querySelector<HTMLElement>(".rz-o-poradi")!,
    co: li.querySelector<HTMLElement>(".rz-o-co")!,
    jizdne: li.querySelector<HTMLElement>(".rz-o-jizdne"),
  });
  const radky = [...koren.querySelectorAll<HTMLLIElement>(".rz-o")].map(naRadek);
  const casKlapky = radky.map((r) => [...r.li.querySelectorAll<HTMLElement>(".rz-o-cas [data-flap]")].map((el) => new Klapka(el)));
  /** Čtyři číslice času na klapkách: 10.5 → „1030“ */
  const cislice = (h: number) => `${dvoj(Math.floor(h))}${dvoj(Math.round((h % 1) * 60))}`;

  radky.forEach((r) => {
    r.btn.addEventListener("click", () => n.prepni(r.h));
    r.btn.addEventListener("focus", () => n.ukaz(r.h));
    r.btn.addEventListener("blur", () => n.ukaz(null));
    r.li.addEventListener("pointerenter", () => n.ukaz(r.h));
    r.li.addEventListener("pointerleave", () => n.ukaz(null));
  });

  /* ——— Cedule zvláštního vlaku ——— */
  const zvl = koren.querySelector<HTMLElement>(".rz-zvl");
  const zvlNazev = zvl?.querySelector<HTMLElement>(".rz-zvl-nazev");
  const zvlJmeno = zvl?.querySelector<HTMLElement>(".rz-zvl-jmeno");
  const zvlUdaje = zvl?.querySelector<HTMLElement>(".rz-zvl-udaje");
  const zvlPopis = zvl?.querySelector<HTMLElement>(".rz-zvl-popis");
  const zvlZnak = zvl?.querySelector<SVGTextElement>(".rz-zvl-znak-text");
  const zvlVlak = zvl?.querySelector<SVGGElement>(".rz-zvl-vlak");
  const zvlVolno = zvl?.querySelector<HTMLElement>(".rz-zvl-volno");
  const zvlVolba = zvl?.querySelector<HTMLButtonElement>(".rz-zvl-volba");
  const zvlVolbaText = zvl?.querySelector<HTMLElement>(".rz-zvl-volba-text");
  const zvlSedacky = [...(zvl?.querySelectorAll<SVGSVGElement>(".rz-zvl-mista .rz-sedacka") ?? [])];
  zvlVolba?.addEventListener("click", () => n.kurz());

  /* ——— Hodiny vpravo nahoře ——— */
  const hodiny = [...koren.querySelectorAll<HTMLElement>(".rz-tabule-hodiny [data-flap]")].map((el) => new Klapka(el));
  let nyni = "";
  const tik = (zaklapat: boolean) => {
    const d = new Date();
    const s = `${dvoj(d.getHours())}${dvoj(d.getMinutes())}`;
    if (s === nyni) return;
    nyni = s;
    hodiny.forEach((kl, i) => {
      if (kl.hodnota === s[i]) return;
      if (zaklapat) kl.nastav(s[i], cesta(kl.hodnota, s[i]));
      else kl.okamzite(s[i]);
    });
  };
  if (hodiny.length === 4) {
    koren.classList.add("js-hodiny");
    tik(false);
    /* Tiká, jen když je tabule na obrazovce. Po návratu ukáže čas hned,
       bez klapání — jako dřív, kdy se překlapl, zatímco nebyl vidět. */
    let interval = 0;
    naObrazovce(koren, (videt) => {
      window.clearInterval(interval);
      interval = 0;
      if (!videt) return;
      tik(false);
      interval = window.setInterval(() => tik(true), 10000);
    });
  }

  const klapni = (kl: Klapka, cilova: string, zaklapat: boolean, zpozdeni: number, buben = BUBEN) => {
    if (kl.hodnota === cilova) return;
    if (!zaklapat || klid) return kl.okamzite(cilova);
    const mezi = kl.cislice
      ? cesta(kl.hodnota, cilova)
      : Array.from({ length: 2 + Math.floor(Math.random() * 3) }, () => nahodne(buben.filter((x) => x !== cilova))).filter((x, i, p) => i === 0 || x !== p[i - 1]);
    window.setTimeout(() => kl.nastav(cilova, mezi), zpozdeni);
  };

  /** Sedačky dostanou třídy po řadě; které třídu nedostanou, schovají se */
  const posad = (sedacky: SVGSVGElement[], tridy: string[]) =>
    sedacky.forEach((el, i) => el.setAttribute("class", `rz-sedacka${i < tridy.length ? (tridy[i] ? ` ${tridy[i]}` : "") : " skryta"}`));

  /** Hodina: sedačky v kupé — kolik je pryč, kolik volných a kam si sedáte vy */
  const radekHodiny = (r: Radek, h: Hodina, v: Vyber, zaklapat: boolean, poradi: number) => {
    const mam = v.hodiny.has(r.h);
    const s = stavHodiny(h, v.osob);
    const obsazeno = R.mist - h.volno;
    posad(r.sedacky, Array.from({ length: R.mist }, (_, i) => (s === "pryc" ? "pryc" : i < obsazeno ? "obs" : mam && i < obsazeno + v.osob ? "moje" : "")));
    r.li.className = `rz-o ${s}${mam ? " vybrana" : ""}`;
    r.btn.disabled = s !== "volno" && !mam;
    r.btn.setAttribute("aria-pressed", String(mam));
    /* Jízdné se řídí tím, kolik lidí na odjezdu nakonec sedí: tolik by to stálo s vámi teď, víc lidí = míň */
    const zaCloveka = s === "volno" || mam ? cenaZaCloveka(obsazeno + v.osob) : null;
    if (r.jizdne) r.jizdne.innerHTML = zaCloveka === null ? "" : `${zaCloveka}&nbsp;Kč<small>za osobu</small>`;
    const popis = mam
      ? `nastupuješ, ${v.osob === 1 ? "jedeš sám" : `jedete ${v.osob}`}${obsazeno ? ` a ${obsazeno === 1 ? "jeden další už sedí" : `${obsazeno} další už sedí`}` : ""}`
      : s === "pryc" ? "už odjel" : s === "plno" ? "obsazeno" : s === "malo" ? `${zbyvaMist(h.volno)}, tolik vás nepojede` : volnaMista(h.volno) + " " + zPoctu(R.mist);
    r.popis.textContent = `${hhmm(h.h)} až ${hhmm(h.h + R.blok)}, ${popis}${zaCloveka === null ? "" : `, jízdné teď ${zaCloveka} Kč za člověka`}`;
    klapni(r.stav, poznamka(s, mam, h.volno), zaklapat, poradi * 70 + 40);
  };

  /** Spoj permanentky: pár míst na tři měsíce a na ten den v týdnu, který je na tabuli; plní se po jednom */
  const radekPermanentky = (r: Radek, d: Den, h: Hodina, v: Vyber, zaklapat: boolean, poradi: number) => {
    if (r.jizdne) r.jizdne.textContent = "";
    const naDny = NA_DNY[d.datum.getDay()];
    const mam = v.pasy.has(r.h);
    const obsazeno = v.pasObsazeno.get(r.h) ?? 0;
    const volna = P.mist - obsazeno;
    const s = h.probehlo ? "pryc" : volna <= 0 ? "plno" : volna < v.osob && !mam ? "malo" : "volno";
    posad(r.sedacky, Array.from({ length: P.mist }, (_, i) => (s === "pryc" ? "pryc" : i < obsazeno ? "obs" : mam && i < obsazeno + v.osob ? "moje" : "pas")));
    r.li.className = `rz-o pas ${s}${mam ? " vybrana" : ""}`;
    r.btn.disabled = s !== "volno" && !mam;
    r.btn.setAttribute("aria-pressed", String(mam));
    const spoj = P.spoje.find((x) => x.h === r.h);
    const kolik = jenMist(volna);
    const popis = mam
      ? `bereš si permanentku ${naDny} na ${P.mesicu} měsíce${v.osob > 1 ? ` pro ${v.osob} lidi` : ""}`
      : s === "pryc" ? "dnes už odjel" : s === "plno" ? "permanentky jsou rozebrané" : s === "malo" ? `${zbyvaMist(volna)}, tolik vás nepojede` : `${volnaMista(volna)} ${zPoctu(P.mist)}`;
    r.popis.textContent = `${hhmm(h.h)} až ${hhmm(h.h + R.blok)}, ${spoj?.nazev ?? ""} spoj na permanentku ${naDny}: ${popis}`;
    klapni(r.stav, mam ? "předplaceno" : s === "pryc" ? "odjel" : s === "plno" ? "rozebráno" : s === "malo" ? kolik : "permanentka", zaklapat, poradi * 70 + 40);
  };

  /** Zastávka zvláštního vlaku: na klapce jméno, vedle co se tam děje */
  const radekKurzu = (r: Radek, k: KurzDne, v: Vyber, zaklapat: boolean, poradi: number) => {
    if (r.jizdne) r.jizdne.textContent = "";
    const z = k.kurz.program.find((x) => x.h === r.h);
    r.li.className = `rz-o kurz${k.probehlo ? " pryc" : ""}${v.kurz ? " vybrana" : ""}${z ? "" : " bez-zastavky"}`;
    r.btn.disabled = true;
    r.btn.setAttribute("aria-pressed", "false");
    r.poradi.textContent = z ? String(k.kurz.program.indexOf(z) + 1) : "";
    r.co.textContent = z?.popis ?? "";
    r.popis.textContent = z ? `${hhmm(r.h)} až ${hhmm(r.h + R.blok)}, zastávka ${z.nazev}: ${z.popis}` : `${hhmm(r.h)} až ${hhmm(r.h + R.blok)}, vlak jede dál`;
    klapni(r.stav, z?.nazev ?? "", zaklapat, poradi * 70 + 40, k.kurz.program.map((x) => x.nazev));
  };

  const radek = (r: Radek, d: Den | undefined, v: Vyber, zaklapat: boolean, poradi: number) => {
    const h = d?.hodiny.find((x) => x.h === r.h);
    if (!d || !h) {
      if (r.jizdne) r.jizdne.textContent = "";
      r.li.className = "rz-o pryc";
      r.btn.disabled = true;
      r.btn.setAttribute("aria-pressed", "false");
      klapni(r.stav, "", zaklapat, poradi * 70 + 30);
      posad(r.sedacky, Array(R.mist).fill("pryc"));
      return;
    }
    if (h.pas) radekPermanentky(r, d, h, v, zaklapat, poradi);
    else radekHodiny(r, h, v, zaklapat, poradi);
  };

  /** Cedule zvláštního vlaku: jméno, místa a nástup */
  const cedule = (d: Den | undefined, v: Vyber) => {
    const k = d?.kurz;
    if (!zvl) return;
    zvl.hidden = !k;
    if (!k) return;
    const c = k.kurz;
    const hodinyKurzu = c.program.map((z) => z.h);
    const od = Math.min(...hodinyKurzu);
    const konec = Math.max(...hodinyKurzu) + R.blok;
    if (zvlNazev) zvlNazev.textContent = c.nazev;
    if (zvlJmeno) zvlJmeno.textContent = `Vlak „${c.vlak}“ — ${c.cteni} je japonsky ${c.vyznam}`;
    if (zvlUdaje) zvlUdaje.textContent = `${hhmm(od)} → ${hhmm(konec)} · lektor ${c.lektor} · ${kc(c.cena)} za člověka`;
    if (zvlPopis) zvlPopis.textContent = c.popis;
    if (zvlZnak) zvlZnak.textContent = c.emblem;
    /* v sobotu jede jen on; v den, kdy je jinak otevřeno, vyloučil hodinové spoje */
    const led = zvl.querySelector(".rz-zvl-led-vyluka");
    if (led && d) led.textContent = R.dny.includes(d.datum.getDay()) ? "výluka — běžné spoje dnes nejedou" : `${DNY[d.datum.getDay()]} — jede jen zvláštní vlak`;

    const volna = volnoVKurzu(k);
    const mista = mistaKurzu(k, v.osob, v.kurz);
    posad(zvlSedacky, mista.map((m) => (k.probehlo ? "pryc" : !m ? "" : m.kdo === "ty" ? "moje" : "obs")));
    zvl.classList.toggle("vybrana", v.kurz);
    zvl.classList.toggle("plno", !v.kurz && volna === 0);
    if (zvlVlak) zvlVlak.innerHTML = zvlastniVlak({ mista, emblem: c.emblem, cedule: c.nazev });
    const malo = !v.kurz && volna > 0 && volna < v.osob;
    if (zvlVolno) {
      zvlVolno.textContent = k.probehlo
        ? "Vlak už vyjel."
        : v.kurz
          ? `Nastupuješ — ${v.osob === 1 ? "jedno místo je tvoje" : `${v.osob} místa jsou vaše`}.`
          : volna === 0
            ? `Plno — všech ${c.mist} míst je pryč.`
            : malo
              ? `${zbyvaMist(volna).replace(/^z/, "Z")} — tolik vás nepojede.`
              : `${volnaMista(volna).replace(/^v/, "V")} ${zPoctu(c.mist)}.`;
    }
    if (zvlVolba && zvlVolbaText) {
      zvlVolba.disabled = !v.kurz && (volna === 0 || malo);
      zvlVolba.setAttribute("aria-pressed", String(v.kurz));
      zvlVolbaText.textContent = v.kurz ? "Vystoupit" : k.probehlo ? "Odjel" : volna === 0 ? "Plno" : "Nastoupit";
      zvlVolba.setAttribute("aria-label", v.kurz ? `Vystoupit ze zvláštního vlaku ${c.nazev}` : `Nastoupit do zvláštního vlaku ${c.nazev}`);
    }
  };

  let posledniDen: string | null = null;
  let casHlaseni = 0;

  return {
    /** Celá tabule pro jeden den — při změně dne zaklape */
    zobraz(d: Den | undefined, v: Vyber, zaklapat: boolean) {
      const novyDen = (d?.klic ?? null) !== posledniDen;
      posledniDen = d?.klic ?? null;
      koren.classList.toggle("bez-dne", !d);
      koren.classList.toggle("je-kurz", !!d?.kurz);
      if (rada) rada.textContent = d?.kurz ? RADA_KURZ : radaHodiny(d?.datum.getDay());
      seznam?.setAttribute("aria-label", d?.kurz ? "Trať zvláštního vlaku — zastávky programu po hodině a půl" : "Odjezdy vybraného dne — vyber jeden nebo víc");

      if (d) {
        const s = `${DNY[d.datum.getDay()]} ${d.datum.getDate()}. ${MESICE_2[d.datum.getMonth()]}`;
        const ob = sekkiDne(d.datum);
        sekki.innerHTML = `<b>${s.charAt(0).toUpperCase() + s.slice(1)}</b> <span class="rz-tabule-obdobi">${ob.cteni} · ${ob.cesky}</span>`;
        const hodnoty = [DNY[d.datum.getDay()], ...`${dvoj(d.datum.getDate())}${dvoj(d.datum.getMonth() + 1)}`.split("")];
        denKlapky.forEach((kl, i) => klapni(kl, hodnoty[i], zaklapat && novyDen, i * 40, DNY.slice(1, 6)));
      } else {
        sekki.textContent = "Na měsíc dopředu je všechno obsazené. Napiš nám a domluvíme se.";
        denKlapky.forEach((kl, i) => klapni(kl, i ? "-" : "—", false, 0));
      }
      cedule(d, v);
      const k = d?.kurz;
      radky.forEach((r, i) => (k ? radekKurzu(r, k, v, zaklapat, i) : radek(r, d, v, zaklapat, i)));
      if (zaklapat && !klid && novyDen) {
        /* Časy odjezdů jsou pořád stejné, ale při novém dni probliknou — tabule načítá.
           Cíl z hodiny řádku, ne z klapky — ta může být zrovna v mezikroku. */
        casKlapky.forEach((kk, i) =>
          kk.forEach((kl, j) => {
            const t = cislice(radky[i].h)[j];
            window.setTimeout(() => kl.nastav(t, cesta(String((Number(t) + 7) % 10), t).slice(-2)), i * 70 + j * 22);
          }),
        );
        zvuk.klapky(18);
      }
    },
    /** Jeden řádek po přidání nebo ubrání odjezdu nebo permanentky */
    radek(d: Den, h: number, v: Vyber) {
      const r = radky.find((x) => x.h === h);
      if (!r) return;
      radek(r, d, v, true, 0);
      if (!klid) zvuk.klapky(5);
    },
    /** Hlášení pod tabulí — když se na jízdence něco změnilo samo */
    hlas(text: string) {
      if (!hlaseni) return;
      window.clearTimeout(casHlaseni);
      hlaseni.textContent = text;
      if (text) casHlaseni = window.setTimeout(() => (hlaseni.textContent = ""), 9000);
    },
    zamer(h: number) {
      radky.find((x) => x.h === h)?.btn.focus({ preventScroll: true });
    },
    /** Zaměří nástup do zvláštního vlaku */
    zamerKurz() {
      zvlVolba?.focus({ preventScroll: true });
    },
  };
}

export type Odjezdy = NonNullable<ReturnType<typeof initOdjezdy>>;
