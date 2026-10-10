/*
 * 01, Kami — POD SAKUROU
 *
 * Hlínka spí u kořenů velkého stromu — tak to o ní stojí v partě. Strom je
 * posvátný (shinboku): převislá sakura shidarezakura se slaměným provazem
 * a papírky shide na kmeni. Naklání se nad ni zprava, koruna se jí klene
 * nad hlavou a za korunou visí bledý kotouč jako svatozář.
 *
 * Kreslená je stejně jako Hlínka s lampionem (./lampion.js): čistá hrouda
 * s měkkým světlem, štíhlý kmen, málo velkých květů místo tisíce teček,
 * žádná textura a žádný ostrov — pod ní je jen stín a spadané lístky.
 * Původní sakura (v1 v ./kresby.js) zůstala v komponentě, na stránce není.
 *
 * Myš je vítr: pruty se od kurzoru odklánějí a rychlé mávnutí z nich
 * strhne lístky. Lístky padají a zůstávají ležet na zemi i na Hlínce.
 * Kliknutí: jeden lístek jí přistane na nose, Hlínka se nadechne a kýchne,
 * strom se otřese a spadne vánice lístků (hanafubuki); další kliknutí do
 * toho jen zafouká. Když ji někdo lechtá rychlým pohybem myši, chichotá
 * se. Na větvi sedí sedmihlásek uguisu a občas zazpívá.
 */
import {
  f, rng, clamp, lerp, smooth, rad, pt, cara, hladka, vzorkuj, naCare, pasPoBodech, kvetD, LISTEK, pruzina,
  HL, hlDefs, hlTelo, hlNohy, hlVyhonek, hlTvar, zzz, svetylko, kCili,
} from "./spolecne.js";

const ID = "hzk";
const ZEM = 160;
const FIG = { x: 86, s: 0.66 };
const POSTAVA = `translate(${FIG.x} ${ZEM}) scale(${FIG.s}) translate(-90 -${HL.spodek})`;
const vPostave = (s) => `<g transform="${POSTAVA}">${s}</g>`;
const naPanel = ([x, y]) => [FIG.x + (x - 90) * FIG.s, ZEM + (y - HL.spodek) * FIG.s];
const STRED = naPanel([90, 98]), R_TELA = 48 * FIG.s;
const NOS = [90, 101];
const KORA = "#5B4447", KORA_SV = "#8E7370", KORA_TM = "#463335";
const KOTOUC = { x: 92, y: 60, r: 47 };
const T_PADA = 0.9, T_SEDI = 0.75, T_NADECH = 0.6, T_KYCH = 0.4, T_PO = 1.4;

/* ——— Strom: kmen nakloněný zprava nad Hlínku, pět větví, převislé pruty ——— */
const KMEN = vzorkuj([[135, 162], [132.4, 148], [129, 133], [124.4, 117], [118, 101], [110, 85], [102, 71], [96, 59]], 5);
const sirkaKmene = (q) => lerp(11, 4.8, Math.pow(q, 0.8));
const VETVE = [
  { P: [[97, 63], [84, 48], [66, 40], [48, 42], [34, 51], [27, 61]], w: [4.8, 1.2], prutu: 5 },
  { P: [[98, 61], [113, 47], [130, 39], [145, 41], [155, 50], [160, 60]], w: [4.8, 1.2], prutu: 5 },
  { P: [[95, 59], [92, 45], [94, 31], [100, 20], [108, 14]], w: [3.6, 0.9], prutu: 2 },
  { P: [[94, 55], [82, 41], [72, 28], [60, 21], [49, 20]], w: [3, 0.8], prutu: 3 },
  { P: [[97, 55], [110, 39], [121, 27], [132, 21], [142, 21]], w: [3, 0.8], prutu: 3 },
].map((v) => ({ ...v, B: vzorkuj(v.P, 5) }));
/*
 * Pruty jako fontána: z větve vyrazí šikmo ven a pak padají. Nad Hlínkou
 * jsou krátké, po stranách dlouhé, takže ji koruna rámuje jako oblouk.
 * Každý má tři články s klouby J0–J2, při kreslení vnořené do sebe — když
 * se natočí horní kloub, jde s ním celý zbytek prutu.
 */
