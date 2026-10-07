/**
 * Zvuky /parta-2. Žádné nahrávky — všechno se skládá ve Web Audio:
 * vítr z filtrovaného šumu, zvonek fūrin ze čtyř nesouzvučných
 * alikvót (tak zní skleněný zvonek), cvrčci jako krátké pulzy vysokého
 * tónu, hukot pece z hlubokého šumu. Zvonkohru v hlavičce rozeznívá
 * fyzika (zvonkohra.ts) a podle jejího větru fouká i šum.
 *
 * Zvuk je ve výchozím stavu zapnutý, ale prohlížeč ho pustí až po prvním
 * kliknutí nebo klávese na stránce — to hlídá hlavicka.ts. Kliknutí na
 * zvonkohru v hlavičce ho ztlumí.
 */
import type { PostavaId } from "../../data/parta";
import { priOdchodu } from "./prechody";

let ctx: AudioContext | null = null;
let hlavni: GainNode;
let vitr: GainNode;
let vitrNarazy: GainNode;
let vitrFiltr: BiquadFilterNode;
let pec: GainNode;
let zapnuto = false;
let noc = 0;
let cvrckyCas: number | undefined;

const PENTA = [1318.5, 1568, 1760, 1975.5, 2349.3, 2637];

function sum(sekundy: number, hneda: boolean) {
  const c = ctx!;
  const b = c.createBuffer(1, Math.floor(c.sampleRate * sekundy), c.sampleRate);
  const d = b.getChannelData(0);
  let posledni = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    if (hneda) {
      posledni = (posledni + 0.02 * w) / 1.02;
      d[i] = posledni * 3.5;
    } else d[i] = w;
  }
  return b;
}

function pripravit() {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  ctx = new AC();
  hlavni = ctx.createGain();
  hlavni.gain.value = 0;
  hlavni.connect(ctx.destination);

  const v = ctx.createBufferSource();
  v.buffer = sum(4, true);
  v.loop = true;
  vitrFiltr = ctx.createBiquadFilter();
  vitrFiltr.type = "lowpass";
  vitrFiltr.frequency.value = 420;
  vitrNarazy = ctx.createGain();
  vitrNarazy.gain.value = 0.6;
  vitr = ctx.createGain();
  vitr.gain.value = 0.05;
  v.connect(vitrFiltr).connect(vitrNarazy).connect(vitr).connect(hlavni);
  v.start();
  pripravZvonkohru();

  const p = ctx.createBufferSource();
  p.buffer = sum(3, true);
  p.loop = true;
  const pf = ctx.createBiquadFilter();
  pf.type = "lowpass";
  pf.frequency.value = 200;
  pec = ctx.createGain();
  pec.gain.value = 0;
  p.connect(pf).connect(pec).connect(hlavni);
  p.start();
}

export const jeZapnuto = () => zapnuto;
/** Opravdu hraje — prohlížeč zvuk pustí až po prvním gestu na stránce */
export const hraje = () => zapnuto && ctx?.state === "running";
export const odemkni = () => ctx?.resume();

export async function prepni() {
  if (!ctx) pripravit();
  zapnuto = !zapnuto;
  const t = ctx!.currentTime;
  hlavni.gain.cancelScheduledValues(t);
  if (zapnuto) {
    await ctx!.resume();
    hlavni.gain.setTargetAtTime(0.9, t, 0.4);
    planujCvrcky();
  } else {
    hlavni.gain.setTargetAtTime(0, t, 0.15);
    window.clearTimeout(cvrckyCas);
  }
  return zapnuto;
}

const muze = () => zapnuto && ctx !== null;

