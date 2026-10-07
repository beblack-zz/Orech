/*
 * Běh Kachlíka v přehnaných podobách (KachlikRovina.astro): z generátorů
 * v ./kresby.js skládá vrstvy, točí čas a simulaci, poslouchá myš a hraje.
 * Stavba je stejná jako u Pecinky s ohněm (scripts/pecinka-ohen/beh.js).
 *
 * Každá vrstva je vlastní <svg> přes celou plochu. Statické se nakreslí
 * jednou a prohlížeč si je drží jako hotový obraz; živé se přepisují,
 * jen když se jim změní klíč.
 *
 * Zvuk poslouchá vypínač v hlavičce nového vzhledu (parta2/zvuk.ts): hraje,
 * jen když je zvuk webu zapnutý, a zní jen ta kresba, nad kterou je myš,
 * nebo na kterou se naposledy klepnulo. Kromě jednotlivých zvuků mají
 * kresby i trvalé smyčky (V.smycky): tekoucí vodu, oheň v kamnech
 * a předoucí kočku.
 */
import { kresby, pretoc } from "./kresby.js";
import { jeZapnuto } from "../parta2/zvuk";

const NS = "http://www.w3.org/2000/svg";
const VB = 180;
const klidne = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const PENTA = [1318.5, 1568, 1760, 1975.5, 2349.3, 2637];

