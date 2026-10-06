/**
 * Zvuky /parta-2. Žádné nahrávky — všechno se skládá ve Web Audio:
 * vítr z filtrovaného šumu, zvonek fūrin ze čtyř nesouzvučných
 * alikvót (tak zní skleněný zvonek), cvrčci jako krátké pulzy vysokého
 * tónu, hukot pece z hlubokého šumu.
 *
 * Ve výchozím stavu je ticho. Zvuk zapíná až kliknutí na fūrin v hlavičce
 * — dřív by ho prohlížeč stejně nepustil.
 */
import type { PostavaId } from "../../data/parta";

let ctx: AudioContext | null = null;
let hlavni: GainNode;
let vitr: GainNode;
let pec: GainNode;
let zapnuto = false;
let noc = 0;
let furinCas: number | undefined;
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
  const vf = ctx.createBiquadFilter();
  vf.type = "lowpass";
  vf.frequency.value = 520;
  vitr = ctx.createGain();
  vitr.gain.value = 0.05;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.07;
  const hloubka = ctx.createGain();
  hloubka.gain.value = 0.035;
  lfo.connect(hloubka).connect(vitr.gain);
  v.connect(vf).connect(vitr).connect(hlavni);
  v.start();
  lfo.start();

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

export async function prepni() {
  if (!ctx) pripravit();
  zapnuto = !zapnuto;
  const t = ctx!.currentTime;
  hlavni.gain.cancelScheduledValues(t);
  if (zapnuto) {
    await ctx!.resume();
    hlavni.gain.setTargetAtTime(0.9, t, 0.4);
    furin();
    planujFurin();
    planujCvrcky();
  } else {
    hlavni.gain.setTargetAtTime(0, t, 0.15);
    window.clearTimeout(furinCas);
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

function planujFurin() {
  window.clearTimeout(furinCas);
  furinCas = window.setTimeout(() => {
    if (zapnuto && noc < 0.6) {
      furin();
      if (Math.random() < 0.5) window.setTimeout(() => furin(), 180 + Math.random() * 260);
    }
    planujFurin();
  }, 7000 + Math.random() * 9000);
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
