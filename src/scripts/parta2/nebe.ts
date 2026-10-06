/**
 * Obloha podle denní doby. Každá sekce s data-hodina říká, kolik je
 * hodin, když je uprostřed obrazovky; mezi nimi se plynule přechází.
 * Z hodiny se pak spočítají barvy oblohy, mraků a kopců, dráha slunce
 * a měsíce, hvězdy a světlušky.
 */
import { omez, mix, mixBarva, priScrollu, priMereni, pozice } from "./stav";
import { paleta, PROMENNE } from "./paleta";
import * as zvuk from "./zvuk";

export function initNebe() {
  const koren = document.documentElement;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  let kotvy: { s: number; h: number }[] = [];
  let posledni = -1;

  priMereni(() => {
    const vh = window.innerHeight;
    kotvy = [...document.querySelectorAll<HTMLElement>("[data-hodina]")]
      .map((el) => {
        const p = pozice(el);
        return { s: Math.max(0, p.top + p.height / 2 - vh / 2), h: Number(el.dataset.hodina) };
      })
      .sort((a, b) => a.s - b.s);
    posledni = -1;
  });

  priScrollu((y) => {
    if (!kotvy.length) return;
    let h = kotvy[0].h;
    if (y >= kotvy[kotvy.length - 1].s) h = kotvy[kotvy.length - 1].h;
    else {
      for (let i = 0; i < kotvy.length - 1; i++) {
        const a = kotvy[i];
        const b = kotvy[i + 1];
        if (y >= a.s && y < b.s) {
          h = mix(a.h, b.h, (y - a.s) / Math.max(1, b.s - a.s));
          break;
        }
      }
    }
    if (Math.abs(h - posledni) < 0.004) return;
    posledni = h;

    const p = paleta(h);
    p.barvy.forEach((c, k) => koren.style.setProperty(PROMENNE[k], c));
    koren.style.setProperty("--hvezdy", p.hvezdy.toFixed(3));
    koren.style.setProperty("--svetlusky", omez((p.noc - 0.45) * 1.8).toFixed(3));
    koren.classList.toggle("je-noc", p.noc > 0.55);
    meta?.setAttribute("content", p.barvy[0]);
    zvuk.nastavNoc(p.noc);

    /* Slunce vychází v půl šesté a zapadá ve čtvrt na devět — léto v Ořechu */
    const hd = ((h % 24) + 24) % 24;
    const ts = (hd - 5.3) / (20.4 - 5.3);
    const vyska = Math.sin(Math.PI * omez(ts));
    koren.style.setProperty("--slunce-x", `${(6 + 88 * omez(ts)).toFixed(2)}%`);
    koren.style.setProperty("--slunce-y", `${(90 - vyska * 74).toFixed(2)}%`);
    koren.style.setProperty("--slunce-op", (ts < 0 || ts > 1 ? 0 : omez(vyska * 4)).toFixed(3));
    koren.style.setProperty("--slunce-barva", mixBarva("#FF9F6B", "#FFF1C2", omez(vyska * 1.6)));

    const tm = (((hd - 20.6) % 24) + 24) % 24 / 9;
    const vyskaM = Math.sin(Math.PI * omez(tm));
    koren.style.setProperty("--mesic-x", `${(90 - 80 * omez(tm)).toFixed(2)}%`);
    koren.style.setProperty("--mesic-y", `${(80 - vyskaM * 62).toFixed(2)}%`);
    koren.style.setProperty("--mesic-op", (tm > 1 ? 0 : omez(vyskaM * 3)).toFixed(3));
  });
}
