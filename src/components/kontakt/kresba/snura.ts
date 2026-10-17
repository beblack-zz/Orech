/**
 * Šňůra přes louku pod první obrazovkou Kontaktu. Od uzlu na patě Futatsu
 * sestupuje kōhaku trávou přes okraj první obrazovky (venku.ts, `sestup`)
 * a tady pokračuje: leží v trávě k nízkému bambusovému kolíčku, omotá ho
 * a z jeho vršku visí (přes další kolíčky, když je daleko) ke kotvě
 * `vstup` stojanu ema 絵馬掛け (Otazky.astro, kresba/ema.ts). Po trámech
 * stojanu ji kreslí stojan sám. Z kotvy `vystup` visí dál dolů ke kolíčku
 * nad střechou vývěsky 高札, odtud je přehozená přes konec jejího trámu,
 * spadne po desce, u rohu ji drží připínáček a vejde do mapy, kde
 * pokračuje jako cesta pěšky od zastávky (mapa.ts, MAPA_PRIVOD). Když
 * kotvy chybí (stojan není), jde šňůra od sestupu přes kolíčky rovnou
 * k vývěsce.
 *
 * Kreslí se v prohlížeči podle skutečných poloh prvků (scripts/kontakt/
 * snura.ts), jednotky jsou CSS px, y včetně přesahu plátna nad sekcí.
 * Dvě vrstvy: `pod` leží za obsahem (nad trávou louky), `nad` je jen kus
 * přes vývěsku a uzlíčky u kotev — ty musí jít přes střechu, desku a stojan.
 */
import { provazek, provazekSvg, vrabec, f, nahoda, lerp, omez, type Bod } from "./zaklad";
import { zaves, type SvatekId } from "./svatky";

/** Kotva na stojanu: bod, tloušťka nakreslené šňůry a směr ven ze stojanu (u vstupu ke Futatsu, u výstupu k vývěsce) */
export interface Kotva {
  b: Bod;
  w: number;
  smer: Bod | null;
}

/** Co skript změřil (px, y v souřadnicích plátna, tedy už + přesah) */
export interface SnuraMereni {
  W: number;
  H: number;
  /** Šev s první obrazovkou (horní okraj .ko-dole na plátně) */
  y0: number;
  /** Kde šňůra přichází přes šev a jak je široká */
  sx: number;
  w: number;
  /** Stojan ema (ať za něj nestojí kolíčky) a spodek party u jeho paty (kudy šňůra nesmí) */
  stojan: { l: number; r: number; t: number; b: number } | null;
  parta: number | null;
  vstup: Kotva | null;
  vystup: Kotva | null;
  /** Vývěska: konec trámu (střed a poloměr hlavice), horní okraj střechy, osa pádu po desce, vstup do mapy a šířka cesty na mapě */
  vyveska: { hak: Bod; hakR: number; strecha: number; padX: number; vstup: Bod; wMapy: number } | null;
  svatek: SvatekId | null;
}

/** Nízký bambusový kolíček: osa x, uříznutý vršek, kde je šňůra uvázaná, kde stojí v trávě, kudy je omotaný a jak tlustou šňůrou */
export interface Kolik {
  x: number;
  top: number;
  uzel: number;
  zem: number;
  pw: number;
  ovin: [number, number] | null;
  sw: number;
}

/** Volně visící kus šňůry (jde drnknout) */
export interface Rozpeti {
  tvar: (t: number) => Bod;
  w0: number;
  w1: number;
  /** Lomená čára po 1/32 — kvůli chytání myší */
  body: Bod[];
  /** Ozdoby svátku: místo na kusu a měřítko (nad střechou stojanu menší, ať se vejdou) */
  ozdoby: { t: number; m: number }[];
  /** Úsek celé šňůry 0–1 (kvůli výšce tónu při drnknutí) */
  t0: number;
  t1: number;
}

export interface Snura {
  m: SnuraMereni;
  w: number;
  koliky: Kolik[];
  /** Ležící kus od švu ke kolíčku a případně druhý v trávě pod stojanem (když je vývěska daleko do strany) */
  lezi: { tvar: (t: number) => Bod; w0: number; w1: number };
  lezi2: { tvar: (t: number) => Bod; w0: number; w1: number } | null;
  rozpeti: Rozpeti[];
  /** Vrabec: kde sedí (nohy), náklon, kam hledí a který kus ho vyplaší (−1 žádný) */
  vrabec: { b: Bod; uhel: number; zrcadlo: boolean; i: number } | null;
  /** Uzlíčky u kotev stojanu (vrstva nad, aby zakryly spoj s nakreslenou šňůrou) */
  uzly: { b: Bod; uhel: number; w: number }[];
  /** Kus přes vývěsku: na trám (nad čarou `rez` za obsahem, pod ní přes střechu) a z trámu po desce do mapy */
  konec: { naTram: (t: number) => Bod; w: number; rez: number; poDesce: (t: number) => Bod; spendliky: Bod[]; hak: Bod; hakR: number; wMapy: number } | null;
}

/* ═══ Pomůcky ═══ */

