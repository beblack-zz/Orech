/*
 * 02, Tušový lem — HADÍ OKO
 *
 * Papírový deštník s kruhem se jmenuje janome, hadí oko. Vázička s ním
 * stojí v nočním dešti na obloukovém můstku, zády k nám: je vidět mašle
 * obi s dlouhými konci, rukávy a dřeváky. Hlavu jí kryje deštník a ten
 * kruh na něm je kruh ze značky — jeden tah, v mezeře květ. Noc je tuš
 * a svítí v ní jen on, bledou žlutou jako srpek měsíce v hlavičce webu
 * (a dole ve vodě jeho odraz).
 *
 * Když se vyprší, deštník sklapne a ukáže se, proč ten kruh svítil: přesně
 * za ním stál celou dobu měsíc. Ohlédne se přes rameno, zakváká rosnička.
 * Pak se zatáhne, spadnou první kapky a deštník se rozevře znovu.
 *
 * Myš je vítr: déšť se nakloní, kam fouká, ona proti němu nastaví deštník
 * a konce mašle i rukávy vlají. Kdo na ni ukáže, na toho se pod
 * nadzvednutým deštníkem ohlédne. Kliknutí deštník roztočí a kapky z něj
 * odletí v prstenci — a každé roztočení kus deště odežene.
 */
import {
  f, rng, clamp, lerp, smooth, rad, deg, pt, cara, hrouda, kCili, pres, dosed, mrkani, kyvadlo, noveKyvadlo,
  VAZ, NOC, ZLUTA, PLATEK, polomer, vazDefs, kvetyDefs, vazTelo, vazTvarNa, vazSnury, vazVetvicka, vazZa, vazPred, vazBoty, vazRukavy, klicRukavu, kanzashiStred, tusLem,
} from "./spolecne.js";

const ID = "vg3";
const P = NOC;
const M = 3;
const TUS = tusLem(ID, { seed: 52, barva: "#0E1024", lem: "#2A2D52" });
const OREZ = `${ID}-tus-orez`;

/* ——— Můstek a postava na něm ——— */
const FX = 86, ZEM = 130, K = 0.62;
const POSTAVA = `translate(${FX} ${ZEM}) scale(${K}) translate(${-VAZ.cx} ${-VAZ.zem})`;
const vPostave = (s) => `<g transform="${POSTAVA}">${s}</g>`;
const naPlatno = ([x, y]) => [FX + (x - VAZ.cx) * K, ZEM + (y - VAZ.zem) * K];
const yMostu = (x) => ZEM + 0.0026 * (x - FX) * (x - FX);
const HLADINA = 152;

/* ——— Deštník ——— */
/* rozevřený: střed okraje nad hlavou, poloměr, výška kužele; sklapnutý: u boku špičkou dolů */
const DR = 37, DH = 9, ZEBER = 24;
const STRED0 = [89, 69];
const SKLAP = { R: 2.7, h: 31, osa: [0.14, 0.97, 0.2] };
/* kruh na plášti: kde leží mezi vrcholem a okrajem a kolik ho obepíná */
const KRUH = { q: 0.5, od: rad(-64), rozsah: rad(328) };
const MESIC = { c: [89, 66], r: 23.5 };

/* ——— Čas ——— */
/* déšť vydrží asi tři čtvrtě minuty, roztočení ho krátí; po dešti: sklapne, měsíc, ohlédnutí, zatáhne se */
const PRSI = 46, ZA_KLIK = 0.17;
const PO = { ztichne: 1.6, sklapne: [1.1, 2.1], mesic: [1.7, 3.3], otoci: [3.1, 4.3], zpet: [7.9, 9], zatahne: [8.3, 9.7], rozevre: [9.3, 10.1], konec: 10.2 };
const NEJVIC_KAPEK = 110;

const norm = (v) => {
  const d = Math.hypot(...v) || 1;
  return v.map((x) => x / d);
};
const mezi = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));

/* ═══ Pozadí v tuši: vzdálený břeh, voda ═══ */
const vrstvaTus = () =>
  TUS.skvrna +
  `<g clip-path="url(#${OREZ})">` +
  `<rect x="0" y="0" width="180" height="182" fill="url(#${ID}-nebe)"/>` +
  /* protější břeh: dva nízké hřbety a mlha nad vodou */
  `<path d="M0 132 C22 124 40 127 58 122 C76 117 96 128 118 124 C140 120 160 128 180 123 V182 H0 Z" fill="#161938"/>` +
  `<path d="M0 141 C30 135 54 140 82 137 C112 134 146 141 180 136 V182 H0 Z" fill="#111430"/>` +
  `<rect x="0" y="128" width="180" height="22" fill="url(#${ID}-mlha)"/>` +
  `<rect x="0" y="${HLADINA - 6}" width="180" height="40" fill="url(#${ID}-voda)"/>` +
  `</g>`;
