/*
 * Běh Cedulky jako emy (CedulkaEma.astro): z generátorů v ./kresby.js
 * skládá vrstvy, točí čas a simulaci, poslouchá myš a hraje. Stavba je
 * stejná jako u Pecinky s ohněm (scripts/pecinka-ohen/beh.js).
 *
 * Každá vrstva je vlastní <svg> přes celou plochu. Statické se nakreslí
 * jednou a prohlížeč si je drží jako hotový obraz; živé se přepisují,
 * jen když se jim změní klíč.
 *
 * Zvuk poslouchá vypínač v hlavičce nového vzhledu (parta2/zvuk.ts): hraje,
 * jen když je zvuk webu zapnutý. Kresby stojí vedle sebe, a tak zní jen ta,
 * nad kterou je myš, nebo na kterou se naposledy klepnulo.
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
    /* vrnění točny: hluboký šum, hlasitost podle rychlosti */
    const n = ctx.createBufferSource();
    n.buffer = sumy.hnedy;
    n.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 380;
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
  /** Šum přes filtr s obálkou — klepnutí, škrábání, foukání i syčení. */
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
  /** Kovový zvoneček: nesouzvučné alikvóty jako u zvonku fūrin. */
  const zvonek = (t, out, f0, s, doba = 0.3) =>
    [[1, 1, 1], [2.76, 0.4, 0.6], [5.4, 0.18, 0.35]].forEach(([k, g, d]) => ton(t, out, { f: f0 * k, vrchol: s * g, utlum: doba * d }));
  const ZVUKY = {
    /* dřevěné destičky o sebe: dvě tóny a cvaknutí */
    klap: (t, out, s) => {
      const f0 = 850 + Math.random() * 600;
      ton(t, out, { typ: "triangle", f: f0, vrchol: 0.16 * s, nabeh: 0.001, utlum: 0.05 });
      ton(t + 0.03 + Math.random() * 0.03, out, { typ: "triangle", f: f0 * 1.19, vrchol: 0.1 * s, nabeh: 0.001, utlum: 0.04 });
      sumik(t, out, { f: 2600, q: 2, vrchol: 0.12 * s, nabeh: 0.001, utlum: 0.012 });
    },
    /* zvoneček suzu: hrst malých kovových úderů */
    suzu: (t, out, s) => {
      const n = 4 + Math.floor(Math.random() * 4);
      for (let i = 0; i < n; i++) zvonek(t + Math.random() * 0.22, out, 2600 + Math.random() * 900, 0.05 * s, 0.25);
      sumik(t, out, { typ: "highpass", f: 6000, q: 0.7, vrchol: 0.05 * s, utlum: 0.2 });
    },
    /* destička se otočí: šum, který přeletí nahoru */
    otoc: (t, out, s) => sumik(t, out, { f: 420, posun: 1500, q: 1.2, vrchol: 0.22 * s, nabeh: 0.08, utlum: 0.32 }),
    /* kopyta po dřevě: dvě klapnutí */
    kopyta: (t, out, s) => {
      ton(t, out, { f: 560, f2: 420, vrchol: 0.11 * s, nabeh: 0.001, utlum: 0.06 });
      ton(t + 0.09, out, { f: 700, f2: 520, vrchol: 0.09 * s, nabeh: 0.001, utlum: 0.05 });
      sumik(t, out, { f: 1800, q: 2, vrchol: 0.06 * s, nabeh: 0.001, utlum: 0.01 });
    },
    /* hlína na dřevo: tupé žuchnutí */
    tup: (t, out, s) => {
      ton(t, out, { f: 120, f2: 70, vrchol: 0.3 * s, nabeh: 0.002, utlum: 0.12 });
      sumik(t, out, { typ: "lowpass", f: 380, vrchol: 0.22 * s, utlum: 0.08, buf: "hnedy" });
    },
    chichot: (t, out, s) => [880, 830, 790, 740].forEach((f, i) => ton(t + i * 0.1, out, { f, f2: f * 1.12, vrchol: 0.05 * s, nabeh: 0.01, utlum: 0.06 })),
    hm: (t, out, s) => {
      ton(t, out, { f: 210, f2: 180, vrchol: 0.1 * s, nabeh: 0.05, utlum: 0.3 });
      ton(t + 0.3, out, { f: 190, f2: 150, vrchol: 0.08 * s, nabeh: 0.04, utlum: 0.25 });
    },
    /* očko škrábe hlínu na točně */
    skrab: (t, out, s) => sumik(t, out, { f: 1500 + Math.random() * 900, q: 2.2, vrchol: 0.16 * s, nabeh: 0.004, utlum: 0.05 }),
    tuk: (t, out, s) => ton(t, out, { typ: "triangle", f: 1150, vrchol: 0.08 * s, nabeh: 0.001, utlum: 0.05 }),
    /* rydlo v kožovité hlíně */
    ryt: (t, out, s) => sumik(t, out, { typ: "highpass", f: 3200 + Math.random() * 1200, q: 0.8, vrchol: 0.14 * s, nabeh: 0.003, utlum: 0.04 + Math.random() * 0.04 }),
    fuk: (t, out, s) => sumik(t, out, { f: 500, posun: 1700, q: 0.8, vrchol: 0.3 * s, nabeh: 0.05, utlum: 0.45 }),
    /* zapamatováno: tichý zvoneček v pentatonice */
    ding: (t, out, s) => {
      const f0 = PENTA[Math.floor(Math.random() * 3)];
      ton(t, out, { f: f0, vrchol: 0.08 * s, utlum: 1.2 });
      ton(t, out, { f: f0 * 2, vrchol: 0.03 * s, utlum: 0.7 });
    },
    /* ťuknutí do hotového kusu */
    cink: (t, out, s) => {
      ton(t, out, { f: 2350, vrchol: 0.07 * s, utlum: 0.35 });
      ton(t, out, { f: 3610, vrchol: 0.04 * s, utlum: 0.22 });
    },
    ptak: (t, out, s) => [0, 0.11, 0.2].forEach((d, i) => ton(t + d, out, { f: 3100 + i * 300, f2: 4300 + i * 200, vrchol: 0.035 * s, nabeh: 0.005, utlum: 0.06 })),
    /* fixa: cvaknutí víčka, pak skřípání po dřevě */
    fixa: (t, out, s) => {
      sumik(t, out, { typ: "lowpass", f: 900, vrchol: 0.18 * s, nabeh: 0.001, utlum: 0.03 });
      ton(t, out, { f: 640, f2: 330, vrchol: 0.07 * s, nabeh: 0.001, utlum: 0.05 });
    },
    skrip: (t, out, s) => {
      sumik(t, out, { f: 2400 + Math.random() * 800, q: 6, vrchol: 0.09 * s, nabeh: 0.01, utlum: 0.07 });
      ton(t, out, { f: 2100, f2: 2500, vrchol: 0.012 * s, nabeh: 0.01, utlum: 0.06 });
    },
    /* maska: puf a zvoneček */
    maska: (t, out, s) => {
      sumik(t, out, { typ: "lowpass", f: 1200, posun: 300, vrchol: 0.25 * s, nabeh: 0.01, utlum: 0.25 });
      ZVUKY.suzu(t + 0.05, out, 0.6 * s);
    },
    sundat: (t, out, s) => sumik(t, out, { f: 600, posun: 2400, q: 1, vrchol: 0.2 * s, nabeh: 0.03, utlum: 0.3 }),
    /* liška: „kon kon“ — dvě krátká štěknutí s klesající výškou */
    kon: (t, out, s) =>
      [0, 0.22].forEach((d) => {
        ton(t + d, out, { typ: "sawtooth", f: 980, f2: 560, vrchol: 0.035 * s, nabeh: 0.008, utlum: 0.13 });
        ton(t + d, out, { f: 980, f2: 600, vrchol: 0.06 * s, nabeh: 0.008, utlum: 0.12 });
      }),
    /* cikády higurashi: „kana-kana-kana“, řada pulzů, které klesají a řídnou */
    cikady: (t, out, s) => {
      for (let i = 0; i < 16; i++) {
        const tt = t + i * 0.16 + i * i * 0.004;
        const f0 = 4700 - i * 45;
        const g = 0.03 * s * Math.sin(Math.PI * Math.min(1, (i + 1) / 16)) + 0.004;
        ton(tt, out, { f: f0, f2: f0 * 0.93, vrchol: g, nabeh: 0.006, utlum: 0.1 });
        ton(tt + 0.05, out, { f: f0 * 0.96, f2: f0 * 0.9, vrchol: g * 0.7, nabeh: 0.006, utlum: 0.07 });
      }
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
      hukot.gain.setTargetAtTime(jeZapnuto() ? mira * 0.16 : 0, ctx.currentTime, 0.2);
    },
  };
})();