const kubika = (a: Bod, b: Bod, c: Bod, d: Bod) => (t: number): Bod => {
  const u = 1 - t;
  return [u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0], u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1]];
};
const vzd = (a: Bod, b: Bod) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const jednotka = (v: Bod): Bod => {
  const l = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / l, v[1] / l];
};

/** Pravý okraj plátna pro `visi` (oblouk nesmí utéct z obrazovky) */
let sirkaPlatna = Infinity;

/** Visící kus z A do B s průvěsem dolů; směry na koncích jsou volitelné (navázání na kotvu) */
function visi(A: Bod, B: Bod, dA: Bod | null = null, dB: Bod | null = null, pruves = 0.13) {
  const L = vzd(A, B);
  const s = L * pruves;
  /* řídicí body uvnitř plátna — křivka je pak celá v něm */
  const x = (v: number) => omez(v, Math.min(4, A[0], B[0]), Math.max(sirkaPlatna - 4, A[0], B[0]));
  const c1: Bod = dA ? [x(A[0] + dA[0] * L * 0.34), A[1] + dA[1] * L * 0.34] : [lerp(A[0], B[0], 1 / 3), lerp(A[1], B[1], 1 / 3) + s];
  const c2: Bod = dB ? [x(B[0] - dB[0] * L * 0.34), B[1] - dB[1] * L * 0.34] : [lerp(A[0], B[0], 2 / 3), lerp(A[1], B[1], 2 / 3) + s];
  return kubika(A, c1, c2, B);
}

/** Vzorkovač lomené čáry podle délky (t = podíl délky) */
function poCeste(B: Bod[]): (t: number) => Bod {
  const d = [0];
  for (let i = 1; i < B.length; i++) d.push(d[i - 1] + Math.hypot(B[i][0] - B[i - 1][0], B[i][1] - B[i - 1][1]));
  const L = d[d.length - 1] || 1;
  return (t) => {
    const s = omez(t) * L;
    let i = 1;
    while (i < d.length - 1 && d[i] < s) i++;
    const u = (s - d[i - 1]) / (d[i] - d[i - 1] || 1);
    return [lerp(B[i - 1][0], B[i][0], u), lerp(B[i - 1][1], B[i][1], u)];
  };
}

const delkaTvaru = (tvar: (t: number) => Bod, n = 40) => {
  let s = 0;
  let p = tvar(0);
  for (let i = 1; i <= n; i++) {
    const q = tvar(i / n);
    s += Math.hypot(q[0] - p[0], q[1] - p[1]);
    p = q;
  }
  return s;
};

/** Tvar s výchylkou kolmo ke šňůře (drnknutí) */
function sKmitem(tvar: (t: number) => Bod, kmit?: (t: number) => number) {
  if (!kmit) return tvar;
  return (t: number): Bod => {
    const a = tvar(Math.max(0, t - 0.01)), b = tvar(Math.min(1, t + 0.01));
    const [tx, ty] = jednotka([b[0] - a[0], b[1] - a[1]]);
    const [x, y] = tvar(t);
    const d = kmit(t);
    return [x - ty * d, y + tx * d];
  };
}

/* ═══ Rozvržení ═══ */

