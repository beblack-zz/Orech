/*
 * Běh Bublinky jako yōkai (BublinkaYokai.astro): z generátorů v ./kresby.js
 * skládá vrstvy, točí čas a simulaci, poslouchá myš a hraje. Stavba je
 * stejná jako u Pecinky s ohněm (scripts/pecinka-ohen/beh.js).
 *
 * Každá vrstva je vlastní <svg> přes celou plochu. Statické se nakreslí
 * jednou a prohlížeč si je drží jako hotový obraz; živé se přepisují,
 * jen když se jim změní klíč. Vrstvy s `pohyb` (tělo, vak, tvář) se
 * nepřekreslují, když se Bublinka jen posune — dostanou CSS transformaci.
 *
 * Zvuk poslouchá vypínač v hlavičce nového vzhledu (parta2/zvuk.ts): hraje,
 * jen když je zvuk webu zapnutý. Tři kresby stojí vedle sebe, a tak zní
 * jen ta, nad kterou je myš, nebo na kterou se naposledy klepnulo.
 */
import { kresby, pretoc } from "./kresby.js";
import { jeZapnuto } from "../parta2/zvuk";

const NS = "http://www.w3.org/2000/svg";
const VB = 180;
const klidne = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const PENTA = [1318.5, 1568, 1760, 1975.5, 2349.3, 2637];

