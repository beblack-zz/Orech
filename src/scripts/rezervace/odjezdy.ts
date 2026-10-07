/**
 * Odjezdová tabule s hodinami vybraného dne (components/rezervace/
 * Odjezdy.astro). Řádky s časy jsou v HTML; tady se dopisuje, co záleží
 * na dni: jestli je hodina volná, obsazená, už odjela, nebo jestli na ni
 * nastupuješ ty. Hodina se zamlouvá celá — žádná místa se nepočítají.
 *
 * Při změně dne tabule překlapne — klapky (parta2/klapka.ts) přeběhnou
 * přes pár mezikroků jako buben se slovy a zaklapou (zvuk). Když člověk
 * jen přidá nebo ubere hodinu, překlapne jen ten jeden řádek.
 */
import { Klapka, cesta, nahodne } from "../parta2/klapka";
import { klid } from "../parta2/stav";
import * as zvuk from "../parta2/zvuk";
import { sekkiDne } from "../../data/koyomi";
import type { Den, Hodina } from "./simulace";

export type StavHodiny = "volno" | "plno" | "pryc";

const DNY = ["neděle", "pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota"];
const MESICE_2 = ["ledna", "února", "března", "dubna", "května", "června", "července", "srpna", "září", "října", "listopadu", "prosince"];
const dvoj = (n: number) => String(n).padStart(2, "0");

export const stavHodiny = (h: Hodina): StavHodiny => (h.probehlo ? "pryc" : h.volno ? "volno" : "plno");

/** Co stojí v poznámce na tabuli */
const poznamka = (s: StavHodiny, mam: boolean) => (mam ? "nastupuješ" : s === "pryc" ? "odjel" : s === "plno" ? "obsazeno" : "volno");

/** Buben poznámek: slova, která můžou proletět, než se klapka ustálí */
const BUBEN = ["volno", "obsazeno", "odjel", "nastupuješ", "včas", "Ořech"];

interface Radek {
  h: number;
  li: HTMLLIElement;
  btn: HTMLButtonElement;
  popis: HTMLElement;
  stav: Klapka;
}

export interface TabuleNastaveni {
  /** Klik na řádek: přidat nebo ubrat hodinu */
  prepni: (h: number) => void;
  /** Ukazuje se na hodinu (najetí, focus) — obloha se k ní stočí; null = pryč */
  ukaz: (h: number | null) => void;
}

