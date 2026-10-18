/**
 * Okno úrovně (components/zkouska/Uroven.astro) — rámec, ve kterém se hrají
 * všechny úrovně komnaty U mistra. Úroveň dostane prostředí (scripts/zkouska/
 * hra.ts): svou scénu, bublinu pro kami, zprávu, ukazatel a konec. Rámec
 * se stará o zbytek:
 *
 *   otevření    záhlaví, scéna úrovně, úvodní karta se zadáním
 *   Začít       pokus se započítá a hra běží
 *   konec       body → známka, zápis do postupu, razítko dopadne na
 *               výsledkovou kartu, povýšení, co na to kami
 *   Znovu       stará hra se zastaví a nová hned běží
 *   zavření     hra se zastaví a deska se dozví, co se změnilo
 *
 * Bublina kami se kreslí do okna, ne do <body> — dialog je v horní vrstvě
 * a všechno v <body> by bylo pod ním.
 *
 * Každá hra je samostatný kus skriptu a stáhne se, až se její úroveň
 * otevře (scéna je v HTML, takže pod úvodní kartou je vidět hned). Když
 * člověk klikne na Začít dřív, než je hra stažená, tlačítko ukáže
 * „Načítám…“ a hra se rozběhne sama, jakmile dorazí. Po prošlé úrovni
 * se potichu stáhne ta další, ať je „Další“ hned.
 */
import { urovne, urovenPodleId, znamky, znamkaZBodu, stupne, stupenPodlePoctu } from "../../data/mistr";
import type { UrovenId } from "../../data/mistr";
import { kamiInfo } from "../../data/kami";
import type { PostavaId } from "../../data/parta";
import { klid, omez } from "../parta2/stav";
import { jmeno } from "../parta2/kami";
import * as zvuk from "../parta2/zvuk";
import { schovej } from "../parta2/sber";
import { KLIC_NALEZENI } from "../parta2/zaves";
import { nacti } from "../parta2/stav";
import { priOdchodu, zaStranku } from "../parta2/prechody";
import type { Hra, Prostredi, Uroven, Vysledek } from "./hra";
import { pocitejPokus, zapisVysledek, zaznam, proslych, odemcena, jeMistrem } from "./postup";

/** Hry se stahují, až když jsou potřeba — každý import() je samostatný kus skriptu */
const HRY: Record<UrovenId, () => Promise<Uroven>> = {
  hrouda: () => import("./urovne/hrouda").then((m) => m.hrouda),
  hneteni: () => import("./urovne/hneteni").then((m) => m.hneteni),
  voda: () => import("./urovne/voda").then((m) => m.voda),
  tvar: () => import("./urovne/tvar").then((m) => m.tvar),
  rovina: () => import("./urovne/rovina").then((m) => m.rovina),
  jmeno: () => import("./urovne/jmeno").then((m) => m.jmeno),
  police: () => import("./urovne/police").then((m) => m.police),
  ohen: () => import("./urovne/ohen").then((m) => m.ohen),
  strep: () => import("./urovne/strep").then((m) => m.strep),
};
const stazene: Partial<Record<UrovenId, Uroven>> = {};
const stahuje: Partial<Record<UrovenId, Promise<Uroven>>> = {};

/** Hra úrovně: stažená, nebo se stáhne (jednou — další volání dostanou tentýž slib) */
function stahniHru(id: UrovenId): Promise<Uroven> {
  const hotova = stazene[id];
  if (hotova) return Promise.resolve(hotova);
  return (stahuje[id] ??= HRY[id]().then(
    (u) => (stazene[id] = u),
    (e: unknown) => {
      /* Nepovedlo se (bez sítě) — příště se zkusí znovu */
      delete stahuje[id];
      throw e;
    },
  ));
}

/** Okno se zavřelo — deska si dopočítá, co je nového, a posune figurku */
export const ZAVRENO = "mistr:zavreno";

let dialog: HTMLDialogElement | null = null;
let aktivni: UrovenId | null = null;
let hra: Hra | null = null;
/** Pokus, ke kterému patří prostředí — konec ze staré hry po „Znovu“ se nepočítá */
let pokus = 0;
let skoncila = false;
let bezi = false;
let poradiReplik = 0;
let bublina: HTMLElement | null = null;
let bublinaCas: number | undefined;
let zpravaCas: number | undefined;
/** Kolikáté otevření okna — stažení hry pro dřívější otevření se zahodí */
let otevreni = 0;
/** Hra se ještě stahuje / klepnutí na Začít čeká, až se stáhne / stažení selhalo */
let stahujeSe = false;
let cekaStart = false;
let chybaStazeni = false;

