/**
 * Rezervace: kolik vás pojede → den → odjezdy na tabuli → jízdenka →
 * e-mail. Jednotlivé kusy mají vlastní moduly:
 *
 *   more.ts      moře, trať a vlak na pozadí
 *   odjezdy.ts   klapková tabule s hodinami vybraného dne
 *   rad.ts       jízdní řád: plakát s celým měsícem, do kterého se dá klikat
 *   jizdenka.ts  jízdenka s vláčkem a označení
 *   simulace.ts  ukázková obsazenost (dokud nemáme skutečný kalendář)
 *
 * Tady je stav (den, kolik vás je a co je na jízdence), dny jako lepenkové
 * jízdenky, displej nad dveřmi (co bude dál a co máš vybrané), dnešek
 * a příští volný odjezd na úvodní cedulce, obloha podle hodiny na tabuli
 * a odeslání. Dny i tabule se kreslí v prohlížeči, protože záleží na
 * dnešku — statický build by zestárl.
 *
 * Na jízdence je vždycky jen jedna ze tří věcí:
 *
 *   hodiny       buď volné, nebo obsazené, zamlouvají se celé: kolik vás
 *                pojede (1–4), mění jen cenu a jízdenku, ne to, co je volné
 *   kurz         zvláštní vlak na celý den s pár místy — tady se počítá,
 *                jestli se vaše skupina ještě vejde
 *   permanentka  první nebo poslední spoj dne na tři měsíce, taky s místy;
 *                je na jeden den v týdnu — na ten, který je vybraný
 *                (vybrané úterý = každé úterý), a tím dnem začíná platit
 *
 * Když si člověk vezme jednu, ostatní z jízdenky zmizí a tabule to ohlásí.
 *
 * Celé se to spustí při každé návštěvě stránky, i po přechodu bez
 * načtení (parta2/prechody.ts) — proto je import přechodů první.
 */
import { stranka } from "../parta2/prechody";
import { spust, vyzadej, klid, nacti, uloz } from "../parta2/stav";
import { initNebe } from "../parta2/nebe";
import { hlavicka } from "../parta2/hlavicka";
import { Klapka, cesta } from "../parta2/klapka";
import * as zvuk from "../parta2/zvuk";
import { rezervace as R, permanentka as P } from "../../data/rezervace";
import { sekkiDne } from "../../data/koyomi";
import { sklonuj, zPoctu, volnaMista, jenMist, zbyvaMist } from "../../data/pocty";
import { simuluj, volneHodiny, volnoVKurzu, obsazenoPermanentek, platnostPermanentky } from "./simulace";
import type { Den } from "./simulace";
import { initMore } from "./more";
import { initOdjezdy, stavHodiny, volnoNaSpoji, KAZDY, NA_DNY } from "./odjezdy";
import type { Vyber } from "./odjezdy";
import { initJizdenka, useky } from "./jizdenka";
import { initRad } from "./rad";

const DNY = ["neděle", "pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota"];
const V_DEN = ["v neděli", "v pondělí", "v úterý", "ve středu", "ve čtvrtek", "v pátek", "v sobotu"];
const ZKR = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];
const MESICE = ["leden", "únor", "březen", "duben", "květen", "červen", "červenec", "srpen", "září", "říjen", "listopad", "prosinec"];
const MESICE_2 = ["ledna", "února", "března", "dubna", "května", "června", "července", "srpna", "září", "října", "listopadu", "prosince"];
const KLIC_POSLEDNI = "rezervace-posledni";

const kc = (n: number) => `${n.toLocaleString("cs-CZ")} Kč`;
const lidi = (n: number) => (n === 1 ? "1 člověk" : `${n} lidi`);
const hodin = (n: number) => sklonuj(n, "hodina", "hodiny", "hodin");
const jizd = (n: number) => sklonuj(n, "jízda", "jízdy", "jízd");
const dvoj = (x: number) => String(x).padStart(2, "0");
const datumKratce = (d: Date) => `${d.getDate()}. ${d.getMonth() + 1}.`;
const datumRok = (d: Date) => `${datumKratce(d)} ${d.getFullYear()}`;
const datumDlouze = (d: Date) => `${d.getDate()}. ${MESICE_2[d.getMonth()]}`;
const iso = (d: Date) => `${d.getFullYear()}-${dvoj(d.getMonth() + 1)}-${dvoj(d.getDate())}`;
const spojPermanentky = (h: number) => P.spoje.find((s) => s.h === h);
const spojeSlovy = (hodiny: number[]) => hodiny.map((h) => `${spojPermanentky(h)?.nazev ?? ""} ${h}:00–${h + 1}:00`).join(" a ");

