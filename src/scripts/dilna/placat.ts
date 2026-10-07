/**
 * Placat — stůl shora (components/dilna/Placat.astro), všechno v mm.
 *
 * Hlína drží objem: plát má tloušťku t a půdorys elipsy s poloosami
 * Wx (napříč) a Ly (podél válení), π · Wx · Ly · t = V. Dvě plácnutí dlaní
 * udělají z hroudy placku. Válek pak ubírá tloušťku směrem k lištám
 * (6 mm) — jeden přejezd přes celou hlínu vezme polovinu toho, co nad
 * lištami zbývá — a hlína se roztahuje hlavně ve směru válení. Napříč ji
 * drží lišty, podél konec plátna. Kdo plát neotáčí, má z něj jazyk.
 *
 * Okraj plátu je trochu zvlněný (pár harmonických s náhodnou fází) a se
 * ztenčováním se zvlní víc, jako skutečný plát. Vlnky se točí s plátem:
 * po otočení o čtvrt otáčky vypadá plát stejně, jen otočený.
 *
 * Hotový plát se vykrojí podle šablony — jehla objede obrys, odřezky
 * zmizí zpátky do pytle a z výkroje je tvůj kus.
 */
import { omez, hladce, klid, kdyzVidet, mixBarva } from "../parta2/stav";
import * as zvuk from "../parta2/zvuk";
import { rekni } from "../parta2/kami";
import { profil } from "../../components/dilna/kus";
import type { Kus } from "../../components/dilna/kus";
import { ulozKus, ukazVysledek } from "./stav-kusu";

const CX = 320;
const CY = 220;
const V = 340_000;
const T0 = 60;
const PLACNUTI = [40, 26];
const T_MIN = 6;
const W_MAX = 166;
const L_MAX = 184;
const K = 0.5;
const BODU = 56;

type Faze = "hrouda" | "valeni" | "plat" | "rez" | "hotovo";
type SablonaId = "talir" | "miska" | "hrnek" | "kachel";

interface Sablona {
  nazev: string;
  /** Vejde se? Vrátí orientaci obrysu, nebo null */
  vejde: (wx: number, ly: number) => "svisle" | "vodorovne" | null;
  obrys: (o: "svisle" | "vodorovne") => string;
  kus: () => Kus;
  /** Co říct, když se nevejde */
  malo: string;
}

const kruh = (r: number) => `M${CX - r} ${CY} A${r} ${r} 0 1 0 ${CX + r} ${CY} A${r} ${r} 0 1 0 ${CX - r} ${CY} Z`;
const obdelnik = (w: number, h: number, zaobleni = 5) => {
  const x0 = CX - w / 2;
  const y0 = CY - h / 2;
  const z = zaobleni;
  return `M${x0 + z} ${y0} H${x0 + w - z} Q${x0 + w} ${y0} ${x0 + w} ${y0 + z} V${y0 + h - z} Q${x0 + w} ${y0 + h} ${x0 + w - z} ${y0 + h} H${x0 + z} Q${x0} ${y0 + h} ${x0} ${y0 + h - z} V${y0 + z} Q${x0} ${y0} ${x0 + z} ${y0} Z`;
};
const REZERVA = 0.94;

