/*
 * Běh Střípka a zlata (StripekZlato.astro): z generátorů v ./kresby.js
 * skládá vrstvy, točí čas a simulaci, poslouchá myš a hraje.
 * Stavba je stejná jako u Bublinky (scripts/bublinka-strasidlo/beh.js).
 *
 * Každá vrstva je vlastní <svg> přes celou plochu. Statické se nakreslí
 * jednou a prohlížeč si je drží jako hotový obraz; živé se přepisují,
 * jen když se jim změní klíč. Vrstvy s `pohyb` (střep, obláček, tvář) se
 * nepřekreslují, když se jen hýbou — dostanou CSS transformaci.
 *
 * Zvuk poslouchá vypínač v hlavičce nového vzhledu (parta2/zvuk.ts): hraje,
 * jen když je zvuk webu zapnutý. Kresby stojí vedle sebe, a tak zní jen
 * ta, nad kterou je myš, nebo na kterou se naposledy klepnulo.
 */
import { kresby, pretoc, obsahVrstvy } from "./kresby.js";
import { jeZapnuto } from "../parta2/zvuk";

const NS = "http://www.w3.org/2000/svg";
const VB = 180;
const klidne = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
/* pentatonika přes tři oktávy: každá zalitá spára cinkne o stupeň výš */
const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.7, 1318.5, 1568, 1760, 2093, 2349.3, 2637, 3136, 3520, 4186];

