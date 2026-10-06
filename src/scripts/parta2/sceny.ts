/**
 * Logika devíti scén. Každá funkce si najde svou scénu a když na stránce
 * není, potichu skončí.
 */
import { krivka, milniky } from "../../data/kami";
import { cislo, hladce, kdyzVidet, klid, mix, mixBarva, omez, pozice, priMereni, priScrollu, SVGNS } from "./stav";
import { jmeno, rekni } from "./kami";
import * as zvuk from "./zvuk";

/** Kolik z vysoké (sticky) sekce už člověk projel: 0 na začátku, 1 na konci. */
function prubehSekce(zast: HTMLElement) {
  let top = 0;
  let vyska = 0;
  priMereni(() => {
    const p = pozice(zast);
    top = p.top;
    vyska = p.height;
  });
  return (y: number, vh: number) => omez((y - top) / Math.max(1, vyska - vh));
}

/** Drobné „prasknutí“ — kroužky, které se rozletí z bodu v procentech kontejneru. */
function prask(kontejner: Element, x: number, y: number) {
  const p = document.createElement("span");
  p.className = "prask";
  p.style.left = `${x}%`;
  p.style.top = `${y}%`;
  for (let i = 0; i < 10; i++) {
    const k = document.createElement("i");
    k.style.setProperty("--u", `${i * 36 + Math.random() * 14}deg`);
    p.append(k);
  }
  kontejner.append(p);
  window.setTimeout(() => p.remove(), 700);
}

/* ——— 二 Hnětení ——— */

export function hneteni() {
  const hrouda = document.querySelector<HTMLButtonElement>("[data-hneteni]");
  if (!hrouda) return;
  const scena = hrouda.closest<HTMLElement>(".scena")!;
  const zast = hrouda.closest<HTMLElement>(".zast")!;
  const bublinka = hrouda.querySelector<HTMLElement>(".hrouda-bublinka")!;
  const zahyby = [...hrouda.querySelectorAll<SVGPathElement>(".kiku")];
  const pocet = zast.querySelector(".hneteni-pocet");
  const znovu = zast.querySelector<HTMLButtonElement>(".hneteni-znovu");
  const venku = scena.querySelector<HTMLElement>(".hneteni-venku");
  /* Kudy Bublinka v hroudě couvá — každým hnětením blíž k okraji */
  const CESTA: [number, number][] = [[44, 40], [52, 34], [60, 44], [68, 36], [74, 46], [80, 38], [86, 46], [91, 40], [93, 42]];
  let n = 0;

  const nastav = () => {
    const [x, y] = CESTA[Math.min(n, CESTA.length - 1)];
    bublinka.style.setProperty("--bx", `${x}%`);
    bublinka.style.setProperty("--by", `${y}%`);
    zahyby.forEach((z, i) => z.classList.toggle("je", i < n));
    if (pocet) pocet.textContent = String(n);
  };

  hrouda.addEventListener("click", () => {
    if (n >= 8) return;
    n++;
    hrouda.classList.remove("hnete");
    void hrouda.offsetWidth;
    hrouda.classList.add("hnete");
    zvuk.hnet();
    nastav();
    if (n === 3) rekni(hrouda, "bublinka", "Hej! Tady jsem byla první!");
    if (n === 6) rekni(hrouda, "bublinka", "Tohle je šikana. Hlásím to Pecince.");
    if (n === 8) {
      bublinka.classList.add("utika");
      hrouda.setAttribute("aria-label", "Hrouda je vyhnětená do chryzantémy");
      window.setTimeout(() => {
        prask(scena, 70, 22);
        zvuk.pop();
        scena.classList.add("je-venku");
        if (venku) window.setTimeout(() => rekni(venku, "bublinka", "Dobře, dobře. Jdu. Ale v příští hroudě budu zas."), 450);
        if (znovu) znovu.hidden = false;
      }, 600);
    }
  });

  znovu?.addEventListener("click", () => {
    n = 0;
    bublinka.classList.remove("utika");
    scena.classList.remove("je-venku");
    znovu.hidden = true;
    hrouda.setAttribute("aria-label", "Hněť hlínu");
    nastav();
    hrouda.focus();
  });

  nastav();
}