const $ = <T extends Element>(s: string) => dialog!.querySelector<T>(s)!;

/* ——— Bublina v okně ——— */

function zavriBublinu() {
  if (!bublina) return;
  const b = bublina;
  bublina = null;
  window.clearTimeout(bublinaCas);
  b.classList.add("pryc");
  window.setTimeout(() => b.remove(), 260);
}

function rekni(text: string, kotva: Element | null | undefined, kdo: PostavaId) {
  if (!dialog) return;
  zavriBublinu();
  const ram = $<HTMLElement>(".mu-ram");
  const el = kotva && ram.contains(kotva) ? kotva : $<HTMLElement>(".mu-kami");
  const b = document.createElement("div");
  b.className = "bublina mu-bublina";
  const j = document.createElement("span");
  j.className = "bublina-jmeno";
  j.textContent = jmeno(kdo);
  b.append(j, document.createTextNode(text));
  ram.append(b);

  const r = el.getBoundingClientRect();
  const rr = ram.getBoundingClientRect();
  const sirka = b.offsetWidth;
  const vyska = b.offsetHeight;
  const stred = r.left + r.width / 2 - rr.left;
  const left = omez(stred - sirka / 2, 8, rr.width - sirka - 8);
  let top = r.top - rr.top - vyska - 12;
  if (top < 6) {
    top = r.bottom - rr.top + 12;
    b.classList.add("dole");
  }
  b.style.left = `${left}px`;
  b.style.top = `${top}px`;
  b.style.setProperty("--ocasek", `${omez(stred - left, 22, Math.max(22, sirka - 22))}px`);
  bublina = b;
  bublinaCas = window.setTimeout(zavriBublinu, 3200 + text.length * 32);
}

function zprava(text: string) {
  const z = $<HTMLElement>(".mu-zprava");
  z.textContent = text;
  z.classList.remove("je");
  void z.offsetWidth;
  z.classList.add("je");
  window.clearTimeout(zpravaCas);
  zpravaCas = window.setTimeout(() => z.classList.remove("je"), 2600 + text.length * 25);
}

/* ——— Otevření a hra ——— */

const scena = (id: UrovenId) => $<HTMLElement>(`[data-uroven-scena="${id}"]`);

function prostredi(id: UrovenId, muj: number): Prostredi {
  const u = urovenPodleId(id);
  return {
    koren: scena(id),
    klid,
    rekni: (text, kotva, kdo) => {
      if (muj === pokus && aktivni === id) rekni(text, kotva, kdo ?? u.kdo);
    },
    zprava: (text) => {
      if (muj === pokus && aktivni === id) zprava(text);
    },
    ukazatel: (text) => {
      if (muj === pokus && aktivni === id) $<HTMLElement>(".mu-ukazatel").textContent = text;
    },
    konec: (v) => {
      if (muj === pokus && aktivni === id) dokonci(id, v);
    },
  };
}

/** Vytvoří hru úrovně znovu — scéna se uvede do výchozího stavu (hra musí být stažená) */
function nachystej(id: UrovenId) {
  hra?.stop();
  pokus++;
  skoncila = false;
  bezi = false;
  $<HTMLElement>(".mu-ukazatel").textContent = "";
  const u = stazene[id];
  if (!u) {
    hra = null;
    return;
  }
  try {
    hra = u(prostredi(id, pokus));
  } catch (e) {
    hra = null;
    console.error(e);
  }
}

/** Tlačítko Začít podle toho, jestli se na hru čeká */
function ukazZacit() {
  const b = $<HTMLButtonElement>(".mu-zacit");
  b.textContent = chybaStazeni ? "Zkusit znovu" : cekaStart ? "Načítám…" : "Začít";
  if (cekaStart) b.setAttribute("aria-busy", "true");
  else b.removeAttribute("aria-busy");
}

/**
 * Stáhne hru otevřené úrovně a nachystá ji. Volá se z otevření okna
 * a z klepnutí na Začít po neúspěšném stažení — vždycky za stránku, takže
 * pokračování po stažení obalí zaStranku (posluchače hry se po přechodu uklidí).
 */