const PRUTY = (() => {
  const R = rng(1904);
  const P = [];
  VETVE.forEach((v, vi) => {
    for (let k = 0; k < v.prutu; k++) {
      const s = lerp(0.34, 1, (k + 0.3 + R() * 0.4) / v.prutu);
      const { p } = naCare(v.B, s);
      const dx = p[0] - 90, o = clamp(Math.abs(dx) / 72), smer = dx < 0 ? -1 : 1;
      /* nad hlavou končí nad výhonkem, jinak čím dál od kmene, tím níž */
      const konecY = Math.abs(dx) < 40 ? 62 + R() * 13 : 96 + 36 * Math.pow(o, 1.2) + (R() - 0.5) * 12;
      const L = Math.max(22, konecY - p[1]);
      const J0 = [p[0], p[1] + 0.6];
      const J1 = [J0[0] + smer * (3 + 6 * o) * (0.8 + R() * 0.4), J0[1] + L * 0.28];
      const J2 = [J1[0] + smer * (1 + 2.4 * o), J1[1] + L * 0.34];
      const J3 = [J2[0] + smer * 0.5 * o + (R() - 0.5) * 2, J2[1] + L * 0.38];
      P.push({ J: [J0, J1, J2, J3], L, o, fz: R() * 6.28, seed: 31 + vi * 100 + k });
    }
  });
  return P;
})();
/* květ jako <use>: tři natočení ve dvou odstínech, poupě a lístek */
/* dva květy ze tří jsou světlé */
const kvet = (x, y, m, r) => `<use href="#${ID}-k${r < 0.66 ? Math.floor(r * 4.5) : 3 + Math.floor((r - 0.66) * 8.8)}" transform="translate(${f(x)} ${f(y)}) scale(${f(m)})"/>`;
const poupe = (x, y, m, uhel) => `<use href="#${ID}-poupe" transform="translate(${f(x)} ${f(y)}) rotate(${f(uhel)}) scale(${f(m)})"/>`;
const listecek = (x, y, m, uhel) => `<path d="M0 0 C1.4 -1.6 3.6 -1.6 4.6 0 C3.6 1.2 1.4 1.2 0 0 Z" transform="translate(${f(x)} ${f(y)}) rotate(${f(uhel)}) scale(${f(m)})" fill="#A6AB76" stroke="#7C8556" stroke-width="0.3"/>`;
/** Květy podél článku prutu: střídavě vlevo a vpravo, ke špičce menší a poupata. */
const kvetyClanku = (p, c) => {
  const r = rng(p.seed * 7 + c);
  const A = p.J[c], B = p.J[c + 1];
  const d = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1;
  const n = Math.max(2, Math.round(d / 4.7));
  const nx = -(B[1] - A[1]) / d, ny = (B[0] - A[0]) / d;
  let s = "";
  for (let i = 0; i < n; i++) {
    const u = (i + 0.3 + r() * 0.4) / n, cely = (c + u) / 3;
    const strana = (i + c) % 2 ? 1 : -1, off = (1.1 + r() * 1.5) * strana;
    const x = lerp(A[0], B[0], u) + nx * off, y = lerp(A[1], B[1], u) + ny * off;
    if (cely > 0.82 && r() < 0.6) s += poupe(x, y, 0.8 + r() * 0.3, 60 + r() * 60);
    else {
      if (r() < 0.16) s += listecek(x, y, 0.8 + r() * 0.4, strana > 0 ? 20 + r() * 40 : 120 + r() * 40);
      s += kvet(x, y, lerp(1.08, 0.66, cely) * (0.86 + r() * 0.3), r());
    }
  }
  return s;
};
const PRUTY_KVETY = PRUTY.map((p) => [0, 1, 2].map((c) => kvetyClanku(p, c)));
const prutSvg = (p, i, uhly) => {
  let s = "";
  for (let c = 2; c >= 0; c--)
    s =
      `<g data-u="${i * 3 + c}" transform="rotate(${f(uhly[i * 3 + c])} ${pt(p.J[c])})">` +
      `<path d="M${pt(p.J[c])} L${pt(p.J[c + 1])}" stroke="#6B4A4C" stroke-width="${[0.85, 0.62, 0.44][c]}" stroke-linecap="round"/>` +
      `${PRUTY_KVETY[i][c]}${s}</g>`;
  return s;
};
const vrstvaPruty = (st) => PRUTY.map((p, i) => prutSvg(p, i, st.uhly)).join("");
const uzlyPrutu = (st) => st.uhly.map((a, k) => ({ transform: `rotate(${f(a)} ${pt(PRUTY[Math.floor(k / 3)].J[k % 3])})` }));