/* ——— 三 Voda ——— */

export function voda() {
  const scena = document.querySelector<HTMLElement>(".scena-voda");
  if (!scena) return;
  const svg = scena.querySelector<SVGSVGElement>(".voda-klik")!;
  const vrstva = svg.querySelector<SVGGElement>(".vlnky")!;
  const cil = svg.querySelector<SVGEllipseElement>(".voda-cil")!;
  const kapka = scena.querySelector<HTMLElement>(".voda-kapka");
  const pocetEl = scena.closest(".zast")?.querySelector(".voda-pocet");
  let pocet = 0;

  const vlnky = (x: number, y: number, sila = 1) => {
    for (let i = 0; i < 3; i++) {
      const e = document.createElementNS(SVGNS, "ellipse");
      e.setAttribute("cx", x.toFixed(1));
      e.setAttribute("cy", y.toFixed(1));
      e.setAttribute("rx", String(80 * sila));
      e.setAttribute("ry", String(36 * sila));
      e.setAttribute("class", "vlnka");
      e.style.animationDelay = `${i * 0.22}s`;
      vrstva.append(e);
      window.setTimeout(() => e.remove(), 2500);
    }
  };

  const bod = (ev: MouseEvent) => {
    const m = svg.getScreenCTM();
    if (!m) return { x: 300, y: 300 };
    const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  };

  const pust = (x: number, y: number) => {
    vlnky(x, y);
    zvuk.kapka();
    pocet++;
    if (pocetEl) pocetEl.textContent = String(pocet);
    if (pocet === 10 && kapka) rekni(kapka, "kapka", "Ještě! Ještě! …Dobře, stačí.");
    if (pocet === 30 && kapka) rekni(kapka, "kapka", "Třicet. Jsi horší než déšť.");
  };

  cil.addEventListener("click", (ev) => {
    const p = bod(ev);
    pust(p.x, p.y);
  });
  cil.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      pust(240 + Math.random() * 120, 280 + Math.random() * 40);
    }
  });

  /* Kapka po kliknutí skočí do vody — kruhy se rozjedou tam, kam dopadne */
  document.addEventListener("kami:klik", (e) => {
    const d = (e as CustomEvent<{ id: string; el: Element }>).detail;
    if (d.id === "kapka" && scena.contains(d.el)) window.setTimeout(() => {
      vlnky(430, 262, 1.2);
      zvuk.kapka();
    }, 430);
  });

  /* Občas spadne kapka sama od sebe */
  let videt = false;
  new IntersectionObserver(([e]) => { videt = e.isIntersecting; }).observe(scena);
  const samo = () => {
    if (videt && !klid) vlnky(170 + Math.random() * 260, 250 + Math.random() * 90, 0.7);
    window.setTimeout(samo, 3500 + Math.random() * 4000);
  };
  window.setTimeout(samo, 2500);
}

/* ——— 四 Tvar ——— */

const ETAPY = [
  { p: 0, r: [95, 100, 96, 86, 68, 42, 8], h: [0, 30, 60, 90, 115, 132, 140], o: 0 },
  { p: 0.15, r: [70, 62, 52, 44, 36, 26, 8], h: [0, 55, 110, 160, 205, 240, 255], o: 0 },
  { p: 0.3, r: [105, 108, 104, 94, 76, 46, 8], h: [0, 25, 50, 75, 96, 110, 116], o: 0 },
  { p: 0.45, r: [108, 110, 110, 108, 104, 98, 92], h: [0, 24, 48, 70, 88, 100, 108], o: 1 },
  { p: 0.68, r: [78, 76, 74, 73, 72, 71, 70], h: [0, 50, 100, 150, 200, 240, 270], o: 1 },
  { p: 0.92, r: [46, 84, 104, 92, 52, 40, 56], h: [0, 48, 104, 160, 212, 248, 276], o: 1 },
];
const FAZE = [
  { do: 0.3, nazev: "Centrování", ot: 220, rada: "Lokty opřít o kolena. Hlína se musí uklidnit dřív než ty." },
  { do: 0.5, nazev: "Otevírání", ot: 160, rada: "Palce doprostřed. Pomalu. Dno nech silné na prst." },
  { do: 0.78, nazev: "Vytahování", ot: 120, rada: "Zdola nahoru, jedním tahem. A dýchej — na to se často zapomíná." },
  { do: 1.01, nazev: "Tvarování", ot: 90, rada: "Teď břicho, pak hrdlo. Rovná záda. …Hotovo. Vidíš?" },
];

