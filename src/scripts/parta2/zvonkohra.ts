/**
 * Zvonkohra v hlavičce: každý snímek posune fyziku (zvonkohra-fyzika.ts),
 * přepíše kresbu a údery pošle do zvuku. Přejede-li přes ni myš, rozhoupe
 * ji jako ruka — kresba sama na myš nereaguje, aby nepřekážela klikání
 * na stránku pod ní, takže se poloha myši počítá z celého okna.
 *
 * Když si člověk nepřeje pohyb, zvonkohra visí rovně; se zapnutým zvukem
 * ale fyzika běží dál a zvoní, jen se kresba nehýbe.
 */
import { zvonkohra, zapis } from "./zvonkohra-fyzika";
import { klid } from "./stav";
import * as zvuk from "./zvuk";

/** Výřez kresby (viewBox v Zvonkohra.astro) */
const VYREZ = { x: -34, y: -8, sirka: 68 };

export function initZvonkohra(kresba: SVGSVGElement) {
  const zk = zvonkohra();
  const prvky = new Map<string, Element>();
  kresba.querySelectorAll("[data-zk]").forEach((el) => prvky.set(el.getAttribute("data-zk")!, el));
  const nastav = (klic: string, atribut: string, hodnota: string) => prvky.get(klic)?.setAttribute(atribut, hodnota);
  const visi = prvky.get("visi")!;
  let poradi = "";

  let obrys = kresba.getBoundingClientRect();
  let zmereno = 0;
  const zmer = () => {
    obrys = kresba.getBoundingClientRect();
    zmereno = performance.now();
  };
  window.addEventListener("resize", zmer);
  document.fonts?.ready.then(zmer);

  /* Zvonkohra visí vpravo — zvuk jde trochu víc z pravé strany */
  const pan = (kde: number) => {
    const stred = (obrys.left + obrys.width / 2) / window.innerWidth - 0.5;
    return kde * 0.45 + stred * 0.5;
  };

  const vykresli = () => {
    const p = zk.poloha();
    zapis(p, nastav);
    const klic = p.poradi.join();
    if (klic === poradi) return;
    poradi = klic;
    for (const i of p.poradi) visi.append(prvky.get(i < 0 ? "stred" : `trubka-${i}`)!);
  };

  let predtim = 0;
  let vitrCas = 0;
  const snimek = (t: number) => {
    requestAnimationFrame(snimek);
    const dt = predtim ? (t - predtim) / 1000 : 0;
    predtim = t;
    if (klid && !zvuk.jeZapnuto()) return;
    for (const u of zk.krok(dt, 1 - 0.35 * zvuk.miraNoci())) zvuk.zvonek(u.ton, u.sila, pan(u.kde));
    if (t - vitrCas > 120) {
      vitrCas = t;
      zvuk.nastavVitr(zk.vitr);
    }
    if (!klid) vykresli();
  };
  requestAnimationFrame(snimek);

  let mx = 0, my = 0, mt = 0;
  window.addEventListener(
    "pointermove",
    (e) => {
      if (e.timeStamp - zmereno > 800) zmer();
      if (!obrys.width) return;
      const k = VYREZ.sirka / obrys.width;
      const bx = (e.clientX - obrys.left) * k + VYREZ.x;
      const by = (e.clientY - obrys.top) * k + VYREZ.y;
      const dt = (e.timeStamp - mt) / 1000;
      if (dt > 0 && dt < 0.1 && bx > -26 && bx < 26 && by > 4 && by < 112) {
        zk.postrc(bx, by, (bx - mx) / Math.max(dt, 0.008), (by - my) / Math.max(dt, 0.008));
      }
      mx = bx;
      my = by;
      mt = e.timeStamp;
    },
    { passive: true },
  );

  return {
    rozhoupej: () => {
      zmer();
      zk.rozhoupej();
    },
  };
}