/* ═══ Zvuk: všechno se skládá ve Web Audio, žádné nahrávky ═══ */
const Zvuk = (() => {
  let ctx = null, hlavni = null, sumy = null;
  const smycky = {};
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
  /** Struna metodou Karplus-Strong: krátký šum v zpožďovací smyčce, která tlumí výšky. */
  const struna = (f, sekundy, utlum = 0.996) => {
    const sr = ctx.sampleRate;
    const b = ctx.createBuffer(1, Math.floor(sr * sekundy), sr);
    const d = b.getChannelData(0);
    const N = Math.max(2, Math.round(sr / f));
    const smycka = new Float32Array(N);
    for (let i = 0; i < N; i++) smycka[i] = Math.random() * 2 - 1;
    let j = 0;
    for (let i = 0; i < d.length; i++) {
      const dalsi = (j + 1) % N;
      const v = smycka[j];
      smycka[j] = utlum * 0.5 * (v + smycka[dalsi]);
      d[i] = v;
      j = dalsi;
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
  /** Šum přes filtr s obálkou — z toho je praskání, šustění, křupání i cvaknutí. */
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
    /* — 1: svatozář — */
    /* šňůra cvrnkne: struna a plácnutí o desku */
    brnk: (t, out, s) => {
      const src = ctx.createBufferSource();
      src.buffer = struna(98, 1.6, 0.9965);
      const g = ctx.createGain();
      obalka(g, t, 0.55 * s, 1.5, 0.002);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 2600;
      src.connect(lp).connect(g).connect(out);
      src.start(t);
      sumik(t, out, { typ: "lowpass", f: 1400, vrchol: 0.5 * s, utlum: 0.05 });
      ton(t, out, { f: 130, f2: 70, vrchol: 0.25 * s, utlum: 0.12 });
    },
    napnuti: (t, out, s) => ton(t, out, { typ: "triangle", f: 260, f2: 380, vrchol: 0.05 * s, nabeh: 0.05, utlum: 0.18 }),
    razitko: (t, out, s) => {
      ton(t, out, { f: 150, f2: 58, vrchol: 0.45 * s, utlum: 0.14 });
      sumik(t, out, { typ: "lowpass", f: 520, vrchol: 0.3 * s, utlum: 0.06, buf: "hnedy" });
    },
    /* rin: buddhistický zvonek, základní tón se dvěma blízkými frekvencemi, aby se vlnil */
    rin: (t, out, s) => {
      const f0 = 523;
      ton(t, out, { f: f0, vrchol: 0.07 * s, utlum: 4.5 });
      ton(t, out, { f: f0 * 1.004, vrchol: 0.05 * s, utlum: 4 });
      [[2.71, 0.04, 2.6], [5.15, 0.022, 1.4], [8.4, 0.012, 0.7]].forEach(([k, g, d]) => ton(t, out, { f: f0 * k, vrchol: g * s, utlum: d }));
      sumik(t, out, { typ: "highpass", f: 4000, vrchol: 0.04 * s, utlum: 0.02 });
    },
    /* palička o keramiku: dvě alikvóty a ťuknutí */
    tuk: (t, out, s) => {
      ton(t, out, { typ: "triangle", f: 1650, vrchol: 0.12 * s, utlum: 0.1 });
      ton(t, out, { typ: "triangle", f: 2460, vrchol: 0.06 * s, utlum: 0.07 });
      sumik(t, out, { f: 900, q: 1.2, vrchol: 0.2 * s, nabeh: 0.001, utlum: 0.03 });
    },
    tik: (t, out, s) => {
      ton(t, out, { typ: "triangle", f: 2150, vrchol: 0.1 * s, utlum: 0.12 });
      ton(t, out, { typ: "triangle", f: 3220, vrchol: 0.05 * s, utlum: 0.08 });
      sumik(t, out, { f: 1400, q: 1.2, vrchol: 0.15 * s, nabeh: 0.001, utlum: 0.025 });
    },
    cvak: (t, out, s) => {
      sumik(t, out, { f: 3000, q: 2, vrchol: 0.3 * s, nabeh: 0.001, utlum: 0.02 });
      ton(t, out, { typ: "triangle", f: 2400, vrchol: 0.08 * s, utlum: 0.06 });
      ton(t, out, { f: 180, f2: 90, vrchol: 0.15 * s, utlum: 0.06 });
    },
    /* kachel se sám od sebe kroutí: úzké zavrzání */
    vrz: (t, out, s) => sumik(t, out, { f: 700, posun: 1150, q: 14, vrchol: 0.16 * s, nabeh: 0.04, utlum: 0.4 }),

    /* — 2: karesansui — */
    /* bambus šiši-odoši klepne o kámen */
    tok: (t, out, s) => {
      sumik(t, out, { f: 1050, q: 3, vrchol: 0.45 * s, nabeh: 0.001, utlum: 0.04 });
      ton(t, out, { f: 420, vrchol: 0.3 * s, nabeh: 0.001, utlum: 0.16 });
      ton(t, out, { f: 1180, vrchol: 0.12 * s, nabeh: 0.001, utlum: 0.08 });
      ton(t, out, { f: 120, f2: 80, vrchol: 0.2 * s, utlum: 0.1 });
    },
    slup: (t, out, s) => {
      sumik(t, out, { f: 600, q: 0.8, vrchol: 0.2 * s, nabeh: 0.03, utlum: 0.3 });
      for (let i = 0; i < 4; i++) ton(t + 0.05 + i * 0.06, out, { f: 380 + Math.random() * 300, f2: 900 + Math.random() * 400, vrchol: 0.04 * s, utlum: 0.04 });
    },
    /* štěrk pod geta: hrst drobných zrnek */
    krup: (t, out, s) => {
      for (let i = 0; i < 7; i++) sumik(t + Math.random() * 0.06, out, { f: 1800 + Math.random() * 3400, q: 2.5, vrchol: 0.12 * s, nabeh: 0.001, utlum: 0.006 + Math.random() * 0.012 });
    },
    hrab: (t, out, s) => {
      for (let i = 0; i < 9; i++) sumik(t + i * 0.028, out, { f: 1500 + Math.random() * 1200, q: 1.4, vrchol: 0.08 * s, nabeh: 0.002, utlum: 0.02 });
    },
    plink: (t, out, s) => {
      ton(t, out, { typ: "triangle", f: 2900, vrchol: 0.1 * s, utlum: 0.05 });
      ZVUKY.krup(t + 0.01, out, s * 0.8);
    },
    sust: (t, out, s) => sumik(t, out, { f: 3200, q: 0.7, vrchol: 0.08 * s, nabeh: 0.02, utlum: 0.16 }),
    list: (t, out, s) => sumik(t, out, { typ: "highpass", f: 4200, q: 0.7, vrchol: 0.04 * s, nabeh: 0.01, utlum: 0.05 }),
    /* ptáček uguisu: dlouhé „hóó“ a rychlé „hokekjó“ */
    ptak: (t, out, s) => {
      ton(t, out, { f: 1250, f2: 1900, vrchol: 0.035 * s, nabeh: 0.15, utlum: 0.55 });
      [[0.85, 2300], [0.97, 1850], [1.08, 2650]].forEach(([d, f]) => ton(t + d, out, { f, f2: f * 0.9, vrchol: 0.03 * s, nabeh: 0.01, utlum: 0.1 }));
    },

    /* — 3: kachlová kamna — */
    klap: (t, out, s) => {
      ton(t, out, { typ: "triangle", f: 920, vrchol: 0.14 * s, utlum: 0.08 });
      ton(t, out, { typ: "triangle", f: 1420, vrchol: 0.06 * s, utlum: 0.06 });
      sumik(t, out, { typ: "lowpass", f: 700, vrchol: 0.2 * s, nabeh: 0.001, utlum: 0.04, buf: "hnedy" });
    },
    cink: (t, out, s) => {
      ton(t, out, { f: 2730, vrchol: 0.07 * s, utlum: 0.4 });
      ton(t, out, { f: 3960, vrchol: 0.04 * s, utlum: 0.26 });
      ton(t, out, { f: 5410, vrchol: 0.025 * s, utlum: 0.15 });
    },
    hod: (t, out, s) => sumik(t, out, { f: 500, posun: 1900, q: 1.1, vrchol: 0.07 * s, nabeh: 0.05, utlum: 0.16 }),
    skrt: (t, out, s) => {
      sumik(t, out, { f: 2600, q: 0.8, vrchol: 0.4 * s, nabeh: 0.003, utlum: 0.12 });
      sumik(t + 0.1, out, { typ: "highpass", f: 3800, q: 0.6, vrchol: 0.16 * s, nabeh: 0.05, utlum: 0.5 });
    },
    dvere: (t, out, s) => {
      ton(t, out, { f: 96, f2: 58, vrchol: 0.35 * s, utlum: 0.25 });
      sumik(t, out, { typ: "lowpass", f: 420, vrchol: 0.2 * s, utlum: 0.12, buf: "hnedy" });
    },
    praskot: (t, out, s) => sumik(t, out, { f: 1200 + Math.random() * 3000, q: 1.4, vrchol: 0.3 * s, utlum: 0.012 + Math.random() * 0.03 }),
    praskne: (t, out, s) => {
      sumik(t, out, { typ: "highpass", f: 2600, q: 0.7, vrchol: 0.5 * s, nabeh: 0.001, utlum: 0.035 });
      ton(t, out, { typ: "triangle", f: 3400, vrchol: 0.1 * s, utlum: 0.06 });
      ton(t, out, { f: 95, f2: 60, vrchol: 0.3 * s, utlum: 0.1 });
    },
    vzdech: (t, out, s) => sumik(t, out, { f: 520, posun: 300, q: 1.6, vrchol: 0.12 * s, nabeh: 0.25, utlum: 0.75 }),
    pss: (t, out, s) => sumik(t, out, { typ: "highpass", f: 2200, q: 0.5, vrchol: 0.3 * s, nabeh: 0.02, utlum: 0.7 }),
    /* kočka: pila přes formant, tón nahoru a dolů */
    mnau: (t, out, s) => {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(520, t);
      o.frequency.linearRampToValueAtTime(760, t + 0.18);
      o.frequency.linearRampToValueAtTime(470, t + 0.5);
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.setValueAtTime(900, t);
      bp.frequency.linearRampToValueAtTime(1500, t + 0.2);
      bp.frequency.linearRampToValueAtTime(800, t + 0.5);
      bp.Q.value = 3;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.09 * s, t + 0.06);
      g.gain.setValueAtTime(0.09 * s, t + 0.35);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      o.connect(bp).connect(g).connect(out);
      o.start(t);
      o.stop(t + 0.6);
    },
    koule: (t, out, s) => {
      ton(t, out, { f: 110, f2: 55, vrchol: 0.4 * s, utlum: 0.12 });
      sumik(t, out, { typ: "lowpass", f: 800, vrchol: 0.35 * s, nabeh: 0.002, utlum: 0.1 });
    },
    flump: (t, out, s) => sumik(t, out, { typ: "lowpass", f: 380, vrchol: 0.4 * s, nabeh: 0.01, utlum: 0.32, buf: "hnedy" }),
    /* koule trefila měsíc */
    tink: (t, out, s) => {
      const f0 = PENTA[Math.floor(Math.random() * PENTA.length)] * 2;
      [[1, 1, 1.6], [2.76, 0.4, 0.9], [5.4, 0.18, 0.5]].forEach(([k, g, d]) => ton(t, out, { f: f0 * k, vrchol: 0.06 * s * g, utlum: d }));
    },
  };
  /* Trvalé smyčky: šum přes filtr, hlasitost podle kresby. Předení má navíc chvění 24 Hz. */
  const SMYCKY = {
    voda: { buf: "bily", typ: "bandpass", f: 1500, q: 0.6, kolisani: 0.45 },
    ohen: { buf: "hnedy", typ: "lowpass", f: 260, q: 0.7, kolisani: 0.1 },
    predeni: { buf: "hnedy", typ: "lowpass", f: 190, q: 0.7, chveni: 24, kolisani: 0 },
  };
  const smycka = (druh) => {
    if (smycky[druh]) return smycky[druh];
    const S = SMYCKY[druh];
    if (!S) return null;
    const n = ctx.createBufferSource();
    n.buffer = sumy[S.buf];
    n.loop = true;
    const bq = ctx.createBiquadFilter();
    bq.type = S.typ;
    bq.frequency.value = S.f;
    bq.Q.value = S.q;
    const g = ctx.createGain();
    g.gain.value = 0;
    let konec = g;
    if (S.chveni) {
      const am = ctx.createGain();
      am.gain.value = 0.5;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = S.chveni;
      const hloubka = ctx.createGain();
      hloubka.gain.value = 0.5;
      lfo.connect(hloubka).connect(am.gain);
      lfo.start();
      g.connect(am);
      konec = am;
    }
    n.connect(bq).connect(g);
    konec.connect(hlavni);
    n.start();
    smycky[druh] = { g, S };
    return smycky[druh];
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
    /** Hlasitosti smyček {druh: 0…1}; co chybí, ztichne. */
    nastavSmycky: (miry) => {
      if (!ctx) return;
      const zap = jeZapnuto();
      for (const druh of Object.keys(SMYCKY)) {
        const m = (miry && miry[druh]) || 0;
        if (!m && !smycky[druh]) continue;
        const s = smycka(druh);
        const k = s.S.kolisani ? 1 - s.S.kolisani * Math.random() : 1;
        s.g.gain.setTargetAtTime(zap ? m * 0.22 * k : 0, ctx.currentTime, 0.12);
      }
    },
  };
})();