function tvarHliny(p: number) {
  let i = 0;
  while (i < ETAPY.length - 2 && ETAPY[i + 1].p <= p) i++;
  const a = ETAPY[i];
  const b = ETAPY[i + 1];
  const t = hladce(omez((p - a.p) / (b.p - a.p)));
  return {
    r: a.r.map((v, k) => mix(v, b.r[k], t)),
    h: a.h.map((v, k) => mix(v, b.h[k], t)),
    o: mix(a.o, b.o, t),
  };
}

function hladkaCesta(body: [number, number][]) {
  const f = (n: number) => n.toFixed(1);
  let d = `M${f(body[0][0])} ${f(body[0][1])}`;
  for (let i = 0; i < body.length - 1; i++) {
    const p0 = body[i - 1] ?? body[i];
    const p1 = body[i];
    const p2 = body[i + 1];
    const p3 = body[i + 2] ?? p2;
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + " Z";
}

export function kruh() {
  const scena = document.querySelector<HTMLElement>(".scena-kruh");
  if (!scena) return;
  const zast = scena.closest<HTMLElement>(".zast")!;
  const tvary = [...scena.querySelectorAll<SVGPathElement>(".kruh-tvar")];
  const okraj = scena.querySelector<SVGEllipseElement>(".kruh-okraj")!;
  const ryhy = scena.querySelector<SVGGElement>(".kruh-ryhy")!;
  const vzor = scena.querySelector<SVGPatternElement>("#kruh-toceni");
  const znacky = [...scena.querySelectorAll<SVGCircleElement>(".kruh-znacka")];
  const fazeEl = scena.querySelector(".kruh-faze");
  const otackyEl = scena.querySelector(".kruh-otacky");
  const rada = zast.querySelector(".kruh-rada-text");
  const kroky = [...zast.querySelectorAll<HTMLElement>(".kroky li")];
  const CX = 300;
  const ZAKLAD = 468;
  const prubeh = prubehSekce(zast);
  let p = -1;
  let faze = -1;
  let otacky = FAZE[0].ot;
  let posun = 0;
  let uhel = 0;

  const kresli = () => {
    const { r, h, o } = tvarHliny(p);
    const levy = r.map((ri, i) => [CX - ri, ZAKLAD - h[i]] as [number, number]);
    const pravy = r.map((ri, i) => [CX + ri, ZAKLAD - h[i]] as [number, number]).reverse();
    const d = hladkaCesta([...levy, ...pravy]);
    tvary.forEach((t) => t.setAttribute("d", d));

    const vrch = ZAKLAD - h[6];
    okraj.setAttribute("cx", String(CX));
    okraj.setAttribute("cy", vrch.toFixed(1));
    okraj.setAttribute("rx", r[6].toFixed(1));
    okraj.setAttribute("ry", Math.max(3, r[6] * 0.2).toFixed(1));
    okraj.setAttribute("opacity", o.toFixed(2));

    // Rýhy od prstů: vodorovné oblouky po celé výšce, poloměr podle obrysu
    let rr = "";
    for (let y = ZAKLAD - 16; y > vrch + 8; y -= 20) {
      const vyska = ZAKLAD - y;
      let k = 0;
      while (k < h.length - 2 && h[k + 1] < vyska) k++;
      const t = omez((vyska - h[k]) / Math.max(1, h[k + 1] - h[k]));
      const polomer = mix(r[k], r[k + 1], t) - 3;
      if (polomer > 6) rr += `M${(CX - polomer).toFixed(1)} ${y} Q${CX} ${(y + polomer * 0.24).toFixed(1)} ${(CX + polomer).toFixed(1)} ${y} `;
    }
    ryhy.innerHTML = rr ? `<path d="${rr}" />` : "";
  };

  priScrollu((y, vh) => {
    const nove = prubeh(y, vh);
    if (Math.abs(nove - p) > 0.0004) {
      p = nove;
      kresli();
    }
    const f = FAZE.findIndex((x) => p < x.do);
    if (f !== faze && f >= 0) {
      faze = f;
      if (fazeEl) fazeEl.textContent = FAZE[f].nazev;
      if (rada) rada.textContent = FAZE[f].rada;
      kroky.forEach((k, i) => k.classList.toggle("je", i <= f));
      otacky = FAZE[f].ot;
      if (otackyEl) otackyEl.textContent = String(otacky);
    }
  });

  // Točení: proužky ujíždějí a značky na hlavě kruhu obíhají
  let minule = 0;
  kdyzVidet(scena, (t) => {
    const dt = minule ? Math.min(50, t - minule) / 1000 : 0.016;
    minule = t;
    if (klid) return;
    posun = (posun + otacky * 0.9 * dt) % 46;
    vzor?.setAttribute("patternTransform", `translate(${posun.toFixed(2)} 0)`);
    uhel += (otacky / 60) * Math.PI * 2 * 0.25 * dt;
    znacky.forEach((z, i) => {
      const a = uhel + (i * Math.PI * 2) / znacky.length;
      z.setAttribute("cx", (300 + Math.cos(a) * 150).toFixed(1));
      z.setAttribute("cy", (472 + Math.sin(a) * 31).toFixed(1));
      z.setAttribute("opacity", Math.sin(a) > -0.15 ? "1" : "0");
    });
  });
}

/* ——— 五 Rovina ——— */

export function rovina() {
  const scena = document.querySelector<HTMLElement>("[data-rovina]");
  if (!scena) return;
  const deska = scena.querySelector<HTMLElement>(".rovina-deska")!;
  const bublina = scena.querySelector<HTMLElement>(".vodovaha-bublina");
  const sklonEl = scena.querySelector(".rovina-sklon")!;
  const verdikt = scena.querySelector(".rovina-verdikt")!;
  const rekordEl = scena.closest(".zast")?.querySelector(".rovina-rekord");
  const kachlik = scena.querySelector<HTMLElement>(".rovina-kachlik");
  scena.tabIndex = 0;
  scena.setAttribute("aria-label", "Prkno s Kachlíkem. Naklání se myší, prstem nebo šipkami.");

  let cil = 4;
  let sklon = 4;
  let pohyb = 0;
  let rovneOd = 0;
  let rekord = 0;
  let bylRovne = false;
  let pochvala = false;

  scena.addEventListener("pointermove", (e) => {
    const r = scena.getBoundingClientRect();
    cil = ((e.clientX - r.left) / r.width - 0.5) * 18;
    pohyb = performance.now();
  });
  scena.addEventListener("pointerleave", () => { pohyb = 0; });
  scena.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    if (!pohyb) cil = sklon;
    cil = omez(cil + (e.key === "ArrowRight" ? 0.4 : -0.4), -9, 9);
    pohyb = performance.now();
  });

  kdyzVidet(scena, (t) => {
    const hraje = pohyb > 0 && t - pohyb < 2500;
    if (!hraje) cil = Math.sin(t / 1600) * 5 + Math.sin(t / 700) * 1.2;
    sklon += (cil - sklon) * (klid ? 1 : 0.12);
    deska.style.setProperty("--sklon", `${sklon.toFixed(2)}deg`);
    if (bublina) bublina.style.left = `${omez(50 - sklon * 5.4, 8, 92).toFixed(1)}%`;

    const a = Math.abs(sklon);
    sklonEl.textContent = cislo(a, 1);
    const rovne = a < 0.35;
    scena.classList.toggle("rovina-rovne", rovne);
    verdikt.textContent = rovne ? "dokonale rovně" : a < 1.5 ? "skoro" : a < 4 ? "nakřivo" : "nesnesitelné";

    if (rovne && !bylRovne) {
      rovneOd = t;
      if (hraje) zvuk.razitko();
    }
    if (rovne && hraje) {
      const d = (t - rovneOd) / 1000;
      if (d > rekord) {
        rekord = d;
        if (rekordEl) rekordEl.textContent = cislo(rekord, 1);
        if (rekord > 3 && !pochvala && kachlik) {
          pochvala = true;
          rekni(kachlik, "kachlik", "Tři vteřiny dokonalosti. Zapíšu si tě.");
        }
      }
    }
    bylRovne = rovne;
  });
}