/* měsíc: jedna bledá plocha a záře kolem, stejně jako kruh na deštníku */
const vrstvaMesic = () =>
  `<circle cx="${MESIC.c[0]}" cy="${MESIC.c[1]}" r="${MESIC.r * 2.3}" fill="url(#${ID}-zar)"/>` +
  `<circle cx="${MESIC.c[0]}" cy="${MESIC.c[1]}" r="${MESIC.r}" fill="${ZLUTA.zaklad}"/>`;
/* mraky: dva pásy, které se při vyjasnění rozjedou do stran */
const MRAKY = [[54, 44, 60, 15, 11], [124, 58, 58, 13, 23], [84, 86, 70, 12, 37]];
const MRAKY_D = MRAKY.map(([x, y, rx, ry, seed]) => [hrouda(x, y, rx, ry, seed, { bodu: 16, kolisani: 0.2 }), hrouda(x, y - ry * 0.5, rx * 0.8, ry * 0.4, seed + 3, { bodu: 12, kolisani: 0.25 })]);
const vrstvaMraky = (st) =>
  MRAKY_D.map(([telo, svetlo], i) => `<g transform="translate(${f((i % 2 ? 1 : -1) * 76 * st.mesic)} 0)"><path d="${telo}" fill="#191C3E" opacity="0.92"/><path d="${svetlo}" fill="#262A58" opacity="0.5"/></g>`).join("");

/* ═══ Déšť: šikmé tahy jako na dřevořezech ═══ */
const TAHY = (() => {
  const r = rng(911);
  return Array.from({ length: 96 }, (_, i) => ({ x: -30 + r() * 240, faze: r() * 220, rychlost: 150 + r() * 110, delka: 9 + r() * 12, blizko: i % 3 === 0 }));
})();
const vrstvaDest = (st) => {
  if (st.dest < 0.02) return "";
  let daleko = "", blizko = "";
  const sklon = 0.42 * st.vitr;
  const kolik = Math.ceil(TAHY.length * st.dest);
  for (let i = 0; i < kolik; i++) {
    const T = TAHY[i];
    const y = ((st.t * T.rychlost + T.faze) % 220) - 20;
    const x = T.x + sklon * (y - 60);
    const d = `M${f(x)} ${f(y)} l${f(sklon * T.delka)} ${f(T.delka)} `;
    if (T.blizko) blizko += d;
    else daleko += d;
  }
  return (
    `<path d="${daleko}" stroke="#7A84C8" stroke-width="0.35" stroke-linecap="round" fill="none" opacity="0.4"/>` +
    `<path d="${blizko}" stroke="#A9B2EA" stroke-width="0.5" stroke-linecap="round" fill="none" opacity="0.5"/>`
  );
};
/* kruhy na vodě a odraz toho, co svítí (deštník, pak měsíc) */
const vrstvaVoda = (st) => {
  let s = "";
  const zar = Math.max(st.svit, st.mesic);
  if (zar > 0.02) {
    const cx = lerp(st.d.C[0], MESIC.c[0], st.mesic);
    for (let i = 0; i < 4; i++) {
      const y = HLADINA + 6 + i * 3.6;
      const w = (15 - i * 2.6) * (1 + 0.1 * Math.sin(st.t * 2.3 + i * 1.7));
      s += `<ellipse cx="${f(cx + 1.6 * Math.sin(st.t * 1.6 + i * 2.1))}" cy="${f(y)}" rx="${f(w)}" ry="${f(1.25 - i * 0.16)}" fill="${ZLUTA.zaklad}" opacity="${f(zar * (0.34 - i * 0.07))}"/>`;
    }
  }
  for (const k of st.kruhy) {
    const q = k.vek / k.zivot;
    s += `<ellipse cx="${f(k.x)}" cy="${f(k.y)}" rx="${f(k.r * q)}" ry="${f(k.r * q * 0.3)}" fill="none" stroke="#8A92D2" stroke-width="0.35" opacity="${f(0.6 * (1 - q))}"/>`;
  }
  return s;
};

