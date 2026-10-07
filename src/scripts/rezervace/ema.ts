/**
 * ARCHIV pro /rezervace-ema (varianta s destičkami ema). Platná
 * rezervace je v scripts/rezervace/hlavni.ts.
 *
 * Rezervace: kolik vás bude → den → hodiny na tabuli → jméno → e-mail.
 *
 * Dny i tabule se kreslí tady, protože záleží na dnešku (statický build
 * by zestárl). Obsazenost je ze simulace (simulace.ts); za obsazená
 * místa visí destičky party a kliknutím se dá přečíst jejich přání.
 *
 * Obloha: sekce s tabulí má data-hodina, kterou tu přepisujeme podle
 * hodiny, na kterou člověk ukazuje (nebo kterou si vybral), a obloha
 * (parta2/nebe.ts) se k ní plynule stočí.
 */
import { spust, vyzadej, klid, nacti, uloz } from "../parta2/stav";
import { initNebe } from "../parta2/nebe";
import { initKami, rekni, jmeno } from "../parta2/kami";
import { hlavicka } from "../parta2/hlavicka";
import { initSbirka } from "../parta2/sbirka";
import { paleta } from "../parta2/paleta";
import * as zvuk from "../parta2/zvuk";
import { rezervace as R, prani } from "../../data/rezervace";
import { sekkiDne, DNY_ZNAK } from "../../data/koyomi";
import { sklonuj } from "../../data/pocty";
import { simuluj, nahoda, KAPACITA } from "./ema-simulace";
import type { Den, Hodina } from "./ema-simulace";
import type { PostavaId } from "../../data/parta";

const DNY = ["neděle", "pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota"];
const V_DEN = ["v neděli", "v pondělí", "v úterý", "ve středu", "ve čtvrtek", "v pátek", "v sobotu"];
const ZKR = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];
const MESICE = ["leden", "únor", "březen", "duben", "květen", "červen", "červenec", "srpen", "září", "říjen", "listopad", "prosinec"];
const MESICE_2 = ["ledna", "února", "března", "dubna", "května", "června", "července", "srpna", "září", "října", "listopadu", "prosince"];
const KLIC_POSLEDNI = "rezervace-posledni";

const kc = (n: number) => `${n.toLocaleString("cs-CZ")} Kč`;
const lidi = (n: number) => (n === 1 ? "1 člověk" : `${n} lidi`);
const mist = (n: number) => sklonuj(n, "místo", "místa", "míst");
const hodin = (n: number) => sklonuj(n, "hodina", "hodiny", "hodin");
const datumKratce = (d: Date) => `${d.getDate()}. ${d.getMonth() + 1}.`;
const datumDlouze = (d: Date) => `${d.getDate()}. ${MESICE_2[d.getMonth()]}`;
const praniKdo = Object.fromEntries(prani.map((p) => [p.kdo, p.text])) as Record<PostavaId, string>;

