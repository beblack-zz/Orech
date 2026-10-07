/*
 * Běh Hlínky, kami země (HlinkaZeme.astro): z generátorů v ./kresby.js
 * skládá vrstvy, točí čas a simulaci, poslouchá myš a hraje. Stavba je
 * stejná jako u Pecinky s ohněm (scripts/pecinka-ohen/beh.js), navíc
 * umí vrstvy, které se hýbou jako celek (pohyb), a vrstvy, kterým se
 * mění jen atributy (uzly) — viz hlavička kresby.js.
 *
 * Každá vrstva je vlastní <svg> přes celou plochu. Statické se nakreslí
 * jednou a prohlížeč si je drží jako hotový obraz; živé se přepisují,
 * jen když se jim změní klíč.
 *
 * Zvuk poslouchá vypínač v hlavičce nového vzhledu (parta2/zvuk.ts): hraje,
 * jen když je zvuk webu zapnutý. Tři kresby stojí vedle sebe, a tak zní
 * jen ta, nad kterou je myš, nebo na kterou se naposledy klepnulo. Kapky
 * v džbánu jdou přes dozvuk, aby zněly jako z jeskyně.
 */
import { kresby, pretoc } from "./kresby.js";
import { jeZapnuto } from "../parta2/zvuk";

const NS = "http://www.w3.org/2000/svg";
const VB = 180;
const klidne = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
/* hirajóši, ladění koto: d, e, f, a, b */
const KOTO = [293.7, 329.6, 349.2, 440, 466.2, 587.3, 659.3, 698.5, 880, 932.3];

