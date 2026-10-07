/**
 * Zvonkohra v hlavičce nového vzhledu — tvar a fyzika, bez prohlížeče.
 *
 * Z obrácené misky visí na šňůrkách pět trubek, uprostřed na delší šňůrce
 * dřevěné srdce a pod ním papírek tanzaku, do kterého se opírá vítr.
 * Papírek táhne srdce, srdce narazí do trubky a ta zazní. Ladění je
 * pentatonika G dur (g¹ h¹ d² e² a²): žádné dva tóny spolu nedrhnou,
 * ať vítr udeří kamkoli. Délky trubek z tónů opravdu vycházejí —
 * kmitočet trubky klesá se čtvercem délky.
 *
 * Barvy jsou ze soumraku v logu: nejhlubší trubka je noc, nejvyšší
 * rumělka. Dlouhé tmavé trubky visí po stranách, kratší a teplejší
 * uvnitř — střed zůstane volný pro srdce a papírek.
 *
 * Počítá se ve třech rozměrech (x doprava, y dolů, z k divákovi) a kreslí
 * se mírně shora: co je blíž, je na obrazovce o kousek níž. Body se hýbou
 * po malých krocích a šňůrky je drží na délce (position based dynamics).
 * Modul nesahá na window ani document — Zvonkohra.astro z něj vykreslí
 * klidovou polohu už při buildu.
 */

/** O kolik se hloubka promítne do výšky na obrazovce — díváme se mírně shora */
export const SKLON = 0.22;

/** Počátek souřadnic je ve středu kroužku, za který zvonkohra visí */
export const KROUZEK_R = 2.3;
export const MISKA = { noha: 6.5, nohaR: 4.6, pata: 8.8, okraj: 17.5, r: 15.5 };
export const PRUMER = 4.4;
export const SRDCE_R = 6;
export const PAPIR = { sirka: 10, vyska: 28 };

const KRUH_R = 11.5;
const ZAVES_Y = 14;
const SNURKA = 9.5;
const SRDCE_ZAVES = 12;
const SRDCE_SNURKA = 33;
const PAPIR_SNURKA = 24;
const NEJDELSI = 50;

export interface Trubka {
  /** Hz */
  ton: number;
  barva: string;
  delka: number;
  /** Místo na kruhu pod miskou */
  x: number;
  z: number;
}

/* Úhel na kruhu: −90° je vzadu uprostřed, 90° by bylo vpředu (tam nic
   nevisí, aby trubka nezakryla srdce), 0° vpravo */
export const TRUBKY: Trubka[] = (
  [
    [392.0, "#2A2C5E", 198],
    [493.88, "#4E4A84", -18],
    [587.33, "#7A5E8E", 126],
    [659.26, "#C0708A", 54],
    [880.0, "#C4432B", -90],
  ] as const
).map(([ton, barva, uhel]) => ({
  ton,
  barva,
  delka: NEJDELSI * Math.sqrt(392 / ton),
  x: KRUH_R * Math.cos((uhel * Math.PI) / 180),
  z: KRUH_R * Math.sin((uhel * Math.PI) / 180),
}));

export interface Uder {
  trubka: number;
  /** Hz */
  ton: number;
  /** 0–1 podle rychlosti nárazu */
  sila: number;
  /** Kde na obrazovce trubka visí: −1 vlevo … 1 vpravo */
  kde: number;
}

export interface Usecka {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}
export interface Poloha {
  /** Náklon misky ve stupních */
  miska: number;
  trubky: (Usecka & { x: number; y: number; uhel: number; lesk: number })[];
  srdce: Usecka & { x: number; y: number; uhel: number };
  papir: Usecka & { x: number; y: number; uhel: number; sirka: number };
  /** Pořadí kreslení zezadu dopředu: čísla trubek a −1 za srdce s papírkem */
  poradi: number[];
}

const G = 900;
/** Jak rychle vítr strhne část s sebou (1/s) — zároveň ji tlumí, když nefouká */
const ODPOR = { trubka: 0.45, srdce: 2, papir: 5 };
const PRUZNOST = 0.6;
/** Pod touhle rychlostí (px/s) se srdce trubky jen dotkne a nezazní */
const PRAH = 5;
const KROK = 1 / 240;