/** Která plocha smí znít: ta pod myší, jinak ta, na kterou se naposledy sáhlo. */
let znejici = null;

/* ═══ Scéna: jedna plocha s jednou podobou ═══ */
const scena = (el, V) => {
  el.textContent = "";
  const defs = document.createElementNS(NS, "svg");
  defs.setAttribute("class", "kr-defs");
  defs.setAttribute("width", "0");
  defs.setAttribute("height", "0");
  defs.setAttribute("aria-hidden", "true");
  defs.innerHTML = `<defs>${V.defs()}</defs>`;
  el.appendChild(defs);
  const vrstvy = V.vrstvy.map((v) => {
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${VB} ${VB}`);
    svg.setAttribute("class", "kr-vrstva");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    if (v.styl) svg.style.cssText += `;${v.styl}`;
    if (v.tezka || v.pruhlednost) svg.style.willChange = "transform";
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
    }
    const slysi = znejici === el;
    for (const z of dyn.zvuk) if (slysi) Zvuk.hraj(z);
    dyn.zvuk.length = 0;
    if (slysi) Zvuk.nastavSmycky(V.smycky(st));
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
      if (!viditelna && znejici === el) Zvuk.nastavSmycky({});
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
      Zvuk.nastavSmycky({});
      znejici = null;
    }
  };
};

/* ═══ Spuštění: při každém načtení stránky, i po přechodu bez načtení ═══ */
const bezici = [];
/* zvuk webu se rozezní prvním gestem kdekoli — kresby se odemknou s ním */
for (const g of ["pointerup", "keydown", "touchend"]) document.addEventListener(g, () => document.querySelector("[data-kachlik-rovina]") && Zvuk.odemkni(), true);
const spustVse = () => {
  for (const el of document.querySelectorAll("[data-kachlik-rovina]")) {
    if (el.dataset.bezi) continue;
    const V = kresby[el.dataset.kachlikRovina];
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
