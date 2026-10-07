/**
 * Moře a trať na pozadí Rezervace (components/rezervace/More.astro).
 *
 * Výřez: kolik scény je vidět, záleží na šířce okna — na širokém je vlak
 * vpravo vedle úvodní karty, na úzkém uprostřed přes skoro celou šířku.
 * Výřez je v jednotkách vlaku a stejný mají obě SVG (scéna i odraz).
 *
 * Zrcadlo: mraky a hvězdy z oblohy se zkopírují do vody. Kopie běží se
 * stejnými animacemi, takže mrak a jeho odraz plují spolu.
 *
 * Vlak: když stránka začíná nahoře, přijede zleva a zastaví u nástupiště.
 * Jak člověk sjíždí k výběru, odjíždí doprava; v noci (sekce #rz-noc)
 * přijede znovu, s rozsvícenými okny. Kde je, říká proměnná --vl-x na
 * kořeni moře — dědí ji scéna i její odraz, takže se nic nekopíruje znovu.
 * S omezeným pohybem stojí vlak pořád u nástupiště.
 */
import { priMereni, priScrollu, pozice, klid, omez, mix } from "../parta2/stav";
import { STANICE, delka } from "../../components/rezervace/vlak";
import * as zvuk from "../parta2/zvuk";

const L = delka(2);
const naJaro = (t: number) => 1 - Math.pow(1 - t, 3);
const rozjezd = (t: number) => t * t * t;

/** Ťukání kol o spoje kolejnic — ta-dam */
const tadam = () => {
  zvuk.drevo(0.42);
  window.setTimeout(() => zvuk.drevo(0.38), 92);
};
/** Znělka stanice: dva tóny jako v japonských nádražích */
export const znelka = () => {
  zvuk.furin(1318.5, 0.1);
  window.setTimeout(() => zvuk.furin(1046.5, 0.1), 260);
};