const SHIME = (() => {
  const { p, smer } = naCare(KMEN, 0.3);
  return { p, n: [-smer[1], smer[0]], w: sirkaKmene(0.3) };
})();
const vrstvaStrom = () => {
  let s = "";
  /* kořenové náběhy mizí ve stínu */
  for (const B of [[[131, 152], [127, 158], [120, 162.4]], [[136, 152], [142, 158.6], [150, 162.4]], [[133, 154], [134, 160], [137, 164]]])
    s += `<path d="${pasPoBodech(vzorkuj(B, 4), (q) => lerp(5.6, 0.8, q))}" fill="${KORA}"/>`;
  for (const v of VETVE) s += `<path d="${pasPoBodech(v.B, (q) => lerp(v.w[0], v.w[1], q))}" fill="${KORA}"/>`;
  s += `<path d="${pasPoBodech(KMEN, sirkaKmene)}" fill="url(#${ID}-kmen)" stroke="${KORA_TM}" stroke-width="0.5" stroke-linejoin="round"/>`;
  /* kůra sakury: vodorovné čárky lenticel a světlo po levé hraně */
  const n = KMEN.length - 1;
  for (let i = 2; i < n - 2; i += 3) {
    const { p, smer } = naCare(KMEN, i / n);
    const w = sirkaKmene(i / n), nx = -smer[1], ny = smer[0], z = (i / 3) % 2 ? 1 : -1;
    s += `<path d="M${f(p[0] + nx * w * 0.36 * z)} ${f(p[1] + ny * w * 0.36 * z)} L${f(p[0] - nx * w * 0.08 * z)} ${f(p[1] - ny * w * 0.08 * z)}" stroke="${KORA_SV}" stroke-width="0.6" stroke-linecap="round" opacity="0.75"/>`;
  }
  const hrana = KMEN.filter((_, i) => i > 2 && i < n - 1).map((_, k) => {
    const { p, smer } = naCare(KMEN, (k + 3) / n);
    const w = sirkaKmene((k + 3) / n);
    return [p[0] + smer[1] * w * 0.3, p[1] - smer[0] * w * 0.3];
  });
  s += `<path d="${cara(hrana)}" stroke="#A98C86" stroke-width="0.7" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.55"/>`;
  /* květy přímo na větvích, ať je koruna plná i tam, kde nevisí prut */
  const r = rng(77);
  for (const v of VETVE)
    for (let k = 1; k < v.B.length - 1; k += 2) {
      const [x, y] = v.B[k], q = k / v.B.length;
      for (let j = 0; j < 2; j++) s += kvet(x + (r() - 0.5) * 6, y - 1.6 - r() * 3.4 + j * 2.6, lerp(1.15, 0.8, q) * (0.85 + r() * 0.3), r());
      if (r() < 0.5) s += poupe(x + (r() - 0.5) * 7, y - 4 - r() * 2, 0.9, -90 + (r() - 0.5) * 70);
    }
  return s;
};
/** Slaměný provaz kolem kmene a tři papírky, které se houpou ve větru. */
const SHIDE = "M0 0 h2.6 v3.2 h2 v3.2 h2 v3.6 h-2.8 v-3.2 h-2 v-3.2 h-1.8 Z";
const vrstvaProvaz = (st) => {
  const { p, n, w } = SHIME;
  const A = [p[0] - n[0] * (w / 2 + 1.2), p[1] - n[1] * (w / 2 + 1.2)], B = [p[0] + n[0] * (w / 2 + 1.2), p[1] + n[1] * (w / 2 + 1.2)];
  let s = "";
  [0.2, 0.52, 0.84].forEach((q, i) => {
    const x = lerp(A[0], B[0], q), y = lerp(A[1], B[1], q) + 1;
    s += `<path d="${SHIDE}" transform="translate(${f(x - 1.6)} ${f(y)}) rotate(${f(st.vitr * 16 + 3 * Math.sin(st.t * 1.7 + i * 1.9) + st.otres * 12 * Math.sin(st.t * 28 + i))} 1.4 0) scale(0.92)" fill="#FFFDF6" stroke="#B5A78C" stroke-width="0.35" stroke-linejoin="round"/>`;
  });
  s += `<path d="M${pt(A)} L${pt(B)}" stroke="#8A6E3A" stroke-width="4.2" stroke-linecap="round"/><path d="M${pt(A)} L${pt(B)}" stroke="#DCC384" stroke-width="3" stroke-linecap="round"/>`;
  for (const q of [0.14, 0.34, 0.54, 0.74, 0.94]) {
    const x = lerp(A[0], B[0], q), y = lerp(A[1], B[1], q);
    s += `<path d="M${f(x - 0.9)} ${f(y + 1.3)} L${f(x + 0.5)} ${f(y - 1.5)}" stroke="#A88B4E" stroke-width="0.5" stroke-linecap="round"/>`;
  }
  return s;
};

/* ——— Zem: žádný ostrov, jen stíny a co napadalo ——— */
const vrstvaZem = () =>
  `<ellipse cx="96" cy="${ZEM + 1.4}" rx="72" ry="6.4" fill="url(#${ID}-stin)"/>` +
  `<ellipse cx="${FIG.x - 1}" cy="${ZEM + 0.3}" rx="27" ry="2.7" fill="#2B2420" opacity="0.16"/>` +
  `<ellipse cx="136" cy="${ZEM + 2}" rx="15" ry="2" fill="#2B2420" opacity="0.14"/>`;
const listekSvg = (x, y, rot, mx, my, op = 1) => `<use href="#${ID}-listek" transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(mx)} ${f(my)})"${op < 0.99 ? ` opacity="${f(op)}"` : ""}/>`;
const vrstvaLezici = (st) => st.lezici.map((l) => listekSvg(l.x, l.y, l.rot, l.m, l.m * 0.52)).join("");
const vrstvaKotouc = () =>
  `<circle cx="${KOTOUC.x}" cy="${KOTOUC.y}" r="${KOTOUC.r + 16}" fill="url(#${ID}-zare)"/>` +
  `<circle cx="${KOTOUC.x}" cy="${KOTOUC.y}" r="${KOTOUC.r}" fill="url(#${ID}-kotouc)"/>` +
  `<circle cx="${KOTOUC.x}" cy="${KOTOUC.y}" r="${KOTOUC.r - 0.4}" fill="none" stroke="#EFD49C" stroke-width="0.5" opacity="0.7"/>`;