const SABLONY: Record<SablonaId, Sablona> = {
  talir: {
    nazev: "Talíř z plátu",
    vejde: (wx, ly) => (Math.min(wx, ly) * REZERVA >= 102 ? "svisle" : null),
    obrys: () => kruh(100),
    kus: () => ({ puvod: "plat", druh: "talir", nazev: "Talíř z plátu", r: profil((t) => 56 + 42 * Math.pow(t, 1.6)), v: 22, glazury: [], dno: false }),
    malo: "Na talíř je plát úzký. Zmačkej ho a otáčej — ať je kulatý.",
  },
  miska: {
    nazev: "Miska z plátu",
    vejde: (wx, ly) => (Math.min(wx, ly) * REZERVA >= 82 ? "svisle" : null),
    obrys: () => kruh(80),
    kus: () => ({ puvod: "plat", druh: "miska", nazev: "Miska z plátu", r: profil((t) => 30 + 40 * Math.pow(Math.sin((t * Math.PI) / 2), 0.9)), v: 50, glazury: [], dno: false }),
    malo: "Na misku je plát malý. Vyválej ho víc do šířky.",
  },
  hrnek: {
    nazev: "Hrnek z plátu",
    vejde: (wx, ly) => (wx * REZERVA >= 47 && ly * REZERVA >= 122 ? "svisle" : wx * REZERVA >= 122 && ly * REZERVA >= 47 ? "vodorovne" : null),
    obrys: (o) => (o === "svisle" ? obdelnik(90, 240) : obdelnik(240, 90)),
    kus: () => ({ puvod: "plat", druh: "hrnek", nazev: "Hrnek z plátu", r: profil((t) => 38 + 1.4 * Math.sin(t * 7)), v: 90, ucho: true, sev: true, glazury: [], dno: false }),
    malo: "Na hrnek je potřeba pruh dlouhý 24 centimetrů. Válej podél.",
  },
  kachel: {
    nazev: "Kachel",
    vejde: (wx, ly) => (Math.min(wx, ly) * REZERVA >= 67 ? "svisle" : null),
    obrys: () => obdelnik(130, 130, 3),
    kus: () => ({ puvod: "plat", druh: "kachel", nazev: "Kachel z plátu", r: profil(() => 65), v: 130, glazury: [], dno: false }),
    malo: "Na kachel je plát malý. Ještě válkem.",
  },
};

