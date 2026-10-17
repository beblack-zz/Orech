/**
 * Louka pod první obrazovkou Kontaktu: změří, kde v otázkách a u vývěsky
 * došlapují nohy (prvky s data-trava — hodnota říká, o kolik px nad spodkem
 * prvku leží hrana trávy), a pod ně nakreslí pásy trávy z kresba/louka.ts.
 * Prvky v jednom řádku mřížky mají stejný spodek, takže se z nich stane
 * jedna hrana. Po změně velikosti nebo zalomení textu se kreslí znovu.
 */
import { louka } from "../../components/kontakt/kresba/louka";
import type { Sezona } from "../../data/uvod2";

/** Plátno začíná nad sekcí, aby stébla prvního pásu přerostla spodek první obrazovky */
const PRESAH = 60;

export function loukaPod() {
  const dole = document.querySelector<HTMLElement>(".ko-dole");
  const svg = dole?.querySelector<SVGSVGElement>(".ko-louka-platno svg");
  if (!dole || !svg) return;
  let posledni = "";

  const kresli = () => {
    const r = dole.getBoundingClientRect();
    const W = Math.round(r.width);
    const H = Math.round(r.height + PRESAH);
    if (W < 10 || H < 80) return;
    const hrany = [PRESAH];
    dole.querySelectorAll<HTMLElement>("[data-trava]").forEach((el) => {
      const b = el.getBoundingClientRect();
      if (!b.height) return;
      const y = Math.round(b.bottom - r.top + PRESAH - Number(el.dataset.trava || 0));
      if (hrany.every((h) => Math.abs(h - y) > 40)) hrany.push(y);
    });
    hrany.sort((a, b) => a - b);
    const sezona = (dole.dataset.sezona || "podzim") as Sezona;
    const klic = `${W}×${H}:${hrany.join(",")}:${sezona}`;
    if (klic === posledni) return;
    posledni = klic;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = louka({ W, H, hrany, uzka: W < 700, sezona });
  };

  let pockej: number | undefined;
  const pozdeji = () => {
    window.clearTimeout(pockej);
    pockej = window.setTimeout(kresli, 120);
  };
  kresli();
  new ResizeObserver(pozdeji).observe(dole);
  /* roční období přepíná scena.ts (data-sezona) — pak jiné kvítí */
  new MutationObserver(pozdeji).observe(dole, { attributes: true, attributeFilter: ["data-sezona"] });
  document.fonts?.ready.then(pozdeji);
}