/* ——— Sedmihlásek na levé větvi ——— */
const BIDLO = (() => {
  const { p } = naCare(VETVE[0].B, 0.5);
  return [p[0], p[1] - 4.4];
})();
const NOTA = "M0 0 V-4.6 L2.6 -5.4 V-4.2 L0.7 -3.6 V0.2 A1.3 1 0 1 1 0 0 Z";
const vrstvaPtak = (st) => {
  const b = st.ptak;
  const [x, y] = [BIDLO[0], BIDLO[1] - b.vyska];
  let s = `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(b.naklon)})">`;
  s += `<path d="M-4.2 0.4 L-10 ${f(2.2 - b.zpev * 2.4)} L-9.4 ${f(0.2 - b.zpev * 2.4)} L-4.6 -1.2 Z" fill="#7C8052"/>`;
  if (b.vyska < 0.4) s += `<path d="M-0.8 3.2 v1.8 M1.2 3.2 v1.8" stroke="#6B5D4F" stroke-width="0.5" stroke-linecap="round"/>`;
  s += `<ellipse cx="0" cy="0" rx="5" ry="${f(3.6 + 0.5 * b.zpev)}" fill="#9BA06A" stroke="#6B7048" stroke-width="0.4"/>`;
  s += `<path d="M-3.6 1.3 Q0.2 4.6 4 0.9 Q1 2.9 -3.6 1.3 Z" fill="#E9E4C6"/>`;
  s += `<path d="M-3.2 -0.8 Q0 -2.6 2.4 0 Q-0.4 1.6 -3.6 0.8 Z" transform="rotate(${f(-b.kridla * 62)} -3 0)" fill="#84895A" stroke="#6B7048" stroke-width="0.3"/>`;
  s += `<circle cx="4.2" cy="-2.6" r="2.7" fill="#9BA06A" stroke="#6B7048" stroke-width="0.4"/><path d="M3 -3.7 Q4.6 -4.6 6.2 -3.6" stroke="#E9E4C6" stroke-width="0.5" stroke-linecap="round" fill="none"/>`;
  s += `<circle cx="5" cy="-2.8" r="0.6" fill="#2B2420"/><circle cx="5.2" cy="-3" r="0.2" fill="#FFFFFF"/>`;
  s += `<path d="M6.6 -2.9 L9.4 -2.5 L6.7 -2.2 Z" transform="rotate(${f(-18 * b.zpev)} 6.7 -2.5)" fill="#6B5D4F"/><path d="M6.6 -2.4 L9 -2.2 L6.7 -1.8 Z" transform="rotate(${f(16 * b.zpev)} 6.7 -2.2)" fill="#55493E"/>`;
  s += `</g>`;
  /* když zpívá, stoupají od zobáku noty */
  if (b.noty > 0)
    for (let i = 0; i < 3; i++) {
      const u = b.noty * 1.25 - i * 0.22;
      if (u <= 0 || u >= 1) continue;
      s += `<path d="${NOTA}" transform="translate(${f(x + 11 + u * 9 + Math.sin(u * 6 + i) * 2)} ${f(y - 4 - u * 13)}) rotate(${f(-10 + i * 12)}) scale(0.9)" fill="#7C8556" opacity="${f(Math.sin(Math.PI * u))}"/>`;
    }
  return s;
};

/* ——— Hlínka: čistá hrouda jako u lampionu, světlo shora od kotouče ——— */
const vrstvaTelo = () => vPostave(hlNohy() + hlTelo(ID));
const vrstvaSvit = () =>
  vPostave(
    `<circle cx="90" cy="98" r="47.2" fill="url(#${ID}-stin-tela)"/>` +
      `<circle cx="90" cy="98" r="47.2" fill="url(#${ID}-svit)"/>`,
  );
const vrstvaVyhonek = (st) => vPostave(hlVyhonek({ kyv: st.kyv }));
const vrstvaTvar = (st) => vPostave(hlTvar(ID, st.vyraz));
/* lístky, co jí zůstaly ležet na hlavě, a ten jeden na nose */
const vrstvaNaNi = (st) => {
  let s = "";
  for (const l of st.naNi) s += listekSvg(90 + Math.sin(l.a) * 47.4, 98 - Math.cos(l.a) * 47.4, l.rot + (l.a * 180) / Math.PI, 1.9, 1.3);
  if (st.naNose) s += listekSvg(NOS[0], NOS[1] - 1, 24 + 6 * Math.sin(st.t * 9) * st.naNose, 1.9, 1.5);
  return vPostave(s);
};
const vrstvaZzz = (st) => (st.spi > 0.04 ? zzz(st.t, STRED[0] - R_TELA * 1.02, STRED[1] - R_TELA * 0.98, { meritko: 1.15, sila: st.spi * 0.9 }) : "");
const vrstvaSvetylka = (st) => {
  let s = "";
  for (let i = 0; i < 2; i++) {
    const a = st.t * (0.5 + i * 0.13) + i * 2.6;
    s += svetylko(ID, STRED[0] + Math.cos(a) * (R_TELA + 12 + i * 5), STRED[1] + 6 + Math.sin(a * 1.4) * 15, 1.9 - 0.3 * i, 0.55 + 0.4 * Math.sin(st.t * 1.6 + i * 2));
  }
  return s;
};
const vrstvaListky = (st) => {
  let s = st.listky.map((l) => listekSvg(l.x, l.y, l.rot, l.m, l.m * Math.cos(l.fz + l.vek * l.toc), clamp(l.vek / 0.2))).join("");
  /* ten, který míří na nos */
  if (st.cilovy) s += listekSvg(st.cilovy[0], st.cilovy[1], st.cilovy[2], 1.25, 1.1);
  return s;
};