export function furin(vyska?: number, hlasitost = 0.11) {
  if (!muze()) return;
  const c = ctx!;
  const f = vyska ?? PENTA[Math.floor(Math.random() * PENTA.length)];
  const t = c.currentTime;
  const ven = c.createGain();
  ven.gain.value = hlasitost;
  const pan = c.createStereoPanner();
  pan.pan.value = Math.random() * 0.8 - 0.4;
  ven.connect(pan).connect(hlavni);
  for (const [k, g, doba] of [[1, 1, 2.8], [2.76, 0.45, 1.7], [5.4, 0.22, 0.9], [8.93, 0.1, 0.5]]) {
    const o = c.createOscillator();
    o.frequency.value = f * k * (1 + (Math.random() - 0.5) * 0.004);
    const e = c.createGain();
    e.gain.setValueAtTime(0, t);
    e.gain.linearRampToValueAtTime(g, t + 0.004);
    e.gain.exponentialRampToValueAtTime(0.0001, t + doba);
    o.connect(e).connect(ven);
    o.start(t);
    o.stop(t + doba + 0.05);
  }
}

function cvrcek() {
  if (!muze()) return;
  const c = ctx!;
  const t = c.currentTime;
  const o = c.createOscillator();
  o.frequency.value = 4200 + Math.random() * 500;
  const g = c.createGain();
  g.gain.value = 0;
  const pan = c.createStereoPanner();
  pan.pan.value = Math.random() * 1.6 - 0.8;
  o.connect(g).connect(pan).connect(hlavni);
  const sila = 0.022 * noc;
  for (let i = 0; i < 3; i++) {
    const s = t + i * 0.055;
    g.gain.setValueAtTime(0, s);
    g.gain.linearRampToValueAtTime(sila, s + 0.008);
    g.gain.linearRampToValueAtTime(0, s + 0.035);
  }
  o.start(t);
  o.stop(t + 0.2);
}

function planujCvrcky() {
  window.clearTimeout(cvrckyCas);
  cvrckyCas = window.setTimeout(() => {
    if (zapnuto && noc > 0.4) {
      cvrcek();
      if (Math.random() < 0.6) window.setTimeout(cvrcek, 300);
    }
    planujCvrcky();
  }, 600 + Math.random() * 900);
}

export function nastavNoc(mira: number) {
  noc = mira;
  if (ctx) vitr.gain.setTargetAtTime(0.05 * (1 - mira * 0.6), ctx.currentTime, 0.5);
}

export function nastavPec(mira: number) {
  if (ctx) pec.gain.setTargetAtTime(mira * 0.32, ctx.currentTime, 0.25);
}

export const miraNoci = () => noc;

/* Přechod na jinou stránku (prechody.ts): zvuk běží dál, ale pec, kruh
   a štětec patřily staré stránce. Noc nastaví obloha nové stránky. Cvrčci
   se naplánují znovu — jejich časovač patřil staré stránce a zanikl. */
priOdchodu(() => {
  nastavNoc(0);
  if (ctx) {
    const t = ctx.currentTime;
    pec.gain.setTargetAtTime(0, t, 0.2);
    if (motor) {
      motorSila.gain.setTargetAtTime(0, t, 0.2);
      mlask.gain.setTargetAtTime(0, t, 0.1);
    }
    stetec?.gain.setTargetAtTime(0, t, 0.1);
  }
  if (zapnuto) planujCvrcky();
});

/** Vítr 0–1 ze zvonkohry: v nárazu šum zesílí a zjasní */
export function nastavVitr(sila: number) {
  if (!ctx) return;
  const t = ctx.currentTime;
  vitrNarazy.gain.setTargetAtTime(0.45 + 1.1 * sila, t, 0.35);
  vitrFiltr.frequency.setTargetAtTime(320 + 650 * sila, t, 0.35);
}

/* Zvonkohra v hlavičce. Trubka zní vlastními tóny volného nosníku
   (1 : 2,76 : 5,40 : 8,93) — proto zní jako kov, ne jako píšťala. První
   dva jsou rozdvojené o zlomek hertzu, jak to u skutečných trubek bývá,
   takže se tón pomalu vlní. Vyšší tóny doznívají dřív a silnější úder
   je víc rozezní. Celá zvonkohra jde přes jemný kompresor a dozvuk. */