/** Hladký šum: průměr několika sinusovek s náhodnou fází, zhruba −1…1 */
const sum = (frekvence: number[]) => {
  const faze = frekvence.map(() => Math.random() * Math.PI * 2);
  return (t: number) => frekvence.reduce((s, f, i) => s + Math.sin(t * f * Math.PI * 2 + faze[i]), 0) / frekvence.length;
};
const hladce = (t: number) => t * t * (3 - 2 * t);

/**
 * Vítr: stálý vánek, který pomalu sílí a slábne, nárazy každých pár
 * desítek vteřin a vír, kvůli kterému se každá část hýbe trochu jinak.
 */
function vitr() {
  const zaklad = sum([0.011, 0.029, 0.047]);
  const smer = sum([0.017, 0.041]);
  const tres = sum([0.13, 0.31]);
  const smer0 = Math.random() * Math.PI * 2;
  let naraz = { od: 4 + Math.random() * 6, nabeh: 1.6, drzi: 1.5, dobeh: 3, sila: 45 };
  const planuj = (t: number) => {
    naraz = {
      od: t + 5 + -Math.log(1 - Math.random()) * 11,
      nabeh: 1 + Math.random() * 1.4,
      drzi: 0.6 + Math.random() * 2.2,
      dobeh: 2 + Math.random() * 2.5,
      sila: 22 + Math.random() * 48,
    };
  };
  return {
    rychlost: 0,
    x: 0,
    z: 0,
    /** Náraz hned teď — třeba když se zapne zvuk */
    zafoukej(t: number, sila: number) {
      naraz = { od: t, nabeh: 0.5, drzi: 0.4, dobeh: 2.2, sila };
    },
    spocitej(t: number, nasobek: number) {
      const n = naraz;
      const u = t - n.od;
      let narazy = 0;
      if (u > 0) {
        if (u < n.nabeh) narazy = hladce(u / n.nabeh);
        else if (u < n.nabeh + n.drzi) narazy = 1;
        else if (u < n.nabeh + n.drzi + n.dobeh) narazy = 1 - hladce((u - n.nabeh - n.drzi) / n.dobeh);
        else planuj(t);
      }
      this.rychlost = Math.max(0, (16 + 9 * zaklad(t) + n.sila * narazy) * (1 + 0.25 * tres(t)) * nasobek);
      const s = smer0 + 0.8 * smer(t);
      this.x = Math.cos(s) * this.rychlost;
      this.z = Math.sin(s) * this.rychlost;
    },
  };
}

/** Tlumený oscilátor na drobné pohyby: náklon misky, stočení, otáčení papírku */
const kyvadlo = (perioda: number, tlumeni: number) => {
  const w = (Math.PI * 2) / perioda;
  return {
    uhel: 0,
    rychlost: 0,
    krok(dt: number, cil: number, sila: number) {
      this.rychlost += (-w * w * (this.uhel - cil) - 2 * tlumeni * w * this.rychlost + sila) * dt;
      this.uhel += this.rychlost * dt;
    },
  };
};

