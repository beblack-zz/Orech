/**
 * Jízdní řád (components/rezervace/Rad.astro): cedule se všemi odjezdy na
 * měsíc dopředu — řádky hodiny, sloupce dny. Čte se na jeden pohled:
 * tečka je místo, které se dá koupit. Plná je volná, prázdný kroužek
 * obsazená, čárka už odjela.
 *
 *   hodina       jedna tečka — hodina je celá vaše
 *   permanentka  tři malé tečky, tři místa (první a poslední řádek)
 *   kurz         pruh přes celý den a v něm tečka za každé místo ve vlaku
 *
 * Mřížka se staví jednou (dny se během návštěvy nemění) a pak se v ní jen
 * přebarvují tečky. Co je na jízdence, je červené a obtažené propiskou;
 * u permanentky mají další týdny, na které platí, fajfku.
 *
 * Klik do buňky vybere den i hodinu naráz — o to se stará hlavni.ts, tady
 * se jen říká, kam se kliklo. Buňky nejsou v pořadí tabulátoru (je jich
 * přes sedmdesát): totéž jde z klávesnice vybrat v pokladně a na tabuli.
 */
import { rezervace as R, permanentka as P } from "../../data/rezervace";
import { volnaMista, zPoctu, zbyvaMist } from "../../data/pocty";
import { SVGNS } from "../parta2/stav";
import { volnoVKurzu } from "./simulace";
import type { Den } from "./simulace";
import { stavHodiny, mistaKurzu, NA_DNY } from "./odjezdy";
import type { Vyber } from "./odjezdy";

const ZKR = ["ne", "po", "út", "st", "čt", "pá", "so"];
const DNY = ["neděle", "pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota"];
const MESICE = ["leden", "únor", "březen", "duben", "květen", "červen", "červenec", "srpen", "září", "říjen", "listopad", "prosinec"];
const MESICE_2 = ["ledna", "února", "března", "dubna", "května", "června", "července", "srpna", "září", "října", "listopadu", "prosince"];
/** Kroužek propiskou — není to elipsa, konec přetáhne začátek */
const KROUZEK = "M24 4 C36 2 45 8 44 16 C43 25 31 30 19 28 C8 26 2 21 4 13 C6 6 15 3 28 5";

export interface RadNastaveni {
  /** Klik do buňky: den (pořadí v seznamu dnů) a hodina */
  hodina: (den: number, h: number) => void;
  /** Klik na pruh zvláštního vlaku */
  kurz: (den: number) => void;
  /** Ukazuje se na hodinu — obloha se k ní stočí; null = pryč */
  ukaz: (h: number | null) => void;
  /** Kolik permanentek je ten den v týdnu na kterém spoji prodaných */
  pasObsazeno: (d: Den) => ReadonlyMap<number, number>;
}

interface Bunka {
  i: number;
  h: number;
  td: HTMLTableCellElement;
  btn: HTMLButtonElement;
  /** Místa na permanentku — jen na jejích spojích */
  mista: HTMLElement[];
}

const prvek = <K extends keyof HTMLElementTagNameMap>(tag: K, trida = "", text = "") => {
  const el = document.createElement(tag);
  if (trida) el.className = trida;
  if (text) el.textContent = text;
  return el;
};
const krouzek = () => {
  const svg = document.createElementNS(SVGNS, "svg");
  svg.setAttribute("class", "rz-rad-krouzek");
  svg.setAttribute("viewBox", "0 0 48 32");
  svg.setAttribute("aria-hidden", "true");
  const p = document.createElementNS(SVGNS, "path");
  p.setAttribute("d", KROUZEK);
  p.setAttribute("pathLength", "1");
  svg.append(p);
  return svg;
};

