/**
 * Točit — nakresli obrys a kruh ho vytočí (components/dilna/Tocit.astro).
 *
 * Kus je rotační těleso: N poloměrů v mm odspodu nahoru a výška. Čára,
 * kterou člověk táhne, se převede na poloměr v každé výšce (body se
 * rozdělí do pásů, prázdné pásy se dopočítají, celé se to vyhladí),
 * a hlína za čarou roste — každý snímek kus cesty k obrysu, jako když
 * se hlína vytahuje.
 *
 * Co by na skutečném kruhu spadlo, spadne i tady: moc široké nahoře na
 * vysoké nádobě, převis, vysoké a tenké. Předlohy jsou pro ty, kdo
 * kreslit nechtějí, a jdou i z klávesnice.
 */
import { omez, mix, hladce, klid, kdyzVidet } from "../parta2/stav";
import * as zvuk from "../parta2/zvuk";
import { rekni } from "../parta2/kami";
import { profil, poznejDruh, nazevDruhu } from "../../components/dilna/kus";
import type { Druh, Kus } from "../../components/dilna/kus";
import { ulozKus, ukazVysledek } from "./stav-kusu";

const S = 1.1;
const CX = 300;
const ZAKLAD = 466;
const N = 24;
const R_MIN = 12;
const R_MAX = 150;
const H_MAX = 300;

type Faze = "hrouda" | "kresli" | "tvar" | "pada" | "rez" | "hotovo";

/** Hladká interpolace přes body [t, r] */
const pres = (body: [number, number][]) => (t: number) => {
  let i = 0;
  while (i < body.length - 2 && t > body[i + 1][0]) i++;
  const p0 = body[Math.max(0, i - 1)];
  const p1 = body[i];
  const p2 = body[i + 1];
  const p3 = body[Math.min(body.length - 1, i + 2)];
  const u = omez((t - p1[0]) / Math.max(1e-6, p2[0] - p1[0]));
  const u2 = u * u;
  const u3 = u2 * u;
  return 0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3);
};

const PREDLOHY: Record<string, { v: number; r: number[] }> = {
  miska: { v: 62, r: profil((t) => 30 + 34 * Math.pow(Math.sin((t * Math.PI) / 2), 0.85)) },
  hrnek: { v: 96, r: profil((t) => 39 + 3 * Math.sin(Math.PI * t)) },
  vaza: { v: 180, r: profil(pres([[0, 34], [0.18, 46], [0.38, 54], [0.6, 44], [0.8, 22], [0.9, 18], [1, 23]])) },
  talir: { v: 26, r: profil((t) => 70 + 55 * Math.pow(t, 1.6)) },
};

const HROUDA = { v: 72, r: profil((t) => 54 * Math.sqrt(Math.max(0.03, 1 - Math.pow(t, 2) * 0.97))) };

const RADY: Record<Druh, string> = {
  talir: "Talíř. Na kruhu se točí nejhůř — a vypadá nejjednodušeji.",
  miska: "Miska. Nejlepší první kus. A druhý taky.",
  hrnek: "Hrnek. Ucho se lepí, až kus zavadne.",
  pohar: "Vysoký a rovný. Na to musí být hodně klidné ruce.",
  vaza: "Váza. Krk se zužuje pomalu, jinak se hlína zkroutí.",
  tvar: "Tohle nemá jméno. Zatím. Ty nejlepší kusy ho nemívají.",
  kachel: "",
};

const PADA: Record<string, string> = {
  siroke: "Takhle široké nahoře to neudrží — stěny se rozjedou. Spadlo to. To k tomu patří.",
  previs: "Převis! Hlína nahoru nepadá. Spadlo to — příště se do šířky jde pomaleji.",
  tenke: "Moc vysoké a tenké. Rozkmitalo se to a spadlo.",
};

/** Spadlo by to? */
function spadne(r: number[], v: number): string | null {
  const n = r.length;
  const dh = v / (n - 1);
  const rmax = Math.max(...r);
  if (rmax > 2.8 * r[0] && v > 70) return "siroke";
  for (let i = 1; i < n; i++) {
    if (i * dh > 35 && (r[i] - r[i - 1]) / dh > 1.9) return "previs";
  }
  if (v > 220 && Math.min(...r.slice(Math.floor(n / 3))) < 16) return "tenke";
  return null;
}

