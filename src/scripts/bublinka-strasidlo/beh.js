/*
 * Běh Bublinky jako strašidla (BublinkaStrasidlo.astro): z generátorů
 * v ./kresby.js skládá vrstvy, točí čas a simulaci, poslouchá myš a hraje.
 * Stavba je stejná jako u Pecinky s ohněm (scripts/pecinka-ohen/beh.js).
 *
 * Každá vrstva je vlastní <svg> přes celou plochu. Statické se nakreslí
 * jednou a prohlížeč si je drží jako hotový obraz; živé se přepisují,
 * jen když se jim změní klíč. Vrstvy s `pohyb` (tělo, tvář, papír) se
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
/* pentatonika přes tři oktávy: plameny a svíčky naskakují po ní nahoru */
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
    /* stálé zvuky: vítr nad haldou, hučení ohně a hluboký tón, který patří duchovi */
    const dron = ctx.createGain();
    dron.gain.value = 0;
    dron.connect(hlavni);
    for (const [f, typ, sila] of [[55, "sine", 1], [82.6, "sine", 0.5], [110.4, "triangle", 0.16]]) {
      const o = ctx.createOscillator();
      o.type = typ;
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = sila;
      o.connect(g).connect(dron);
      o.start();
    }
    stale = { vitr: smycka(sumy.hnedy, "bandpass", 420, 0.7), ohen: smycka(sumy.hnedy, "lowpass", 240, 0.7), dron };
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
  /** Šum přes filtr s obálkou — z toho je fouknutí, syčení, šustění i klapnutí. */
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
  const ZVUKY = {
    /* sfoukne svatozář: šum, který se rozjasní, a tupé bafnutí */
    fuk: (t, out, s) => {
      sumik(t, out, { f: 280, posun: 1900, q: 0.7, vrchol: 0.5 * s, nabeh: 0.07, utlum: 0.7 });
      ton(t, out, { f: 92, f2: 46, vrchol: 0.3 * s, nabeh: 0.012, utlum: 0.3 });
    },
    /* dech ze tmy na svíčku: tichý a delší (sto svíček, odložený návrh 3 — stejně jako papir, pisk, hvizd, sunuti, klap a zjev) */
    fuu: (t, out, s) => sumik(t, out, { f: 420, posun: 1300, q: 0.8, vrchol: 0.26 * s, nabeh: 0.1, utlum: 0.34 }),
    /* knot nebo plamen zhasne: krátké zasyčení */
    syk: (t, out, s) => sumik(t, out, { typ: "highpass", f: 3400, q: 0.5, vrchol: 0.16 * s, nabeh: 0.004, utlum: 0.4 }),
    /* plamen naskočí: malé vzplanutí a skleněný tón, každý o stupeň výš */
    zapal: (t, out, s, z) => {
      sumik(t, out, { f: 600, posun: 1900, q: 0.9, vrchol: 0.16 * s, nabeh: 0.02, utlum: 0.14 });
      sklo(t + 0.02, out, PENTA[Math.min(PENTA.length - 1, z.vys || 0)], s, 1.1);
    },
    /* chichot: pentatonika nahoru a dolů, krátké tóny s třesem */
    smich: (t, out, s) => [1046.5, 1318.5, 1568, 1318.5, 1174.7].forEach((f0, i) => ton(t + i * 0.085, out, { typ: "triangle", f: f0 * 0.9, f2: f0, vrchol: 0.07 * s, nabeh: 0.006, utlum: 0.07, vibrato: 22, hloubka: 18 })),
    /* dušička vyklouzne z hrnce */
    pop: (t, out, s) => {
      ton(t, out, { f: 420, f2: 1500, vrchol: 0.16 * s, nabeh: 0.002, utlum: 0.07 });
      sumik(t, out, { typ: "highpass", f: 2600, vrchol: 0.08 * s, nabeh: 0.001, utlum: 0.015 });
    },
    /* bublinka v brázdě za ní praskne: tiché lupnutí */
    bublina: (t, out, s) => {
      ton(t, out, { f: 900 + Math.random() * 700, f2: 2400, vrchol: 0.05 * s, nabeh: 0.002, utlum: 0.03 });
      sumik(t, out, { typ: "highpass", f: 4200, vrchol: 0.03 * s, nabeh: 0.001, utlum: 0.01 });
    },
    /* každý hrnec má svůj tón */
    ton: (t, out, s, z) => sklo(t, out, PENTA[5 + ((z.vys || 0) % 6)], s * 0.8, 1.8),
    /* dušička doletěla k měsíci */
    kvet: (t, out, s) => {
      sklo(t, out, PENTA[10], s * 0.8, 2.2);
      sklo(t + 0.09, out, PENTA[12], s * 0.6, 2.4);
    },
    /* zvonek suzu: kovový, nesouzvučný, krátký */
    cink: (t, out, s) => {
      [[1, 1, 0.5], [1.48, 0.6, 0.36], [2.02, 0.45, 0.3], [2.71, 0.3, 0.2], [3.9, 0.16, 0.12]].forEach(([k, g, d]) => ton(t, out, { f: 1980 * k, vrchol: 0.05 * s * g, utlum: d }));
      sumik(t, out, { typ: "highpass", f: 5200, vrchol: 0.05 * s, nabeh: 0.001, utlum: 0.02 });
    },
    /* sova: hú — hú hú */
    sova: (t, out, s) => [[0, 0.38], [0.62, 0.2], [0.86, 0.34]].forEach(([za, d]) => ton(t + za, out, { f: 372, f2: 338, vrchol: 0.06 * s, nabeh: 0.05, utlum: d, vibrato: 5, hloubka: 4 })),
    /* cvrček zvonkový (suzumuši): „riiin“ — vysoký tón trylkuje */
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
    /* stín udělá baf: hluboké „búú“ s chvěním */
    buu: (t, out, s) => {
      ton(t, out, { f: 104, f2: 70, vrchol: 0.34 * s, nabeh: 0.05, utlum: 0.9, vibrato: 7, hloubka: 8 });
      ton(t, out, { typ: "sawtooth", f: 208, f2: 130, vrchol: 0.05 * s, nabeh: 0.05, utlum: 0.6, vibrato: 7, hloubka: 14 });
      sumik(t, out, { typ: "lowpass", f: 500, vrchol: 0.22 * s, nabeh: 0.04, utlum: 0.7, buf: "hnedy" });
    },
    /* papír se zachvěje */
    papir: (t, out, s) => [0, 0.05, 0.11, 0.18, 0.27].forEach((za, i) => sumik(t + za, out, { f: 1800 + i * 240, q: 0.8, vrchol: (0.16 - i * 0.025) * s, nabeh: 0.002, utlum: 0.04 })),
    /* lekla se: krátké pípnutí */
    pisk: (t, out, s) => ton(t, out, { f: 900, f2: 1700, vrchol: 0.08 * s, nabeh: 0.004, utlum: 0.1 }),
    /* hvízdá si, jako by nic: dvě noty */
    hvizd: (t, out, s) => [[0, 1480, 1568, 0.3], [0.42, 1760, 1975.5, 0.44]].forEach(([za, f, f2, d]) => {
      ton(t + za, out, { f, f2, vrchol: 0.07 * s, nabeh: 0.03, utlum: d, vibrato: 6, hloubka: 10 });
      sumik(t + za, out, { typ: "highpass", f: 5000, q: 0.5, vrchol: 0.012 * s, nabeh: 0.03, utlum: d });
    }),
    /* stínu naskočí svatozář: sladký trojzvuk */
    aureola: (t, out, s) => [1046.5, 1318.5, 1568, 2093].forEach((f, i) => ton(t + i * 0.03, out, { f, vrchol: 0.04 * s, nabeh: 0.06, utlum: 1.2 })),
    /* stínu rostou rohy: tiché zavrčení */
    vrr: (t, out, s) => {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(62, t);
      o.frequency.exponentialRampToValueAtTime(84, t + 0.7);
      const trem = ctx.createOscillator();
      const tg = ctx.createGain();
      trem.frequency.value = 24;
      tg.gain.value = 0.5;
      const am = ctx.createGain();
      am.gain.value = 0.5;
      trem.connect(tg).connect(am.gain);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 420;
      const g = ctx.createGain();
      obalka(g, t, 0.07 * s, 0.7, 0.2);
      o.connect(am).connect(lp).connect(g).connect(out);
      o.start(t);
      trem.start(t);
      o.stop(t + 1);
      trem.stop(t + 1);
    },
    /* dveře fusuma se posunou v drážce */
    sunuti: (t, out, s) => {
      sumik(t, out, { typ: "lowpass", f: 520, q: 0.8, vrchol: 0.2 * s, nabeh: 0.08, utlum: 0.4, buf: "hnedy" });
      sumik(t, out, { f: 1500, q: 2, vrchol: 0.04 * s, nabeh: 0.08, utlum: 0.36 });
    },
    klap: (t, out, s) => {
      sumik(t, out, { f: 900, q: 3, vrchol: 0.22 * s, nabeh: 0.001, utlum: 0.03 });
      ton(t, out, { typ: "triangle", f: 300, f2: 180, vrchol: 0.14 * s, nabeh: 0.001, utlum: 0.08 });
    },
    /* ve tmě se otevřou oči: hluboký tón se zvedne a nad ním sklo */
    zjev: (t, out, s) => {
      ton(t, out, { f: 73.4, f2: 110, vrchol: 0.24 * s, nabeh: 0.3, utlum: 1.6, vibrato: 4, hloubka: 3 });
      sklo(t + 0.25, out, 1318.5, s * 0.7, 2.4);
      sklo(t + 0.4, out, 1864.7, s * 0.5, 2.4);
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
    /** stálé zvuky podle scény: { vitr, ohen, dron } v rozsahu 0…1 */
    nastav: ({ vitr = 0, ohen = 0, dron = 0 } = {}) => {
      if (!ctx || !stale) return;
      const zap = jeZapnuto();
      stale.vitr.gain.setTargetAtTime(zap ? vitr * 0.2 : 0, ctx.currentTime, 0.3);
      stale.ohen.gain.setTargetAtTime(zap ? ohen * 0.3 : 0, ctx.currentTime, 0.3);
      stale.dron.gain.setTargetAtTime(zap ? dron * 0.07 : 0, ctx.currentTime, 0.4);
    },
  };
})();