export function zvonkohra() {
  const n = TRUBKY.length;
  const N = n * 2 + 2;
  const S = N - 2;
  const P = N - 1;
  const x = new Float64Array(N), y = new Float64Array(N), z = new Float64Array(N);
  const vx = new Float64Array(N), vy = new Float64Array(N), vz = new Float64Array(N);
  const ox = new Float64Array(N), oy = new Float64Array(N), oz = new Float64Array(N);
  /** Převrácená hmotnost a to, jak moc bod unáší vítr (1/s) */
  const w = new Float64Array(N);
  const odpor = new Float64Array(N);
  const zx = new Float64Array(n), zy = new Float64Array(n), zz = new Float64Array(n);
  let sx = 0;
  let sy = SRDCE_ZAVES;
  const lesk = new Float64Array(n);
  const posledni = new Float64Array(n).fill(-1);
  /* Víry: každá část dostane vítr trochu jinak — po větru silnější a slabší,
     napříč ji cuká do stran. Papírek třepotá nejrychleji. */
  const viry = [
    ...TRUBKY.map(() => [0.3, 0.2, [0.29, 0.67, 1.13]] as const),
    [0.35, 0.3, [0.53, 1.07, 1.9]] as const,
    [0.45, 0.55, [0.71, 1.37, 2.41]] as const,
  ].map(([po, napric, f]) => ({ po, napric, sumPo: sum([...f]), sumNapric: sum([...f]) }));
  /** Vítr u každé části: trubky po jedné, srdce, papírek */
  const wx = new Float64Array(n + 2), wz = new Float64Array(n + 2);
  const vanek = vitr();
  const miska = kyvadlo(1.6, 0.45);
  const stoceni = kyvadlo(3.4, 0.12);
  const otoceni = kyvadlo(2.1, 0.08);
  const stocVir = sum([0.09, 0.23, 0.41]);
  const otocVir = sum([0.15, 0.36, 0.7]);
  let cas = 0;
  let rozjezd = 0;

  /* Závěsy se otáčejí s miskou: kolem svislé osy (stočení) a v rovině obrazovky (náklon) */
  const zavesy = () => {
    const cs = Math.cos(stoceni.uhel), ss = Math.sin(stoceni.uhel);
    const cm = Math.cos(miska.uhel), sm = Math.sin(miska.uhel);
    TRUBKY.forEach((t, i) => {
      const x1 = t.x * cs - t.z * ss;
      zz[i] = t.x * ss + t.z * cs;
      zx[i] = x1 * cm - ZAVES_Y * sm;
      zy[i] = x1 * sm + ZAVES_Y * cm;
    });
    sx = -SRDCE_ZAVES * sm;
    sy = SRDCE_ZAVES * cm;
  };

  /* Trubky jsou těžké kovové a vítr je skoro neunáší; srdce je lehké dřevo
     a papírek chytá vítr nejvíc — právě on srdcem houpe. */
  zavesy();
  TRUBKY.forEach((t, i) => {
    const m = t.delka / 40;
    for (const [b, dy] of [[2 * i, SNURKA], [2 * i + 1, SNURKA + t.delka]]) {
      x[b] = zx[i];
      y[b] = zy[i] + dy;
      z[b] = zz[i];
      w[b] = 2 / m;
      odpor[b] = ODPOR.trubka;
    }
  });
  x[S] = 0;
  y[S] = SRDCE_ZAVES + SRDCE_SNURKA;
  w[S] = 1 / 0.35;
  odpor[S] = ODPOR.srdce;
  x[P] = 0;
  y[P] = y[S] + PAPIR_SNURKA;
  w[P] = 1 / 0.1;
  odpor[P] = ODPOR.papir;

  /** Šňůrka na pevném závěsu — jen táhne, povolit může */
  const naZavesu = (a: number, px: number, py: number, pz: number, delka: number) => {
    const dx = x[a] - px, dy = y[a] - py, dz = z[a] - pz;
    const d = Math.hypot(dx, dy, dz);
    if (d <= delka) return;
    const k = (d - delka) / d;
    x[a] -= dx * k;
    y[a] -= dy * k;
    z[a] -= dz * k;
  };
  /** Vazba dvou bodů; tuha = trubka (drží délku oběma směry), jinak šňůrka */
  const vazba = (a: number, b: number, delka: number, tuha: boolean) => {
    const dx = x[b] - x[a], dy = y[b] - y[a], dz = z[b] - z[a];
    const d = Math.hypot(dx, dy, dz) || 1e-9;
    if (!tuha && d <= delka) return;
    const k = (d - delka) / (d * (w[a] + w[b]));
    x[a] += w[a] * k * dx;
    y[a] += w[a] * k * dy;
    z[a] += w[a] * k * dz;
    x[b] -= w[b] * k * dx;
    y[b] -= w[b] * k * dy;
    z[b] -= w[b] * k * dz;
  };

  const srazky = (udery: Uder[]) => {
    const r = SRDCE_R + PRUMER / 2;
    for (let i = 0; i < n; i++) {
      const a = 2 * i, b = a + 1;
      const ex = x[b] - x[a], ey = y[b] - y[a], ez = z[b] - z[a];
      let u = ((x[S] - x[a]) * ex + (y[S] - y[a]) * ey + (z[S] - z[a]) * ez) / (ex * ex + ey * ey + ez * ez);
      u = Math.min(1, Math.max(0, u));
      let nx = x[S] - (x[a] + u * ex), ny = y[S] - (y[a] + u * ey), nz = z[S] - (z[a] + u * ez);
      const d = Math.hypot(nx, ny, nz);
      if (d >= r || d < 1e-6) continue;
      nx /= d;
      ny /= d;
      nz /= d;
      const wa = w[a] * (1 - u), wb = w[b] * u;
      const W = w[S] + wa * (1 - u) + wb * u;
      const posun = (r - d) / W;
      x[S] += w[S] * posun * nx;
      y[S] += w[S] * posun * ny;
      z[S] += w[S] * posun * nz;
      x[a] -= wa * posun * nx;
      y[a] -= wa * posun * ny;
      z[a] -= wa * posun * nz;
      x[b] -= wb * posun * nx;
      y[b] -= wb * posun * ny;
      z[b] -= wb * posun * nz;
      const vn =
        (vx[S] - (1 - u) * vx[a] - u * vx[b]) * nx +
        (vy[S] - (1 - u) * vy[a] - u * vy[b]) * ny +
        (vz[S] - (1 - u) * vz[a] - u * vz[b]) * nz;
      if (vn >= 0) continue;
      const j = (-(1 + PRUZNOST) * vn) / W;
      vx[S] += w[S] * j * nx;
      vy[S] += w[S] * j * ny;
      vz[S] += w[S] * j * nz;
      vx[a] -= wa * j * nx;
      vy[a] -= wa * j * ny;
      vz[a] -= wa * j * nz;
      vx[b] -= wb * j * nx;
      vy[b] -= wb * j * ny;
      vz[b] -= wb * j * nz;
      if (-vn > PRAH && cas - posledni[i] > 0.06) {
        posledni[i] = cas;
        const sila = Math.min(1, ((-vn - PRAH) / 35) ** 0.75);
        lesk[i] = Math.max(lesk[i], 0.35 + 0.65 * sila);
        udery.push({ trubka: i, ton: TRUBKY[i].ton, sila, kde: TRUBKY[i].x / KRUH_R });
      }
    }
  };

  const podkrok = (h: number, udery: Uder[]) => {
    for (let i = 0; i < N; i++) {
      const k = odpor[i];
      const j = i < S ? i >> 1 : i - S + n;
      vx[i] += k * (wx[j] - vx[i]) * h;
      vy[i] += (G - 0.3 * k * vy[i]) * h;
      vz[i] += k * (wz[j] - vz[i]) * h;
      ox[i] = x[i];
      oy[i] = y[i];
      oz[i] = z[i];
      x[i] += vx[i] * h;
      y[i] += vy[i] * h;
      z[i] += vz[i] * h;
    }
    for (let it = 0; it < 3; it++) {
      for (let i = 0; i < n; i++) {
        naZavesu(2 * i, zx[i], zy[i], zz[i], SNURKA);
        vazba(2 * i, 2 * i + 1, TRUBKY[i].delka, true);
      }
      naZavesu(S, sx, sy, 0, SRDCE_SNURKA);
      vazba(S, P, PAPIR_SNURKA, false);
    }
    for (let i = 0; i < N; i++) {
      vx[i] = (x[i] - ox[i]) / h;
      vy[i] = (y[i] - oy[i]) / h;
      vz[i] = (z[i] - oz[i]) / h;
    }
    srazky(udery);
    cas += h;
  };

  return {
    /** Vítr 0–1 — podle něj se řídí šum větru ve zvuku */
    get vitr() {
      return Math.min(1, vanek.rychlost / 70);
    },

    /** Posune čas o dt sekund; nasobek ztiší vítr (v noci je klidněji). Vrací údery. */
    krok(dt: number, nasobek = 1): Uder[] {
      const udery: Uder[] = [];
      dt = Math.min(dt, 1 / 20);
      if (dt <= 0) return udery;
      rozjezd = Math.min(1, rozjezd + dt / 3);
      vanek.spocitej(cas, nasobek * hladce(rozjezd));
      viry.forEach((v, j) => {
        const po = 1 + v.po * v.sumPo(cas);
        const napric = v.napric * v.sumNapric(cas);
        wx[j] = vanek.x * po - vanek.z * napric;
        wz[j] = vanek.z * po + vanek.x * napric;
      });
      miska.krok(dt, -0.0011 * vanek.x, 0);
      stoceni.krok(dt, 0, 0.05 * vanek.rychlost * stocVir(cas));
      otoceni.krok(dt, 0, 0.3 * vanek.rychlost * otocVir(cas));
      zavesy();
      const kroku = Math.ceil(dt / KROK);
      for (let k = 0; k < kroku; k++) podkrok(dt / kroku, udery);
      for (let i = 0; i < n; i++) lesk[i] *= Math.exp(-dt / 0.22);
      return udery;
    },

    /**
     * Ruka projela zvonkohrou: bod (bx, by) v souřadnicích kresby, rychlost
     * v px/s. Ruka je jako pohybující se stěna — co je v dosahu, zrychlí
     * nanejvýš na její rychlost, takže pomalý tah netlačí víc než rychlý.
     * Svislý pohyb ruky tlačí dopředu nebo dozadu, ať se trefí i trubky
     * vpředu a vzadu.
     */
    postrc(bx: number, by: number, rx: number, ry: number) {
      const omez = (v: number) => Math.max(-90, Math.min(90, v * 0.55));
      const dx = omez(rx);
      const dz = omez(ry) * (Math.random() < 0.5 ? -1 : 1);
      const postrcBod = (i: number, podil: number) => {
        const cx = dx * podil, cz = dz * podil;
        vx[i] = cx > 0 ? Math.max(vx[i], cx) : Math.min(vx[i], cx);
        vz[i] = cz > 0 ? Math.max(vz[i], cz) : Math.min(vz[i], cz);
      };
      const blizko = (i: number, j: number, dosah: number) => {
        const ax = x[i], ay = y[i] + z[i] * SKLON;
        const ex = x[j] - ax, ey = y[j] + z[j] * SKLON - ay;
        const u = Math.min(1, Math.max(0, ((bx - ax) * ex + (by - ay) * ey) / (ex * ex + ey * ey || 1)));
        return Math.hypot(bx - ax - u * ex, by - ay - u * ey) < dosah ? u : -1;
      };
      for (let i = 0; i < n; i++) {
        const u = blizko(2 * i, 2 * i + 1, PRUMER / 2 + 3);
        if (u < 0) continue;
        postrcBod(2 * i, 1 - u);
        postrcBod(2 * i + 1, u);
      }
      if (Math.hypot(bx - x[S], by - y[S] - z[S] * SKLON) < SRDCE_R + 3) postrcBod(S, 1);
      const px = x[P], py = y[P] + z[P] * SKLON;
      if (Math.abs(bx - px) < PAPIR.sirka / 2 + 2 && by > py - 2 && by < py + PAPIR.vyska + 2) {
        postrcBod(P, 1.4);
        postrcBod(S, 0.7);
        otoceni.rychlost += (Math.random() - 0.5) * 3;
      }
    },

    /** Rozhoupe zvonkohru, aby hned zazněla — po zapnutí zvuku */
    rozhoupej() {
      const s = Math.random() * Math.PI * 2;
      vx[S] += Math.cos(s) * 70;
      vz[S] += Math.sin(s) * 70;
      vanek.zafoukej(cas, 40);
      rozjezd = 1;
    },

    /**
     * Tah štětce v hlavičce zavadil o závěs a popotáhl ho doprava: miska se
     * nakloní a srdce s papírkem zůstanou kousek pozadu, takže se zhoupnou.
     * Slabší než rozhoupej() — zazní jen tehdy, když srdce trubku opravdu trefí.
     */
    cukni(sila: number) {
      miska.rychlost += 0.8 * sila;
      vx[S] -= 45 * sila;
      vx[P] -= 55 * sila;
    },

    poloha(): Poloha {
      const sy2 = (i: number) => y[i] + z[i] * SKLON;
      const trubky = TRUBKY.map((_, i) => {
        const a = 2 * i, b = a + 1;
        return {
          x1: zx[i],
          y1: zy[i] + zz[i] * SKLON,
          x2: x[a],
          y2: sy2(a),
          x: x[a],
          y: sy2(a),
          uhel: (Math.atan2(-(x[b] - x[a]), sy2(b) - sy2(a)) * 180) / Math.PI,
          lesk: lesk[i],
        };
      });
      const srdceUhel = (Math.atan2(-(x[S] - sx), sy2(S) - sy) * 180) / Math.PI;
      const papirUhel = (Math.atan2(-(x[P] - x[S]), sy2(P) - sy2(S)) * 180) / Math.PI;
      const vzadu: number[] = [];
      const vpredu: number[] = [];
      for (let i = 0; i < n; i++) ((z[2 * i] + z[2 * i + 1]) / 2 > z[S] ? vpredu : vzadu).push(i);
      const hloubka = (i: number) => z[2 * i] + z[2 * i + 1];
      vzadu.sort((a, b) => hloubka(a) - hloubka(b));
      vpredu.sort((a, b) => hloubka(a) - hloubka(b));
      return {
        miska: (miska.uhel * 180) / Math.PI,
        trubky,
        srdce: { x1: sx, y1: sy, x2: x[S], y2: sy2(S), x: x[S], y: sy2(S), uhel: srdceUhel },
        papir: { x1: x[S], y1: sy2(S), x2: x[P], y2: sy2(P), x: x[P], y: sy2(P), uhel: papirUhel, sirka: Math.cos(otoceni.uhel) },
        poradi: [...vzadu, -1, ...vpredu],
      };
    },
  };
}