/** Z poloh na stránce spočítá, kudy šňůra vede: kolíčky, volné kusy, uzlíčky u kotev a konec ve vývěsce */
export function rozvrh(m: SnuraMereni): Snura {
  const { W, y0, sx, w } = m;
  sirkaPlatna = W;
  const pw = Math.max(7, w * 1.9);
  const koliky: Kolik[] = [];
  const uzly: Snura["uzly"] = [];
  const st = m.stojan, vy = m.vyveska;
  const stred = st ? (st.l + st.r) / 2 : W / 2;
  const hakNahore: Bod | null = vy ? [vy.hak[0], vy.hak[1] - vy.hakR - w * 0.3] : null;

  /* pruh louky mezi švem a střechou stojanu: když je dost vysoký, kolíčky nad stojanem stojí v něm */
  const pruh = st ? st.t - y0 : 0;
  /** Kolíček s patou v `zem`; za stojan nestaví (do pruhu nad ním, nebo ke kraji, kterým je blíž) */
  const kolik = (x: number, zem: number, sw: number, vyska = 48): Kolik => {
    let kx = omez(x, pw, W - pw);
    if (st && kx > st.l - pw * 1.5 && kx < st.r + pw * 1.5 && zem > st.t - 5 && zem < st.b) {
      if (pruh >= 44 && zem < st.t + (st.b - st.t) * 0.5) {
        zem = st.t - 5;
        vyska = Math.min(vyska, zem - y0 + 4);
      } else kx = omez(kx < stred ? st.l - pw * 1.6 : st.r + pw * 1.6, pw, W - pw);
    }
    const top = zem - vyska;
    const k: Kolik = { x: kx, top, uzel: top + Math.max(6, sw), zem, pw, ovin: null, sw };
    koliky.push(k);
    return k;
  };
  const vrsek = (k: Kolik): Bod => [k.x, k.uzel];
  /* volné kusy v pořadí od Futatsu k mapě; `od` = kolíček, ze kterého kus vychází (jeho omotávka má stejnou tloušťku) */
  const kusy: { tvar: (t: number) => Bod; cast: "a" | "b"; od: Kolik | null }[] = [];

  /** Řetěz z vršku kolíčku P k cíli T: po ~300 px další kolíček, poslední kus přijde ve směru dT */
  const retez = (P: Kolik, T: Bod, dT: Bod | null, cast: "a" | "b", sw: number) => {
    const A0 = vrsek(P);
    const n = Math.max(0, Math.ceil(vzd(A0, T) / 300) - 1);
    const T2: Bod = dT ? [T[0] - dT[0] * 40, T[1] - dT[1] * 40] : T;
    let A = P;
    for (let i = 1; i <= n; i++) {
      const u = i / (n + 1);
      const k = kolik(lerp(A0[0], T2[0], u), lerp(A0[1], T2[1], u) - 26 + 42, sw);
      kusy.push({ tvar: visi(vrsek(A), vrsek(k)), cast, od: A });
      A = k;
    }
    kusy.push({ tvar: visi(vrsek(A), T, null, dT), cast, od: A });
  };

  /* ——— první část: od švu ke vstupu do stojanu (bez stojanu ke kolíčku nad vývěskou) ——— */
  const V = m.vstup, X = m.vystup;
  const sStojanem = !!(V && X);
  let cil: Bod | null = null, cilSmer: Bod | null = null, cilW = w;
  let kNad: Kolik | null = null;
  if (V && sStojanem) {
    cil = V.b;
    cilW = V.w;
    /* šňůra přichází proti směru ven; když ven od kotvy není místo (kraj obrazovky), přijde víc shora */
    const ven: Bod = V.smer ?? [-(Math.sign(stred - V.b[0]) || 1), 0];
    const misto = ven[0] < -0.3 ? V.b[0] : ven[0] > 0.3 ? W - V.b[0] : 999;
    const u = omez(1 - (misto - 10) / 60);
    cilSmer = jednotka([lerp(-ven[0], -ven[0] * 0.4, u), lerp(-ven[1], 0.92, u)]);
    uzly.push({ b: V.b, uhel: (Math.atan2(cilSmer[1], cilSmer[0]) * 180) / Math.PI, w: V.w });
  } else if (vy && hakNahore) {
    kNad = kolik(hakNahore[0] + (Math.sign(sx - hakNahore[0]) || 1) * 70, vy.strecha - 18, w, 46);
    cil = vrsek(kNad);
  }

  const S: Bod = [sx, y0 - 8];
  let lezi: (t: number) => Bod;
  if (cil && cil[1] - y0 < 80) {
    /* cíl hned pod švem: šňůra z trávy rovnou k němu */
    lezi = visi(S, cil, [0, 1], cilSmer, 0.05);
  } else {
    const smerK = Math.sign((cil ? cil[0] : sx + 40) - sx) || 1;
    /* ke vstupu má šňůra přijít z jeho vnější strany (z venku stojanu) */
    const xb = cil && cilSmer && Math.abs(cilSmer[0]) > 0.3 ? omez(cil[0] - cilSmer[0] * 48, pw, W - pw) : null;
    let kx = sx + smerK * 36;
    const zevnitr = (x: number) => !!(cil && cilSmer && xb !== null && (cil[0] - x) * cilSmer[0] < 30);
    if (xb !== null && zevnitr(kx) && Math.abs(xb - kx) <= 60) kx = xb;
    const k0 = kolik(kx, y0 + 70, w, 52);
    k0.ovin = [k0.zem - w * 1.2, k0.uzel + w * 1.6];
    const sk = Math.sign(k0.x - sx) || 1;
    lezi = kubika(S, [sx + 3, y0 + 30], [k0.x - sk * 34, k0.zem + 6], [k0.x - sk * (pw / 2 + w * 0.2), k0.zem - w * 1.1]);
    if (cil) {
      /* vstup je daleko, nebo kolíček u švu stojí na jeho vnitřní straně: šňůra visí
         nejdřív obloučkem v pruhu nad stojanem ke druhému kolíčku venku */
      let od = k0;
      if (xb !== null && Math.abs(xb - k0.x) > 60 && (Math.abs(xb - k0.x) > 120 || zevnitr(k0.x))) {
        const kb = kolik(xb, y0 + 76, w, 52);
        kusy.push({ tvar: visi(vrsek(k0), vrsek(kb), null, null, 0.09), cast: "a", od: k0 });
        od = kb;
      }
      retez(od, cil, cilSmer, "a", w);
    }
  }

  /* ——— druhá část: z výstupu stojanu k vývěsce ——— */
  let od: Bod | null = kNad ? vrsek(kNad) : null;
  let odSmer: Bod | null = null;
  let wB = w;
  let lezi2: Snura["lezi2"] = null;
  if (X && sStojanem) {
    wB = X.w;
    const smerX: Bod = X.smer ?? (st && X.b[1] > st.t + (st.b - st.t) * 0.72 ? [0, 1] : [Math.sign(X.b[0] - stred) || -1, 0]);
    uzly.push({ b: X.b, uhel: (Math.atan2(smerX[1], smerX[0]) * 180) / Math.PI, w: X.w });
    od = X.b;
    odSmer = smerX;
    if (vy && hakNahore && Math.abs(X.b[0] - hakNahore[0]) > 150) {
      /* vývěska je daleko do strany: šňůra spadne z výstupu do trávy, vlní se po louce
         pod partou (ne přes ni, ani jako ohrada) a u vývěsky vyšplhá na kolíček nad střechou */
      const s = Math.sign(X.b[0] - hakNahore[0]) || 1;
      const parta = m.parta ?? (st ? st.b + 10 : X.b[1] + 60);
      const zem = Math.min(vy.strecha - 12, parta + 34);
      const k1 = kolik(hakNahore[0] + s * 70, zem + 3, wB, omez(zem + 3 - parta - 8, 24, 46));
      k1.ovin = [k1.zem - wB * 1.2, k1.uzel + wB * 1.6];
      const dopad: Bod = [omez(X.b[0] + s * Math.max(4, wB), wB * 2, W - wB * 2), zem];
      kusy.push({ tvar: visi(X.b, dopad, smerX, [-s, 0], 0.04), cast: "b", od: null });
      const B: Bod = [k1.x + s * (pw / 2 + wB * 0.2), k1.zem - wB * 1.1];
      const dx = B[0] - dopad[0];
      const vlny = Math.max(1, Math.round(Math.abs(dx) / 300));
      const body: Bod[] = [];
      for (let i = 0; i <= 64; i++) {
        const u = i / 64;
        body.push([dopad[0] + dx * u, lerp(dopad[1], B[1], u) + 8 * Math.sin(Math.PI * 2 * vlny * u + 0.6) * Math.sin(Math.PI * u)]);
      }
      lezi2 = { tvar: poCeste(body), w0: wB, w1: wB };
      od = vrsek(k1);
      odSmer = null;
    }
  }

  /* ——— šířky: v první části se šňůra plynule ztenčí na tloušťku u vstupu ——— */
  const lk = delkaTvaru(lezi, 30);
  const dA = kusy.filter((u) => u.cast === "a").map((u) => delkaTvaru(u.tvar));
  const celkemA = lk + dA.reduce((a, b) => a + b, 0) || 1;
  const wA = (s: number) => lerp(w, cilW, s / celkemA);
  let sA = lk;
  const rozpeti: Rozpeti[] = kusy.map((u) => {
    const L = delkaTvaru(u.tvar);
    let w0 = wB, w1 = wB;
    if (u.cast === "a") {
      w0 = wA(sA);
      sA += L;
      w1 = wA(sA);
    }
    if (u.od) u.od.sw = w0;
    const [a, b] = [u.tvar(0), u.tvar(1)];
    const dx = Math.abs(b[0] - a[0]);
    /* ozdoby svátku jen na kusech, které visí spíš do šířky; nad stojanem se zmenší do pruhu nad střechou */
    const mz = omez((w / 6.6) * 0.72, 0.5, 0.82);
    const ozdoby = (!m.svatek || dx < L * 0.45 ? [] : L > 320 ? [0.28, 0.5, 0.72] : L > 210 ? [0.36, 0.64] : L > 120 ? [0.5] : [])
      .map((t) => {
        const [x, y] = u.tvar(t);
        if (!st || x < st.l - 12 || x > st.r + 12 || y > st.b) return { t, m: mz };
        const misto = st.t - 8 - y;
        return { t, m: misto >= 26 ? Math.min(mz, misto / 72) : 0 };
      })
      .filter((o) => o.m >= 0.34);
    return { tvar: u.tvar, w0, w1, body: Array.from({ length: 33 }, (_, i) => u.tvar(i / 32)), ozdoby, t0: 0, t1: 0 };
  });

  /* vrabec: na nejdelším spíš vodorovném kusu, jinak na vršku prvního kolíčku */
  let vrabecMisto: Snura["vrabec"] = null;
  let nej = 90;
  rozpeti.forEach((r, i) => {
    const [a, b] = [r.body[0], r.body[32]];
    const dx = Math.abs(b[0] - a[0]), dy = Math.abs(b[1] - a[1]);
    if (dx > nej && dy < dx * 0.7) {
      nej = dx;
      const t = r.ozdoby.length ? 0.2 : 0.42;
      const p = provazek(r.tvar, r.w0, r.w1, 0, 40).bod(t);
      const zrcadlo = b[0] < a[0];
      const uhel = zrcadlo ? p.uhel + 180 : p.uhel;
      vrabecMisto = { b: [p.x, p.y - p.w * 0.35], uhel: ((((uhel + 540) % 360) - 180) * 0.6), zrcadlo, i };
    }
  });
  if (!vrabecMisto && koliky.length) {
    const k = koliky[0];
    vrabecMisto = { b: [k.x - k.pw * 0.1, k.top + k.pw * 0.26], uhel: 0, zrcadlo: sx > k.x, i: rozpeti.findIndex((r) => vzd(r.body[0], vrsek(k)) < 4) };
  }

  /* ——— konec: přes konec trámu vývěsky, po desce dolů a do mapy ——— */
  let konec: Snura["konec"] = null;
  if (vy && hakNahore && od) {
    const { hak, hakR, padX, vstup, wMapy } = vy;
    const s = Math.sign(od[0] - hakNahore[0]) || 1;
    const prichod = jednotka([-s * 0.55, 1]);
    /* z kotvy dolů: šňůra visí svisle podél stojanu, než mine partu, teprve pak se stočí k trámu */
    const parta = m.parta;
    const naTram =
      odSmer && odSmer[1] > 0.7 && parta !== null && od[1] < parta
        ? kubika(od, [od[0], parta + 12], [lerp(od[0], hakNahore[0], 0.6), hakNahore[1] - 26], hakNahore)
        : visi(od, hakNahore, odSmer, prichod, 0.1);
    /* po desce: svisle s připínáčky, u posledního zahne do mapy */
    const rb = Math.max(8, wB * 1.6);
    const spendliky: Bod[] = [];
    const yKonec = vstup[1];
    const nSp = Math.max(0, Math.floor((yKonec - hakNahore[1] - 120) / 260));
    for (let i = 1; i <= nSp; i++) spendliky.push([padX, lerp(hakNahore[1] + 40, yKonec, i / (nSp + 1))]);
    const B: Bod[] = [hakNahore, [hak[0], hak[1]], [padX, hak[1] + hakR + 6]];
    spendliky.forEach(([x, y], i) => {
      /* mezi připínáčky se šňůra lehce vyboulí ven */
      const ya = i ? spendliky[i - 1][1] : hak[1] + hakR + 6;
      for (let k = 1; k <= 8; k++) B.push([x - Math.sin((k / 8) * Math.PI) * 2.4, lerp(ya, y, k / 8)]);
    });
    B.push([padX, yKonec - rb]);
    for (let k = 1; k <= 8; k++) {
      const a = (k / 8) * (Math.PI / 2);
      B.push([padX + rb - Math.cos(a) * rb, yKonec - rb + Math.sin(a) * rb]);
    }
    B.push([vstup[0] + 1.5, yKonec]);
    spendliky.push([padX + rb * 0.3, yKonec - rb * 0.3]);
    konec = { naTram, w: wB, rez: vy.strecha - 6, poDesce: poCeste(B), spendliky, hak, hakR, wMapy };
  }

  /* kde je který kus na celé šňůře (kvůli výšce tónu) */
  const delky = rozpeti.map((r) => delkaTvaru(r.tvar));
  const celkem = delky.reduce((a, b) => a + b, 0) || 1;
  let s = 0;
  rozpeti.forEach((r, i) => {
    r.t0 = s / celkem;
    s += delky[i];
    r.t1 = s / celkem;
  });

  return { m, w, koliky, lezi: { tvar: lezi, w0: w, w1: wA(lk) }, lezi2, rozpeti, vrabec: vrabecMisto, uzly, konec };
}

