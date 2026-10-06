/**
 * Brána: kamera dojede ke dveřím, noren se rozhrne a dílna se rozsvítí.
 * Sekce je vyšší než okno a scéna v ní stojí (sticky); tady se jen
 * počítá, kolik z ní už je projeto (p od 0 do 1), a podle toho se nastaví
 * posun a zvětšení fasády, rozhrnutí norenu a záře.
 *
 *   p 0 – 0,25   text odjede, kamera se rozjede
 *   p 0,42 – 0,8 noren se rozhrnuje, ve dveřích přibývá světla
 *   p 0,72 – 1   světlo zaplaví obrazovku — a pod ním začíná prohlídka
 *
 * S omezeným pohybem nic z toho: scéna stojí a do dílny se chodí kliknutím.
 */
import { priMereni, priScrollu, pozice, omez, hladce, mix, klid } from "../parta2/stav";
import * as zvuk from "../parta2/zvuk";
import { orazitkuj } from "./razitka";

/** Otvor dveří ve fasádě (Fasada.astro, viewBox 1000 × 800): střed a výška v podílech */
const DVERE = { x: 0.56, y: 0.64, h: 0.59 };

export function brana() {
  const sekce = document.querySelector<HTMLElement>("#brana");
  if (!sekce) return;
  const scena = sekce.querySelector<HTMLElement>(".brana-scena")!;
  const svet = sekce.querySelector<HTMLElement>(".brana-svet")!;
  const noren = sekce.querySelector<HTMLElement>(".noren");

  noren?.addEventListener("click", () => {
    zvuk.latka();
    orazitkuj("brana");
  });

  if (klid) return;

  let top = 0;
  let rozsah = 1;
  let vw = 0;
  let vh = 0;
  let sx = 0;
  let sy = 0;
  let dx = 0;
  let dy = 0;
  let dh = 1;
  let posledni = "";
  let klidCas: number | undefined;
  let zaslechnuto = false;

  priMereni(() => {
    const p = pozice(sekce);
    vw = scena.clientWidth;
    vh = scena.clientHeight;
    top = p.top;
    rozsah = Math.max(1, p.height - vh);
    // offsetLeft/Top jsou bez transformace, takže se dají měřit i v půlce cesty
    sx = svet.offsetLeft;
    sy = svet.offsetTop;
    dx = svet.offsetWidth * DVERE.x;
    dy = svet.offsetHeight * DVERE.y;
    dh = svet.offsetHeight * DVERE.h;
    posledni = "";
  });

  priScrollu((y) => {
    const p = omez((y - top) / rozsah);
    const pk = hladce(omez((p - 0.05) / 0.68));
    const z = mix(1, Math.max(1, (vh * 1.16) / dh), pk);
    // Střed dveří se sune do středu obrazovky; transform-origin je levý horní roh fasády
    const cx = mix(sx + dx, vw / 2, pk);
    const cy = mix(sy + dy, vh * 0.52, pk);
    const t = `translate(${(cx - sx - z * dx).toFixed(1)}px, ${(cy - sy - z * dy).toFixed(1)}px) scale(${z.toFixed(4)})`;
    if (t !== posledni) {
      posledni = t;
      svet.style.transform = t;
      svet.classList.add("jede");
      window.clearTimeout(klidCas);
      klidCas = window.setTimeout(() => svet.classList.remove("jede"), 180);
    }

    const r = hladce(omez((p - 0.42) / 0.38));
    noren?.style.setProperty("--rozhrnuti", r.toFixed(3));
    sekce.style.setProperty("--svetlo", omez((p - 0.3) / 0.45).toFixed(3));
    sekce.style.setProperty("--text-pryc", omez((p - 0.03) / 0.22).toFixed(3));
    sekce.style.setProperty("--zar", hladce(omez((p - 0.74) / 0.24)).toFixed(3));
    sekce.classList.toggle("uvnitr", p > 0.2);

    if (r > 0.3 && !zaslechnuto) {
      zaslechnuto = true;
      zvuk.latka();
    }
    if (r < 0.05) zaslechnuto = false;
    if (p > 0.9) orazitkuj("brana");
  });
}
