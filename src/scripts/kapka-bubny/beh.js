/*
 * Běh Kapky s bubny hromu (KapkaBubny.astro): z generátorů v ./kresby.js
 * skládá vrstvy, točí čas, poslouchá myš a hraje.
 *
 * Každá vrstva je vlastní <svg> přes celou plochu. Statické se nakreslí
 * jednou a prohlížeč si je drží jako hotový obraz; živé se přepisují.
 * Mraky ve druhé kresbě se neposouvají překreslením, ale CSS transformací
 * celé vrstvy, takže těžký filtr se spočítá jen jednou.
 *
 * Zvuk poslouchá vypínač v hlavičce nového vzhledu (parta2/zvuk.ts): hraje,
 * jen když je zvuk webu zapnutý. Vlastní AudioContext se odemkne prvním
 * gestem na stránce. Stránky jedou přes <ClientRouter />, proto se plochy
 * hledají při každém astro:page-load a před výměnou stránky se smyčky zastaví.
 */
import { kresby } from "./kresby.js";
import { jeZapnuto } from "../parta2/zvuk";

const NS = "http://www.w3.org/2000/svg";
const VB = 180;
const klidne = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ═══ Zvuk: všechno se skládá ve Web Audio, žádné nahrávky ═══ */
const Zvuk = (() => {
  let ctx = null, hlavni = null, sumy = null, destGain = null;
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
    /* déšť: šum ve dvou pásmech, hlasitost podle hustoty */
    const n = ctx.createBufferSource();
    n.buffer = sumy.bily;
    n.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2600;
    bp.Q.value = 0.45;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 7000;
    destGain = ctx.createGain();
    destGain.gain.value = 0;
    n.connect(bp).connect(lp).connect(destGain).connect(hlavni);
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
  /** Taiko: tělo je sinus, který spadne z výšky (kůže se po úderu povolí), k tomu plesk kůže */
  const don = (sila = 1, pan = 0, ladeni = 1) => {
    const t = ctx.currentTime + 0.005;
    const out = vystup(pan);
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(128 * ladeni, t);
    o.frequency.exponentialRampToValueAtTime(56 * ladeni, t + 0.14);
    const g = ctx.createGain();
    obalka(g, t, 0.95 * sila, 0.95);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 1.1);
    const o2 = ctx.createOscillator();
    o2.type = "triangle";
    o2.frequency.setValueAtTime(210 * ladeni, t);
    o2.frequency.exponentialRampToValueAtTime(118 * ladeni, t + 0.07);
    const g2 = ctx.createGain();
    obalka(g2, t, 0.28 * sila, 0.22);
    o2.connect(g2).connect(out);
    o2.start(t);
    o2.stop(t + 0.3);
    const n = ctx.createBufferSource();
    n.buffer = sumy.bily;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 780 * ladeni;
    bp.Q.value = 0.9;
    const gn = ctx.createGain();
    obalka(gn, t, 0.42 * sila, 0.07, 0.002);
    n.connect(bp).connect(gn).connect(out);
    n.start(t, Math.random());
    n.stop(t + 0.12);
  };
  /** Ka: úder do okraje — dřevo, krátké a suché */
  const ka = (sila = 1, pan = 0) => {
    const t = ctx.currentTime + 0.005;
    const out = vystup(pan);
    const n = ctx.createBufferSource();
    n.buffer = sumy.bily;
    const hp = ctx.createBiquadFilter();
    hp.type = "bandpass";
    hp.frequency.value = 2400;
    hp.Q.value = 2.5;
    const gn = ctx.createGain();
    obalka(gn, t, 0.6 * sila, 0.045, 0.001);
    n.connect(hp).connect(gn).connect(out);
    n.start(t, Math.random());
    n.stop(t + 0.08);
    const o = ctx.createOscillator();
    o.type = "square";
    o.frequency.setValueAtTime(1150, t);
    o.frequency.exponentialRampToValueAtTime(820, t + 0.03);
    const g = ctx.createGain();
    obalka(g, t, 0.07 * sila, 0.035, 0.001);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.06);
  };
  /** Hrom: blízký začne prásknutím, vzdálený jen dlouze duní */
  const hrom = (sila = 1, blizko = 1, pan = 0) => {
    const t = ctx.currentTime + 0.005 + (1 - blizko) * 0.35;
    const out = vystup(pan * 0.6);
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
    g.gain.exponentialRampToValueAtTime(0.9 * sila, tt);
    const vln = 4 + Math.floor(Math.random() * 4);
    for (let i = 0; i < vln; i++) {
      tt += 0.18 + Math.random() * 0.42;
      g.gain.exponentialRampToValueAtTime((0.22 + Math.random() * 0.75) * sila, tt);
    }
    g.gain.exponentialRampToValueAtTime(0.0001, tt + 1.4);
    n.connect(lp).connect(g).connect(out);
    n.start(t, Math.random() * 3);
    n.stop(tt + 1.5);
    if (blizko > 0.6) {
      const c = ctx.createBufferSource();
      c.buffer = sumy.bily;
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 1500;
      const gc = ctx.createGain();
      gc.gain.setValueAtTime(0.0001, t);
      gc.gain.exponentialRampToValueAtTime(0.75 * sila, t + 0.006);
      gc.gain.exponentialRampToValueAtTime(0.18 * sila, t + 0.06);
      gc.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
      c.connect(hp).connect(gc).connect(out);
      c.start(t, Math.random());
      c.stop(t + 0.35);
    }
  };
  const nastavDest = (hustota) => {
    if (!ctx || !destGain) return;
    destGain.gain.setTargetAtTime(jeZapnuto() ? hustota * 0.16 : 0, ctx.currentTime, 0.4);
  };
  return {
    /** odemknout v gestu (Safari jinak nedovolí) — hrát se pak bude, jen když je zvuk webu zapnutý */
    odemkni: () => {
      if (pripravit() && ctx.state === "suspended") ctx.resume();
    },
    hraj: (z) => {
      if (!ctx || !jeZapnuto()) return;
      if (ctx.state === "suspended") ctx.resume();
      if (z.druh === "don") don(z.sila, z.pan, z.ladeni);
      else if (z.druh === "ka") ka(z.sila, z.pan);
      else if (z.druh === "hrom") hrom(z.sila, z.blizko, z.pan);
    },
    nastavDest,
  };
})();

