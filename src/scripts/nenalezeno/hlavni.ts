/**
 * Vstup pro stránku 404. Obloha a hlavička se zvukem jsou společné s ostatními
 * stránkami nového vzhledu; scéna s číslem z porcelánu se spouští sama
 * (scripts/nenalezeno/beh.js přes components/nenalezeno/Scena.astro) a oblohou
 * hýbe přes data-hodina své sekce.
 *
 * Tady zbývá to, co se týká textu: ukázat adresu, která se nenašla, zkusit
 * uhodnout, kam člověk chtěl (./kam.ts), a počítat, kolikrát už Střípek
 * číslo slepil.
 */
import { stranka } from "../parta2/prechody";
import { spust, nacti, uloz } from "../parta2/stav";
import { initNebe } from "../parta2/nebe";
import { hlavicka } from "../parta2/hlavicka";
import { nejbliz } from "./kam";

const KLIC_SLEPENO = "nenalezeno-slepeno";

function adresa() {
  const cesta = location.pathname;
  /* stránka otevřená přímo — žádná ztracená adresa není */
  if (/^\/404(\.html)?\/?$/.test(cesta)) return;
  const radek = document.querySelector<HTMLElement>(".nn-adresa");
  const kod = radek?.querySelector("code");
  if (radek && kod) {
    let text = cesta;
    try {
      text = decodeURIComponent(cesta);
    } catch {}
    kod.textContent = text.length > 64 ? `${text.slice(0, 61)}…` : text;
    radek.hidden = false;
  }
  const tip = document.querySelector<HTMLElement>(".nn-tip");
  const odkaz = tip?.querySelector("a");
  const cil = nejbliz(cesta);
  if (tip && odkaz && cil) {
    odkaz.href = cil.href;
    odkaz.textContent = cil.nazev;
    tip.hidden = false;
  }
}

function pocitadlo() {
  const pocet = document.querySelector<HTMLElement>(".nn-pocet");
  const scena = document.querySelector<HTMLElement>("[data-nenalezeno]");
  if (!pocet || !scena) return;
  let celkem = nacti(KLIC_SLEPENO, 0);
  const ukaz = () => {
    if (!celkem) return;
    pocet.textContent = `Slepeno už ${celkem}×. Zlata neubývá.`;
    pocet.hidden = false;
  };
  ukaz();
  scena.addEventListener("nn:slepeno", () => {
    celkem++;
    uloz(KLIC_SLEPENO, celkem);
    ukaz();
  });
}

/* Celé se to spustí při každé návštěvě stránky, i po přechodu bez načtení (prechody.ts) */
stranka("nenalezeno", () => {
  hlavicka();
  initNebe();
  adresa();
  pocitadlo();
  spust();
});