/** Uzavřená hladká křivka bodů */
function uzavrena(b: [number, number][]) {
  const n = b.length;
  const f = (x: number) => x.toFixed(1);
  let d = `M${f(b[0][0])} ${f(b[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = b[(i - 1 + n) % n];
    const p1 = b[i];
    const p2 = b[(i + 1) % n];
    const p3 = b[(i + 2) % n];
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + " Z";
}

export function placat() {
  const sc = document.querySelector<HTMLElement>("[data-placat]");
  if (!sc) return;
  const okno = sc.querySelector<HTMLElement>(".pl-okno")!;
  const svg = sc.querySelector<SVGSVGElement>(".d-scena-svg")!;
  const dotyk = sc.querySelector<HTMLElement>(".pl-dotyk")!;
  const tvary = [...sc.querySelectorAll<SVGPathElement>(".pl-tvar")];
  const stin = sc.querySelector<SVGPathElement>(".pl-stin")!;
  const hlinaG = sc.querySelector<SVGGElement>(".pl-hlina-g")!;
  const lesk = sc.querySelector<SVGEllipseElement>(".pl-lesk")!;
  const dlane = sc.querySelector<SVGGElement>(".pl-dlane")!;
  const sablonaCara = sc.querySelector<SVGPathElement>(".pl-sablona")!;
  const rezCara = sc.querySelector<SVGPathElement>(".pl-rez")!;
  const jehla = sc.querySelector<SVGGElement>(".pl-jehla")!;
  const valek = sc.querySelector<SVGGElement>(".pl-valek")!;
  const stopy = {
    svetlo: sc.querySelector<SVGStopElement>(".pl-hlina-svetlo")!,
    stred: sc.querySelector<SVGStopElement>(".pl-hlina-stred")!,
    stin: sc.querySelector<SVGStopElement>(".pl-hlina-stin")!,
  };
  const fazeEl = sc.querySelector<HTMLElement>(".pl-faze")!;
  const tloustkaEl = sc.querySelector<HTMLElement>(".pl-tloustka")!;
  const radaText = sc.querySelector<HTMLElement>(".d-rada-text")!;
  const rada = sc.querySelector<HTMLElement>(".d-rada")!;
  const btPlacni = sc.querySelector<HTMLButtonElement>(".pl-placni")!;
  const btPrejet = sc.querySelector<HTMLButtonElement>(".pl-prejet")!;
  const btOtocit = sc.querySelector<HTMLButtonElement>(".pl-otocit")!;
  const sablonyBox = sc.querySelector<HTMLElement>(".pl-sablony")!;
  const sablonaTl = [...sc.querySelectorAll<HTMLButtonElement>("[data-sablona]")];
  const vysledek = sc.querySelector<HTMLElement>(".pl-vysledek")!;
  const kamiHlinka = sc.querySelector<HTMLElement>(".pl-kami");

  /* ——— Stav ——— */
  let faze: Faze = "hrouda";
  let t = T0;
  let wx = Math.sqrt(V / T0 / Math.PI);
  let ly = wx;
  let placnuti = 0;
  let prejezdu = 0;
  let otoceni = 0;
  /** Natočení vlnek okraje (v násobcích čtvrt otáčky) a rozpracované otáčení 0–1 */
  let natoceni = 0;
  let otaci = 0;
  let harm: { k: number; a: number; f: number }[] = [];
  let valekY = 64;
  let valekCil = 64;
  let tahne = false;
  let jedePrejezd: { cil: number } | null = null;
  let zaseknuto = false;
  let rekl = new Set<string>();
  let squash = 0;
  let zmeneno = true;

  const novaHrouda = () => {
    faze = "hrouda";
    t = T0;
    wx = ly = Math.sqrt(V / T0 / Math.PI);
    placnuti = 0;
    prejezdu = 0;
    otoceni = 0;
    natoceni = 0;
    otaci = 0;
    zaseknuto = false;
    rekl = new Set();
    harm = [2, 3, 5, 7, 11].map((k, i) => ({ k, a: [0.03, 0.022, 0.014, 0.009, 0.006][i], f: Math.random() * Math.PI * 2 }));
    valekY = valekCil = 64;
    sablonaCara.style.opacity = "0";
    rezCara.style.opacity = "0";
    jehla.style.opacity = "0";
    hlinaG.querySelector(".pl-odrezky")?.remove();
    vysledek.hidden = true;
    sablonyBox.hidden = true;
    rikej("Začni dlaní. Plácni do hroudy — dvakrát, ať je z ní placka.");
    tlacitka();
    zmeneno = true;
  };

  const rikej = (s: string) => {
    radaText.textContent = s;
    rada.classList.remove("nova");
    void rada.offsetWidth;
    rada.classList.add("nova");
  };
  const jednou = (klic: string, s: string) => {
    if (rekl.has(klic)) return;
    rekl.add(klic);
    rikej(s);
  };

  const tlacitka = () => {
    btPlacni.disabled = faze !== "hrouda";
    btPrejet.disabled = !(faze === "valeni" || faze === "plat");
    btOtocit.disabled = !(faze === "valeni" || faze === "plat");
    sablonyBox.hidden = faze !== "plat";
    if (faze === "plat") {
      sablonaTl.forEach((b) => {
        const s = SABLONY[b.dataset.sablona as SablonaId];
        b.classList.toggle("nevejde", !s.vejde(wx, ly));
      });
    }
    dotyk.classList.toggle("vali", faze === "valeni" || faze === "plat");
  };

  /* ——— Tvar hlíny ——— */
  const tvarHliny = () => {
    const vlnka = 1 + (T0 - t) / (T0 - T_MIN);
    const posun = (natoceni * Math.PI) / 2;
    const b: [number, number][] = [];
    const sx = 1 + squash * 0.08;
    const sy = 1 - squash * 0.05;
    for (let i = 0; i < BODU; i++) {
      const th = (i / BODU) * Math.PI * 2;
      let n = 0;
      for (const h of harm) n += h.a * Math.sin(h.k * (th - posun) + h.f);
      n *= vlnka;
      b.push([CX + wx * sx * Math.cos(th) * (1 + n), CY + ly * sy * Math.sin(th) * (1 + n)]);
    }
    return uzavrena(b);
  };

  const kresli = () => {
    valek.setAttribute("transform", `translate(0 ${valekY.toFixed(1)})`);
    fazeEl.textContent =
      faze === "hrouda" ? (placnuti ? "Placka" : "Hrouda") : faze === "valeni" ? "Válí se" : faze === "plat" ? "Plát" : faze === "rez" ? "Vykrajuje se" : "Hotovo";
    tloustkaEl.textContent = String(Math.round(t));
    /* Po vykrojení drží hlína tvar šablony — válek už ji nepřekreslí */
    if (faze === "rez" || faze === "hotovo") return;
    const d = tvarHliny();
    tvary.forEach((p) => p.setAttribute("d", d));
    stin.setAttribute("d", d);
    const vyska = t * 0.32;
    stin.setAttribute("transform", `translate(${(vyska * 0.6).toFixed(1)} ${vyska.toFixed(1)})`);
    hlinaG.setAttribute("transform", otaci > 0 ? `rotate(${(otaci * 90).toFixed(1)} ${CX} ${CY})` : "");
    const plochost = omez((T0 - t) / (T0 - T_MIN));
    stopy.svetlo.setAttribute("stop-color", mixBarva("#C9A386", "#A88468", plochost));
    stopy.stred.setAttribute("stop-color", mixBarva("#9C7860", "#977258", plochost));
    stopy.stin.setAttribute("stop-color", mixBarva("#5E4334", "#86654F", plochost));
    lesk.setAttribute("cx", (CX - wx * 0.22).toFixed(1));
    lesk.setAttribute("cy", (CY - ly * 0.24).toFixed(1));
    lesk.setAttribute("rx", (wx * 0.36).toFixed(1));
    lesk.setAttribute("ry", (ly * 0.26).toFixed(1));
    lesk.setAttribute("opacity", (0.12 + (1 - plochost) * 0.4).toFixed(2));
  };

  /* ——— Plácnutí ——— */
  const dlan = (x: number, y: number) => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "pl-dlan");
    g.setAttribute("transform", `translate(${x.toFixed(0)} ${y.toFixed(0)}) rotate(${(-14 + Math.random() * 28).toFixed(0)})`);
    g.innerHTML =
      '<ellipse cx="0" cy="8" rx="23" ry="27" fill="#E8CBB0" opacity="0.55"/>' +
      [-15, -5, 5, 15].map((fx, i) => `<rect x="${fx - 4.5}" y="${-44 + Math.abs(i - 1.5) * 4}" width="9" height="${30 - Math.abs(i - 1.5) * 4}" rx="4.5" fill="#E8CBB0" opacity="0.5"/>`).join("") +
      '<rect x="20" y="-6" width="9" height="24" rx="4.5" transform="rotate(-38 24 6)" fill="#E8CBB0" opacity="0.5"/>';
    dlane.append(g);
    window.setTimeout(() => g.remove(), 1300);
  };

  const placni = (x = CX, y = CY) => {
    if (faze !== "hrouda") {
      if (faze === "valeni") jednou("dost-placani", "Dlaní už stačí. Teď válkem.");
      return;
    }
    const tNova = PLACNUTI[placnuti];
    const pomer = t / tNova;
    t = tNova;
    wx *= Math.sqrt(pomer);
    ly *= Math.sqrt(pomer);
    placnuti++;
    squash = 1;
    dlan(x, y);
    zvuk.hnet();
    if (placnuti >= PLACNUTI.length) {
      faze = "valeni";
      rikej("Placka. Teď válkem — táhni ho přes hlínu tam a zpátky. Jede po lištách, takže plát bude všude stejně tlustý.");
    } else rikej("Ještě jednou.");
    tlacitka();
    zmeneno = true;
  };

  /* ——— Válení ——— */
  const valej = (y0: number, y1: number) => {
    if (faze !== "valeni" && faze !== "plat") return;
    const a = Math.min(y0, y1);
    const b = Math.max(y0, y1);
    const d = Math.max(0, Math.min(b, CY + ly * 1.02) - Math.max(a, CY - ly * 1.02));
    if (d <= 0) return;
    if (t <= T_MIN + 0.01) {
      jednou("na-listach", "Válek už jede po lištách — tenčí to nebude. Vyber šablonu.");
      return;
    }
    const f = d / (2 * ly);
    const tNova = T_MIN + (t - T_MIN) * (1 - K * f);
    const pomer = t / tNova;
    let nly = ly * Math.pow(pomer, 0.8);
    let nwx = wx * Math.pow(pomer, 0.2);
    nly = Math.min(nly, L_MAX);
    nwx = Math.min(nwx, W_MAX);
    let tt = tNova;
    const potreba = V / tNova / Math.PI;
    if (nly * nwx < potreba) {
      if (nly < L_MAX) nly = Math.min(L_MAX, potreba / nwx);
      if (nly * nwx < potreba && nwx < W_MAX) nwx = Math.min(W_MAX, potreba / nly);
      if (nly * nwx < potreba) {
        tt = V / (Math.PI * nly * nwx);
        if (!zaseknuto) {
          zaseknuto = true;
          rikej("Plát už nemá kam — z plátna utíká a lišty ho nepustí. Otoč ho.");
        }
      }
    }
    t = Math.max(T_MIN, tt);
    if (t - T_MIN < 0.35) t = T_MIN;
    ly = nly;
    wx = nwx;
    zmeneno = true;

    /* Průběh a rady */
    prejezdu += f;
    if (faze === "valeni" && t <= T_MIN) {
      faze = "plat";
      zvuk.cink();
      rikej(`Šest milimetrů, jako lišty. Hotový plát ${Math.round(wx * 0.2)} × ${Math.round(ly * 0.2)} cm — vyber šablonu.`);
      if (kamiHlinka) rekni(kamiHlinka, "hlinka", "Plát! Teď to začne být zajímavé.");
      tlacitka();
    } else if (faze === "valeni") {
      if (ly >= L_MAX - 1 && !zaseknuto) jednou("utika", "Utíká ti z plátna. Otoč plát o čtvrt otáčky.");
      else if (ly / wx > 1.7 && otoceni === 0) jednou("jazyk", "Je z toho jazyk. Otoč plát o čtvrt otáčky, ať se táhne do všech stran.");
      else if (prejezdu > 0.9) jednou("prvni", "Ještě. Válek ubírá, dokud nedosedne na lišty.");
    }
  };

  const otoc = () => {
    if (!(faze === "valeni" || faze === "plat") || otaci > 0) return;
    zvuk.papir();
    otoceni++;
    const hotovo = () => {
      const w = wx;
      wx = Math.min(ly, W_MAX);
      ly = Math.min(w, L_MAX);
      /* Kdyby se po otočení plát nevešel mezi lišty, dorovná se tloušťka */
      t = Math.max(T_MIN, V / (Math.PI * wx * ly));
      natoceni = (natoceni + 1) % 4;
      otaci = 0;
      zaseknuto = false;
      if (faze === "plat" && t > T_MIN) faze = "valeni";
      tlacitka();
      zmeneno = true;
    };
    if (klid) {
      hotovo();
      return;
    }
    const start = performance.now();
    const krok = (ted: number) => {
      otaci = Math.max(0.001, hladce(omez((ted - start) / 420)));
      zmeneno = true;
      if (otaci < 1) requestAnimationFrame(krok);
      else hotovo();
    };
    requestAnimationFrame(krok);
    if (faze === "valeni") jednou("otoceno", "Tak. Teď zase válkem.");
  };

  /* Jeden celý přejezd tlačítkem nebo klávesou — válek přejede hlínu a vrátí se nad ni */
  const prejed = () => {
    if (!(faze === "valeni" || faze === "plat") || jedePrejezd) return;
    const nahore = CY - ly - 30;
    const dole = CY + ly + 30;
    const dolu = valekY < CY;
    valekCil = valekY;
    jedePrejezd = { cil: omez(dolu ? dole : nahore, 18, 422) };
    if (klid) {
      valej(valekY, jedePrejezd.cil);
      valekY = valekCil = jedePrejezd.cil;
      jedePrejezd = null;
      zmeneno = true;
    }
  };

  /* ——— Šablony ——— */
  const ukazSablonu = (id: SablonaId | null) => {
    if (faze !== "plat") return;
    const s = id ? SABLONY[id] : null;
    const o = s?.vejde(wx, ly) ?? "svisle";
    sablonaCara.setAttribute("d", s ? s.obrys(o) : "");
    sablonaCara.style.opacity = s ? "1" : "0";
    sablonaCara.classList.toggle("nevejde", !!s && !s.vejde(wx, ly));
  };

  const vykroj = (id: SablonaId) => {
    if (faze !== "plat") return;
    const s = SABLONY[id];
    const o = s.vejde(wx, ly);
    if (!o) {
      ukazSablonu(id);
      rikej(s.malo);
      return;
    }
    faze = "rez";
    tlacitka();
    sablonaCara.style.opacity = "0";
    const d = s.obrys(o);
    rezCara.setAttribute("d", d);
    const delka = rezCara.getTotalLength?.() || 800;
    rezCara.style.strokeDasharray = `${delka}`;
    rezCara.style.strokeDashoffset = `${delka}`;
    rezCara.style.opacity = "1";
    jehla.style.opacity = "1";
    zvuk.papir();
    rikej("Jehlou kolem šablony. Pomalu a kolmo.");

    const dokonci = () => {
      /* Odřezky: kopie celého plátu pod výkrojem, která zmizí */
      const odrezky = document.createElementNS("http://www.w3.org/2000/svg", "path");
      odrezky.setAttribute("class", "pl-odrezky");
      odrezky.setAttribute("d", tvarHliny());
      odrezky.setAttribute("fill", "#977258");
      hlinaG.insertBefore(odrezky, hlinaG.firstChild);
      tvary.forEach((p) => p.setAttribute("d", d));
      stin.setAttribute("d", d);
      rezCara.style.opacity = "0";
      jehla.style.opacity = "0";
      void odrezky.getBoundingClientRect();
      odrezky.classList.add("pryc");
      rikej("Odřezky zpátky do pytle. V dílně se hlína nevyhazuje.");
      window.setTimeout(
        () => {
          faze = "hotovo";
          const kus = s.kus();
          const u = { kus, stav: "mokry" as const };
          ulozKus(u);
          ukazVysledek(vysledek, u, "pl-vysledek-kus");
          zvuk.cink();
          rikej(
            id === "hrnek"
              ? "Pruh se stočí do válce, přilepí na dno a z odřezku je ucho. Spoje rozrýt a potřít šlikrem — jinak v peci prasknou."
              : id === "kachel"
                ? "Kachel. Kachlík by řekl, že je skoro rovný. Ať schne pomalu a obrácený, jinak se zkroutí."
                : "Plát se položí na sádrovou formu a nechá zavadnout. Pak se z formy sundá a začistí okraj.",
          );
          if (kamiHlinka) window.setTimeout(() => rekni(kamiHlinka, "hlinka", "Zatím jsem byla jenom hrouda. Ale to se dá spravit."), 600);
        },
        klid ? 0 : 900,
      );
    };

    if (klid) {
      dokonci();
      return;
    }
    const start = performance.now();
    const doba = 1300;
    const krok = (ted: number) => {
      const p = omez((ted - start) / doba);
      rezCara.style.strokeDashoffset = `${delka * (1 - p)}`;
      const bod = rezCara.getPointAtLength?.(delka * p);
      if (bod) jehla.setAttribute("transform", `translate(${bod.x.toFixed(1)} ${bod.y.toFixed(1)}) rotate(14)`);
      if (p < 1) requestAnimationFrame(krok);
      else dokonci();
    };
    requestAnimationFrame(krok);
  };

  sablonaTl.forEach((b) => {
    const id = b.dataset.sablona as SablonaId;
    b.addEventListener("mouseenter", () => ukazSablonu(id));
    b.addEventListener("focus", () => ukazSablonu(id));
    b.addEventListener("mouseleave", () => ukazSablonu(null));
    b.addEventListener("blur", () => ukazSablonu(null));
    b.addEventListener("click", () => vykroj(id));
  });

  /* ——— Myš a prst ——— */
  const bodVeScene = (e: PointerEvent) => {
    const r = svg.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 640, y: ((e.clientY - r.top) / r.height) * 440 };
  };
  const naHline = (x: number, y: number) => ((x - CX) / (wx * 1.08)) ** 2 + ((y - CY) / (ly * 1.08)) ** 2 <= 1;

  let id: number | null = null;
  dotyk.addEventListener("pointerdown", (e) => {
    zvuk.odemkni();
    const b = bodVeScene(e);
    if (faze === "hrouda") {
      if (naHline(b.x, b.y)) placni(b.x, b.y);
      else rikej("Plácni přímo do hroudy. Válek až potom — kouli by jen kutálel.");
      return;
    }
    if (faze !== "valeni" && faze !== "plat") return;
    id = e.pointerId;
    dotyk.setPointerCapture(e.pointerId);
    tahne = true;
    jedePrejezd = null;
    valekCil = omez(b.y, 18, 422);
    e.preventDefault();
  });
  dotyk.addEventListener("pointermove", (e) => {
    if (!tahne || e.pointerId !== id) return;
    valekCil = omez(bodVeScene(e).y, 18, 422);
  });
  const pust = (e: PointerEvent) => {
    if (e.pointerId !== id) return;
    tahne = false;
    id = null;
  };
  dotyk.addEventListener("pointerup", pust);
  dotyk.addEventListener("pointercancel", pust);

  dotyk.addEventListener("keydown", (e) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (faze === "hrouda") placni();
      else prejed();
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      if (faze !== "valeni" && faze !== "plat") return;
      e.preventDefault();
      jedePrejezd = null;
      valekCil = omez(valekCil + (e.key === "ArrowUp" ? -36 : 36), 18, 422);
    } else if (e.key === "r" || e.key === "R") otoc();
  });

  btPlacni.addEventListener("click", () => placni());
  btPrejet.addEventListener("click", prejed);
  btOtocit.addEventListener("click", otoc);
  sc.querySelectorAll<HTMLButtonElement>(".pl-znovu").forEach((b) =>
    b.addEventListener("click", () => {
      zvuk.hnet();
      novaHrouda();
    }),
  );

  /* ——— Smyčka: válek dojíždí za prstem a cestou válí ——— */
  kdyzVidet(okno, () => {
    if (jedePrejezd) {
      valekCil = jedePrejezd.cil;
      if (Math.abs(valekY - jedePrejezd.cil) < 2) {
        jedePrejezd = null;
        zvuk.drevo(1.1);
      }
    }
    const rozdil = valekCil - valekY;
    if (Math.abs(rozdil) > 0.2) {
      const krok = omez(rozdil * 0.35, -16, 16);
      const y0 = valekY;
      valekY += krok;
      valej(y0, valekY);
      zmeneno = true;
    }
    if (squash > 0) {
      squash = Math.max(0, squash - 0.08);
      zmeneno = true;
    }
    if (zmeneno) {
      zmeneno = false;
      kresli();
    }
  });

  novaHrouda();
  kresli();
}
