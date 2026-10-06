/**
 * Tečkovaná cestička mezi okny stanovišť. Vede středy oken, takže se
 * schovává za nimi a je vidět jen v mezerách. Rozsvěcuje se tam, kam
 * už člověk došel — maska odkryje tolik délky, kolik odpovídá výšce
 * 62 % obrazovky.
 */
import { priMereni, priScrollu, pozice } from "./stav";

type Bod = [number, number];

const r = (n: number) => Math.round(n * 10) / 10;

function catmull(body: Bod[]) {
  let d = `M${r(body[0][0])} ${r(body[0][1])}`;
  for (let i = 0; i < body.length - 1; i++) {
    const p0 = body[i - 1] ?? body[i];
    const p1 = body[i];
    const p2 = body[i + 1];
    const p3 = body[i + 2] ?? p2;
    const c1: Bod = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Bod = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${r(c1[0])} ${r(c1[1])} ${r(c2[0])} ${r(c2[1])} ${r(p2[0])} ${r(p2[1])}`;
  }
  return d;
}

export function initCesta() {
  const pout = document.querySelector<HTMLElement>(".pout");
  const svg = pout?.querySelector<SVGSVGElement>(".pout-cesta");
  if (!pout || !svg) return;
  const podklad = svg.querySelector<SVGPathElement>(".pout-podklad")!;
  const jas = svg.querySelector<SVGPathElement>(".pout-jas")!;
  const maska = svg.querySelector<SVGMaskElement>("mask")!;
  const maskaCara = svg.querySelector<SVGPathElement>(".pout-maska-cara")!;

  let delka = 0;
  let poutTop = 0;
  let vzorky: { d: number; y: number }[] = [];

  priMereni(() => {
    const p = pozice(pout);
    const vh = window.innerHeight;
    poutTop = p.top;
    svg.setAttribute("viewBox", `0 0 ${r(p.width)} ${r(p.height)}`);
    maska.setAttribute("width", String(r(p.width)));
    maska.setAttribute("height", String(r(p.height)));

    const body: Bod[] = [[p.width / 2, 0]];
    for (const z of pout.querySelectorAll<HTMLElement>(".zast")) {
      const okno = z.querySelector(".okno-obal");
      if (!okno) continue;
      const o = pozice(okno);
      const zp = pozice(z);
      const x = o.left - p.left + o.width / 2;
      // Okno ve scrollovací sekci stojí — jeho střed počítáme v půlce první obrazovky
      const y = z.classList.contains("zast-scroll") ? zp.top - p.top + vh / 2 : o.top - p.top + o.height / 2;
      body.push([x, y]);
    }
    body.push([p.width / 2, p.height]);

    const d = catmull(body);
    podklad.setAttribute("d", d);
    jas.setAttribute("d", d);
    maskaCara.setAttribute("d", d);
    delka = podklad.getTotalLength();
    vzorky = [];
    for (let i = 0; i <= 400; i++) {
      const dd = (i / 400) * delka;
      vzorky.push({ d: dd, y: podklad.getPointAtLength(dd).y });
    }
  });

  priScrollu((y, vh) => {
    if (!delka) return;
    const cil = y + vh * 0.62 - poutTop;
    let d = 0;
    for (const v of vzorky) {
      if (v.y > cil) break;
      d = v.d;
    }
    maskaCara.style.strokeDasharray = `${r(d)} ${r(delka + 10)}`;
  });
}
