/*
 * Běh Vázičky jako gejši (VazickaGejsa.astro): z generátorů v ./kresby.js
 * skládá vrstvy, točí čas a simulaci, poslouchá myš a hraje.
 * Stavba je stejná jako u Střípka (scripts/stripek-zlato/beh.js).
 *
 * Každá vrstva je vlastní <svg> přes celou plochu. Statické se nakreslí
 * jednou a prohlížeč si je drží jako hotový obraz; živé se přepisují,
 * jen když se jim změní klíč. Vrstvy s `pohyb` (tělo, tvář, ozdoby) se
 * nepřekreslují, když se jen hýbou — dostanou CSS transformaci.
 *
 * Zvuk poslouchá vypínač v hlavičce nového vzhledu (parta2/zvuk.ts): hraje,
 * jen když je zvuk webu zapnutý. Kresby stojí vedle sebe, a tak zní jen
 * ta, nad kterou je myš, nebo na kterou se naposledy klepnulo.
 */
import { kresby, pretoc, obsahVrstvy } from "./kresby.js";
import { smi } from "../parta2/zvuk";

const NS = "http://www.w3.org/2000/svg";
const VB = 180;
const klidne = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
/* šamisen ladí do stupnice mijako-buši (in): d, es, g, a, b přes dvě oktávy */
const STUPNICE = [293.66, 311.13, 392, 440, 466.16, 587.33, 622.25, 783.99, 880, 932.33];

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
    /* Hnědý šum je posčítaný, takže konec neleží tam, kde začátek — smyčka by
       každé kolo cvakla (hukot deště „sekal“). Srovnat konec se začátkem. */
    if (hneda) {
      const skok = d[d.length - 1] - d[0];
      for (let i = 0; i < d.length; i++) d[i] -= (skok * i) / (d.length - 1);
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
    /* stálé zvuky: vítr v noci a déšť (šum kapek a hlubší hukot pod ním) */
    stale = { vitr: smycka(sumy.hnedy, "bandpass", 420, 0.7), dest: smycka(sumy.bily, "bandpass", 5200, 0.4), lijak: smycka(sumy.hnedy, "lowpass", 900, 0.5) };
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
  /** Šum přes filtr s obálkou — z toho je látka, papír, vítr i kapky. */
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
  /** Kapka: krátký tón, který vyskočí nahoru. */
  const kapka = (t, out, s, f0 = 800 + Math.random() * 700) => {
    ton(t, out, { f: f0, f2: f0 * 1.9, vrchol: 0.07 * s, nabeh: 0.002, utlum: 0.045 });
    sumik(t, out, { typ: "highpass", f: 4200, vrchol: 0.02 * s, nabeh: 0.001, utlum: 0.02 });
  };
  const ZVUKY = {
    /* krok v okobo: duté dřevo, levá a pravá zní o kousek jinak */
    klap: (t, out, s, z) => {
      const f0 = z.vys ? 430 : 352;
      sumik(t, out, { f: z.vys ? 1280 : 1010, q: 6, vrchol: 0.3 * s, nabeh: 0.001, utlum: 0.03 });
      ton(t, out, { typ: "triangle", f: f0, f2: f0 * 0.8, vrchol: 0.17 * s, nabeh: 0.001, utlum: 0.07 });
      ton(t, out, { f: f0 * 2.4, vrchol: 0.04 * s, nabeh: 0.001, utlum: 0.03 });
    },
    /* plíšek kanzashi: drobné vysoké cinknutí */
    cink: (t, out, s, z) => {
      const f0 = 3600 + (z.vys || 0) * 410;
      ton(t, out, { f: f0, vrchol: 0.03 * s, nabeh: 0.001, utlum: 0.26 });
      ton(t, out, { f: f0 * 2.76, vrchol: 0.012 * s, nabeh: 0.001, utlum: 0.12 });
    },
    /* rukáv prolétne vzduchem */
    latka: (t, out, s) => sumik(t, out, { f: 800, posun: 2800, q: 0.7, vrchol: 0.13 * s, nabeh: 0.09, utlum: 0.3 }),
    /* poryv větru */
    fuk: (t, out, s) => sumik(t, out, { f: 420, posun: 950, q: 0.8, vrchol: 0.4 * s, nabeh: 0.24, utlum: 0.9, buf: "hnedy" }),
    /* svíčka zaplane */
    plamen: (t, out, s) => {
      sumik(t, out, { f: 420, posun: 1300, q: 0.7, vrchol: 0.14 * s, nabeh: 0.05, utlum: 0.5 });
      ton(t, out, { f: 196, f2: 294, vrchol: 0.05 * s, nabeh: 0.06, utlum: 0.6 });
    },
    /* ťuknutí na napnutý papír */
    papir: (t, out, s) => {
      sumik(t, out, { f: 1800, q: 2, vrchol: 0.2 * s, nabeh: 0.001, utlum: 0.03 });
      ton(t, out, { f: 520, f2: 380, vrchol: 0.09 * s, nabeh: 0.001, utlum: 0.08 });
    },
    /* zachichotání za vějířem */
    smich: (t, out, s) => [932, 1109, 1397, 1109, 1245].forEach((f0, i) => ton(t + i * 0.085, out, { typ: "triangle", f: f0 * 0.93, f2: f0, vrchol: 0.05 * s, nabeh: 0.006, utlum: 0.075, vibrato: 18, hloubka: 14 })),
    /* lekla se: krátké ach */
    ach: (t, out, s) => ton(t, out, { f: 720, f2: 1180, vrchol: 0.07 * s, nabeh: 0.004, utlum: 0.12 }),
    /* šamisen: úder plektrem do kůže, struna a její bzučivý dozvuk (sawari); `delka` < 1 ho zkrátí — průvodce jím mluví po slabikách */
    struna: (t, out, s, z) => {
      const f0 = STUPNICE[Math.max(0, Math.min(STUPNICE.length - 1, z.vys || 0))];
      const d = z.delka ?? 1;
      sumik(t, out, { f: 1500, q: 1.4, vrchol: 0.16 * s, nabeh: 0.001, utlum: 0.025 });
      ton(t, out, { typ: "triangle", f: f0 * 1.012, f2: f0, vrchol: 0.15 * s, nabeh: 0.002, utlum: 0.85 * d });
      ton(t, out, { typ: "sawtooth", f: f0, vrchol: 0.045 * s, nabeh: 0.002, utlum: 0.2 * d });
      ton(t + 0.012, out, { typ: "square", f: f0 * 2.003, vrchol: 0.012 * s, nabeh: 0.01, utlum: 0.5 * d, vibrato: 31, hloubka: 5 });
    },
    /* zvonek rin: dva tóny těsně vedle sebe, které se vlní */
    zvon: (t, out, s) => {
      for (const [f, g, d] of [[392, 1, 4.4], [393.4, 0.8, 4.4], [1062, 0.3, 2.4], [2020, 0.1, 1.3]]) ton(t, out, { f, vrchol: 0.07 * s * g, nabeh: 0.012, utlum: d });
      sumik(t, out, { f: 1900, q: 4, vrchol: 0.05 * s, nabeh: 0.001, utlum: 0.03 });
    },
    /* vějíř se rozevře: lupnutí dýh a zašustění papíru */
    vejir: (t, out, s) => {
      for (const za of [0, 0.014, 0.03]) sumik(t + za, out, { typ: "highpass", f: 2400, vrchol: 0.26 * s, nabeh: 0.001, utlum: 0.016 });
      sumik(t + 0.02, out, { f: 3200, q: 0.8, vrchol: 0.08 * s, nabeh: 0.01, utlum: 0.1 });
      ton(t, out, { typ: "triangle", f: 880, f2: 620, vrchol: 0.05 * s, nabeh: 0.001, utlum: 0.04 });
    },
    /* kapka */
    kap: (t, out, s, z) => kapka(t, out, s, z.vys != null ? 760 + z.vys * 150 : undefined),
    /* deštník se roztočí: papír sviští a kapky z něj odlétají */
    frk: (t, out, s) => {
      sumik(t, out, { f: 520, posun: 1700, q: 1.1, vrchol: 0.2 * s, nabeh: 0.12, utlum: 0.7 });
      for (let i = 0; i < 9; i++) kapka(t + 0.08 + i * 0.05 + Math.random() * 0.04, out, s * (0.9 - i * 0.07));
    },
    /* deštník se sklapne nebo rozevře: napnutý papír plácne */
    sklap: (t, out, s) => {
      ton(t, out, { f: 150, f2: 72, vrchol: 0.2 * s, nabeh: 0.002, utlum: 0.13 });
      sumik(t, out, { f: 900, q: 1, vrchol: 0.2 * s, nabeh: 0.002, utlum: 0.12 });
      sumik(t + 0.03, out, { typ: "highpass", f: 2600, vrchol: 0.07 * s, nabeh: 0.002, utlum: 0.06 });
    },
    /* rosnička po dešti: dvakrát kvákne */
    zaba: (t, out, s) => [0, 0.17].forEach((za, i) => ton(t + za, out, { typ: "triangle", f: 540 - i * 30, f2: 430, vrchol: 0.055 * s, nabeh: 0.012, utlum: 0.1, vibrato: 62, hloubka: 170 })),
    /* žhavý konec tyčinky zasyčí */
    syk: (t, out, s) => sumik(t, out, { typ: "highpass", f: 6200, q: 0.5, vrchol: 0.03 * s, nabeh: 0.08, utlum: 0.5 }),
    /* kouř se stáhne do tvaru: dech a nad ním skleněný tón */
    dech: (t, out, s, z) => {
      sumik(t, out, { f: 1300, posun: 480, q: 0.8, vrchol: 0.09 * s, nabeh: 0.3, utlum: 0.9 });
      sklo(t + 0.25, out, STUPNICE[5 + ((z.vys || 0) % 5)] * 2, s * 0.6, 2.2);
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
      if (!ctx || !smi(z.skupina || "hra") || !ZVUKY[z.druh]) return;
      if (ctx.state === "suspended") ctx.resume();
      ZVUKY[z.druh](ctx.currentTime + 0.005 + (z.za || 0), vystup(z.pan), z.sila ?? 1, z);
    },
    /** stálé zvuky podle scény: { vitr, dest } v rozsahu 0…1 */
    nastav: ({ vitr = 0, dest = 0 } = {}) => {
      if (!ctx || !stale) return;
      const zap = smi("hra");
      stale.vitr.gain.setTargetAtTime(zap ? vitr * 0.2 : 0, ctx.currentTime, 0.3);
      stale.dest.gain.setTargetAtTime(zap ? dest * 0.05 : 0, ctx.currentTime, 0.4);
      stale.lijak.gain.setTargetAtTime(zap ? dest * 0.1 : 0, ctx.currentTime, 0.4);
    },
  };
})();