export function initMore() {
  const koren = document.querySelector<HTMLElement>(".rz-more");
  if (!koren) return;
  const svgs = [...koren.querySelectorAll<SVGSVGElement>(".rz-trat")];

  /* ——— Zrcadlo ——— */
  const obal = koren.querySelector(".rz-more-zrcadlo-obal");
  const hvezdy = document.querySelector(".nebe-hvezdy");
  const mraky = document.querySelector(".nebe-mraky");
  if (obal) {
    if (hvezdy) {
      /* Odraz hvězd nebliká — stačí, že blikají ty nahoře */
      const h = hvezdy.cloneNode(true) as Element;
      h.querySelectorAll(".hvezda-blik").forEach((c) => c.classList.remove("hvezda-blik"));
      obal.append(h);
    }
    if (mraky) {
      /* Kopie má vlastní id přechodů, ať se v dokumentu neopakují */
      const m = mraky.cloneNode(true) as Element;
      m.querySelectorAll("[id]").forEach((el) => (el.id = `rz-zrcadlo-${el.id}`));
      m.querySelectorAll("[fill^='url(#']").forEach((el) => el.setAttribute("fill", el.getAttribute("fill")!.replace("url(#", "url(#rz-zrcadlo-")));
      obal.append(m);
    }
  }

  /* ——— Výřez ——— */
  const karta = document.querySelector<HTMLElement>(".rz-nadrazi-karta");
  let x0 = STANICE - 1387;
  let W = 2774;
  /** Od kolika pixelů scrollu vlak odjíždí — dokud ho kryje úvodní karta, stojí */
  let odjezdOd = window.innerHeight * 0.1;
  const vyrez = () => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const siroke = vw >= 900 && vw / vh > 1.1;
    const podil = siroke ? 0.38 : vw < 560 ? 0.9 : 0.7;
    const s = (podil * vw) / L;
    W = vw / s;
    /* Na širokém okně stojí vlak vpravo od karty, na úzkém uprostřed */
    const k = karta ? pozice(karta) : null;
    const vlevoPx = siroke ? Math.max(0.5 * vw, (k ? k.left + k.width : 0) + 28) : (vw - podil * vw) / 2;
    x0 = STANICE - vlevoPx / s;
    const vb = `${x0.toFixed(1)} -320 ${W.toFixed(1)} 640`;
    svgs.forEach((svg) => svg.setAttribute("viewBox", vb));
    koren.style.setProperty("--rz-s", `${s.toFixed(4)}px`);
    /* Kde je střecha vlaku na obrazovce — když ji karta překrývá, odjede až zpod ní */
    const hladina = (siroke ? 0.7 : 0.72) * vh;
    const strecha = hladina - 176 * s;
    const kryje = !!k && k.left + k.width > vlevoPx && k.top + k.height > strecha;
    odjezdOd = Math.max(vh * 0.1, kryje && k ? k.top + k.height - strecha + 24 : 0);
  };
  vyrez();

  /* ——— Vlak ——— */
  const noc = document.getElementById("rz-noc");
  let nocTop = Infinity;
  let vh = window.innerHeight;
  priMereni(() => {
    vyrez();
    vh = window.innerHeight;
    nocTop = noc ? pozice(noc).top : Infinity;
  });

  const vlevo = () => x0 - L - 260;
  const vpravo = () => x0 + W + 260;

  /** Příjezd při načtení: 0 → 1, null = vlak už stojí */
  let prijezd: number | null = null;
  let x = STANICE;
  let posledniX = STANICE;
  let rychlost = 0;
  let ujeto = 0;
  let posledniTukani = 0;
  let odjel = false;
  let vNoci = false;

  const nastav = () => {
    const y = window.scrollY;
    if (klid) {
      x = STANICE;
    } else {
      /* Ráno: stojí (nebo přijíždí), se sjížděním odjíždí doprava */
      const zaklad = prijezd === null ? STANICE : mix(vlevo(), STANICE, naJaro(prijezd));
      const odjezd = omez((y - odjezdOd) / (vh * 0.9));
      x = mix(zaklad, vpravo(), rozjezd(odjezd));
      /* Noc: přijede zleva, jakmile se noc dostane do spodní třetiny okna,
         a zastaví zhruba, když noční karta odjede nahoru a odkryje ho */
      const navrat = omez((y + vh * 0.7 - nocTop) / (vh * 0.9));
      if (navrat > 0) x = mix(vlevo(), STANICE, naJaro(navrat));

      if (odjezd > 0.03 && !odjel && navrat === 0) {
        odjel = true;
        znelka();
      } else if (odjezd < 0.01) odjel = false;
      /* Výpravčí drží výpravku nahoře, dokud vlak od nástupiště neodjede */
      koren.classList.toggle("vypravuje", odjezd > 0.005 && odjezd < 0.6 && navrat === 0);
      if (navrat >= 1 && !vNoci) {
        vNoci = true;
        znelka();
        window.setTimeout(() => zvuk.para(), 500);
      } else if (navrat < 0.9) vNoci = false;
    }
    const dx = Math.abs(x - posledniX);
    posledniX = x;
    rychlost = mix(rychlost, omez(dx / 40), 0.25);
    ujeto += dx;
    const ted = performance.now();
    if (ujeto > 230 && ted - posledniTukani > 160) {
      ujeto = 0;
      posledniTukani = ted;
      tadam();
    }
    koren.style.setProperty("--vl-x", x.toFixed(1));
    koren.style.setProperty("--vl-rychlost", rychlost.toFixed(3));
  };
  priScrollu(nastav);

  /* Dojezd rychlosti — brázda za vlakem po zastavení vybledne */
  let doznivani = 0;
  const doznij = () => {
    rychlost *= 0.9;
    koren.style.setProperty("--vl-rychlost", rychlost.toFixed(3));
    if (rychlost > 0.01) doznivani = requestAnimationFrame(doznij);
  };
  window.addEventListener("scroll", () => {
    cancelAnimationFrame(doznivani);
    doznivani = requestAnimationFrame(doznij);
  }, { passive: true });

  if (!klid && window.scrollY < window.innerHeight * 0.1) {
    prijezd = 0;
    const DOBA = 4200;
    const start = performance.now() + 350;
    const krok = (t: number) => {
      prijezd = omez((t - start) / DOBA);
      nastav();
      if (prijezd < 1) requestAnimationFrame(krok);
      else {
        prijezd = null;
        doznij();
      }
    };
    requestAnimationFrame(krok);
  }
  nastav();
}