function stahniANachystej(id: UrovenId) {
  const muj = otevreni;
  stahujeSe = true;
  chybaStazeni = false;
  ukazZacit();
  stahniHru(id).then(
    zaStranku(() => {
      if (muj !== otevreni || aktivni !== id || !dialog?.open) return;
      stahujeSe = false;
      nachystej(id);
      const start = cekaStart;
      cekaStart = false;
      ukazZacit();
      if (start) spust(id);
    }),
    zaStranku((e: unknown) => {
      if (muj !== otevreni || aktivni !== id) return;
      console.error(e);
      stahujeSe = false;
      cekaStart = false;
      chybaStazeni = true;
      ukazZacit();
      zprava("Hra se nestáhla. Zkontroluj připojení a zkus to znovu.");
    }),
  );
}

function spust(id: UrovenId) {
  if (!hra || bezi) return;
  bezi = true;
  pocitejPokus(id);
  $<HTMLElement>(".mu-uvod").hidden = true;
  $<HTMLElement>(".mu-vysledek").hidden = true;
  scena(id).inert = false;
  dialog!.classList.add("hraje");
  try {
    hra.start();
  } catch (e) {
    console.error(e);
  }
}

export function otevriUroven(id: UrovenId) {
  if (!dialog) return;
  const i = urovne.findIndex((u) => u.id === id);
  if (i < 0 || !odemcena(i)) return;
  const u = urovne[i];
  hra?.stop();
  hra = null;
  zavriBublinu();
  aktivni = id;
  otevreni++;
  cekaStart = false;
  chybaStazeni = false;

  /* Záhlaví */
  dialog.dataset.uroven = id;
  dialog.dataset.pas = String(Math.floor(i / 3));
  $<HTMLElement>(".mu-cislo").textContent = u.cislo;
  $<HTMLElement>(".mu-znak").textContent = u.znak;
  $<HTMLElement>(".mu-stanice").textContent = `${u.stanice} · ${u.cteni}`;
  $<HTMLElement>(".mu-nazev").textContent = u.nazev;
  /* Ukazatel minulé hry pryč hned — nestažená hra si ho nastaví až po stažení */
  $<HTMLElement>(".mu-ukazatel").textContent = "";
  dialog.querySelectorAll<HTMLElement>("[data-portret]").forEach((p) => (p.hidden = p.dataset.portret !== id));
  dialog.querySelectorAll<HTMLElement>("[data-uroven-scena]").forEach((s) => {
    s.hidden = s.dataset.urovenScena !== id;
    s.inert = true;
  });

  /* Úvodní karta */
  const z = zaznam(id);
  const stupen = stupne[Math.floor(i / 3)];
  $<HTMLElement>(".mu-uvod-stupen").innerHTML = `<span lang="ja">${stupen.znak}</span> · ${stupen.pas} · ${i + 1}. z ${urovne.length}`;
  $<HTMLElement>(".mu-uvod-nazev").textContent = `${u.cislo} ${u.nazev}`;
  $<HTMLElement>(".mu-uvod-zadani").textContent = u.zadani;
  $<HTMLElement>(".mu-uvod-ovladani").textContent = u.ovladani;
  $<HTMLElement>(".mu-uvod-vyborne").textContent = u.vyborne.replace(/^優,?\s*/, "");
  const nej = $<HTMLElement>(".mu-uvod-nejlepsi");
  nej.hidden = !z;
  if (z) nej.querySelector("dd")!.textContent = `${znamky[z.znamka].znak} ${znamky[z.znamka].nazev} · ${z.body} bodů`;
  $<SVGUseElement>(".mu-karta-razitko-use").setAttribute("href", `#mrz-${id}`);
  const karta = $<HTMLElement>(".mu-uvod .mu-karta");
  karta.classList.toggle("ma-razitko", !!z);
  karta.dataset.pas = String(Math.floor(i / 3));
  $<HTMLElement>(".mu-uvod").hidden = false;
  $<HTMLElement>(".mu-vysledek").hidden = true;
  dialog.classList.remove("hraje");

  if (stazene[id]) {
    stahujeSe = false;
    nachystej(id);
    ukazZacit();
  }
  if (!dialog.open) {
    dialog.showModal();
    document.documentElement.classList.add("mu-otevreno");
  }
  /* Nestažená hra se stahuje, až je okno otevřené (stažení kontroluje dialog.open) */
  if (!stazene[id]) stahniANachystej(id);
  $<HTMLButtonElement>(".mu-zacit").focus();
  window.setTimeout(() => rekni(u.uvod, null, u.kdo), klid ? 0 : 450);
}