/* ═══ Kresba ═══ */

/** Šňůra kōhaku s leskem na horní (levé) straně — světlo jako na louce zleva shora */
function snuraKus(tvar: (t: number) => Bod, w0: number, w1: number, trida: string, krok = 6) {
  const n = Math.max(12, Math.round(delkaTvaru(tvar, 24) / krok));
  const p = provazek(tvar, w0, w1, 0, n);
  const lesk: string[] = [];
  for (let i = 0; i <= n; i++) {
    const b = p.bod(i / n);
    const a = (b.uhel * Math.PI) / 180;
    let nx = Math.sin(a), ny = -Math.cos(a);
    if (ny > 0.05 || (Math.abs(ny) <= 0.05 && nx > 0)) {
      nx = -nx;
      ny = -ny;
    }
    lesk.push(`${f(b.x + nx * b.w * 0.2)} ${f(b.y + ny * b.w * 0.2)}`);
  }
  const svg = provazekSvg(p, trida, Math.max(w0, w1)).replace(
    `<path class="ko-provaz-zkrut"`,
    `<path class="ko-sn-lesk" d="M${lesk.join("L")}" stroke="#F09A7A" stroke-opacity="0.5" stroke-width="${f(Math.max(0.8, w0 * 0.2))}" fill="none" stroke-linecap="round"/><path class="ko-provaz-zkrut"`,
  );
  return { svg, osa: p.osa, p };
}

