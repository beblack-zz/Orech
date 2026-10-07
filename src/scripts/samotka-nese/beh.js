/*
 * Běh Šamotky (SamotkaNese.astro): z generátorů v ./kresby.js skládá
 * vrstvy, točí čas a simulaci, poslouchá myš a hraje. Stavba je stejná
 * jako u Pecinky s ohněm (scripts/pecinka-ohen/beh.js): každá vrstva je
 * vlastní <svg> přes celou plochu, statické se nakreslí jednou, živé se
 * přepisují, jen když se jim změní klíč.
 *
 * Navíc oproti Pecince se dá táhnout (provaz zvonce u kamidany): dokud je
 * tlačítko dole, běh posílá polohu ve vstup.drzi a ukazatel si plocha
 * podrží, i když vyjede ven.
 *
 * Zvuk poslouchá vypínač v hlavičce nového vzhledu (parta2/zvuk.ts): hraje,
 * jen když je zvuk webu zapnutý, a vždycky jen ta plocha, nad kterou je
 * myš, nebo na kterou se naposledy sáhlo.
 */
import { kresby, pretoc } from "./kresby.js";
import { jeZapnuto } from "../parta2/zvuk";

const NS = "http://www.w3.org/2000/svg";
const VB = 180;
const klidne = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const PENTA = [1318.5, 1568, 1760, 1975.5, 2349.3, 2637];