/** Z bodů čáry obrys: poloměr v každém z N pásů výšky */
function zBodu(body: { r: number; h: number }[]) {
  const v = omez(Math.max(...body.map((b) => b.h)), 20, H_MAX);
  const pasy: number[][] = Array.from({ length: N }, () => []);
  for (const b of body) pasy[Math.round(omez(b.h / v) * (N - 1))].push(b.r);
  const r: number[] = pasy.map((p) => (p.length ? p.reduce((s, x) => s + x, 0) / p.length : NaN));
  const plne = r.map((x, i) => (Number.isNaN(x) ? -1 : i)).filter((i) => i >= 0);
  for (let i = 0; i < N; i++) {
    if (!Number.isNaN(r[i])) continue;
    const pred = [...plne].reverse().find((j) => j < i);
    const po = plne.find((j) => j > i);
    if (pred === undefined && po !== undefined) r[i] = r[po];
    else if (po === undefined && pred !== undefined) r[i] = r[pred];
    else if (pred !== undefined && po !== undefined) r[i] = mix(r[pred], r[po], (i - pred) / (po - pred));
  }
  let h = r.map((x) => (Number.isNaN(x) ? 40 : x));
  for (let k = 0; k < 2; k++) h = h.map((x, i) => (i === 0 || i === N - 1 ? x : (h[i - 1] + 2 * x + h[i + 1]) / 4));
  h = h.map((x) => omez(x, R_MIN, R_MAX));
  h[0] = Math.max(h[0], 18);
  return { r: h, v };
}

const f1 = (n: number) => n.toFixed(1);

function hladkaCesta(body: [number, number][]) {
  let d = "";
  for (let i = 0; i < body.length - 1; i++) {
    const p0 = body[i - 1] ?? body[i];
    const p1 = body[i];
    const p2 = body[i + 1];
    const p3 = body[i + 2] ?? p2;
    d += ` C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`;
  }
  return d;
}