/** Měkký stín šňůry: dva tahy pod sebou místo rozmazání (bez filtru, ať je to lehké); osa je jen jednou */
let stinu = 0;
const stin = (osa: string, w: number, dx: number, dy: number) => {
  const id = `ko-sn-o${stinu++}`;
  return `<g transform="translate(${f(dx)} ${f(dy)})" fill="none" stroke="#1E2A12" stroke-linecap="round" stroke-linejoin="round"><g stroke-width="${f(w * 2.6)}" stroke-opacity="0.07"><path id="${id}" d="${osa}"/></g><use href="#${id}" stroke-width="${f(w * 1.2)}" stroke-opacity="0.12"/></g>`;
};

const osaTvaru = (tvar: (t: number) => Bod, N = 28) => `M${Array.from({ length: N + 1 }, (_, i) => tvar(i / N)).map(([x, y]) => `${f(x)} ${f(y)}`).join("L")}`;

/** Přední půlotáčky šňůry kolem tyčky od yA k yB (zadní schová tyčka) */
function ovin(x: number, rr: number, yA: number, yB: number, w: number, krok: number) {
  const smer = yB > yA ? 1 : -1;
  const H = Math.abs(yB - yA);
  const n = Math.max(1, Math.round(H / krok));
  const p = H / n;
  let s = "";
  for (let k = 0; k < n; k++) {
    const ya = yA + smer * p * k;
    const tvar = (t: number): Bod => [x + rr * Math.sin(-Math.PI / 2 + Math.PI * t), ya + smer * p * 0.5 * t];
    s += provazekSvg(provazek(tvar, w, w, 0, 8), "ko-sn-ovin", w);
  }
  /* válec: kraje omotávky do stínu, ať se šňůra stáčí dozadu */
  const y1 = Math.min(yA, yB) - w, y2 = Math.max(yA, yB) + p * 0.5 + w;
  s += `<rect x="${f(x - rr - w * 0.5)}" y="${f(y1)}" width="${f(2 * rr + w)}" height="${f(y2 - y1)}" fill="url(#ko-sn-valec)"/>`;
  return s;
}