/* ——— Konec hry ——— */

function dokonci(id: UrovenId, v: Vysledek) {
  if (skoncila) return;
  skoncila = true;
  bezi = false;
  hra?.stop();
  dialog!.classList.remove("hraje");
  scena(id).inert = true;
  const i = urovne.findIndex((u) => u.id === id);
  const u = urovne[i];
  const body = omez(Math.round(Number.isFinite(v.body) ? v.body : 0), 0, 100);
  const vysledek = $<HTMLElement>(".mu-vysledek");
  const karta = vysledek.querySelector<HTMLElement>(".mu-karta")!;
  const novinka = $<HTMLElement>(".mu-vysledek-novinka");
  karta.dataset.pas = String(Math.floor(i / 3));
  karta.classList.remove("proslo", "neproslo", "buch");
  novinka.hidden = true;

  let znamka = znamkaZBodu(body);
  if (v.proslo) {
    const predtim = proslych();
    const zapis = zapisVysledek(id, body, v.kus);
    znamka = zapis.znamka;
    const povyseni = stupenPodlePoctu(predtim) !== stupenPodlePoctu(proslych());
    karta.classList.add("proslo");
    $<SVGUseElement>(".mu-vysledek-razitko-use").setAttribute("href", `#mrz-${id}`);
    $<SVGUseElement>(".mu-vysledek-znamka-use").setAttribute("href", `#mrz-znamka-${znamka}`);
    $<HTMLElement>(".mu-vysledek-titul").innerHTML = `<span lang="ja">${znamky[znamka].znak}</span> ${znamky[znamka].nazev} <small>${body} bodů</small>`;
    const s = stupenPodlePoctu(proslych());
    const text = povyseni
      ? s === stupne[2]
        ? `Devět razítek. Síň mistra je otevřená — ${s.znak}.`
        : `Povýšení: ${s.znak} ${s.cteni} — tovaryšský stupeň.`
      : zapis.prvni
        ? `Razítko ${u.znak} je v sešitě.`
        : zapis.lepsiZnamka
          ? `Lepší známka: ${znamky[znamka].znak}.`
          : "";
    if (text) {
      novinka.textContent = text;
      novinka.hidden = false;
      novinka.classList.toggle("povyseni", povyseni);
    }
    /* Razítko dopadne, až se karta ukáže */
    window.setTimeout(() => {
      karta.classList.add("buch");
      zvuk.razitko();
      if (povyseni || zapis.prvni) window.setTimeout(() => zvuk.oslava(), 380);
    }, klid ? 0 : 420);
  } else {
    karta.classList.add("neproslo");
    $<HTMLElement>(".mu-vysledek-titul").innerHTML = `Ještě ne <small>${body} bodů</small>`;
    window.setTimeout(() => zvuk.zuch(), klid ? 0 : 300);
  }

  const dl = $<HTMLElement>(".mu-vysledek-udaje");
  dl.textContent = "";
  for (const [k, hodnota] of v.udaje.slice(0, 5)) {
    const radek = document.createElement("div");
    const dt = document.createElement("dt");
    dt.textContent = k;
    const dd = document.createElement("dd");
    dd.textContent = hodnota;
    radek.append(dt, dd);
    dl.append(radek);
  }
  $<HTMLElement>(".mu-vysledek-veta p").textContent = v.veta;
  $<HTMLElement>(".mu-vysledek-veta cite").textContent = jmeno(u.kdo);

  const dalsi = $<HTMLButtonElement>(".mu-dalsi");
  const nasledujici = urovne[i + 1];
  if (v.proslo && nasledujici) {
    dalsi.hidden = false;
    dalsi.textContent = `Další: ${nasledujici.cislo} ${nasledujici.stanice} →`;
    dalsi.dataset.kam = nasledujici.id;
    /* Další hra se potichu stáhne už teď, ať je po klepnutí na Další hned */
    stahniHru(nasledujici.id).catch(() => {});
  } else if (v.proslo && jeMistrem()) {
    dalsi.hidden = false;
    dalsi.textContent = "Do síně mistra →";
    dalsi.dataset.kam = "sin";
  } else dalsi.hidden = true;
  $<HTMLButtonElement>(".mu-znovu").textContent = v.proslo ? "Znovu, na lepší známku" : "Zkusit znovu";

  vysledek.hidden = false;
  (v.proslo && !dalsi.hidden ? dalsi : $<HTMLButtonElement>(".mu-znovu")).focus();
}