/* ——— 六 Jméno ——— */

export function jmenoNaCedulku() {
  const pole = document.querySelector<HTMLInputElement>(".jmeno-pole input");
  if (!pole) return;
  const napis = document.querySelector<SVGTextElement>(".cedulka-napis");
  const radky = napis?.closest("svg")?.querySelector<SVGGElement>(".cedulka-radky");
  const cedulka = document.querySelector<HTMLElement>(".jmeno-cedulka");

  pole.addEventListener("input", () => {
    const v = pole.value.trim().slice(0, 16);
    if (napis) {
      napis.textContent = v;
      napis.setAttribute("font-size", String(v.length > 11 ? 13 : v.length > 7 ? 16 : 20));
    }
    if (radky) radky.style.opacity = v ? "0" : "1";
  });
  pole.addEventListener("change", () => {
    const v = pole.value.trim();
    if (v && cedulka) rekni(cedulka, "cedulka", `${v}. Zapamatováno. Za dva týdny se uvidíme.`);
  });
}

/* ——— 七 Police ——— */

export function police() {
  const scena = document.querySelector<HTMLElement>("[data-police]");
  if (!scena) return;
  const hrnky = [...scena.querySelectorAll<HTMLElement>(".hrnek")];
  const pocetEl = scena.closest(".zast")?.querySelector(".police-pocet");
  const samotka = scena.querySelector<HTMLElement>(".police-samotka");
  let top = 0;
  let vyska = 0;
  let posledni = -1;
  priMereni(() => {
    const p = pozice(scena);
    top = p.top;
    vyska = p.height;
  });
  priScrollu((y, vh) => {
    if (!vyska) return;
    const p = omez((y + vh * 0.85 - top) / (vyska * 0.9));
    let n = 0;
    for (const h of hrnky) {
      const je = p >= Number(h.dataset.prah);
      h.classList.toggle("polozeno", je);
      if (je) n++;
    }
    if (n === posledni) return;
    if (n > posledni && posledni >= 0) zvuk.cink();
    if (n === hrnky.length && posledni >= 0 && samotka) rekni(samotka, "samotka", "Devět cizích kusů. Zvládnu to. Vždycky to zvládnu.");
    posledni = n;
    if (pocetEl) pocetEl.textContent = String(n);
  });
}