/** Bambusový kolíček: tělo s leskem zleva a šikmo uříznutý vršek */
function bambus(k: Kolik) {
  const { x, top, zem, pw } = k;
  const l = x - pw / 2, r = x + pw / 2;
  const rez = pw * 0.62;
  let s = `<path d="M${f(l)} ${f(top)} L${f(r)} ${f(top + rez)} L${f(r)} ${f(zem + 8)} L${f(l)} ${f(zem + 8)} Z" fill="url(#ko-sn-bambus)"/>`;
  s += `<path d="M${f(r - 0.6)} ${f(top + rez)} V${f(zem + 8)}" stroke="#5E4A26" stroke-width="1.2" stroke-opacity="0.5"/>`;
  /* jedno kolénko u země */
  const yk = zem - Math.max(12, (zem - top) * 0.3);
  s += `<rect x="${f(l - 0.8)}" y="${f(yk)}" width="${f(pw + 1.6)}" height="${f(Math.max(2, pw * 0.2))}" rx="1" fill="#7A6436"/><path d="M${f(l + 0.6)} ${f(yk + pw * 0.2 + 1.4)} H${f(r - 0.6)}" stroke="#F4E8C2" stroke-width="1" stroke-opacity="0.7"/>`;
  const a = (Math.atan2(rez, pw) * 180) / Math.PI;
  const rx = Math.hypot(pw, rez) / 2;
  const c = `${f(x)} ${f(top + rez / 2)}`;
  s += `<ellipse cx="${f(x)}" cy="${f(top + rez / 2)}" rx="${f(rx)}" ry="${f(pw * 0.26)}" fill="#EEDFB0" stroke="#8A7240" stroke-width="0.8" transform="rotate(${f(a)} ${c})"/>`;
  s += `<ellipse cx="${f(x + 0.4)}" cy="${f(top + rez / 2 + 0.3)}" rx="${f(rx * 0.62)}" ry="${f(pw * 0.13)}" fill="#6B5530" transform="rotate(${f(a)} ${c})"/>`;
  return s;
}

/** Stín kolíčku na trávě a trs stébel přes patu */
function pata(k: Kolik, i: number) {
  const { x, zem, pw } = k;
  const R = nahoda(7500 + i * 7);
  const stinS = `<ellipse cx="${f(x + pw * 1.3)}" cy="${f(zem + 3)}" rx="${f(pw * 2.1)}" ry="${f(pw * 0.42)}" fill="url(#ko-sn-stin-paty)"/>`;
  const tridy = ["svt-trava-1", "svt-trava-2", "svt-trava-3", "ko-trava-sucha"];
  const po = new Map<string, string>();
  for (let j = 0; j < 6; j++) {
    const bx = x + (R() - 0.5) * pw * 3.2;
    const by = zem + 3 + R() * 6;
    const h = 10 + R() * 12;
    const bw = 2.4 + R() * 3;
    const l = (R() - 0.4) * h * 0.55;
    const d = `M${f(bx - bw / 2)} ${f(by)}Q${f(bx + l * 0.35)} ${f(by - h * 0.6)} ${f(bx + l)} ${f(by - h)}Q${f(bx + l * 0.45)} ${f(by - h * 0.55)} ${f(bx + bw / 2)} ${f(by)}Z`;
    const t = tridy[Math.floor(R() * tridy.length)];
    po.set(t, (po.get(t) ?? "") + d);
  }
  return { stin: stinS, trs: [...po].map(([t, d]) => `<path class="${t}" d="${d}"/>`).join("") };
}