/* ═══ Můstek ═══ */
const zabradli = (sloupky, vyska, barva, hrana, tl, niz = 0) => {
  const B = [];
  for (let x = -6; x <= 186; x += 12) B.push([x, yMostu(x) + niz - vyska]);
  let s = `<path d="${cara(B)}" stroke="${barva}" stroke-width="${tl}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
  s += `<path d="${cara(B.map(([x, y]) => [x, y - tl * 0.42]))}" stroke="${hrana}" stroke-width="0.35" fill="none" opacity="0.7"/>`;
  for (const x of sloupky) {
    const y = yMostu(x) + niz;
    s += `<path d="M${x} ${f(y + 1)} V${f(y - vyska - 1.6)}" stroke="${barva}" stroke-width="${f(tl + 0.5)}" stroke-linecap="round"/>`;
    /* cibulka na sloupku (giboši) */
    s += `<path d="M${x - 1.5} ${f(y - vyska - 2)} Q${x - 2.3} ${f(y - vyska - 4.4)} ${x} ${f(y - vyska - 6.2)} Q${x + 2.3} ${f(y - vyska - 4.4)} ${x + 1.5} ${f(y - vyska - 2)} Z" fill="${barva}"/>`;
    s += `<path d="M${x - 1.1} ${f(y - vyska - 3.4)} Q${x - 1.4} ${f(y - vyska - 4.8)} ${x - 0.2} ${f(y - vyska - 5.8)}" stroke="${hrana}" stroke-width="0.35" fill="none" opacity="0.7"/>`;
  }
  return s;
};
const vrstvaMost = () => {
  const horni = [], dolni = [];
  for (let x = -6; x <= 186; x += 12) {
    horni.push([x, yMostu(x)]);
    dolni.push([x, yMostu(x) + 4.6 + 0.0009 * (x - FX) * (x - FX)]);
  }
  let s = zabradli([14, 44, 128, 158], 8, "#12142C", "#30356A", 1.1);
  /* piloty do vody */
  for (const x of [30, 142]) s += `<path d="M${x - 2} ${f(yMostu(x) + 3)} V182 H${x + 2} V${f(yMostu(x) + 3)} Z" fill="#090A18"/>`;
  s += `<path d="${cara(horni)} L${dolni.reverse().map(pt).join(" L")} Z" fill="#0B0C1C"/>`;
  s += `<path d="${cara(horni)}" stroke="#343A72" stroke-width="0.55" fill="none" opacity="0.8"/>`;
  return s;
};
/* bližší zábradlí je o kousek níž a tmavší: stojí mezi námi a ní */
const vrstvaZabradliPred = () => zabradli([6, 34, 62, 118, 146, 174], 6.4, "#07080F", "#2A2F5E", 1.5, 2.4);

/* ═══ Deštník ═══ */
/** Kužel v prostoru (x doprava, y dolů, z k divákovi) → body na plátně. */
const geometrie = (D) => {
  const a = D.osa;
  const e1 = norm([a[1], -a[0], 0]);
  const e2 = [a[1] * e1[2] - a[2] * e1[1], a[2] * e1[0] - a[0] * e1[2], a[0] * e1[1] - a[1] * e1[0]];
  const vrchol = [D.C[0] + D.h * a[0], D.C[1] + D.h * a[1]];
  const okraj = (th, k = 1) => [D.C[0] + D.R * k * (Math.cos(th) * e1[0] + Math.sin(th) * e2[0]), D.C[1] + D.R * k * (Math.cos(th) * e1[1] + Math.sin(th) * e2[1])];
  return { vrchol, okraj, naPlasti: (th, q) => { const o = okraj(th); return [lerp(vrchol[0], o[0], q), lerp(vrchol[1], o[1], q)]; } };
};
const vrstvaDestnik = (st) => {
  const D = st.d, G = geometrie(D);
  const z = D.zav;
  /* plášť: mezi žebry se papír maličko propadá */
  const obvod = [];
  for (let i = 0; i < ZEBER; i++) {
    const th = D.phi + (i / ZEBER) * Math.PI * 2;
    obvod.push(G.okraj(th), G.okraj(th + Math.PI / ZEBER, 0.975));
  }
  /* hůl od ruky pod plášť: je vidět, jen když deštník nadzvedne */
  let s = z < 0.7 ? `<path d="M${pt(D.ruka)} L${pt(D.C)}" stroke="#07080F" stroke-width="1.5" stroke-linecap="round"/><path d="M${pt(D.ruka)} L${pt(D.C)}" stroke="#4A4470" stroke-width="0.6" stroke-linecap="round"/>` : "";
  s += `<path d="${cara(obvod)} Z" fill="url(#${ID}-plast)" stroke="#07080F" stroke-width="0.7" stroke-linejoin="round"/>`;
  let zebra = "";
  for (let i = 0; i < ZEBER; i++) zebra += `M${pt(G.vrchol)} L${pt(G.okraj(D.phi + (i / ZEBER) * Math.PI * 2))} `;
  s += `<path d="${zebra}" stroke="#3A3F7A" stroke-width="0.3" fill="none" opacity="0.8"/>`;
  /* tmavší lem u okraje a u vrcholu, jak bývá na janome */
  const lem = (q1, q2) => {
    const A = [], B = [];
    for (let i = 0; i <= 48; i++) {
      const th = D.phi + (i / 48) * Math.PI * 2;
      A.push(G.naPlasti(th, q1));
      B.push(G.naPlasti(th, q2));
    }
    return `${cara(A)} Z ${cara(B.reverse())} Z`;
  };
  s += `<path d="${lem(0.86, 1)}" fill="#0C0D1E" opacity="0.6" fill-rule="evenodd"/>`;
  /* kruh: jeden tah, na začátku silný, ke konci se vytahuje; jedna plocha bez linek */
  if (D.svit > 0.02) {
    const ven = [], dovnitr = [], stred = [];
    for (let i = 0; i <= 44; i++) {
      const t = i / 44;
      const th = D.phi + KRUH.od + KRUH.rozsah * t;
      const pul = lerp(0.19, 0.06, Math.pow(t, 0.8)) * (t < 0.05 ? 0.62 + 0.38 * (t / 0.05) : 1);
      ven.push(G.naPlasti(th, KRUH.q + pul));
      dovnitr.push(G.naPlasti(th, KRUH.q - pul));
      stred.push(G.naPlasti(th, KRUH.q));
    }
    const tah = `${cara(ven)} L${dovnitr.reverse().map(pt).join(" L")} Z`;
    const [kx, ky] = G.naPlasti(D.phi + KRUH.od - rad(17), KRUH.q + 0.02);
    const kvet = `<g transform="translate(${f(kx)} ${f(ky)}) scale(${f(0.3 * (1 - z))} ${f(0.3 * (1 - z) * lerp(1, Math.abs(D.osa[2]), 0.6))}) rotate(${f(deg(D.phi))})">${[0, 72, 144, 216, 288].map((u) => `<path d="${PLATEK}" transform="rotate(${u}) translate(0 -1.7)"/>`).join("")}</g>`;
    s +=
      `<g opacity="${f(D.svit)}">` +
      `<path d="${cara(stred)}" stroke="${ZLUTA.svetla}" stroke-width="${f(15 * (1 - z) + 2)}" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.1"/>` +
      `<path d="${cara(stred)}" stroke="${ZLUTA.svetla}" stroke-width="${f(9 * (1 - z) + 1.4)}" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.14"/>` +
      `<path d="${tah}" fill="${ZLUTA.zaklad}"/><g fill="${ZLUTA.zaklad}">${kvet}</g></g>`;
  }
  /* hlavice a špička nad ní */
  const sp = [G.vrchol[0] + D.osa[0] * 4.4, G.vrchol[1] + D.osa[1] * 4.4];
  s += `<path d="M${pt(G.vrchol)} L${pt(sp)}" stroke="#05060C" stroke-width="1.5" stroke-linecap="round"/>`;
  s += `<ellipse cx="${f(G.vrchol[0])}" cy="${f(G.vrchol[1])}" rx="${f(2.5 * (1 - z * 0.5))}" ry="${f(2.5 * (1 - z * 0.5) * lerp(1, Math.abs(D.osa[2]), 0.5))}" fill="#05060C" stroke="#30356A" stroke-width="0.4"/>`;
  return s;
};
const klicDestniku = (st) => {
  const D = st.d;
  return [D.phi * 60, D.C[0] * 4, D.C[1] * 4, D.osa[0] * 60, D.osa[2] * 60, D.zav * 50, D.svit * 20, D.ruka[0] * 3, D.ruka[1] * 3].map(Math.round).join(",");
};
/* kapky: co odletí při roztočení, co odkapává z okraje a co se rozprskne o můstek */
const vrstvaKapky = (st) => {
  let cary = "", tecky = "";
  for (const k of st.kapky) {
    const op = clamp(Math.min(1, (k.zivot - k.vek) / 0.2));
    if (k.visi) tecky += `<ellipse cx="${f(k.x)}" cy="${f(k.y)}" rx="${f(0.5 + 0.5 * k.visi)}" ry="${f(0.5 + 0.9 * k.visi)}" fill="#C9D0F6" opacity="0.85"/>`;
    else cary += `<path d="M${f(k.x)} ${f(k.y)} l${f(-k.vx * 0.024)} ${f(-k.vy * 0.024)}" stroke="${k.svetla ? ZLUTA.svetla : "#C9D0F6"}" stroke-width="${f(k.r)}" stroke-linecap="round" opacity="${f(op * 0.9)}"/>`;
  }
  /* jak déšť bubnuje na papír */
  for (const c of st.cakance) {
    const q = c.vek / 0.16;
    tecky += `<path d="M${f(c.x - 1.4 * q)} ${f(c.y - 1.2 * q)} L${f(c.x)} ${f(c.y)} L${f(c.x + 1.4 * q)} ${f(c.y - 1.2 * q)}" stroke="#B9C0F0" stroke-width="0.35" stroke-linecap="round" fill="none" opacity="${f(0.75 * (1 - q))}"/>`;
  }
  return cary + tecky;
};