const MODY = [
  [1, 1, 6.5, 0.0009],
  [2.756, 0.5, 3.6, 0.0006],
  [5.404, 0.22, 1.4, 0],
  [8.933, 0.1, 0.6, 0],
] as const;
/** Kolik úderů smí znít najednou — v nárazu větru jich přibývá rychle */
const HLASU = 18;
let zvonkohraVen: GainNode | null = null;
let klepnuti: AudioBuffer;
const hlasy: { ven: GainNode; oscilatory: OscillatorNode[]; konec: number }[] = [];

function pripravZvonkohru() {
  const c = ctx!;
  const komp = c.createDynamicsCompressor();
  komp.threshold.value = -20;
  komp.knee.value = 12;
  komp.ratio.value = 3;
  komp.attack.value = 0.005;
  komp.release.value = 0.4;
  zvonkohraVen = c.createGain();
  zvonkohraVen.connect(komp).connect(hlavni);
  const dozvuk = c.createConvolver();
  dozvuk.buffer = odezva(3.4);
  const mokro = c.createGain();
  mokro.gain.value = 0.3;
  komp.connect(mokro).connect(dozvuk).connect(hlavni);
  klepnuti = sum(0.06, false);
}

/** Dozvuk tiché místnosti: šum, který za danou dobu zeslábne o 60 dB a přitom tmavne */
function odezva(sekundy: number) {
  const c = ctx!;
  const sr = c.sampleRate;
  const delka = Math.floor(sr * sekundy);
  const b = c.createBuffer(2, delka, sr);
  const slabne = Math.exp(-6.9 / (sekundy * sr));
  const tmavne = Math.exp(-1 / (0.9 * sr));
  for (let k = 0; k < 2; k++) {
    const d = b.getChannelData(k);
    let y = 0;
    let sila = 1;
    let jas = 0.85;
    for (let i = 0; i < delka; i++) {
      y += (0.08 + jas) * (Math.random() * 2 - 1 - y);
      d[i] = i < 0.015 * sr ? 0 : y * sila;
      sila *= slabne;
      jas *= tmavne;
    }
  }
  return b;
}

/** Úder do trubky zvonkohry: tón v Hz, síla 0–1, pan −1 vlevo … 1 vpravo */
export function zvonek(ton: number, sila: number, pan = 0) {
  if (!muze() || !zvonkohraVen) return;
  const c = ctx!;
  const t = c.currentTime + 0.004;
  while (hlasy.length && hlasy[0].konec < t) hlasy.shift();
  if (hlasy.length >= HLASU) {
    const h = hlasy.shift()!;
    h.ven.gain.setTargetAtTime(0, t, 0.04);
    h.oscilatory.forEach((o) => o.stop(t + 0.3));
  }
  const ven = c.createGain();
  ven.gain.value = 0.09 * (0.3 + 0.7 * sila);
  const p = c.createStereoPanner();
  p.pan.value = Math.max(-1, Math.min(1, pan));
  ven.connect(p).connect(zvonkohraVen);
  const jas = 0.4 + 0.6 * sila;
  const kratsi = 0.55 + 0.45 * Math.sqrt(392 / ton);
  const oscilatory: OscillatorNode[] = [];
  let konec = t;
  MODY.forEach(([nasobek, hlas, doba, rozdvojeni], m) => {
    const g = hlas * jas ** m;
    const d = doba * kratsi;
    konec = Math.max(konec, t + d);
    for (const smer of rozdvojeni ? [-1, 1] : [0]) {
      const o = c.createOscillator();
      o.frequency.value = ton * nasobek * (1 + smer * rozdvojeni);
      const e = c.createGain();
      e.gain.setValueAtTime(0, t);
      e.gain.linearRampToValueAtTime(rozdvojeni ? g / 2 : g, t + 0.002);
      e.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(e).connect(ven);
      o.start(t);
      o.stop(t + d + 0.05);
      oscilatory.push(o);
    }
  });
  /* Ťuknutí dřevěného srdce o kov */
  const s = c.createBufferSource();
  s.buffer = klepnuti;
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = 2400 + Math.random() * 900;
  f.Q.value = 1.4;
  const e = c.createGain();
  e.gain.setValueAtTime(0.6 * sila, t);
  e.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  s.connect(f).connect(e).connect(ven);
  s.start(t);
  oscilatory[0].onended = () => ven.disconnect();
  hlasy.push({ ven, oscilatory, konec });
}

