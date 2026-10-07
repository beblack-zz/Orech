/**
 * Svitek emaki: na širokém okně se pás papíru odvíjí zprava doleva podle
 * toho, kolik ze sekce je odscrollováno. Okno uvnitř sekce stojí (sticky),
 * sekce je jen tak vysoká, aby posun pásu odpovídal scrollování. Role na
 * okrajích tloustnou a tenčí: vlevo je namotané, co zbývá, vpravo, co už
 * je přečtené.
 *
 * Výšku sekce je potřeba změřit dřív, než si obloha změří své kotvy —
 * proto hlavni.ts volá svitek() před initNebe().
 *
 * Na úzké obrazovce (a bez skriptu) jdou scény pod sebou.
 */
import { priScrollu, priMereni, pozice, omez, klid } from "../parta2/stav";
import * as zvuk from "../parta2/zvuk";

const SIROKE = window.matchMedia("(min-width: 861px)");
/** Kolik pixelů scrollu na pixel posunu pásu */
const POMER = 0.68;

export function svitek() {
  const sekce = document.querySelector<HTMLElement>(".svitek");
  const okno = sekce?.querySelector<HTMLElement>(".svitek-okno");
  const pas = sekce?.querySelector<HTMLElement>(".svitek-pas");
  if (!sekce || !okno || !pas) return;
  const roleL = sekce.querySelector<HTMLElement>(".svitek-role-vlevo");
  const roleP = sekce.querySelector<HTMLElement>(".svitek-role-vpravo");
  const ukazatel = sekce.querySelector<HTMLElement>(".svitek-ukazatel");
  const sceny = [...sekce.querySelectorAll<HTMLElement>(".svitek-scena")];
  let top = 0;
  let rozsah = 1;
  let posun = 0;
  let vodorovne = false;
  let posledniScena = -1;
  /** Kde ve pásu scény leží: [levý okraj, šířka] — měří se jen při změně velikosti */
  let mista: [number, number][] = [];

  priMereni(() => {
    vodorovne = SIROKE.matches;
    sekce.classList.toggle("vodorovne", vodorovne);
    if (!vodorovne) {
      sekce.style.height = "";
      pas.style.transform = "";
      return;
    }
    mista = sceny.map((s) => [s.offsetLeft, s.offsetWidth]);
    posun = Math.max(0, pas.scrollWidth - okno.clientWidth);
    sekce.style.height = `${Math.round(window.innerHeight + posun * POMER)}px`;
    const p = pozice(sekce);
    top = p.top;
    rozsah = Math.max(1, p.height - window.innerHeight);
  });

  priScrollu((y) => {
    if (!vodorovne) return;
    const p = omez((y - top) / rozsah);
    pas.style.transform = `translate3d(${(-posun * (1 - p)).toFixed(1)}px, 0, 0)`;
    roleL?.style.setProperty("--role", (1 - p).toFixed(3));
    roleP?.style.setProperty("--role", p.toFixed(3));
    ukazatel?.style.setProperty("--p", p.toFixed(3));
    // Šustnutí papíru, když se do okna dostane další měsíc
    const stred = posun * (1 - p) + okno.clientWidth / 2;
    const kde = mista.findIndex(([l, w]) => stred >= l && stred < l + w);
    if (kde !== posledniScena) {
      if (posledniScena !== -1 && kde !== -1) zvuk.papir();
      posledniScena = kde;
      sceny.forEach((s, i) => s.classList.toggle("je", i === kde));
    }
  });

  /* Klávesnicí: když se zaměří něco ve scéně, dojede se k ní scrollem */
  pas.addEventListener("focusin", (e) => {
    if (!vodorovne) return;
    const kus = (e.target as Element).closest<HTMLElement>(".svitek-scena, .svitek-obal");
    if (!kus) return;
    const stred = kus.offsetLeft + kus.offsetWidth / 2;
    const p = posun ? omez(1 - (stred - okno.clientWidth / 2) / posun) : 0;
    window.scrollTo({ top: top + p * rozsah, behavior: klid ? "auto" : "smooth" });
    okno.scrollLeft = 0;
  });
  SIROKE.addEventListener("change", () => window.dispatchEvent(new Event("resize")));
}