/* ═══ Postava ═══ */
const vrstvaTvar = (st) => vPostave(vazTvarNa(ID, st.o.yaw, { dx: st.pohled[0], dy: st.pohled[1], mrk: st.mrk, vyraz: st.vyraz, P, tvare: 0.4 }));

const defs = () =>
  TUS.defs + vazDefs(ID, P) + kvetyDefs(ID, [M], 0.74) +
  `<linearGradient id="${ID}-nebe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1A1D4A" stop-opacity="0"/><stop offset="0.5" stop-color="#1E2254" stop-opacity="0.45"/><stop offset="0.75" stop-color="#2A2D66" stop-opacity="0.8"/></linearGradient>` +
  `<linearGradient id="${ID}-mlha" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5A60A8" stop-opacity="0"/><stop offset="0.7" stop-color="#5A60A8" stop-opacity="0.3"/><stop offset="1" stop-color="#5A60A8" stop-opacity="0"/></linearGradient>` +
  `<linearGradient id="${ID}-voda" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#262A62" stop-opacity="0"/><stop offset="0.3" stop-color="#262A62" stop-opacity="0.75"/><stop offset="1" stop-color="#1A1D4A" stop-opacity="0.9"/></linearGradient>` +
  `<radialGradient id="${ID}-zar"><stop offset="0" stop-color="${ZLUTA.svetla}" stop-opacity="0.5"/><stop offset="0.42" stop-color="${ZLUTA.zaklad}" stop-opacity="0.2"/><stop offset="1" stop-color="${ZLUTA.zaklad}" stop-opacity="0"/></radialGradient>` +
  /* plášť deštníku: tmavý papír, nahoře o něco světlejší */
  `<linearGradient id="${ID}-plast" gradientUnits="userSpaceOnUse" x1="0" y1="36" x2="0" y2="106"><stop offset="0" stop-color="#2A2E62"/><stop offset="1" stop-color="#181A3C"/></linearGradient>`;

