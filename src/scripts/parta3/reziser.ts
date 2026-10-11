/**
 * Režisér divadla na /parta-3 (components/parta3/Divadlo.astro).
 *
 * Drží, kdo je na jevišti, tahá oponu, klape dřívky a pouští vystoupení:
 * choreografii ze scripts/parta3/vystoupeni přehraje herec (herec.js) tak,
 * že scéně posílá stejné události, jaké by dostala od myši. Scéna o divadle
 * neví — jen má háček `el.__scena` (v běhu každé podoby), kterým se dá
 * vrátit na začátek a přečíst její čas.
 *
 * Fáze: zavřeno → otevírá → hraje → volno (opona je rozhrnutá a scéna
 * patří divákovi) → zavírá. Všechno se řetězí přes setTimeout a snímkovou
 * smyčku, ne přes await — kód po await už by nepatřil stránce a po přechodu
 * jinam by běžel dál (viz parta2/prechody.ts).
 */
import { novyHerec } from "./herec.js";
import { vystoupeni } from "./vystoupeni/index.js";
import { ucinkujici, program, uzas, smich, dekuji } from "../../data/parta3";
import { parta } from "../../data/parta";
import { cesta } from "../../data/kami";
import type { PostavaId } from "../../data/parta";
import { klid, nacti, uloz, omez } from "../parta2/stav";
import { rekni } from "../parta2/kami";
import * as zvuk from "../parta2/zvuk";

type Faze = "zavreno" | "otevira" | "hraje" | "volno" | "zavira";
interface Scena {
  V: { zacatek?: number };
  stav: () => { t: number; dyn: unknown; vstup: { mys: unknown } };
  znovu: (bdi?: number) => number;
  stuj: (ano: boolean) => void;
}
type SPrvkem = HTMLElement & { __scena?: Scena };

const KLIC_VIDENO = "parta3-videno";
const KLIC_OHINERI = "parta3-ohineri";
/** Kolik papírků smí ležet na jevišti naráz */
const NA_JEVISTI = 26;
/** Jak dlouho trvá opona (musí sedět s přechodem v parta3.css) a kdy se při rozhrnování začne hrát */
const OPONA = { otevrit: 1900, zavrit: 900, nabeh: 1300 };
const CISLA = ["一", "二", "三"];

const jmeno = (id: PostavaId) => parta.find((p) => p.id === id)?.name ?? id;
const nahodne = <T>(pole: T[]) => pole[Math.floor(Math.random() * pole.length)];