/* ═══ Zvuk: všechno se skládá ve Web Audio, žádné nahrávky ═══ */
const Zvuk = (() => {
  let ctx = null, hlavni = null, sumy = null, stale = null;
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
  const smycka = (buf, filtr, f, q) => {
    const n = ctx.createBufferSource();
    n.buffer = buf;
    n.loop = true;
    const bq = ctx.createBiquadFilter();
    bq.type = filtr;
    bq.frequency.value = f;
    bq.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = 0;
    n.connect(bq).connect(g).connect(hlavni);
    n.start();
    return g;
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
    /* stálé zvuky: vítr v noci, štětec na glazuře a tón zpívající mísy, když medituje */
    const misa = ctx.createGain();
    misa.gain.value = 0;
    misa.connect(hlavni);
    for (const [f, sila] of [[196, 1], [197.1, 0.8], [531.4, 0.22], [1009, 0.07]]) {
      const o = ctx.createOscillator();
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = sila;
      o.connect(g).connect(misa);
      o.start();
    }
    stale = { vitr: smycka(sumy.hnedy, "bandpass", 420, 0.7), stetec: smycka(sumy.bily, "bandpass", 2300, 0.9), misa };
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
  /** Šum přes filtr s obálkou — z toho je prasknutí, papír i sypání prachu. */
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
  const ton = (t, out, { typ = "sine", f = 440, f2, vrchol = 0.2, nabeh = 0.003, utlum = 0.2, vibrato = 0, hloubka = 0 } = {}) => {
    const o = ctx.createOscillator();
    o.type = typ;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + nabeh + utlum * 0.6);
    if (vibrato) {
      const l = ctx.createOscillator();
      const lg = ctx.createGain();
      l.frequency.value = vibrato;
      lg.gain.value = hloubka;
      l.connect(lg).connect(o.frequency);
      l.start(t);
      l.stop(t + nabeh + utlum + 0.05);
    }
    const g = ctx.createGain();
    obalka(g, t, vrchol, utlum, nabeh);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + nabeh + utlum + 0.05);
  };
  /** Skleněný tón: čtyři nesouzvučné alikvóty jako zvonek fūrin v parta2/zvuk.ts. */
  const sklo = (t, out, f0, s, delka = 1.6) =>
    [[1, 1, 1], [2.76, 0.42, 0.62], [5.4, 0.2, 0.36], [8.93, 0.08, 0.2]].forEach(([k, g, d]) => ton(t, out, { f: f0 * k, vrchol: 0.05 * s * g, utlum: delka * d }));
  /** Střep o střep: krátký vysoký tón, jak cinkne porcelán. */
  const strep = (t, out, s, f0 = 2400 + Math.random() * 2600) => {
    ton(t, out, { typ: "triangle", f: f0, f2: f0 * 0.94, vrchol: 0.07 * s, nabeh: 0.001, utlum: 0.05 + Math.random() * 0.08 });
    ton(t, out, { f: f0 * 2.31, vrchol: 0.025 * s, nabeh: 0.001, utlum: 0.04 });
  };
  const ZVUKY = {
    /* něco praskne: ostré lupnutí, tupý úder a pár střepů, které dozvoní */
    krup: (t, out, s) => {
      sumik(t, out, { typ: "highpass", f: 2600, vrchol: 0.5 * s, nabeh: 0.001, utlum: 0.035 });
      sumik(t + 0.028, out, { f: 1500, q: 2, vrchol: 0.28 * s, nabeh: 0.001, utlum: 0.05 });
      ton(t, out, { f: 190, f2: 84, vrchol: 0.26 * s, nabeh: 0.002, utlum: 0.11 });
      for (let i = 0; i < 5; i++) strep(t + 0.03 + i * 0.045 + Math.random() * 0.03, out, s * (1 - i * 0.15));
    },
    /* ťuknutí o glazuru, střípek o lucernu */
    tuk: (t, out, s) => {
      sumik(t, out, { f: 2100, q: 3, vrchol: 0.22 * s, nabeh: 0.001, utlum: 0.022 });
      strep(t, out, s * 1.2, 1500);
    },
    /* papír lucerny se roztrhne */
    trh: (t, out, s) => [0, 0.03, 0.07].forEach((za, i) => sumik(t + za, out, { f: 1300 + i * 700, posun: 3600, q: 0.8, vrchol: (0.26 - i * 0.06) * s, nabeh: 0.002, utlum: 0.07 })),
    /* spára je zalitá: kovově skleněný tón a nad ním třpyt */
    cink: (t, out, s, z) => {
      const f0 = PENTA[Math.min(PENTA.length - 1, 2 + (z.vys || 0))];
      strep(t, out, s * 0.7, f0 * 2);
      sklo(t + 0.01, out, f0, s, 1.5);
      ton(t + 0.02, out, { f: f0 * 3, vrchol: 0.012 * s, nabeh: 0.03, utlum: 0.9, vibrato: 7, hloubka: 14 });
    },
    /* zpívající mísa: dva tóny těsně vedle sebe, které se vlní */
    rin: (t, out, s) => {
      for (const [f, g, d] of [[392, 1, 4.6], [393.4, 0.8, 4.6], [1062, 0.3, 2.6], [2020, 0.1, 1.4]]) ton(t, out, { f, vrchol: 0.07 * s * g, nabeh: 0.012, utlum: d });
      sumik(t, out, { f: 1900, q: 4, vrchol: 0.05 * s, nabeh: 0.001, utlum: 0.03 });
    },
    /* zlato vzplane: rychle nahoru po pentatonice a třpyt */
    zare: (t, out, s) => {
      [5, 7, 8, 10, 12, 13].forEach((i, k) => sklo(t + k * 0.05, out, PENTA[i], s * 0.75, 1.8));
      sumik(t, out, { typ: "highpass", f: 6200, q: 0.5, vrchol: 0.05 * s, nabeh: 0.12, utlum: 0.8 });
    },
    /* svítání: teplý souzvuk, který pomalu naběhne */
    svitani: (t, out, s) => [196, 293.66, 392, 493.88, 587.33].forEach((f, i) => ton(t + i * 0.16, out, { f, vrchol: 0.045 * s, nabeh: 0.9, utlum: 4.2, vibrato: 0.6, hloubka: 1.2 })),
    /* spokojené zachichotání */
    smich: (t, out, s) => [880, 1046.5, 1318.5, 1046.5].forEach((f0, i) => ton(t + i * 0.09, out, { typ: "triangle", f: f0 * 0.92, f2: f0, vrchol: 0.06 * s, nabeh: 0.006, utlum: 0.08, vibrato: 18, hloubka: 14 })),
    /* lekl se: krátké pípnutí */
    pisk: (t, out, s) => ton(t, out, { f: 760, f2: 1560, vrchol: 0.08 * s, nabeh: 0.004, utlum: 0.1 }),
    /* štětec do misky se zlatem */
    plop: (t, out, s) => {
      ton(t, out, { f: 300, f2: 720, vrchol: 0.14 * s, nabeh: 0.003, utlum: 0.07 });
      sumik(t + 0.01, out, { typ: "highpass", f: 3000, vrchol: 0.05 * s, nabeh: 0.001, utlum: 0.03 });
    },
    /* zlatý prach: tiché zašumění a pár zrnek */
    sypani: (t, out, s) => {
      sumik(t, out, { typ: "highpass", f: 7000, q: 0.5, vrchol: 0.035 * s, nabeh: 0.06, utlum: 0.5 });
      for (let i = 0; i < 4; i++) ton(t + 0.05 + Math.random() * 0.4, out, { f: 5200 + Math.random() * 3600, vrchol: 0.012 * s, nabeh: 0.001, utlum: 0.03 });
    },
    /* cvrček zvonkový (suzumuši): vysoký tón trylkuje */
    cvrcek: (t, out, s) => {
      const f0 = 4200 + Math.random() * 300;
      const delka = 0.25 + Math.random() * 0.3;
      const o = ctx.createOscillator();
      o.frequency.value = f0;
      const am = ctx.createGain();
      am.gain.value = 0.5;
      const tr = ctx.createOscillator();
      const tg = ctx.createGain();
      tr.frequency.value = 38 + Math.random() * 8;
      tg.gain.value = 0.5;
      tr.connect(tg).connect(am.gain);
      const g = ctx.createGain();
      obalka(g, t, 0.02 * s, delka, 0.02);
      o.connect(am).connect(g).connect(out);
      o.start(t);
      tr.start(t);
      o.stop(t + delka + 0.08);
      tr.stop(t + delka + 0.08);
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
    /** stálé zvuky podle scény: { vitr, stetec, misa } v rozsahu 0…1 */
    nastav: ({ vitr = 0, stetec = 0, misa = 0 } = {}) => {
      if (!ctx || !stale) return;
      const zap = jeZapnuto();
      stale.vitr.gain.setTargetAtTime(zap ? vitr * 0.2 : 0, ctx.currentTime, 0.3);
      stale.stetec.gain.setTargetAtTime(zap ? stetec * 0.022 : 0, ctx.currentTime, 0.06);
      stale.misa.gain.setTargetAtTime(zap ? misa * 0.03 : 0, ctx.currentTime, 0.5);
    },
  };
})();