/** Stébla přes ležící šňůru, ať je opravdu v trávě (hustota podle délky) */
function steblaPres(tvar: (t: number) => Bod, w: number) {
  const R = nahoda(7700);
  const n = Math.max(7, Math.round(delkaTvaru(tvar, 20) / 55));
  let d1 = "", d2 = "";
  for (let i = 0; i < n; i++) {
    const [x, y] = tvar(0.12 + (i / n) * 0.8 + R() * 0.04);
    const h = 9 + R() * 9 + w;
    const l = (R() - 0.5) * 10;
    const bw = 2.2 + R() * 2;
    const d = `M${f(x - bw / 2)} ${f(y + w * 0.9)}Q${f(x + l * 0.3)} ${f(y - h * 0.5)} ${f(x + l)} ${f(y - h * 0.8)}Q${f(x + l * 0.4)} ${f(y - h * 0.4)} ${f(x + bw / 2)} ${f(y + w * 0.9)}Z`;
    if (i % 2) d1 += d;
    else d2 += d;
  }
  return `<path class="svt-trava-1" d="${d1}"/><path class="svt-trava-2" d="${d2}"/>`;
}

/** Jeden volný kus: šňůra a ozdoby svátku; `kmit` přidá výchylku (drnknutí) */
export function rozpetiSvg(s: Snura, r: Rozpeti, kmit?: (t: number) => number) {
  const k = snuraKus(sKmitem(r.tvar, kmit), r.w0, r.w1, "ko-sn-pole");
  let out = k.svg;
  if (s.m.svatek) {
    r.ozdoby.forEach((o, i) => {
      const b = k.p.bod(o.t);
      out += `<g transform="translate(${f(b.x)} ${f(b.y + b.w * 0.3)})">${zaves(s.m.svatek!, Math.round(r.body[0][0] / 37 + i), o.m)}</g>`;
    });
  }
  return out;
}

/** Stín volného kusu na louce (vrhá ho visící šňůra, leží o kus níž) */
export function rozpetiStin(s: Snura, r: Rozpeti, kmit?: (t: number) => number) {
  const w = (r.w0 + r.w1) / 2;
  return stin(osaTvaru(sKmitem(r.tvar, kmit), 24), w, w * 1.4, w * 3.4);
}

/** Vrabec sedící na šňůře nebo na kolíčku */
export function vrabecSvg(s: Snura) {
  const v = s.vrabec;
  if (!v) return "";
  const m = omez((s.w / 6.6) * 0.95, 0.62, 1.05);
  return `<g class="ko-sn-vrabec ko-vrabec" transform="translate(${f(v.b[0])} ${f(v.b[1])}) rotate(${f(v.uhel)}) scale(${v.zrcadlo ? -f(m) : f(m)} ${f(m)})"><g class="ko-sn-vrabec-telo">${vrabec()}</g></g>`;
}

const DEFS = `<linearGradient id="ko-sn-bambus" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#806A38"/><stop offset="0.22" stop-color="#E6D39A"/><stop offset="0.45" stop-color="#CDB674"/><stop offset="0.8" stop-color="#9A8248"/><stop offset="1" stop-color="#6E5A2E"/>
  </linearGradient>
  <linearGradient id="ko-sn-valec" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#2A1208" stop-opacity="0.5"/><stop offset="0.2" stop-color="#2A1208" stop-opacity="0"/><stop offset="0.3" stop-color="#FFF4E0" stop-opacity="0.14"/><stop offset="0.45" stop-color="#FFF4E0" stop-opacity="0"/><stop offset="0.72" stop-color="#2A1208" stop-opacity="0"/><stop offset="1" stop-color="#2A1208" stop-opacity="0.55"/>
  </linearGradient>
  <radialGradient id="ko-sn-stin-paty"><stop offset="0" stop-color="#1E2A12" stop-opacity="0.34"/><stop offset="1" stop-color="#1E2A12" stop-opacity="0"/></radialGradient>`;

/** Kus na trám vývěsky: nad čarou `rez` patří za obsah, pod ní přes střechu */
function naTramSvg(s: Snura, pod: boolean) {
  const k = s.konec!;
  const id = pod ? "ko-sn-rez-pod" : "ko-sn-rez-nad";
  const H = s.m.H;
  const kus = snuraKus(k.naTram, k.w, k.w, "ko-sn-natram");
  return `<clipPath id="${id}" clipPathUnits="userSpaceOnUse"><rect x="0" y="${pod ? 0 : f(k.rez)}" width="${f(s.m.W)}" height="${f(pod ? k.rez : H - k.rez)}"/></clipPath>
    <g clip-path="url(#${id})">${stin(kus.osa, k.w, k.w * 1.2, k.w * 2.6)}${kus.svg}</g>`;
}