/* ═══ Zvuk: všechno se skládá ve Web Audio, žádné nahrávky ═══ */
const Zvuk = (() => {
  let ctx = null, hlavni = null, sumy = null, hukot = null, hukotFiltr = null;
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
    /* souvislý šum: hučení hořáků u výpalu, vítr u sněhu */
    const n = ctx.createBufferSource();
    n.buffer = sumy.hnedy;
    n.loop = true;
    hukotFiltr = ctx.createBiquadFilter();
    hukotFiltr.type = "lowpass";
    hukotFiltr.frequency.value = 260;
    hukot = ctx.createGain();
    hukot.gain.value = 0;
    n.connect(hukotFiltr).connect(hukot).connect(hlavni);
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
  /** Šum přes filtr s obálkou. */
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
  const ton = (t, out, { typ = "sine", f = 440, f2, vrchol = 0.2, nabeh = 0.003, utlum = 0.2, filtr } = {}) => {
    const o = ctx.createOscillator();
    o.type = typ;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + nabeh + utlum * 0.6);
    const g = ctx.createGain();
    obalka(g, t, vrchol, utlum, nabeh);
    if (filtr) {
      const bq = ctx.createBiquadFilter();
      bq.type = "bandpass";
      bq.frequency.value = filtr.f;
      bq.Q.value = filtr.q;
      o.connect(bq).connect(g).connect(out);
    } else o.connect(g).connect(out);
    o.start(t);
    o.stop(t + nabeh + utlum + 0.05);
  };
  /** Kovové nebo skleněné těleso: alikvóty s vlastním doznivem (a záznějem). */
  const zvonek = (t, out, f0, mody, sila, rozladeni = 0) =>
    mody.forEach(([k, g, doba]) => {
      ton(t, out, { f: f0 * k, vrchol: sila * g, utlum: doba, nabeh: 0.002 });
      if (rozladeni) ton(t, out, { f: f0 * k + rozladeni, vrchol: sila * g * 0.7, utlum: doba * 0.9, nabeh: 0.002 });
    });
  const ZVUKY = {
    /* ——— kamidana ——— */
    /* zvonek suzu: kulička uvnitř zarachtá — dva rychlé údery v kovových alikvótách */
    suzu: (t, out, s) => {
      const f0 = 2500 + Math.random() * 900;
      for (let i = 0; i < 2 + (s > 0.6 ? 1 : 0); i++) {
        const tt = t + i * (0.03 + Math.random() * 0.03);
        const ff = f0 * (1 + (Math.random() - 0.5) * 0.04);
        zvonek(tt, out, ff, [[1, 0.09, 0.38], [1.52, 0.055, 0.26], [2.27, 0.03, 0.17], [3.1, 0.018, 0.1]], s * (i ? 0.6 : 1));
        sumik(tt, out, { typ: "highpass", f: 5200, vrchol: 0.05 * s, utlum: 0.006 });
      }
    },
    /* kašiwade: dlaně o sebe — prásknutí, tupé tělo a ozvěna dřevěné místnosti */
    tlesk: (t, out, s) => {
      sumik(t, out, { f: 1150, q: 0.9, vrchol: 0.55 * s, nabeh: 0.001, utlum: 0.045 });
      sumik(t, out, { typ: "lowpass", f: 320, vrchol: 0.35 * s, nabeh: 0.001, utlum: 0.03 });
      sumik(t + 0.048, out, { typ: "lowpass", f: 1800, vrchol: 0.12 * s, nabeh: 0.002, utlum: 0.08 });
    },
    /* probuzení: miska orin, vánek a u plného obřadu zlaté cinknutí */
    probuzeni: (t, out, s, z) => {
      zvonek(t, out, 523, [[1, 0.16, 5.5], [2.71, 0.07, 3.2], [5.12, 0.03, 1.6], [8.4, 0.012, 0.8]], s, 0.9);
      sumik(t, out, { f: 300, posun: 1300, q: 0.7, vrchol: 0.12 * s, nabeh: 0.6, utlum: 1.6, buf: "hnedy" });
      if (z.plne) [0.5, 0.75, 1.05, 1.3].forEach((d, i) => zvonek(t + d, out, PENTA[(i * 2) % PENTA.length], [[1, 0.05, 1.8], [2.76, 0.02, 0.9]], s));
    },
    dvere: (t, out) => {
      ton(t, out, { typ: "sawtooth", f: 140, f2: 190, vrchol: 0.035, nabeh: 0.05, utlum: 0.5, filtr: { f: 900, q: 5 } });
      sumik(t + 0.55, out, { typ: "lowpass", f: 600, vrchol: 0.08, utlum: 0.05 });
    },
    /* ——— výpal ——— */
    polozit: (t, out, s) => {
      ton(t, out, { typ: "triangle", f: 1500 + Math.random() * 400, vrchol: 0.1 * s, utlum: 0.08 });
      ton(t, out, { f: 180, vrchol: 0.12 * s, utlum: 0.05 });
      sumik(t, out, { f: 900, q: 1.2, vrchol: 0.1 * s, nabeh: 0.001, utlum: 0.02 });
    },
    zvednout: (t, out, s) => {
      ton(t, out, { typ: "triangle", f: 2100 + Math.random() * 400, vrchol: 0.06 * s, utlum: 0.06 });
      sumik(t, out, { f: 1400, q: 1.2, vrchol: 0.05 * s, nabeh: 0.001, utlum: 0.02 });
    },
    dvirka: (t, out) => {
      ton(t, out, { f: 92, f2: 55, vrchol: 0.4, utlum: 0.3 });
      sumik(t, out, { typ: "lowpass", f: 420, vrchol: 0.22, utlum: 0.12, buf: "hnedy" });
      sumik(t + 0.14, out, { typ: "highpass", f: 3200, vrchol: 0.08, nabeh: 0.001, utlum: 0.015 });
    },
    zapal: (t, out, s) => {
      sumik(t, out, { typ: "lowpass", f: 200, posun: 1400, vrchol: 0.5 * s, nabeh: 0.04, utlum: 0.6, buf: "hnedy" });
      ton(t, out, { f: 64, f2: 40, vrchol: 0.45 * s, nabeh: 0.01, utlum: 0.35 });
    },
    vypnout: (t, out) => {
      sumik(t, out, { typ: "highpass", f: 4000, vrchol: 0.07, nabeh: 0.001, utlum: 0.012 });
      sumik(t + 0.02, out, { f: 800, posun: 280, q: 0.8, vrchol: 0.16, nabeh: 0.01, utlum: 0.45 });
    },
    otevrit: (t, out) => {
      sumik(t, out, { typ: "highpass", f: 3000, vrchol: 0.07, nabeh: 0.001, utlum: 0.015 });
      ton(t + 0.05, out, { typ: "sawtooth", f: 110, f2: 150, vrchol: 0.03, nabeh: 0.05, utlum: 0.4, filtr: { f: 700, q: 5 } });
      sumik(t + 0.1, out, { typ: "lowpass", f: 600, vrchol: 0.14, nabeh: 0.15, utlum: 0.6, buf: "hnedy" });
    },
    drhne: (t, out, s) => sumik(t, out, { f: 420, q: 3, vrchol: 0.2 * s, nabeh: 0.01, utlum: 0.12, buf: "hnedy" }),
    trhnuti: (t, out, s) => {
      sumik(t, out, { typ: "highpass", f: 2000, vrchol: 0.3 * s, nabeh: 0.001, utlum: 0.02 });
      ton(t, out, { typ: "triangle", f: 2200, vrchol: 0.08 * s, utlum: 0.12 });
    },
    plac: (t, out, s) => {
      sumik(t, out, { typ: "lowpass", f: 420, vrchol: 0.35 * s, nabeh: 0.002, utlum: 0.07, buf: "hnedy" });
      ton(t, out, { f: 140, vrchol: 0.16 * s, utlum: 0.05 });
    },
    radost: (t, out, s) => {
      zvonek(t, out, 880, [[1, 0.06, 1.4], [1.5, 0.04, 1.1], [2, 0.02, 0.7]], s);
      zvonek(t + 0.16, out, 1320, [[1, 0.04, 1.2], [2, 0.015, 0.6]], s);
    },
    syk: (t, out, s) => {
      sumik(t, out, { typ: "highpass", f: 3000, q: 0.5, vrchol: 0.22 * s, nabeh: 0.01, utlum: 0.45 });
    },
    puf: (t, out, s) => sumik(t, out, { typ: "lowpass", f: 260, vrchol: 0.4 * s, nabeh: 0.01, utlum: 0.16, buf: "hnedy" }),
    /* praskání glazury kannjú: pec při chladnutí zpívá */
    cink: (t, out, s, z) => {
      const f0 = (2600 + Math.random() * 2600) * (z.vyska || 1);
      zvonek(t, out, f0, [[1, 0.07, 0.45 + Math.random() * 0.3], [2.43, 0.025, 0.2]], s);
    },
    tik: (t, out, s) => {
      sumik(t, out, { f: 2500, q: 4, vrchol: 0.1 * s, nabeh: 0.001, utlum: 0.006 });
      ton(t, out, { f: 1800, vrchol: 0.03 * s, utlum: 0.02 });
    },
    fuk: (t, out, s) => {
      sumik(t, out, { f: 320, posun: 1500, q: 0.8, vrchol: 0.45 * s, nabeh: 0.06, utlum: 0.55 });
      ton(t, out, { f: 75, f2: 42, vrchol: 0.4 * s, nabeh: 0.01, utlum: 0.3 });
    },
    /* ——— sníh ——— */
    /* vrabec: „čun čun“ — krátké pípnutí, které sjede dolů */
    cvrk: (t, out, s) => {
      const n = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < n; i++) {
        const f0 = 4300 + Math.random() * 700;
        ton(t + i * (0.11 + Math.random() * 0.05), out, { f: f0, f2: f0 * 0.72, vrchol: 0.05 * s, nabeh: 0.004, utlum: 0.06 });
      }
    },
    frr: (t, out, s) => {
      for (let i = 0; i < 9; i++) sumik(t + i * 0.035, out, { f: 1400 + Math.random() * 600, q: 1, vrchol: 0.09 * s, nabeh: 0.003, utlum: 0.025 });
      ZVUKY.cvrk(t + 0.05, out, s * 1.2);
    },
    ts: (t, out, s) => sumik(t, out, { typ: "highpass", f: 5200, vrchol: 0.025 * s, nabeh: 0.005, utlum: 0.06 }),
    /* zvon z pagody: bonšó, hluboký úder a dlouhé dozvívání se záznějem */
    zvon: (t, out, s) => {
      sumik(t, out, { typ: "lowpass", f: 500, vrchol: 0.12 * s, nabeh: 0.002, utlum: 0.05, buf: "hnedy" });
      zvonek(t, out, 98, [[1, 0.22, 9], [2.01, 0.1, 6], [2.76, 0.07, 4.2], [4.13, 0.035, 2.6], [5.4, 0.015, 1.5]], s, 0.45);
    },
    buch: (t, out, s) => sumik(t, out, { typ: "lowpass", f: 300, vrchol: 0.3 * s, nabeh: 0.004, utlum: 0.12, buf: "hnedy" }),
    sesuv: (t, out, s) => sumik(t, out, { typ: "lowpass", f: 1100, posun: 300, vrchol: 0.2 * s, nabeh: 0.05, utlum: 0.6 }),
    /* kočka: krátké „mrrr“ — vrčivý tón přes formant, s trylkem */
    mnau: (t, out, s, z) => {
      const d = z.kratce ? 0.18 : 0.32;
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(380, t);
      o.frequency.exponentialRampToValueAtTime(620, t + d * 0.7);
      o.frequency.exponentialRampToValueAtTime(520, t + d);
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 28;
      const lfoG = ctx.createGain();
      lfoG.gain.value = 0.5;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05 * s, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      const trylek = ctx.createGain();
      trylek.gain.value = 0.5;
      lfo.connect(lfoG).connect(trylek.gain);
      const bq = ctx.createBiquadFilter();
      bq.type = "bandpass";
      bq.frequency.value = 1100;
      bq.Q.value = 2.4;
      o.connect(bq).connect(trylek).connect(g).connect(out);
      o.start(t);
      lfo.start(t);
      o.stop(t + d + 0.05);
      lfo.stop(t + d + 0.05);
    },
    /* předení: hluboký šum, který se 26× za vteřinu nadechne */
    prr: (t, out, s) => {
      const n = ctx.createBufferSource();
      n.buffer = sumy.hnedy;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 190;
      const am = ctx.createGain();
      am.gain.value = 0.5;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 26;
      const lfoG = ctx.createGain();
      lfoG.gain.value = 0.5;
      lfo.connect(lfoG).connect(am.gain);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.32 * s, t + 0.25);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
      n.connect(lp).connect(am).connect(g).connect(out);
      n.start(t, Math.random() * 3);
      lfo.start(t);
      n.stop(t + 0.9);
      lfo.stop(t + 0.9);
    },
    krup: (t, out, s) => {
      for (let i = 0; i < 3; i++) sumik(t + i * 0.018, out, { f: 1600 + Math.random() * 800, q: 0.8, vrchol: 0.05 * s, nabeh: 0.002, utlum: 0.018 });
    },
    dopad: (t, out, s) => sumik(t, out, { typ: "lowpass", f: 350, vrchol: 0.25 * s, nabeh: 0.003, utlum: 0.08, buf: "hnedy" }),
    teplo: (t, out, s) => {
      ton(t, out, { f: 110, vrchol: 0.12 * s, nabeh: 0.2, utlum: 0.7 });
      sumik(t, out, { typ: "lowpass", f: 420, vrchol: 0.1 * s, nabeh: 0.25, utlum: 0.6, buf: "hnedy" });
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
      ZVUKY[z.druh](ctx.currentTime + 0.005 + (z.za || 0), vystup(z.pan), z.sila ?? 1, z);
    },
    nastavHukot: (mira, frekvence = 260) => {
      if (!ctx || !hukot) return;
      hukot.gain.setTargetAtTime(jeZapnuto() ? mira * 0.22 : 0, ctx.currentTime, 0.3);
      hukotFiltr.frequency.setTargetAtTime(frekvence, ctx.currentTime, 0.4);
    },
  };
})();