/** Která plocha smí znít: ta pod myší, jinak ta, na kterou se naposledy sáhlo. */
let znejici = null;
/**
 * Plocha, nad kterou je skutečná myš. Tušový flek hraje vystoupení
 * podstrčenými událostmi myši (scripts/flek/flek.ts) — kdyby si je s pravou
 * myší nad jinou Vázičkou předávaly každý snímek, déšť by skákal mezi plnou
 * a nulovou hlasitostí. Pravá myš má přednost, flek zní, když nikde není.
 */
let podMysi = null;
const zaznej = (el, e) => {
  if (e.isTrusted) podMysi = el;
  else if (podMysi && podMysi !== el) return;
  znejici = el;
};

/* ═══ Scéna: jedna plocha s jednou podobou ═══ */
const scena = (el, V) => {
  el.textContent = "";
  const defs = document.createElementNS(NS, "svg");
  defs.setAttribute("class", "vg-defs");
  defs.setAttribute("width", "0");
  defs.setAttribute("height", "0");
  defs.setAttribute("aria-hidden", "true");
  defs.innerHTML = `<defs>${V.defs()}</defs>`;
  el.appendChild(defs);
  const vrstvy = V.vrstvy.map((v) => {
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${VB} ${VB}`);
    svg.setAttribute("class", "vg-vrstva");
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

  /* divadlo na /parta-3 umí scénu podržet na prvním snímku, než se rozhrne opona (el.__scena.stuj) */
  let stoji = false;
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
    if (!stoji && (!klidne || t < aktivniDo)) {
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
  el.addEventListener("pointerenter", (e) => zaznej(el, e));
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
    zaznej(el, e);
    aktivniDo = Math.max(aktivniDo, t + 1.5);
  });
  el.addEventListener("pointerleave", (e) => {
    if (e.isTrusted && podMysi === el) podMysi = null;
    vstup.mys = null;
    mysPred = null;
  });
  el.addEventListener("pointerdown", (e) => {
    Zvuk.odemkni();
    zaznej(el, e);
    vstup.kliky.push(naJednotky(e));
    aktivniDo = t + 12;
  });
  el.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    Zvuk.odemkni();
    zaznej(el, e);
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

  /* Divadlo na /parta-3 (scripts/parta3/reziser.ts): vystoupení začíná od čisté scény a režisér si čte její stav */
  el.__scena = {
    V,
    stav: () => ({ t, dyn, vstup }),
    stuj: (ano) => {
      stoji = !!ano;
    },
    znovu: (bdi = 0) => {
      t = V.zacatek || 0;
      dyn = t > 0 ? pretoc(V, t) : V.novaDynamika();
      vstup.mys = null;
      vstup.rychlost = 0;
      vstup.kliky.length = 0;
      mysPred = null;
      aktivniDo = t + bdi;
      vykresli();
      return t;
    },
  };

  return () => {
    zastaveno = true;
    viditelna = false;
    io.disconnect();
    if (podMysi === el) podMysi = null;
    if (znejici === el) {
      Zvuk.nastav({});
      znejici = null;
    }
  };
};

/* ═══ Spuštění: při každém načtení stránky, i po přechodu bez načtení ═══ */
const bezici = [];
/* zvuk webu se rozezní prvním gestem kdekoli — Vázička se odemkne s ním */
for (const g of ["pointerup", "keydown", "touchend"]) document.addEventListener(g, () => document.querySelector("[data-vazicka-gejsa]") && Zvuk.odemkni(), true);
/* tušový flek (scripts/flek/flek.ts) staví scénu až po kliknutí — spouští ji a odemyká jí zvuk sám */
export const odemkni = () => Zvuk.odemkni();
/**
 * Zahraje zvuk mimo plochu kresby — průvodce (parta2/pruvodce-hlas.ts) mluví
 * šamisenem, i když nad ním myš není. Hraje, jen když je zvuk webu zapnutý
 * a už se odemkl gestem; jinak nic.
 */
export const zahraj = (z) => Zvuk.hraj(z);
export const spustVse = () => {
  for (const el of document.querySelectorAll("[data-vazicka-gejsa]")) {
    if (el.dataset.bezi) continue;
    const V = kresby[el.dataset.vazickaGejsa];
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