/* ——— 八 Oheň ——— */

/** Barva žáru podle teploty — tak, jak ji hrnčíř vidí špehýrkou */
const ZAR: [number, string][] = [
  [0, "#1A0F0A"], [450, "#2A0C06"], [550, "#5A1206"], [650, "#8A1A08"], [750, "#B0260C"],
  [850, "#D23D12"], [950, "#EA5E18"], [1050, "#F5841F"], [1150, "#FBAD3C"], [1230, "#FFD36B"], [1300, "#FFF0B8"],
];
const barvaZaru = (T: number) => {
  let i = 0;
  while (i < ZAR.length - 2 && ZAR[i + 1][0] <= T) i++;
  const [t0, a] = ZAR[i];
  const [t1, b] = ZAR[i + 1];
  return mixBarva(a, b, omez((T - t0) / (t1 - t0)));
};
const T_MAX = krivka[krivka.length - 1][0];
const teplotaV = (t: number) => {
  for (let i = 1; i < krivka.length; i++) {
    const [t0, T0] = krivka[i - 1];
    const [t1, T1] = krivka[i];
    if (t <= t1) return mix(T0, T1, omez((t - t0) / Math.max(0.0001, t1 - t0)));
  }
  return krivka[krivka.length - 1][1];
};

export function pec() {
  const scena = document.querySelector<HTMLElement>("[data-pec]");
  if (!scena) return;
  const zast = scena.closest<HTMLElement>(".zast")!;
  const teplotaEl = zast.querySelector(".pec-teplota")!;
  const casEl = zast.querySelector(".pec-cas-hod")!;
  const orez = zast.querySelector<SVGRectElement>(".pec-krivka-orez");
  const tecka = zast.querySelector<SVGCircleElement>(".pec-krivka-tecka");
  const body = [...zast.querySelectorAll<SVGCircleElement>(".pec-milnik-bod")];
  const box = zast.querySelector<HTMLElement>(".pec-milnik")!;
  const kdo = box.querySelector(".pec-milnik-kdo")!;
  const text = box.querySelector(".pec-milnik-text")!;
  const replika = box.querySelector(".pec-milnik-replika")!;
  const kuzely = [...scena.querySelectorAll<SVGPathElement>(".zaromerka")];
  const spehyrka = scena.querySelector<HTMLButtonElement>(".spehyrka")!;
  const pohled = scena.querySelector<HTMLElement>(".spehyrka-pohled")!;
  const zavrit = scena.querySelector<HTMLButtonElement>(".spehyrka-zavrit")!;
  const prubeh = prubehSekce(zast);
  let top = 0;
  let vyska = 0;
  priMereni(() => {
    const p = pozice(zast);
    top = p.top;
    vyska = p.height;
  });
  let posledni = -2;

  const zobraz = (m: number) => {
    if (m === -1) {
      kdo.textContent = "Pecinka · 20 °C";
      text.textContent = "Pec je studená. Sjeď dolů a začni topit.";
      replika.textContent = "„Brr.“";
    } else if (m === 99) {
      kdo.textContent = "Pecinka · chladne";
      text.textContent = "A teď celou noc chladnout. Kdo pec otevře moc brzo, potká Střípka.";
      replika.textContent = "„Dobrou noc. Neotvírat.“";
    } else {
      const mm = milniky[m];
      kdo.textContent = `${jmeno(mm.kdo)} · ${cislo(mm.teplota)} °C`;
      text.textContent = mm.text;
      replika.textContent = `„${mm.replika}“`;
    }
    body.forEach((b, i) => b.classList.toggle("je", m === 99 || i <= m));
    box.classList.remove("novy");
    void box.offsetWidth;
    box.classList.add("novy");
  };

  priScrollu((y, vh) => {
    const p = prubeh(y, vh);
    const t = p * T_MAX;
    const T = teplotaV(t);
    teplotaEl.textContent = cislo(Math.round(T));
    const hod = Math.floor(t);
    const min = Math.min(59, Math.round((t - hod) * 60));
    casEl.textContent = `${hod} h ${String(min).padStart(2, "0")} min`;

    const sila = omez((T - 420) / 760);
    const barva = barvaZaru(T);
    zast.style.setProperty("--zar-barva", barva);
    zast.style.setProperty("--zar-sila", sila.toFixed(3));
    zast.style.setProperty("--zar-velikost", (0.55 + sila * 0.6).toFixed(3));
    zast.style.setProperty("--jiskry", omez((T - 800) / 400).toFixed(2));
    zast.style.setProperty("--zar-text", mixBarva("#2B2420", "#C4432B", omez((T - 500) / 500)));

    const x = 20 + (t / T_MAX) * 270;
    orez?.setAttribute("width", x.toFixed(1));
    tecka?.setAttribute("cx", x.toFixed(1));
    tecka?.setAttribute("cy", (108 - (T / 1320) * 96).toFixed(1));

    for (const k of kuzely) {
      const ohyb = omez((T - Number(k.dataset.od)) / (Number(k.dataset.do) - Number(k.dataset.od)));
      k.setAttribute("transform", `rotate(${(8 + hladce(ohyb) * 92).toFixed(1)})`);
    }

    let m = -1;
    milniky.forEach((mm, i) => {
      if (T >= mm.teplota - 0.5) m = i;
    });
    if (p >= 0.985) m = 99;
    if (m !== posledni) {
      posledni = m;
      zobraz(m);
    }

    const uvnitr = y + vh > top && y < top + vyska;
    zvuk.nastavPec(uvnitr ? sila : 0);
  });

  const otevri = (ano: boolean) => {
    pohled.hidden = !ano;
    spehyrka.setAttribute("aria-expanded", String(ano));
    if (ano) {
      zvuk.papir();
      zavrit.focus();
    } else spehyrka.focus();
  };
  spehyrka.addEventListener("click", () => otevri(pohled.hidden));
  zavrit.addEventListener("click", () => otevri(false));
}