/** Která plocha smí znít: ta pod myší, jinak ta, na kterou se naposledy sáhlo. */
let znejici = null;

/* ═══ Scéna: jedna plocha s jednou podobou ═══ */
const scena = (el, V) => {
  el.textContent = "";
  const defs = document.createElementNS(NS, "svg");
  defs.setAttribute("class", "sn-defs");
  defs.setAttribute("width", "0");
  defs.setAttribute("height", "0");
  defs.setAttribute("aria-hidden", "true");
  defs.innerHTML = `<defs>${V.defs()}</defs>`;
  el.appendChild(defs);
  const vrstvy = V.vrstvy.map((v) => {
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${VB} ${VB}`);
    svg.setAttribute("class", "sn-vrstva");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    if (v.styl) svg.style.cssText += `;${v.styl}`;
    if (v.tezka || v.pruhlednost) svg.style.willChange = "transform";
    el.appendChild(svg);
    return { v, svg, klic: undefined, nakresleno: false };
  });

  const vstup = { mys: null, rychlost: 0, kliky: [], drzi: null };
  /* scéna může začít o kus dál (sníh: aby nezačínal s prázdným nebem) */
  let t = V.zacatek || 0;
  let dyn = t > 0 ? pretoc(V, t) : V.novaDynamika();
  let posledniCas = null, viditelna = false, zastaveno = false, aktivniDo = 0, mysPred = null;

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
    if (slysi) Zvuk.nastavHukot(V.hukot(st), V.hukotFrekvence || 260);
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
    if (vstup.drzi) vstup.drzi = p;
    znejici = el;
    aktivniDo = Math.max(aktivniDo, t + 1.5);
  });
  el.addEventListener("pointerleave", () => {
    if (vstup.drzi) return;
    vstup.mys = null;
    mysPred = null;
  });
  el.addEventListener("pointerdown", (e) => {
    Zvuk.odemkni();
    znejici = el;
    const p = naJednotky(e);
    vstup.mys = p;
    vstup.drzi = p;
    vstup.kliky.push(p);
    try {
      el.setPointerCapture(e.pointerId);
    } catch {}
    aktivniDo = t + 10;
  });
  const pustit = (e) => {
    vstup.drzi = null;
    try {
      el.releasePointerCapture(e.pointerId);
    } catch {}
  };
  el.addEventListener("pointerup", pustit);
  el.addEventListener("pointercancel", pustit);
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
/* zvuk webu se rozezní prvním gestem kdekoli — Šamotka se odemkne s ním */
for (const g of ["pointerup", "keydown", "touchend"]) document.addEventListener(g, () => document.querySelector("[data-samotka-nese]") && Zvuk.odemkni(), true);
const spustVse = () => {
  for (const el of document.querySelectorAll("[data-samotka-nese]")) {
    if (el.dataset.bezi) continue;
    const V = kresby[el.dataset.samotkaNese];
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