/* ═══ Simulace ═══ */
/** Jak je na tom deštník: kde je, kam míří, jak je sklapnutý, jak svítí. */
const destnik = (d, ruka) => {
  const z = d.zav;
  /* proti větru a při ohlédnutí nahoru */
  const osa = norm([-0.4 * d.vitr + d.trese[0], lerp(-0.66, -0.9, d.kouk) + d.trese[1], lerp(0.75, 0.43, d.kouk)]);
  const C = [STRED0[0] - 5.5 * d.vitr, STRED0[1] - 12 * d.kouk];
  const k = smooth(z);
  return {
    osa: norm(mezi(osa, SKLAP.osa, k)), C: mezi(C, [ruka[0] + 1, ruka[1] - 6], k), R: lerp(DR, SKLAP.R, k), h: lerp(DH, SKLAP.h, k),
    phi: d.phi, zav: z, svit: clamp(1 - z * 1.25), ruka,
  };
};
/* ruce [azimut od jejího předku, jak daleko od osy, výška]; její pravá drží deštník */
const RUCE = { L: [-58, 30, 97], P: [90, 40, 117], sklap: [-92, 43, 109] };
const poza = (d, t) => {
  const u = d.po == null ? -1 : t - d.po;
  const ohl = u < 0 ? 0 : smooth((u - PO.otoci[0]) / (PO.otoci[1] - PO.otoci[0])) * (1 - smooth((u - PO.zpet[0]) / (PO.zpet[1] - PO.zpet[0])));
  const yaw = 180 - 130 * Math.max(d.kouk, ohl) + 3 * Math.sin(t * 0.5);
  const ruka = ([az, r, y]) => {
    const w = rad(az + yaw);
    return { H: [VAZ.cx + r * Math.sin(w), y], za: Math.cos(w) < -0.2 };
  };
  const L = ruka(mezi(RUCE.L, RUCE.sklap, smooth(d.zav)));
  return { u, ohl, yaw, L, Pr: ruka(RUCE.P) };
};
const kapka = (dyn, x, y, vx, vy, volby = {}) => {
  if (dyn.kapky.length >= NEJVIC_KAPEK) return;
  dyn.kapky.push({ x, y, vx, vy, vek: 0, zivot: volby.zivot || 0.9, r: volby.r || 0.55, svetla: !!volby.svetla, visi: 0 });
};
const novaDynamika = () => ({
  phi: 0.3, om: 0, mrak: 1, po: null, zav: 0, vitr: 0.25, kouk: 0, uNi: 0, trese: [0, 0], poryv: -10,
  kapky: [], kruhy: [], cakance: [], odkap: 0.3, akum: 0, akumK: 0,
  snury: [noveKyvadlo(), noveKyvadlo(), noveKyvadlo()], rukavy: { L: noveKyvadlo(), P: noveKyvadlo() }, masle: noveKyvadlo(), vetev: noveKyvadlo(),
  nahoda: rng(5150), zvuk: [], pohled: [0, 0], zaba: -10, nota: 0,
});
const krok = (dyn, t, dt, vstup) => {
  const R = dyn.nahoda;
  let u = dyn.po == null ? -1 : t - dyn.po;
  const prsi = dyn.po == null;
  /* ——— vítr: kam ukazuje myš, jinak se sám převaluje ——— */
  const cilV = vstup.mys ? clamp((vstup.mys.x - 90) / 62, -1, 1) : 0.3 * Math.sin(t * 0.23) + 0.2 * Math.sin(t * 0.61 + 1);
  dyn.vitr = kCili(dyn.vitr, cilV, dt, 0.5);
  /* poryv: prudké mávnutí deštníkem zatřese */
  if ((vstup.rychlost || 0) > 300 && t - dyn.poryv > 1.6 && prsi) {
    dyn.poryv = t;
    dyn.zvuk.push({ druh: "fuk", sila: 0.8, pan: clamp(dyn.vitr, -1, 1) });
  }
  const tr = t - dyn.poryv < 0.7 ? (1 - (t - dyn.poryv) / 0.7) * 0.07 : 0;
  dyn.trese = [tr * Math.sin(t * 41), tr * Math.cos(t * 37)];
  /* ——— kdo na ni ukáže, na toho se ohlédne ——— */
  const telo = naPlatno([90, 112]);
  const uNi = prsi && !!vstup.mys && Math.hypot(vstup.mys.x - telo[0], vstup.mys.y - telo[1]) < 22;
  dyn.uNi = uNi ? dyn.uNi + dt : 0;
  const koukPred = dyn.kouk;
  dyn.kouk = kCili(dyn.kouk, dyn.uNi > 0.3 ? 1 : 0, dt, 0.22);
  if (pres(koukPred, dyn.kouk, 0.5)) dyn.zvuk.push({ druh: "struna", vys: 4, sila: 0.5, pan: 0 });
  /* ——— kliknutí: roztočí deštník ——— */
  if (vstup.kliky && vstup.kliky.length) {
    vstup.kliky.length = 0;
    if (prsi && dyn.zav < 0.05) {
      dyn.om += 10;
      dyn.mrak -= ZA_KLIK;
      dyn.zvuk.push({ druh: "frk", sila: 1, pan: 0.05 });
      dyn.prsk = 30;
    } else if (u > PO.otoci[1] && u < PO.zpet[0] - 0.4) dyn.po = t - (PO.zpet[0] - 0.4);
  }
  dyn.om *= Math.exp(-dt * 1.25);
  dyn.phi += dyn.om * dt;
  /* ——— déšť ubývá; když dojde, začne dohra ——— */
  if (prsi) {
    dyn.mrak -= dt / PRSI;
    if (dyn.mrak <= 0) {
      dyn.po = t;
      u = 0;
      dyn.zvuk.push({ druh: "sklap", sila: 0.8, pan: 0.2, za: PO.sklapne[0] + 0.25 });
      dyn.zvuk.push({ druh: "zvon", sila: 0.6, pan: 0, za: PO.mesic[0] + 0.5 });
      [3, 5, 7].forEach((v, i) => dyn.zvuk.push({ druh: "struna", vys: v, sila: 0.6 - i * 0.1, pan: 0, za: PO.otoci[0] + i * 0.24 }));
      dyn.zvuk.push({ druh: "zaba", sila: 0.7, pan: -0.6, za: PO.otoci[1] + 0.4 });
      dyn.zvuk.push({ druh: "zaba", sila: 0.55, pan: 0.5, za: PO.otoci[1] + 2.3 });
    }
  }
  if (u >= 0) {
    if (pres(u - dt, u, PO.rozevre[0])) {
      dyn.zvuk.push({ druh: "sklap", sila: 0.9, pan: 0.2 });
      dyn.zvuk.push({ druh: "latka", sila: 0.5, pan: 0.1 });
    }
    if (u >= PO.konec) {
      dyn.po = null;
      dyn.mrak = 1;
      u = -1;
    }
  }
  dyn.zav = u < 0 ? kCili(dyn.zav, 0, dt, 0.1) : smooth((u - PO.sklapne[0]) / (PO.sklapne[1] - PO.sklapne[0])) * (1 - dosed((u - PO.rozevre[0]) / (PO.rozevre[1] - PO.rozevre[0])));
  const dest = u < 0 ? 1 : Math.max(1 - smooth(u / PO.ztichne), smooth((u - PO.zatahne[1] + 0.5) / 1));

  const p = poza(dyn, t);
  const D = destnik(dyn, naPlatno(p.L.H));
  const G = geometrie(D);
  /* ——— kapky z roztočeného deštníku: letí po tečně a spadnou ——— */
  const tecna = (th) => {
    const a = G.okraj(th), b = G.okraj(th + 0.05);
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [a, [(b[0] - a[0]) / d, (b[1] - a[1]) / d]];
  };
  if (dyn.prsk) {
    for (let i = 0; i < dyn.prsk; i++) {
      const [a, tn] = tecna(R() * Math.PI * 2);
      const ven = norm([a[0] - D.C[0], a[1] - D.C[1]]);
      kapka(dyn, a[0], a[1], tn[0] * 46 + ven[0] * (26 + R() * 30), tn[1] * 46 + ven[1] * (26 + R() * 30) - 8, { zivot: 0.7 + R() * 0.5, r: 0.5 + R() * 0.35, svetla: R() < 0.4 });
    }
    dyn.prsk = 0;
  }
  dyn.akumK += dt * Math.max(0, Math.abs(dyn.om) - 1.2) * 7 * dest;
  while (dyn.akumK >= 1) {
    dyn.akumK -= 1;
    const [a, tn] = tecna(R() * Math.PI * 2);
    kapka(dyn, a[0], a[1], tn[0] * dyn.om * 9, tn[1] * dyn.om * 9 - 4, { zivot: 0.6 + R() * 0.3, svetla: R() < 0.3 });
  }
  /* ——— odkapává z nejnižšího místa okraje ——— */
  dyn.odkap -= dt * (0.4 + dest);
  if (dyn.odkap <= 0 && D.zav < 0.3) {
    dyn.odkap = 0.26 + R() * 0.5;
    const th = Math.round((Math.PI * 0.5 + (R() - 0.5) * 2.4 - D.phi) / ((Math.PI * 2) / ZEBER)) * ((Math.PI * 2) / ZEBER) + D.phi;
    const [x, y] = G.okraj(th);
    dyn.kapky.push({ x, y, vx: 0, vy: 0, vek: 0, zivot: 2.4, r: 0.6, visi: 0.05, th });
  }
  for (const k of dyn.kapky) {
    k.vek += dt;
    if (k.visi) {
      /* kapka se na konci žebra nalije a utrhne */
      k.visi += dt * 2.6;
      const [x, y] = G.okraj(k.th);
      k.x = x;
      k.y = y + 0.6 * k.visi;
      if (k.visi >= 1 || Math.abs(dyn.om) > 1.5) {
        k.visi = 0;
        k.vy = 6;
        k.vek = 0;
        k.zivot = 1.6;
      }
      continue;
    }
    k.vx += (dyn.vitr * 14 - k.vx * 0.8) * dt;
    k.vy += 150 * dt;
    k.x += k.vx * dt;
    k.y += k.vy * dt;
    /* o můstek se rozprskne */
    if (!k.dole && k.y > yMostu(k.x) - 0.5 && k.x > 4 && k.x < 176 && k.vy > 0) {
      k.dole = true;
      k.zivot = k.vek;
      dyn.cakance.push({ x: k.x, y: yMostu(k.x) - 0.4, vek: 0 });
      if (R() < 0.12) dyn.zvuk.push({ druh: "kap", sila: 0.3, pan: clamp((k.x - 90) / 80, -1, 1) });
    }
  }
  dyn.kapky = dyn.kapky.filter((k) => k.vek < k.zivot);
  /* ——— déšť bubnuje na papír a dělá kruhy na vodě ——— */
  dyn.akum += dt * dest;
  while (dyn.akum >= 0.045) {
    dyn.akum -= 0.045;
    if (D.zav < 0.3 && dyn.cakance.length < 30) {
      const a = R() * Math.PI * 2, q = Math.sqrt(R()) * 0.95;
      const o = G.okraj(a, q);
      dyn.cakance.push({ x: o[0], y: o[1], vek: 0 });
    }
    if (R() < 0.42 && dyn.kruhy.length < 26) dyn.kruhy.push({ x: 6 + R() * 168, y: HLADINA + 4 + R() * 20, r: 3 + R() * 5, vek: 0, zivot: 0.9 + R() * 0.6 });
  }
  for (const c of dyn.cakance) c.vek += dt;
  dyn.cakance = dyn.cakance.filter((c) => c.vek < 0.16);
  for (const k of dyn.kruhy) k.vek += dt;
  dyn.kruhy = dyn.kruhy.filter((k) => k.vek < k.zivot);
  /* ——— co na ní visí, vlaje po větru ——— */
  const fouka = dyn.vitr * (0.4 + 0.6 * dest) * (prsi ? 1 : 0.4);
  dyn.snury.forEach((q, i) => kyvadlo(q, kanzashiStred(p.yaw)[0], dt, { g: 52 + i * 9, c: 1.5 + i * 0.25, L: 17 + i * 2, vitr: fouka * (24 + i * 5) + 3 * Math.sin(t * (3.1 + i)) * Math.abs(fouka) }));
  kyvadlo(dyn.rukavy.L, p.L.H[0], dt, { g: 30, c: 2.6, L: 26, vitr: fouka * 13 + 2.4 * Math.sin(t * 2.7) * Math.abs(fouka) });
  kyvadlo(dyn.rukavy.P, p.Pr.H[0], dt, { g: 30, c: 2.6, L: 26, vitr: fouka * 13 + 2.4 * Math.sin(t * 2.3 + 1) * Math.abs(fouka) });
  kyvadlo(dyn.masle, VAZ.cx + (polomer(122) + 1.5) * Math.sin(rad(180 + p.yaw)), dt, { g: 26, c: 2.2, L: 30, vitr: fouka * 12 + 3 * Math.sin(t * 2.1 + 2) * Math.abs(fouka) });
  kyvadlo(dyn.vetev, 0, dt, { g: 46, c: 2.4, L: 30, vitr: fouka * 12 });
  /* ——— pohled ——— */
  const tv = naPlatno([90, 101]);
  const cil = vstup.mys && dyn.kouk > 0.3 ? [clamp((vstup.mys.x - tv[0]) / 30, -1, 1) * 1.9, clamp((vstup.mys.y - tv[1]) / 30, -1, 1) * 1.3] : [0, 0];
  dyn.pohled = dyn.pohled.map((v, i) => kCili(v, cil[i], dt, 0.14));
};
const stav = (t, vstup = {}, dyn) => {
  const d = dyn || novaDynamika();
  const p = poza(d, t);
  const u = p.u;
  const D = destnik(d, naPlatno(p.L.H));
  const dest = u < 0 ? 1 : Math.max(1 - smooth(u / PO.ztichne), smooth((u - PO.zatahne[1] + 0.5) / 1));
  const mesic = u < 0 ? 0 : smooth((u - PO.mesic[0]) / (PO.mesic[1] - PO.mesic[0])) * (1 - smooth((u - PO.zatahne[0]) / (PO.zatahne[1] - PO.zatahne[0])));
  const yaw = ((p.yaw % 360) + 360) % 360;
  return {
    t, d: D, dest, mesic, svit: D.svit, vitr: d.vitr, kapky: d.kapky, kruhy: d.kruhy, cakance: d.cakance, pohled: d.pohled,
    vyraz: p.ohl > 0.5 ? "usmev" : d.kouk > 0.3 ? "kouka" : "klid",
    o: {
      yaw, m: M, P, rust: 1,
      kyv: { masle: d.masle.a, snury: d.snury.map((q) => deg(q.a)), vetev: deg(d.vetev.a) * 0.5 },
      ruce: { L: { ...p.L, kyv: deg(d.rukavy.L.a) }, P: { ...p.Pr, kyv: deg(d.rukavy.P.a) } },
      vejir: null,
    },
    /* proti větru se maličko opře */
    fig: { x: 0, y: 0.4 * Math.sin(t * 1.4), r: -2.6 * d.vitr * (u < 0 ? 1 : 0.3) + 2.5 * p.ohl },
    mrk: mrkani(t, [2.3, 5.9, 6.15, 9.4], 10.6),
  };
};
const snimek = (st) => Math.floor(st.t * 30);
const yawQ = (st) => Math.round(st.o.yaw / 2);
const pohyb = (st) => ({ x: st.fig.x, y: st.fig.y, r: st.fig.r, ox: FX, oy: ZEM });

