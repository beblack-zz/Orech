/*
 * Běh Kapky a hromu (KapkaHrom.astro): z generátorů v ./kresby.js skládá
 * vrstvy, točí čas a simulaci, poslouchá myš a hraje.
 * Stavba je stejná jako u Střípka (scripts/stripek-zlato/beh.js).
 *
 * Každá vrstva je vlastní <svg> přes celou plochu. Statické se nakreslí
 * jednou a prohlížeč si je drží jako hotový obraz; živé se přepisují,
 * jen když se jim změní klíč. Vrstvy s `pohyb` (kruh bubnů, tělo, měsíc)
 * se nepřekreslují, když se jen hýbou — dostanou CSS transformaci.
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
const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.7, 1318.5, 1568, 1760, 2093];

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
  const pripravit = () => {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    const komp = ctx.createDynamicsCompressor();
    komp.threshold.value = -16;
    komp.ratio.value = 5;
    komp.attack.value = 0.003;
    komp.release.value = 0.25;
    hlavni = ctx.createGain();
    hlavni.gain.value = 0.85;
    hlavni.connect(komp).connect(ctx.destination);
    sumy = { bily: buffer(2, false), hnedy: buffer(5, true) };
    /* stálé zvuky: déšť (šum ve středním pásmu) a vítr */
    const dest = ctx.createBufferSource();
    dest.buffer = sumy.bily;
    dest.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2600;
    bp.Q.value = 0.45;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 7000;
    const gDest = ctx.createGain();
    gDest.gain.value = 0;
    dest.connect(bp).connect(lp).connect(gDest).connect(hlavni);
    dest.start();
    const vitr = ctx.createBufferSource();
    vitr.buffer = sumy.hnedy;
    vitr.loop = true;
    const bv = ctx.createBiquadFilter();
    bv.type = "bandpass";
    bv.frequency.value = 420;
    bv.Q.value = 0.7;
    const gVitr = ctx.createGain();
    gVitr.gain.value = 0;
    vitr.connect(bv).connect(gVitr).connect(hlavni);
    vitr.start();
    stale = { dest: gDest, vitr: gVitr };
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
  /** Šum přes filtr s obálkou — z toho je plesk kůže, švih stuhy i papír. */
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
  const ton = (t, out, { typ = "sine", f = 440, f2, vrchol = 0.2, nabeh = 0.003, utlum = 0.2, vibrato = 0, hloubka = 0, skluz = 0.6 } = {}) => {
    const o = ctx.createOscillator();
    o.type = typ;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + nabeh + utlum * skluz);
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
    /* taiko: tělo je sinus, který spadne z výšky (kůže se po úderu povolí), k tomu plesk kůže */
    don: (t, out, s, z) => {
      const l = z.ladeni || 1;
      ton(t, out, { f: 128 * l, f2: 56 * l, vrchol: 0.95 * s, utlum: 0.95, skluz: 0.15 });
      ton(t, out, { typ: "triangle", f: 210 * l, f2: 118 * l, vrchol: 0.28 * s, utlum: 0.22, skluz: 0.3 });
      sumik(t, out, { f: 780 * l, q: 0.9, vrchol: 0.42 * s, utlum: 0.07 });
    },
    /* ódaiko: o oktávu níž a dlouho doznívá; u kraje kůže zní výš a kratčeji */
    odaiko: (t, out, s, z) => {
      const l = z.vys ? 1.45 : 1;
      ton(t, out, { f: 92 * l, f2: 41 * l, vrchol: 1 * s, utlum: z.vys ? 1 : 1.9, skluz: 0.1 });
      ton(t, out, { f: 46 * l, f2: 33 * l, vrchol: 0.6 * s, utlum: z.vys ? 0.7 : 1.5, skluz: 0.2 });
      ton(t, out, { typ: "triangle", f: 170 * l, f2: 84 * l, vrchol: 0.3 * s, utlum: 0.3, skluz: 0.3 });
      sumik(t, out, { typ: "lowpass", f: 520 * l, q: 0.7, vrchol: 0.5 * s, utlum: 0.09 });
      sumik(t, out, { f: 1400, q: 1.2, vrchol: 0.1 * s, utlum: 0.03 });
    },
    /* ka: úder do okraje nebo paličky o sebe — dřevo, krátké a suché */
    ka: (t, out, s) => {
      sumik(t, out, { f: 2400, q: 2.5, vrchol: 0.6 * s, nabeh: 0.001, utlum: 0.045 });
      ton(t, out, { typ: "square", f: 1150, f2: 820, vrchol: 0.07 * s, nabeh: 0.001, utlum: 0.035 });
    },
    /* stuha švihne: krátké zasvištění a lupnutí o kůži */
    plesk: (t, out, s) => {
      sumik(t - 0.05 > ctx.currentTime ? t - 0.05 : t, out, { f: 1500, posun: 5200, q: 1.4, vrchol: 0.16 * s, nabeh: 0.04, utlum: 0.03 });
      sumik(t, out, { typ: "highpass", f: 3200, vrchol: 0.3 * s, nabeh: 0.001, utlum: 0.03 });
    },
    /* hrom: blízký začne prásknutím, vzdálený jen dlouze duní */
    hrom: (t0, out, s, z) => {
      const blizko = z.blizko ?? 0.5;
      const t = t0 + (1 - blizko) * 0.35;
      const n = ctx.createBufferSource();
      n.buffer = sumy.hnedy;
      n.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(260 + 900 * blizko, t);
      lp.frequency.exponentialRampToValueAtTime(110, t + 3.2);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      let tt = t + (blizko > 0.6 ? 0.03 : 0.3);
      g.gain.exponentialRampToValueAtTime(0.9 * s, tt);
      const vln = 4 + Math.floor(Math.random() * 4);
      for (let i = 0; i < vln; i++) {
        tt += 0.18 + Math.random() * 0.42;
        g.gain.exponentialRampToValueAtTime((0.22 + Math.random() * 0.75) * s, tt);
      }
      g.gain.exponentialRampToValueAtTime(0.0001, tt + 1.4);
      n.connect(lp).connect(g).connect(out);
      n.start(t, Math.random() * 3);
      n.stop(tt + 1.5);
      if (blizko > 0.6) {
        sumik(t, out, { typ: "highpass", f: 1500, vrchol: 0.7 * s, nabeh: 0.006, utlum: 0.3 });
      }
    },
    /* duha: jemný souzvuk, který vystoupá po pentatonice */
    duha: (t, out, s) => {
      [0, 2, 4, 5, 7, 9].forEach((i, k) => sklo(t + k * 0.16, out, PENTA[i], s * 0.6, 2.6));
      sumik(t, out, { typ: "highpass", f: 6400, q: 0.5, vrchol: 0.03 * s, nabeh: 0.5, utlum: 1.4 });
    },
    /* kapka do louže: krátký tón, který vyskočí nahoru */
    kap: (t, out, s, z) => {
      const f0 = 760 + (z.vys ?? Math.random()) * 700;
      ton(t, out, { f: f0, f2: f0 * 1.9, vrchol: 0.12 * s, nabeh: 0.002, utlum: 0.07, skluz: 0.5 });
      sumik(t, out, { typ: "highpass", f: 3600, vrchol: 0.03 * s, nabeh: 0.001, utlum: 0.02 });
    },
    /* rosnička: dvojí zakvákání, hrubý tón kmitá v hrdle */
    zaba: (t, out, s) =>
      [0, 0.24].forEach((za, i) => {
        const o = ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.setValueAtTime(190 + i * 26, t + za);
        o.frequency.exponentialRampToValueAtTime(240 + i * 26, t + za + 0.16);
        const am = ctx.createGain();
        am.gain.value = 0.5;
        const tr = ctx.createOscillator();
        const tg = ctx.createGain();
        tr.frequency.value = 31;
        tg.gain.value = 0.5;
        tr.connect(tg).connect(am.gain);
        const bq = ctx.createBiquadFilter();
        bq.type = "bandpass";
        bq.frequency.value = 1050;
        bq.Q.value = 2.2;
        const g = ctx.createGain();
        obalka(g, t + za, 0.11 * s, 0.17, 0.015);
        o.connect(am).connect(bq).connect(g).connect(out);
        o.start(t + za);
        tr.start(t + za);
        o.stop(t + za + 0.25);
        tr.stop(t + za + 0.25);
      }),
    /* šplouchnutí do louže: mokrý náraz, tupé plop a pár kapek na konec */
    cak: (t, out, s) => {
      sumik(t, out, { f: 2500, posun: 700, q: 0.9, vrchol: 0.34 * s, nabeh: 0.004, utlum: 0.2 });
      ton(t, out, { f: 180, f2: 90, vrchol: 0.2 * s, nabeh: 0.003, utlum: 0.1 });
      for (let i = 0; i < 3; i++) {
        const f0 = 900 + Math.random() * 700;
        ton(t + 0.14 + i * 0.07 + Math.random() * 0.03, out, { f: f0, f2: f0 * 1.8, vrchol: 0.07 * s, nabeh: 0.002, utlum: 0.06, skluz: 0.5 });
      }
    },
    /* geta na zemi: dřevěné klapnutí */
    klap: (t, out, s) => {
      sumik(t, out, { f: 950, q: 2.6, vrchol: 0.32 * s, nabeh: 0.001, utlum: 0.03 });
      ton(t, out, { typ: "triangle", f: 430, f2: 290, vrchol: 0.16 * s, nabeh: 0.001, utlum: 0.05 });
    },
    /* cinknutí: skleněný tón */
    cink: (t, out, s, z) => sklo(t, out, PENTA[Math.min(PENTA.length - 1, 3 + (z.vys || 0))], s, 1.3),
    /* papír lucerny zašustí */
    papir: (t, out, s) => [0, 0.035, 0.08].forEach((za, i) => sumik(t + za, out, { f: 2600 + i * 600, q: 0.8, vrchol: (0.1 - i * 0.02) * s, nabeh: 0.004, utlum: 0.05 })),
    /* malý výboj: pár suchých prasknutí těsně za sebou */
    vyboj: (t, out, s) => {
      for (let i = 0; i < 6; i++) sumik(t + i * 0.022 + Math.random() * 0.012, out, { typ: "highpass", f: 4200 + Math.random() * 2400, vrchol: (0.12 + Math.random() * 0.1) * s, nabeh: 0.001, utlum: 0.012 });
      ton(t, out, { typ: "sawtooth", f: 110, f2: 70, vrchol: 0.04 * s, utlum: 0.14 });
    },
    /* spokojené zachichotání */
    smich: (t, out, s) => [880, 1046.5, 1318.5, 1046.5].forEach((f0, i) => ton(t + i * 0.09, out, { typ: "triangle", f: f0 * 0.92, f2: f0, vrchol: 0.06 * s, nabeh: 0.006, utlum: 0.08, vibrato: 18, hloubka: 14 })),
    /* lekla se: krátké pípnutí */
    pisk: (t, out, s) => ton(t, out, { f: 760, f2: 1560, vrchol: 0.08 * s, nabeh: 0.004, utlum: 0.1 }),
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
    /** stálé zvuky podle scény: { dest, vitr } v rozsahu 0…1 */
    nastav: ({ dest = 0, vitr = 0 } = {}) => {
      if (!ctx || !stale) return;
      const zap = jeZapnuto();
      stale.dest.gain.setTargetAtTime(zap ? dest * 0.16 : 0, ctx.currentTime, 0.4);
      stale.vitr.gain.setTargetAtTime(zap ? vitr * 0.2 : 0, ctx.currentTime, 0.3);
    },
  };
})();