export function initOdjezdy(n: TabuleNastaveni) {
  const koren = document.getElementById("rz-odjezdy");
  if (!koren) return null;
  const sekki = koren.querySelector<HTMLElement>(".rz-tabule-sekki")!;
  const denKlapky = [...koren.querySelectorAll<HTMLElement>(".rz-tabule-den [data-flap]")].map((el) => new Klapka(el));
  const radky: Radek[] = [...koren.querySelectorAll<HTMLLIElement>(".rz-o")].map((li) => ({
    h: Number(li.dataset.h),
    li,
    btn: li.querySelector<HTMLButtonElement>(".rz-o-volba")!,
    popis: li.querySelector<HTMLElement>(".rz-o-popis")!,
    stav: new Klapka(li.querySelector<HTMLElement>(".rz-o-stav [data-flap]")!),
  }));
  const casKlapky = radky.map((r) => [...r.li.querySelectorAll<HTMLElement>(".rz-o-cas [data-flap]")].map((el) => new Klapka(el)));

  radky.forEach((r) => {
    r.btn.addEventListener("click", () => n.prepni(r.h));
    r.btn.addEventListener("focus", () => n.ukaz(r.h));
    r.btn.addEventListener("blur", () => n.ukaz(null));
    r.li.addEventListener("pointerenter", () => n.ukaz(r.h));
    r.li.addEventListener("pointerleave", () => n.ukaz(null));
  });

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
    window.setInterval(() => tik(true), 10000);
  }

  const klapni = (kl: Klapka, cilova: string, zaklapat: boolean, zpozdeni: number, buben = BUBEN) => {
    if (kl.hodnota === cilova) return;
    if (!zaklapat || klid) return kl.okamzite(cilova);
    const mezi = kl.cislice
      ? cesta(kl.hodnota, cilova)
      : Array.from({ length: 2 + Math.floor(Math.random() * 3) }, () => nahodne(buben.filter((x) => x !== cilova))).filter((x, i, p) => i === 0 || x !== p[i - 1]);
    window.setTimeout(() => kl.nastav(cilova, mezi), zpozdeni);
  };

  const radek = (r: Radek, h: Hodina | undefined, osob: number, mam: boolean, zaklapat: boolean, poradi: number) => {
    if (!h) {
      r.li.className = "rz-o pryc";
      r.btn.disabled = true;
      r.btn.setAttribute("aria-pressed", "false");
      klapni(r.stav, "", zaklapat, poradi * 70 + 30);
      return;
    }
    const s = stavHodiny(h);
    r.li.className = `rz-o ${s}${mam ? " vybrana" : ""}`;
    r.btn.disabled = s !== "volno" && !mam;
    r.btn.setAttribute("aria-pressed", String(mam));
    const popis = mam
      ? `nastupuješ — hodina je vaše, ${osob === 1 ? "jedeš sám" : `jedete ${osob}`}`
      : s === "pryc" ? "už odjel" : s === "plno" ? "obsazeno" : "volno";
    r.popis.textContent = `${h.h}:00 až ${h.h + 1}:00, ${popis}`;
    klapni(r.stav, poznamka(s, mam), zaklapat, poradi * 70 + 40);
  };

  let posledniDen: string | null = null;

  return {
    /** Celá tabule pro jeden den — při změně dne zaklape */
    zobraz(d: Den | undefined, osob: number, vybrane: ReadonlySet<number>, zaklapat: boolean) {
      const novyDen = (d?.klic ?? null) !== posledniDen;
      posledniDen = d?.klic ?? null;
      koren.classList.toggle("bez-dne", !d);

      if (d) {
        const s = `${DNY[d.datum.getDay()]} ${d.datum.getDate()}. ${MESICE_2[d.datum.getMonth()]}`;
        const ob = sekkiDne(d.datum);
        sekki.innerHTML = `<b>${s.charAt(0).toUpperCase() + s.slice(1)}</b> <span class="rz-tabule-obdobi"><span lang="ja">${ob.znak}</span> ${ob.cteni} · ${ob.cesky}</span>`;
        const hodnoty = [DNY[d.datum.getDay()], ...`${dvoj(d.datum.getDate())}${dvoj(d.datum.getMonth() + 1)}`.split("")];
        denKlapky.forEach((kl, i) => klapni(kl, hodnoty[i], zaklapat && novyDen, i * 40, DNY.slice(1, 6)));
      } else {
        sekki.textContent = "Na měsíc dopředu je všechno obsazené. Napiš nám a domluvíme se.";
        denKlapky.forEach((kl, i) => klapni(kl, i ? "-" : "—", false, 0));
      }
      radky.forEach((r, i) => radek(r, d?.hodiny.find((x) => x.h === r.h), osob, vybrane.has(r.h), zaklapat, i));
      if (zaklapat && !klid && novyDen) {
        /* Časy odjezdů jsou pořád stejné, ale při novém dni probliknou — tabule načítá.
           Cíl z hodiny řádku, ne z klapky — ta může být zrovna v mezikroku. */
        casKlapky.forEach((kk, i) =>
          kk.forEach((kl, j) => {
            const t = `${dvoj(radky[i].h)}00`[j];
            window.setTimeout(() => kl.nastav(t, cesta(String((Number(t) + 7) % 10), t).slice(-2)), i * 70 + j * 22);
          }),
        );
        zvuk.klapky(18);
      }
    },
    /** Jeden řádek po přidání nebo ubrání hodiny */
    radek(d: Den, h: number, osob: number, mam: boolean) {
      const r = radky.find((x) => x.h === h);
      const hod = d.hodiny.find((x) => x.h === h);
      if (!r || !hod) return;
      radek(r, hod, osob, mam, true, 0);
      if (!klid) zvuk.klapky(5);
    },
    zamer(h: number) {
      radky.find((x) => x.h === h)?.btn.focus({ preventScroll: true });
    },
  };
}

export type Odjezdy = NonNullable<ReturnType<typeof initOdjezdy>>;