export type Zvonkohra = ReturnType<typeof zvonkohra>;

/** Kam se poloha zapíše: klíč prvku (data-zk), atribut, hodnota */
export type Zapisovac = (klic: string, atribut: string, hodnota: string) => void;

const f = (v: number) => (Math.round(v * 100) / 100).toString();

/** Převede polohu na atributy kresby — stejně při buildu, v prohlížeči i ve zkoušce */
export function zapis(p: Poloha, nastav: Zapisovac) {
  nastav("miska", "transform", `rotate(${f(p.miska)})`);
  const cara = (klic: string, u: Usecka) => {
    nastav(klic, "x1", f(u.x1));
    nastav(klic, "y1", f(u.y1));
    nastav(klic, "x2", f(u.x2));
    nastav(klic, "y2", f(u.y2));
  };
  p.trubky.forEach((t, i) => {
    cara(`snurka-${i}`, t);
    nastav(`telo-${i}`, "transform", `translate(${f(t.x)} ${f(t.y)}) rotate(${f(t.uhel)})`);
    nastav(`lesk-${i}`, "opacity", f(t.lesk * 0.75));
  });
  cara("srdce-snurka", p.srdce);
  nastav("srdce", "transform", `translate(${f(p.srdce.x)} ${f(p.srdce.y)}) rotate(${f(p.srdce.uhel)})`);
  cara("papir-snurka", p.papir);
  const sirka = Math.max(0.04, Math.abs(p.papir.sirka));
  nastav("papir", "transform", `translate(${f(p.papir.x)} ${f(p.papir.y)}) rotate(${f(p.papir.uhel)}) scale(${f(sirka)} 1)`);
  nastav("papir-lic", "visibility", p.papir.sirka >= 0 ? "visible" : "hidden");
  nastav("papir-rub", "visibility", p.papir.sirka >= 0 ? "hidden" : "visible");
}