/* ═══ Zvuk: všechno se skládá ve Web Audio, žádné nahrávky ═══ */
const Zvuk = (() => {
  let ctx = null, hlavni = null, sumy = null, vitr = null, vitrFiltr = null, pec = null;
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
    return { g, bq };
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
    /* vítr kolem vaku: šum v pásmu, kterým se hýbe filtr */
    const v = smycka(sumy.hnedy, "bandpass", 520, 0.7);
    vitr = v.g;
    vitrFiltr = v.bq;
    /* žhavá glazura: hluboké hučení jako z pece */
    pec = smycka(sumy.hnedy, "lowpass", 260, 0.7).g;
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
  /** Šum přes filtr s obálkou — z toho je poryv, šustění, ťuknutí i šplouchnutí. */
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
    /* poryv z vaku: šum, který se rozjasní, a tupé bafnutí */
    fuk: (t, out, s) => {
      sumik(t, out, { f: 280, posun: 1900, q: 0.7, vrchol: 0.55 * s, nabeh: 0.07, utlum: 0.95 });
      sumik(t + 0.05, out, { typ: "highpass", f: 2400, q: 0.5, vrchol: 0.12 * s, nabeh: 0.08, utlum: 0.6 });
      ton(t, out, { f: 92, f2: 46, vrchol: 0.4 * s, nabeh: 0.012, utlum: 0.32 });
    },
    /* hedvábí plácne: tři krátká tlumená ťuknutí */
    plach: (t, out, s) => [0, 0.055, 0.12].forEach((z, i) => sumik(t + z, out, { typ: "lowpass", f: 900, vrchol: (0.3 - i * 0.08) * s, nabeh: 0.003, utlum: 0.05, buf: "hnedy" })),
    list: (t, out, s) => sumik(t, out, { typ: "highpass", f: 3600 + Math.random() * 1800, q: 0.6, vrchol: 0.07 * s, nabeh: 0.002, utlum: 0.018 + Math.random() * 0.02 }),
    /* akanbé: prdlavé „blééé“ — pila s rychlým třesem přes dolní propust */
    bleee: (t, out, s) => {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(120, t + 0.4);
      const trem = ctx.createOscillator();
      const tg = ctx.createGain();
      trem.frequency.value = 28;
      tg.gain.value = 0.5;
      const g = ctx.createGain();
      obalka(g, t, 0.12 * s, 0.4, 0.02);
      const am = ctx.createGain();
      am.gain.value = 0.5;
      trem.connect(tg).connect(am.gain);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 1300;
      o.connect(am).connect(lp).connect(g).connect(out);
      o.start(t);
      trem.start(t);
      o.stop(t + 0.5);
      trem.stop(t + 0.5);
    },
    /* želé: pružinové „bojnk“ — tón se rozhoupe a dozní */
    boing: (t, out, s) => {
      ton(t, out, { typ: "triangle", f: 210, f2: 330, vrchol: 0.16 * s, nabeh: 0.004, utlum: 0.5, vibrato: 11, hloubka: 70 });
      ton(t, out, { f: 420, f2: 660, vrchol: 0.05 * s, nabeh: 0.004, utlum: 0.35, vibrato: 11, hloubka: 120 });
    },
    /* chichot: pentatonika nahoru a dolů, krátké tóny s třesem */
    smich: (t, out, s) => [1046.5, 1318.5, 1568, 1318.5, 1174.7].forEach((f0, i) => ton(t + i * 0.085, out, { typ: "triangle", f: f0 * 0.9, f2: f0, vrchol: 0.07 * s, nabeh: 0.006, utlum: 0.07, vibrato: 22, hloubka: 18 })),
    /* skok do misky: bublavé „blup“ a šplouchnutí */
    plop: (t, out, s, z) => {
      const k = z.vys || 1;
      ton(t, out, { f: 210 * k, f2: 880 * k, vrchol: 0.16 * s, nabeh: 0.004, utlum: 0.12 });
      sumik(t + 0.02, out, { f: 1500, q: 0.9, vrchol: 0.14 * s, nabeh: 0.004, utlum: 0.16 });
    },
    /* glazura se rozžhaví: hukot, který se zvedne */
    zar: (t, out, s) => sumik(t, out, { typ: "lowpass", f: 180, posun: 1100, q: 0.8, vrchol: 0.35 * s, nabeh: 0.35, utlum: 0.9, buf: "hnedy" }),
    /* bublina v roztavené glazuře praskne */
    bubl: (t, out, s, z) => {
      const k = z.vys || 1;
      ton(t, out, { f: 280 * k, f2: 1100 * k, vrchol: 0.1 * s, nabeh: 0.003, utlum: 0.06 });
      sumik(t + 0.01, out, { typ: "highpass", f: 3000, vrchol: 0.08 * s, nabeh: 0.001, utlum: 0.012 });
    },
    /* nová skvrna vykvete: skleněný tón */
    kvet: (t, out, s) => sklo(t, out, PENTA[Math.floor(Math.random() * PENTA.length)], s * 0.9, 2),
    /* suikinkucu: kapka do zakopané nádoby — padající tón a dlouhý dozvuk */
    kap: (t, out, s, z) => {
      const f0 = 540 + (z.vys || 0) * 520;
      ton(t, out, { f: f0 * 1.7, f2: f0, vrchol: 0.06 * s, nabeh: 0.002, utlum: 0.9 });
      ton(t, out, { f: f0 * 2.3, vrchol: 0.018 * s, nabeh: 0.002, utlum: 0.5 });
    },
    /* geta na dřevě: suché klapnutí */
    klap: (t, out, s, z) => {
      const k = 0.85 + (z.vys || 0) * 0.35;
      sumik(t, out, { f: 1350 * k, q: 4, vrchol: 0.2 * s, nabeh: 0.001, utlum: 0.025 });
      ton(t, out, { typ: "triangle", f: 720 * k, vrchol: 0.08 * s, nabeh: 0.001, utlum: 0.04 });
    },
    tuk: (t, out, s, z) => {
      const k = 0.85 + (z.vys || 0) * 0.3;
      sumik(t, out, { f: 620 * k, q: 3, vrchol: 0.2 * s, nabeh: 0.001, utlum: 0.035 });
      ton(t, out, { typ: "triangle", f: 420 * k, vrchol: 0.09 * s, nabeh: 0.001, utlum: 0.05 });
    },
    /* protahuje se dírou: gumové vrznutí */
    vrz: (t, out, s, z) => ton(t, out, { f: 320 * (z.vys || 1), f2: 980 * (z.vys || 1), vrchol: 0.07 * s, nabeh: 0.02, utlum: 0.3, vibrato: 18, hloubka: 34 }),
    pop: (t, out, s) => {
      ton(t, out, { f: 520, f2: 1700, vrchol: 0.2 * s, nabeh: 0.002, utlum: 0.07 });
      sumik(t, out, { typ: "highpass", f: 2600, vrchol: 0.1 * s, nabeh: 0.001, utlum: 0.015 });
    },
    /* obří stín: hluboké „búúú“ s chvěním */
    buu: (t, out, s) => {
      ton(t, out, { f: 96, f2: 78, vrchol: 0.32 * s, nabeh: 0.18, utlum: 1.7, vibrato: 5, hloubka: 6 });
      ton(t, out, { typ: "triangle", f: 192, f2: 150, vrchol: 0.07 * s, nabeh: 0.2, utlum: 1.4, vibrato: 5, hloubka: 10 });
      sumik(t, out, { typ: "lowpass", f: 300, vrchol: 0.18 * s, nabeh: 0.25, utlum: 1.4, buf: "hnedy" });
    },
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
      obalka(g, t, 0.022 * s, delka, 0.02);
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
    /** stálé zvuky: vítr kolem vaku a hučení žhavé glazury */
    nastav: ({ vitr: v = 0, pec: p = 0 } = {}) => {
      if (!ctx || !vitr) return;
      const zap = jeZapnuto();
      vitr.gain.setTargetAtTime(zap ? v * 0.22 : 0, ctx.currentTime, 0.25);
      vitrFiltr.frequency.setTargetAtTime(380 + v * 900, ctx.currentTime, 0.3);
      pec.gain.setTargetAtTime(zap ? p * 0.3 : 0, ctx.currentTime, 0.3);
    },
  };
})();