const KVETY_DEFS = (() => {
  let s = "";
  for (let i = 0; i < 6; i++) {
    const tmavy = i >= 3, a = (i % 3) * 0.42;
    s +=
      `<g id="${ID}-k${i}"><path d="${kvetD(0, 0, 3, a)}" fill="url(#${ID}-${tmavy ? "kvet-t" : "kvet"})" stroke="${tmavy ? "#D98AA4" : "#E6A6BA"}" stroke-width="0.22" stroke-linejoin="round"/>` +
      [0, 1, 2, 3, 4].map((k) => `<circle cx="${f(1.05 * Math.sin(a + k * 1.257 + 0.63))}" cy="${f(-1.05 * Math.cos(a + k * 1.257 + 0.63))}" r="0.2" fill="#F6D77A"/>`).join("") +
      `<circle r="0.46" fill="#DB6A8B"/></g>`;
  }
  s += `<g id="${ID}-poupe"><path d="M0 0 L2.2 0" stroke="#7C8556" stroke-width="0.4" stroke-linecap="round"/><ellipse cx="3.1" cy="0" rx="1.5" ry="1.05" fill="#E98FAB" stroke="#C8607F" stroke-width="0.25"/><path d="M1.8 -0.6 Q2.6 0 1.8 0.6 Z" fill="#8A9466"/></g>`;
  s += `<path id="${ID}-listek" d="${LISTEK}" fill="#F9CCD8" stroke="#E29BB3" stroke-width="0.2"/>`;
  return s;
})();
const defs = () =>
  hlDefs(ID) +
  KVETY_DEFS +
  `<radialGradient id="${ID}-kvet"><stop offset="0" stop-color="#F5B4C8"/><stop offset="0.45" stop-color="#FBD9E2"/><stop offset="1" stop-color="#FEF1F4"/></radialGradient>` +
  `<radialGradient id="${ID}-kvet-t"><stop offset="0" stop-color="#EE9AB5"/><stop offset="0.5" stop-color="#F6BDCE"/><stop offset="1" stop-color="#FAD9E2"/></radialGradient>` +
  `<linearGradient id="${ID}-kmen" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6E5557"/><stop offset="0.55" stop-color="${KORA}"/><stop offset="1" stop-color="${KORA_TM}"/></linearGradient>` +
  `<radialGradient id="${ID}-kotouc"><stop offset="0" stop-color="#FFF8E2"/><stop offset="0.7" stop-color="#FCEDC6"/><stop offset="1" stop-color="#F8E0B0"/></radialGradient>` +
  `<radialGradient id="${ID}-zare"><stop offset="0.7" stop-color="#FBE3A0" stop-opacity="0.34"/><stop offset="1" stop-color="#FBE3A0" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="${ID}-stin"><stop offset="0" stop-color="#2B2420" stop-opacity="0.26"/><stop offset="0.6" stop-color="#2B2420" stop-opacity="0.12"/><stop offset="1" stop-color="#2B2420" stop-opacity="0"/></radialGradient>` +
  /* dole a vpravo, kde ji stíní kmen, je hrouda tmavší; shora na ni svítí kotouč přes květy */
  `<linearGradient id="${ID}-stin-tela" x1="0.3" y1="0.2" x2="0.8" y2="1"><stop offset="0.3" stop-color="#2B2420" stop-opacity="0"/><stop offset="0.7" stop-color="#2B2420" stop-opacity="0.1"/><stop offset="1" stop-color="#2B2420" stop-opacity="0.32"/></linearGradient>` +
  `<radialGradient id="${ID}-svit" cx="0.6" cy="0.06" r="0.8"><stop offset="0" stop-color="#FFCDA8" stop-opacity="0.42"/><stop offset="0.5" stop-color="#F7A98C" stop-opacity="0.15"/><stop offset="1" stop-color="#F7A98C" stop-opacity="0"/></radialGradient>`;

