/*
 * Běh Pecinky s ohněm (PecinkaOhen.astro): z generátorů v ./kresby.js
 * skládá vrstvy, točí čas a simulaci, poslouchá myš a hraje. Stavba je
 * stejná jako u Kapky s bubny hromu (scripts/kapka-bubny/beh.js).
 *
 * Každá vrstva je vlastní <svg> přes celou plochu. Statické se nakreslí
 * jednou a prohlížeč si je drží jako hotový obraz; živé se přepisují,
 * jen když se jim změní klíč.
 *
 * Zvuk poslouchá vypínač v hlavičce nového vzhledu (parta2/zvuk.ts): hraje,
 * jen když je zvuk webu zapnutý. Kresby stojí vedle sebe, a tak zní
 * jen ta, nad kterou je myš, nebo na kterou se naposledy klepnulo — jinak
 * by praskání, syčení a ťukání můr hrálo všechno přes sebe.
 */
import { kresby, pretoc } from "./kresby.js";
import { jeZapnuto } from "../parta2/zvuk";

const NS = "http://www.w3.org/2000/svg";
const VB = 180;
const klidne = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const PENTA = [1318.5, 1568, 1760, 1975.5, 2349.3, 2637];

/* ═══ Zvuk: všechno se skládá ve Web Audio, žádné nahrávky ═══ */
const Zvuk = (() => {
  let ctx = null, hlavni = null, sumy = null, hukot = null;
  const buffer = (sekundy, hneda) => {
    const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * sekundy), ctx.sampleRate);
    const d = b.getChannelData(0);
    let posl = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      if (hneda) {
        posl = (posl + 0.02 * w) / 1.02;
        d[i] = posl * 3.5;
      } else d[i] = w;
    }
    return b;
  };
  const pripravit = () => {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    const komp = ctx.createDynamicsCompressor();
    komp.threshold.value = -18;
    komp.ratio.value = 4;
    komp.attack.value = 0.003;
    komp.release.value = 0.25;
    hlavni = ctx.createGain();
    hlavni.gain.value = 0.8;
    hlavni.connect(komp).connect(ctx.destination);
    sumy = { bily: buffer(2, false), hnedy: buffer(5, true) };
    /* hukot pece: hluboký šum, hlasitost podle toho, jak moc hoří */
    const n = ctx.createBufferSource();
    n.buffer = sumy.hnedy;
    n.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 240;
    hukot = ctx.createGain();
    hukot.gain.value = 0;
    n.connect(lp).connect(hukot).connect(hlavni);
    n.start();
    return true;
  };
  const vystup = (pan) => {
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan || 0));
      p.connect(hlavni);
      return p;
    }
    return hlavni;
  };
  const obalka = (g, t, vrchol, utlum, nabeh = 0.004) => {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vrchol), t + nabeh);
    g.gain.exponentialRampToValueAtTime(0.0001, t + nabeh + utlum);
  };
  /** Šum přes filtr s obálkou — z toho je praskání, syčení i škrtnutí. */
  const sumik = (t, out, { typ = "bandpass", f = 1000, q = 1, vrchol = 0.3, nabeh = 0.002, utlum = 0.05, buf = "bily", posun } = {}) => {
    const n = ctx.createBufferSource();
    n.buffer = sumy[buf];
    const bq = ctx.createBiquadFilter();
    bq.type = typ;
    bq.frequency.setValueAtTime(f, t);
    if (posun) bq.frequency.exponentialRampToValueAtTime(posun, t + nabeh + utlum);
    bq.Q.value = q;
    const g = ctx.createGain();
    obalka(g, t, vrchol, utlum, nabeh);
    n.connect(bq).connect(g).connect(out);
    n.start(t, Math.random() * (buf === "hnedy" ? 3 : 1.5));
    n.stop(t + nabeh + utlum + 0.05);
  };
  const ton = (t, out, { typ = "sine", f = 440, f2, vrchol = 0.2, nabeh = 0.003, utlum = 0.2 } = {}) => {
    const o = ctx.createOscillator();
    o.type = typ;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + nabeh + utlum * 0.6);
    const g = ctx.createGain();
    obalka(g, t, vrchol, utlum, nabeh);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + nabeh + utlum + 0.05);
  };
  const ZVUKY = {
    /* dřevo v ohni: krátké lupnutí v náhodné výšce */
    praskot: (t, out, s) => sumik(t, out, { f: 1200 + Math.random() * 3000, q: 1.4, vrchol: 0.32 * s, utlum: 0.012 + Math.random() * 0.03 }),
    /* senkó hanabi: drobounké cvaknutí, u macuby i zdvojené */
    jiskra: (t, out, s) => {
      sumik(t, out, { typ: "highpass", f: 3600 + Math.random() * 2400, q: 0.7, vrchol: 0.2 * s, nabeh: 0.001, utlum: 0.006 + Math.random() * 0.008 });
      if (s > 0.6) sumik(t + 0.012 + Math.random() * 0.02, out, { typ: "highpass", f: 4200, q: 0.7, vrchol: 0.12 * s, nabeh: 0.001, utlum: 0.006 });
    },
    /* fouknutí do ohně: šum, který se rozjasní, a tupé bafnutí */
    fuk: (t, out, s) => {
      sumik(t, out, { f: 320, posun: 1500, q: 0.8, vrchol: 0.5 * s, nabeh: 0.06, utlum: 0.6 });
      ton(t, out, { f: 75, f2: 42, vrchol: 0.45 * s, nabeh: 0.01, utlum: 0.3 });
    },
    dvere: (t, out) => {
      ton(t, out, { f: 96, f2: 58, vrchol: 0.4, utlum: 0.28 });
      sumik(t, out, { typ: "lowpass", f: 420, vrchol: 0.25, utlum: 0.12, buf: "hnedy" });
    },
    /* kleště sevřou misku: kov o keramiku */
    cink: (t, out, s) => {
      ton(t, out, { f: 2730, vrchol: 0.09 * s, utlum: 0.5 });
      ton(t, out, { f: 3960, vrchol: 0.05 * s, utlum: 0.32 });
      ton(t, out, { f: 5410, vrchol: 0.03 * s, utlum: 0.18 });
    },
    /* rozžhavená miska ve vodě */
    syk: (t, out, s) => {
      sumik(t, out, { typ: "highpass", f: 2100, q: 0.5, vrchol: 0.42 * s, nabeh: 0.02, utlum: 2.2 });
      sumik(t, out, { f: 5200, q: 1.2, vrchol: 0.2 * s, nabeh: 0.01, utlum: 1.2 });
    },
    bubl: (t, out) => ton(t, out, { f: 320 + Math.random() * 200, f2: 900 + Math.random() * 400, vrchol: 0.07, nabeh: 0.004, utlum: 0.05 }),
    kap: (t, out) => ton(t, out, { f: 1500 + Math.random() * 300, f2: 620, vrchol: 0.06, nabeh: 0.002, utlum: 0.06 }),
    /* miska dosedne na zem: dvě keramické alikvóty a ťuknutí */
    tuk: (t, out, s) => {
      ton(t, out, { typ: "triangle", f: 1650, vrchol: 0.12 * s, utlum: 0.1 });
      ton(t, out, { typ: "triangle", f: 2460, vrchol: 0.06 * s, utlum: 0.07 });
      sumik(t, out, { f: 900, q: 1.2, vrchol: 0.18 * s, nabeh: 0.001, utlum: 0.03 });
    },
    /* škrtnutí: drsný šum a pak syčivé chytnutí */
    skrt: (t, out, s) => {
      sumik(t, out, { f: 2600, q: 0.8, vrchol: 0.4 * s, nabeh: 0.003, utlum: 0.12 });
      sumik(t + 0.1, out, { typ: "highpass", f: 3800, q: 0.6, vrchol: 0.16 * s, nabeh: 0.05, utlum: 0.5 });
    },
    pss: (t, out, s) => sumik(t, out, { typ: "lowpass", f: 1300, q: 0.7, vrchol: 0.25 * s, nabeh: 0.01, utlum: 0.25 }),
    /* skleněný zvonek fúrin: čtyři nesouzvučné alikvóty jako v parta2/zvuk.ts */
    furin: (t, out, s) => {
      const f0 = PENTA[Math.floor(Math.random() * PENTA.length)];
      [[1, 1, 2.4], [2.76, 0.45, 1.5], [5.4, 0.22, 0.8], [8.93, 0.1, 0.4]].forEach(([k, g, doba]) => ton(t, out, { f: f0 * k, vrchol: 0.05 * s * g, utlum: doba }));
    },
    /* Lampion — geta na dlažbě: dřevo o kámen, karan zvoní výš, koron hlouběji */
    karan: (t, out, s) => {
      ton(t, out, { typ: "triangle", f: 1180, f2: 1050, vrchol: 0.16 * s, nabeh: 0.001, utlum: 0.09 });
      ton(t, out, { f: 2360, vrchol: 0.05 * s, nabeh: 0.001, utlum: 0.05 });
      sumik(t, out, { f: 2400, q: 1.6, vrchol: 0.2 * s, nabeh: 0.001, utlum: 0.025 });
    },
    koron: (t, out, s) => {
      ton(t, out, { typ: "triangle", f: 760, f2: 690, vrchol: 0.17 * s, nabeh: 0.001, utlum: 0.12 });
      ton(t, out, { f: 1530, vrchol: 0.05 * s, nabeh: 0.001, utlum: 0.06 });
      sumik(t, out, { f: 1600, q: 1.4, vrchol: 0.18 * s, nabeh: 0.001, utlum: 0.03 });
    },
    /* můra ťukne do papíru lucerny */
    mura: (t, out, s) => sumik(t, out, { f: 3400 + Math.random() * 1200, q: 2.2, vrchol: 0.12 * s, nabeh: 0.001, utlum: 0.008 }),
    /* rozhoupaný papír zašustí */
    sust: (t, out, s) => sumik(t, out, { f: 3000, q: 0.6, vrchol: 0.1 * s, nabeh: 0.04, utlum: 0.2 }),
    /* svíčka zhasne: tiché pff */
    zhasni: (t, out, s) => {
      sumik(t, out, { typ: "lowpass", f: 900, q: 0.6, vrchol: 0.24 * s, nabeh: 0.01, utlum: 0.32 });
      ton(t, out, { f: 140, f2: 70, vrchol: 0.12 * s, nabeh: 0.005, utlum: 0.2 });
    },
    /* jiskra z komína doletí a lucerna se rozsvítí */
    zapal: (t, out, s) => {
      sumik(t, out, { f: 420, posun: 1800, q: 0.7, vrchol: 0.36 * s, nabeh: 0.03, utlum: 0.45 });
      ton(t, out, { f: 90, f2: 55, vrchol: 0.3 * s, nabeh: 0.01, utlum: 0.25 });
    },
    /* čóčin-obake: papír se roztrhne do úst… */
    trh: (t, out, s) => {
      for (let i = 0; i < 6; i++) sumik(t + i * 0.022 + Math.random() * 0.01, out, { f: 1500 + i * 420, q: 1.1, vrchol: 0.16 * s, nabeh: 0.002, utlum: 0.02 + Math.random() * 0.02 });
    },
    /* … vyplázne jazyk … */
    bero: (t, out, s) => {
      ton(t, out, { f: 240, f2: 980, vrchol: 0.14 * s, nabeh: 0.01, utlum: 0.2 });
      sumik(t + 0.02, out, { f: 1800, q: 2, vrchol: 0.08 * s, nabeh: 0.01, utlum: 0.08 });
    },
    /* … a polkne můru */
    polk: (t, out, s) => {
      ton(t, out, { f: 260, f2: 95, vrchol: 0.26 * s, nabeh: 0.004, utlum: 0.14 });
      ton(t + 0.11, out, { f: 180, f2: 120, vrchol: 0.1 * s, nabeh: 0.004, utlum: 0.08 });
    },
  };
  return {
    /** odemknout v gestu (Safari jinak nedovolí) — hrát se pak bude, jen když je zvuk webu zapnutý */
    odemkni: () => {
      if (pripravit() && ctx.state === "suspended") ctx.resume();
    },
    hraj: (z) => {
      if (!ctx || !jeZapnuto() || !ZVUKY[z.druh]) return;
      if (ctx.state === "suspended") ctx.resume();
      ZVUKY[z.druh](ctx.currentTime + 0.005 + (z.za || 0), vystup(z.pan), z.sila ?? 1);
    },
    nastavHukot: (mira) => {
      if (!ctx || !hukot) return;
      hukot.gain.setTargetAtTime(jeZapnuto() ? mira * 0.2 : 0, ctx.currentTime, 0.3);
    },
  };
})();