/* Kruh nanečisto (/kurzy-2): bzučení motoru podle otáček a mlaskání hlíny pod rukou */
let motor: OscillatorNode | null = null;
let motorSila: GainNode;
let mlask: GainNode;

function pripravKruh() {
  if (!ctx || motor) return;
  const c = ctx;
  motor = c.createOscillator();
  motor.type = "sawtooth";
  motor.frequency.value = 40;
  const mf = c.createBiquadFilter();
  mf.type = "lowpass";
  mf.frequency.value = 170;
  motorSila = c.createGain();
  motorSila.gain.value = 0;
  motor.connect(mf).connect(motorSila).connect(hlavni);
  motor.start();

  const s = c.createBufferSource();
  s.buffer = sum(2, false);
  s.loop = true;
  const sf = c.createBiquadFilter();
  sf.type = "bandpass";
  sf.frequency.value = 520;
  sf.Q.value = 0.8;
  mlask = c.createGain();
  mlask.gain.value = 0;
  s.connect(sf).connect(mlask).connect(hlavni);
  s.start();
}

/** mira 0–1 podle otáček; dotyk = ruka je na hlíně */
export function nastavKruh(mira: number, dotyk: boolean) {
  if (!ctx) return;
  if (!motor && (!zapnuto || mira <= 0)) return;
  pripravKruh();
  const t = ctx.currentTime;
  motor!.frequency.setTargetAtTime(35 + mira * 60, t, 0.1);
  motorSila.gain.setTargetAtTime(mira * 0.11, t, 0.1);
  mlask.gain.setTargetAtTime(dotyk && mira > 0.1 ? 0.07 : 0, t, 0.05);
}

export const zuch = () => {
  ton(120, 45, 0.35, "sine", 0.4);
  sumik(0.3, 300, 0.7, 0.3);
};

function ton(f0: number, f1: number, doba: number, typ: OscillatorType = "sine", sila = 0.2) {
  if (!muze()) return;
  const c = ctx!;
  const t = c.currentTime;
  const o = c.createOscillator();
  o.type = typ;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + doba);
  const g = c.createGain();
  g.gain.setValueAtTime(sila, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + doba);
  o.connect(g).connect(hlavni);
  o.start(t);
  o.stop(t + doba + 0.02);
}

function sumik(doba: number, frekvence: number, q: number, sila: number) {
  if (!muze()) return;
  const c = ctx!;
  const t = c.currentTime;
  const s = c.createBufferSource();
  s.buffer = sum(doba + 0.05, false);
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = frekvence;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(sila, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + doba);
  s.connect(f).connect(g).connect(hlavni);
  s.start(t);
}

export const pop = () => ton(500, 1600, 0.07, "sine", 0.25);
export const kapka = () => {
  ton(1400, 2600, 0.06, "sine", 0.16);
  sumik(0.25, 1800, 0.9, 0.1);
};
export const hnet = () => sumik(0.12, 260, 0.8, 0.4);
export const razitko = () => {
  ton(150, 60, 0.14, "sine", 0.32);
  sumik(0.05, 2000, 1, 0.12);
};
export const tres = () => {
  for (let i = 0; i < 7; i++) window.setTimeout(() => sumik(0.04, 2800, 2, 0.22), i * 95);
};
export const papir = () => sumik(0.35, 3600, 0.5, 0.1);
export const cink = () => ton(2300, 2150, 0.12, "triangle", 0.06);
export const nalezeno = () => {
  furin(1760, 0.14);
  window.setTimeout(() => furin(2349.3, 0.14), 140);
  window.setTimeout(() => furin(2637, 0.14), 280);
};
export const oslava = () => PENTA.forEach((f, i) => window.setTimeout(() => furin(f, 0.14), i * 120));
export const zlato = () => [2637, 3136, 3520].forEach((f, i) => window.setTimeout(() => furin(f), i * 110));