export function initDivadlo() {
  const nalezen = document.querySelector<HTMLElement>("[data-divadlo]");
  if (!nalezen) return;
  const koren: HTMLElement = nalezen;
  const otvor = koren.querySelector<HTMLElement>(".jeviste-otvor")!;
  const stit = koren.querySelector<HTMLButtonElement>(".jeviste-stit")!;
  const titulky = koren.querySelector<HTMLElement>(".titulky-text")!;
  const prubeh = koren.querySelector<HTMLElement>(".prubeh span")!;
  const tlHraj = [...koren.querySelectorAll<HTMLButtonElement>("[data-hraj]")];
  const tlVecer = koren.querySelector<HTMLButtonElement>("[data-vecer]")!;
  const vrstvaOhineri = koren.querySelector<HTMLElement>(".ohineri")!;
  const lampiony = new Map<PostavaId, HTMLButtonElement>();
  koren.querySelectorAll<HTMLButtonElement>(".lampion").forEach((l) => lampiony.set(l.dataset.kdo as PostavaId, l));
  const kusy = new Map<string, HTMLElement>();
  koren.querySelectorAll<HTMLElement>(".kus").forEach((k) => kusy.set(k.dataset.kus!, k));

  let faze: Faze = "zavreno";
  /** Kde v programu večera právě jsme */
  let index = 0;
  /** Každá nová akce dostane číslo; rozdělané časovače starší akce se podle něj zahodí */
  let zeton = 0;
  let herec: ReturnType<typeof novyHerec> | null = null;
  let scena: Scena | null = null;
  let scenaEl: SPrvkem | null = null;
  let t0 = 0;
  let delka = 30;
  let vecer = false;
  const videno = new Set<string>(nacti<string[]>(KLIC_VIDENO, []));
  let ohineri = nacti<number>(KLIC_OHINERI, 0);

  const ted = () => program[index];
  const klic = (p = ted()) => `${p.kdo}/${p.kus}`;
  const kdo = (id: PostavaId) => ucinkujici.find((u) => u.id === id)!;
  const kusInfo = (p = ted()) => kdo(p.kdo).kusy.find((k) => k.id === p.kus)!;
  /** Časovač, který se po další akci sám zahodí */
  const po = (ms: number, fn: () => void) => {
    const z = zeton;
    return window.setTimeout(() => {
      if (z === zeton) fn();
    }, ms);
  };

  /* ——— Co je vidět ——— */

  const nastavFazi = (f: Faze) => {
    faze = f;
    koren.dataset.faze = f;
    stit.hidden = f !== "hraje" && f !== "otevira";
    const text = f === "hraje" || f === "otevira" ? "Zastavit" : f === "zavreno" ? "Rozhrnout oponu" : f === "zavira" ? "Chvilku…" : "Ještě jednou";
    for (const t of tlHraj) {
      const popis = t.querySelector(".ovl-hraj-text");
      if (popis) popis.textContent = text;
      else t.setAttribute("aria-label", text);
    }
  };
  const titulek = (text: string, tichy = false) => {
    titulky.textContent = text;
    titulky.parentElement!.classList.toggle("je-pokyn", tichy);
  };

  /** Postaví na jeviště kus podle `index`: scéna, lampion, program, mekuri. */
  const ukazKus = (listuj = true) => {
    const p = ted();
    const u = kdo(p.kdo);
    const k = kusInfo(p);
    for (const [id, el] of kusy) el.hidden = id !== klic(p);
    koren.classList.toggle("je-noc-kus", !!k.noc);
    for (const [id, l] of lampiony) l.setAttribute("aria-pressed", String(id === p.kdo));
    koren.querySelectorAll<HTMLElement>("[data-program]").forEach((a) => (a.hidden = a.dataset.program !== p.kdo));
    koren.querySelectorAll<HTMLElement>("[data-vyber]").forEach((b) => {
      if (b.dataset.vyber === klic(p)) b.setAttribute("aria-current", "true");
      else b.removeAttribute("aria-current");
    });
    koren.querySelector("[data-ted-kdo]")!.textContent = jmeno(p.kdo);
    koren.querySelector("[data-ted-kus]")!.textContent = k.nazev;
    koren.querySelector("[data-ted-poradi]")!.textContent = String(index + 1);

    const mekuri = koren.querySelector<HTMLElement>(".mekuri-list");
    if (mekuri) {
      const z = cesta.find((c) => c.id === p.kdo)!;
      const prepis = () => {
        mekuri.querySelector(".mekuri-cislo")!.textContent = CISLA[u.kusy.indexOf(k)] ?? "";
        mekuri.querySelector(".mekuri-znak")!.textContent = z.znak;
        mekuri.querySelector(".mekuri-jmeno")!.textContent = jmeno(p.kdo);
        mekuri.querySelector(".mekuri-kus")!.textContent = k.nazev;
      };
      if (listuj && !klid) {
        mekuri.classList.remove("listuje");
        void mekuri.offsetWidth;
        mekuri.classList.add("listuje");
        zvuk.papir();
        window.setTimeout(prepis, 240);
      } else prepis();
    }
    scenaEl = kusy.get(klic(p))?.firstElementChild as SPrvkem | null;
  };

  const ukazVideno = () => {
    koren.querySelectorAll<HTMLElement>("[data-vyber]").forEach((b) => b.classList.toggle("je-videno", videno.has(b.dataset.vyber!)));
    for (const u of ucinkujici) lampiony.get(u.id)?.classList.toggle("je-cely", u.kusy.every((k) => videno.has(`${u.id}/${k.id}`)));
    const pocet = program.filter((p) => videno.has(klic(p))).length;
    koren.querySelector("[data-videno]")!.textContent = String(pocet);
    const vse = pocet === program.length;
    koren.querySelector<HTMLElement>(".vyprodano")!.hidden = !vse;
    koren.classList.toggle("je-vyprodano", vse);
    return vse;
  };

  /* ——— Opona a dřívka ——— */

  /** Dřívka: nejdřív pomalu, pak čím dál rychleji, a na konec jedna rána zvlášť. */
  const klapej = (doba: number) => {
    let cas = 0;
    let krok = 420;
    while (cas < doba - 260) {
      const sila = 0.5 + 0.5 * (cas / doba);
      po(cas, () => zvuk.ki(sila));
      cas += krok;
      krok = Math.max(70, krok * 0.78);
    }
    po(doba, () => zvuk.ki(1.25));
  };

  const otevri = (pak?: () => void) => {
    nastavFazi("otevira");
    koren.classList.remove("je-zavreno");
    zvuk.latka();
    po(klid ? 0 : OPONA.otevrit, () => {
      if (faze === "otevira") nastavFazi(herec ? "hraje" : "volno");
      pak?.();
    });
  };
  const zavri = (pak: () => void) => {
    nastavFazi("zavira");
    koren.classList.add("je-zavreno");
    zvuk.latka();
    po(klid ? 0 : OPONA.zavrit, () => {
      nastavFazi("zavreno");
      pak();
    });
  };

  /* ——— Vystoupení ——— */

  /** Událost ukazatele v jednotkách kresby (0–180) rovnou na scénu; nebublá, ať si jí nevšimne zbytek stránky. */
  const posli = (typ: string, x: number, y: number) => {
    const el = scenaEl;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.dispatchEvent(new PointerEvent(typ, { bubbles: false, cancelable: true, pointerId: 1, pointerType: "mouse", isPrimary: true, clientX: r.left + (x / 180) * r.width, clientY: r.top + (y / 180) * r.height }));
  };
  const ven = {
    ukaz: (x: number, y: number) => posli("pointermove", x, y),
    stiskni: (x: number, y: number) => posli("pointerdown", x, y),
    /* pouští se přes pointercancel: scény ho berou stejně jako pointerup, ale stránka na něj neodemyká zvuk */
    pust: (x: number, y: number) => posli("pointercancel", x, y),
    pryc: () => posli("pointerleave", -20, -20),
    titulek: (text: string) => titulek(text),
    ohlas: (typ: string) => hlediste(typ),
  };

  const zastavHerce = () => {
    herec?.zastav();
    herec = null;
  };
  /** Scéna, která čekala za oponou, se zase rozběhne (když se obřad přeruší dřív, než se začne hrát). */
  const pustScenu = () => scenaEl?.__scena?.stuj(false);

  /** Pustí choreografii od začátku. Když scéna ještě neběží (skript se nenačetl), chvíli počká. */
  const spustVystoupeni = (pokus = 0) => {
    const p = ted();
    const zapis = (vystoupeni as Record<string, Record<string, { delka: number; hraj: (h: unknown) => Generator }>>)[p.kdo]?.[p.kus];
    scena = scenaEl?.__scena ?? null;
    if (!scena && pokus < 25) {
      po(120, () => spustVystoupeni(pokus + 1));
      return;
    }
    zastavHerce();
    if (!scena || !zapis) {
      scena?.stuj(false);
      titulek("Jeviště je tvoje. Zkus na něj kliknout.", true);
      if (faze === "hraje") nastavFazi("volno");
      return;
    }
    delka = zapis.delka;
    t0 = scena.znovu(delka + 14);
    scena.stuj(false);
    const s = scena;
    herec = novyHerec(zapis, { V: s.V, stav: () => ({ ...s.stav(), t: s.stav().t - t0 }) }, ven);
    prubeh.style.transform = "scaleX(0)";
    if (faze !== "otevira") nastavFazi("hraje");
    requestAnimationFrame(tik);
  };

  const tik = () => {
    const h = herec;
    if (!h || !scena) return;
    const rel = scena.stav().t - t0;
    /* ukazatel má zůstat tam, kde ho herec nechal, i když se o scénu mezitím otřela opravdová myš */
    if (h.kurzor && !scena.stav().vstup.mys) ven.ukaz(h.kurzor.x, h.kurzor.y);
    const hraje = h.krok(rel);
    prubeh.style.transform = `scaleX(${omez(rel / delka).toFixed(4)})`;
    if (herec !== h) return;
    if (!hraje) {
      herec = null;
      dohrano();
      return;
    }
    requestAnimationFrame(tik);
  };

  const dohrano = () => {
    const p = ted();
    prubeh.style.transform = "scaleX(1)";
    nastavFazi("volno");
    videno.add(klic(p));
    uloz(KLIC_VIDENO, [...videno]);
    const vse = ukazVideno();
    hlediste("konec");
    const posledni = index === program.length - 1;
    if (vse && !koren.dataset.oslaveno) {
      koren.dataset.oslaveno = "1";
      po(1600, oslava);
    }
    if (vecer && !posledni) {
      titulek(`Potlesk. Za chvíli: ${jmeno(program[index + 1].kdo)}.`, true);
      po(4200, () => predstav(index + 1));
    } else {
      if (vecer) nastavVecer(false);
      titulek(posledni && vse ? "Derniéra. Jeviště je tvoje." : "Jeviště je tvoje. Scéna reaguje na myš i na prst.", true);
    }
  };

  /** Celý obřad kolem jednoho kusu: zatáhnout, vyměnit scénu, zaklapat, rozhrnout a hrát. */
  const predstav = (novy: number) => {
    zeton++;
    zastavHerce();
    const dal = () => {
      pustScenu();
      index = (novy + program.length) % program.length;
      ukazKus();
      /* za oponou čeká scéna na prvním snímku — hrát se začne, až bude vidět */
      const s = scenaEl?.__scena;
      s?.znovu(0);
      s?.stuj(true);
      const p = ted();
      titulek(`${jmeno(p.kdo)}: ${kusInfo(p).nazev}`, true);
      const ohlaseni = klid ? 0 : 1500;
      if (ohlaseni) klapej(ohlaseni);
      po(ohlaseni, () => {
        otevri();
        po(klid ? 0 : OPONA.nabeh, () => spustVystoupeni());
      });
    };
    if (faze === "zavreno") dal();
    else zavri(dal);
  };

  /** Bez opony: ten samý kus znovu od začátku. */
  const znovu = () => {
    zeton++;
    zvuk.ki(1);
    nastavFazi("hraje");
    spustVystoupeni();
  };

  const zastav = () => {
    zeton++;
    zastavHerce();
    pustScenu();
    if (vecer) nastavVecer(false);
    if (faze === "hraje" || faze === "otevira") {
      koren.classList.remove("je-zavreno");
      nastavFazi("volno");
    }
    titulek("Hraješ ty. Scéna reaguje na myš i na prst.", true);
  };

  const nastavVecer = (ano: boolean) => {
    vecer = ano;
    tlVecer.setAttribute("aria-pressed", String(ano));
  };

  /* ——— Hlediště: lampiony ostatních se houpou a občas něco zavolají ——— */

  const zhoupni = (l: HTMLElement, zpozdeni = 0) => {
    window.setTimeout(() => {
      l.classList.remove("houpne");
      void l.offsetWidth;
      l.classList.add("houpne");
      /* po zhoupnutí se vrátí k pomalému kývání ve větru */
      window.setTimeout(() => l.classList.remove("houpne"), 980);
    }, zpozdeni);
  };
  const divaci = () => ucinkujici.map((u) => u.id).filter((id) => id !== ted().kdo);
  function hlediste(typ: string) {
    const ostatni = divaci();
    const jeden = nahodne(ostatni);
    const lamp = lampiony.get(jeden)!;
    if (typ === "volani") {
      zhoupni(lamp);
      rekni(lamp, jeden, nahodne(kdo(jeden).volani));
      zvuk.reakce(jeden);
    } else if (typ === "uzas") {
      ostatni.forEach((id, i) => zhoupni(lampiony.get(id)!, i * 40));
      rekni(lamp, jeden, nahodne(uzas));
      zvuk.furin(1568, 0.08);
      window.setTimeout(() => zvuk.furin(2349.3, 0.08), 110);
    } else if (typ === "smich") {
      ostatni.forEach((id, i) => zhoupni(lampiony.get(id)!, i * 55));
      rekni(lamp, jeden, nahodne(smich));
      for (let i = 0; i < 4; i++) window.setTimeout(() => zvuk.cink(), i * 90);
    } else if (typ === "potlesk") {
      ostatni.forEach((id, i) => zhoupni(lampiony.get(id)!, i * 30));
      zvuk.potlesk(1.6, 0.8);
    } else if (typ === "konec") {
      ostatni.forEach((id, i) => zhoupni(lampiony.get(id)!, i * 30));
      zvuk.potlesk(3, 1);
      /* po potlesku někdo něco zavolá a z hlediště přiletí pár ohineri */
      window.setTimeout(() => {
        rekni(lamp, jeden, nahodne(kdo(jeden).volani));
        zhoupni(lamp);
      }, 700);
      for (let i = 0; i < 3; i++) window.setTimeout(() => hod(lampiony.get(nahodne(ostatni))!, false), 500 + i * 380);
    }
  }

  /* ——— Ohineri: mince v papírku, hozená na jeviště ——— */

  const polozOhineri = (x: number, y: number, uhel: number) => {
    const o = document.createElement("i");
    o.className = "ohineri-kus lezi";
    o.style.left = `${x.toFixed(1)}%`;
    o.style.top = `${y.toFixed(1)}%`;
    o.style.setProperty("--u", `${uhel.toFixed(0)}deg`);
    vrstvaOhineri.append(o);
    while (vrstvaOhineri.children.length > NA_JEVISTI) vrstvaOhineri.firstElementChild!.remove();
    return o;
  };
  /** Hodí papírek od prvku `odkud` na prkna. `pocitat` = hodil ho divák (ne hlediště). */
  function hod(odkud: Element, pocitat: boolean) {
    const r = otvor.getBoundingClientRect();
    const z = odkud.getBoundingClientRect();
    const x = 10 + Math.random() * 80;
    const y = 90 + Math.random() * 7;
    const o = polozOhineri(x, y, Math.random() * 360);
    if (!klid && r.width > 0) {
      o.classList.remove("lezi");
      /* odkud letí, v pixelech od místa dopadu */
      o.style.setProperty("--dx", `${(z.left + z.width / 2 - (r.left + (x / 100) * r.width)).toFixed(0)}px`);
      o.style.setProperty("--dy", `${(z.top + z.height / 2 - (r.top + (y / 100) * r.height)).toFixed(0)}px`);
      o.classList.add("leti");
      window.setTimeout(() => {
        o.classList.remove("leti");
        o.classList.add("lezi");
        zvuk.ohineri();
      }, 620);
    } else zvuk.ohineri();
    if (!pocitat) return;
    ohineri++;
    uloz(KLIC_OHINERI, ohineri);
    koren.querySelector("[data-ohineri]")!.textContent = String(ohineri);
    if (ohineri % 5 === 0 || ohineri === 1) {
      const jeden = nahodne(ucinkujici).id;
      window.setTimeout(() => {
        rekni(lampiony.get(jeden)!, jeden, nahodne(dekuji));
        zhoupni(lampiony.get(jeden)!);
      }, 700);
    }
  }

  /* ——— Vyprodáno: papírový sníh kamifubuki ——— */

  const oslava = () => {
    zvuk.oslava();
    if (klid) return;
    const snih = koren.querySelector<HTMLElement>(".snih")!;
    const barvy = ["#FFFDF6", "#F2B5C4", "#F3D27A", "#FFFDF6", "#C4432B"];
    for (let i = 0; i < 70; i++) {
      const s = document.createElement("i");
      s.style.left = `${(Math.random() * 100).toFixed(1)}%`;
      s.style.setProperty("--d", `${(2.6 + Math.random() * 2.6).toFixed(2)}s`);
      s.style.setProperty("--z", `${(Math.random() * 2.4).toFixed(2)}s`);
      s.style.setProperty("--dx", `${((Math.random() - 0.5) * 120).toFixed(0)}px`);
      s.style.setProperty("--r", `${(360 + Math.random() * 720).toFixed(0)}deg`);
      s.style.background = barvy[i % barvy.length];
      snih.append(s);
      window.setTimeout(() => s.remove(), 7600);
    }
  };

  /* ——— Ovládání ——— */

  for (const t of tlHraj) {
    t.addEventListener("click", () => {
      if (faze === "zavreno") predstav(index);
      else if (faze === "hraje" || faze === "otevira") zastav();
      else if (faze === "volno") znovu();
    });
  }
  koren.querySelectorAll<HTMLButtonElement>("[data-krok]").forEach((b) => b.addEventListener("click", () => predstav(index + Number(b.dataset.krok))));
  for (const [id, l] of lampiony) {
    l.addEventListener("click", () => {
      /* lampion vede na první kus, který člověk od té postavičky ještě neviděl */
      const jeji = program.map((p, i) => ({ p, i })).filter((x) => x.p.kdo === id);
      const dalsi = ted().kdo === id ? jeji.find((x) => x.i > index) ?? jeji[0] : jeji.find((x) => !videno.has(klic(x.p))) ?? jeji[0];
      predstav(dalsi.i);
    });
  }
  koren.querySelectorAll<HTMLButtonElement>("[data-vyber]").forEach((b) =>
    b.addEventListener("click", () => {
      const i = program.findIndex((p) => klic(p) === b.dataset.vyber);
      if (i >= 0) predstav(i);
      koren.querySelector(".jeviste")?.scrollIntoView({ behavior: klid ? "auto" : "smooth", block: "center" });
    }),
  );
  tlVecer.addEventListener("click", () => {
    nastavVecer(!vecer);
    if (vecer && faze !== "hraje" && faze !== "otevira") predstav(faze === "zavreno" ? index : index + 1);
  });
  koren.querySelector<HTMLButtonElement>("[data-hod]")!.addEventListener("click", (e) => hod(e.currentTarget as Element, true));
  /* klepnutí na jeviště během vystoupení: divák si bere scénu a to klepnutí už patří jí */
  stit.addEventListener("pointerdown", (e) => {
    zastav();
    const el = scenaEl;
    if (!el) return;
    el.dispatchEvent(new PointerEvent("pointermove", { bubbles: false, pointerId: e.pointerId, pointerType: e.pointerType, clientX: e.clientX, clientY: e.clientY }));
    el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: false, pointerId: e.pointerId, pointerType: e.pointerType, clientX: e.clientX, clientY: e.clientY }));
  });
  stit.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      zastav();
    }
  });

  /* ——— Začátek ——— */

  koren.classList.add("je-zavreno", "ma-rezisera");
  nastavFazi("zavreno");
  ukazKus(false);
  ukazVideno();
  koren.querySelector("[data-ohineri]")!.textContent = String(ohineri);
  /* co divák naházel minule, na prknech zůstalo */
  for (let i = 0; i < Math.min(ohineri, 14); i++) polozOhineri(8 + ((i * 37) % 84), 90 + ((i * 13) % 7), i * 67);

  /* opona se poprvé rozhrne sama, jakmile je jeviště pořádně vidět */
  if (!klid) {
    let uz = false;
    new IntersectionObserver(
      (z) => {
        if (uz || !z[0].isIntersecting) return;
        uz = true;
        if (faze === "zavreno") predstav(index);
      },
      { threshold: 0.75 },
    ).observe(otvor);
  }
}