/* ═══ Zvuk: všechno se skládá ve Web Audio, žádné nahrávky ═══ */
const Zvuk = (() => {
  let ctx = null, hlavni = null, dozvuk = null, sumy = null, kanal = null;
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
  /** Dozvuk jeskyně: stereo šum, který exponenciálně doznívá. */
  const odezva = (sekundy, utlum) => {
    const n = Math.floor(ctx.sampleRate * sekundy);
    const b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let k = 0; k < 2; k++) {
      const d = b.getChannelData(k);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * utlum)) * (i < 200 ? i / 200 : 1);
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
    if (ctx.createConvolver) {
      const konv = ctx.createConvolver();
      konv.buffer = odezva(2.8, 0.62);
      dozvuk = ctx.createGain();
      dozvuk.gain.value = 0.55;
      dozvuk.connect(konv).connect(hlavni);
    }
    sumy = { bily: buffer(2, false), hnedy: buffer(5, true) };
    /* jeden průběžný šum, každá kresba si ho naladí po svém: vítr v sakuře, svist draka, potůček kakei */
    const n = ctx.createBufferSource();
    n.buffer = sumy.bily;
    n.loop = true;
    const filtr = ctx.createBiquadFilter();
    filtr.type = "bandpass";
    filtr.frequency.value = 1000;
    filtr.Q.value = 0.6;
    const zesileni = ctx.createGain();
    zesileni.gain.value = 0;
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    n.connect(filtr).connect(zesileni);
    if (pan) zesileni.connect(pan).connect(hlavni);
    else zesileni.connect(hlavni);
    n.start();
    kanal = { filtr, zesileni, pan };
    return true;
  };
  const vystup = (pan, mokry = 0) => {
    let cil = hlavni;
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan || 0));
      p.connect(hlavni);
      cil = p;
    }
    if (mokry > 0 && dozvuk) {
      const g = ctx.createGain();
      g.gain.value = mokry;
      g.connect(dozvuk);
      const rozdel = ctx.createGain();
      rozdel.connect(cil);
      rozdel.connect(g);
      return rozdel;
    }
    return cil;
  };
  const obalka = (g, t, vrchol, utlum, nabeh = 0.004) => {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vrchol), t + nabeh);
    g.gain.exponentialRampToValueAtTime(0.0001, t + nabeh + utlum);
  };
  /** Šum přes filtr s obálkou — vítr, šplouchnutí, kýchnutí, vrzání hlíny. */
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
  /** Hvizd s křivkou výšky: [čas od začátku, frekvence], obálka z nástupu a doznění. */
  const hvizd = (t, out, body, { vrchol = 0.08, nabeh = 0.03, utlum = 0.08, vibrato = 0 } = {}) => {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(body[0][1], t);
    for (const [dt, fr] of body.slice(1)) o.frequency.linearRampToValueAtTime(fr, t + dt);
    const konec = body[body.length - 1][0];
    if (vibrato) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 6.5;
      const hl = ctx.createGain();
      hl.gain.value = vibrato;
      lfo.connect(hl).connect(o.frequency);
      lfo.start(t);
      lfo.stop(t + konec + utlum + 0.05);
    }
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vrchol, t + nabeh);
    g.gain.setValueAtTime(vrchol, t + Math.max(nabeh, konec - utlum * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + konec + utlum);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + konec + utlum + 0.05);
  };
  /** Struna koto: trojúhelník s rychlým útlumem a cvaknutím trsátka. */
  const struna = (t, out, f, s = 1) => {
    ton(t, out, { typ: "triangle", f, vrchol: 0.11 * s, nabeh: 0.002, utlum: 0.9 });
    ton(t, out, { f: f * 2, vrchol: 0.05 * s, nabeh: 0.002, utlum: 0.4 });
    ton(t, out, { f: f * 3.01, vrchol: 0.025 * s, nabeh: 0.002, utlum: 0.2 });
    sumik(t, out, { typ: "highpass", f: 3000, vrchol: 0.05 * s, nabeh: 0.001, utlum: 0.01 });
  };
  const ZVUKY = {
    /* ——— sakura ——— */
    /* sedmihlásek: dlouhé hóó, pak rychlé ho-ke-kjó dolů */
    uguisu: (t, out, s) => {
      hvizd(t, out, [[0, 980], [0.55, 1120], [0.85, 1160]], { vrchol: 0.07 * s, nabeh: 0.12, utlum: 0.12, vibrato: 8 });
      hvizd(t + 1.05, out, [[0, 1500], [0.09, 1580]], { vrchol: 0.06 * s, nabeh: 0.01, utlum: 0.03 });
      hvizd(t + 1.2, out, [[0, 2600], [0.06, 2500]], { vrchol: 0.05 * s, nabeh: 0.005, utlum: 0.02 });
      hvizd(t + 1.3, out, [[0, 3100], [0.12, 2300], [0.26, 1900]], { vrchol: 0.07 * s, nabeh: 0.01, utlum: 0.08 });
    },
    nadech: (t, out, s) => sumik(t, out, { f: 900, posun: 2200, q: 1.2, vrchol: 0.16 * s, nabeh: 0.12, utlum: 0.2 }),
    kych: (t, out, s) => {
      sumik(t, out, { f: 3200, q: 0.8, vrchol: 0.45 * s, nabeh: 0.004, utlum: 0.18 });
      ton(t, out, { f: 900, f2: 420, vrchol: 0.14 * s, nabeh: 0.004, utlum: 0.16 });
    },
    poryv: (t, out, s) => sumik(t, out, { f: 500, posun: 1600, q: 0.6, vrchol: 0.4 * s, nabeh: 0.08, utlum: 1.1 }),
    /* chichotání: čtyři krátké stoupavé tóny */
    chichot: (t, out, s) => {
      for (let i = 0; i < 4; i++) ton(t + i * 0.11, out, { f: 760 + i * 60, f2: 1180 + i * 60, vrchol: 0.07 * s, nabeh: 0.008, utlum: 0.07 });
    },
    /* ——— drak ——— */
    zev: (t, out, s) => {
      hvizd(t, out, [[0, 420], [0.5, 620], [0.9, 360]], { vrchol: 0.05 * s, nabeh: 0.15, utlum: 0.2 });
      sumik(t, out, { f: 700, posun: 400, q: 1.5, vrchol: 0.08 * s, nabeh: 0.2, utlum: 0.7, buf: "hnedy" });
    },
    /* hlína se natahuje: mlasknutí a táhlé vrznutí */
    natah: (t, out, s) => {
      sumik(t, out, { typ: "lowpass", f: 300, posun: 900, q: 4, vrchol: 0.3 * s, nabeh: 0.02, utlum: 0.5, buf: "hnedy" });
      ton(t + 0.05, out, { f: 120, f2: 260, vrchol: 0.12 * s, nabeh: 0.05, utlum: 0.4 });
    },
    /* rychlý běh po strunách koto, nahoru při vzletu, dolů při návratu */
    koto: (t, out, s, z) => {
      const tony = z.nahoru ? KOTO : KOTO.slice().reverse();
      tony.forEach((fr, i) => struna(t + i * 0.055, out, fr, s * (0.6 + 0.4 * (i / tony.length))));
    },
    /* chycená perla: zvonek rin, s každou další o stupeň výš */
    rin: (t, out, s, z) => {
      const f0 = KOTO[Math.min(KOTO.length - 1, 4 + (z.stupen || 1))] * 4;
      [[1, 1, 2.2], [2.71, 0.4, 1.4], [5.18, 0.18, 0.6], [8.4, 0.08, 0.3]].forEach(([k, g, doba]) => ton(t, out, { f: f0 * k, vrchol: 0.07 * s * g, utlum: doba }));
    },
    plesk: (t, out, s) => {
      sumik(t, out, { typ: "lowpass", f: 600, posun: 180, q: 2, vrchol: 0.4 * s, nabeh: 0.004, utlum: 0.18, buf: "hnedy" });
      ton(t, out, { f: 180, f2: 70, vrchol: 0.25 * s, nabeh: 0.004, utlum: 0.2 });
    },
    /* ——— suikinkutsu ——— */
    /* kapka v džbánu: cvrnknutí, pak zvoneček ze tří nesouzvučných alikvót */
    suikin: (t, out, s, z) => {
      const f0 = z.f || 1568;
      ton(t, out, { f: f0 * 0.62, f2: f0 * 1.35, vrchol: 0.05 * s, nabeh: 0.001, utlum: 0.02 });
      [[1, 1, 1.9], [2.76, 0.32, 0.9], [5.4, 0.12, 0.35]].forEach(([k, g, doba]) => ton(t + 0.004, out, { f: f0 * k, vrchol: 0.085 * s * g, nabeh: 0.003, utlum: doba * (0.7 + 0.3 * s) }));
    },
    kon: (t, out, s) => {
      sumik(t, out, { f: 950, q: 6, vrchol: 0.5 * s, nabeh: 0.001, utlum: 0.06 });
      ton(t, out, { f: 540, f2: 500, vrchol: 0.22 * s, nabeh: 0.001, utlum: 0.16 });
      ton(t, out, { f: 150, vrchol: 0.15 * s, nabeh: 0.002, utlum: 0.1 });
    },
    splach: (t, out, s) => sumik(t, out, { f: 1400, q: 0.7, vrchol: 0.25 * s, nabeh: 0.03, utlum: 0.5 }),
    nabrat: (t, out, s) => {
      sumik(t + 0.5, out, { f: 1800, q: 1.4, vrchol: 0.12 * s, nabeh: 0.05, utlum: 0.3 });
      ton(t + 0.52, out, { f: 420, f2: 700, vrchol: 0.04 * s, nabeh: 0.01, utlum: 0.12 });
    },
    lit: (t, out, s) => {
      sumik(t + 0.2, out, { f: 1100, q: 0.8, vrchol: 0.22 * s, nabeh: 0.15, utlum: 0.75 });
      sumik(t + 0.3, out, { f: 2600, q: 1.2, vrchol: 0.08 * s, nabeh: 0.1, utlum: 0.6 });
    },
    /* cvrček suzumuši: vysoký tón s rychlým tremolem, tři zacvrkání */
    cvrcek: (t, out, s) => {
      for (let i = 0; i < 3; i++) {
        const o = ctx.createOscillator();
        o.frequency.value = 4150;
        const g = ctx.createGain();
        const am = ctx.createOscillator();
        am.frequency.value = 42;
        const hloubka = ctx.createGain();
        hloubka.gain.value = 0.5;
        const zaklad = ctx.createGain();
        const t0 = t + i * 0.42;
        obalka(zaklad, t0, 0.025 * s, 0.3, 0.03);
        am.connect(hloubka).connect(g.gain);
        g.gain.value = 0.5;
        o.connect(g).connect(zaklad).connect(out);
        o.start(t0);
        am.start(t0);
        o.stop(t0 + 0.4);
        am.stop(t0 + 0.4);
      }
    },
  };
  /* kapky a zvonky jdou i do dozvuku, ostatní nasucho */
  const MOKRE = { suikin: 0.9, kon: 0.35, rin: 0.5, cvrcek: 0.3 };
  return {
    /** odemknout v gestu (Safari jinak nedovolí) — hrát se pak bude, jen když je zvuk webu zapnutý */
    odemkni: () => {
      if (pripravit() && ctx.state === "suspended") ctx.resume();
    },
    hraj: (z) => {
      if (!ctx || !jeZapnuto() || !ZVUKY[z.druh]) return;
      if (ctx.state === "suspended") ctx.resume();
      ZVUKY[z.druh](ctx.currentTime + 0.005 + (z.za || 0), vystup(z.pan, MOKRE[z.druh] || 0), z.sila ?? 1, z);
    },
    /** průběžný šum: {mira, f, q, typ, pan}, nebo null, když nemá znít */
    nastavSum: (s) => {
      if (!ctx || !kanal) return;
      const t = ctx.currentTime;
      const mira = s && jeZapnuto() ? Math.max(0, Math.min(1.2, s.mira)) : 0;
      kanal.zesileni.gain.setTargetAtTime(mira * 0.12, t, 0.25);
      if (s) {
        if (kanal.filtr.type !== (s.typ || "bandpass")) kanal.filtr.type = s.typ || "bandpass";
        kanal.filtr.frequency.setTargetAtTime(s.f || 1000, t, 0.2);
        kanal.filtr.Q.setTargetAtTime(s.q || 0.7, t, 0.2);
        if (kanal.pan) kanal.pan.pan.setTargetAtTime(Math.max(-1, Math.min(1, s.pan || 0)), t, 0.15);
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
  defs.setAttribute("class", "hz-defs");
  defs.setAttribute("width", "0");
  defs.setAttribute("height", "0");
  defs.setAttribute("aria-hidden", "true");
  defs.innerHTML = `<defs>${V.defs()}</defs>`;
  el.appendChild(defs);
  const vrstvy = V.vrstvy.map((v) => {
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${VB} ${VB}`);
    svg.setAttribute("class", "hz-vrstva");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    if (v.styl) svg.style.cssText += `;${v.styl}`;
    /* těžké a pohyblivé vrstvy dostanou vlastní kompoziční vrstvu — prohlížeč je pak jen posouvá */
    if (v.tezka || v.pohyb || v.pruhlednost) svg.style.willChange = "transform";
    el.appendChild(svg);
    return { v, svg, klic: undefined, nakresleno: false, uzly: null, posledni: [] };
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
        L.uzly = null;
        L.posledni = [];
      } else if (v.uzly) {
        /* jen atributy prvků s data-u: natočení větví, papírků */
        if (!L.uzly) {
          L.uzly = [];
          for (const u of L.svg.querySelectorAll("[data-u]")) L.uzly[Number(u.getAttribute("data-u"))] = u;
        }
        const atr = v.uzly(st);
        for (let i = 0; i < atr.length; i++) {
          const uzel = L.uzly[i];
          if (!uzel || !atr[i]) continue;
          const pred = L.posledni[i] || (L.posledni[i] = {});
          for (const a in atr[i]) {
            if (pred[a] === atr[i][a]) continue;
            uzel.setAttribute(a, atr[i][a]);
            pred[a] = atr[i][a];
          }
        }
      }
      if (v.pohyb) {
        const p = v.pohyb(st);
        L.svg.style.transformOrigin = `${((p.ox / VB) * 100).toFixed(2)}% ${((p.oy / VB) * 100).toFixed(2)}%`;
        L.svg.style.transform = `translate(${(((p.x || 0) / VB) * 100).toFixed(2)}%, ${(((p.y || 0) / VB) * 100).toFixed(2)}%) rotate(${(p.r || 0).toFixed(2)}deg) scale(${(p.sx ?? 1).toFixed(4)}, ${(p.sy ?? 1).toFixed(4)})`;
      }
      if (v.pruhlednost) L.svg.style.opacity = v.pruhlednost(st);
    }
    const slysi = znejici === el;
    for (const z of dyn.zvuk) if (slysi) Zvuk.hraj(z);
    dyn.zvuk.length = 0;
    if (slysi) Zvuk.nastavSum(V.sum ? V.sum(st) : null);
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
  const ozvi = () => {
    if (znejici && znejici !== el) Zvuk.nastavSum(null);
    znejici = el;
  };
  el.addEventListener("pointerenter", ozvi);
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
    ozvi();
    aktivniDo = Math.max(aktivniDo, t + 1.5);
  });
  el.addEventListener("pointerleave", () => {
    vstup.mys = null;
    mysPred = null;
  });
  el.addEventListener("pointerdown", (e) => {
    Zvuk.odemkni();
    ozvi();
    vstup.kliky.push(naJednotky(e));
    aktivniDo = t + 12;
  });
  el.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    Zvuk.odemkni();
    ozvi();
    vstup.kliky.push({ x: 90, y: 90 });
    aktivniDo = t + 12;
  });

  const io = new IntersectionObserver(
    (z) => {
      const byla = viditelna;
      viditelna = z[0].isIntersecting;
      if (!viditelna && znejici === el) Zvuk.nastavSum(null);
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
      Zvuk.nastavSum(null);
      znejici = null;
    }
  };
};

/* ═══ Spuštění: při každém načtení stránky, i po přechodu bez načtení ═══ */
const bezici = [];
/* zvuk webu se rozezní prvním gestem kdekoli — Hlínka se odemkne s ním */
for (const g of ["pointerup", "keydown", "touchend"]) document.addEventListener(g, () => document.querySelector("[data-hlinka-zeme]") && Zvuk.odemkni(), true);
const spustVse = () => {
  for (const el of document.querySelectorAll("[data-hlinka-zeme]")) {
    if (el.dataset.bezi) continue;
    const V = kresby[el.dataset.hlinkaZeme];
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