/* Úvod 2: šustnutí norenu, klapky odjezdové tabule, pára z kávovaru */
export const latka = () => {
  sumik(0.55, 700, 0.5, 0.16);
  window.setTimeout(() => sumik(0.35, 1400, 0.7, 0.08), 120);
};
export const klapky = (pocet = 8) => {
  for (let i = 0; i < pocet; i++) {
    window.setTimeout(() => sumik(0.022, 2600 + Math.random() * 1400, 4, 0.2), i * 34 + Math.random() * 18);
  }
};
export const para = () => sumik(1.3, 3200, 0.35, 0.07);

/* Obchod 2, O nás 2 a Rezervace: dřevo, víko krabice, uzel šátku, štětec, spoušť */

/** Dřevěné klapnutí — destička ema dosedne na háček, prkénko na prkénko */
export const drevo = (vyska = 1) => {
  ton(430 * vyska, 250 * vyska, 0.1, "triangle", 0.2);
  sumik(0.05, 1400 * vyska, 3, 0.2);
};
/** Rýč do hlíny v patičce: škrábnutí, žuchnutí, drolení */
export const lopata = () => {
  sumik(0.12, 1900, 1.4, 0.2);
  window.setTimeout(() => {
    ton(120, 48, 0.3, "sine", 0.4);
    sumik(0.45, 320, 0.6, 0.35);
  }, 130);
  for (let i = 0; i < 5; i++) window.setTimeout(() => sumik(0.04, 900 + Math.random() * 900, 2, 0.12), 300 + i * 70 + Math.random() * 40);
};
/** Víko paulowniové krabice: nejdřív sklouzne, pak dosedne vedle */
export const vicko = () => {
  sumik(0.45, 900, 0.6, 0.07);
  window.setTimeout(() => drevo(0.75), 420);
};
/** Uzel šátku: zašustění látky a dotažení */
export const uzel = () => {
  latka();
  window.setTimeout(() => sumik(0.14, 520, 1.2, 0.26), 460);
};
/** Spoušť fotoaparátu — dvě lamely jako u staré zrcadlovky */
export const spoust = () => {
  sumik(0.03, 4200, 2, 0.35);
  window.setTimeout(() => sumik(0.045, 2600, 2, 0.3), 75);
};
/** Blesk se nabíjí — tenké stoupající pištění */
export const blesk = () => ton(1800, 5200, 0.9, "sine", 0.025);

/* Štětec po papíře: šum, který sílí s rychlostí tahu. Smyčka se rozjede
   při prvním tahu a pak už jen mění hlasitost. */
let stetec: GainNode | null = null;
export function stetecSila(mira: number) {
  if (!muze()) return;
  const c = ctx!;
  if (!stetec) {
    const s = c.createBufferSource();
    s.buffer = sum(2, false);
    s.loop = true;
    const f = c.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 2300;
    f.Q.value = 0.55;
    stetec = c.createGain();
    stetec.gain.value = 0;
    s.connect(f).connect(stetec).connect(hlavni);
    s.start();
  }
  stetec.gain.setTargetAtTime(Math.min(1, Math.max(0, mira)) * 0.1, c.currentTime, 0.04);
}

export function reakce(id: PostavaId) {
  switch (id) {
    case "bublinka": pop(); break;
    case "kapka": kapka(); break;
    case "pecinka": sumik(0.5, 300, 0.7, 0.3); break;
    case "stripek": furin(2637); window.setTimeout(() => furin(3136), 90); break;
    case "kachlik": razitko(); break;
    case "vazicka": furin(1568); break;
    case "cedulka": ton(900, 1250, 0.08, "triangle", 0.08); break;
    case "samotka": ton(220, 140, 0.5, "sine", 0.15); break;
    case "hlinka": ton(260, 190, 0.3, "sine", 0.14); break;
  }
}
