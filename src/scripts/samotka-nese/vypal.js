/*
 * ═══════════════════════════════════════════════════════════════════
 * 2 — VÝPAL
 * Řez pecí s řetězovkovou klenbou — takovou si hrnčíři staví sami, protože
 * oblouk ve tvaru visícího řetězu drží jen svou vahou a nepotřebuje
 * železnou kostru. Uvnitř leží Šamotka na sloupcích a na ní hrnky.
 * Jeden celý výpal trvá půl minuty:
 *
 *   sázení      ruce postaví na Šamotku čtyři hrnky se surovou glazurou
 *               a nakonec trojici žároměrek v hliněné podložce
 *   výpal       hořáky zahučí, pec se rozsvítí: tmavě rudá, třešňová,
 *               oranžová, žlutá. Uprostřed se přiškrtí tah (redukce),
 *               z komína jde černý kouř a plameny šlehají ven kolem hořáků.
 *               Šamotka si horko užívá — vysoké teploty má nejradši.
 *               Glazura z vázy steče až na ni (au) a žároměrky se ohnou.
 *   chladnutí   barvy zhasínají v opačném pořadí. Tenké hrnky chladnou
 *               rychleji než tlustá Šamotka, která drží teplo nejdéle.
 *               Seladon a šino praskají do sítě kannjú a pec u toho zpívá.
 *   vysázení    ruce hrnky vyndají — už mají skutečné barvy: měděná
 *               červeň šinša, zelený seladon, černá temmoku s rezavým
 *               okrajem… Váza je k Šamotce přilepená stečenou glazurou,
 *               musí se trhnout. Nakonec ruka Šamotku dvakrát poplácá.
 *               Jediný okamžik, kdy otevře oči.
 *
 * Kapky glazury na ní zůstávají — z každého výpalu jedna. Proto má ty
 * skvrny. Kliknutí: když pec stojí, začne nový výpal; když se topí,
 * přidá se plyn; jinak se Šamotka podívá, kdo to byl.
 * ═══════════════════════════════════════════════════════════════════
 */
import {
  f, rng, clamp, lerp, smooth, krokem, easeInOut, rad, mix, pt, cara, hladka, pasPoBodech, jazyk, jiskraD, zar,
  samotkaDefs, samotkaTelo, samotkaTvar, vSamotce, naScenu, OBRYS_D, filtrLinka, provaz, shide,
} from "./zaklad.js";