/** Která plocha smí znít: ta pod myší, jinak ta, na kterou se naposledy sáhlo. */
let znejici = null;

/* ═══ Scéna: jedna plocha s jednou podobou ═══ */
const scena = (el, V) => {
  el.textContent = "";
  const defs = document.createElementNS(NS, "svg");
  defs.setAttribute("class", "kh-defs");
  defs.setAttribute("width", "0");
  defs.setAttribute("height", "0");
  defs.setAttribute("aria-hidden", "true");
  defs.innerHTML = `<defs>${V.defs()}</defs>`;
  el.appendChild(defs);
  const vrstvy = V.vrstvy.map((v) => {
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${VB} ${VB}`);
    svg.setAttribute("class", "kh-vrstva");
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

  const vstup = { mys: null, rychlost: 0, kliky: [], drzi: false };
  let dyn = V.novaDynamika();
  let t = 0, posledniCas = null, viditelna = false, zastaveno = false, aktivniDo = 0, mysPred = null, kurzor = "";

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
    /* nad bubnem, do kterého jde udeřit, se kurzor změní v ruku */
    if (V.kurzor) {
      const k = V.kurzor(st);
      if (k !== kurzor) el.style.cursor = kurzor = k;
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
  const pust = () => {
    vstup.drzi = false;
  };
  el.addEventListener("pointerleave", () => {
    vstup.mys = null;
    mysPred = null;
    pust();
  });
  el.addEventListener("pointerdown", (e) => {
    Zvuk.odemkni();
    znejici = el;
    const p = naJednotky(e);
    vstup.mys = p;
    vstup.kliky.push(p);
    /* se stisknutým tlačítkem jde přes bubny vířit; dotyk raději nechá stránku posouvat */
    vstup.drzi = e.pointerType !== "touch";
    aktivniDo = t + 16;
  });
  el.addEventListener("pointerup", pust);
  el.addEventListener("pointercancel", pust);
  el.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    Zvuk.odemkni();
    znejici = el;
    vstup.kliky.push({ x: 90, y: 90, klavesa: true });
    aktivniDo = t + 16;
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
/* zvuk webu se rozezní prvním gestem kdekoli — Kapka se odemkne s ním */
for (const g of ["pointerup", "keydown", "touchend"]) document.addEventListener(g, () => document.querySelector("[data-kapka-hrom]") && Zvuk.odemkni(), true);
const spustVse = () => {
  for (const el of document.querySelectorAll("[data-kapka-hrom]")) {
    if (el.dataset.bezi) continue;
    const V = kresby[el.dataset.kapkaHrom];
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