/** Která plocha smí znít: ta pod myší, jinak ta, na kterou se naposledy sáhlo. */
let znejici = null;

/* ═══ Scéna: jedna plocha s jednou podobou ═══ */
const scena = (el, V) => {
  el.textContent = "";
  const defs = document.createElementNS(NS, "svg");
  defs.setAttribute("class", "po-defs");
  defs.setAttribute("width", "0");
  defs.setAttribute("height", "0");
  defs.setAttribute("aria-hidden", "true");
  defs.innerHTML = `<defs>${V.defs()}</defs>`;
  el.appendChild(defs);
  const vrstvy = V.vrstvy.map((v) => {
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${VB} ${VB}`);
    svg.setAttribute("class", "po-vrstva");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    if (v.styl) svg.style.cssText += `;${v.styl}`;
    if (v.tezka || v.pruhlednost || v.posun) svg.style.willChange = "transform";
    el.appendChild(svg);
    return { v, svg, klic: undefined, nakresleno: false };
  });

  const vstup = { mys: null, rychlost: 0, kliky: [] };
  let dyn = V.novaDynamika();
  let t = 0, posledniCas = null, viditelna = false, zastaveno = false, aktivniDo = 0, mysPred = null;

  const vykresli = () => {
    const st = V.stav(t, vstup, dyn);
    for (const L of vrstvy) {
      const v = L.v;
      const k = v.klic ? v.klic(st) : 0;
      if (!L.nakresleno || k !== L.klic) {
        L.svg.innerHTML = v.kresli(st);
        L.klic = k;
        L.nakresleno = true;
      }
      if (v.pruhlednost) L.svg.style.opacity = v.pruhlednost(st);
      /* vrstva, která se celá posouvá (tělo při chůzi): jen transformace, obsah zůstává */
      if (v.posun) {
        const p = v.posun(st);
        L.svg.style.transformOrigin = `${(p.ox / VB) * 100}% ${(p.oy / VB) * 100}%`;
        L.svg.style.transform = `translate(${(p.dx / VB) * 100}%, ${(p.dy / VB) * 100}%) rotate(${p.rot}deg)`;
      }
    }
    const slysi = znejici === el;
    for (const z of dyn.zvuk) if (slysi) Zvuk.hraj(z);
    dyn.zvuk.length = 0;
    if (slysi) Zvuk.nastavHukot(V.hukot(st));
  };
  const smycka = (ted) => {
    if (!viditelna || zastaveno) {
      posledniCas = null;
      return;
    }
    const dt = posledniCas == null ? 0 : Math.min(0.05, (ted - posledniCas) / 1000);
    posledniCas = ted;
    if (!klidne || t < aktivniDo) {
      t += dt;
      vstup.rychlost *= Math.exp(-dt / 0.15);
      V.krok(dyn, t, dt, vstup);
      vykresli();
    }
    requestAnimationFrame(smycka);
  };

  /* ——— Myš a dotyk ——— */
  const naJednotky = (e) => {
    const r = el.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * VB, y: ((e.clientY - r.top) / r.height) * VB };
  };
  el.addEventListener("pointerenter", () => {
    znejici = el;
  });
  el.addEventListener("pointermove", (e) => {
    const p = naJednotky(e);
    const ted = performance.now();
    if (mysPred) {
      const d = Math.hypot(p.x - mysPred.x, p.y - mysPred.y);
      const v = d / Math.max(0.008, (ted - mysPred.cas) / 1000);
      vstup.rychlost = vstup.rychlost * 0.6 + v * 0.4;
    }
    mysPred = { ...p, cas: ted };
    vstup.mys = p;
    znejici = el;
    aktivniDo = Math.max(aktivniDo, t + 1.5);
  });
  el.addEventListener("pointerleave", () => {
    vstup.mys = null;
    mysPred = null;
  });
  el.addEventListener("pointerdown", (e) => {
    Zvuk.odemkni();
    znejici = el;
    vstup.kliky.push(naJednotky(e));
    aktivniDo = t + 10;
  });
  el.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    Zvuk.odemkni();
    znejici = el;
    vstup.kliky.push({ x: 90, y: 90 });
    aktivniDo = t + 10;
  });

  const io = new IntersectionObserver(
    (z) => {
      const byla = viditelna;
      viditelna = z[0].isIntersecting;
      if (!viditelna && znejici === el) Zvuk.nastavHukot(0);
      if (viditelna && !byla) requestAnimationFrame(smycka);
    },
    { threshold: 0.08 },
  );
  io.observe(el);
  /* první snímek hned, ať plocha není prázdná, ani když je mimo obrazovku */
  if (klidne) {
    t = V.klidne.t;
    dyn = pretoc(V, t);
  }
  vykresli();

  return () => {
    zastaveno = true;
    viditelna = false;
    io.disconnect();
    if (znejici === el) {
      Zvuk.nastavHukot(0);
      znejici = null;
    }
  };
};

/* ═══ Spuštění: při každém načtení stránky, i po přechodu bez načtení ═══ */
const bezici = [];
/* zvuk webu se rozezní prvním gestem kdekoli — oheň se odemkne s ním */
for (const g of ["pointerup", "keydown", "touchend"]) document.addEventListener(g, () => document.querySelector("[data-pecinka-ohen]") && Zvuk.odemkni(), true);
const spustVse = () => {
  for (const el of document.querySelectorAll("[data-pecinka-ohen]")) {
    if (el.dataset.bezi) continue;
    const V = kresby[el.dataset.pecinkaOhen];
    if (!V) continue;
    el.dataset.bezi = "1";
    bezici.push(scena(el, V));
  }
};
spustVse();
document.addEventListener("astro:page-load", spustVse);
document.addEventListener("astro:before-swap", () => {
  bezici.splice(0).forEach((zastav) => zastav());
});