/* ——— Ovládání okna ——— */

/* Odchod ze stránky s otevřeným oknem (gesto zpět): close nepřijde, protože dialog
   zmizí s celou stránkou — hra se zastaví tady (i se zvukem kruhu nebo pece)
   a <html>, který přechod přežije, nesmí zůstat bez posuvníku */
priOdchodu(() => {
  hra?.stop();
  hra = null;
  bezi = false;
  skoncila = true;
  aktivni = null;
  cekaStart = false;
  bublina = null;
  document.documentElement.classList.remove("mu-otevreno");
});

export function initUrovne() {
  dialog = document.querySelector<HTMLDialogElement>(".mu-dialog");
  if (!dialog) return;
  const d = dialog;

  $<HTMLButtonElement>(".mu-zavrit").addEventListener("click", () => d.close());
  $<HTMLButtonElement>(".mu-na-desku").addEventListener("click", () => d.close());
  $<HTMLButtonElement>(".mu-zacit").addEventListener("click", () => {
    if (!aktivni) return;
    if (hra) {
      spust(aktivni);
      return;
    }
    /* Hra se ještě stahuje: rozběhne se sama, až dorazí. Po chybě se stahuje znovu. */
    if (!stahujeSe && !chybaStazeni) return;
    cekaStart = true;
    if (chybaStazeni) stahniANachystej(aktivni);
    else ukazZacit();
  });
  $<HTMLButtonElement>(".mu-znovu").addEventListener("click", () => {
    if (!aktivni) return;
    $<HTMLElement>(".mu-vysledek").hidden = true;
    zavriBublinu();
    nachystej(aktivni);
    spust(aktivni);
  });
  $<HTMLButtonElement>(".mu-dalsi").addEventListener("click", (e) => {
    const kam = (e.currentTarget as HTMLElement).dataset.kam;
    if (kam === "sin") {
      d.close();
      window.setTimeout(() => document.getElementById("sin")?.scrollIntoView({ behavior: klid ? "auto" : "smooth", block: "start" }), 60);
      return;
    }
    if (kam) otevriUroven(kam as UrovenId);
  });
  /* Kliknutí na kami v záhlaví: další replika z kami.ts */
  $<HTMLButtonElement>(".mu-kami").addEventListener("click", () => {
    if (!aktivni) return;
    const kdo = urovenPodleId(aktivni).kdo;
    const r = kamiInfo[kdo].repliky;
    rekni(r[poradiReplik++ % r.length], null, kdo);
    zvuk.reakce(kdo);
  });
  /* Bublinka schovaná v záhlaví Vody: najde se jako jinde po webu, jen nález se ohlásí
     tady v okně — proužek a bublina ze sber.ts by zůstaly pod dialogem */
  const bublinka = $<HTMLElement>(".mu-bublinka");
  const mela = () => nacti<string[]>(KLIC_NALEZENI, []).includes("bublinka");
  let uzMela = mela();
  bublinka.addEventListener("pointerdown", () => (uzMela = mela()));
  schovej(bublinka);
  bublinka.addEventListener("click", () => {
    const n = nacti<string[]>(KLIC_NALEZENI, []).length;
    zprava(uzMela ? "Bublinku už máš. Hledej dál!" : `Bublinka! Nalezeno ${n} z 9.`);
    if (!uzMela) rekni("Pšš! No jo, máš mě. Ale v příští hroudě budu zas.", bublinka, "bublinka");
    uzMela = true;
  });

  /* Mimo kartu se okno zavře jen tehdy, když se zrovna nehraje — ať to neschová omylem rozehranou hru */
  d.addEventListener("click", (e) => {
    if (e.target === d && !bezi) d.close();
  });
  d.addEventListener("cancel", (e) => {
    if (bezi && !window.confirm("Rozehraná úroveň skončí. Opravdu zpátky na desku?")) e.preventDefault();
  });
  d.addEventListener("close", () => {
    hra?.stop();
    hra = null;
    bezi = false;
    skoncila = true;
    zavriBublinu();
    d.classList.remove("hraje");
    document.documentElement.classList.remove("mu-otevreno");
    const id = aktivni;
    aktivni = null;
    document.dispatchEvent(new CustomEvent(ZAVRENO, { detail: { id } }));
  });
}
