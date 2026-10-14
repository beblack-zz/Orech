/**
 * Síň mistra (components/zkouska/Sin.astro) ve třech stavech:
 *
 *   zamceno   chybí razítka — krabice s fialovou šňůrou, kolik ještě chybí
 *   obrad     všech devět — jméno na list, oslovení, pečeť z šesté úrovně;
 *             po převzetí se svitek rozvine, razítka dopadnou jedno po
 *             druhém a parta se podepíše
 *   mistr     list visí ve výklenku: stáhnout, vytisknout, změnit jméno
 *
 * Titul se ukládá přes scripts/parta2/mistr.ts — od té chvíle oslovuje
 * parta mistra po celém webu. Známky na listu jsou ty nejlepší, jaké kdy
 * byly; když se úroveň potom zlepší, list se přepíše sám.
 */
import { urovne, znamky, osloveni, poradiZnamky } from "../../data/mistr";
import type { OsloveniId, UrovenId, Znamka } from "../../data/mistr";
import { klid } from "../parta2/stav";
import * as zvuk from "../parta2/zvuk";
import { mistr, ulozMistra } from "../parta2/mistr";
import type { Mistr } from "../parta2/mistr";
import { kusSvg } from "../../components/dilna/kus";
import { pecetSvg, vychoziPecet, stylyPeceti, tvaryPeceti } from "../../components/zkouska/pecet";
import { nactiPostup, zaznam, jeMistrem, proslych, nactiPecet, nactiJmeno, ulozJmeno, ZMENA } from "./postup";
import { datumCesky, datumJaponsky, rokJaponsky } from "./datum";
import { stahniList } from "./list-obrazek";
import { ZAVRENO } from "./uroven";

/** Nejlepší známky: co je na listu, nebo lepší z postupu */
function nejlepsiZnamky(m: Mistr | null) {
  const vysledek: Partial<Record<UrovenId, Znamka>> = { ...(m?.znamky ?? {}) };
  for (const u of urovne) {
    const z = zaznam(u.id)?.znamka;
    const byla = vysledek[u.id];
    if (z && (!byla || poradiZnamky[z] < poradiZnamky[byla])) vysledek[u.id] = z;
  }
  return vysledek;
}

function oslava() {
  const vrstva = document.createElement("div");
  vrstva.className = "oslava";
  for (let i = 0; i < 70; i++) {
    const p = document.createElement("span");
    p.className = "oslava-platek";
    p.style.left = `${Math.random() * 100}%`;
    p.style.setProperty("--d", `${4 + Math.random() * 4}s`);
    p.style.setProperty("--z", `${Math.random() * 2.5}s`);
    p.style.setProperty("--dx", `${(Math.random() - 0.5) * 300}px`);
    p.style.setProperty("--r", `${Math.random() * 720 - 360}deg`);
    p.style.background = ["#F2B8B4", "#EBA9A6", "#F7CFCB", "#F3D27A", "#D6A23A"][i % 5];
    vrstva.append(p);
  }
  document.body.append(vrstva);
  window.setTimeout(() => vrstva.remove(), 9000);
}