/* ——— 九 Kintsugi ——— */

export function kintsugi() {
  const scena = document.querySelector<HTMLElement>("[data-kintsugi]");
  if (!scena) return;
  const zast = scena.closest<HTMLElement>(".zast")!;
  const dily = [...scena.querySelectorAll<SVGGElement>(".kin-dil")].map((g) => ({
    g,
    posun: g.dataset.posun!.split(",").map(Number),
    uhel: Number(g.dataset.uhel),
    stred: g.dataset.stred!.split(",").map(Number),
  }));
  const spary = [...scena.querySelectorAll<SVGPathElement>(".kin-spara")];
  const delky = spary.map((s) => s.getTotalLength());
  spary.forEach((s, i) => {
    s.style.strokeDasharray = String(delky[i]);
    s.style.strokeDashoffset = String(delky[i]);
  });
  const jiskry = scena.querySelector<SVGGElement>(".kin-jiskry")!;
  const stitek = scena.querySelector(".kin-stitek")!;
  const kroky = [...zast.querySelectorAll<HTMLElement>(".kroky li")];
  const stripek = scena.querySelector<HTMLElement>("[data-kami='stripek']");
  const prubeh = prubehSekce(zast);
  const NAZVY = ["Střepy", "Lepení lakem", "Zlato do spár", "Hotovo"];
  let krokMinule = -1;

  priScrollu((y, vh) => {
    const p = prubeh(y, vh);
    const k = 1 - hladce(omez(p / 0.45));
    for (const d of dily) {
      d.g.setAttribute(
        "transform",
        `translate(${(d.posun[0] * k).toFixed(1)} ${(d.posun[1] * k).toFixed(1)}) rotate(${(d.uhel * k).toFixed(2)} ${d.stred[0]} ${d.stred[1]})`,
      );
    }
    const zlato = omez((p - 0.5) / 0.35);
    spary.forEach((s, i) => { s.style.strokeDashoffset = (delky[i] * (1 - zlato)).toFixed(1); });
    jiskry.setAttribute("opacity", omez((p - 0.86) / 0.08).toFixed(2));

    const krok = p < 0.45 ? 0 : p < 0.6 ? 1 : p < 0.88 ? 2 : 3;
    if (krok === krokMinule) return;
    stitek.textContent = NAZVY[krok];
    kroky.forEach((li, i) => li.classList.toggle("je", i < krok));
    if (krok === 3 && krokMinule === 2) {
      zvuk.zlato();
      if (stripek) rekni(stripek, "stripek", "Vidíš? Teď je hezčí než předtím. Já to říkal.");
    }
    krokMinule = krok;
  });
}
