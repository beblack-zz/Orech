/**
 * Kopání v patičce (components/parta2/Paticka.astro). Každé kopnutí
 * odkryje další vrstvu, kamera jde za rýčem — tlačítko zůstane pod
 * prstem, i když se nad ním vrstva rozevírá — a poslední kopnutí
 * vrátí člověka nahoru ke kontaktu.
 *
 * Patička je na každé stránce nového vzhledu, proto se spouští na
 * astro:page-load (i po přechodu bez načtení) a ne přes stranka().
 */
import * as zvuk from "./zvuk";
import { klid } from "./stav";
import { vrstvy, poznamkyKopani } from "../../data/paticka";

export function initPaticka() {
  const pata = document.querySelector<HTMLElement>(".pata");
  if (!pata || pata.dataset.kopani === "hotovo") return;
  pata.dataset.kopani = "hotovo";

  const akce = pata.querySelector<HTMLElement>(".kopani-akce")!;
  const kopat = akce.querySelector<HTMLButtonElement>(".kopat")!;
  const text = akce.querySelector<HTMLElement>(".kopat-text")!;
  const pozn = akce.querySelector<HTMLElement>(".kopani-pozn")!;
  const dovetek = akce.querySelector<HTMLElement>(".kopani-dovetek")!;
  const drobkyEl = akce.querySelector<HTMLElement>(".drobky")!;
  const li = [...pata.querySelectorAll<HTMLElement>(".vrstva")];
  akce.hidden = false;
  let odkryto = 0;

  const drobky = (barva: string) => {
    if (klid) return;
    let s = "";
    for (let i = 0; i < 16; i++) {
      const u = -Math.PI * (0.1 + Math.random() * 0.8);
      const d = 40 + Math.random() * 70;
      s += `<i style="--dx:${(Math.cos(u) * d).toFixed(0)}px;--dy:${(Math.sin(u) * d + 60).toFixed(0)}px;--r:${(3 + Math.random() * 6).toFixed(1)}px;--u:${Math.round(Math.random() * 360)}deg;--b:${Math.random() < 0.5 ? barva : "#6B5A48"}"></i>`;
    }
    drobkyEl.innerHTML = s;
    window.setTimeout(() => (drobkyEl.innerHTML = ""), 1000);
  };

  const sledujTlacitko = () => {
    const y0 = kopat.getBoundingClientRect().top;
    const start = performance.now();
    const krok = () => {
      const y = kopat.getBoundingClientRect().top;
      /* instant — parta2.css má plynulý scroll a ten by kameru rozhoupal */
      if (Math.abs(y - y0) > 0.5) window.scrollBy({ top: y - y0, behavior: "instant" });
      if (performance.now() - start < 1350) requestAnimationFrame(krok);
    };
    requestAnimationFrame(krok);
  };

  kopat.addEventListener("click", () => {
    if (odkryto >= li.length) {
      pata.scrollIntoView({ behavior: klid ? "auto" : "smooth", block: "start" });
      return;
    }
    const el = li[odkryto];
    const v = vrstvy[odkryto];
    odkryto++;
    el.classList.add("odkryta");
    el.removeAttribute("inert");
    el.removeAttribute("aria-hidden");
    akce.style.setProperty("--kopani-barva", v.barva);
    akce.classList.toggle("kopani-svetle", !!v.svetla);
    kopat.classList.remove("kope");
    void kopat.offsetWidth;
    kopat.classList.add("kope");
    drobky(v.barva);
    zvuk.lopata();
    window.setTimeout(() => (v.id === "orech" ? zvuk.drevo(1.6) : zvuk.cink()), 650);
    const posledni = odkryto === li.length;
    text.textContent = posledni ? "Vylézt nahoru" : "Kopej dál";
    pozn.textContent = `${v.nazev}, ${v.doba}. ${poznamkyKopani[odkryto - 1]}`;
    if (posledni) dovetek.hidden = false;
    if (klid) el.scrollIntoView({ block: "center" });
    else sledujTlacitko();
  });
}