/** Vrstva za obsahem: ležící kus, kolíčky, volné kusy, vrabec a horní část kusu k vývěsce */
export function snuraPod(s: Snura) {
  let stiny = "", tyce = "", ovinuti = "", trsy = "";
  const lk = snuraKus(s.lezi.tvar, s.lezi.w0, s.lezi.w1, "ko-sn-lezi");
  let lezi = stin(lk.osa, s.lezi.w0, 1.2, 2.2) + lk.svg + steblaPres(s.lezi.tvar, s.lezi.w0);
  if (s.lezi2) {
    const l2 = snuraKus(s.lezi2.tvar, s.lezi2.w0, s.lezi2.w1, "ko-sn-lezi");
    lezi += stin(l2.osa, s.lezi2.w0, 1.2, 2.2) + l2.svg + steblaPres(s.lezi2.tvar, s.lezi2.w0);
  }
  s.koliky.forEach((k, i) => {
    const p = pata(k, i);
    stiny += p.stin;
    trsy += p.trs;
    tyce += bambus(k);
    const rr = k.pw / 2 + k.sw * 0.12;
    /* uvázání nahoře: tři těsné otáčky */
    ovinuti += ovin(k.x, rr, k.uzel - k.sw * 1.1, k.uzel + k.sw * 1.5, k.sw, k.sw * 1.05);
    if (k.ovin) ovinuti += ovin(k.x, rr, k.ovin[0], k.ovin[1], k.sw, Math.max(k.sw * 3.6, k.pw * 2.2));
  });
  const kusyStiny = s.rozpeti.map((r, i) => `<g class="ko-sn-stin" data-i="${i}">${rozpetiStin(s, r)}</g>`).join("");
  const kusy = s.rozpeti.map((r, i) => `<g class="ko-sn-rozpeti" data-i="${i}">${rozpetiSvg(s, r)}</g>`).join("");
  return `<defs>${DEFS}</defs>
    <g class="ko-sn-stiny">${stiny}${kusyStiny}</g>
    <g class="ko-sn-lezici">${lezi}</g>
    <g class="ko-sn-tyce">${tyce}</g>
    <g class="ko-sn-kusy">${kusy}</g>
    <g class="ko-sn-ovinuti">${ovinuti}</g>
    ${s.konec ? naTramSvg(s, true) : ""}
    <g class="ko-sn-trsy">${trsy}</g>
    ${vrabecSvg(s)}`;
}

/** Připínáček přes šňůru (jako ty, co drží papíry na vývěsce) */
const spendlik = ([x, y]: Bod, r: number) =>
  `<ellipse cx="${f(x + r * 0.35)}" cy="${f(y + r * 0.55)}" rx="${f(r * 1.05)}" ry="${f(r * 0.8)}" fill="#140A05" opacity="0.3"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="url(#ko-sn-hlavicka)"/><ellipse cx="${f(x - r * 0.32)}" cy="${f(y - r * 0.36)}" rx="${f(r * 0.3)}" ry="${f(r * 0.2)}" fill="#FFFFFF" opacity="0.45"/>`;

/** Uzlíček u kotvy: tři těsné otáčky přes spoj s šňůrou nakreslenou na stojanu */
function uzlik(u: Snura["uzly"][number]) {
  const w = u.w;
  return `<g class="ko-sn-uzlik" transform="translate(${f(u.b[0])} ${f(u.b[1])}) rotate(${f(u.uhel - 90)})">${ovin(0, w * 0.62, -w * 1.25, w * 1.0, w * 0.82, w * 0.86)}</g>`;
}

/** Vrstva nad obsahem: uzlíčky u kotev, kus přes střechu vývěsky, konec trámu, deska a vstup do mapy */
export function snuraNad(s: Snura) {
  const uzly = s.uzly.map(uzlik).join("");
  if (!s.konec) return `<defs>${DEFS}</defs>${uzly}`;
  const { poDesce, spendliky, hak, hakR, wMapy, w } = s.konec;
  const b = snuraKus(poDesce, w, wMapy, "ko-sn-podesce", 8);
  const r = omez(w * 1.25, 6.5, 8.5);
  /* omotávka kolem hlavice trámu */
  const [hx, hy] = hak;
  let omot = "";
  for (let k = 0; k < 2; k++) {
    const y = hy - hakR * 0.35 + k * w * 1.1;
    omot += provazekSvg(provazek((t: number): Bod => [hx - hakR * 1.02 + 2 * hakR * 1.02 * t, y + Math.sin(t * Math.PI) * hakR * 0.28 + t * w * 0.5], w, w, 0, 10), "ko-sn-tram", w);
  }
  return `<defs>${DEFS}<radialGradient id="ko-sn-hlavicka" cx="0.36" cy="0.32" r="0.7"><stop offset="0" stop-color="#F6A089"/><stop offset="0.58" stop-color="#C4432B"/><stop offset="1" stop-color="#7E1F12"/></radialGradient></defs>
    ${uzly}
    ${naTramSvg(s, false)}
    ${stin(b.osa, w, 1.6, 2.4)}${b.svg}
    <g class="ko-sn-hak">${omot}<rect x="${f(hx - hakR * 1.1)}" y="${f(hy - hakR * 0.6)}" width="${f(hakR * 2.2)}" height="${f(w * 2.6)}" fill="url(#ko-sn-valec)"/></g>
    ${spendliky.map((p) => spendlik(p, r)).join("")}`;
}