export const V2 = (() => {
  /* ——— Klenba: řetězovka y = a·cosh(u/a), u je vodorovně od středu ——— */
  const PEC = { x: 90, zem: 150, H: 124, L: 63, t1: 9, t2: 7 };
  const A = (() => {
    let lo = 5, hi = 300;
    for (let i = 0; i < 80; i++) {
      const m = (lo + hi) / 2;
      if (m * (Math.cosh(PEC.L / m) - 1) > PEC.H) lo = m;
      else hi = m;
    }
    return (lo + hi) / 2;
  })();
  const yOblouk = (u) => PEC.zem - PEC.H + A * (Math.cosh(u / A) - 1);
  const S_PUL = A * Math.sinh(PEC.L / A);
  /** Bod na vnitřní klenbě podle délky oblouku s (0 = vrchol), s vnější normálou. */
  const bod = (s) => {
    const u = A * Math.asinh(s / A);
    const ty = Math.sinh(u / A);
    const d = Math.hypot(1, ty);
    return { x: PEC.x + u, y: yOblouk(u), nx: ty / d, ny: -1 / d };
  };
  const odsad = (b, o) => [b.x + b.nx * o, b.y + b.ny * o];
  const klenba = (o, n = 64) => Array.from({ length: n + 1 }, (_, i) => odsad(bod(lerp(-S_PUL, S_PUL, i / n)), o));
  const VNITREK = klenba(0);
  const VNITREK_D = `${cara(VNITREK)} L${PEC.x + PEC.L} ${PEC.zem} L${PEC.x - PEC.L} ${PEC.zem} Z`;
  /** x vnitřní a vnější stěny ve výšce y (pro průduchy hořáků). */
  const stenaVeVysce = (y, o) => {
    let lo = -S_PUL, hi = 0;
    for (let i = 0; i < 40; i++) {
      const m = (lo + hi) / 2;
      if (odsad(bod(m), o)[1] > y) lo = m;
      else hi = m;
    }
    return odsad(bod((lo + hi) / 2), o)[0];
  };

  /* ——— Šamotka na sloupcích a místa pro hrnky ——— */
  const FIG = { x: 90, y: 125, s: 0.8 };
  const vSam = vSamotce(FIG);
  const naSc = naScenu(FIG);
  const VRCH = 109;
  const TVAR = naSc([90, 97]);
  const SLOTY = [58, 81, 102, 121];
  const KUZELY = [134, VRCH];

  /* ——— Hrnky: profil [výška, poloměr] odspodu nahoru ——— */
  const TVARY = {
    tsubo: { P: [[0, 4.2], [1.8, 4.2], [2.3, 4.7], [6, 6.8], [11, 7.6], [16, 7.2], [22, 5.6], [26, 3.6], [28.2, 3], [30.6, 3.2], [32, 4.2]], usti: 0.18, glazura: 2.4 },
    chawan: { P: [[0, 3.6], [1.9, 3.6], [2.4, 4.5], [5, 7.2], [8.5, 8.9], [11.5, 9.6]], usti: 0.26, glazura: 2.6 },
    kame: { P: [[0, 4.2], [1.6, 4.2], [2.1, 5], [6, 7], [10, 7.3], [14, 6], [16.6, 4.4], [17.4, 4], [19, 4.4]], usti: 0.2, glazura: 2.3 },
    yunomi: { P: [[0, 3.8], [1.6, 3.8], [2, 4.4], [6, 4.7], [10, 4.9], [13.5, 5.1]], usti: 0.24, glazura: 2.2 },
    tokkuri: { P: [[0, 3.6], [1.6, 3.6], [2.1, 4.6], [5, 6.4], [8, 6.6], [11, 5.4], [14, 2.6], [17, 1.9], [19, 2.1], [20, 2.7]], usti: 0.2, glazura: 2.2 },
  };
  const vyskaTvaru = (tv) => TVARY[tv].P[TVARY[tv].P.length - 1][0];
  const polomer = (tv, y) => {
    const P = TVARY[tv].P;
    if (y <= P[0][0]) return P[0][1];
    for (let i = 1; i < P.length; i++) if (y <= P[i][0]) return lerp(P[i - 1][1], P[i][1], (y - P[i - 1][0]) / (P[i][0] - P[i - 1][0]));
    return P[P.length - 1][1];
  };
  /** Obrys hrnku v jeho souřadnicích (počátek uprostřed dna, nahoru je −y). Od výšky `od` výš, spodní hrana může být zvlněná. */
  const obrysHrnku = (tv, od = 0, vlna = null) => {
    const P = TVARY[tv].P.filter(([y]) => y > od);
    const r0 = polomer(tv, od);
    const L = [[-r0, -od], ...P.map(([y, r]) => [-r, -y])];
    const Pr = [...P.map(([y, r]) => [r, -y]).reverse(), [r0, -od]];
    let d = `M${pt(L[0])}`;
    d += " " + hladka(L).slice(1).replace(/^[^C]*/, "");
    d += ` L${pt(Pr[0])} ` + hladka(Pr).slice(1).replace(/^[^C]*/, "");
    if (vlna) {
      const n = 10;
      for (let i = 1; i < n; i++) {
        const k = i / n;
        d += ` L${f(lerp(r0, -r0, k))} ${f(-od + vlna(k))}`;
      }
    }
    return d + " Z";
  };
  const GLAZURY = {
    nagare: { syrova: "#C2BBA8", telo: "#6A4A36", hotova: "#4E7A3E", okraj: "#7FA85A", prask: false },
    shinsha: { syrova: "#A8B49C", telo: "#B08A68", hotova: "#A11E26", okraj: "#E9D2C2", prask: false },
    seiji: { syrova: "#D8CDB8", telo: "#A88C70", hotova: "#8FBFA2", okraj: "#B9DCC6", prask: true },
    tenmoku: { syrova: "#9C7A5E", telo: "#8A6A50", hotova: "#1C1816", okraj: "#8A4A22", prask: false },
    shino: { syrova: "#F2E8E0", telo: "#C49A78", hotova: "#F2EBE2", okraj: "#E8A070", prask: true },
    ruri: { syrova: "#9AA4B4", telo: "#A88C70", hotova: "#22388A", okraj: "#6A82C4", prask: false },
  };
  const OSTATNI_TVARY = ["chawan", "kame", "yunomi", "tokkuri"];
  const OSTATNI_GLAZURY = ["shinsha", "seiji", "tenmoku", "shino", "ruri"];
  /** Čtyři hrnky na jeden výpal: váza se stékající glazurou vždycky, ostatní podle náhody. */
  const novaSada = (R, cislo) => {
    const tvary = [...OSTATNI_TVARY].sort(() => R() - 0.5);
    const glazury = [...OSTATNI_GLAZURY].sort(() => R() - 0.5);
    /* aspoň jeden hrnek, který bude praskat */
    if (!glazury.slice(0, 3).some((g) => GLAZURY[g].prask)) glazury[2] = R() < 0.5 ? "seiji" : "shino";
    const sada = [{ tvar: "tsubo", glazura: "nagare" }, { tvar: tvary[0], glazura: glazury[0] }, { tvar: tvary[1], glazura: glazury[1] }, { tvar: tvary[2], glazura: glazury[2] }];
    return sada.map((h, i) => {
      const seed = cislo * 31 + i * 7 + 3;
      return { ...h, i, x: SLOTY[i], seed, praskliny: GLAZURY[h.glazura].prask ? praskliny(h.tvar, seed) : [], ukazano: 0 };
    });
  };
  /** Síť prasklin kannjú: náhodné procházky po glazuře, každá úsečka zvlášť (odhalují se postupně). */
  const praskliny = (tv, seed) => {
    const r = rng(seed);
    const H = vyskaTvaru(tv);
    const U = [];
    for (let i = 0; i < 9; i++) {
      let y = TVARY[tv].glazura + 1 + r() * (H - TVARY[tv].glazura - 2);
      let x = (r() - 0.5) * 1.6 * polomer(tv, y);
      let a = r() * Math.PI * 2;
      for (let k = 0; k < 4 + Math.floor(r() * 4); k++) {
        a += (r() - 0.5) * 1.8;
        const x2 = x + Math.cos(a) * 2.2, y2 = clamp(y + Math.sin(a) * 2.2, TVARY[tv].glazura + 0.6, H - 0.6);
        const lim = polomer(tv, y2) - 0.4;
        const x2c = clamp(x2, -lim, lim);
        U.push([x, -y, x2c, -y2]);
        x = x2c;
        y = y2;
      }
    }
    return U.sort(() => r() - 0.5);
  };
  /* Stékající glazura vázy: proudy z ramene dolů, poslední až na Šamotku */
  const PROUDY = (() => {
    const r = rng(77);
    return Array.from({ length: 8 }, (_, i) => {
      const k = (i + 0.5) / 8;
      return { k, delka: 0.35 + r() * 0.45, sirka: 0.7 + r() * 0.7, fz: r() };
    });
  })();

  /** Hrnek ve scéně: stav { T (°C), roztavena 0…1, stekani 0…1, ukazano prasklin, zar } */
  const hrnek = (h, { x, y, rot = 0, T = 20, roztavena = 0, stekani = 0, svetlo = 1 }) => {
    const tv = TVARY[h.tvar];
    const gl = GLAZURY[h.glazura];
    const H = vyskaTvaru(h.tvar);
    const rTop = tv.P[tv.P.length - 1][1];
    const m = smooth(roztavena);
    const tma = (c) => mix(c, "#1A100C", (1 - svetlo) * 0.62);
    const obrys = obrysHrnku(h.tvar);
    let s = "";
    /* tělo z hlíny: přežahnutý střep, po výpalu tmavší */
    s += `<path d="${obrys}" fill="${tma(mix("#E6D3B6", gl.telo, m))}" stroke="${tma("#4A3A2E")}" stroke-width="0.45" stroke-linejoin="round"/>`;
    /* glazura: syrová je matná a práškovitá, roztavená stéká a leskne se */
    const vlna = (k) => m * (Math.sin(k * 9 + h.seed) * 0.5 + Math.sin(k * 23 + h.seed * 2) * 0.3) - m * 0.6;
    const glD = obrysHrnku(h.tvar, tv.glazura, vlna);
    const barva = mix(gl.syrova, gl.hotova, m);
    s += `<path d="${glD}" fill="${tma(barva)}"/>`;
    if (m < 0.95) s += `<path d="${glD}" fill="url(#sn2-prasek)" opacity="${f(1 - m)}"/>`;
    /* efekty po výpalu */
    if (m > 0.05) {
      let e = "";
      if (h.glazura === "nagare") {
        const yR = 22;
        for (const p of PROUDY) {
          const rx = lerp(-1, 1, p.k) * polomer(h.tvar, yR) * 0.9;
          const konec = yR * (1 - p.delka * stekani);
          e += `<path d="M${f(rx)} ${-yR} Q${f(rx + Math.sin(p.fz * 6) * 0.8)} ${f(-(yR + konec) / 2)} ${f(rx * 1.05)} ${f(-konec)}" stroke="${tma(gl.okraj)}" stroke-width="${f(p.sirka * 1.6)}" stroke-linecap="round" fill="none" opacity="0.85"/>`;
          e += `<circle cx="${f(rx * 1.05)}" cy="${f(-konec + 0.4)}" r="${f(p.sirka * 1.05)}" fill="${tma("#3E6A34")}"/>`;
        }
        e += `<path d="M${f(-polomer(h.tvar, 24) * 0.98)} -24 Q0 -21 ${f(polomer(h.tvar, 24) * 0.98)} -24" stroke="${tma("#9CC27A")}" stroke-width="2" fill="none" opacity="0.6"/>`;
      } else if (h.glazura === "tenmoku") {
        for (let i = 0; i < 9; i++) {
          const k = (i + 0.5) / 9;
          const xx = lerp(-1, 1, k) * rTop * 0.9;
          e += `<path d="M${f(xx)} ${f(-H + 0.8)} L${f(xx * 0.92)} ${f(-H * 0.45)}" stroke="${tma("#6A3A1E")}" stroke-width="0.35" opacity="0.8"/>`;
        }
        e += `<path d="${obrysHrnku(h.tvar, H - 2.2)}" fill="${tma(gl.okraj)}" opacity="0.85"/>`;
      } else if (h.glazura === "shino") {
        e += `<ellipse cx="${f(rTop * 0.35)}" cy="${f(-H * 0.45)}" rx="${f(rTop * 0.6)}" ry="${f(H * 0.22)}" fill="${tma(gl.okraj)}" opacity="0.55"/>`;
        const r = rng(h.seed + 5);
        for (let i = 0; i < 7; i++) e += `<circle cx="${f((r() - 0.5) * rTop * 1.3)}" cy="${f(-tv.glazura - 1 - r() * (H - tv.glazura - 2))}" r="0.28" fill="${tma("#B8A898")}"/>`;
      } else if (h.glazura === "shinsha") {
        e += `<path d="${obrysHrnku(h.tvar, H - 1.3)}" fill="${tma(gl.okraj)}" opacity="0.8"/>`;
        e += `<ellipse cx="${f(-rTop * 0.2)}" cy="${f(-H * 0.35)}" rx="${f(rTop * 0.5)}" ry="${f(H * 0.2)}" fill="${tma("#6E0E16")}" opacity="0.5"/>`;
      } else if (h.glazura === "seiji" || h.glazura === "ruri") {
        e += `<path d="${obrysHrnku(h.tvar, H - 1.2)}" fill="${tma(gl.okraj)}" opacity="0.7"/>`;
      }
      if (h.praskliny.length && h.ukazano > 0) {
        e += `<path d="${h.praskliny.slice(0, h.ukazano).map(([a, b, c, d]) => `M${f(a)} ${f(b)} L${f(c)} ${f(d)}`).join(" ")}" stroke="${tma(h.glazura === "seiji" ? "#4E6E5A" : "#9A8A78")}" stroke-width="0.28" fill="none" opacity="0.85"/>`;
      }
      s += `<g opacity="${f(m)}">${e}</g>`;
      /* lesk */
      s += `<path d="M${f(-polomer(h.tvar, H * 0.7) * 0.62)} ${f(-H * 0.82)} Q${f(-polomer(h.tvar, H * 0.5) * 0.82)} ${f(-H * 0.5)} ${f(-polomer(h.tvar, H * 0.3) * 0.6)} ${f(-H * 0.28)}" stroke="#FFFFFF" stroke-width="0.9" fill="none" stroke-linecap="round" opacity="${f(0.55 * m * svetlo)}"/>`;
    }
    /* ústí */
    s += `<ellipse cx="0" cy="${f(-H)}" rx="${f(rTop)}" ry="${f(rTop * tv.usti)}" fill="${tma(mix(mix(gl.syrova, gl.hotova, m), "#1A100C", 0.35))}" stroke="${tma("#4A3A2E")}" stroke-width="0.4"/>`;
    /* žár přes všechno */
    const g = zarSila(T);
    if (g > 0.01) s += `<path d="${obrys}" fill="${zar(zarBarva(T))}" opacity="${f(g * 0.94)}"/><ellipse cx="0" cy="${f(-H)}" rx="${f(rTop)}" ry="${f(rTop * tv.usti)}" fill="${zar(zarBarva(T + 30))}" opacity="${f(g * 0.9)}"/>`;
    return `<g transform="translate(${pt([x, y])}) rotate(${f(rot)})">${s}</g>`;
  };

  /* ——— Žár podle teploty ve °C ——— */
  const zarSila = (T) => Math.pow(clamp((T - 470) / 760), 0.85);
  const zarBarva = (T) => clamp((T - 470) / 840);

  /* ——— Žároměrky: tři kužely v podložce, nakloněné o 8°, ohýbají se podle práce tepla ——— */
  const kuzely = (ohyb, T, svetlo) => {
    const [x0, y0] = KUZELY;
    const tma = (c) => mix(c, "#1A100C", (1 - svetlo) * 0.62);
    let s = `<path d="M${f(x0 - 4.8)} ${y0} Q${f(x0 - 5)} ${f(y0 - 2.6)} ${f(x0 - 2.4)} ${f(y0 - 2.7)} L${f(x0 + 2.8)} ${f(y0 - 2.6)} Q${f(x0 + 5)} ${f(y0 - 2.5)} ${f(x0 + 4.8)} ${y0} Z" fill="${tma("#D9C3A2")}" stroke="${tma("#6B5D4F")}" stroke-width="0.4"/>`;
    const g = zarSila(T);
    [-2.9, 0, 2.9].forEach((dx, i) => {
      const b = clamp(ohyb[i]);
      const B = [];
      let x = x0 + dx, y = y0 - 2.4;
      const N = 9, L = 9;
      for (let k = 0; k <= N; k++) {
        B.push([x, y]);
        const a = rad(-82 + b * 112 * Math.pow(k / N, 1.3));
        x += (Math.cos(a) * L) / N;
        y += (Math.sin(a) * L) / N;
      }
      const d = pasPoBodech(B, (u) => 1.9 * (1 - u * 0.86));
      s += `<path d="${d}" fill="${tma("#F2E6CF")}" stroke="${tma("#8A6A4A")}" stroke-width="0.35" stroke-linejoin="round"/>`;
      if (g > 0.01) s += `<path d="${d}" fill="${zar(zarBarva(T + 20))}" opacity="${f(g * 0.92)}"/>`;
    });
    return s;
  };

  /* ——— Ruce hrnčíře: z rukávu samue, přicházejí zpředu (od nás) ——— */
  const LOKET = { P: [206, 212], L: [-26, 212] };
  /**
   * Ruka v poloze dlaně D. smer 1 = pravá (od pravého dolního rohu), −1 levá.
   * poza: drzi (prsty kolem hrnku o poloměru r) | plac (dlaň na plocho) | otevrena
   */
  const ruka = (D, smer, poza, r = 5) => {
    const E = smer > 0 ? LOKET.P : LOKET.L;
    const W = [D[0] + smer * 5.4, D[1] + 4.6];
    const B = Array.from({ length: 9 }, (_, i) => [lerp(W[0], E[0], i / 8), lerp(W[1], E[1], i / 8)]);
    const predlokti = pasPoBodech(B, (u) => 8.6 + u * 4.4);
    const rukav = pasPoBodech(B.slice(2), (u) => 16 + u * 6);
    let s = `<path d="${predlokti}" fill="#E9BE98" stroke="#8A5E44" stroke-width="0.5"/>`;
    s += `<path d="${rukav}" fill="#33416A" stroke="#1E2640" stroke-width="0.6"/>`;
    s += `<path d="${cara([B[2], B[8]])}" stroke="#4E5E8E" stroke-width="1.2" opacity="0.5" transform="translate(${-smer * 2.5} -2)"/>`;
    const lem = B[2];
    const smerRuky = Math.atan2(E[1] - W[1], E[0] - W[0]);
    s += `<path d="M${pt([lem[0] + Math.cos(smerRuky + Math.PI / 2) * 7.6, lem[1] + Math.sin(smerRuky + Math.PI / 2) * 7.6])} L${pt([lem[0] - Math.cos(smerRuky + Math.PI / 2) * 7.6, lem[1] - Math.sin(smerRuky + Math.PI / 2) * 7.6])}" stroke="#E9E2D2" stroke-width="1.6" stroke-linecap="round"/>`;
    const kuze = "#EFC9A6", stin = "#D9A982", linka = "#8A5E44";
    /* dlaň a hřbet */
    s += `<g transform="translate(${pt(D)}) scale(${smer} 1)">`;
    if (poza === "drzi") {
      const delka = r * 1.5 + 3;
      s += `<path d="M3.6 -5.4 Q8.4 -5.6 9.4 -1 Q9.6 4.4 5.4 6 Q1.6 6.6 0.6 3.4 Z" fill="${kuze}" stroke="${linka}" stroke-width="0.5"/>`;
      for (let i = 0; i < 4; i++) {
        const y = -4.3 + i * 2.35;
        const dl = delka - Math.abs(i - 1.2) * 1.1;
        s += `<path d="M2.4 ${f(y)} H${f(-dl + 1.2)} A1.15 1.15 0 0 0 ${f(-dl + 1.2)} ${f(y + 2.3)} H2.4" fill="${kuze}" stroke="${linka}" stroke-width="0.45"/>`;
      }
      s += `<path d="M2.6 -4.6 V5.2" stroke="${stin}" stroke-width="0.8" opacity="0.7"/>`;
    } else if (poza === "plac") {
      s += `<path d="M10 -1.8 Q4 -4.4 -3 -3.4 L-13.6 -2.2 Q-15.8 -1.2 -13.8 0.4 L-2 1.6 Q5 2.6 10 2.2 Z" fill="${kuze}" stroke="${linka}" stroke-width="0.5"/>`;
      s += `<path d="M-4 -2.2 L-13 -1.2 M-4 -0.6 L-12.6 0" stroke="${stin}" stroke-width="0.45"/>`;
      s += `<path d="M2.6 -3.6 Q-1 -6.2 -5.2 -5.6" stroke="${kuze}" stroke-width="2.6" stroke-linecap="round" fill="none"/><path d="M2.6 -3.6 Q-1 -6.2 -5.2 -5.6" stroke="${linka}" stroke-width="0.45" fill="none" opacity="0.5"/>`;
    } else {
      s += `<path d="M3.6 -5 Q8.4 -5.4 9.2 -1 Q9.4 4.4 5.4 5.6 Q1.6 6 0.6 3 Z" fill="${kuze}" stroke="${linka}" stroke-width="0.5"/>`;
      for (let i = 0; i < 4; i++) {
        const y = -4 + i * 2.2;
        s += `<path d="M2.4 ${f(y)} L${f(-5.4 + Math.abs(i - 1.3))} ${f(y - 1.2 + i * 0.3)} A1.05 1.05 0 0 0 ${f(-5.2 + Math.abs(i - 1.3))} ${f(y + 0.9 + i * 0.3)} L2.4 ${f(y + 2)}" fill="${kuze}" stroke="${linka}" stroke-width="0.45"/>`;
      }
    }
    s += `</g>`;
    return s;
  };

  /* ═══ Rozvrh jednoho výpalu (sekundy) ═══ */
  const T_SAZENI = [0, 1.05, 2.1, 3.15];
  const POR_SAZENI = [3, 2, 0, 1];
  const T_KUZELY = 4.2;
  const ZAVRENI = 5.0;
  const ZAPAL = 5.5;
  const VYPAL = 9;
  const VYDRZ = 1.6;
  const VYPNUTI = ZAPAL + VYPAL + VYDRZ;
  const OTEVRENI = VYPNUTI + 6.6;
  const T_VYNDANI = [0.5, 1.5, 2.5, 3.8].map((x) => OTEVRENI + x);
  const POR_VYNDANI = [3, 2, 1, 0];
  const T_KUZELY_VEN = OTEVRENI + 5.0;
  const PLACANI = OTEVRENI + 5.9;
  const KONEC = PLACANI + 3.6;

  /** Teplota vzduchu v peci (°C) v čase cyklu u. */
  const teplotaVzduchu = (u) => {
    if (u < ZAPAL) return 20;
    const tau = u - ZAPAL;
    if (tau < VYPAL) return 20 + 1280 * (1 - Math.pow(1 - tau / VYPAL, 1.7));
    if (tau < VYPAL + VYDRZ) return 1300;
    return 20 + 1280 * Math.exp(-(tau - VYPAL - VYDRZ) / 2.3);
  };
  const redukce = (u) => {
    const tau = u - ZAPAL;
    return krokem(4.6, 5.2, tau) * (1 - krokem(6.6, 7.2, tau));
  };
  const horaky = (u) => (u < ZAPAL || u > VYPNUTI ? 0 : krokem(ZAPAL, ZAPAL + 0.25, u));
  const svetloDne = (u) => 1 - krokem(ZAVRENI - 0.3, ZAVRENI + 0.2, u) + krokem(OTEVRENI - 0.2, OTEVRENI + 0.5, u);

  /** Kde je ruka a co nese v čase cyklu u. */
  const stavRukou = (u, sada) => {
    const ruce = [];
    const pohyb = (t0, cil, start, nese, smer) => {
      const k = u - t0;
      if (k < 0 || k > 1.0) return null;
      let D;
      let drzi = false;
      if (k < 0.45) {
        D = [lerp(start[0], cil[0], easeInOut(k / 0.45)), lerp(start[1], cil[1] - 6, easeInOut(k / 0.45))];
        drzi = !!nese.dovnitr;
      } else if (k < 0.6) {
        D = [cil[0], cil[1] - 6 + 6 * smooth((k - 0.45) / 0.15)];
        drzi = true;
      } else {
        const z = easeInOut((k - 0.6) / 0.4);
        D = [lerp(cil[0], start[0], z), lerp(cil[1], start[1], z)];
        drzi = !nese.dovnitr;
      }
      return { D, smer, drzi, k };
    };
    /* sázení */
    T_SAZENI.forEach((t0, j) => {
      const i = POR_SAZENI[j];
      const h = sada[i];
      const smer = h.x > 90 ? 1 : -1;
      const H = vyskaTvaru(h.tvar);
      const vyskaUchopu = Math.min(H * 0.45, 7);
      const r = polomer(h.tvar, vyskaUchopu);
      const cil = [h.x + smer * (r + 2.2), VRCH - vyskaUchopu];
      const start = smer > 0 ? [190, 196] : [-10, 196];
      const p = pohyb(t0, cil, start, { dovnitr: true }, smer);
      if (p) ruce.push({ ...p, hrnek: i, r, drzi: p.k < 0.6, polozeno: p.k >= 0.6, uchop: vyskaUchopu });
    });
    /* žároměrky */
    {
      const p = pohyb(T_KUZELY, [KUZELY[0] + 4.6, KUZELY[1] - 4], [190, 196], { dovnitr: true }, 1);
      if (p) ruce.push({ ...p, kuzely: true, r: 2.5, drzi: p.k < 0.6, polozeno: p.k >= 0.6 });
    }
    /* vysázení: ruka přijde prázdná, chytí a odnese */
    T_VYNDANI.forEach((t0, j) => {
      const i = POR_VYNDANI[j];
      const h = sada[i];
      const smer = h.x > 90 ? 1 : -1;
      const H = vyskaTvaru(h.tvar);
      const vyskaUchopu = Math.min(H * 0.45, 7);
      const r = polomer(h.tvar, vyskaUchopu);
      const cil = [h.x + smer * (r + 2.2), VRCH - vyskaUchopu];
      const start = smer > 0 ? [190, 196] : [-10, 196];
      const lepi = h.glazura === "nagare";
      const k = u - t0;
      const delka = lepi ? 1.7 : 1.0;
      if (k < 0 || k > delka) return;
      let D, drzi, trhnuti = 0;
      if (k < 0.45) {
        D = [lerp(start[0], cil[0], easeInOut(k / 0.45)), lerp(start[1], cil[1] - 4, easeInOut(k / 0.45)) + 4 * smooth(k / 0.45)];
        drzi = false;
      } else if (lepi && k < 1.15) {
        /* váza drží: dvakrát zacuká, pak povolí */
        const q = k - 0.45;
        trhnuti = Math.max(0, Math.sin(q * Math.PI * 4)) * (q < 0.5 ? 0.6 : 1);
        D = [cil[0] + smer * trhnuti * 0.6, cil[1] - trhnuti * 1.4];
        drzi = true;
      } else {
        const z = easeInOut((k - (lepi ? 1.15 : 0.45)) / (delka - (lepi ? 1.15 : 0.45)));
        D = [lerp(cil[0], start[0], z), lerp(cil[1], start[1], z) - 10 * Math.sin(Math.PI * z)];
        drzi = true;
      }
      ruce.push({ D, smer, drzi, hrnek: i, r, ven: true, uchop: vyskaUchopu, trhnuti, k });
    });
    {
      const k = u - T_KUZELY_VEN;
      if (k >= 0 && k <= 0.9) {
        const cil = [KUZELY[0] + 4.6, KUZELY[1] - 4];
        const start = [190, 196];
        const D = k < 0.4 ? [lerp(start[0], cil[0], easeInOut(k / 0.4)), lerp(start[1], cil[1], easeInOut(k / 0.4))] : [lerp(cil[0], start[0], easeInOut((k - 0.4) / 0.5)), lerp(cil[1], start[1], easeInOut((k - 0.4) / 0.5))];
        ruce.push({ D, smer: 1, drzi: k >= 0.4, kuzely: true, r: 2.5, ven: true, k });
      }
    }
    /* poplácání: ruka na rameno Šamotky, dvakrát */
    {
      const k = u - PLACANI;
      if (k >= 0 && k <= 2.4) {
        const cil = [124, VRCH - 2.2];
        const start = [196, 186];
        let D;
        if (k < 0.55) D = [lerp(start[0], cil[0], easeInOut(k / 0.55)), lerp(start[1], cil[1] - 3, easeInOut(k / 0.55))];
        else if (k < 1.55) {
          const q = (k - 0.55) / 1.0;
          D = [cil[0], cil[1] - 3 + 3 * Math.abs(Math.sin(q * Math.PI * 2))];
        } else D = [lerp(cil[0], start[0], easeInOut((k - 1.55) / 0.85)), lerp(cil[1], start[1], easeInOut((k - 1.55) / 0.85))];
        ruce.push({ D, smer: 1, plac: true, k });
      }
    }
    return ruce;
  };

  /* ——— Statické kusy ——— */
  const CIHLA = { svetla: "#E9D3A6", stred: "#D9B98A", tmava: "#B8956A", spara: "#8A6A4E" };
  const IZOL = { svetla: "#EFE6DA", stred: "#E2D6C6", spara: "#B0A190" };
  const vrstvaPec = () => {
    let s = "";
    /* vnější izolační vrstva */
    const vrstva = (o1, o2, delka, posun, barvy, seed) => {
      const r = rng(seed);
      let c = "";
      const S = 2 * S_PUL;
      const n = Math.round(S / delka);
      for (let i = 0; i < n; i++) {
        const s1 = lerp(-S_PUL, S_PUL, (i + posun) / n), s2 = lerp(-S_PUL, S_PUL, Math.min(n, i + 1 + posun) / n);
        if (s1 >= S_PUL) continue;
        const a = bod(Math.max(-S_PUL, s1)), b = bod(Math.min(S_PUL, s2));
        const P = [odsad(a, o1), odsad(b, o1), odsad(b, o2), odsad(a, o2)];
        const barva = mix(barvy.svetla, barvy.stred, r());
        c += `<path d="${cara(P)} Z" fill="${barva}" stroke="${barvy.spara}" stroke-width="0.55" stroke-linejoin="round"/>`;
      }
      /* první půlcihla u paty, ať vrstva začíná u země */
      if (posun > 0) {
        const a = bod(-S_PUL), b = bod(lerp(-S_PUL, S_PUL, posun / n));
        c += `<path d="${cara([odsad(a, o1), odsad(b, o1), odsad(b, o2), odsad(a, o2)])} Z" fill="${barvy.stred}" stroke="${barvy.spara}" stroke-width="0.55"/>`;
      }
      return c;
    };
    s += vrstva(PEC.t1, PEC.t1 + PEC.t2, 7.4, 0.5, IZOL, 5);
    s += vrstva(0, PEC.t1, 6.2, 0, CIHLA, 9);
    /* vnější hrana a stín pod klenbou */
    s += `<path d="${cara(klenba(PEC.t1 + PEC.t2))}" fill="none" stroke="#6B5D4F" stroke-width="0.9"/>`;
    s += `<path d="${cara(klenba(0))}" fill="none" stroke="#5A4232" stroke-width="0.7"/>`;
    /* základ: tři řady cihel na vazbu */
    const z0 = 4, z1 = 176;
    let zaklad = "";
    for (let row = 0; row < 3; row++) {
      const y = PEC.zem + row * 5.2;
      const off = row % 2 ? 6 : 0;
      for (let x = z0 - off; x < z1; x += 12) {
        const xa = Math.max(z0, x), xb = Math.min(z1, x + 12);
        if (xb - xa < 1) continue;
        zaklad += `<rect x="${f(xa)}" y="${f(y)}" width="${f(xb - xa)}" height="5.2" fill="${row === 0 ? CIHLA.stred : mix(CIHLA.stred, "#B89878", row * 0.35)}" stroke="${CIHLA.spara}" stroke-width="0.5"/>`;
      }
    }
    s += zaklad;
    s += `<path d="M${z0} ${PEC.zem + 15.6} H${z1}" stroke="#6B5D4F" stroke-width="0.9"/>`;
    s += `<ellipse cx="90" cy="${PEC.zem + 16.6}" rx="92" ry="2.6" fill="#3A2E28" opacity="0.14"/>`;
    /* průduchy hořáků skrz stěnu */
    for (const smer of [-1, 1]) {
      const xin = stenaVeVysce(144.5, 0), xout = stenaVeVysce(144.5, PEC.t1 + PEC.t2);
      const a = smer < 0 ? xout : 180 - xin, b = smer < 0 ? xin : 180 - xout;
      s += `<rect x="${f(a - 0.5)}" y="140.6" width="${f(b - a + 1)}" height="8" rx="1.4" fill="#2A1A12" stroke="#5A4232" stroke-width="0.5"/>`;
    }
    /* hořáky: trubka, Venturiho hrdlo, přívod plynu a červený ventil */
    for (const smer of [-1, 1]) {
      const X = (x) => (smer < 0 ? x : 180 - x);
      const xout = stenaVeVysce(144.5, PEC.t1 + PEC.t2);
      s += `<path d="M${f(X(-1))} 142.4 L${f(X(xout + 3))} 143 L${f(X(xout + 3))} 146 L${f(X(-1))} 146.6 Z" fill="url(#sn2-ocel)" stroke="#3A3E46" stroke-width="0.5"/>`;
      s += `<path d="M${f(X(1))} 140.2 Q${f(X(3.6))} 144.5 ${f(X(1))} 148.8 L${f(X(5.4))} 147.2 L${f(X(5.4))} 141.8 Z" fill="url(#sn2-ocel)" stroke="#3A3E46" stroke-width="0.5"/>`;
      s += `<path d="M${f(X(8))} 146.4 V158 Q${f(X(8))} 161 ${f(X(5))} 161 H${f(X(0))}" stroke="#5A5E66" stroke-width="1.6" fill="none"/>`;
      s += `<circle cx="${f(X(8))}" cy="153" r="2.6" fill="none" stroke="#C4432B" stroke-width="1"/><path d="M${f(X(5.6))} 153 H${f(X(10.4))} M${f(X(8))} 150.6 V155.4" stroke="#C4432B" stroke-width="0.7"/>`;
    }
    /* stěnky u hořáků (bag walls), co odráží plamen nahoru */
    for (const smer of [-1, 1]) {
      const xin = stenaVeVysce(140, 0);
      const x0 = smer < 0 ? xin + 3.4 : 180 - xin - 3.4 - 4.6;
      for (let i = 0; i < 3; i++) s += `<rect x="${f(x0)}" y="${f(PEC.zem - 5.6 * (i + 1))}" width="4.6" height="5.6" fill="${CIHLA.stred}" stroke="${CIHLA.spara}" stroke-width="0.5"/>`;
    }
    return `<g filter="url(#sn2-linka)">${s}</g>`;
  };
  /*
    Před prvním výpalem hrnčíři pec posvětí (kama-macuri): přes klenbu
    uvážou shimenawu a obětují sůl a saké. Papírky shide se v horku nad
    pecí třepotají.
  */
  const SHIMENAWA = Array.from({ length: 13 }, (_, i) => odsad(bod(lerp(-S_PUL * 0.3, S_PUL * 0.3, i / 12)), PEC.t1 + PEC.t2 + 1.2));
  const vrstvaShimenawa = (st) => {
    const zar0 = zarSila(st.Tvzduch);
    let s = provaz(hladka(SHIMENAWA), { sirka: 3.2 });
    for (const [i, k] of [[0, 3], [1, 6], [2, 9]]) {
      const [x, y] = SHIMENAWA[k];
      const kyv = Math.sin(st.t * (1.3 + zar0 * 5) + i * 1.9) * (3 + zar0 * 14) + st.fuk * 10 * Math.sin(st.t * 17 + i);
      s += shide(x, y + 1, kyv, { meritko: 0.62 });
    }
    s += `<g fill="#C9B186">${[SHIMENAWA[0], SHIMENAWA[12]].map(([x, y]) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="1.8" ry="2.2"/>`).join("")}</g>`;
    return s;
  };
  const vrstvaKomin = () => {
    let s = `<rect x="123.6" y="13" width="13.6" height="52" fill="#B88A6A" stroke="#6B4A3A" stroke-width="0.7"/>`;
    for (let row = 0; row < 10; row++) {
      const y = 13 + row * 5.2;
      s += `<path d="M123.6 ${f(y)} H137.2" stroke="#7A5A48" stroke-width="0.4"/>`;
      const x = row % 2 ? 130.4 : 127;
      s += `<path d="M${x} ${f(y)} V${f(y + 5.2)}" stroke="#7A5A48" stroke-width="0.4"/>`;
      if (row % 2 === 0) s += `<path d="M${f(x + 6.8)} ${f(y)} V${f(y + 5.2)}" stroke="#7A5A48" stroke-width="0.4"/>`;
    }
    s += `<rect x="122" y="10.4" width="16.8" height="3.2" rx="0.6" fill="#8A6650" stroke="#5A3E30" stroke-width="0.6"/>`;
    s += `<rect x="126.2" y="9.6" width="8.4" height="1.4" fill="#2A1A12"/>`;
    return `<g filter="url(#sn2-linka)">${s}</g>`;
  };
  const vrstvaSloupky = () => {
    let s = "";
    /* zadní sloupek prostředkem, přední dva u krajů */
    s += `<rect x="87.4" y="141" width="5.2" height="9" fill="#B39878" stroke="#6B5D4F" stroke-width="0.4"/>`;
    for (const x of [46, 134]) s += `<rect x="${x - 3}" y="140.6" width="6" height="9.4" rx="0.6" fill="url(#sn2-sloupek)" stroke="#6B5D4F" stroke-width="0.5"/>`;
    return s;
  };

  /* ——— Živé kusy ——— */
  const vrstvaKomora = (st) => {
    const g = zarSila(st.Tvzduch);
    const zaklad = mix(mix("#8C5E44", "#3A2016", (1 - st.svetlo) * 0.62), zar(zarBarva(st.Tvzduch - 40)), g);
    return (
      `<path d="${VNITREK_D}" fill="${zaklad}"/>` +
      `<path d="${VNITREK_D}" fill="url(#sn2-zed)" opacity="${f(clamp(0.55 - g * 0.5))}"/>` +
      `<ellipse cx="90" cy="60" rx="48" ry="40" fill="${zar(zarBarva(st.Tvzduch + 60))}" opacity="${f(g * 0.6)}"/>` +
      `<path d="${VNITREK_D}" fill="url(#sn2-hloubka)" opacity="${f(0.5 - 0.3 * g)}"/>`
    );
  };
  const vrstvaTma = (st) => {
    const tma = (1 - st.svetlo) * 0.36 * (1 - zarSila(st.Tvzduch) * 0.95);
    return tma > 0.01 ? `<path d="${VNITREK_D}" fill="#140A06" opacity="${f(tma)}"/>` : "";
  };
  /*
    Plameny: od hořáku narazí na stěnku, zvednou se podél boku pece a
    přes klenbu se stočí dovnitř. Dole jsou velké a husté, nahoře řídnou.
    k je poloha na půlce oblouku od paty (0) k vrcholu (1).
  */
  const PLAMENY = (() => {
    const r = rng(404);
    const J = [];
    for (const smer of [-1, 1]) {
      [0.04, 0.1, 0.17, 0.25, 0.34, 0.45, 0.58, 0.72].forEach((k, i) => {
        J.push({ smer, k, L: (34 - k * 20) * (0.8 + r() * 0.4), W: (11 - k * 5) * (0.85 + r() * 0.3), fz: r() * 6.28, w: 3.4 + r() * 2.6, op: 1 - k * 0.55, c: r() < 0.25 ? -0.6 : 1 });
      });
    }
    return J;
  })();
  const vrstvaPlameny = (st) => {
    if (st.horaky < 0.01) return "";
    const red = st.redukce;
    const g = zarSila(st.Tvzduch);
    const I = st.horaky * (1 + 0.45 * st.fuk) * (1 + 0.3 * red);
    let s = "";
    /* při redukci líné, žluté a začouzené; jinak čistší s modrým jádrem u hořáků */
    const sady = red > 0.3
      ? [["#5A3A30", 1.12, 1.15, 0.32], ["#E0582E", 1, 1, 0.62], ["#FFA040", 0.72, 0.72, 0.8], ["#FFE6A0", 0.4, 0.42, 0.9]]
      : [["#C4432B", 1, 1, 0.5], ["#FF8A3A", 0.8, 0.8, 0.62], ["#FFC86A", 0.56, 0.56, 0.78], ["#FFF4D0", 0.3, 0.3, 0.85]];
    for (const [barva, kL, kW, op] of sady) {
      let g2 = "";
      for (const j of PLAMENY) {
        const b = bod((j.smer < 0 ? -1 : 1) * S_PUL * (1 - j.k));
        const B = [b.x - b.nx * 1.4, b.y - b.ny * 1.4];
        /* tečna klenby směrem k vrcholu, o kousek dovnitř */
        const u = b.x - PEC.x;
        const ty = Math.sinh(u / A);
        const th0 = (u < 0 ? Math.atan2(ty, 1) : Math.atan2(-ty, -1)) + (u < 0 ? 1 : -1) * rad(10);
        const L = j.L * I * kL * (1 + 0.2 * Math.sin(st.t * j.w + j.fz) + 0.08 * Math.sin(st.t * 13 + j.fz * 3));
        const { d } = jazyk({ B, th0, L, W: j.W * kW * (0.8 + 0.3 * I), c: (u < 0 ? 1 : -1) * j.c, stoupani: 0.3, stoc: 1.5, t: st.t, w: j.w, fz: j.fz, vlna: 0.35 + 0.25 * red, N: 12 });
        g2 += `<path d="${d}" opacity="${f(j.op)}"/>`;
      }
      /* proud z hořáku: vodorovně dovnitř, odražený stěnkou nahoru */
      for (const smer of [-1, 1]) {
        const xin = stenaVeVysce(144.5, 0);
        const B = [smer < 0 ? xin - 1 : 180 - xin + 1, 144.6];
        const { d } = jazyk({ B, th0: smer < 0 ? rad(-8) : rad(188), L: 12 * I * kL, W: 5 * kW, c: smer < 0 ? -1 : 1, stoupani: 0.6, stoc: 1.2, t: st.t, w: 9, fz: smer, vlna: 0.4, N: 10 });
        g2 += `<path d="${d}"/>`;
      }
      s += `<g fill="${barva}" opacity="${f(op * (1 - 0.72 * g))}">${g2}</g>`;
    }
    /* modré jádro plynu přímo u hořáků */
    if (red < 0.5) {
      for (const smer of [-1, 1]) {
        const xin = stenaVeVysce(144.5, 0);
        const B = [smer < 0 ? xin - 1 : 180 - xin + 1, 144.6];
        const { d } = jazyk({ B, th0: smer < 0 ? rad(-4) : rad(184), L: 7.5 * I, W: 3.2, c: smer < 0 ? -1 : 1, stoupani: 0.4, stoc: 0.8, t: st.t, w: 11, fz: smer * 2, vlna: 0.25, N: 8 });
        s += `<path d="${d}" fill="#5A7AF0" opacity="${f(0.8 * (1 - g))}"/>`;
      }
    }
    return `<g clip-path="url(#sn2-komora-orez)">${s}</g>`;
  };
  const vrstvaVen = (st) => {
    let s = "";
    const red = st.redukce * st.horaky;
    /* plamínek v hrdle hořáku */
    if (st.horaky > 0.01) {
      for (const smer of [-1, 1]) {
        const xout = stenaVeVysce(144.5, PEC.t1 + PEC.t2);
        const x = smer < 0 ? xout + 2.6 : 180 - xout - 2.6;
        s += `<ellipse cx="${f(x)}" cy="144.5" rx="1.8" ry="1.3" fill="#5A7AF0" opacity="${f(0.6 * st.horaky)}"/>`;
      }
    }
    /* při redukci šlehají plameny ven kolem hořáků */
    if (red > 0.02) {
      for (const smer of [-1, 1]) {
        const xout = stenaVeVysce(141, PEC.t1 + PEC.t2);
        const x = smer < 0 ? xout - 0.6 : 180 - xout + 0.6;
        for (const [barva, k, W] of [["#E0582E", 1, 4.4], ["#FFB040", 0.66, 3], ["#FFF0B0", 0.32, 1.6]]) {
          const { d } = jazyk({ B: [x, 141.4], th0: smer < 0 ? rad(-120) : rad(-60), L: 13 * red * k * (1 + 0.2 * Math.sin(st.t * 11 + smer)), W, c: smer < 0 ? -1 : 1, stoupani: 0.8, stoc: 1.6, t: st.t, w: 10, fz: smer * 2, vlna: 0.5, N: 10 });
          s += `<path d="${d}" fill="${barva}"/>`;
        }
      }
      /* a z komína */
      for (const [barva, k, W] of [["#E0582E", 1, 6], ["#FFB040", 0.62, 4], ["#FFF0B0", 0.3, 2.2]]) {
        const { d } = jazyk({ B: [130.4, 10.2], th0: rad(-90), L: 15 * red * k * (1 + 0.22 * Math.sin(st.t * 9)), W, c: 1, stoupani: 0.9, stoc: 1.2, t: st.t, w: 8, fz: 1, vlna: 0.5, vitr: 0.25, N: 10 });
        s += `<path d="${d}" fill="${barva}"/>`;
      }
    }
    return s;
  };
  const vrstvaKour = (st) =>
    st.kour
      .map((k) => {
        const u = k.vek / k.zivot;
        const op = clamp(Math.min(u / 0.15, 1) * (1 - u)) * k.op;
        return `<circle cx="${f(k.x)}" cy="${f(k.y)}" r="${f(k.r)}" fill="url(#sn2-kour${k.cerny ? "-cerny" : ""})" opacity="${f(op)}"/>`;
      })
      .join("");
  const vrstvaSamotkaZar = (st) => {
    let s = "";
    const g = zarSila(st.Tsamotka);
    /* kapky glazury z minulých výpalů: lesklé, každá jinak stará */
    for (const k of st.skvrny) {
      const [x, y] = naSc([k.x, 82]);
      s += `<path d="M${f(x - 2.6)} ${f(y + 0.3)} Q${f(x)} ${f(y - 1.8)} ${f(x + 2.6)} ${f(y + 0.3)} Z" fill="${k.barva}" opacity="${f(k.op)}"/>`;
      if (k.stekla > 0) s += `<path d="M${f(x + 0.6)} ${f(y)} Q${f(x + 1.2)} ${f(y + k.stekla * 0.5)} ${f(x + 0.8)} ${f(y + k.stekla)}" stroke="${k.barva}" stroke-width="1.3" stroke-linecap="round" fill="none" opacity="${f(k.op)}"/><circle cx="${f(x + 0.8)}" cy="${f(y + k.stekla + 0.4)}" r="1" fill="${k.barva}" opacity="${f(k.op)}"/><circle cx="${f(x + 0.4)}" cy="${f(y + k.stekla - 0.3)}" r="0.35" fill="#FFFFFF" opacity="${f(0.7 * k.op)}"/>`;
    }
    if (g > 0.01) s += `<g transform="translate(${FIG.x} ${FIG.y}) scale(${FIG.s}) translate(-90 -102)"><path d="${OBRYS_D}" fill="${zar(zarBarva(st.Tsamotka))}" opacity="${f(g * 0.93)}"/></g>`;
    const gs = zarSila(st.Tsloupky);
    if (gs > 0.01) s += `<g fill="${zar(zarBarva(st.Tsloupky))}" opacity="${f(gs * 0.93)}"><rect x="43" y="140.6" width="6" height="9.4" rx="0.6"/><rect x="131" y="140.6" width="6" height="9.4" rx="0.6"/><rect x="87.4" y="141" width="5.2" height="9"/></g>`;
    return s;
  };
  const vrstvaTvar = (st) => {
    const g = zarSila(st.Tsamotka);
    const barva = mix("#3A2E28", "#5A140A", g);
    return vSam(samotkaTvar("sn2", { oci: st.oci, usta: st.usta, tvare: st.tvare, pohled: st.pohledOka, barva, odlesk: g > 0.4 ? "#FFF0C2" : "#FFF6E4" }));
  };
  const vrstvaHrnky = (st) => {
    let s = "";
    for (const h of st.hrnky) {
      if (!h.viditelny || h.drzeny) continue;
      s += hrnek(h.h, { x: h.x, y: h.y, rot: h.rot, T: h.T, roztavena: st.roztavena, stekani: st.stekani, svetlo: st.svetlo });
    }
    if (st.kuzely.viditelne && !st.kuzely.drzene) s += kuzely(st.ohyb, st.Thrnky, st.svetlo);
    /* stékající glazura z vázy až na Šamotku */
    if (st.potucek > 0.01) {
      const h = st.hrnky[0];
      const x = h.x + polomer("tsubo", 2) - 0.6;
      const [, yKraj] = naSc([90, 82]);
      const delka = st.potucek * 6.5;
      const cesta = `M${f(x)} ${f(VRCH - 6)} Q${f(x + 1.6)} ${f(VRCH - 2)} ${f(x + 2.6)} ${f(VRCH)} L${f(x + 2.8)} ${f(yKraj + delka)}`;
      const g = zarSila(st.Thrnky);
      s += `<path d="${cesta}" stroke="${mix("#2E4A26", "#B8401A", g)}" stroke-width="2.3" stroke-linecap="round" fill="none"/>`;
      s += `<path d="${cesta}" stroke="${mix("#5E8C4A", "#FFF6DA", g)}" stroke-width="1.3" stroke-linecap="round" fill="none"/>`;
      s += `<circle cx="${f(x + 2.8)}" cy="${f(yKraj + delka + 0.5)}" r="1.5" fill="${mix("#2E4A26", "#B8401A", g)}"/><circle cx="${f(x + 2.8)}" cy="${f(yKraj + delka + 0.5)}" r="1.05" fill="${mix("#3E6A34", "#FFF6DA", g)}"/>`;
    }
    return s;
  };
  const vrstvaRuce = (st) => {
    let s = "";
    for (const h of st.hrnky) if (h.viditelny && h.drzeny) s += hrnek(h.h, { x: h.x, y: h.y, rot: h.rot, T: h.T, roztavena: st.roztavena, stekani: st.stekani, svetlo: 1 });
    if (st.kuzely.viditelne && st.kuzely.drzene) s += `<g transform="translate(${f(st.kuzely.dx)} ${f(st.kuzely.dy)})">${kuzely(st.ohyb, st.Thrnky, 1)}</g>`;
    for (const r of st.ruce) {
      if (r.plac) s += ruka(r.D, r.smer, "plac");
      else s += ruka(r.D, r.smer, r.drzi ? "drzi" : "otevrena", r.r);
    }
    return s;
  };
  const vrstvaSvetlo = (st) => {
    let s = "";
    const g = zarSila(st.Tvzduch);
    if (g > 0.01) s += `<ellipse cx="90" cy="96" rx="${f(70 + 20 * g)}" ry="${f(64 + 16 * g)}" fill="url(#sn2-svit)" opacity="${f(g * 0.7)}"/>`;
    if (st.horaky > 0.01 && g < 0.6) s += `<ellipse cx="90" cy="120" rx="62" ry="40" fill="url(#sn2-svit-plamen)" opacity="${f(st.horaky * (0.5 + 0.1 * Math.sin(st.t * 13)) * (1 - g))}"/>`;
    if (st.fuk > 0.01) s += `<ellipse cx="90" cy="110" rx="70" ry="50" fill="url(#sn2-svit)" opacity="${f(st.fuk * 0.5)}"/>`;
    if (st.svetlo > 0.6 && st.u > OTEVRENI) s += `<path d="${VNITREK_D}" fill="url(#sn2-den)" opacity="${f((st.svetlo - 0.6) * 0.8)}"/>`;
    return s;
  };
  const vrstvaJiskry = (st) => {
    let s = "";
    for (const z of st.zablesky) {
      const u = z.vek / 0.35;
      if (u > 1) continue;
      s += `<path d="${jiskraD(1.6 * (1 - u * 0.5))}" transform="translate(${pt([z.x, z.y])}) rotate(${f(z.rot)})" fill="#FFFFFF" opacity="${f(1 - u)}"/>`;
    }
    for (const j of st.jiskry) {
      const u = j.vek / j.zivot;
      s += `<circle cx="${f(j.x)}" cy="${f(j.y)}" r="${f(j.r * (1 - u * 0.5))}" fill="${u < 0.3 ? "#FFF0C2" : "#FFB45A"}" opacity="${f(clamp((1 - u) * 1.3))}"/>`;
    }
    /* po poplácání pár teplých jiskřiček nad Šamotkou */
    for (const k of st.srdicka) {
      const u = k.vek / k.zivot;
      s += `<path d="${jiskraD(k.r)}" transform="translate(${pt([k.x, k.y])}) rotate(${f(k.rot + u * 60)})" fill="#F3C04E" opacity="${f(clamp(Math.min(u / 0.15, (1 - u) / 0.4)))}"/>`;
    }
    return s;
  };

  const defs = () =>
    samotkaDefs("sn2") +
    filtrLinka("sn2-linka", { posun: 1.2, seed: 8 }) +
    `<clipPath id="sn2-komora-orez"><path d="${VNITREK_D}"/></clipPath>` +
    `<pattern id="sn2-zed" width="12" height="5.2" patternUnits="userSpaceOnUse"><path d="M0 0 H12 M0 2.6 H12 M3 0 V2.6 M9 2.6 V5.2" stroke="#4A2E20" stroke-width="0.35" fill="none"/></pattern>` +
    `<pattern id="sn2-prasek" width="1.6" height="1.6" patternUnits="userSpaceOnUse"><circle cx="0.4" cy="0.5" r="0.22" fill="#FFFFFF" opacity="0.5"/><circle cx="1.2" cy="1.2" r="0.18" fill="#6B5D4F" opacity="0.25"/></pattern>` +
    `<radialGradient id="sn2-hloubka" cx="0.5" cy="0.35" r="0.7"><stop offset="0.5" stop-color="#000000" stop-opacity="0"/><stop offset="1" stop-color="#140A06" stop-opacity="0.8"/></radialGradient>` +
    `<linearGradient id="sn2-ocel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A8AEB8"/><stop offset="0.5" stop-color="#7A808A"/><stop offset="1" stop-color="#4E535C"/></linearGradient>` +
    `<linearGradient id="sn2-sloupek" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#E6D3B4"/><stop offset="1" stop-color="#B39878"/></linearGradient>` +
    `<radialGradient id="sn2-svit"><stop offset="0" stop-color="#FFD27A" stop-opacity="0.65"/><stop offset="0.5" stop-color="#FF8A3A" stop-opacity="0.25"/><stop offset="1" stop-color="#FF8A3A" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="sn2-svit-plamen" cx="0.5" cy="0.9" r="0.8"><stop offset="0" stop-color="#FF9A4A" stop-opacity="0.55"/><stop offset="1" stop-color="#FF9A4A" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="sn2-den" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#DCE8F4" stop-opacity="0.4"/><stop offset="1" stop-color="#DCE8F4" stop-opacity="0"/></linearGradient>` +
    `<radialGradient id="sn2-kour"><stop offset="0" stop-color="#8A8288" stop-opacity="0.55"/><stop offset="1" stop-color="#8A8288" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="sn2-kour-cerny"><stop offset="0" stop-color="#1E1A1C" stop-opacity="0.85"/><stop offset="0.6" stop-color="#2A2428" stop-opacity="0.45"/><stop offset="1" stop-color="#2A2428" stop-opacity="0"/></radialGradient>`;

  /* ═══ Simulace ═══ */
  const novaDynamika = () => {
    const R = rng(1300);
    return {
      u: 0, cislo: 0, sada: novaSada(R, 0), zrychleni: 0, fuk: 0,
      Thrnky: 20, Tsamotka: 20, Tsloupky: 20, ohyb: [0, 0, 0], roztavena: 0, stekani: 0, potucek: 0,
      skvrny: [{ x: 52, stekla: 0, barva: "#4E7A3E", op: 0.75 }],
      kour: [], jiskry: [], zablesky: [], srdicka: [], akumKour: 0, akumPing: 0, akumTik: 0, akumPuf: 0,
      pokuk: -100, pokukKam: [90, 90], blizkoOd: null, pohled: [0, 0], nahoda: R, zvuk: [], uPred: -1,
    };
  };
  const pres = (a, b, x) => a < x && b >= x;
  const krok = (dyn, t, dt, vstup) => {
    const R = dyn.nahoda;
    if (vstup.kliky && vstup.kliky.length) {
      const k = vstup.kliky[vstup.kliky.length - 1];
      vstup.kliky.length = 0;
      if (dyn.u > PLACANI + 2.4) dyn.u = KONEC;
      else if (dyn.u > ZAPAL && dyn.u < VYPNUTI - 1) {
        dyn.zrychleni = Math.min(2.4, dyn.zrychleni + 1.2);
        dyn.fuk = 1;
        dyn.zvuk.push({ druh: "fuk", sila: 1, pan: 0 });
        for (let i = 0; i < 14; i++) dyn.jiskry.push({ x: 90 + (R() - 0.5) * 80, y: 140 - R() * 30, vx: (R() - 0.5) * 20, vy: -20 - R() * 30, vek: 0, zivot: 0.6 + R() * 0.8, r: 0.5 + R() * 0.6 });
      } else {
        dyn.pokuk = t;
        dyn.pokukKam = [k.x, k.y];
      }
    }
    const tempo = 1 + (dyn.zrychleni > 0 ? 1.6 : 0);
    dyn.zrychleni = Math.max(0, dyn.zrychleni - dt);
    dyn.fuk *= Math.exp(-dt / 0.4);
    const uP = dyn.u;
    dyn.u += dt * tempo;
    const u = dyn.u;
    const dtu = dt * tempo;

    /* nový výpal */
    if (u >= KONEC) {
      dyn.u = 0;
      dyn.cislo++;
      dyn.sada = novaSada(R, dyn.cislo);
      dyn.ohyb = [0, 0, 0];
      dyn.roztavena = 0;
      dyn.stekani = 0;
      dyn.potucek = 0;
      dyn.uPred = -1;
      return;
    }

    /* teploty: vzduch podle rozvrhu, věci za ním s vlastní setrvačností */
    const Tv = teplotaVzduchu(u);
    const k = (tau) => 1 - Math.exp(-dtu / tau);
    dyn.Thrnky += (Tv - dyn.Thrnky) * k(0.55);
    dyn.Tsloupky += (Tv - dyn.Tsloupky) * k(0.9);
    dyn.Tsamotka += (Tv - dyn.Tsamotka) * k(1.5);
    if (u < ZAPAL) {
      dyn.Thrnky = Math.min(dyn.Thrnky, 30);
      dyn.Tsamotka = Math.min(dyn.Tsamotka, 30);
      dyn.Tsloupky = Math.min(dyn.Tsloupky, 30);
    }
    /* glazura taje od 1 000 °C a už se nevrátí */
    if (dyn.Thrnky > 1000) dyn.roztavena = Math.max(dyn.roztavena, clamp((dyn.Thrnky - 1000) / 260));
    if (dyn.Thrnky > 1200) dyn.stekani = Math.min(1, dyn.stekani + dtu * 0.32);
    /* žároměrky: práce tepla nad prahem */
    [1180, 1235, 1290].forEach((prah, i) => {
      dyn.ohyb[i] = Math.min(1, dyn.ohyb[i] + dtu * Math.max(0, dyn.Thrnky - prah) / 70);
    });

    /* události rozvrhu */
    T_SAZENI.forEach((t0) => pres(uP, u, t0 + 0.6) && dyn.zvuk.push({ druh: "polozit", sila: 0.9, pan: (R() - 0.5) * 0.6 }));
    if (pres(uP, u, T_KUZELY + 0.6)) dyn.zvuk.push({ druh: "polozit", sila: 0.4, pan: 0.5 });
    if (pres(uP, u, ZAVRENI)) dyn.zvuk.push({ druh: "dvirka" });
    if (pres(uP, u, ZAPAL)) {
      dyn.zvuk.push({ druh: "zapal", sila: 1 });
      dyn.fuk = 0.6;
    }
    if (pres(uP, u, VYPNUTI)) dyn.zvuk.push({ druh: "vypnout" });
    if (pres(uP, u, OTEVRENI)) dyn.zvuk.push({ druh: "otevrit" });
    T_VYNDANI.forEach((t0, j) => {
      const i = POR_VYNDANI[j];
      const lepi = dyn.sada[i].glazura === "nagare";
      if (lepi) {
        [0.55, 0.8].forEach((x) => pres(uP, u, t0 + x) && dyn.zvuk.push({ druh: "drhne", sila: 0.6, pan: -0.4 }));
        if (pres(uP, u, t0 + 1.1)) dyn.zvuk.push({ druh: "trhnuti", sila: 1, pan: -0.4 });
      } else if (pres(uP, u, t0 + 0.5)) dyn.zvuk.push({ druh: "zvednout", sila: 0.7, pan: (dyn.sada[i].x - 90) / 90 });
    });
    if (pres(uP, u, PLACANI + 0.8)) dyn.zvuk.push({ druh: "plac", sila: 1, pan: 0.4 });
    if (pres(uP, u, PLACANI + 1.3)) dyn.zvuk.push({ druh: "plac", sila: 0.9, pan: 0.4 });
    if (pres(uP, u, PLACANI + 0.85)) {
      dyn.zvuk.push({ druh: "radost", sila: 1, za: 0.15 });
      for (let i = 0; i < 9; i++) dyn.srdicka.push({ x: 92 + (R() - 0.5) * 40, y: 104 - R() * 8, vy: -8 - R() * 8, vek: 0, zivot: 1.4 + R() * 0.8, r: 0.9 + R() * 0.9, rot: R() * 90 });
    }

    /* stečená glazura: potůček na Šamotku a nová skvrna, která už zůstane */
    const tau = u - ZAPAL;
    if (pres(uP - ZAPAL, tau, 8.0)) dyn.zvuk.push({ druh: "syk", sila: 0.7, pan: -0.4 });
    if (tau > 8.0 && tau < 9.6) dyn.potucek = Math.min(1, dyn.potucek + dtu / 1.1);
    if (pres(uP - ZAPAL, tau, 9.6)) {
      dyn.skvrny.push({ x: 90 + (dyn.sada[0].x + polomer("tsubo", 2) + 2.2 - FIG.x) / FIG.s, stekla: 6.5, barva: "#4E7A3E", op: 0.9 });
      while (dyn.skvrny.length > 6) dyn.skvrny.shift();
      dyn.potucek = 0;
    }

    /* redukce: černý kouř a bafání hořáků */
    const red = redukce(u) * horaky(u);
    dyn.akumKour += dtu * (horaky(u) * 5 + red * 14);
    while (dyn.akumKour >= 1) {
      dyn.akumKour -= 1;
      const cerny = R() < red;
      dyn.kour.push({ x: 130.4 + (R() - 0.5) * 4, y: 9, vx: 14 + R() * 10, vy: -6 - R() * 5, r: 2 + R() * 2, rust: cerny ? 7 : 5, vek: 0, zivot: 1.4 + R() * 1.2, op: cerny ? 0.9 : 0.5, cerny });
    }
    if (red > 0.3) {
      dyn.akumPuf += dtu * 3.2;
      while (dyn.akumPuf >= 1) {
        dyn.akumPuf -= 1;
        dyn.zvuk.push({ druh: "puf", sila: 0.4 + R() * 0.4, pan: R() < 0.5 ? -0.7 : 0.7 });
      }
    }
    for (const q of dyn.kour) {
      q.vek += dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.r += q.rust * dt;
    }
    dyn.kour = dyn.kour.filter((q) => q.vek < q.zivot);

    /* chladnutí: glazura praská, pec cinká */
    const Tv2 = teplotaVzduchu(u);
    if (u > VYPNUTI && Tv2 < 760) {
      dyn.akumPing += dtu * 5.5 * clamp((760 - Tv2) / 300);
      while (dyn.akumPing >= 1) {
        dyn.akumPing -= 1;
        const kandidati = dyn.sada.filter((h) => h.praskliny.length && h.ukazano < h.praskliny.length);
        if (kandidati.length) {
          const h = kandidati[Math.floor(R() * kandidati.length)];
          const c = h.praskliny[h.ukazano];
          h.ukazano += 1 + Math.floor(R() * 3);
          const yH = vyskaTvaru(h.tvar);
          dyn.zablesky.push({ x: h.x + c[2], y: VRCH + c[3], vek: 0, rot: R() * 45 });
          dyn.zvuk.push({ druh: "cink", sila: 0.4 + R() * 0.6, pan: (h.x - 90) / 70, vyska: 0.85 + R() * 0.5 + (yH > 15 ? -0.15 : 0.1) });
        }
      }
      dyn.akumTik += dtu * 1.6;
      while (dyn.akumTik >= 1) {
        dyn.akumTik -= 1;
        if (R() < 0.6) dyn.zvuk.push({ druh: "tik", sila: 0.3 + R() * 0.4, pan: (R() - 0.5) * 1.4 });
      }
    }
    for (const z of dyn.zablesky) z.vek += dt;
    dyn.zablesky = dyn.zablesky.filter((z) => z.vek < 0.35);
    for (const j of dyn.jiskry) {
      j.vek += dt;
      j.x += j.vx * dt;
      j.y += j.vy * dt;
      j.vy += 10 * dt;
    }
    dyn.jiskry = dyn.jiskry.filter((j) => j.vek < j.zivot);
    for (const c of dyn.srdicka) {
      c.vek += dt;
      c.y += c.vy * dt;
      c.vy *= 1 - dt * 0.8;
    }
    dyn.srdicka = dyn.srdicka.filter((c) => c.vek < c.zivot);

    /* pohled: pokukuje na myš, když se nad ní chvíli drží */
    const blizko = vstup.mys && Math.hypot(vstup.mys.x - TVAR[0], vstup.mys.y - TVAR[1]) < 30;
    if (blizko && dyn.blizkoOd == null) dyn.blizkoOd = t;
    if (!blizko) dyn.blizkoOd = null;
    if (dyn.blizkoOd != null && t - dyn.blizkoOd > 1.4 && t - dyn.pokuk > 4.5) {
      dyn.pokuk = t;
      dyn.blizkoOd = t + 3;
    }
    const kam = t - dyn.pokuk < 1.6 ? (vstup.mys && blizko ? [vstup.mys.x, vstup.mys.y] : dyn.pokukKam) : null;
    let cil = [0, 0];
    if (kam) cil = [clamp((kam[0] - TVAR[0]) / 26, -1, 1) * 1.7, clamp((kam[1] - TVAR[1]) / 26, -1, 1) * 1.3];
    dyn.pohled = dyn.pohled.map((q, i) => q + (cil[i] - q) * (1 - Math.exp(-dt / 0.12)));
    dyn.uPred = u;
  };

  const stav = (t, vstup = {}, dyn) => {
    const d = dyn || novaDynamika();
    const u = d.u;
    const ruce = stavRukou(u, d.sada);
    /* kde jsou hrnky: na Šamotce, v ruce, nebo pryč */
    const hrnky = d.sada.map((h, i) => {
      const jS = POR_SAZENI.indexOf(i);
      const jV = POR_VYNDANI.indexOf(i);
      const tIn = T_SAZENI[jS];
      const tOut = T_VYNDANI[jV];
      let x = h.x, y = VRCH, rot = 0, viditelny = true, drzeny = false;
      const r = ruce.find((q) => q.hrnek === i && q.drzi);
      if (u < tIn) viditelny = false;
      else if (r) {
        drzeny = true;
        const smer = r.smer;
        x = r.D[0] - smer * (r.r + 2.2);
        y = r.D[1] + r.uchop;
        rot = r.ven ? -smer * 4 * Math.sin(Math.PI * clamp(r.k)) : 0;
      } else if (u > tOut + 0.5) viditelny = false;
      return { h, x, y, rot, viditelny, drzeny, T: d.Thrnky };
    });
    const kz = ruce.find((q) => q.kuzely && q.drzi);
    const kuzelyStav = {
      viditelne: !!kz || (u >= T_KUZELY + 0.6 && u < T_KUZELY_VEN + 0.4),
      drzene: !!kz,
      dx: kz ? kz.D[0] - (KUZELY[0] + 4.6) : 0,
      dy: kz ? kz.D[1] - (KUZELY[1] - 4) : 0,
    };
    /* tvář */
    const tau = u - ZAPAL;
    let oci = "klid", usta = "usmev", tvare = 0.3;
    const gS = zarSila(d.Tsamotka);
    if (u > ZAPAL && u < VYPNUTI) {
      oci = tau > 2.2 ? "blaho" : "klid";
      tvare = 0.3 + 0.6 * gS;
      if (tau > VYPAL - 0.6) usta = "velky";
      if (tau > 8.0 && tau < 8.9) [oci, usta] = ["au", "au"];
    } else if (u >= VYPNUTI && u < OTEVRENI) [oci, usta, tvare] = ["spi", "spi", 0.3 + 0.4 * gS];
    const vaza = ruce.find((q) => q.hrnek === 0 && q.ven && q.trhnuti > 0.3);
    if (vaza) [oci, usta] = ["au", "vlnka"];
    const pl = u - PLACANI;
    if (pl > 0.8 && pl < 1.5) [oci, usta, tvare] = ["otevrene", "o", 0.9];
    else if (pl >= 1.5 && pl < 2.7) [oci, usta, tvare] = ["blaho", "velky", 1];
    else if (pl >= 2.7) [oci, usta, tvare] = ["klid", "usmev", 0.75];
    if (t - d.pokuk < 1.6 && oci === "klid") oci = "pokuk";
    return {
      t, u, Tvzduch: teplotaVzduchu(u), Thrnky: d.Thrnky, Tsamotka: d.Tsamotka, Tsloupky: d.Tsloupky, horaky: horaky(u), redukce: redukce(u), fuk: d.fuk,
      svetlo: clamp(svetloDne(u)), roztavena: d.roztavena, stekani: d.stekani, potucek: d.potucek, ohyb: d.ohyb, hrnky, kuzely: kuzelyStav, ruce,
      skvrny: d.skvrny, kour: d.kour, jiskry: d.jiskry, zablesky: d.zablesky, srdicka: d.srdicka, oci, usta, tvare, pohledOka: d.pohled,
    };
  };
  const snimek = (st) => Math.floor(st.t * 30);

  return {
    id: "v2",
    viewBox: "0 0 180 180",
    defs,
    novaDynamika,
    krok,
    stav,
    hukot: (st) => clamp(st.horaky * (0.55 + 0.35 * st.redukce + 0.3 * st.fuk)),
    hukotFrekvence: 260,
    klidne: { t: 12.8 },
    /* živě se začíná tam, kde skončil statický první snímek: v plném žáru */
    zacatek: 12.8,
    vrstvy: [
      { id: "komin", kresli: vrstvaKomin, tezka: true },
      { id: "kour", kresli: vrstvaKour, klic: (st) => (st.kour.length ? snimek(st) : 0) },
      { id: "komora", kresli: vrstvaKomora, klic: (st) => `${Math.round(st.Tvzduch / 4)},${f(st.svetlo)}` },
      { id: "sloupky", kresli: vrstvaSloupky },
      { id: "samotka", kresli: () => vSam(samotkaTelo("sn2", { skvrny: [[50, 94, 13, 6, "#6B5D4F", 0.2], [134, 100, 10, 5, "#6B5D4F", 0.16]] })), tezka: true },
      { id: "hrnky", kresli: vrstvaHrnky, klic: (st) => `${st.ruce.length ? snimek(st) : 0},${Math.round(st.Thrnky / 3)},${f(st.roztavena)},${f(st.stekani)},${f(st.potucek)},${st.hrnky.map((h) => (h.viditelny ? h.h.ukazano : "-")).join("")},${f(st.svetlo)},${st.ohyb.map(f).join()}` },
      { id: "tma", kresli: vrstvaTma, klic: (st) => `${f(st.svetlo)},${Math.round(st.Tvzduch / 10)}` },
      { id: "plameny", kresli: vrstvaPlameny, klic: (st) => (st.horaky > 0.01 ? snimek(st) : 0) },
      { id: "zar", kresli: vrstvaSamotkaZar, klic: (st) => `${Math.round(st.Tsamotka / 3)},${Math.round(st.Tsloupky / 3)},${st.skvrny.length},${f(st.skvrny.length ? st.skvrny[st.skvrny.length - 1].op : 0)}` },
      { id: "tvar", kresli: vrstvaTvar, klic: (st) => `${st.oci},${st.usta},${f(st.tvare)},${f(st.pohledOka[0])},${f(st.pohledOka[1])},${Math.round(st.Tsamotka / 20)}` },
      { id: "pec", kresli: vrstvaPec, tezka: true },
      { id: "shimenawa", kresli: vrstvaShimenawa, klic: (st) => Math.floor(st.t * 15) },
      { id: "ven", kresli: vrstvaVen, klic: (st) => (st.horaky > 0.01 ? snimek(st) : 0) },
      { id: "ruce", kresli: vrstvaRuce, klic: (st) => (st.ruce.length ? snimek(st) : 0) },
      { id: "svetlo", kresli: vrstvaSvetlo, klic: (st) => (st.horaky > 0.01 || st.fuk > 0.01 ? snimek(st) : `${Math.round(st.Tvzduch / 5)},${f(st.svetlo)}`), styl: "mix-blend-mode:screen" },
      { id: "jiskry", kresli: vrstvaJiskry, klic: (st) => (st.zablesky.length || st.jiskry.length || st.srdicka.length ? snimek(st) : 0) },
    ],
  };
})();