interface Posledni {
  text: string;
  /** Den rezervace — po něm se vzkaz schová */
  den: string;
}

function init() {
  const koren = document.querySelector<HTMLElement>("[data-rezervace]");
  if (!koren) return;
  const email = koren.dataset.email ?? "";
  const cena = Number(koren.dataset.cena ?? R.cena);
  const dnyEl = koren.querySelector<HTMLElement>(".rz-dny")!;
  const sekceNebe = koren.querySelector<HTMLElement>("[data-rz-nebe]");
  const jmenoEl = koren.querySelector<HTMLInputElement>('input[name="jmeno"]')!;
  const telEl = koren.querySelector<HTMLInputElement>('input[name="telefon"]')!;
  const poznEl = koren.querySelector<HTMLTextAreaElement>('textarea[name="poznamka"]')!;
  const cenaEl = koren.querySelector<HTMLElement>(".rz-cena b")!;
  const vypocetEl = koren.querySelector<HTMLElement>(".rz-cena-vypocet");
  const odeslat = koren.querySelector<HTMLAnchorElement>(".rz-odeslat")!;
  const odeslatPozn = koren.querySelector<HTMLElement>(".rz-pozn");
  const chybi = koren.querySelector<HTMLElement>(".rz-chybi");
  const dnesEl = koren.querySelector<HTMLElement>(".rz-dnes");
  const pristiEl = koren.querySelector<HTMLButtonElement>("[data-rz-nejblizsi]");
  const pristiKurzEl = koren.querySelector<HTMLButtonElement>("[data-rz-kurz-pristi]");
  const posledniEl = koren.querySelector<HTMLElement>(".rz-posledni");
  const pasVolby = [...koren.querySelectorAll<HTMLButtonElement>("[data-pas]")];
  const pasPozn = koren.querySelector<HTMLElement>(".rz-pas-stav");
  const pasDen = koren.querySelector<HTMLElement>(".rz-pas-den");
  const displej = document.querySelector<HTMLElement>(".rz-displej");
  const displejSouhrn = displej?.querySelector<HTMLElement>(".rz-displej-souhrn");

  const dnes = new Date();
  dnes.setHours(0, 0, 0, 0);
  const dny = simuluj(dnes);
  /* Permanentka je na jeden den v týdnu — úterky mají svoje místa a pátky svoje */
  const pasPodleDne = new Map<number, Map<number, number>>();
  const pasDne = (d: Den | undefined) => {
    const dt = d ? d.datum.getDay() : -1;
    if (!pasPodleDne.has(dt)) pasPodleDne.set(dt, dt < 0 ? new Map() : obsazenoPermanentek(dnes, dt));
    return pasPodleDne.get(dt)!;
  };
  let den = -1;
  let osob = 1;
  /* Co je na jízdence: hodiny, nebo spoje permanentky, nebo zvláštní vlak — vždycky jen jedno */
  const vybrane = new Set<number>();
  const pasy = new Set<number>();
  let kurzVybran = false;
  let posledniVybrana: number | null = null;
  let jizdenkaVidet = false;

  const vyber = (): Vyber => ({ osob, hodiny: vybrane, pasy, kurz: kurzVybran, pasObsazeno: pasDne(dny[den]) });
  const druh = () => (kurzVybran ? "kurz" : pasy.size ? "pas" : "hodiny");
  const volnych = (d: Den) => volneHodiny(d).length;
  /** Spoje permanentky, na které se ten den dá nastoupit a je na nich ještě místo */
  const volnePasy = (d: Den) => (d.kurz ? [] : d.hodiny.filter((h) => h.pas && !h.probehlo && volnoNaSpoji({ pasObsazeno: pasDne(d) }, h.h) > 0));
  /** Dá se ten den vůbec něco koupit? */
  const jdeVybrat = (d: Den) => (d.kurz ? volnoVKurzu(d.kurz) > 0 : volnych(d) > 0 || volnePasy(d).length > 0);

  /* ——— Obloha podle hodiny, na kterou se ukazuje ——— */

  let hNebe = Number(sekceNebe?.dataset.hodina ?? 10);
  let cilNebe = hNebe;
  let nebeBezi = false;
  const krokNebe = () => {
    const rozdil = cilNebe - hNebe;
    hNebe = Math.abs(rozdil) < 0.01 ? cilNebe : hNebe + rozdil * 0.14;
    sekceNebe!.dataset.hodina = hNebe.toFixed(3);
    vyzadej();
    if (hNebe !== cilNebe) requestAnimationFrame(krokNebe);
    else nebeBezi = false;
  };
  const nebeNa = (h: number) => {
    if (!sekceNebe) return;
    cilNebe = h;
    if (klid) {
      hNebe = h;
      sekceNebe.dataset.hodina = h.toFixed(3);
      vyzadej();
      return;
    }
    if (!nebeBezi) {
      nebeBezi = true;
      requestAnimationFrame(krokNebe);
    }
  };
  const nebeVychozi = () => {
    const d = dny[den];
    /* Zvláštní vlak jede celý den — když se na nic neukazuje, je nad mořem poledne */
    const h = d?.kurz ? 12 : posledniVybrana ?? (d ? volneHodiny(d)[0]?.h : undefined) ?? 10;
    nebeNa(h + 0.5);
  };

  /* ——— Tabule a jízdenka ——— */

  const tabule = initOdjezdy({
    prepni: (h) => prepniHodinu(h),
    kurz: () => prepniKurz(),
    ukaz: (h) => (h === null ? nebeVychozi() : nebeNa(h + 0.5)),
  });
  const jizdenka = initJizdenka();
  /* Jízdní řád: klik do buňky vybere den i hodinu naráz, sloupec kurzu otevře jeho den a sjede k ceduli */
  const rad = initRad(dny, {
    hodina: (i, h) => {
      if (den !== i) vyberDen(i);
      prepniHodinu(h);
    },
    kurz: (i) => {
      if (den !== i) vyberDen(i, true);
      document.getElementById("rz-odjezdy")?.scrollIntoView({ behavior: klid ? "auto" : "smooth", block: "start" });
      window.setTimeout(() => tabule?.zamerKurz(), klid ? 0 : 600);
    },
    ukaz: (h) => (h === null ? nebeVychozi() : nebeNa(h + 0.5)),
    pasObsazeno: pasDne,
  });

  /* ——— Dny: lepenkové jízdenky ——— */

  const kresliDny = () => {
    dnyEl.textContent = "";
    let mesic = -1;
    dny.forEach((d, i) => {
      if (d.datum.getMonth() !== mesic) {
        mesic = d.datum.getMonth();
        const m = document.createElement("p");
        m.className = "rz-mesic";
        m.setAttribute("aria-hidden", "true");
        m.textContent = MESICE[mesic];
        dnyEl.append(m);
      }
      const dt = d.datum.getDay();
      const vybrany = i === den;
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-pressed", String(vybrany));
      b.disabled = !jdeVybrat(d);

      if (d.kurz) {
        /* Den kurzu: tmavá jízdenka na zvláštní vlak, místa se počítají */
        const k = d.kurz;
        const volna = volnoVKurzu(k);
        const stav = k.probehlo ? "odjel" : volna === 0 ? "plno" : `${volnaMista(volna)} ${zPoctu(k.kurz.mist)}`;
        b.className = `rz-den kurz${volna === 0 ? (k.probehlo ? " pryc" : " plno") : volna <= 2 ? " malo" : ""}`;
        b.innerHTML = `<span class="rz-den-pas">zvláštní vlak</span>
          <b class="rz-den-cislo">${d.datum.getDate()}</b>
          <span class="rz-den-mesic">${MESICE_2[d.datum.getMonth()]} · ${DNY[dt]}</span>
          <span class="rz-den-sekki">${k.kurz.nazev}</span>
          <span class="rz-den-volno">${k.probehlo ? "odjel" : volna === 0 ? "plno" : `${volna <= 2 ? "△" : "○"} ${stav}`}</span>
          <span class="rz-den-dirka" aria-hidden="true"></span>`;
        b.setAttribute("aria-label", `${DNY[dt]} ${datumDlouze(d.datum)}: zvláštní vlak, kurz ${k.kurz.nazev} na celý den, ${stav}`);
      } else {
        const n = volnych(d);
        const pas = volnePasy(d).length > 0;
        const pryc = d.hodiny.every((h) => h.probehlo);
        const stav = n > 0 ? `volno ${hodin(n)}` : pas ? "volno jen na permanentku" : pryc ? "odjel" : "plno";
        const s = sekkiDne(d.datum);
        b.className = `rz-den den-${dt}${n === 0 ? (pas ? " malo" : pryc ? " pryc" : " plno") : n <= 2 ? " malo" : ""}`;
        b.innerHTML = `<span class="rz-den-pas">${DNY[dt]}</span>
          <b class="rz-den-cislo">${d.datum.getDate()}</b>
          <span class="rz-den-mesic">${MESICE_2[d.datum.getMonth()]}</span>
          <span class="rz-den-sekki">${s.cesky}</span>
          <span class="rz-den-volno">${n > 0 ? `${n <= 2 ? "△" : "○"} ${hodin(n)} volno` : pas ? "△ jen permanentka" : pryc ? "odjel" : "plno"}</span>
          <span class="rz-den-dirka" aria-hidden="true"></span>`;
        b.setAttribute("aria-label", `${DNY[dt]} ${datumDlouze(d.datum)}: ${stav}`);
      }
      b.addEventListener("click", () => {
        if (i !== den) vyberDen(i, true);
      });
      dnyEl.append(b);
    });
  };

  /** Permanentky v pokladně: dva spoje, kolik na nich zbývá a jestli jeden z nich bereš */
  const kresliPermanentky = () => {
    const d = dny[den];
    pasVolby.forEach((b) => {
      const h = Number(b.dataset.pas);
      const mam = pasy.has(h);
      const obsazeno = pasDne(d).get(h) ?? 0;
      const volna = P.mist - obsazeno;
      const hod = d?.hodiny.find((x) => x.h === h);
      const nejede = !d || !!d.kurz || !hod || hod.probehlo;
      b.disabled = !mam && (nejede || volna < osob);
      b.setAttribute("aria-pressed", String(mam));
      b.classList.toggle("plno", volna === 0);
      b.querySelectorAll<SVGSVGElement>(".rz-sedacka").forEach((el, i) =>
        el.setAttribute("class", `rz-sedacka${i < obsazeno ? " obs" : mam && i < obsazeno + osob ? " moje" : " pas"}`),
      );
      const stav = b.querySelector<HTMLElement>(".rz-pas-volno");
      const text = mam ? "na jízdence" : volna === 0 ? "rozebráno" : volna < osob ? jenMist(volna) : `${volnaMista(volna)} ${zPoctu(P.mist)}`;
      if (stav) stav.textContent = text;
      const spoj = spojPermanentky(h);
      b.setAttribute("aria-label", `Permanentka ${d ? `${NA_DNY[d.datum.getDay()]} ` : ""}na ${spoj?.nazev ?? ""} spoj ${h}:00 až ${h + 1}:00, ${text}`);
    });
    /* Na který den v týdnu permanentka je, říká vybraný den — jiný se vybere o krok výš */
    if (pasDen) pasDen.textContent = d ? NA_DNY[d.datum.getDay()] : "";
    if (pasPozn) {
      const jine = d ? R.dny.filter((x) => x !== d.datum.getDay()).map((x) => NA_DNY[x]) : [];
      const jinam = jine.length ? ` ${jine.join(" nebo ").replace(/^n/, "N")} si nahoře vyber jiný den.` : "";
      pasPozn.textContent = !d
        ? ""
        : d.kurz
          ? "V den kurzu je výluka — permanentka se začíná jiným dnem."
          : `Platila by ${KAZDY[d.datum.getDay()]} od ${datumDlouze(d.datum)} do ${datumDlouze(platnostPermanentky(d.datum).do)}.${jinam}`;
    }
  };

  const vyberDen = (i: number, uzivatel = false) => {
    den = i;
    vybrane.clear();
    pasy.clear();
    kurzVybran = false;
    posledniVybrana = null;
    kresliDny();
    kresliPermanentky();
    rad?.obnov(den, vyber());
    tabule?.hlas("");
    tabule?.zobraz(dny[den], vyber(), true);
    obnovJizdenku(true);
    souhrn();
    if (uzivatel) {
      zvuk.spoust();
      /* Zvláštní vlak ohlásí staniční rozhlas */
      if (dny[den]?.kurz) window.setTimeout(() => zvuk.rozhlas(), 260);
      dnyEl.querySelectorAll<HTMLButtonElement>(".rz-den")[i]?.focus({ preventScroll: true });
    }
    nebeVychozi();
  };

  /** Po každé změně toho, co je na jízdence */
  const poZmene = () => {
    kresliPermanentky();
    rad?.obnov(den, vyber());
    obnovJizdenku(true);
    souhrn();
    nebeVychozi();
  };

  const prepniHodinu = (h: number) => {
    const d = dny[den];
    if (!d || d.kurz) return;
    const hod = d.hodiny.find((x) => x.h === h);
    if (!hod) return;
    if (hod.pas) return prepniPermanentku(h);
    if (vybrane.has(h)) {
      vybrane.delete(h);
      posledniVybrana = vybrane.size ? Math.max(...vybrane) : null;
      zvuk.drevo(0.8);
    } else {
      if (stavHodiny(hod) !== "volno") return;
      if (pasy.size) {
        const stare = [...pasy];
        pasy.clear();
        stare.forEach((x) => tabule?.radek(d, x, vyber()));
        tabule?.hlas("Permanentku jsem z jízdenky vyndal — na jedné jízdence jsou buď hodiny, nebo permanentka.");
      }
      vybrane.add(h);
      posledniVybrana = h;
      zvuk.drevo(1.15);
      window.setTimeout(() => zvuk.drevo(1.3), 90);
    }
    tabule?.radek(d, h, vyber());
    poZmene();
  };

  const prepniPermanentku = (h: number) => {
    const d = dny[den];
    const hod = d?.hodiny.find((x) => x.h === h);
    if (!d || d.kurz || !hod) return;
    if (pasy.has(h)) {
      pasy.delete(h);
      posledniVybrana = pasy.size ? Math.max(...pasy) : null;
      zvuk.drevo(0.8);
    } else {
      if (hod.probehlo || volnoNaSpoji({ pasObsazeno: pasDne(d) }, h) < osob) return;
      if (vybrane.size) {
        const stare = [...vybrane];
        vybrane.clear();
        stare.forEach((x) => tabule?.radek(d, x, vyber()));
        tabule?.hlas("Hodiny jsem z jízdenky vyndal — na jedné jízdence jsou buď hodiny, nebo permanentka.");
      }
      pasy.add(h);
      posledniVybrana = h;
      zvuk.drevo(1.15);
      window.setTimeout(() => zvuk.cink(), 110);
    }
    tabule?.radek(d, h, vyber());
    poZmene();
  };

  const prepniKurz = () => {
    const d = dny[den];
    if (!d?.kurz) return;
    if (kurzVybran) {
      kurzVybran = false;
      zvuk.drevo(0.8);
    } else {
      if (volnoVKurzu(d.kurz) < osob) return;
      kurzVybran = true;
      zvuk.para();
      window.setTimeout(() => zvuk.drevo(1.15), 120);
    }
    tabule?.zobraz(d, vyber(), false);
    poZmene();
  };

  const obnovJizdenku = (zmena: boolean) => {
    const d = dny[den];
    jizdenka?.obnov(
      {
        den: d,
        hodiny: [...vybrane],
        osob,
        cena,
        kurz: kurzVybran ? d?.kurz : undefined,
        pas: d && pasy.size ? { spoje: [...pasy].sort((a, b) => a - b), platnost: platnostPermanentky(d.datum), obsazeno: pasDne(d) } : undefined,
      },
      zmena,
    );
  };

  /* ——— Souhrn, displej nad dveřmi a e-mail ——— */

  /** Co je na jízdence slovy a v korunách — podle toho, co člověk vybral */
  const sepis = () => {
    const d = dny[den];
    if (!d) return null;
    const kdy = `${DNY[d.datum.getDay()]} ${datumRok(d.datum)}`;
    const zkratka = `${ZKR[d.datum.getDay()]} ${datumKratce(d.datum)}`;
    if (kurzVybran && d.kurz) {
      const c = d.kurz.kurz;
      const hodinyKurzu = c.program.map((z) => z.h);
      const cas = `${Math.min(...hodinyKurzu)}:00–${Math.max(...hodinyKurzu) + 1}:00`;
      const celkem = osob * c.cena;
      return {
        celkem,
        vypocet: `${lidi(osob)} × ${kc(c.cena)} za celý den`,
        kratce: `${zkratka} · ${c.nazev} · ${lidi(osob)} · ${kc(celkem)}`,
        predmet: `Kurz: ${c.nazev}, ${zkratka} ${d.datum.getFullYear()}, ${lidi(osob)}`,
        uvod: "Ahoj, chci se přihlásit na kurz:",
        radky: [`${c.nazev} (zvláštní vlak „${c.vlak}“)`, `${kdy}, ${cas}`, `Počet lidí: ${osob}`, `Cena: ${kc(celkem)} (${kc(c.cena)} za člověka)`],
        posledni: { text: `${DNY[d.datum.getDay()]} ${datumDlouze(d.datum)}, kurz ${c.nazev} · ${lidi(osob)} · ${kc(celkem)}`, den: iso(d.datum) },
      };
    }
    if (pasy.size) {
      const spoje = [...pasy].sort((a, b) => a - b);
      const pl = platnostPermanentky(d.datum);
      const pocet = pl.jizdy.filter((j) => !j.vyluka).length;
      const celkem = spoje.length * osob * P.cena;
      return {
        celkem,
        vypocet: `${spoje.length > 1 ? `${spoje.length} spoje × ` : ""}${lidi(osob)} × ${kc(P.cena)} na ${P.mesicu} měsíce`,
        kratce: `Permanentka ${NA_DNY[d.datum.getDay()]} · ${spojeSlovy(spoje)} · od ${datumKratce(d.datum)} · ${lidi(osob)} · ${kc(celkem)}`,
        predmet: `Permanentka ${NA_DNY[d.datum.getDay()]}: ${spojeSlovy(spoje)}, od ${datumRok(d.datum)}, ${lidi(osob)}`,
        uvod: "Ahoj, chci si pořídit permanentku do dílny:",
        radky: [
          `Den a spoj: ${KAZDY[d.datum.getDay()]}, ${spojeSlovy(spoje)}`,
          `Platnost: od ${datumRok(pl.od)} do ${datumRok(pl.do)} (${jizd(pocet)}; v den kurzu se nejede)`,
          `Počet lidí: ${osob}`,
          `Cena: ${kc(celkem)} (${kc(P.cena)} za člověka, jeden den v týdnu a jeden spoj)`,
        ],
        posledni: { text: `permanentka ${NA_DNY[d.datum.getDay()]}, ${spojeSlovy(spoje)}, od ${datumDlouze(pl.od)} do ${datumDlouze(pl.do)} · ${lidi(osob)} · ${kc(celkem)}`, den: iso(pl.do) },
      };
    }
    if (!vybrane.size) return null;
    const hodiny = [...vybrane];
    const celkem = hodiny.length * osob * cena;
    return {
      celkem,
      vypocet: `${hodin(hodiny.length)} × ${lidi(osob)} × ${kc(cena)}`,
      kratce: `${zkratka} · ${useky(hodiny)} · ${lidi(osob)} · ${kc(celkem)}`,
      predmet: `Rezervace: ${zkratka} ${d.datum.getFullYear()}, ${useky(hodiny)}, ${lidi(osob)}`,
      uvod: "Ahoj, chci si rezervovat hodinu v dílně:",
      radky: [`${kdy}, ${useky(hodiny)}`, `Počet lidí: ${osob}`, `Cena: ${kc(celkem)} (${kc(cena)} za člověka a hodinu)`],
      posledni: { text: `${DNY[d.datum.getDay()]} ${datumDlouze(d.datum)}, ${useky(hodiny)} · ${lidi(osob)} · ${kc(celkem)}`, den: iso(d.datum) },
    };
  };

  const souhrn = () => {
    const d = dny[den];
    const s = sepis();
    cenaEl.textContent = kc(s?.celkem ?? 0);
    if (vypocetEl) {
      vypocetEl.textContent = s?.vypocet ?? (d?.kurz ? `${kc(d.kurz.kurz.cena)} za člověka a celý den` : `${kc(cena)} za člověka a hodinu`);
    }
    if (odeslatPozn) {
      odeslatPozn.textContent =
        druh() === "kurz"
          ? "Otevře se e-mail s přihláškou na kurz. Místo ve vlaku platí, až ho potvrdíme."
          : druh() === "pas"
            ? "Otevře se e-mail s objednávkou permanentky. Platí, až ji potvrdíme."
            : "Otevře se e-mail s vybranými odjezdy. Jízdenka platí, až ji potvrdíme.";
    }
    if (displej && displejSouhrn) {
      displej.hidden = !s || jizdenkaVidet;
      displejSouhrn.textContent = s?.kratce ?? "";
    }
    if (!s) {
      odeslat.removeAttribute("href");
      odeslat.setAttribute("aria-disabled", "true");
      return;
    }
    const radky = [s.uvod, "", ...s.radky, "", `Jméno: ${jmenoEl.value.trim()}`, `Telefon: ${telEl.value.trim()}`];
    if (poznEl.value.trim()) radky.push(`Poznámka: ${poznEl.value.trim()}`);
    radky.push("", "Díky!");
    odeslat.href = `mailto:${email}?subject=${encodeURIComponent(s.predmet)}&body=${encodeURIComponent(radky.join("\n"))}`;
    odeslat.removeAttribute("aria-disabled");
  };

  odeslat.addEventListener("click", (e) => {
    e.preventDefault();
    const d = dny[den];
    const s = sepis();
    if (odeslat.getAttribute("aria-disabled") === "true" || !d || !s) {
      if (chybi) chybi.textContent = !d ? "Nejdřív vyber den." : d.kurz ? "Nejdřív nastup na tabuli do zvláštního vlaku." : "Nejdřív vyber aspoň jeden odjezd na tabuli.";
      return;
    }
    if (!jmenoEl.value.trim()) {
      if (chybi) chybi.textContent = "Napiš na jízdenku jméno, ať víme, koho čekat.";
      const pole = jmenoEl.closest(".rz-listek-jmeno");
      pole?.classList.remove("chybi");
      void (pole as HTMLElement | null)?.offsetWidth;
      pole?.classList.add("chybi");
      jmenoEl.focus();
      return;
    }
    if (chybi) chybi.textContent = "";
    const href = odeslat.href;
    jizdenka?.oznac();
    uloz(KLIC_POSLEDNI, s.posledni satisfies Posledni);
    ukazPosledni();
    window.setTimeout(() => {
      window.location.href = href;
    }, klid ? 0 : 1100);
  });

  const ukazPosledni = () => {
    if (!posledniEl) return;
    const p = nacti<Posledni | null>(KLIC_POSLEDNI, null);
    const platne = !!p && typeof p.text === "string" && typeof p.den === "string" && p.den >= iso(dnes);
    posledniEl.hidden = !platne;
    const t = posledniEl.querySelector(".rz-posledni-text");
    if (t && platne) t.textContent = p!.text;
  };

  jmenoEl.addEventListener("input", () => {
    if (chybi && jmenoEl.value.trim()) chybi.textContent = "";
    souhrn();
  });
  telEl.addEventListener("input", souhrn);
  poznEl.addEventListener("input", souhrn);

  koren.querySelectorAll<HTMLInputElement>('input[name="osoby"]').forEach((r) =>
    r.addEventListener("change", () => {
      /* Hodina je celá vaše, ať vás jede kolik chce — mění se jen cena a jízdenka.
         U kurzu a permanentky se ale počítají místa: když se nevejdete, jízdenka se vrátí. */
      osob = Number(r.value);
      zvuk.cink();
      const d = dny[den];
      let hlaseni = "";
      if (kurzVybran && d?.kurz && volnoVKurzu(d.kurz) < osob) {
        kurzVybran = false;
        hlaseni = `Ve zvláštním vlaku ${zbyvaMist(volnoVKurzu(d.kurz))} — všichni už se nevejdete, tak jsem vás zase vysadil.`;
      }
      for (const h of [...pasy]) {
        if (volnoNaSpoji({ pasObsazeno: pasDne(d) }, h) >= osob) continue;
        pasy.delete(h);
        hlaseni = `Na ${spojPermanentky(h)?.nazev ?? ""} spoj už není dost permanentek pro všechny — vyndal jsem ji z jízdenky.`;
      }
      if (!pasy.size && !vybrane.size) posledniVybrana = null;
      tabule?.zobraz(d, vyber(), false);
      tabule?.hlas(hlaseni);
      poZmene();
    }),
  );

  pasVolby.forEach((b) => b.addEventListener("click", () => prepniPermanentku(Number(b.dataset.pas))));

  /* Displej se schová, když je jízdenka na obrazovce */
  const sekceJizdenky = document.getElementById("rz-jizdenka");
  if (sekceJizdenky && displej) {
    new IntersectionObserver(([e]) => {
      jizdenkaVidet = e.isIntersecting;
      souhrn();
    }, { threshold: 0.12 }).observe(sekceJizdenky);
  }

  /* ——— Dnešek, příští volný odjezd a příští zvláštní vlak ——— */

  const nejblizsi = () => {
    for (let i = 0; i < dny.length; i++) {
      const h = volneHodiny(dny[i])[0];
      if (h) return { i, h: h.h };
    }
    return null;
  };
  const nejblizsiKurz = () => {
    const i = dny.findIndex((d) => d.kurz && volnoVKurzu(d.kurz) > 0);
    return i < 0 ? null : i;
  };

  const pristiKlapky = pristiEl ? [...pristiEl.querySelectorAll<HTMLElement>("[data-flap]")].map((el) => new Klapka(el)) : [];
  const pristiPopis = pristiEl?.querySelector<HTMLElement>(".rz-pristi-popis");
  let pristiUkazano = false;

  /** zaklapat — cedulka přeběhne na nové hodnoty; klapky = false nechá cedulku být (zaklape později) */
  const dnesek = (zaklapat = false, klapky = true) => {
    const ted = new Date();
    const dd = ted.getDay();
    const hod = ted.getHours() + ted.getMinutes() / 60;
    const dnesniKurz = dny.find((d) => d.klic === iso(ted))?.kurz;
    let veta: string;
    if (dnesniKurz) {
      veta = `Dnes je ${DNY[dd]} a jede zvláštní vlak: ${dnesniKurz.kurz.nazev}. Hodinové spoje mají výluku.`;
    } else if (R.dny.includes(dd) && hod < R.do) {
      veta = hod < R.od ? `Dnes je ${DNY[dd]} — dílna otevírá v ${R.od}:00.` : `Dnes je ${DNY[dd]} — dílna má otevřeno do ${R.do}:00.`;
    } else {
      veta = `Dnes je ${DNY[dd]}, dílna má zavřeno.`;
      for (let i = 1; i <= 7; i++) {
        const d = new Date(ted.getFullYear(), ted.getMonth(), ted.getDate() + i);
        if (R.dny.includes(d.getDay())) {
          veta += ` Příště otevírá ${V_DEN[d.getDay()]} ${datumDlouze(d)} v ${R.od}:00.`;
          break;
        }
      }
    }
    if (dnesEl) dnesEl.textContent = veta;

    if (pristiKurzEl) {
      const ik = nejblizsiKurz();
      pristiKurzEl.hidden = ik === null;
      if (ik !== null) {
        const d = dny[ik];
        const k = d.kurz!;
        const text = pristiKurzEl.querySelector<HTMLElement>(".rz-kurz-pristi-text");
        if (text) text.textContent = `${V_DEN[d.datum.getDay()]} ${datumDlouze(d.datum)} — ${k.kurz.nazev}, ${volnaMista(volnoVKurzu(k))} ${zPoctu(k.kurz.mist)}`;
      }
    }

    const n = nejblizsi();
    if (!pristiEl) return;
    pristiEl.hidden = !n;
    if (!n) return;
    const d = dny[n.i].datum;
    if (pristiPopis) pristiPopis.textContent = `: ${V_DEN[d.getDay()]} ${datumDlouze(d)} v ${n.h}:00 — vybrat a přejít k tabuli`;
    pristiEl.setAttribute("aria-label", `Příští volný odjezd ${V_DEN[d.getDay()]} ${datumDlouze(d)} v ${n.h}:00. Nastoupit — vybrat ho a přejít k tabuli`);
    if (!klapky) return;
    const hodnoty = [ZKR[d.getDay()], ...`${dvoj(d.getDate())}${dvoj(d.getMonth() + 1)}${dvoj(n.h)}00`.split("")];
    pristiKlapky.forEach((kl, i) => {
      const cil = hodnoty[i] ?? "";
      if (kl.hodnota === cil) return;
      if (zaklapat && !klid) window.setTimeout(() => kl.nastav(cil, kl.cislice ? cesta(kl.hodnota, cil) : ["Po", "St", "Čt"]), i * 45);
      else kl.okamzite(cil);
    });
    if (zaklapat && !klid) zvuk.klapky(10);
  };

  pristiEl?.addEventListener("click", () => {
    const n = nejblizsi();
    if (!n) return;
    if (den !== n.i) vyberDen(n.i);
    if (!vybrane.has(n.h)) prepniHodinu(n.h);
    document.getElementById("rz-odjezdy")?.scrollIntoView({ behavior: klid ? "auto" : "smooth", block: "start" });
    window.setTimeout(() => tabule?.zamer(n.h), klid ? 0 : 600);
  });

  /* Příští zvláštní vlak: otevře jeho den a sjede k ceduli — nastoupit už musí člověk sám */
  pristiKurzEl?.addEventListener("click", () => {
    const ik = nejblizsiKurz();
    if (ik === null) return;
    if (den !== ik) vyberDen(ik);
    zvuk.rozhlas();
    document.getElementById("rz-odjezdy")?.scrollIntoView({ behavior: klid ? "auto" : "smooth", block: "start" });
    window.setTimeout(() => tabule?.zamerKurz(), klid ? 0 : 600);
  });

  /* Cedulka v úvodu jednou zaklape, až je stránka načtená */
  if (pristiEl && !klid) {
    window.setTimeout(() => {
      if (pristiUkazano) return;
      pristiUkazano = true;
      dnesek(true);
    }, 900);
  }

  /* Rovnou otevřít první den, kde je volná hodina — a kdyby žádná nebyla, první, kde jde koupit aspoň něco */
  den = dny.findIndex((d) => volnych(d) > 0);
  if (den < 0) den = dny.findIndex(jdeVybrat);
  kresliDny();
  kresliPermanentky();
  rad?.obnov(den, vyber());
  tabule?.zobraz(dny[den], vyber(), false);
  obnovJizdenku(false);
  souhrn();
  dnesek(false, klid);
  ukazPosledni();
  nebeVychozi();
}

stranka("rezervace", () => {
  hlavicka();
  initNebe();
  initMore();
  init();
  spust();
});