/** Která plocha smí znít: ta pod myší, jinak ta, na kterou se naposledy sáhlo. */
let znejici = null;

/* ═══ Scéna: jedna plocha s jednou podobou ═══ */
const scena = (el, V) => {
  el.textContent = "";
  const defs = document.createElementNS(NS, "svg");
  defs.setAttribute("class", "by-defs");
  defs.setAttribute("width", "0");
  defs.setAttribute("height", "0");
  defs.setAttribute("aria-hidden", "true");
  defs.innerHTML = `<defs>${V.defs()}</defs>`;
  el.appendChild(defs);
  const vrstvy = V.vrstvy.map((v) => {
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${VB} ${VB}`);
    svg.setAttribute("class", "by-vrstva");
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

  const vstup = { mys: null, kliky: [] };
  let dyn = V.novaDynamika();
  let t = 0, posledniCas = null, viditelna = false, zastaveno = false, aktivniDo = 0;

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
    if (slysi) Zvuk.nastav(V.id === "v1" ? { vitr: V.hukot(st) } : V.id === "v2" ? { pec: V.hukot(st) } : {});
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
    vstup.mys = naJednotky(e);
    znejici = el;
    aktivniDo = Math.max(aktivniDo, t + 1.5);
  });
  el.addEventListener("pointerleave", () => {
    vstup.mys = null;
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
    /* z klávesnice míří poryv šikmo nahoru, jinam to je jedno */
    vstup.kliky.push({ x: 40 + Math.random() * 100, y: 30 });
    aktivniDo = t + 10;
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
for (const g of ["pointerup", "keydown", "touchend"]) document.addEventListener(g, () => document.querySelector("[data-bublinka-yokai]") && Zvuk.odemkni(), true);
const spustVse = () => {
  for (const el of document.querySelectorAll("[data-bublinka-yokai]")) {
    if (el.dataset.bezi) continue;
    const V = kresby[el.dataset.bublinkaYokai];
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
