/**
 * Kruh nanečisto. Hlína je obrys o N bodech (poloměr v každé výšce)
 * a drží si objem: když ji člověk vytáhne nahoru, ztenčí se, když ji
 * stlačí, rozšíří se. Fyzika je přibližná, ale chová se jako hlína:
 *
 *   centrování  — hlína se klepe; držením na rychlém kruhu se uklidní
 *   otevření    — stisk shora doprostřed
 *   vytahování  — tah nahoru (dolů stlačuje)
 *   tvarování   — tah do strany v té výšce, kde je ruka
 *
 * Kdo táhne moc rychle, točí moc rychle, nechá hlínu vyschnout nebo
 * vytáhne moc tenké stěny, tomu se rozkmitá a spadne.
 */
import { glazury } from "../../data/kurzy2";
import { hladce, kdyzVidet, klid, mix, omez } from "../parta2/stav";
import { rekni } from "../parta2/kami";
import * as zvuk from "../parta2/zvuk";

const N = 24;
const CX = 300;
const ZAKLAD = 468;
const R_MIN = 14;
const R_MAX = 165;
const H_MIN = 60;
const H_MAX = 320;
const KMIT_START = 18;
const KMIT_PAD = 17;

type Faze = "ceka" | "centrovani" | "otevirani" | "toceni" | "hotovo" | "spadlo";

const f1 = (n: number) => n.toFixed(1);

function hladkaCesta(body: [number, number][]) {
  let d = `M${f1(body[0][0])} ${f1(body[0][1])}`;
  for (let i = 0; i < body.length - 1; i++) {
    const p0 = body[i - 1] ?? body[i];
    const p1 = body[i];
    const p2 = body[i + 1];
    const p3 = body[i + 2] ?? p2;
    d += ` C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`;
  }
  return d + " Z";
}

