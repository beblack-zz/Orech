/**
 * Ozashiki asobi s Vázičkou: Tora-tora (虎拳). Gejši baví hosty hrami
 * a tahle je kámen-nůžky-papír za skládací zástěnou: válečník Watōnai
 * přemůže tygra, tygr sní stařenu a stařena srovná válečníka, protože je
 * to jeho máma. Hraje se na tři výhry (data/pruvodce.ts, `ozashiki`).
 *
 * Panel uprostřed okna: zástěna s bambusovým hájem, za ní se při popěvku
 * „to-ra, to-ra“ (šamisen) obě strany rozhodnou a pak vyjdou — karta hosta
 * zleva, Vázičky zprava. Vázička u panelu stojí a mluví (průvodce,
 * pruvodce.ts: `ProHru`).
 *
 * Zlozvyk: když si na kolo vybere tygra, ovívá se, než host zvolí. Kdo si
 * toho všimne a dvakrát ji tím porazí (válečníkem), toho prokoukne a už se
 * neovívá. Nic se neukládá — hra platí, dokud je panel otevřený.
 */
import { ozashiki as T } from "../../data/pruvodce";
import type { Gesto, Replika, ToraKdo } from "../../data/pruvodce";
import { podobizna, zastena } from "./ozashiki-kresba";

/** Co hra potřebuje od průvodce */
export interface ProHru {
  /** Vázička řekne repliku (bublina, hlas, výraz, gesto) */
  rekni: (r: Replika) => void;
  gesto: (g: Gesto) => void;
  /** Zlozvyk: ovívá se, dokud se jí to nevypne */
  zlozvyk: (ano: boolean) => void;
  /** Doletí k panelu, zůstane u něj a řekne `uvod` */
  prilet: (panel: HTMLElement, uvod: Replika) => void;
  /** Hra skončila: vrátí se do rohu */
  odlet: () => void;
  zahraj: (z: Record<string, unknown>) => void;
  klidne: boolean;
}

const KDO: ToraKdo[] = ["watonai", "tora", "roba"];
const PORAZI: Record<ToraKdo, ToraKdo> = { watonai: "tora", tora: "roba", roba: "watonai" };
const NA_VYHRU = 3;
/** Kolikrát ji host musí porazit válečníkem, když se před tygrem ovívala, než ho prokoukne */
const PROKOUKNE = 2;
/** Popěvek „to-ra, to-ra“ na šamisen: stupeň stupnice (STUPNICE v beh.js) a kdy (s) */
const POPEVEK: [number, number][] = [[7, 0], [5, 0.18], [7, 0.36], [5, 0.54], [8, 0.74], [7, 0.96]];

