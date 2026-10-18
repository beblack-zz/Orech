/**
 * Pohyb závěsu s kami (Zaves.astro): každý snímek posune fyziku
 * (zaves-fyzika.ts) a přepíše kresbu. Kdo visí na šňůrkách a otevírání
 * omamori má lehká část (zaves.ts), která se načítá hned se stránkou;
 * tahle se dotáhne s ostatním pohybem hlavičky až po prvním vykreslení
 * (hlavicka-pohyb.ts) a připojí se k ní, ať může cuknout šňůrkou, když
 * někdo přibude.
 *
 * Fouká do něj vítr zvonkohry vedle (hlavicka.ts), takže se obě houpou
 * ve stejných nárazech. Přejede-li přes něj myš, rozhoupe ho jako ruka —
 * kresba sama na myš nereaguje, aby nepřekážela klikání na stránku pod ní,
 * takže se poloha myši počítá z celého okna.
 *
 * Smyčka běží, jen když je závěs vidět (v hlavičce, která stojí, to je
 * pořád — skrytý ale nic nepočítá), a do kresby se zapisuje jen to, co se
 * změnilo. Když si člověk nepřeje pohyb, smyčka se nespustí vůbec a závěs
 * visí rovně.
 */
import { zaves, zapis } from "./zaves-fyzika";
import { pripojPohyb } from "./zaves";
import { klid } from "./stav";
import { naObrazovce } from "./mimo";

/** Výřez kresby (viewBox v Zaves.astro) */
const VYREZ = { x: -34, y: -8, sirka: 68 };

/** Volá se jednou a jako trvalé (prechody.ts) — smyčka i posluchače mají přežít přechod mezi stránkami */
export function rozhybejZaves(vitr: () => number) {
  const kresba = document.querySelector<SVGSVGElement>("[data-zaves] > svg");
  if (!kresba || klid) return;
  const zv = zaves();
  const prvky = new Map<string, Element>();
  kresba.querySelectorAll("[data-zv]").forEach((el) => prvky.set(el.getAttribute("data-zv")!, el));
  /** Co je v kresbě zapsané — co se nezměnilo, se nepřepisuje */
  const zapsano = new Map<string, string>();
  const nastav = (klic: string, atribut: string, hodnota: string) => {
    const k = `${klic}|${atribut}`;
    if (zapsano.get(k) === hodnota) return;
    zapsano.set(k, hodnota);
    prvky.get(klic)?.setAttribute(atribut, hodnota);
  };

  let obrys = kresba.getBoundingClientRect();
  let zmereno = 0;
  const zmer = () => {
    obrys = kresba.getBoundingClientRect();
    zmereno = performance.now();
  };
  window.addEventListener("resize", zmer);

  let videt = true;
  let bezi = false;
  let predtim = 0;
  const snimek = (t: number) => {
    if (!videt) {
      bezi = false;
      predtim = 0;
      return;
    }
    requestAnimationFrame(snimek);
    const dt = predtim ? (t - predtim) / 1000 : 0;
    predtim = t;
    zv.krok(dt, vitr());
    zapis(zv.poloha(), nastav);
  };
  const rozjed = () => {
    if (bezi) return;
    bezi = true;
    requestAnimationFrame(snimek);
  };
  naObrazovce(kresba, (v) => {
    videt = v;
    if (v) rozjed();
  });
  rozjed();

  let mx = 0, mt = 0;
  window.addEventListener(
    "pointermove",
    (e) => {
      if (e.timeStamp - zmereno > 800) zmer();
      if (!obrys.width) return;
      const k = VYREZ.sirka / obrys.width;
      const bx = (e.clientX - obrys.left) * k + VYREZ.x;
      const by = (e.clientY - obrys.top) * k + VYREZ.y;
      const dt = (e.timeStamp - mt) / 1000;
      if (dt > 0 && dt < 0.1 && bx > -32 && bx < 32 && by > 18 && by < 122) zv.postrc(bx, by, (bx - mx) / Math.max(dt, 0.008));
      mx = bx;
      mt = e.timeStamp;
    },
    { passive: true },
  );

  pripojPohyb({ cukni: (snura, misto, sila) => zv.cukni(snura, misto, sila) });
}