/* ——— Simulace ——— */
/** Lístek se utrhne z náhodného místa na prutu. */
const utrhni = (dyn, volby = {}) => {
  const R = dyn.nahoda;
  const p = PRUTY[Math.floor(R() * PRUTY.length)], q = R();
  const c = Math.min(2, Math.floor(q * 3)), k = q * 3 - c;
  dyn.listky.push({
    x: lerp(p.J[c][0], p.J[c + 1][0], k) + (R() - 0.5) * 4, y: lerp(p.J[c][1], p.J[c + 1][1], k),
    vx: (volby.vx || 0) + (R() - 0.5) * 8, vy: (volby.vy ?? 2) + R() * 5, rot: R() * 360, vr: (R() - 0.5) * 260, fz: R() * 6.28, toc: 1.6 + R() * 2.6,
    m: 0.82 + R() * 0.5, vek: 0, zem: ZEM - 2.5 + R() * 9, pad: 9 + R() * 6,
  });
};
const poloz = (dyn, l) => {
  dyn.lezici.push({ x: l.x, y: l.zem, rot: l.rot, m: l.m });
  if (dyn.lezici.length > 110) dyn.lezici.splice(0, dyn.lezici.length - 110);
  dyn.verze++;
};
const zacniKych = (dyn, t) => {
  dyn.k = { faze: "pada", t0: t };
};
const novaDynamika = () => {
  const R = rng(3303);
  const dyn = {
    nahoda: R, zvuk: [], mys: null, smer: 0, vitr: 0, poryv: 0, otres: 0, listky: [], lezici: [], naNi: [], verze: 1,
    k: { faze: "nic", t0: 0 }, dalsiKych: 9, poza: 0, pozaV: 0, lechtani: 0, chichot: 0, spi: 1,
    ptak: { zpev: -10, skok: -10, dalsi: 4.2 },
  };
  /* pár lístků už leží a pár je ve vzduchu, ať první snímek není holý */
  for (let i = 0; i < 46; i++) {
    const x = 22 + R() * 140;
    if (Math.abs(x - FIG.x) < 20 && R() < 0.7) continue;
    dyn.lezici.push({ x, y: ZEM - 2.5 + R() * 9, rot: R() * 360, m: 0.82 + R() * 0.5 });
  }
  for (let i = 0; i < 16; i++) {
    utrhni(dyn);
    const l = dyn.listky[dyn.listky.length - 1];
    l.y += R() * 80;
    l.vek = 1 + R() * 3;
  }
  dyn.listky = dyn.listky.filter((l) => l.y < l.zem - 6 && Math.hypot(l.x - STRED[0], l.y - STRED[1]) > R_TELA + 3);
  dyn.naNi.push({ a: -0.5, rot: 20, t0: 0, zivot: 11 });
  return dyn;
};
const krok = (dyn, t, dt, vstup) => {
  const R = dyn.nahoda, k = dyn.k;
  /* vítr: slabý vane sám, silný dělá myš; směr je ten, kterým se hýbe */
  let vitrCil = 0.13 * Math.sin(t * 0.37) + 0.08 * Math.sin(t * 0.83 + 1);
  const m = vstup.mys;
  if (m) {
    if (dyn.mys) dyn.smer = kCili(dyn.smer, Math.sign(m.x - dyn.mys.x), dt, 0.12);
    vitrCil += clamp((dyn.smer * (vstup.rychlost || 0)) / 170, -1.3, 1.3);
    dyn.mys = { x: m.x, y: m.y };
    /* lechtání: rychlá myš přímo na ní */
    if (Math.hypot(m.x - STRED[0], m.y - STRED[1]) < R_TELA + 3 && (vstup.rychlost || 0) > 70 && k.faze === "nic") dyn.lechtani = Math.min(1.4, dyn.lechtani + dt * 2.6);
  } else dyn.mys = null;
  dyn.lechtani = Math.max(0, dyn.lechtani - dt * 0.9);
  if (dyn.lechtani > 0.5 && t > dyn.chichot) {
    dyn.zvuk.push({ druh: "chichot", sila: 0.7, pan: -0.1 });
    dyn.chichot = t + 0.9;
  }
  dyn.vitr = kCili(dyn.vitr, vitrCil + dyn.poryv, dt, 0.3);
  dyn.poryv *= Math.exp(-dt / 0.7);
  dyn.otres *= Math.exp(-dt / 0.8);

  /* ——— Kýchnutí ——— */
  if (vstup.kliky && vstup.kliky.length) {
    const kl = vstup.kliky[vstup.kliky.length - 1];
    vstup.kliky.length = 0;
    if (k.faze === "nic") zacniKych(dyn, t);
    else {
      /* už se kýchá: kliknutí jen zafouká od místa, kam se kleplo */
      const s = kl.x < 90 ? 1 : -1;
      dyn.poryv += s * 0.9;
      dyn.zvuk.push({ druh: "poryv", sila: 0.6, pan: -s * 0.5 });
      for (let i = 0; i < 12; i++) utrhni(dyn, { vx: s * 26 });
    }
  }
  if (k.faze === "nic" && t > dyn.dalsiKych) zacniKych(dyn, t);
  const u = t - k.t0;
  if (k.faze === "pada" && u > T_PADA) [k.faze, k.t0] = ["sedi", t];
  else if (k.faze === "sedi" && u > T_SEDI) {
    [k.faze, k.t0] = ["nadech", t];
    dyn.zvuk.push({ druh: "nadech", sila: 1, pan: -0.05 });
  } else if (k.faze === "nadech" && u > T_NADECH) {
    [k.faze, k.t0] = ["kych", t];
    dyn.zvuk.push({ druh: "kych", sila: 1, pan: -0.05 });
    dyn.zvuk.push({ druh: "poryv", sila: 0.9, pan: 0, za: 0.08 });
    dyn.otres = 1;
    dyn.pozaV = 9;
    dyn.ptak.skok = t;
    /* hanafubuki: strom se otřese a sype se z něj vánice */
    for (let i = 0; i < 130; i++) {
      utrhni(dyn, { vx: (R() - 0.5) * 60, vy: -6 + R() * 10 });
      dyn.listky[dyn.listky.length - 1].m *= 1.2;
    }
    /* co měla na hlavě, odletí */
    for (const l of dyn.naNi.splice(0)) {
      const [x, y] = naPanel([90 + Math.sin(l.a) * 49, 98 - Math.cos(l.a) * 49]);
      dyn.listky.push({ x, y, vx: Math.sin(l.a) * 40 + (R() - 0.5) * 20, vy: -30 - R() * 20, rot: l.rot, vr: (R() - 0.5) * 500, fz: R() * 6.28, toc: 3, m: 1.1, vek: 0.3, zem: ZEM - 2.5 + R() * 9, pad: 10 });
    }
    const [nx, ny] = naPanel(NOS);
    dyn.listky.push({ x: nx, y: ny, vx: -34, vy: -46, rot: 0, vr: 700, fz: 0, toc: 4, m: 1.2, vek: 0.3, zem: ZEM + 4, pad: 10 });
    dyn.verze++;
  } else if (k.faze === "kych" && u > T_KYCH) [k.faze, k.t0] = ["po", t];
  else if (k.faze === "po" && u > T_PO) {
    [k.faze, k.t0] = ["nic", t];
    dyn.dalsiKych = t + 15 + R() * 10;
  }
  [dyn.poza, dyn.pozaV] = pruzina(dyn.poza, dyn.pozaV, 0, dt, 150, 7);
  dyn.spi = kCili(dyn.spi, (k.faze === "nic" || k.faze === "pada") && dyn.lechtani < 0.5 ? 1 : 0, dt, 0.3);

  /* ——— Lístky ——— */
  const sila = Math.abs(dyn.vitr);
  if (dyn.listky.length < 170 && R() < dt * (1.5 + sila * 7 + Math.max(0, sila - 0.6) * 22)) utrhni(dyn, { vx: dyn.vitr * 20 });
  for (const l of dyn.listky) {
    l.vek += dt;
    l.vx = kCili(l.vx, dyn.vitr * 48 + 7 * Math.sin(l.vek * 2.3 + l.fz), dt, 0.5);
    l.vy = kCili(l.vy, l.pad + 3 * Math.sin(l.vek * 3.1 + l.fz), dt, 0.6);
    l.x += l.vx * dt;
    l.y += l.vy * dt;
    l.rot += l.vr * dt;
    /* na Hlínku: nahoře občas zůstane ležet, jinak sklouzne po boku */
    const dx = l.x - STRED[0], dy = l.y - STRED[1], d = Math.hypot(dx, dy);
    if (d < R_TELA + 0.6 && l.vy > 0) {
      if (dy < -R_TELA * 0.62 && dyn.naNi.length < 4 && dyn.k.faze === "nic" && R() < 0.5) {
        dyn.naNi.push({ a: Math.atan2(dx, -dy), rot: l.rot % 60, t0: t, zivot: 7 + R() * 9 });
        dyn.verze++;
        l.pryc = true;
      } else {
        l.x = STRED[0] + (dx / d) * (R_TELA + 0.8);
        l.y = STRED[1] + (dy / d) * (R_TELA + 0.8);
        l.vx += Math.sign(dx || 1) * 30 * dt * 8;
      }
    }
    if (l.y >= l.zem && l.vy > 0) {
      l.pryc = true;
      if (l.x > 8 && l.x < 172) poloz(dyn, l);
    } else if (l.x < -14 || l.x > 194) l.pryc = true;
  }
  dyn.listky = dyn.listky.filter((l) => !l.pryc);
  /* z hlavy časem sklouznou */
  for (const l of dyn.naNi)
    if (t - l.t0 > l.zivot) {
      const [x, y] = naPanel([90 + Math.sin(l.a) * 49, 98 - Math.cos(l.a) * 49]);
      dyn.listky.push({ x, y, vx: Math.sin(l.a) * 14, vy: 3, rot: l.rot, vr: 120, fz: R() * 6.28, toc: 2, m: 1.1, vek: 0.3, zem: ZEM - 2 + R() * 8, pad: 10 });
      l.pryc = true;
      dyn.verze++;
    }
  dyn.naNi = dyn.naNi.filter((l) => !l.pryc);

  /* sedmihlásek: zpívá, když je klid */
  const b = dyn.ptak;
  if (t > b.dalsi && k.faze === "nic") {
    b.zpev = t;
    b.dalsi = t + 10 + R() * 9;
    dyn.zvuk.push({ druh: "uguisu", sila: 0.8, pan: -0.45 });
  }
};