/** Která plocha smí znít: ta pod myší, jinak ta, na kterou se naposledy sáhlo. */
let znejici = null;

/* ═══ Scéna: jedna plocha s jednou podobou ═══ */
const scena = (el, V) => {
  el.textContent = "";
  const defs = document.createElementNS(NS, "svg");
  defs.setAttribute("class", "ce-defs");
  defs.setAttribute("width", "0");
  defs.setAttribute("height", "0");
  defs.setAttribute("aria-hidden", "true");
  defs.innerHTML = `<defs>${V.defs()}</defs>`;
  el.appendChild(defs);
  const vrstvy = V.vrstvy.map((v) => {
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${VB} ${VB}`);
    svg.setAttribute("class", "ce-vrstva");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    if (v.styl) svg.style.cssText += `;${v.styl}`;
    if (v.tezka || v.pruhlednost || v.pohyb) svg.style.willChange = "transform";
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
      /* houpání na šňůrce: celá vrstva se otočí kolem háčku, obsah zůstane */
      if (v.pohyb) {
        const p = v.pohyb(st);
        L.svg.style.transformOrigin = `${(p.cx / VB) * 100}% ${(p.cy / VB) * 100}%`;
        L.svg.style.transform = `rotate(${Math.round(p.uhel * 100) / 100}deg)`;
      }
    }
    const slysi = znejici === el;
    for (const z of dyn.zvuk) if (slysi) Zvuk.hraj(z);
    dyn.zvuk.length = 0;
    if (slysi) Zvuk.nastavHukot(V.hukot ? V.hukot(st) : 0);
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
/* zvuk webu se rozezní prvním gestem kdekoli — Cedulka se odemkne s ním */
for (const g of ["pointerup", "keydown", "touchend"]) document.addEventListener(g, () => document.querySelector("[data-cedulka-ema]") && Zvuk.odemkni(), true);
const spustVse = () => {
  for (const el of document.querySelectorAll("[data-cedulka-ema]")) {
    if (el.dataset.bezi) continue;
    const V = kresby[el.dataset.cedulkaEma];
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