export const lemDestnik = {
  id: "destnik",
  viewBox: "0 0 180 180",
  defs,
  novaDynamika,
  krok,
  stav,
  hukot: (st) => ({ dest: st.dest * (0.7 + 0.3 * Math.abs(st.vitr)), vitr: 0.12 + 0.3 * Math.abs(st.vitr) }),
  klidne: { t: 2.4 },
  vrstvy: [
    { id: "tus", kresli: vrstvaTus, tezka: true },
    { id: "mesic", kresli: vrstvaMesic, orez: OREZ, pruhlednost: (st) => f(st.mesic) },
    { id: "mraky", kresli: vrstvaMraky, klic: (st) => Math.round(st.mesic * 120), orez: OREZ, pruhlednost: (st) => f(1 - 0.8 * st.mesic) },
    { id: "dest", kresli: vrstvaDest, klic: (st) => (st.dest > 0.02 ? snimek(st) : -1), orez: OREZ },
    { id: "voda", kresli: vrstvaVoda, klic: (st) => Math.floor(st.t * 20), orez: OREZ },
    { id: "most", kresli: vrstvaMost, orez: OREZ },
    { id: "za", kresli: (st) => vPostave(vazZa(ID, st.o)), klic: (st) => `${yawQ(st)},${Math.round(st.o.kyv.masle * 30)}`, pohyb },
    { id: "rukavy-za", kresli: (st) => vPostave(vazRukavy(ID, st.o, true, { listky: "#B9B6D6" })), klic: (st) => klicRukavu(st.o), pohyb },
    { id: "okobo", kresli: (st) => vPostave(vazBoty(ID, st.o)), klic: yawQ },
    { id: "vetvicka", kresli: (st) => vPostave(vazVetvicka(ID, M, { kyv: st.o.kyv.vetev, P })), klic: (st) => Math.round(st.o.kyv.vetev * 4), pohyb },
    { id: "telo", kresli: (st) => vPostave(vazTelo(ID, { yaw: st.o.yaw, P, listky: "#B9B6D6", listky2: "#9A8CB8" })), klic: yawQ, pohyb },
    { id: "tvar", kresli: vrstvaTvar, klic: (st) => `${f(st.pohled[0])},${f(st.pohled[1])},${f(st.mrk)},${st.vyraz},${yawQ(st)}`, pohyb },
    { id: "pred", kresli: (st) => vPostave(vazPred(ID, st.o)), klic: (st) => `${yawQ(st)},${Math.round(st.o.kyv.masle * 30)}`, pohyb },
    { id: "snury", kresli: (st) => vPostave(vazSnury(ID, M, { yaw: st.o.yaw, kyv: st.o.kyv.snury, P })), klic: (st) => `${yawQ(st)},${st.o.kyv.snury.map((a) => Math.round(a * 2)).join(",")}`, pohyb },
    { id: "rukavy-pred", kresli: (st) => vPostave(vazRukavy(ID, st.o, false, { listky: "#B9B6D6" })), klic: (st) => klicRukavu(st.o), pohyb },
    { id: "destnik", kresli: vrstvaDestnik, klic: klicDestniku, orez: OREZ },
    { id: "kapky", kresli: vrstvaKapky, klic: (st) => (st.kapky.length || st.cakance.length ? snimek(st) : -1), orez: OREZ },
    { id: "zabradli", kresli: vrstvaZabradliPred, orez: OREZ },
  ],
};