export function initSin() {
  const sin = document.querySelector<HTMLElement>(".msn");
  if (!sin) return;
  const obrad = sin.querySelector<HTMLFormElement>(".msn-obrad")!;
  const vstup = obrad.querySelector<HTMLInputElement>('input[name="jmeno"]')!;
  const stahuje = sin.querySelector<HTMLElement>(".msn-stahuje")!;
  const listEl = sin.querySelector<HTMLElement>(".mls")!;
  let uprava = false;

  const pecetHrace = (jmeno: string) => nactiPecet() ?? vychoziPecet(jmeno);

  const vyplnList = (m: Mistr) => {
    const zn = nejlepsiZnamky(m);
    listEl.querySelector(".mls-jmeno-text")!.textContent = m.jmeno;
    const p = pecetHrace(m.jmeno);
    listEl.querySelector(".mls-pecet")!.innerHTML = pecetSvg(p, { id: "mls-pecet" });
    listEl.querySelector(".mls-titul-text")!.textContent = osloveni[m.osloveni].z;
    for (const u of urovne) {
      const li = listEl.querySelector<HTMLElement>(`[data-list-razitko="${u.id}"]`)!;
      const z = zn[u.id];
      li.classList.toggle("je", !!z);
      li.querySelector(".mls-znamka use")?.setAttribute("href", `#mrz-znamka-${z ?? "ka"}`);
      li.querySelector(".mls-razitko-znamka")!.textContent = z ? ` · ${znamky[z].znak}` : "";
    }
    const kus = m.kus ?? zaznam("tvar")?.kus;
    const fig = listEl.querySelector<HTMLElement>(".mls-kus")!;
    fig.hidden = !kus;
    if (kus) fig.querySelector(".mls-kus-obr")!.innerHTML = kusSvg(kus, "hotovy", { id: "mls-kus", popis: kus.nazev });
    listEl.querySelector(".mls-datum-cz")!.textContent = datumCesky(m.kdy);
    listEl.querySelector(".mls-datum-ja")!.textContent = `${rokJaponsky(m.kdy)}${datumJaponsky(m.kdy)}`;
    sin.querySelector(".msn-volani")!.textContent = `„${osloveni[m.osloveni].volani}!“`;
  };

  const ukaz = () => {
    nactiPostup();
    const m = mistr();
    const stav = uprava || (!m && jeMistrem()) ? "obrad" : m ? "mistr" : "zamceno";
    sin.dataset.stav = stav;
    sin.querySelector<HTMLElement>(".msn-zamceno")!.hidden = stav !== "zamceno";
    obrad.hidden = stav !== "obrad";
    sin.querySelector<HTMLElement>(".msn-mistr")!.hidden = stav !== "mistr";
    sin.querySelector(".msn-chybi b")!.textContent = String(urovne.length - proslych());

    if (m) {
      /* Lepší známky z pozdějších pokusů se propíšou i na list */
      const zn = nejlepsiZnamky(m);
      const kus = m.kus ?? zaznam("tvar")?.kus;
      if (JSON.stringify(zn) !== JSON.stringify(m.znamky) || (kus && !m.kus)) ulozMistra({ ...m, znamky: zn, kus });
      vyplnList(mistr() ?? m);
    }
    if (stav === "obrad") {
      vstup.value = m?.jmeno ?? nactiJmeno();
      const o = obrad.querySelector<HTMLInputElement>(`input[name="osloveni"][value="${m?.osloveni ?? "mistr"}"]`);
      if (o) o.checked = true;
      const p = pecetHrace(vstup.value);
      obrad.querySelector(".msn-pecet-nahled")!.innerHTML = pecetSvg(p, { id: "msn-nahled" });
      obrad.querySelector(".msn-pecet-popis")!.textContent = nactiPecet()
        ? `Tvoje pečeť z šesté úrovně — ${tvaryPeceti[p.tvar].toLowerCase()}, ${stylyPeceti[p.styl].znak}.`
        : "Pečeť z iniciál. Vlastní si můžeš vyrýt v šesté úrovni.";
      obrad.querySelector<HTMLButtonElement>(".msn-prevzit")!.textContent = m ? "Uložit list" : "Převzít mistrovský list";
    }
  };

  /** Svitek se rozvine, razítka dopadnou jedno po druhém, parta se podepíše */
  const rozvin = () => {
    if (klid) {
      zvuk.oslava();
      return;
    }
    sin.classList.remove("rozvinuje");
    void sin.offsetWidth;
    sin.classList.add("rozvinuje");
    zvuk.papir();
    window.setTimeout(() => zvuk.papir(), 700);
    urovne.forEach((_, i) => window.setTimeout(() => zvuk.razitko(), 2300 + i * 220));
    window.setTimeout(() => zvuk.razitko(), 2300 + 9 * 220 + 300);
    window.setTimeout(() => {
      zvuk.oslava();
      oslava();
    }, 2300 + 9 * 220 + 900);
    window.setTimeout(() => sin.classList.remove("rozvinuje"), 9000);
    sin.querySelector(".msn-svitek")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  obrad.addEventListener("submit", (e) => {
    e.preventDefault();
    const jmeno = vstup.value.trim().slice(0, 40);
    if (!jmeno) {
      vstup.focus();
      return;
    }
    const os = (new FormData(obrad).get("osloveni") as OsloveniId | null) ?? "mistr";
    ulozJmeno(jmeno);
    const byl = mistr();
    ulozMistra({ jmeno, osloveni: os in osloveni ? os : "mistr", kdy: byl?.kdy ?? Date.now(), znamky: nejlepsiZnamky(byl), kus: byl?.kus ?? zaznam("tvar")?.kus });
    uprava = false;
    ukaz();
    if (!byl) rozvin();
    else zvuk.cink();
  });
  vstup.addEventListener("input", () => {
    if (nactiPecet()) return;
    obrad.querySelector(".msn-pecet-nahled")!.innerHTML = pecetSvg(vychoziPecet(vstup.value), { id: "msn-nahled" });
  });
  sin.querySelector(".msn-upravit")?.addEventListener("click", () => {
    uprava = true;
    ukaz();
    vstup.focus();
  });
  sin.querySelector(".msn-tisk")?.addEventListener("click", () => window.print());
  sin.querySelector(".msn-stahnout")?.addEventListener("click", () => {
    const m = mistr();
    if (!m) return;
    stahuje.textContent = "Kreslím list…";
    const kus = m.kus ?? zaznam("tvar")?.kus;
    const partaSvg = [...listEl.querySelectorAll<SVGSVGElement>(".mls-parta svg")].map((s) => new XMLSerializer().serializeToString(s));
    stahniList({
      jmeno: m.jmeno,
      osloveni: m.osloveni,
      kdy: m.kdy,
      znamky: nejlepsiZnamky(m),
      pecet: pecetHrace(m.jmeno),
      kusSvg: kus ? kusSvg(kus, "hotovy", { id: "mlo-kus", sirka: 240, vyska: 240 }) : undefined,
      partaSvg,
    })
      .then(() => (stahuje.textContent = "Hotovo — list je ve stažených souborech."))
      .catch(() => (stahuje.textContent = "Obrázek se nepovedl. Zkus Vytisknout — tisk jde uložit i jako PDF."));
  });

  document.addEventListener(ZMENA, ukaz);
  document.addEventListener(ZAVRENO, ukaz);
  ukaz();
}