/** Která plocha smí znít: ta pod myší, jinak ta, na kterou se naposledy sáhlo. */
let znejici = null;

/* ═══ Scéna: jedna plocha s jednou podobou ═══ */
const scena = (el, V) => {
  el.textContent = "";
  const defs = document.createElementNS(NS, "svg");
  defs.setAttribute("class", "bs-defs");
  defs.setAttribute("width", "0");
  defs.setAttribute("height", "0");
  defs.setAttribute("aria-hidden", "true");
  defs.innerHTML = `<defs>${V.defs()}</defs>`;
  el.appendChild(defs);
  const vrstvy = V.vrstvy.map((v) => {
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${VB} ${VB}`);
    svg.setAttribute("class", "bs-vrstva");
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
    return { v, svg, klic: undefined, nakresleno: false, tr: "" };
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
      if (v.pruhlednost) L.svg.style.opacity = v.pruhlednost(st);
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
/* zvuk webu se rozezní prvním gestem kdekoli — Bublinka se odemkne s ním */
for (const g of ["pointerup", "keydown", "touchend"]) document.addEventListener(g, () => document.querySelector("[data-bublinka-strasidlo]") && Zvuk.odemkni(), true);
const spustVse = () => {
  for (const el of document.querySelectorAll("[data-bublinka-strasidlo]")) {
    if (el.dataset.bezi) continue;
    const V = kresby[el.dataset.bublinkaStrasidlo];
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