export function tocit() {
  const sc = document.querySelector<HTMLElement>("[data-tocit]");
  if (!sc) return;
  const okno = sc.querySelector<HTMLElement>(".tc-okno")!;
  const svg = sc.querySelector<SVGSVGElement>(".d-scena-svg")!;
  const dotyk = sc.querySelector<HTMLElement>(".tc-dotyk")!;
  const tvary = [...sc.querySelectorAll<SVGPathElement>(".tc-tvar")];
  const okraj = sc.querySelector<SVGEllipseElement>(".tc-okraj")!;
  const ryhy = sc.querySelector<SVGGElement>(".tc-ryhy")!;
  const ucho = sc.querySelector<SVGPathElement>(".tc-ucho")!;
  const hlinaG = sc.querySelector<SVGGElement>(".tc-hlina-g")!;
  const cara = sc.querySelector<SVGPathElement>(".tc-cara:not(.tc-cara-zrcadlo)")!;
  const zrcadlo = sc.querySelector<SVGPathElement>(".tc-cara-zrcadlo")!;
  const zebro = sc.querySelector<SVGGElement>(".tc-zebro")!;
  const drat = sc.querySelector<SVGGElement>(".tc-drat")!;
  const fazeEl = sc.querySelector<HTMLElement>(".tc-faze")!;
  const miraEl = sc.querySelector<HTMLElement>(".tc-mira")!;
  const rada = sc.querySelector<HTMLElement>(".d-rada")!;
  const radaText = sc.querySelector<HTMLElement>(".d-rada-text")!;
  const btUcho = sc.querySelector<HTMLButtonElement>(".tc-ucho-tlacitko")!;
  const btHotovo = sc.querySelector<HTMLButtonElement>(".tc-hotovo")!;
  const vysledek = sc.querySelector<HTMLElement>(".tc-vysledek")!;
  const kamiVazicka = sc.querySelector<HTMLElement>(".tc-kami");

  let faze: Faze = "hrouda";
  let r = [...HROUDA.r];
  let v = HROUDA.v;
  let cil = { r: [...HROUDA.r], v: HROUDA.v };
  /** Rychlost, jakou hlína dojíždí k obrysu (podíl za snímek) */
  let tah = 0.16;
  let otevreny = false;
  let sUchem = false;
  let body: { r: number; h: number }[] = [];
  let tociDo = 0;
  let pad = 0;
  let zmeneno = true;
  let posledni: string | null = null;

  const rikej = (s: string) => {
    radaText.textContent = s;
    rada.classList.remove("nova");
    void rada.offsetWidth;
    rada.classList.add("nova");
  };

  const roztoc = (ms: number) => {
    tociDo = Math.max(tociDo, performance.now() + ms);
    okno.classList.add("toci");
    zvuk.nastavKruh(0.6, true);
  };

  /* ——— Kresba ——— */
  const kresli = () => {
    const y = (i: number) => ZAKLAD - (v * S * i) / (N - 1);
    const levy: [number, number][] = r.map((ri, i) => [CX - ri * S, y(i)]);
    const pravy: [number, number][] = r.map((ri, i) => [CX + ri * S, y(i)]);
    const ry0 = r[0] * S * 0.2;
    const d =
      `M${f1(levy[0][0])} ${f1(levy[0][1])}` +
      hladkaCesta(levy) +
      ` L${f1(pravy[N - 1][0])} ${f1(pravy[N - 1][1])}` +
      hladkaCesta([...pravy].reverse()) +
      ` A${f1(r[0] * S)} ${f1(ry0)} 0 0 1 ${f1(levy[0][0])} ${f1(levy[0][1])} Z`;
    tvary.forEach((p) => p.setAttribute("d", d));

    const rTop = r[N - 1] * S;
    okraj.setAttribute("cx", String(CX));
    okraj.setAttribute("cy", f1(y(N - 1)));
    okraj.setAttribute("rx", f1(otevreny ? rTop : 0));
    okraj.setAttribute("ry", f1(otevreny ? rTop * 0.24 : 0));

    let ryhyD = "";
    for (let k = 1; k <= 6; k++) {
      const i = Math.round(((N - 1) * k) / 7.2);
      const ri = r[i] * S;
      ryhyD += `M${f1(CX - ri)} ${f1(y(i))} Q${f1(CX)} ${f1(y(i) + ri * 0.46)} ${f1(CX + ri)} ${f1(y(i))} `;
    }
    ryhy.innerHTML = `<path d="${ryhyD}"/>`;

    if (sUchem && otevreny) {
      const i1 = Math.round((N - 1) * 0.8);
      const i2 = Math.round((N - 1) * 0.3);
      const x1 = CX + r[i1] * S - 3;
      const x2 = CX + r[i2] * S - 3;
      const dd = v * S * 0.34;
      ucho.setAttribute("d", `M${f1(x1)} ${f1(y(i1))} C${f1(x1 + dd * 1.15)} ${f1(y(i1) - dd * 0.12)} ${f1(x2 + dd * 1.1)} ${f1(y(i2) + dd * 0.1)} ${f1(x2)} ${f1(y(i2))}`);
      ucho.setAttribute("stroke-width", f1(Math.max(7, v * S * 0.075)));
    } else ucho.setAttribute("d", "");

    const druh = otevreny ? poznejDruh(r, v) : null;
    fazeEl.textContent = faze === "pada" ? "Spadlo to" : druh ? nazevDruhu(druh, sUchem) : "Hrouda";
    miraEl.textContent = `${(v / 10).toLocaleString("cs-CZ", { maximumFractionDigits: 1 })} cm`;
  };

  const vyhodnot = (r2: number[], v2: number) => {
    const pada = spadne(r2, v2);
    if (pada) {
      faze = "pada";
      pad = 0;
      rikej(PADA[pada]);
      zvuk.zuch();
      if (kamiVazicka) rekni(kamiVazicka, "vazicka", "Lokty k tělu. A znovu.");
      btHotovo.disabled = true;
      return;
    }
    faze = "tvar";
    otevreny = true;
    cil = { r: r2, v: v2 };
    tah = 0.12;
    roztoc(1400);
    const druh = poznejDruh(r2, v2);
    const veta = druh === "hrnek" && !sUchem ? "Pohárek. Nebo hrnek bez ucha — to se ještě uvidí." : RADY[druh];
    rikej(veta);
    if (kamiVazicka && posledni !== druh) rekni(kamiVazicka, "vazicka", veta);
    posledni = druh;
    btHotovo.disabled = false;
  };

  /* ——— Kreslení ——— */
  const bodVeScene = (e: PointerEvent) => {
    const b = svg.getBoundingClientRect();
    return { x: ((e.clientX - b.left) / b.width) * 600, y: ((e.clientY - b.top) / b.height) * 560 };
  };
  const caraD = (zrc: boolean) =>
    body.length ? "M" + body.map((b) => `${f1(CX + (zrc ? -1 : 1) * b.r * S)} ${f1(ZAKLAD - b.h * S)}`).join(" L") : "";

  let id: number | null = null;
  dotyk.addEventListener("pointerdown", (e) => {
    zvuk.odemkni();
    if (faze === "pada" || faze === "rez" || faze === "hotovo") return;
    /* Na dotykovém displeji první klepnutí kruh probudí — do té doby se přes
       něj dá stránkou normálně posouvat (touch-action v dilna.css) */
    if (e.pointerType === "touch" && !sc.classList.contains("aktivni")) {
      sc.classList.add("aktivni");
      rikej("Teď kresli prstem — od patky nahoru, vpravo od osy.");
      return;
    }
    id = e.pointerId;
    dotyk.setPointerCapture(e.pointerId);
    faze = "kresli";
    body = [];
    pridej(e);
    zebro.style.opacity = "1";
    cara.style.opacity = "1";
    zrcadlo.style.opacity = "0.5";
    e.preventDefault();
  });
  const pridej = (e: PointerEvent) => {
    const p = bodVeScene(e);
    const b = { r: omez(Math.abs(p.x - CX) / S, 0, R_MAX * 1.2), h: omez((ZAKLAD - p.y) / S, 0, H_MAX) };
    const minuly = body[body.length - 1];
    if (!minuly || Math.hypot((b.r - minuly.r) * S, (b.h - minuly.h) * S) > 3) body.push(b);
    zebro.setAttribute("transform", `translate(${f1(CX + b.r * S + 8)} ${f1(ZAKLAD - b.h * S)})`);
    cara.setAttribute("d", caraD(false));
    zrcadlo.setAttribute("d", caraD(true));
    if (body.length > 3) {
      const z = zBodu(body);
      cil = z;
      tah = 0.16;
      otevreny = true;
      roztoc(600);
    }
  };
  dotyk.addEventListener("pointermove", (e) => {
    if (e.pointerId !== id || faze !== "kresli") return;
    pridej(e);
  });
  const pust = (e: PointerEvent) => {
    if (e.pointerId !== id) return;
    id = null;
    zebro.style.opacity = "0";
    window.setTimeout(() => {
      cara.style.opacity = "0";
      zrcadlo.style.opacity = "0";
    }, 500);
    if (faze !== "kresli") return;
    const vyska = body.length ? Math.max(...body.map((b) => b.h)) : 0;
    if (body.length < 5 || vyska < 15) {
      faze = otevreny ? "tvar" : "hrouda";
      if (!otevreny) cil = { r: [...HROUDA.r], v: HROUDA.v };
      rikej("Táhni od patky nahoru — pomalu, vpravo od osy.");
      return;
    }
    const z = zBodu(body);
    vyhodnot(z.r, z.v);
  };
  dotyk.addEventListener("pointerup", pust);
  dotyk.addEventListener("pointercancel", pust);

  /* ——— Předlohy a ucho ——— */
  sc.querySelectorAll<HTMLButtonElement>("[data-predloha]").forEach((b) =>
    b.addEventListener("click", () => {
      if (faze === "rez" || faze === "hotovo") return;
      const p = PREDLOHY[b.dataset.predloha ?? ""];
      if (!p) return;
      zvuk.odemkni();
      /* Hrnek má ucho, ostatní předlohy ne — ucho se dá přidat i ubrat tlačítkem */
      if ((b.dataset.predloha === "hrnek") !== sUchem) prepniUcho(b.dataset.predloha === "hrnek", false);
      vyhodnot([...p.r], p.v);
      tah = 0.07;
    }),
  );
  const prepniUcho = (zap = !sUchem, rict = true) => {
    sUchem = zap;
    btUcho.setAttribute("aria-pressed", String(sUchem));
    btUcho.textContent = sUchem ? "− ucho" : "+ ucho";
    zmeneno = true;
    if (rict && sUchem && otevreny && faze === "tvar") rikej("Ucho se lepí, až kus zavadne. Ale budiž — tady to jde hned.");
  };
  btUcho.addEventListener("click", () => prepniUcho());

  /* ——— Odříznout drátem ——— */
  const odrizni = () => {
    if (faze !== "tvar") return;
    faze = "rez";
    btHotovo.disabled = true;
    zvuk.papir();
    const dokonci = () => {
      drat.style.opacity = "0";
      faze = "hotovo";
      const druh = poznejDruh(r, v);
      const kus: Kus = {
        puvod: "kruh",
        druh,
        nazev: `${nazevDruhu(druh, sUchem)} z kruhu`,
        r: r.map((x) => Math.round(x * 10) / 10),
        v: Math.round(v * 10) / 10,
        ucho: sUchem || undefined,
        glazury: [],
        dno: false,
      };
      const u = { kus, stav: "mokry" as const };
      ulozKus(u);
      ukazVysledek(vysledek, u, "tc-vysledek-kus");
      zvuk.cink();
      rikej("Drátem pod patkou a na prkýnko. Druhý den, až zavadne, se obrobí očkem.");
    };
    if (klid) {
      dokonci();
      return;
    }
    drat.style.opacity = "1";
    const start = performance.now();
    const sirka = Math.max(...r.slice(0, 3)) * S;
    const krok = (ted: number) => {
      const p = hladce(omez((ted - start) / 900));
      const x = mix(CX + sirka + 40, CX - sirka - 300, p);
      drat.setAttribute("transform", `translate(${f1(x)} ${f1(ZAKLAD - 2)})`);
      if (p < 1) requestAnimationFrame(krok);
      else dokonci();
    };
    requestAnimationFrame(krok);
  };
  btHotovo.addEventListener("click", odrizni);

  const nova = () => {
    faze = "hrouda";
    otevreny = false;
    cil = { r: [...HROUDA.r], v: HROUDA.v };
    tah = 0.2;
    body = [];
    posledni = null;
    btHotovo.disabled = true;
    vysledek.hidden = true;
    hlinaG.removeAttribute("transform");
    rikej("Nakresli obrys — od patky nahoru, vpravo od osy. Kruh to vytočí.");
    zmeneno = true;
  };
  sc.querySelectorAll<HTMLButtonElement>(".tc-znovu").forEach((b) =>
    b.addEventListener("click", () => {
      zvuk.hnet();
      nova();
    }),
  );

  dotyk.addEventListener("keydown", (e) => {
    const klavesy: Record<string, string> = { "1": "miska", "2": "hrnek", "3": "vaza", "4": "talir" };
    if (klavesy[e.key]) sc.querySelector<HTMLButtonElement>(`[data-predloha="${klavesy[e.key]}"]`)?.click();
  });

  /* ——— Smyčka ——— */
  kdyzVidet(okno, (ted) => {
    if (faze === "pada") {
      pad = Math.min(1, pad + 0.035);
      const p = hladce(pad);
      /* Hlína se sesune k patce: zkosí se a slehne kolem bodu na hlavě kruhu */
      hlinaG.setAttribute("transform", `translate(${f1(CX + p * 18)} ${f1(ZAKLAD + p * 4)}) skewX(${f1(-p * 16)}) scale(1 ${f1(1 - p * 0.45)}) translate(${-CX} ${-ZAKLAD})`);
      if (pad >= 1) {
        hlinaG.removeAttribute("transform");
        r = [...HROUDA.r];
        v = HROUDA.v;
        otevreny = false;
        faze = "hrouda";
        cil = { r: [...HROUDA.r], v: HROUDA.v };
        zmeneno = true;
      }
      return;
    }
    let hybe = false;
    for (let i = 0; i < N; i++) {
      const dr = cil.r[i] - r[i];
      if (Math.abs(dr) > 0.05) {
        r[i] += dr * tah;
        hybe = true;
      }
    }
    if (Math.abs(cil.v - v) > 0.05) {
      v += (cil.v - v) * tah;
      hybe = true;
    }
    if (hybe || zmeneno) {
      zmeneno = false;
      kresli();
    }
    if (tociDo && ted > tociDo && faze !== "kresli") {
      tociDo = 0;
      okno.classList.remove("toci");
      zvuk.nastavKruh(0, false);
    }
  });

  kresli();
}