/* ═══ Scéna: jedna plocha s jednou podobou ═══ */
const scena = (el, V) => {
  el.textContent = "";
  const defs = document.createElementNS(NS, "svg");
  defs.setAttribute("class", "kb-defs");
  defs.setAttribute("width", "0");
  defs.setAttribute("height", "0");
  defs.setAttribute("aria-hidden", "true");
  defs.innerHTML = `<defs>${V.defs()}</defs>`;
  el.appendChild(defs);
  const vrstvy = V.vrstvy.map((v) => {
    let obal = el;
    if (v.orez) {
      obal = document.createElement("div");
      obal.className = "kb-orez";
      obal.style.clipPath = `url(#${v.orez.css})`;
      obal.style.webkitClipPath = `url(#${v.orez.css})`;
      el.appendChild(obal);
    }
    const svg = document.createElementNS(NS, "svg");
    const w = v.sirka || 1;
    svg.setAttribute("viewBox", `0 0 ${VB * w} ${VB}`);
    svg.setAttribute("class", "kb-vrstva");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    if (w !== 1) svg.style.width = `${w * 100}%`;
    if (v.styl) svg.style.cssText += `;${v.styl}`;
    /* těžké filtry a plovoucí vrstvy dostanou vlastní kompoziční vrstvu — prohlížeč je pak nepočítá znovu, když se hýbe něco jiného */
    if (v.tezka || v.posun || v.pruhlednost) svg.style.willChange = "transform";
    obal.appendChild(svg);
    return { v, svg, klic: undefined, nakresleno: false, uzly: null };
  });

  const vstup = { mys: null, udery: [], posledni: null, drzi: false, tah: null };
  const dyn = V.novaDynamika ? V.novaDynamika() : null;
  let t = 0, tPred = 0, posledniCas = null, viditelna = false, pxNaJednotku = el.clientWidth / VB, aktivniDo = 0;
  let zastaveno = false, tahZ = null, posledniStav = null;

  const vykresli = () => {
    const st = V.stav(t, dyn ? { ...vstup, dyn } : vstup);
    for (const L of vrstvy) {
      const v = L.v;
      if (!L.nakresleno || (v.klic && v.klic(st) !== L.klic)) {
        if (v.prebarvi && L.nakresleno) {
          /* jen přebarvit — tvar zůstává, mění se barvy a průhlednosti */
          if (!L.uzly) L.uzly = L.svg.querySelectorAll("[data-b]");
          const atr = v.prebarvi(st);
          for (let i = 0; i < atr.length && i < L.uzly.length; i++) for (const a in atr[i]) L.uzly[i].setAttribute(a, atr[i][a]);
        } else {
          L.svg.innerHTML = v.kresli(st);
          L.uzly = null;
        }
        L.klic = v.klic ? v.klic(st) : 0;
        L.nakresleno = true;
      }
      let tr = "";
      if (v.posun) {
        const q = v.posun(st);
        tr += `translate3d(${(q.x * pxNaJednotku).toFixed(2)}px, ${(q.y * pxNaJednotku).toFixed(2)}px, 0) `;
      }
      if (v.pohyb) {
        const p = v.pohyb(st);
        L.svg.style.transformOrigin = `${((p.ox / VB) * 100).toFixed(2)}% ${((p.oy / VB) * 100).toFixed(2)}%`;
        tr += `scale(${p.sx.toFixed(4)}, ${p.sy.toFixed(4)})`;
      }
      if (tr) L.svg.style.transform = tr;
      if (v.pruhlednost) L.svg.style.opacity = v.pruhlednost(st);
    }
    if (V.zvuky) for (const z of V.zvuky(st, tPred, t)) Zvuk.hraj(z);
    if (V.dest && viditelna) Zvuk.nastavDest(V.dest(st));
    return st;
  };
  const smycka = (ted) => {
    if (!viditelna || zastaveno) {
      posledniCas = null;
      return;
    }
    const dt = posledniCas == null ? 0 : Math.min(0.05, (ted - posledniCas) / 1000);
    posledniCas = ted;
    /* ruka drží kruh, ale nehýbe s ním — kruh stojí */
    if (tahZ && performance.now() - tahZ.cas > 70) vstup.tah = tahZ.ujeto > 3 ? { v: 0 } : null;
    if (!klidne || t < aktivniDo) {
      tPred = t;
      t += dt;
      if (dyn) V.krok(dyn, t, dt, vstup);
      posledniStav = vykresli();
    }
    requestAnimationFrame(smycka);
  };

  /* ——— Myš a dotyk ——— */
  const naJednotky = (e) => {
    const r = el.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * VB, y: ((e.clientY - r.top) / r.height) * VB };
  };
  const bubnyTed = () => (V.bubnyNaObrazovce && posledniStav ? V.bubnyNaObrazovce(posledniStav) : V.bubny || []);
  const nejblizsi = (p, jenZasah) => {
    let nej = null, dNej = Infinity;
    for (const b of bubnyTed()) {
      const d = Math.hypot(p.x - b.x, p.y - b.y) - (b.z || 0) * 0.05;
      if (jenZasah && d > b.r * 1.35) continue;
      if (d < dNej) {
        dNej = d;
        nej = b;
      }
    }
    return nej;
  };
  const udrit = (b, sila = 1) => {
    if (!b) return;
    const predstih = V.id === "v1" ? 0.1 : V.id === "v3" ? 0.06 : 0.02;
    vstup.udery.push({ cas: t + predstih, buben: b.i, ruka: b.ruka, sila });
    vstup.posledni = t;
    aktivniDo = t + 4;
    vstup.udery = vstup.udery.filter((u) => t - u.cas < 4);
  };
  el.addEventListener("pointermove", (e) => {
    const p = naJednotky(e);
    vstup.mys = p;
    aktivniDo = Math.max(aktivniDo, t + 1);
    if (tahZ) {
      const ted = performance.now();
      const dtt = Math.max(1, ted - tahZ.cas) / 1000;
      const v = (p.x - tahZ.x) / dtt;
      tahZ.vyhl = tahZ.vyhl == null ? v : tahZ.vyhl * 0.6 + v * 0.4;
      tahZ.ujeto += Math.abs(p.x - tahZ.x);
      tahZ.x = p.x;
      tahZ.cas = ted;
      if (tahZ.ujeto > 3) vstup.tah = { v: tahZ.vyhl };
      aktivniDo = t + 6;
    }
    if (V.id === "v3") el.style.cursor = tahZ ? "grabbing" : "grab";
    else el.style.cursor = nejblizsi(p, true) ? "pointer" : "default";
  });
  el.addEventListener("pointerleave", () => {
    vstup.mys = null;
  });
  el.addEventListener("pointerdown", (e) => {
    Zvuk.odemkni();
    const p = naJednotky(e);
    if (V.id === "v3") {
      tahZ = { x: p.x, cas: performance.now(), ujeto: 0, vyhl: null, start: p };
      try {
        el.setPointerCapture(e.pointerId);
      } catch (_) {}
      return;
    }
    if (V.id === "v2") vstup.drzi = true;
    udrit(nejblizsi(p, V.id === "v1") || nejblizsi(p, false));
  });
  const pust = () => {
    vstup.drzi = false;
    if (tahZ) {
      /* krátký dotek bez tahu je úder — do bubnu pod prstem, jinak do předního */
      if (tahZ.ujeto <= 3) udrit(nejblizsi(tahZ.start, true) || bubnyTed().reduce((a, b) => ((b.z || 0) > (a.z || 0) ? b : a), bubnyTed()[0]), 1.1);
      tahZ = null;
      vstup.tah = null;
      if (V.id === "v3") el.style.cursor = "grab";
    }
  };
  el.addEventListener("pointerup", pust);
  el.addEventListener("pointercancel", pust);
  el.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    Zvuk.odemkni();
    const b = bubnyTed();
    udrit(b[Math.floor(Math.random() * b.length)]);
  });

  const ro = new ResizeObserver(() => {
    pxNaJednotku = el.clientWidth / VB;
  });
  ro.observe(el);
  const io = new IntersectionObserver(
    (z) => {
      const byla = viditelna;
      viditelna = z[0].isIntersecting;
      if (!viditelna && V.dest) Zvuk.nastavDest(0);
      if (viditelna && !byla) requestAnimationFrame(smycka);
    },
    { threshold: 0.08 },
  );
  io.observe(el);
  /* první snímek hned, ať plocha není prázdná, ani když je mimo obrazovku */
  if (klidne) t = V.id === "v2" ? 2.13 : V.id === "v1" ? 2.6 : 3.62;
  if (dyn && t > 0) for (let q = 0; q < t; q += 1 / 60) V.krok(dyn, q, 1 / 60, {});
  posledniStav = vykresli();

  return () => {
    zastaveno = true;
    viditelna = false;
    io.disconnect();
    ro.disconnect();
    if (V.dest) Zvuk.nastavDest(0);
  };
};

/* ═══ Spuštění: při každém načtení stránky, i po přechodu bez načtení ═══ */
const bezici = [];
/* zvuk webu se rozezní prvním gestem kdekoli — bubny se odemknou s ním */
for (const g of ["pointerup", "keydown", "touchend"]) document.addEventListener(g, () => document.querySelector("[data-kapka-bubny]") && Zvuk.odemkni(), true);
const spustVse = () => {
  for (const el of document.querySelectorAll("[data-kapka-bubny]")) {
    if (el.dataset.bezi) continue;
    const V = kresby[el.dataset.kapkaBubny];
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