export function initRad(dny: Den[], n: RadNastaveni) {
  const koren = document.getElementById("rz-rad");
  const tab = koren?.querySelector<HTMLTableElement>(".rz-rad-tab");
  const cols = tab?.querySelector("colgroup");
  const thead = tab?.querySelector("thead");
  const tbody = tab?.querySelector("tbody");
  if (!koren || !tab || !cols || !thead || !tbody || !dny.length) return null;
  const hodiny = Array.from({ length: R.do - R.od }, (_, k) => R.od + k);
  tab.style.setProperty("--radku", String(hodiny.length));

  const platnost = koren.querySelector<HTMLElement>(".rz-rad-platnost");
  if (platnost) {
    const a = dny[0].datum;
    const b = dny[dny.length - 1].datum;
    /* Mezera na začátku patří k větě před tím — build ji před prázdným prvkem zahodí */
    platnost.textContent = ` Platí od ${a.getDate()}. ${MESICE_2[a.getMonth()]} do ${b.getDate()}. ${MESICE_2[b.getMonth()]} ${b.getFullYear()}.`;
  }

  /* ——— Hlavička: měsíce a pod nimi dny ——— */
  cols.append(prvek("col", "rz-rad-col-h"));
  dny.forEach(() => cols.append(prvek("col")));
  const radMesicu = prvek("tr", "rz-rad-mesice");
  const radDnu = prvek("tr", "rz-rad-dny");
  const roh = prvek("th", "rz-rad-roh", "odjezd");
  roh.rowSpan = 2;
  roh.scope = "col";
  radMesicu.append(roh);
  const mesice: { th: HTMLTableCellElement; dnu: number }[] = [];
  let mesic = -1;
  /** První den nového měsíce (kromě prvního sloupce) — před ním je v mřížce silnější čára */
  const novyMesic = dny.map((d, i) => i > 0 && d.datum.getMonth() !== dny[i - 1].datum.getMonth());
  const hlavy = dny.map((d, i) => {
    if (d.datum.getMonth() !== mesic) {
      mesic = d.datum.getMonth();
      const th = prvek("th", novyMesic[i] ? "novy-mesic" : "", MESICE[mesic]);
      th.scope = "colgroup";
      radMesicu.append(th);
      mesice.push({ th, dnu: 0 });
    }
    mesice[mesice.length - 1].dnu++;
    const dt = d.datum.getDay();
    const th = prvek("th", `den-${dt}${d.kurz ? " kurz" : ""}${novyMesic[i] ? " novy-mesic" : ""}`);
    th.scope = "col";
    const zkratka = prvek("span", "rz-rad-znak", ZKR[dt]);
    zkratka.setAttribute("aria-hidden", "true");
    th.append(zkratka, prvek("b", "", `${d.datum.getDate()}.`), prvek("span", "sr-only", ` ${MESICE_2[d.datum.getMonth()]}, ${DNY[dt]}`));
    radDnu.append(th);
    return th;
  });
  mesice.forEach((m) => (m.th.colSpan = m.dnu));
  thead.append(radMesicu, radDnu);

  /* ——— Tělo: hodiny × dny; den kurzu je jeden pruh přes celý sloupec ——— */
  const bunky: Bunka[] = [];
  const pruhy: { i: number; td: HTMLTableCellElement; btn: HTMLButtonElement; mista: HTMLElement[]; volno: HTMLElement }[] = [];
  /* Kam se ukazuje, to se zvýrazní i v hlavičce — ať je hned vidět, který je to den */
  const ukazDen = (i: number, ano: boolean) => hlavy[i].classList.toggle("ukaz", ano);

  hodiny.forEach((h, radek) => {
    const pas = P.spoje.some((s) => s.h === h);
    const tr = prvek("tr", pas ? "pas" : "");
    const th = prvek("th", "rz-rad-h");
    th.scope = "row";
    th.append(prvek("b", "", `${h}:00`));
    if (pas) th.append(prvek("small", "", "permanentka"));
    tr.append(th);
    tr.addEventListener("pointerenter", () => n.ukaz(h));
    tr.addEventListener("pointerleave", () => n.ukaz(null));

    dny.forEach((d, i) => {
      if (d.kurz) {
        if (radek > 0) return;
        const td = prvek("td", `rz-rad-td-zvl${novyMesic[i] ? " novy-mesic" : ""}`);
        td.rowSpan = hodiny.length;
        const btn = prvek("button", "rz-rad-zvl");
        btn.type = "button";
        btn.tabIndex = -1;
        const sedadla = prvek("span", "rz-rad-zvl-mista");
        const mista = Array.from({ length: d.kurz.kurz.mist }, () => sedadla.appendChild(prvek("i")));
        const volno = prvek("span", "rz-rad-zvl-volno");
        btn.append(prvek("span", "rz-rad-zvl-stitek", "kurz"), prvek("b", "", d.kurz.kurz.nazev), sedadla, volno);
        btn.addEventListener("click", () => n.kurz(i));
        btn.addEventListener("pointerenter", () => ukazDen(i, true));
        btn.addEventListener("pointerleave", () => ukazDen(i, false));
        td.append(btn);
        tr.append(td);
        pruhy.push({ i, td, btn, mista, volno });
        return;
      }
      const td = prvek("td", novyMesic[i] ? "novy-mesic" : "");
      const btn = prvek("button", "rz-rad-b");
      btn.type = "button";
      btn.tabIndex = -1;
      let mista: HTMLElement[] = [];
      if (pas) {
        const sedadla = prvek("span", "rz-rad-mista");
        mista = Array.from({ length: P.mist }, () => sedadla.appendChild(prvek("i")));
        btn.append(sedadla);
      } else {
        btn.append(prvek("i", "rz-rad-t"));
      }
      btn.append(krouzek());
      btn.addEventListener("click", () => n.hodina(i, h));
      btn.addEventListener("pointerenter", () => ukazDen(i, true));
      btn.addEventListener("pointerleave", () => ukazDen(i, false));
      td.append(btn);
      tr.append(td);
      bunky.push({ i, h, td, btn, mista });
    });
    tbody.append(tr);
  });

  return {
    /** Přebarví tečky podle toho, který den je vybraný a co je na jízdence */
    obnov(den: number, v: Vyber) {
      const vybrany = dny[den];
      hlavy.forEach((th, i) => th.classList.toggle("vybrany", i === den));

      for (const b of bunky) {
        const d = dny[b.i];
        const hod = d.hodiny.find((x) => x.h === b.h);
        const dt = d.datum.getDay();
        const kdy = `${DNY[dt]} ${d.datum.getDate()}. ${MESICE_2[d.datum.getMonth()]}, ${b.h}:00–${b.h + 1}:00`;
        b.td.classList.toggle("vybrany", b.i === den);
        if (!hod) {
          b.btn.className = "rz-rad-b pryc";
          b.btn.disabled = true;
          continue;
        }
        let popis: string;
        if (hod.pas) {
          const mam = b.i === den && v.pasy.has(b.h);
          /* Permanentka platí i v dalších týdnech — ty mají jen fajfku */
          const kryta = !mam && !!vybrany && b.i > den && dt === vybrany.datum.getDay() && v.pasy.has(b.h);
          const obsazeno = n.pasObsazeno(d).get(b.h) ?? 0;
          const volna = P.mist - obsazeno;
          const s = hod.probehlo ? "pryc" : volna <= 0 ? "plno" : volna < v.osob && !mam ? "malo" : "volno";
          b.btn.className = `rz-rad-b pas ${s}${mam ? " mam" : ""}${kryta ? " kryta" : ""}`;
          b.btn.disabled = s !== "volno" && !mam;
          b.mista.forEach((el, k) => (el.className = k < obsazeno ? "obs" : mam && k < obsazeno + v.osob ? "moje" : ""));
          b.btn.setAttribute("aria-pressed", String(mam));
          popis = mam
            ? "permanentku máš na jízdence"
            : kryta ? "platí na ni permanentka z jízdenky"
            : s === "pryc" ? "už odjel" : s === "plno" ? "permanentky jsou rozebrané" : s === "malo" ? `na permanentku ${NA_DNY[dt]} ${zbyvaMist(volna)}` : `permanentka ${NA_DNY[dt]}, ${volnaMista(volna)} ${zPoctu(P.mist)}`;
        } else {
          const mam = b.i === den && v.hodiny.has(b.h);
          const s = stavHodiny(hod);
          b.btn.className = `rz-rad-b ${s}${mam ? " mam" : ""}`;
          b.btn.disabled = s !== "volno" && !mam;
          b.btn.setAttribute("aria-pressed", String(mam));
          popis = mam ? "máš na jízdence" : s === "pryc" ? "už odjel" : s === "plno" ? "obsazeno" : "volno";
        }
        b.btn.setAttribute("aria-label", `${kdy} — ${popis}`);
        b.btn.title = `${ZKR[dt]} ${d.datum.getDate()}. ${d.datum.getMonth() + 1}. · ${b.h}:00–${b.h + 1}:00 · ${popis}`;
      }

      for (const p of pruhy) {
        const d = dny[p.i];
        const k = d.kurz!;
        const volna = volnoVKurzu(k);
        const mam = p.i === den && v.kurz;
        const s = k.probehlo ? "pryc" : volna === 0 ? "plno" : "volno";
        p.td.classList.toggle("vybrany", p.i === den);
        p.btn.className = `rz-rad-zvl ${s}${mam ? " mam" : ""}`;
        p.btn.disabled = s !== "volno" && !mam;
        p.btn.setAttribute("aria-pressed", String(mam));
        /* Stejné rozsazení jako sedačky na ceduli a okna vlaku */
        mistaKurzu(k, v.osob, mam).forEach((m, j) => (p.mista[j].className = k.probehlo ? "obs" : !m ? "" : m.kdo === "ty" ? "moje" : "obs"));
        const slovy = mam ? "nastupuješ" : s === "pryc" ? "odjel" : s === "plno" ? "plno" : volnaMista(volna);
        /* Kolik míst zbývá, je to hlavní — číslo velké, slova pod ním */
        p.volno.textContent = "";
        if (s === "volno" && !mam) p.volno.append(prvek("strong", "", `${volna}`), volna === 1 ? "volné místo" : volna <= 4 ? "volná místa" : "volných míst");
        else p.volno.textContent = slovy;
        p.btn.setAttribute("aria-label", `${DNY[d.datum.getDay()]} ${d.datum.getDate()}. ${MESICE_2[d.datum.getMonth()]} — kurz ${k.kurz.nazev} na celý den, ${mam ? "nastupuješ" : s === "pryc" ? "už odjel" : s === "plno" ? "plno" : `${volnaMista(volna)} ${zPoctu(k.kurz.mist)}`}`);
        p.btn.title = `${k.kurz.nazev} · celý den · ${slovy}`;
      }
    },
  };
}

export type Rad = NonNullable<ReturnType<typeof initRad>>;