const VYRAZY = {
  nic: { oci: "spi", usta: "usmev", tvare: 0.45 },
  pada: { oci: "spi", usta: "usmev", tvare: 0.45 },
  sedi: { oci: "ospale", usta: "vlnka", tvare: 0.55 },
  nadech: { oci: "siroke", usta: "o", tvare: 0.5, dy: -1.2 },
  kych: { oci: "kych", usta: "kych", tvare: 0.75 },
};
const stav = (t, vstup = {}, dyn) => {
  const d = dyn || novaDynamika();
  const k = d.k, u = t - k.t0;
  let vyraz = VYRAZY[k.faze];
  if (k.faze === "po") vyraz = u < 0.9 ? { oci: "ospale", usta: "vlnka", tvare: 0.55 } : VYRAZY.nic;
  else if (k.faze === "nic" && d.lechtani > 0.5) vyraz = { oci: "smich", usta: "ach", tvare: 0.85 };
  /* póza: dýchá, nadechne se do záklonu, kýchnutím se předkloní a dopruží */
  let sx = 1 - 0.006 * Math.sin(t * 1.25), sy = 1 + 0.012 * Math.sin(t * 1.25), r = 0, y = 0;
  if (k.faze === "nadech") {
    const q = smooth(u / T_NADECH);
    [sx, sy, r] = [1 + 0.03 * q, 1 + 0.075 * q, -6 * q];
  } else if (k.faze === "kych") {
    const q = Math.sin(Math.PI * clamp(u / T_KYCH));
    [sx, sy, r, y] = [1 + 0.07 * q, 1 - 0.1 * q, 9 * q - 3 * (1 - q), -2.4 * q];
  }
  r += d.poza * 3 + 2.4 * Math.sin(t * 25) * clamp(d.lechtani - 0.3);
  /* pruty: houpou se samy, ohýbá je vítr, od kurzoru se odklánějí a při kýchnutí se třesou */
  const uhly = [];
  const m = vstup.mys;
  PRUTY.forEach((p, i) => {
    const od = m ? 7 * Math.exp(-Math.pow((p.J[1][0] - m.x) / 26, 2) - Math.pow(Math.max(0, m.y - p.J[3][1] - 10) / 30, 2)) * Math.sign(p.J[1][0] - m.x || 1) : 0;
    const tres = d.otres * 6 * Math.sin(t * 29 + p.fz * 3);
    const o = 0.7 + 0.5 * p.o;
    uhly.push(
      -(1.5 * Math.sin(t * 0.9 + p.fz) + d.vitr * 8 * o + od * 0.6 + tres),
      -(1.3 * Math.sin(t * 1.1 + p.fz + 1) + d.vitr * 7 * o + od * 0.3 + tres * 0.7),
      -(1.8 * Math.sin(t * 1.3 + p.fz + 2) + d.vitr * 9 * o + tres * 0.5),
    );
  });
  /* lístek, který míří na nos: snáší se obloukem od koruny */
  let cilovy = null;
  if (k.faze === "pada") {
    const q = clamp(u / T_PADA), [nx, ny] = naPanel([NOS[0], NOS[1] - 1]);
    cilovy = [lerp(nx + 16, nx, smooth(q)) + Math.sin(q * 9) * 5 * (1 - q), lerp(ny - 62, ny, q * q * 0.5 + q * 0.5), 24 + (1 - q) * 420];
  }
  const b = d.ptak;
  const zp = t - b.zpev, sk = t - b.skok;
  const zpev = zp > 0 && zp < 1.75 ? (zp < 0.95 ? 0.75 + 0.25 * Math.sin(zp * 30) : zp < 1.05 ? 0 : 1) : 0;
  const skok = sk > 0 && sk < 0.8 ? Math.sin((Math.PI * sk) / 0.8) : 0;
  return {
    t, vitr: d.vitr, otres: d.otres, uhly, vyraz, listky: d.listky, lezici: d.lezici, naNi: d.naNi, verze: d.verze, cilovy,
    naNose: k.faze === "sedi" ? 0.3 : k.faze === "nadech" ? 1 : 0,
    spi: d.spi,
    fig: { sx, sy, r, y },
    kyv: 5 * Math.sin(t * 1.1) + d.vitr * 16 + d.otres * 12 * Math.sin(t * 27),
    ptak: { zpev, noty: zp > 0 && zp < 2.6 ? zp / 2.6 : 0, vyska: 9 * skok, kridla: skok > 0 ? 0.5 + 0.5 * Math.sin(t * 46) : 0, naklon: -6 * zpev + 2 * Math.sin(t * 1.4) - 14 * skok },
  };
};
const snimek = (st) => Math.floor(st.t * 30);
const pohyb = (st) => ({ x: 0, y: st.fig.y, r: st.fig.r, sx: st.fig.sx, sy: st.fig.sy, ox: FIG.x, oy: ZEM });