export function simulator() {
  const sim = document.querySelector<HTMLElement>("[data-simulator]");
  if (!sim) return;
  const dotyk = sim.querySelector<HTMLElement>(".sim-dotyk")!;
  const tvary = [...sim.querySelectorAll<SVGPathElement>(".sim-tvar")];
  const skupina = sim.querySelector<SVGGElement>(".sim-hlina-skupina")!;
  const okraj = sim.querySelector<SVGEllipseElement>(".sim-okraj")!;
  const ryhy = sim.querySelector<SVGGElement>(".sim-ryhy")!;
  const vzor = sim.querySelector<SVGPatternElement>("#sim-toceni");
  const znacky = [...sim.querySelectorAll<SVGCircleElement>(".sim-znacka")];
  const prst = sim.querySelector<SVGCircleElement>(".sim-prst")!;
  const stopy = {
    stin: [...sim.querySelectorAll<SVGStopElement>(".sim-hlina-1")],
    stred: [...sim.querySelectorAll<SVGStopElement>(".sim-hlina-2")],
    svetlo: [...sim.querySelectorAll<SVGStopElement>(".sim-hlina-3")],
  };
  const fazeEl = sim.querySelector(".sim-faze")!;
  const otackyEl = sim.querySelector(".sim-otacky")!;
  const rada = sim.querySelector<HTMLElement>(".sim-rada")!;
  const radaText = sim.querySelector(".sim-rada-text")!;
  const pedal = sim.querySelector<HTMLInputElement>(".sim-pedal input")!;
  const pedalVen = sim.querySelector(".sim-pedal output b")!;
  const hotovo = sim.querySelector<HTMLButtonElement>(".sim-hotovo")!;
  const znovu = sim.querySelector<HTMLButtonElement>(".sim-znovu")!;
  const start = sim.querySelector<HTMLButtonElement>(".sim-start")!;
  const voda = sim.querySelector<HTMLElement>(".sim-voda")!;

  let faze: Faze = "ceka";
  let r: number[] = [];
  let H = 112;
  let V0 = 0;
  let kmit = 0;
  let uhelKmitu = 0;
  let otevreni = 0;
  let otevira = false;
  let vodaMira = 1;
  let otacky = 0;
  let drzi = false;
  let bod: { x: number; y: number; t: number } | null = null;
  let posun = 0;
  let uhel = 0;
  let pad = 0;
  let padZ: { r: number[]; H: number } | null = null;
  let posledniRada = "";

  const objem = () => (H * r.reduce((s, x) => s + x * x, 0)) / N;
  const prumer = () => r.reduce((s, x) => s + x, 0) / N;

  const pocatek = () => {
    H = 112;
    r = Array.from({ length: N }, (_, i) => {
      const t = i / (N - 1);
      return 104 * Math.sqrt(Math.max(0.02, 1 - Math.pow(t, 2.2) * 0.86));
    });
    V0 = objem();
    kmit = KMIT_START;
    otevreni = 0;
    otevira = false;
    vodaMira = 1;
    pad = 0;
    padZ = null;
    skupina.removeAttribute("transform");
    nastavGlazuru(null);
  };

  /** Po každé změně obrysu dorovná výšku tak, aby hlíny nepřibylo ani neubylo */
  const drzObjem = () => {
    for (let i = 0; i < N; i++) r[i] = omez(r[i], R_MIN, R_MAX);
    H = omez(V0 / (r.reduce((s, x) => s + x * x, 0) / N), H_MIN, H_MAX);
    const s = Math.sqrt(V0 / objem());
    if (Math.abs(s - 1) > 0.002) for (let i = 0; i < N; i++) r[i] = omez(r[i] * s, R_MIN, R_MAX);
  };

  const nastavGlazuru = (g: (typeof glazury)[number] | null) => {
    const barvy = g ? [g.stin, g.stred, g.svetlo] : ["#5E4334", "#9C7860", "#C9A184"];
    stopy.stin.forEach((s) => s.setAttribute("stop-color", barvy[0]));
    stopy.stred.forEach((s) => s.setAttribute("stop-color", barvy[1]));
    stopy.svetlo.forEach((s) => s.setAttribute("stop-color", barvy[2]));
    okraj.setAttribute("stroke", g ? g.svetlo : "#C9A184");
    ryhy.style.opacity = g ? "0" : "";
  };

  const rekniRadu = (text: string, varovani = false) => {
    if (text === posledniRada) return;
    posledniRada = text;
    radaText.textContent = text;
    rada.classList.toggle("varovani", varovani);
  };

  const nazevFaze: Record<Faze, string> = {
    ceka: "Hlína čeká",
    centrovani: "Centrování",
    otevirani: "Otevírání",
    toceni: "Vytahování a tvarování",
    hotovo: "Hotovo",
    spadlo: "Spadlo",
  };
  const prepniFazi = (f: Faze) => {
    faze = f;
    fazeEl.textContent = nazevFaze[f];
    hotovo.disabled = f !== "toceni";
    znovu.disabled = f === "ceka";
  };

  /* ——— Kreslení ——— */

  const kresli = () => {
    const vychyl = Math.sin(uhelKmitu) * kmit;
    const vyska = (i: number) => (H * i) / (N - 1);
    const posunI = (i: number) => vychyl * (0.25 + (0.75 * i) / (N - 1));
    const levy: [number, number][] = r.map((ri, i) => [CX - ri + posunI(i), ZAKLAD - vyska(i)]);
    const pravy: [number, number][] = r.map((ri, i) => [CX + ri + posunI(i), ZAKLAD - vyska(i)] as [number, number]).reverse();
    const d = hladkaCesta([...levy, ...pravy]);
    tvary.forEach((t) => t.setAttribute("d", d));

    const vrch = ZAKLAD - H;
    const rv = r[N - 1];
    okraj.setAttribute("cx", f1(CX + posunI(N - 1)));
    okraj.setAttribute("cy", f1(vrch));
    okraj.setAttribute("rx", f1(Math.max(0, rv - 3)));
    okraj.setAttribute("ry", f1(Math.max(3, rv * 0.2)));
    okraj.setAttribute("opacity", otevreni.toFixed(2));

    let dR = "";
    for (let y = ZAKLAD - 14; y > vrch + 10; y -= 18) {
      const v = ((ZAKLAD - y) / H) * (N - 1);
      const k = Math.min(N - 2, Math.floor(v));
      const pol = mix(r[k], r[k + 1], v - k) - 3;
      const x = CX + posunI(k);
      if (pol > 6) dR += `M${f1(x - pol)} ${y} Q${f1(x)} ${f1(y + pol * 0.24)} ${f1(x + pol)} ${y} `;
    }
    ryhy.innerHTML = dR ? `<path d="${dR}" />` : "";
  };

  /* ——— Ruce ——— */

  const doSvg = (e: PointerEvent | { clientX: number; clientY: number }) => {
    const b = dotyk.getBoundingClientRect();
    return { x: ((e.clientX - b.left) / b.width) * 600, y: ((e.clientY - b.top) / b.height) * 600 };
  };

  const vytahni = (dy: number) => {
    // dy < 0 = nahoru: hlína se zvedne a ztenčí; dy > 0 = stlačení
    const nova = omez(H - dy * 0.9, H_MIN, H_MAX);
    const s = Math.sqrt(H / nova);
    const m = prumer();
    const srovnej = Math.min(0.25, Math.abs(dy) * 0.006);
    for (let i = 0; i < N; i++) r[i] = mix(r[i] * s, m * s, srovnej);
    H = nova;
    drzObjem();
  };

  const vytvaruj = (x: number, y: number, dx: number) => {
    const j = omez(((ZAKLAD - y) / H) * (N - 1), 0, N - 1);
    const ven = Math.sign(x - CX) || 1;
    for (let i = 0; i < N; i++) {
      const w = Math.exp(-(((i - j) / 2.6) ** 2));
      r[i] += dx * ven * 0.45 * w;
    }
    drzObjem();
  };

  const tah = (x: number, y: number, dx: number, dy: number, dt: number) => {
    if (faze !== "toceni") return;
    if (otacky < 40) {
      rekniRadu("Kruh stojí. Šlápni na pedál — bez točení se hlína jen trhá.", true);
      return;
    }
    const delka = Math.hypot(dx, dy);
    if (Math.abs(dy) >= Math.abs(dx)) vytahni(dy);
    else vytvaruj(x, y, dx);

    vodaMira = Math.max(0, vodaMira - delka * 0.0011);
    const rychlost = delka / Math.max(8, dt);
    const plyn = otacky > 190 ? 1 + (otacky - 190) / 35 : 1;
    const sucho = vodaMira < 0.25 ? 1 + (0.25 - vodaMira) * 10 : 1;
    kmit += Math.max(0, rychlost - 0.75) * 2.4 * plyn * sucho;

    if (rychlost > 1.2) rekniRadu("Pomaleji! Hlína se začíná kroutit.", true);
    else if (vodaMira < 0.25) rekniRadu("Hlína drhne — přidej vodu. Klikni na Kapku.", true);
    else if (otacky > 200) rekniRadu("Moc plynu. Na vytahování se točí pomaleji.", true);
    else if (H / prumer() > 5) rekniRadu("Tenké stěny! Ještě kousek a spadne.", true);
    else if (H > 150) rekniRadu("Krásně. Táhni do strany a dej tomu tvar — nebo zmáčkni Hotovo.");
    else rekniRadu("Zdola nahoru, jedním tahem. A dýchej — na to se často zapomíná.");
  };

  const stisk = (x: number, y: number) => {
    drzi = true;
    if (faze === "otevirani" && !otevira) {
      const vrch = ZAKLAD - H;
      if (y < vrch + H * 0.45 && Math.abs(x - CX) < r[N - 1] + 40) {
        otevira = true;
        rekniRadu("Palce doprostřed. Pomalu. Dno nech silné na prst.");
      } else {
        rekniRadu("Otevírá se shora — stiskni hlínu nahoře uprostřed.");
      }
    }
  };

  dotyk.addEventListener("pointerdown", (e) => {
    if (faze === "ceka" || faze === "hotovo" || faze === "spadlo") return;
    dotyk.setPointerCapture(e.pointerId);
    const p = doSvg(e);
    bod = { ...p, t: performance.now() };
    stisk(p.x, p.y);
    prst.setAttribute("cx", f1(p.x));
    prst.setAttribute("cy", f1(p.y));
    prst.setAttribute("opacity", "0.55");
  });
  dotyk.addEventListener("pointermove", (e) => {
    if (!drzi || !bod) return;
    const p = doSvg(e);
    const t = performance.now();
    tah(p.x, p.y, p.x - bod.x, p.y - bod.y, t - bod.t);
    bod = { ...p, t };
    prst.setAttribute("cx", f1(p.x));
    prst.setAttribute("cy", f1(p.y));
  });
  const pust = () => {
    drzi = false;
    bod = null;
    prst.setAttribute("opacity", "0");
  };
  dotyk.addEventListener("pointerup", pust);
  dotyk.addEventListener("pointercancel", pust);

  dotyk.addEventListener("keydown", (e) => {
    if (faze === "ceka" || faze === "hotovo" || faze === "spadlo") return;
    const stred = ZAKLAD - H / 2;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (!drzi) stisk(CX, ZAKLAD - H + 10);
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      tah(CX, stred, 0, e.key === "ArrowUp" ? -10 : 8, 40);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      tah(CX + 60, stred, e.key === "ArrowRight" ? 6 : -6, 0, 40);
    }
  });
  dotyk.addEventListener("keyup", (e) => {
    if (e.key === " " || e.key === "Enter") drzi = false;
  });

  /* ——— Ovládání ——— */

  pedal.addEventListener("input", () => {
    pedalVen.textContent = pedal.value;
  });

  start.addEventListener("click", () => {
    pocatek();
    sim.classList.add("hraje");
    pedal.disabled = false;
    dotyk.tabIndex = 0;
    prepniFazi("centrovani");
    rekniRadu("Šlápni na pedál — centruje se na rychlém kruhu. Pak hlínu zmáčkni a drž.");
    pedal.focus();
  });

  znovu.addEventListener("click", () => {
    pocatek();
    pedal.disabled = false;
    prepniFazi("centrovani");
    rekniRadu("Znovu a lépe. Plyn, ruce na hlínu, držet.");
  });

  hotovo.addEventListener("click", () => {
    if (faze !== "toceni") return;
    prepniFazi("hotovo");
    pedal.value = "0";
    pedalVen.textContent = "0";
    pedal.disabled = true;
    const g = glazury[Math.floor(Math.random() * glazury.length)];
    nastavGlazuru(g);
    const m = prumer();
    const max = Math.max(...r);
    const typ = H < 1.15 * m ? "miska" : r[N - 1] < 0.62 * max ? "váza" : H > 2.8 * m ? "vysoký válec" : "hrnek";
    rekniRadu(`Hotovo: ${typ} v glazuře ${g.nazev}. Nanečisto. Doopravdy to jde líp — a hlína u toho voní.`);
    zvuk.zlato();
  });

  /* Kapka přinese vodu */
  document.addEventListener("kami:klik", (e) => {
    const d = (e as CustomEvent<{ id: string; el: Element }>).detail;
    if (d.id !== "kapka" || !sim.contains(d.el)) return;
    vodaMira = 1;
    voda.style.setProperty("--voda", "1");
    voda.classList.remove("dochazi");
    if (faze === "toceni") rekniRadu("Voda je. Hlína zase klouže.");
  });

  /* ——— Smyčka ——— */

  let minule = 0;
  kdyzVidet(sim, (t) => {
    const dt = minule ? Math.min(50, t - minule) : 16;
    minule = t;
    const cil = faze === "hotovo" || faze === "spadlo" ? 0 : Number(pedal.value);
    otacky += (cil - otacky) * 0.08;
    otackyEl.textContent = String(Math.round(otacky));

    if (!klid) {
      posun = (posun + otacky * 0.9 * (dt / 1000)) % 46;
      vzor?.setAttribute("patternTransform", `translate(${posun.toFixed(2)} 0)`);
      uhel += (otacky / 60) * Math.PI * 2 * 0.25 * (dt / 1000);
      znacky.forEach((z, i) => {
        const a = uhel + (i * Math.PI * 2) / znacky.length;
        z.setAttribute("cx", f1(300 + Math.cos(a) * 150));
        z.setAttribute("cy", f1(472 + Math.sin(a) * 31));
        z.setAttribute("opacity", Math.sin(a) > -0.15 ? "1" : "0");
      });
    }
    uhelKmitu += (otacky / 60) * Math.PI * 2 * (dt / 1000);

    if (faze === "centrovani") {
      if (drzi && otacky >= 130) {
        kmit *= Math.pow(0.972, dt / 16);
        rekniRadu("Drž ji. Lokty opřít o kolena. Ještě…");
      } else if (drzi) {
        rekniRadu("Přidej plyn — na centrování se točí rychle.", true);
      } else {
        kmit = Math.min(KMIT_START, kmit + 0.04 * (dt / 16));
        if (otacky >= 130) rekniRadu("Teď hlínu zmáčkni a drž, dokud se nepřestane klepat.");
      }
      if (kmit < 2) {
        kmit = 0;
        prepniFazi("otevirani");
        zvuk.cink();
        rekniRadu("Vycentrováno! Teď stiskni hlínu shora uprostřed — otevřeme ji.");
      }
    }

    if (otevira && otevreni < 1) {
      otevreni = Math.min(1, otevreni + dt / 700);
      const vrsek = r[N - 5];
      for (let i = N - 4; i < N; i++) r[i] = mix(r[i], vrsek, 0.08);
      if (otevreni >= 1) {
        otevira = false;
        drzObjem();
        prepniFazi("toceni");
        rekniRadu("Otevřeno. Táhni zdola nahoru — a uber trochu plynu.");
      }
    }

    if (faze === "toceni") {
      if (!drzi) kmit *= Math.pow(0.985, dt / 16);
      if (H / prumer() > 5.4) kmit += 0.2 * (dt / 16);
      if (kmit > KMIT_PAD) {
        prepniFazi("spadlo");
        padZ = { r: [...r], H };
        pad = 0;
        pust();
        zvuk.zuch();
        rekniRadu("Spadlo to. Moc rychle, moc sucho, nebo moc tenké stěny. Zmáčkni Znovu.", true);
        rekni(dotyk, "stripek", "To se stává každému. Mně taky. Znovu?");
      }
    }

    if (faze === "spadlo" && padZ && pad < 1) {
      pad = Math.min(1, pad + dt / 900);
      const k = hladce(pad);
      H = mix(padZ.H, Math.max(H_MIN, padZ.H * 0.42), k);
      r = padZ.r.map((x, i) => mix(x, Math.min(R_MAX, x * 1.35 + (N - 1 - i) * 1.2), k));
      kmit = mix(KMIT_PAD, 0, k);
      skupina.setAttribute("transform", `rotate(${f1(k * 12)} ${CX} ${ZAKLAD}) translate(${f1(k * 18)} 0)`);
    }

    voda.style.setProperty("--voda", vodaMira.toFixed(3));
    voda.classList.toggle("dochazi", vodaMira < 0.25);
    zvuk.nastavKruh(otacky / 250, drzi && (faze === "centrovani" || faze === "toceni"));
    kresli();
  });

  /* Mimo obrazovku kruh ztichne */
  new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) zvuk.nastavKruh(0, false);
  }).observe(sim);

  pocatek();
  kresli();
}