export function toraTora(api: ProHru): { zavri: () => void } {
  const panel = document.createElement("div");
  panel.className = "ozashiki";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-labelledby", "ozashiki-titul");
  panel.setAttribute("aria-describedby", "ozashiki-podtitul");
  panel.innerHTML =
    `<div class="ozashiki-hlava"><div><p class="ozashiki-titul" id="ozashiki-titul">${T.titul} <span lang="ja">${T.znak}</span></p>` +
    `<p class="ozashiki-podtitul" id="ozashiki-podtitul">${T.podtitul}</p></div>` +
    `<button type="button" class="ozashiki-zavrit" aria-label="${T.zavrit}">×</button></div>` +
    `<div class="ozashiki-scena">${zastena()}<div class="ozashiki-karta tvoje" aria-hidden="true"></div><div class="ozashiki-karta jeji" aria-hidden="true"></div><p class="ozashiki-zpev" aria-hidden="true">${T.zpev}</p></div>` +
    `<p class="ozashiki-skore"></p><div class="ozashiki-volby"></div><div class="ozashiki-konec" hidden></div>`;
  const $ = <E extends HTMLElement>(s: string) => panel.querySelector<E>(s)!;
  const scena = $(".ozashiki-scena");
  const kartaTvoje = $(".ozashiki-karta.tvoje");
  const kartaJeji = $(".ozashiki-karta.jeji");
  const skore = $(".ozashiki-skore");
  const volby = $(".ozashiki-volby");
  const konecEl = $(".ozashiki-konec");

  const tlacitka = KDO.map((kdo) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "ozashiki-volba";
    b.setAttribute("aria-pressed", "false");
    const p = T.postavy[kdo];
    b.innerHTML = `${podobizna(kdo)}<span class="ozashiki-jmeno">${p.jmeno}</span><span class="ozashiki-jako">${p.jako}</span><span class="ozashiki-znak"><span lang="ja">${p.znak}</span> ${p.cteni}</span>`;
    b.addEventListener("click", () => vyber(kdo));
    volby.append(b);
    return b;
  });

  let ty = 0, ona = 0, jeji: ToraKdo = "tora", hraje = false, vyuzil = 0, prokouknuta = false;
  const casovace = new Set<number>();
  /** Časovač, který se po zavření hry zruší a mimo stránku nic neudělá */
  const za = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      casovace.delete(id);
      if (panel.isConnected) fn();
    }, ms);
    casovace.add(id);
  };

  const ukazSkore = () => {
    const body = (n: number) => Array.from({ length: NA_VYHRU }, (_, i) => `<span class="ozashiki-bod${i < n ? " plny" : ""}"></span>`).join("");
    skore.innerHTML =
      `<span class="ozashiki-hrac" aria-hidden="true">${T.ty} ${body(ty)}</span><span class="ozashiki-hrac" aria-hidden="true">${T.ona} ${body(ona)}</span>` +
      `<span class="pruvodce-hlas">${T.ty} ${ty}, ${T.ona} ${ona}</span>`;
  };
  const karta = (el: HTMLElement, kdo: ToraKdo) => {
    el.innerHTML = `${podobizna(kdo)}<span class="ozashiki-karta-jmeno">${T.postavy[kdo].jmeno}</span>`;
    el.classList.remove("vyhral", "prohral");
    el.classList.add("ven");
  };

  /** Nové kolo: vybere si potají — a když tygra, prozradí ji vějíř */
  const zacniKolo = () => {
    jeji = KDO[Math.floor(Math.random() * KDO.length)];
    hraje = false;
    kartaTvoje.classList.remove("ven");
    kartaJeji.classList.remove("ven");
    for (const b of tlacitka) {
      b.disabled = false;
      b.setAttribute("aria-pressed", "false");
    }
    api.zlozvyk(jeji === "tora" && !prokouknuta);
  };

  /** Host zvolil: popěvek, zástěna se zachvěje — a vyjdou */
  const vyber = (kdo: ToraKdo) => {
    if (hraje) return;
    hraje = true;
    api.zlozvyk(false);
    tlacitka.forEach((b, i) => {
      b.disabled = true;
      b.setAttribute("aria-pressed", String(KDO[i] === kdo));
    });
    scena.classList.add("zpiva");
    if (!api.klidne) for (const [vys, t] of POPEVEK) api.zahraj({ druh: "struna", vys, sila: 0.55, delka: 0.5, pan: 0.2, za: t, skupina: "vazicka" });
    za(() => odhal(kdo), api.klidne ? 60 : 1250);
  };

  const odhal = (kdo: ToraKdo) => {
    scena.classList.remove("zpiva");
    karta(kartaTvoje, kdo);
    karta(kartaJeji, jeji);
    const vysledek = kdo === jeji ? "remiza" : PORAZI[kdo] === jeji ? "host" : "ona";
    if (vysledek === "host") {
      ty++;
      kartaTvoje.classList.add("vyhral");
      kartaJeji.classList.add("prohral");
    } else if (vysledek === "ona") {
      ona++;
      kartaJeji.classList.add("vyhral");
      kartaTvoje.classList.add("prohral");
    }
    if (jeji === "tora" && kdo === "watonai" && !prokouknuta) vyuzil++;
    ukazSkore();
    const text =
      vysledek === "remiza"
        ? T.remiza[kdo]
        : `${T.souboj[vysledek === "host" ? `${kdo}-${jeji}` : `${jeji}-${kdo}`]} ${vysledek === "host" ? T.tvojeKolo : T.mojeKolo}`;
    /* podruhé poražená válečníkem, když se ovívala: místo věty ke kolu se přizná, že ji host prokoukl */
    const prokoukla = vyuzil >= PROKOUKNE && !prokouknuta;
    if (prokoukla) prokouknuta = true;
    api.rekni(prokoukla ? T.prokouknuta : { text, vyraz: vysledek === "host" ? "uzas" : vysledek === "ona" ? "mrk" : "kouka", gesto: "vejir" });
    if (ty >= NA_VYHRU || ona >= NA_VYHRU) return za(konec, 2400);
    za(zacniKolo, 1500);
  };

  /** Tři výhry: poslední slovo a nabídka další hry */
  const konec = () => {
    api.rekni(ty >= NA_VYHRU ? T.vyhralHost : T.vyhralaOna);
    volby.hidden = true;
    konecEl.hidden = false;
    konecEl.textContent = "";
    const znovu = document.createElement("button");
    znovu.type = "button";
    znovu.textContent = T.znovu;
    znovu.addEventListener("click", () => {
      ty = ona = 0;
      ukazSkore();
      konecEl.hidden = true;
      volby.hidden = false;
      zacniKolo();
      tlacitka[0].focus();
    });
    const dost = document.createElement("button");
    dost.type = "button";
    dost.textContent = T.dost;
    dost.addEventListener("click", zavri);
    konecEl.append(znovu, dost);
    znovu.focus();
  };

  const naKlavesu = (e: KeyboardEvent) => {
    if (e.key === "Escape") zavri();
  };
  function zavri() {
    if (!panel.isConnected) return;
    api.zlozvyk(false);
    casovace.forEach((id) => window.clearTimeout(id));
    casovace.clear();
    document.removeEventListener("keydown", naKlavesu);
    panel.remove();
    api.odlet();
  }
  $(".ozashiki-zavrit").addEventListener("click", zavri);
  document.addEventListener("keydown", naKlavesu);

  ukazSkore();
  document.body.append(panel);
  api.prilet(panel, T.pravidla);
  zacniKolo();
  tlacitka[0].focus({ preventScroll: true });
  return { zavri };
}