/** Která plocha smí znít: ta pod myší, jinak ta, na kterou se naposledy sáhlo. */
let znejici = null;

/* ═══ Scéna: jedna plocha s jednou podobou ═══ */
const scena = (el, V) => {
  el.textContent = "";
  const defs = document.createElementNS(NS, "svg");
  defs.setAttribute("class", "sz-defs");
  defs.setAttribute("width", "0");
  defs.setAttribute("height", "0");
  defs.setAttribute("aria-hidden", "true");
  defs.innerHTML = `<defs>${V.defs()}</defs>`;
  el.appendChild(defs);
  const vrstvy = V.vrstvy.map((v) => {
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${VB} ${VB}`);
    svg.setAttribute("class", "sz-vrstva");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    if (v.styl) svg.style.cssText += `;${v.styl}`;
    /* těžké filtry a pohyblivé vrstvy dostanou vlastní kompoziční vrstvu */
    if (v.tezka || v.pohyb || v.pruhlednost) svg.style.willChange = "transform";
    if (v.pohyb) {
      const p = v.pohyb(V.stav(0, {}, V.novaDynamika()));
      svg.style.transformOrigin = `${((p.ox / VB) * 100).toFixed(3)}% ${((p.oy / VB) * 100).toFixed(3)}%`;
    }
    el.appendChild(svg);
    return { v, svg, klic: undefined, nakresleno: false, tr: "", op: "" };
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
        L.svg.innerHTML = obsahVrstvy(v, st);
        L.klic = k;
        L.nakresleno = true;
      }
      if (v.pohyb) {
        const p = v.pohyb(st);
        /* posun v procentech vrstvy (vrstva je přes celou plochu), takže není třeba nic měřit */
        const tr = `translate3d(${((p.x / VB) * 100).toFixed(3)}%, ${((p.y / VB) * 100).toFixed(3)}%, 0) rotate(${(p.r || 0).toFixed(2)}deg) scale(${(p.sx ?? 1).toFixed(4)}, ${(p.sy ?? 1).toFixed(4)})`;
        if (tr !== L.tr) {
          L.svg.style.transform = tr;
          L.tr = tr;
        }
      }
      if (v.pruhlednost) {
        const op = String(v.pruhlednost(st));
        if (op !== L.op) {
          L.svg.style.opacity = op;
          L.op = op;
        }
      }
    }
    const slysi = znejici === el;
    for (const z of dyn.zvuk) if (slysi) Zvuk.hraj(z);
    dyn.zvuk.length = 0;
    if (slysi) Zvuk.nastav(V.hukot(st));
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
    aktivniDo = t + 12;
  });
  el.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    Zvuk.odemkni();
    znejici = el;
    vstup.kliky.push({ x: 90, y: 90 });
    aktivniDo = t + 12;
  });

  const io = new IntersectionObserver(
    (z) => {
      const byla = viditelna;
      viditelna = z[0].isIntersecting;
      if (!viditelna && znejici === el) Zvuk.nastav({});
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
      Zvuk.nastav({});
      znejici = null;
    }
  };
};

/* ═══ Spuštění: při každém načtení stránky, i po přechodu bez načtení ═══ */
const bezici = [];
/* zvuk webu se rozezní prvním gestem kdekoli — Střípek se odemkne s ním */
for (const g of ["pointerup", "keydown", "touchend"]) document.addEventListener(g, () => document.querySelector("[data-stripek-zlato]") && Zvuk.odemkni(), true);
const spustVse = () => {
  for (const el of document.querySelectorAll("[data-stripek-zlato]")) {
    if (el.dataset.bezi) continue;
    const V = kresby[el.dataset.stripekZlato];
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