export const kamiSakura = {
  id: "sakura",
  viewBox: "0 0 180 180",
  defs,
  novaDynamika,
  krok,
  stav,
  /* vítr v koruně */
  sum: (st) => ({ mira: 0.22 + 0.7 * Math.abs(st.vitr) + 0.5 * st.otres, f: 520 + 520 * Math.abs(st.vitr), q: 0.6, pan: clamp(st.vitr, -0.8, 0.8) }),
  klidne: { t: 3.2 },
  vrstvy: [
    { id: "zem", kresli: vrstvaZem },
    { id: "kotouc", kresli: vrstvaKotouc },
    { id: "strom", kresli: vrstvaStrom, tezka: true },
    { id: "provaz", kresli: vrstvaProvaz, klic: (st) => Math.floor(st.t * 15) },
    { id: "pruty", kresli: vrstvaPruty, uzly: uzlyPrutu, tezka: true },
    { id: "ptak", kresli: vrstvaPtak, klic: (st) => (st.ptak.zpev || st.ptak.noty || st.ptak.vyska ? snimek(st) : Math.floor(st.t * 10)) },
    { id: "lezici", kresli: vrstvaLezici, klic: (st) => st.verze },
    { id: "svetylka", kresli: vrstvaSvetylka, klic: (st) => Math.floor(st.t * 15) },
    { id: "telo", kresli: vrstvaTelo, pohyb },
    { id: "svit", kresli: vrstvaSvit, pohyb },
    { id: "vyhonek", kresli: vrstvaVyhonek, klic: (st) => Math.round(st.kyv * 4), pohyb },
    { id: "tvar", kresli: vrstvaTvar, klic: (st) => `${st.vyraz.oci},${st.vyraz.usta}`, pohyb },
    { id: "na-ni", kresli: vrstvaNaNi, klic: (st) => `${st.verze},${st.naNose ? snimek(st) : 0}`, pohyb },
    { id: "zzz", kresli: vrstvaZzz, klic: (st) => (st.spi > 0.04 ? Math.floor(st.t * 12) : -1) },
    { id: "listky", kresli: vrstvaListky, klic: (st) => (st.listky.length || st.cilovy ? snimek(st) : -1) },
  ],
};