/** Kde stojí slunce v danou hodinu — stejný vzorec jako obloha (nebe.ts) */
const slunce = (h: number) => {
  const ts = (h - 5.3) / (20.4 - 5.3);
  const t = Math.min(1, Math.max(0, ts));
  return { x: 8 + 84 * t, y: 86 - Math.sin(Math.PI * t) * 64, videt: ts > 0 && ts < 1 };
};

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
  const deska = koren.querySelector<HTMLElement>(".rz-deska")!;
  const denNazev = koren.querySelector<HTMLElement>(".rz-den-nazev")!;
  const sekceNebe = koren.querySelector<HTMLElement>("[data-rz-nebe]");
  const jmenoEl = koren.querySelector<HTMLInputElement>('input[name="jmeno"]')!;
  const telEl = koren.querySelector<HTMLInputElement>('input[name="telefon"]')!;
  const poznEl = koren.querySelector<HTMLTextAreaElement>('textarea[name="poznamka"]')!;
  const velka = koren.querySelector<HTMLElement>(".rz-ema-velka")!;
  const sDen = koren.querySelector<HTMLElement>(".rz-s-den")!;
  const sHodiny = koren.querySelector<HTMLElement>(".rz-s-hodiny")!;
  const sLide = koren.querySelector<HTMLElement>(".rz-s-lide")!;
  const sVypocet = koren.querySelector<HTMLElement>(".rz-s-vypocet")!;
  const cenaEl = koren.querySelector<HTMLElement>(".rz-cena b")!;
  const odeslat = koren.querySelector<HTMLAnchorElement>(".rz-odeslat")!;
  const dnesEl = koren.querySelector<HTMLElement>(".rz-dnes");
  const nejblizsiEl = koren.querySelector<HTMLAnchorElement>("[data-rz-nejblizsi]");
  const posledniEl = koren.querySelector<HTMLElement>(".rz-posledni");
  const listek = document.querySelector<HTMLElement>(".rz-listek");
  const listekText = listek?.querySelector<HTMLElement>(".rz-listek-text");

  const dnes = new Date();
  dnes.setHours(0, 0, 0, 0);
  const dny = simuluj(dnes);
  let den = -1;
  let osob = 1;
  const vybrane = new Set<number>();
  let posledniVybrana: number | null = null;
  /** U kterého kami je na tabuli první destička — jen ta jde tabulátorem */
  let prvni = new Map<PostavaId, number>();
  let podpisVidet = false;

  const sbirka = initSbirka({
    klic: "rezervace-prani",
    ids: prani.map((p) => p.kdo),
    nazev: (id) => jmeno(id as PostavaId),
    popisTlacitka: (n, c) => `Přání party: přečteno ${n} z ${c}`,
    oznameni: (n, c) => (n === c ? " · všech devět přání přečteno!" : ` · přečteno ${n} z ${c}`),
    celaTrida: "je-vse-prani",
    oslava: {
      nadpis: "Všech devět přání!",
      text: "Teď víš, co si kdo v dílně přeje. Zbývá pověsit to tvoje.",
      obrazky: () => [...document.querySelectorAll(".rz-prani-dialog .omamori-obr svg")].map((s) => s.cloneNode(true) as Element),
    },
  });

  const volnych = (d: Den) => d.hodiny.filter((h) => !h.probehlo && h.volno >= osob).length;

  /* ——— Obloha podle hodiny ——— */

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
    const h = posledniVybrana ?? d?.hodiny.find((x) => !x.probehlo && x.volno >= osob)?.h ?? 10;
    nebeNa(h + 0.5);
  };

  /* ——— Dny: trhací kalendář ——— */

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
      const n = volnych(d);
      const pryc = d.hodiny.every((h) => h.probehlo);
      const stav = pryc ? "proběhlo" : "plno";
      const s = sekkiDne(d.datum);
      const b = document.createElement("button");
      b.type = "button";
      b.className = `rz-den den-${d.datum.getDay()}${n === 0 ? ` ${pryc ? "pryc" : "plno"}` : ""}`;
      b.disabled = n === 0;
      b.setAttribute("aria-pressed", String(i === den));
      b.innerHTML = `<span class="rz-den-krouzky" aria-hidden="true"><i></i><i></i></span>
        <span class="rz-den-znak" lang="ja" aria-hidden="true">${DNY_ZNAK[d.datum.getDay()]}</span>
        <span class="rz-den-tyden">${DNY[d.datum.getDay()]}</span>
        <b class="rz-den-cislo">${d.datum.getDate()}</b>
        <span class="rz-den-mesic">${MESICE_2[d.datum.getMonth()]}</span>
        <span class="rz-den-sekki"><span lang="ja">${s.znak}</span> ${s.cesky}</span>
        <small class="rz-den-volno">${n === 0 ? stav : `${hodin(n)} volno`}</small>`;
      b.setAttribute("aria-label", `${DNY[d.datum.getDay()]} ${datumDlouze(d.datum)}: ${n === 0 ? stav : `volno ${hodin(n)}`}`);
      b.addEventListener("click", () => {
        if (i !== den) vyberDen(i, true);
      });
      dnyEl.append(b);
    });
  };

  const vyberDen = (i: number, uzivatel = false) => {
    den = i;
    vybrane.clear();
    posledniVybrana = null;
    kresliDny();
    kresliDesku();
    souhrn();
    if (uzivatel) {
      zvuk.papir();
      dnyEl.querySelectorAll<HTMLButtonElement>(".rz-den")[i]?.focus();
    }
    nebeVychozi();
  };

  /* ——— Tabule s háčky ——— */

  const stavHodiny = (h: Hodina) =>
    h.probehlo ? "pryc" : h.volno === 0 ? "plno" : h.volno < osob ? "malo-pro-vas" : h.volno <= 2 ? "malo" : "volno";

  const hacek = (obsah: HTMLElement | null) => {
    const s = document.createElement("span");
    s.className = `rz-hacek${obsah ? "" : " prazdny"}`;
    s.innerHTML = `<svg class="rz-hacek-obr" viewBox="0 0 12 14" aria-hidden="true"><use href="#rz-hacek"/></svg>`;
    if (obsah) s.append(obsah);
    return s;
  };

  const emaKami = (kdo: PostavaId, h: number, k: number) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "rz-ema";
    b.dataset.kdo = kdo;
    b.dataset.sbirkaCil = kdo;
    b.setAttribute("aria-label", `Destička, na které je ${jmeno(kdo)}. Přečíst přání`);
    if (prvni.get(kdo) !== h) b.tabIndex = -1;
    if (sbirka.ma(kdo)) b.classList.add("nalezen");
    b.style.setProperty("--u", `${((nahoda(`${dny[den]?.klic}-${h}-u-${k}`) - 0.5) * 9).toFixed(1)}deg`);
    b.style.setProperty("--z", `${(-nahoda(`${h}-${k}`) * 4).toFixed(2)}s`);
    b.innerHTML = `<svg viewBox="0 0 60 64" aria-hidden="true"><use href="#rz-ema"/><use href="#rz-kami-${kdo}" x="8" y="20" width="44" height="44"/></svg>`;
    return b;
  };

  /** Cizí destička — přání se nečtou, tak jen klikyháky */
  const emaCizi = (h: number, k: number) => {
    const s = document.createElement("span");
    s.className = "rz-ema rz-ema-cizi";
    s.style.setProperty("--u", `${((nahoda(`${dny[den]?.klic}-${h}-u-${k}`) - 0.5) * 9).toFixed(1)}deg`);
    s.style.setProperty("--z", `${(-nahoda(`${h}-${k}`) * 4).toFixed(2)}s`);
    s.innerHTML = `<svg viewBox="0 0 60 64" aria-hidden="true"><use href="#rz-ema-psane"/></svg>`;
    return s;
  };

  const textMoje = (i: number) => (i === 0 ? jmenoEl.value.trim() || "ty" : `+${i}`);
  const velikostMoje = (t: string) => (t.length <= 4 ? 15 : t.length <= 6 ? 12.5 : t.length <= 9 ? 10.5 : 8.5);
  const emaMoje = (i: number, nova: boolean) => {
    const s = document.createElement("span");
    s.className = `rz-ema rz-ema-moje${nova ? " nova" : ""}`;
    s.style.setProperty("--z", `${(-i * 0.7).toFixed(1)}s`);
    s.innerHTML = `<svg viewBox="0 0 60 64" aria-hidden="true"><use href="#rz-ema"/><text x="30" y="46" text-anchor="middle" class="rz-ema-jmeno"></text></svg>`;
    const t = s.querySelector("text")!;
    const text = textMoje(i).slice(0, 12);
    t.textContent = text;
    t.setAttribute("font-size", String(velikostMoje(text)));
    return s;
  };

  const sloupec = (h: Hodina, nove = false) => {
    const stav = stavHodiny(h);
    const lze = stav === "volno" || stav === "malo";
    const mam = vybrane.has(h.h);
    const el = document.createElement("div");
    el.className = `rz-sloupec ${stav}${mam ? " vybrana" : ""}`;
    el.dataset.h = String(h.h);
    const nebe = paleta(h.h + 0.5).barvy;
    el.style.setProperty("--nebe-a", nebe[0]);
    el.style.setProperty("--nebe-b", nebe[1]);
    el.style.setProperty("--nebe-c", nebe[2]);
    const sl = slunce(h.h + 0.5);

    const b = document.createElement("button");
    b.type = "button";
    b.className = "rz-hodina";
    b.disabled = !lze;
    b.setAttribute("aria-pressed", String(mam));
    const popis = h.probehlo ? "už proběhlo" : h.volno === 0 ? "obsazeno" : h.volno < osob ? `jen ${mist(h.volno)}` : `volno ${mist(h.volno)}`;
    b.innerHTML = `<span class="rz-hodina-nebe" aria-hidden="true">${sl.videt ? `<i style="left:${sl.x.toFixed(1)}%;top:${sl.y.toFixed(1)}%"></i>` : ""}</span><b>${h.h}:00</b><small>${popis}</small>`;
    b.setAttribute("aria-label", `${h.h}:00 až ${h.h + 1}:00, ${popis}`);
    b.addEventListener("click", () => prepniHodinu(h.h));
    b.addEventListener("focus", () => nebeNa(h.h + 0.5));
    b.addEventListener("blur", nebeVychozi);
    el.addEventListener("pointerenter", () => nebeNa(h.h + 0.5));
    el.addEventListener("pointerleave", nebeVychozi);
    el.append(b);

    const hacky = document.createElement("div");
    hacky.className = "rz-hacky";
    h.kami.forEach((kdo, k) => hacky.append(hacek(kdo ? emaKami(kdo, h.h, k) : emaCizi(h.h, k))));
    if (mam) for (let i = 0; i < osob; i++) hacky.append(hacek(emaMoje(i, nove)));
    const zbyva = KAPACITA - h.kami.length - (mam ? osob : 0);
    for (let i = 0; i < zbyva; i++) hacky.append(hacek(null));
    el.append(hacky);
    return el;
  };

  const kresliDesku = () => {
    deska.textContent = "";
    const d = dny[den];
    if (!d) {
      denNazev.textContent = dny.length ? "Nejdřív vyber den." : "Na měsíc dopředu je všechno obsazené. Napiš nám a domluvíme se.";
      return;
    }
    const s = sekkiDne(d.datum);
    denNazev.innerHTML = `${DNY[d.datum.getDay()]} ${datumDlouze(d.datum)} <span class="rz-den-nazev-sekki"><span lang="ja">${s.znak}</span> ${s.cteni} · ${s.cesky}</span>`;
    prvni = new Map();
    for (const h of d.hodiny) for (const k of h.kami) if (k && !prvni.has(k)) prvni.set(k, h.h);
    for (const h of d.hodiny) deska.append(sloupec(h));
  };

  const obnovSloupec = (h: number) => {
    const d = dny[den];
    const hod = d?.hodiny.find((x) => x.h === h);
    const stary = deska.querySelector<HTMLElement>(`.rz-sloupec[data-h="${h}"]`);
    if (!hod || !stary) return;
    const novy = sloupec(hod, true);
    stary.replaceWith(novy);
    novy.querySelector<HTMLButtonElement>(".rz-hodina")?.focus({ preventScroll: true });
  };

  const prepniHodinu = (h: number) => {
    if (vybrane.has(h)) {
      vybrane.delete(h);
      posledniVybrana = vybrane.size ? Math.max(...vybrane) : null;
      zvuk.drevo(0.8);
    } else {
      vybrane.add(h);
      posledniVybrana = h;
      zvuk.drevo(1.15);
      window.setTimeout(() => zvuk.drevo(1.3), 90);
    }
    obnovSloupec(h);
    souhrn();
    nebeVychozi();
  };

  deska.addEventListener("click", (e) => {
    const b = (e.target as Element).closest<HTMLElement>(".rz-ema[data-kdo]");
    if (!b) return;
    const kdo = b.dataset.kdo as PostavaId;
    b.classList.remove("otoc");
    void b.offsetWidth;
    b.classList.add("otoc");
    zvuk.drevo(0.9);
    rekni(b, kdo, praniKdo[kdo]);
  });

  /* ——— Souhrn, lístek a e-mail ——— */

  /** Hodiny po sobě se slijí do jednoho úseku: 9:00–11:00, 14:00–15:00 */
  const useky = () => {
    const h = [...vybrane].sort((a, b) => a - b);
    const out: [number, number][] = [];
    for (const x of h) {
      const p = out[out.length - 1];
      if (p && p[1] === x) p[1] = x + 1;
      else out.push([x, x + 1]);
    }
    return out.map(([a, b]) => `${a}:00–${b}:00`).join(", ");
  };

  const souhrn = () => {
    const d = dny[den];
    const n = vybrane.size;
    const celkem = n * osob * cena;
    cenaEl.textContent = kc(celkem);
    sLide.textContent = lidi(osob);
    sDen.textContent = d ? `${DNY[d.datum.getDay()]} ${datumDlouze(d.datum)} ${d.datum.getFullYear()}` : "ještě nevybraný";
    sHodiny.textContent = n ? `${useky()} · ${hodin(n)}` : "ještě nevybrané";
    sVypocet.textContent = n ? `${hodin(n)} × ${lidi(osob)} × ${kc(cena)}` : `${kc(cena)} za člověka a hodinu`;

    const pripraveno = !!d && n > 0;
    if (listek && listekText) {
      listek.hidden = !pripraveno || podpisVidet;
      listekText.textContent = pripraveno && d ? `${ZKR[d.datum.getDay()]} ${datumKratce(d.datum)} · ${useky()} · ${lidi(osob)} · ${kc(celkem)}` : "";
    }
    if (!pripraveno || !d) {
      odeslat.removeAttribute("href");
      odeslat.setAttribute("aria-disabled", "true");
      return;
    }
    const kdy = `${DNY[d.datum.getDay()]} ${datumKratce(d.datum)} ${d.datum.getFullYear()}, ${useky()}`;
    const predmet = `Rezervace: ${ZKR[d.datum.getDay()]} ${datumKratce(d.datum)} ${d.datum.getFullYear()}, ${useky()}, ${lidi(osob)}`;
    const radky = [
      "Ahoj, chci si rezervovat hodinu v dílně:",
      "",
      kdy,
      `Počet lidí: ${osob}`,
      `Cena: ${kc(celkem)} (${kc(cena)} za člověka a hodinu)`,
      "",
      `Jméno: ${jmenoEl.value.trim()}`,
      `Telefon: ${telEl.value.trim()}`,
    ];
    if (poznEl.value.trim()) radky.push(`Poznámka: ${poznEl.value.trim()}`);
    radky.push("", "Díky!");
    odeslat.href = `mailto:${email}?subject=${encodeURIComponent(predmet)}&body=${encodeURIComponent(radky.join("\n"))}`;
    odeslat.removeAttribute("aria-disabled");
  };

  odeslat.addEventListener("click", (e) => {
    e.preventDefault();
    const d = dny[den];
    if (odeslat.getAttribute("aria-disabled") === "true" || !d) return;
    const href = odeslat.href;
    velka.classList.remove("odeslano");
    void velka.offsetWidth;
    velka.classList.add("odeslano");
    zvuk.razitko();
    window.setTimeout(() => zvuk.furin(1760), 180);
    const dvoj = (x: number) => String(x).padStart(2, "0");
    uloz(KLIC_POSLEDNI, {
      text: `${DNY[d.datum.getDay()]} ${datumDlouze(d.datum)}, ${useky()} · ${lidi(osob)} · ${kc(vybrane.size * osob * cena)}`,
      den: `${d.datum.getFullYear()}-${dvoj(d.datum.getMonth() + 1)}-${dvoj(d.datum.getDate())}`,
    } satisfies Posledni);
    ukazPosledni();
    window.setTimeout(() => {
      window.location.href = href;
    }, klid ? 0 : 750);
  });

  const ukazPosledni = () => {
    if (!posledniEl) return;
    const p = nacti<Posledni | null>(KLIC_POSLEDNI, null);
    const dvoj = (x: number) => String(x).padStart(2, "0");
    const dnesIso = `${dnes.getFullYear()}-${dvoj(dnes.getMonth() + 1)}-${dvoj(dnes.getDate())}`;
    const platne = !!p && typeof p.text === "string" && typeof p.den === "string" && p.den >= dnesIso;
    posledniEl.hidden = !platne;
    const t = posledniEl.querySelector(".rz-posledni-text");
    if (t && platne) t.textContent = p!.text;
  };

  /* Moje destičky na tabuli nesou jméno, jak se píše */
  jmenoEl.addEventListener("input", () => {
    const text = textMoje(0).slice(0, 12);
    deska.querySelectorAll(".rz-hacky").forEach((hacky) => {
      const t = hacky.querySelector(".rz-ema-moje text");
      if (!t) return;
      t.textContent = text;
      t.setAttribute("font-size", String(velikostMoje(text)));
    });
    souhrn();
  });
  telEl.addEventListener("input", souhrn);
  poznEl.addEventListener("input", souhrn);

  koren.querySelectorAll<HTMLInputElement>('input[name="osoby"]').forEach((r) =>
    r.addEventListener("change", () => {
      osob = Number(r.value);
      const d = dny[den];
      if (d) for (const h of d.hodiny) if (h.volno < osob) vybrane.delete(h.h);
      if (posledniVybrana !== null && !vybrane.has(posledniVybrana)) posledniVybrana = vybrane.size ? Math.max(...vybrane) : null;
      zvuk.cink();
      kresliDny();
      kresliDesku();
      souhrn();
      dnesek();
      nebeVychozi();
    }),
  );

  /* Lístek dole se schová, když je podpis na obrazovce */
  const podpis = document.getElementById("rz-podpis");
  if (podpis && listek) {
    new IntersectionObserver(([e]) => {
      podpisVidet = e.isIntersecting;
      souhrn();
    }, { threshold: 0.15 }).observe(podpis);
  }

  /* ——— Dnešek a nejbližší volná hodina ——— */

  const nejblizsi = () => {
    for (let i = 0; i < dny.length; i++) {
      const h = dny[i].hodiny.find((x) => !x.probehlo && x.volno >= osob);
      if (h) return { i, h: h.h };
    }
    return null;
  };

  const dnesek = () => {
    if (!dnesEl) return;
    const ted = new Date();
    const dd = ted.getDay();
    const hod = ted.getHours() + ted.getMinutes() / 60;
    let veta: string;
    if (R.dny.includes(dd) && hod < R.do) {
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
    const n = nejblizsi();
    if (n) veta += ` Nejbližší volná hodina: ${V_DEN[dny[n.i].datum.getDay()]} ${datumDlouze(dny[n.i].datum)} v ${n.h}:00.`;
    dnesEl.textContent = veta;
    if (nejblizsiEl) nejblizsiEl.hidden = !n;
  };

  nejblizsiEl?.addEventListener("click", () => {
    const n = nejblizsi();
    if (!n) return;
    if (den !== n.i) vyberDen(n.i);
    if (!vybrane.has(n.h)) prepniHodinu(n.h);
  });

  /* Rovnou otevřít první den, kde je něco volného */
  den = dny.findIndex((d) => volnych(d) > 0);
  kresliDny();
  kresliDesku();
  souhrn();
  dnesek();
  ukazPosledni();
  nebeVychozi();
}

hlavicka();
initKami();
initNebe();
init();
spust();
