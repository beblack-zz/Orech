/**
 * Rok dílny. Sekce je vysoká a scéna v ní stojí; každý měsíc má stejný
 * kus scrollu. Na hranici měsíce se v kresbě objeví, co tehdy přibylo
 * (data-od / data-do v DilnaRez), venku se přepne roční období a kamera
 * dojede k tomu, co je nového. Po posledním měsíci („Teď“) přijde fotka.
 *
 * S omezeným pohybem sekce nescrolluje — měsíce se přepínají tlačítky.
 */
import { priMereni, priScrollu, pozice, omez, hladce, klid } from "../parta2/stav";
import { kamera, cil } from "./kamera";

const mobil = () => window.matchMedia("(max-width: 860px)").matches;

export function rok() {
  const sekce = document.querySelector<HTMLElement>("#rok");
  if (!sekce) return;
  const scena = sekce.querySelector<HTMLElement>(".rok-scena")!;
  const ram = sekce.querySelector<HTMLElement>(".rok-ram")!;
  const svet = sekce.querySelector<HTMLElement>(".rok-svet")!;
  const rez = svet.querySelector<HTMLElement>(".rez")!;
  const kroky = [...sekce.querySelectorAll<HTMLElement>(".rok-krok")];
  const veci = [...rez.querySelectorAll<HTMLElement | SVGElement>("[data-od]")];
  const cile = kroky.map((k) => cil(k.dataset.kamera) ?? { x: 800, y: 560, w: 1680, h: 1040 });
  const n = kroky.length;
  const k = kamera(ram, svet);
  let top = 0;
  let rozsah = 1;
  let aktivni = -1;

  const mesic = (i: number) => {
    const j = Math.min(i, n - 1);
    if (j !== aktivni) {
      aktivni = j;
      const m = Number(kroky[j].dataset.m);
      for (const v of veci) {
        const od = Number(v.dataset.od);
        const doM = v.dataset.do ? Number(v.dataset.do) : Infinity;
        v.classList.toggle("je", m >= od && m < doM);
      }
      kroky.forEach((kr, x) => {
        kr.classList.toggle("je", x === j);
        kr.classList.toggle("bylo", x < j);
        const b = kr.querySelector("button");
        if (x === j) b?.setAttribute("aria-current", "step");
        else b?.removeAttribute("aria-current");
      });
      if (kroky[j].dataset.sezona) scena.dataset.sezona = kroky[j].dataset.sezona;
      // V srpnu „vypalujeme první várku“ — pec v kresbě žhne
      rez.style.setProperty("--zar", m === 8 ? "0.85" : "0");
    }
    sekce.classList.toggle("foto", i >= n);
  };

  const okraje = () => {
    const hlava = sekce.querySelector<HTMLElement>(".rok-hlava");
    const dole = sekce.querySelector<HTMLElement>(".rok-kroky");
    const vh = scena.clientHeight;
    const nahore = hlava ? hlava.offsetTop + hlava.offsetHeight + 8 : 0;
    // Pod scénou je pruh s měsíci a nad ním lísteček s textem
    const spodek = dole ? vh - dole.offsetTop + (mobil() ? 110 : 40) : 0;
    return { nahore: Math.min(nahore, vh * 0.3), dole: Math.min(spodek, vh * 0.4) };
  };

  kroky.forEach((kr, i) =>
    kr.querySelector("button")?.addEventListener("click", () => {
      if (klid) {
        mesic(i);
        k.na(cile[i]);
        return;
      }
      window.scrollTo({ top: top + ((i + 0.08) / (n + 1)) * rozsah, behavior: "smooth" });
    }),
  );

  priMereni(() => {
    const p = pozice(sekce);
    top = p.top;
    rozsah = Math.max(1, p.height - scena.clientHeight);
    k.zmer(okraje());
    if (klid) {
      mesic(aktivni < 0 ? n - 1 : aktivni);
      k.na(cile[Math.max(0, aktivni)]);
    }
  });

  if (klid) return;
  mesic(0);

  priScrollu((y) => {
    const p = omez((y - top) / rozsah) * (n + 1);
    const i = Math.min(n, Math.floor(p));
    const t = p - i;
    mesic(i);
    // Kamera stojí u novinky a k další se rozjede až v poslední třetině měsíce
    const a = cile[Math.min(i, n - 1)];
    const b = cile[Math.min(i + 1, n - 1)];
    k.mezi(a, b, i >= n - 1 ? 0 : hladce(omez((t - 0.66) / 0.34)));
  });
}
