/*
 * ═══════════════════════════════════════════════════════════════════
 * 3 — SNÍH
 * Zimní noc v kulatém okně marumado, jak ji tiskl Kawase Hasui: indigo,
 * padající sníh a teplé světlo. Šamotku vyndali z pece a ještě hřeje.
 * Sníh, který na ni padá, roztaje dřív, než dopadne, a kolem ní je
 * mokrý flek bez sněhu. Za ní kůlna s Pecinkou (z komína se kouří),
 * vlevo kamenná lucerna jukimi-dóró, stavěná přímo na dívání do sněhu,
 * vpravo borovice v jukicuri — provazech, které jí drží větve, aby je
 * sníh nepolámal. Na kopci za tím pagoda, odkud se ozve zvon.
 *
 * Na teplou Šamotku se slétají vrabci fukura-suzume — v zimě se
 * načepýří do kuliček a v Japonsku nosí štěstí. Pak přijde kočka (mike,
 * trojbarevná), vyskočí na Šamotku, dvakrát se otočí, chvíli šlape a
 * stočí se do klubíčka. Vrabci se jí leknou, ale nakonec se vrátí —
 * a sednou si i na ni. Teplo je pro všechny. Šamotka nic neříká,
 * jen jí pod tím vším žhne spodek o něco víc.
 *
 * Myš je vítr: unáší sníh, páru i plamínek v lucerně. Kliknutí přivolá
 * vrabce; když už sedí všichni, přijde kočka. Kliknutí do borovice z ní
 * shodí sníh.
 * ═══════════════════════════════════════════════════════════════════
 */
import {
  f, rng, clamp, lerp, smooth, easeInOut, pt, hladka, pasPoBodech, hrouda, jazyk,
  samotkaDefs, samotkaTelo, samotkaTvar, vSamotce, naScenu, filtrLinka,
} from "./zaklad.js";

export const V3 = (() => {
  const C = [90, 88], RO = 80;
  const vOkne = (s) => `<g clip-path="url(#sn3-okno)">${s}</g>`;
  const FIG = { x: 100, y: 133, s: 0.6 };
  const vSam = vSamotce(FIG);
  const naSc = naScenu(FIG);
  const VRCH = FIG.y - 20 * FIG.s;
  const DNO = FIG.y + 20 * FIG.s;
  const TVAR = naSc([90, 97]);
  const ZEM_KOCKY = 151.5;
  const LUCERNA = [40, 140];
  const POLE = [143, 23];

  /* ——— Statické kusy ——— */
  const KOPEC_1_HREBEN = "M0 104 C20 94 34 97 50 93 C66 89 80 99 96 100 C114 101 128 90 146 92 C160 94 170 99 180 100";
  const KOPEC_1 = KOPEC_1_HREBEN + " V180 H0 Z";
  const KOPEC_2_HREBEN = "M0 113 C30 107 60 111 90 108.6 C120 106 150 110.4 180 108.6";
  const KOPEC_2 = KOPEC_2_HREBEN + " V180 H0 Z";
  const vrstvaNebe = () =>
    vOkne(
      `<rect x="0" y="0" width="180" height="180" fill="url(#sn3-nebe)"/>` +
        `<circle cx="126" cy="30" r="26" fill="url(#sn3-mesic)"/>` +
        `<ellipse cx="60" cy="34" rx="58" ry="9" fill="#2A3152" opacity="0.55" filter="url(#sn3-rozmaz)"/>` +
        `<ellipse cx="140" cy="54" rx="50" ry="7" fill="#323A5E" opacity="0.5" filter="url(#sn3-rozmaz)"/>` +
        /* vzdálené kopce: sníh na hřebenech jako pás uvnitř kopce, ne čára přes nebe */
        `<path d="${KOPEC_1}" fill="#252D52"/>` +
        `<g clip-path="url(#sn3-kopec-1)"><path d="${KOPEC_1_HREBEN}" stroke="#7E8CB4" stroke-width="5" fill="none" opacity="0.7"/><path d="${KOPEC_1_HREBEN}" stroke="#AEBAD8" stroke-width="1.6" fill="none" opacity="0.8"/></g>` +
        pagoda(80, 101.5) +
        `<path d="${KOPEC_2}" fill="#3A4672"/>` +
        `<g clip-path="url(#sn3-kopec-2)"><path d="${KOPEC_2_HREBEN}" stroke="#93A2C6" stroke-width="5" fill="none" opacity="0.75"/><path d="${KOPEC_2_HREBEN}" stroke="#C4CEE6" stroke-width="1.5" fill="none" opacity="0.8"/></g>`,
    );
  /** Malá pětipatrová pagoda na kopci, v okně světýlko. */
  function pagoda(x, y) {
    let s = `<g fill="#26304E">`;
    s += `<rect x="${x - 1}" y="${y - 30}" width="2" height="30"/>`;
    for (let i = 0; i < 5; i++) {
      const w = 13 - i * 1.8, yy = y - 4 - i * 5.2;
      s += `<path d="M${f(x - w)} ${f(yy)} Q${x} ${f(yy - 2.6)} ${f(x + w)} ${f(yy)} L${f(x + w - 1.6)} ${f(yy + 1.2)} H${f(x - w + 1.6)} Z"/>`;
      s += `<rect x="${f(x - w * 0.55)}" y="${f(yy + 1)}" width="${f(w * 1.1)}" height="3.4"/>`;
    }
    s += `<path d="M${x - 0.5} ${y - 36} V${y - 28} M${x + 0.5} ${y - 36} V${y - 28}" stroke="#26304E" stroke-width="0.6"/></g>`;
    s += `<g fill="#E8EEF8" opacity="0.75">${[0, 1, 2, 3, 4].map((i) => `<path d="M${f(x - 13 + i * 1.8)} ${f(y - 4 - i * 5.2)} Q${x} ${f(y - 6.8 - i * 5.2)} ${f(x + 13 - i * 1.8)} ${f(y - 4 - i * 5.2)} Q${x} ${f(y - 5.8 - i * 5.2)} ${f(x - 13 + i * 1.8)} ${f(y - 4 - i * 5.2)} Z"/>`).join("")}</g>`;
    s += `<rect x="${x - 0.7}" y="${y - 7.4}" width="1.4" height="1.6" fill="#FFC46A"/>`;
    return s;
  }
  const vrstvaKulna = () => {
    let s = "";
    /* stěny z tmavého dřeva, okno do dílny, kde spí Pecinka */
    s += `<path d="M14 92 H58 V121 H14 Z" fill="#3E3238" stroke="#1E1820" stroke-width="0.6"/>`;
    s += `<g stroke="#2A2228" stroke-width="0.5">${[19, 25, 31, 37, 43, 49, 55].map((x) => `<path d="M${x} 92 V121"/>`).join("")}</g>`;
    s += `<rect x="15.6" y="97.6" width="11.4" height="9.4" fill="url(#sn3-okenko)" stroke="#1E1820" stroke-width="0.7"/>`;
    s += `<path d="M21.3 97.6 V107 M15.6 102.3 H27" stroke="#5A3A2A" stroke-width="0.7"/>`;
    s += `<rect x="44" y="99" width="9" height="22" fill="#2E2428" stroke="#1E1820" stroke-width="0.6"/>`;
    /* komín Pecinky */
    s += `<rect x="44.6" y="66" width="7" height="18" fill="#8A5A44" stroke="#3E2A22" stroke-width="0.6"/>`;
    s += `<path d="M44.6 70.5 H51.6 M44.6 75 H51.6 M44.6 79.5 H51.6 M48 66 V70.5 M46.3 70.5 V75 M49.8 75 V79.5" stroke="#5A3A2E" stroke-width="0.4"/>`;
    /* střecha a na ní těžký sníh s rampouchy */
    s += `<path d="M9 93.5 L18 80 H54 L63 93.5 Z" fill="#2A2228"/>`;
    s += `<path d="M7.6 94.6 Q8 88 13 85 Q20 76.6 34 77.4 Q46 75.8 54.4 79.4 Q61 82 64.6 90 Q65.8 95 61.6 95.4 Q52 96.6 36 96 Q20 96.8 10.6 96.6 Q6.8 96.4 7.6 94.6 Z" fill="url(#sn3-snih)" stroke="#9AA6C4" stroke-width="0.5"/>`;
    s += `<path d="M43.6 66.2 Q48 62.6 52.6 66.2 Q51 67.6 48 67.4 Q45 67.6 43.6 66.2 Z" fill="#EEF2FA"/>`;
    s += `<g fill="#D8E2F2" opacity="0.9">${[[14, 2.6], [21, 4.2], [27, 2], [39, 3.4], [47, 5], [56, 2.4]].map(([x, d]) => `<path d="M${x - 0.8} 96.2 L${x} ${f(96.2 + d)} L${x + 0.8} 96.2 Z"/>`).join("")}</g>`;
    return vOkne(`<g filter="url(#sn3-linka)">${s}</g>`);
  };
  /* Popředí: sněhová pláň, mokrý flek kolem Šamotky, kamenná lucerna */
  const vrstvaZem = () =>
    vOkne(
      `<path d="M0 118 C30 114 70 117 100 115 C130 113 160 117 180 116 V180 H0 Z" fill="url(#sn3-plan)"/>` +
        `<path d="M0 118 C30 114 70 117 100 115 C130 113 160 117 180 116" stroke="#EEF2FA" stroke-width="1" fill="none" opacity="0.8"/>` +
        /* stíny ve sněhu */
        `<ellipse cx="22" cy="156" rx="40" ry="5" fill="#AEBBD6" opacity="0.45" filter="url(#sn3-rozmaz)"/>` +
        `<ellipse cx="160" cy="160" rx="34" ry="5" fill="#AEBBD6" opacity="0.4" filter="url(#sn3-rozmaz)"/>` +
        /* mokrý flek, kde roztál sníh */
        `<ellipse cx="${FIG.x}" cy="${f(DNO + 1)}" rx="56" ry="7.4" fill="#C9D2E4"/>` +
        `<ellipse cx="${FIG.x}" cy="${f(DNO + 1)}" rx="52" ry="6.2" fill="url(#sn3-mokro)"/>` +
        `<g fill="#FFFFFF" opacity="0.6">${[[52, 148], [64, 150.2], [134, 148.6], [146, 147.4], [118, 151.2], [80, 150.8]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="0.9" ry="0.3"/>`).join("")}</g>` +
        `<path d="M${FIG.x - 56} ${f(DNO + 1)} Q${FIG.x - 52} ${f(DNO - 3.4)} ${FIG.x - 40} ${f(DNO - 5.2)} M${FIG.x + 56} ${f(DNO + 1)} Q${FIG.x + 52} ${f(DNO - 3.4)} ${FIG.x + 40} ${f(DNO - 5.2)}" stroke="#F4F7FC" stroke-width="2" fill="none" opacity="0.8" stroke-linecap="round"/>` +
        /* dvě cihly pod Šamotkou */
        `<rect x="${f(FIG.x - 40)}" y="${f(DNO - 1.4)}" width="12" height="4.6" rx="0.6" fill="#8A5A44" stroke="#3E2A22" stroke-width="0.5"/>` +
        `<rect x="${f(FIG.x + 28)}" y="${f(DNO - 1.4)}" width="12" height="4.6" rx="0.6" fill="#8A5A44" stroke="#3E2A22" stroke-width="0.5"/>`,
    );
  const vrstvaLucerna = () => {
    const [x, y] = LUCERNA;
    let s = "";
    s += `<ellipse cx="${x}" cy="${y + 1}" rx="17" ry="3" fill="#7A88AA" opacity="0.5"/>`;
    /* tři zahnuté nohy, podstava, ohniště s okénkem, široký klobouk se sněhem */
    s += `<path d="M${x - 12} ${y} Q${x - 9} ${y - 5} ${x - 6} ${y - 10} M${x + 12} ${y} Q${x + 9} ${y - 5} ${x + 6} ${y - 10} M${x} ${y + 0.6} V${y - 10}" stroke="#6A7088" stroke-width="2.6" stroke-linecap="round" fill="none"/>`;
    s += `<path d="M${x - 9} ${y - 10} H${x + 9} L${x + 7.4} ${y - 13} H${x - 7.4} Z" fill="#7E8498" stroke="#3A3E50" stroke-width="0.5"/>`;
    s += `<rect x="${x - 6.4}" y="${y - 25}" width="12.8" height="12" fill="#767C92" stroke="#3A3E50" stroke-width="0.5"/>`;
    s += `<rect x="${x - 3.6}" y="${y - 22.6}" width="7.2" height="7.4" fill="url(#sn3-svetlo-lucerny)"/>`;
    s += `<path d="M${x} ${y - 22.6} V${y - 15.2} M${x - 3.6} ${y - 18.9} H${x + 3.6}" stroke="#5A4A3A" stroke-width="0.5"/>`;
    s += `<path d="M${x - 20} ${y - 26.2} Q${x - 18} ${y - 28} ${x - 10} ${y - 30} H${x + 10} Q${x + 18} ${y - 28} ${x + 20} ${y - 26.2} Q${x + 16} ${y - 24.6} ${x} ${y - 24.8} Q${x - 16} ${y - 24.6} ${x - 20} ${y - 26.2} Z" fill="#6E748A" stroke="#3A3E50" stroke-width="0.5"/>`;
    /* čepice sněhu je větší než klobouk — proto se jí říká lucerna na dívání do sněhu */
    s += `<path d="M${x - 21.6} ${y - 26.4} Q${x - 22} ${y - 33} ${x - 13} ${y - 36} Q${x - 4} ${y - 41} ${x + 6} ${y - 39.4} Q${x + 18} ${y - 37} ${x + 21.6} ${y - 30} Q${x + 23} ${y - 26.4} ${x + 19} ${y - 26} Q${x} ${y - 24.2} ${x - 19} ${y - 25.6} Q${x - 21.8} ${y - 25.6} ${x - 21.6} ${y - 26.4} Z" fill="url(#sn3-snih)" stroke="#9AA6C4" stroke-width="0.5"/>`;
    s += `<ellipse cx="${x}" cy="${y - 41.6}" rx="2.6" ry="2.2" fill="#EEF2FA" stroke="#9AA6C4" stroke-width="0.4"/>`;
    return vOkne(`<g filter="url(#sn3-linka)"><g transform="translate(${x} ${y}) scale(0.86) translate(${-x} ${-y})">${s}</g></g>`);
  };
  const vrstvaPapir = () => vOkne(`<rect x="0" y="0" width="180" height="180" filter="url(#sn3-vlakna)" opacity="0.55"/>`);
  const vrstvaRam = () =>
    `<circle cx="${C[0]}" cy="${C[1]}" r="${RO + 2.6}" fill="none" stroke="#3A2A24" stroke-width="5.4"/>` +
    `<circle cx="${C[0]}" cy="${C[1]}" r="${RO + 2.6}" fill="none" stroke="url(#sn3-ram)" stroke-width="4.2"/>` +
    `<circle cx="${C[0]}" cy="${C[1]}" r="${RO + 0.2}" fill="none" stroke="#1E1612" stroke-width="0.7" opacity="0.7"/>` +
    `<circle cx="${C[0]}" cy="${C[1]}" r="${RO + 5.6}" fill="none" stroke="#6B5D4F" stroke-width="0.5" opacity="0.5"/>`;

  /* ——— Borovice v jukicuri: kmen, patra jehličí jako mráčky, provazy od tyče ——— */
  const PATRA = [
    { x: 143, y: 44, w: 13, h: 5 },
    { x: 134, y: 60, w: 18, h: 6 },
    { x: 152, y: 70, w: 17, h: 6 },
    { x: 138, y: 84, w: 23, h: 7 },
    { x: 158, y: 92, w: 16, h: 6 },
  ];
  const vrstvaBorovice = (st) => {
    let s = "";
    /* kmen a větve */
    s += `<path d="M146 120 Q141 106 144 96 Q148 84 141 74 Q137 64 143 52 Q145 46 143 40" stroke="#3A2A26" stroke-width="3.6" fill="none" stroke-linecap="round"/>`;
    s += `<g stroke="#3A2A26" stroke-width="1.6" fill="none" stroke-linecap="round">${PATRA.map((p) => `<path d="M${p.x < 143 ? 142 : 144} ${f(p.y + 4)} Q${f((p.x + 143) / 2)} ${f(p.y + 5)} ${p.x} ${f(p.y + 1)}"/>`).join("")}</g>`;
    /* tyč a provazy jukicuri */
    s += `<path d="M${POLE[0]} ${POLE[1]} V120" stroke="#8A7458" stroke-width="1.1"/>`;
    s += `<g stroke="#D9C8A0" stroke-width="0.35" opacity="0.85">${PATRA.flatMap((p) => [p.x - p.w, p.x + p.w]).map((x, i) => {
      const p = PATRA[Math.floor(i / 2)];
      const kyv = st.patra[Math.floor(i / 2)].uhel * 0.3;
      return `<path d="M${POLE[0]} ${POLE[1]} L${f(x)} ${f(p.y + kyv)}"/>`;
    }).join("")}</g>`;
    s += `<path d="M${POLE[0] - 2} ${POLE[1]} Q${POLE[0]} ${POLE[1] - 4} ${POLE[0] + 2} ${POLE[1]} Z" fill="#C9B080"/>`;
    /* patra jehličí se sněhem; sníh je ze stavu, po shození znovu přisněží */
    PATRA.forEach((p, i) => {
      const q = st.patra[i];
      const d = hrouda(p.x, p.y, p.w, p.h, 30 + i, { bodu: 14, kolisani: 0.12 });
      s += `<g transform="rotate(${f(q.uhel)} ${p.x} ${p.y + 2})">`;
      s += `<path d="${d}" fill="#1E3A34" stroke="#122420" stroke-width="0.5"/>`;
      s += `<g stroke="#3A6458" stroke-width="0.45" fill="none" stroke-linecap="round">${Array.from({ length: 9 }, (_, k) => {
        const xx = p.x - p.w * 0.82 + k * p.w * 0.205, yy = p.y + p.h * (0.15 + 0.35 * (k % 2));
        return `<path d="M${f(xx - 1.6)} ${f(yy)} Q${f(xx)} ${f(yy - 1.8)} ${f(xx + 1.6)} ${f(yy)}"/>`;
      }).join("")}</g>`;
      if (q.snih > 0.04) {
        const v = p.h * (0.5 + 0.7 * q.snih);
        s += `<path d="M${f(p.x - p.w * 1.02)} ${f(p.y - p.h * 0.1)} Q${f(p.x - p.w * 0.9)} ${f(p.y - p.h * 0.4 - v)} ${f(p.x - p.w * 0.2)} ${f(p.y - p.h * 0.55 - v * 0.9)} Q${f(p.x + p.w * 0.5)} ${f(p.y - p.h * 0.6 - v)} ${f(p.x + p.w * 1.02)} ${f(p.y - p.h * 0.1)} Q${p.x} ${f(p.y - p.h * 0.45)} ${f(p.x - p.w * 1.02)} ${f(p.y - p.h * 0.1)} Z" fill="url(#sn3-snih)" stroke="#9AA6C4" stroke-width="0.4"/>`;
      }
      s += `</g>`;
    });
    return vOkne(`<g filter="url(#sn3-linka)">${s}</g>`);
  };

  /* ——— Vrabec fukura-suzume: počátek u nohou, kouká doprava ——— */
  const vrabec = (v, t) => {
    const p = v.nacepyreni;
    const kx = 1 + 0.24 * p, ky = 1 + 0.34 * p;
    const leti = v.stav === "let" || v.stav === "odlet";
    let s = "";
    const hlavaY = -8.2 + p * 1.2;
    const mava = leti ? Math.sin(t * 34 + v.fz) : 0;
    if (leti) {
      /* vzdálené křídlo */
      s += `<path d="M-0.6 -6.2 Q-3 ${f(-12 * mava - 2)} -6.4 ${f(-9 * mava - 4)} Q-4 -5.4 -0.6 -5.2 Z" fill="#6A4E3A"/>`;
    }
    s += `<path d="M-3.4 -4.4 L-7.8 ${leti ? -4.2 : -2.6} L-7.4 ${leti ? -6.4 : -5.6} Z" fill="#5A4434"/>`;
    s += `<ellipse cx="-0.4" cy="${f(-4.6 * ky + 0.4 * p)}" rx="${f(4.4 * kx)}" ry="${f(3.7 * ky)}" fill="#9A7656" stroke="#4A3828" stroke-width="0.35"/>`;
    s += `<ellipse cx="${f(0.9 * kx)}" cy="${f(-3.3 * ky + 0.3 * p)}" rx="${f(3.2 * kx)}" ry="${f(2.5 * ky)}" fill="#E8DECD"/>`;
    if (!leti) {
      s += `<path d="M${f(-3.6 * kx)} ${f(-5.4 * ky)} Q${f(-0.6 * kx)} ${f(-7.4 * ky)} ${f(1.6 * kx)} ${f(-4.8 * ky)} Q${f(-1 * kx)} ${f(-2.6 * ky)} ${f(-3.6 * kx)} ${f(-5.4 * ky)} Z" fill="#7A5A40" stroke="#4A3828" stroke-width="0.3"/>`;
      s += `<path d="M${f(-2.8 * kx)} ${f(-5.2 * ky)} l1 0.4 M${f(-1.6 * kx)} ${f(-5.6 * ky)} l1 0.4" stroke="#3A2A1E" stroke-width="0.35"/><circle cx="${f(-0.4 * kx)}" cy="${f(-4.6 * ky)}" r="0.3" fill="#F4ECE0"/>`;
    }
    /* hlava: kaštanová čepička, bílá tvář s černou skvrnkou, černý bryndáček */
    const hx = v.hlava;
    s += `<g transform="translate(2.6 ${f(hlavaY)}) scale(${hx} 1)">`;
    s += `<circle r="2.9" fill="#E9E0D2" stroke="#4A3828" stroke-width="0.35"/>`;
    s += `<path d="M-2.9 0.2 A2.9 2.9 0 0 1 2.7 -0.9 Q0.6 -0.2 -2.9 0.2 Z" fill="#7A4428"/>`;
    s += `<circle cx="0.9" cy="0.9" r="0.6" fill="#2A2220"/>`;
    s += `<path d="M1.6 1.6 Q2.4 2.8 1.2 3 Q0.6 2.4 1.6 1.6 Z" fill="#2A2220"/>`;
    s += `<path d="M2.6 -0.4 L4.6 0 L2.6 0.6 Z" fill="#3A2E28"/>`;
    if (v.oci) s += `<circle cx="1.3" cy="-0.5" r="0.48" fill="#1E1816"/><circle cx="1.15" cy="-0.68" r="0.16" fill="#FFFFFF"/>`;
    else s += `<path d="M0.6 -0.4 Q1.3 0.1 2 -0.4" stroke="#1E1816" stroke-width="0.35" fill="none"/>`;
    s += `</g>`;
    if (leti) s += `<path d="M-0.4 -6 Q2.4 ${f(-12 * mava - 3)} 6 ${f(-10 * mava - 5)} Q3 -5 -0.4 -5 Z" fill="#7A5A40" stroke="#4A3828" stroke-width="0.3"/>`;
    else if (p < 0.6) s += `<path d="M-0.4 -1 V0.2 M1 -1 V0.2" stroke="#8A6A5A" stroke-width="0.4"/>`;
    return `<g transform="translate(${pt([v.x, v.y])}) scale(${v.smer * 1.05} 1.05) rotate(${f(v.naklon || 0)})">${s}</g>`;
  };

  /* ——— Kočka mike: bílá s rezavými a černými skvrnami, kouká doprava, počátek pod břichem na zemi ——— */
  const KOCKA = { bila: "url(#sn3-srst)", rezava: "#D98A44", cerna: "#2E2A2A", obrys: "#4A4048" };
  /**
   * Noha ve dvou článcích. Přední je skoro rovná, zadní má patu vzadu jako
   * opravdová kočka. švih −1…1 posouvá tlapku dopředu a dozadu, natazeni
   * (skok) natáhne přední nohy dopředu a zadní dozadu.
   */
  const noha = (x0, y0, svih, zvednuti, vzadu, zadni, natazeni = 0) => {
    let K, P;
    if (zadni) {
      K = [x0 - 2.6 + svih * 1.4, y0 + 4.4];
      P = [x0 - 0.4 + svih * 4.6, -zvednuti];
      K = [lerp(K[0], x0 - 4.4, natazeni), lerp(K[1], y0 + 2.6, natazeni)];
      P = [lerp(P[0], x0 - 10, natazeni), lerp(P[1], y0 + 4.4, natazeni)];
    } else {
      K = [x0 + 0.4 + svih * 1.8, y0 + 4.8];
      P = [x0 + svih * 4.8, -zvednuti];
      K = [lerp(K[0], x0 + 4, natazeni), lerp(K[1], y0 + 2.8, natazeni)];
      P = [lerp(P[0], x0 + 9.4, natazeni), lerp(P[1], y0 + 3.6, natazeni)];
    }
    const d = `M${pt([x0, y0])} L${pt(K)} L${pt(P)}`;
    const barva = vzadu ? "#C3C9D8" : "#F2EEE8";
    return `<path d="${d}" stroke="${KOCKA.obrys}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` +
      `<path d="${d}" stroke="${barva}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` +
      `<ellipse cx="${f(P[0] + 0.7)}" cy="${f(P[1] - 0.3)}" rx="1.8" ry="1.05" fill="${barva}" stroke="${KOCKA.obrys}" stroke-width="0.4"/>`;
  };
  const ocasD = (B, ohyb, t) => {
    const P = [];
    for (let i = 0; i <= 10; i++) {
      const k = i / 10;
      P.push([B[0] - 4 * k - 3 * Math.sin(k * 2.2) * ohyb, B[1] - 18 * k * ohyb + 3 * k * (1 - ohyb) + Math.sin(t * 1.4 + k * 2) * 1.2 * k]);
    }
    return pasPoBodech(P, (u) => 3.4 - u * 1.2);
  };
  const hlavaKocky = (x, y, oci, t, ucho = 0, zivnuti = 0) =>
    `<g transform="translate(${pt([x, y])})">` +
    `<path d="M-4.2 -2.6 L-3.2 -8.6 L-0.2 -4.4 Z" fill="${KOCKA.cerna}" stroke="${KOCKA.obrys}" stroke-width="0.4" stroke-linejoin="round"/>` +
    `<g transform="rotate(${f(ucho * 18)} 3 -4.4)"><path d="M1 -4.6 L4.4 -8.4 L4.8 -2.4 Z" fill="#F2EEE8" stroke="${KOCKA.obrys}" stroke-width="0.4" stroke-linejoin="round"/><path d="M2 -4.6 L4 -6.8 L4.2 -3.6 Z" fill="#E8A8B0"/></g>` +
    `<ellipse cx="0" cy="0" rx="5.8" ry="5.1" fill="${KOCKA.bila}" stroke="${KOCKA.obrys}" stroke-width="0.45"/>` +
    `<path d="M-5.4 -1.6 Q-4 -5.4 0.6 -5 Q-1.4 -2.6 -5.4 -1.6 Z" fill="${KOCKA.rezava}"/>` +
    `<ellipse cx="4.2" cy="1.8" rx="2.4" ry="1.7" fill="#FBF8F2"/>` +
    `<path d="M5.6 0.7 L6.6 1.1 L5.9 1.8 Z" fill="#E89AA4"/>` +
    (zivnuti > 0.05 ? `<path d="M3.4 2.6 Q4.6 ${f(2.6 + zivnuti * 3.2)} 6.2 2.8 Z" fill="#B8505A" stroke="#4A4048" stroke-width="0.3"/><path d="M4 ${f(2.8 + zivnuti * 2)} Q4.8 ${f(3.2 + zivnuti * 2.2)} 5.6 ${f(2.9 + zivnuti * 1.6)}" stroke="#E89AA4" stroke-width="0.6" fill="none"/>` : "") +
    (oci === "otevrene"
      ? `<ellipse cx="2.6" cy="-0.9" rx="1.15" ry="1.35" fill="#B8D46A"/><ellipse cx="2.7" cy="-0.9" rx="0.35" ry="1.15" fill="#1E1816"/><circle cx="2.3" cy="-1.4" r="0.3" fill="#FFFFFF"/>`
      : oci === "pul"
        ? `<path d="M1.5 -0.9 Q2.6 -1.6 3.7 -0.9" stroke="#1E1816" stroke-width="0.5" fill="none"/><path d="M1.6 -0.8 Q2.6 -0.2 3.6 -0.8" stroke="#1E1816" stroke-width="0.35" fill="none"/>`
        : `<path d="M1.4 -0.6 Q2.6 0.4 3.8 -0.6" stroke="#1E1816" stroke-width="0.5" fill="none" stroke-linecap="round"/>`) +
    `<path d="M5.6 2.4 L9.4 1.8 M5.6 2.8 L9.2 3.4" stroke="#E8ECF4" stroke-width="0.25" opacity="0.8"/>` +
    `</g>`;
  /** Stojící nebo jdoucí kočka. faze je fáze kroku, rozkrok > 0 je skok. */
  const kockaStoji = (t, faze, { rozkrok = 0, pohup = 0, oci = "otevrene", ocas = 1 } = {}) => {
    /* diagonální páry: bližší přední s dalekou zadní */
    const nohy = [
      [5.4, faze + Math.PI, true, false], [-8.8, faze, true, true],
      [7.2, faze, false, false], [-10.6, faze + Math.PI, false, true],
    ];
    const uhly = nohy.map(([x, fz, vzadu, zadni]) => [x, rozkrok ? 0 : Math.sin(fz), rozkrok ? 0 : Math.max(0, Math.cos(fz)) * 1.6, vzadu, zadni]);
    let s = "";
    for (const [x, u, z, , zd] of uhly.filter((q) => q[3])) s += noha(x, -10 + pohup, u, z, true, zd, rozkrok);
    s += `<path d="${ocasD([-12.6, -14.2 + pohup], ocas, t)}" fill="${KOCKA.rezava}" stroke="${KOCKA.obrys}" stroke-width="0.4"/>`;
    const telo = `M-12 ${f(-9.6 + pohup)} C-15.6 ${f(-11 + pohup)} -15.6 ${f(-16.8 + pohup)} -11.4 ${f(-17.6 + pohup)} C-5 ${f(-18.8 + pohup)} 4 ${f(-18.6 + pohup)} 8.6 ${f(-17.4 + pohup)} C12.2 ${f(-16.4 + pohup)} 12.2 ${f(-10.4 + pohup)} 8.4 ${f(-9.4 + pohup)} C3 ${f(-8.4 + pohup)} -7 ${f(-8.4 + pohup)} -12 ${f(-9.6 + pohup)} Z`;
    s += `<path d="${telo}" fill="${KOCKA.bila}" stroke="${KOCKA.obrys}" stroke-width="0.45"/>`;
    s += `<path d="M-6 ${f(-18.4 + pohup)} C-1 ${f(-19.6 + pohup)} 4 ${f(-18.8 + pohup)} 6 ${f(-17.6 + pohup)} C3 ${f(-14 + pohup)} -3 ${f(-13.8 + pohup)} -6 ${f(-18.4 + pohup)} Z" fill="${KOCKA.rezava}"/>`;
    s += `<path d="M-14.6 ${f(-13 + pohup)} C-14.6 ${f(-17 + pohup)} -11.6 ${f(-17.8 + pohup)} -9 ${f(-17.6 + pohup)} C-8 ${f(-14 + pohup)} -10.4 ${f(-11.2 + pohup)} -14.6 ${f(-13 + pohup)} Z" fill="${KOCKA.cerna}"/>`;
    for (const [x, u, z, , zd] of uhly.filter((q) => !q[3])) s += noha(x, -10.4 + pohup, u, z, false, zd, rozkrok);
    s += hlavaKocky(12.6, -20.2 + pohup * 1.2, oci, t);
    return s;
  };
  /** Sedící kočka (šlape, točí se). slapani 0…1, oci. */
  const kockaSedi = (t, { slapani = 0, oci = "otevrene" } = {}) => {
    let s = "";
    s += `<path d="M-10 -1.2 Q-2 1.4 9 -0.6 Q11 -1.4 10.4 -2.2 Q2 -0.4 -9 -3" stroke="${KOCKA.obrys}" stroke-width="3.6" fill="none" stroke-linecap="round"/><path d="M-10 -1.2 Q-2 1.4 9 -0.6 Q11 -1.4 10.4 -2.2" stroke="${KOCKA.rezava}" stroke-width="2.8" fill="none" stroke-linecap="round"/>`;
    s += `<ellipse cx="-4.6" cy="-7.6" rx="9" ry="7.6" fill="${KOCKA.bila}" stroke="${KOCKA.obrys}" stroke-width="0.45"/>`;
    s += `<path d="M-12 -9 Q-10 -15 -4 -15 Q-6 -10 -12 -9 Z" fill="${KOCKA.cerna}"/>`;
    s += `<path d="M-6 -15 Q0 -16.6 4 -13 Q-1 -11 -6 -15 Z" fill="${KOCKA.rezava}"/>`;
    s += `<ellipse cx="4" cy="-11.6" rx="5.6" ry="8.6" fill="${KOCKA.bila}" stroke="${KOCKA.obrys}" stroke-width="0.45"/>`;
    [[3.6, 0], [7, Math.PI]].forEach(([x, fz]) => {
      const z = slapani * Math.max(0, Math.sin(t * 7 + fz)) * 2;
      s += `<path d="M${x} -8 L${x + 0.4} ${f(-0.8 - z)}" stroke="${KOCKA.obrys}" stroke-width="3.4" stroke-linecap="round"/><path d="M${x} -8 L${x + 0.4} ${f(-0.8 - z)}" stroke="#F2EEE8" stroke-width="2.6" stroke-linecap="round"/><ellipse cx="${x + 0.9}" cy="${f(-0.8 - z)}" rx="1.7" ry="1" fill="#F2EEE8" stroke="${KOCKA.obrys}" stroke-width="0.4"/>`;
    });
    s += hlavaKocky(6.4, -22.4, oci, t);
    return s;
  };
  /** Kočka stočená do klubíčka, spí. dech 0…1. */
  const kockaSpi = (t, { dech = 0, ucho = 0, zivnuti = 0 } = {}) => {
    const k = 1 + 0.035 * dech;
    let s = `<g transform="translate(0 0) scale(1 ${f(k)})">`;
    s += `<path d="M-15.6 -3.4 C-17.4 -11.6 -9 -16.6 0 -16.4 C9 -16.2 15.8 -12.4 15.6 -5.6 C15.4 -1.2 9 -0.2 0 -0.2 C-8 -0.2 -14.8 -0.2 -15.6 -3.4 Z" fill="${KOCKA.bila}" stroke="${KOCKA.obrys}" stroke-width="0.45"/>`;
    s += `<path d="M-13 -11 C-8 -16.6 2 -17.4 8 -14 C3 -10 -6 -8.6 -13 -11 Z" fill="${KOCKA.rezava}"/>`;
    s += `<path d="M-15.4 -4.2 C-16.4 -9 -13.6 -12 -11 -12.2 C-9.6 -8 -11.6 -4.6 -15.4 -4.2 Z" fill="${KOCKA.cerna}"/>`;
    s += `</g>`;
    /* ocas omotaný kolem, špička až u čumáčku */
    s += `<path d="M-14.6 -2 C-12 1 4 1.6 10 -0.4 C12.4 -1.2 13.6 -2.4 12.6 -3.2" stroke="${KOCKA.obrys}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M-14.6 -2 C-12 1 4 1.6 10 -0.4 C12.4 -1.2 13.6 -2.4 12.6 -3.2" stroke="${KOCKA.rezava}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`;
    s += `<g transform="rotate(${f(-zivnuti * 14)} 6 -6)">${hlavaKocky(10.6, -7.4 + dech * 0.2 - zivnuti * 1.6, zivnuti > 0.3 ? "pul" : "zavrene", t, ucho, zivnuti)}</g>`;
    return s;
  };

  /* ——— Živé kusy ——— */
  const vrstvaVzdalenySnih = (st) => vOkne(`<g fill="#DCE4F2">${st.vlocky.filter((v) => v.vrstva === 0).map((v) => `<circle cx="${f(v.x)}" cy="${f(v.y)}" r="${f(v.r)}" opacity="${f(v.op)}"/>`).join("")}</g>`);
  const vrstvaSnih = (st) =>
    vOkne(
      `<g fill="#F4F7FC">${st.vlocky.filter((v) => v.vrstva > 0).map((v) => `<circle cx="${f(v.x)}" cy="${f(v.y)}" r="${f(v.r * (v.taje != null ? 1 - v.taje : 1))}" opacity="${f(v.op)}"/>`).join("")}</g>` +
        st.oblacky.map((o) => {
          const u = o.vek / 0.6;
          return `<circle cx="${f(o.x)}" cy="${f(o.y - u * 4)}" r="${f(0.6 + u * 2.4)}" fill="#F4F7FC" opacity="${f(0.5 * (1 - u))}"/>`;
        }).join("") +
        st.chumaje.map((c) => (c.vek < 0 ? "" : `<circle cx="${f(c.x)}" cy="${f(c.y)}" r="${f(c.r)}" fill="url(#sn3-snih)" opacity="${f(c.op)}"/>`)).join(""),
    );
  const vrstvaKour = (st) => {
    let s = "";
    for (let i = 0; i < 6; i++) {
      const u = ((st.t * 0.09 + i / 6) % 1 + 1) % 1;
      const x = 48 + Math.sin(u * 5 + i) * 2.4 * u + u * 18 + st.vitr * 30 * u, y = 64 - u * 46;
      s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(2.6 + u * 9)}" fill="url(#sn3-kour)" opacity="${f(0.5 * (1 - u) * smooth(u * 6))}"/>`;
    }
    return vOkne(s);
  };
  const vrstvaSvetla = (st) => {
    const [x, y] = LUCERNA;
    const mihot = 0.85 + 0.15 * Math.sin(st.t * 9) * Math.sin(st.t * 5.3) - Math.abs(st.vitr) * 0.25;
    return vOkne(
      `<circle cx="${x}" cy="${f(y - 16.2)}" r="34" fill="url(#sn3-zare-lucerny)" opacity="${f(clamp(mihot))}"/>` +
        `<ellipse cx="${x + 4}" cy="${y + 2}" rx="30" ry="6" fill="url(#sn3-zare-lucerny)" opacity="${f(clamp(mihot * 0.8))}"/>` +
        `<circle cx="21.3" cy="102.3" r="17" fill="url(#sn3-zare-lucerny)" opacity="0.55"/>` +
        `<circle cx="80" cy="94" r="7" fill="url(#sn3-zare-lucerny)" opacity="${f(0.3 + 0.6 * st.zvon)}"/>` +
        `<ellipse cx="${FIG.x}" cy="${f(DNO - 2)}" rx="${f(62 + 6 * st.zar)}" ry="${f(22 + 3 * st.zar)}" fill="url(#sn3-zare-samotky)" opacity="${f(0.75 + 0.25 * st.zar)}"/>`,
    );
  };
  const vrstvaPlaminek = (st) => {
    const [x, y] = LUCERNA;
    let s = "";
    for (const [barva, k, W] of [["#F29A3B", 1, 2.4], ["#FBD36A", 0.66, 1.6], ["#FFF6D8", 0.36, 0.9]]) {
      const { d } = jazyk({ B: [x, y - 15.6], th0: -Math.PI / 2, L: 5 * k * (1 + 0.15 * Math.sin(st.t * 11)), W, c: 1, stoc: 0.8, stoupani: 0.95, vitr: -st.vitr * 1.2, t: st.t, w: 8, vlna: 0.3, N: 8 });
      s += `<path d="${d}" fill="${barva}"/>`;
    }
    return vOkne(`<g transform="translate(${x} ${y}) scale(0.86) translate(${-x} ${-y})"><g clip-path="url(#sn3-okenko-lucerny)">${s}</g></g>`);
  };
  const vrstvaZar = () =>
    `<ellipse cx="${FIG.x}" cy="${f(DNO + 0.4)}" rx="44" ry="4.2" fill="#F2A048" opacity="0.7" filter="url(#sn3-rozmaz)"/>` +
    `<ellipse cx="${FIG.x}" cy="${f(DNO - 0.6)}" rx="38" ry="2.4" fill="#FFD27A" opacity="0.8" filter="url(#sn3-rozmaz)"/>`;
  const vrstvaPara = (st) =>
    vOkne(
      st.para
        .map((p) => {
          const u = p.vek / p.zivot;
          const B = [];
          for (let i = 0; i <= 6; i++) {
            const k = i / 6;
            B.push([p.x + Math.sin(p.fz + k * 4 + st.t * 1.2) * 1.6 * k + st.vitr * 14 * k * u + k * p.drift, p.y - k * p.delka * (0.4 + u)]);
          }
          return `<path d="${hladka(B)}" stroke="#F4F7FC" stroke-width="${f(1.4 + u * 1.8)}" stroke-linecap="round" fill="none" opacity="${f(0.28 * Math.sin(Math.PI * u))}"/>`;
        })
        .join(""),
    );
  const vrstvaStopy = (st) =>
    vOkne(`<g fill="#8E9CBC">${st.stopy.map((s) => `<ellipse cx="${f(s.x)}" cy="${f(s.y)}" rx="1.3" ry="0.55" opacity="${f(s.op)}"/><ellipse cx="${f(s.x + 0.9)}" cy="${f(s.y - 0.7)}" rx="0.35" ry="0.25" opacity="${f(s.op)}"/><ellipse cx="${f(s.x - 0.2)}" cy="${f(s.y - 0.9)}" rx="0.35" ry="0.25" opacity="${f(s.op)}"/>`).join("")}</g>`);
  const vrstvaKocka = (st) => {
    const k = st.kocka;
    if (!k) return "";
    let s = "";
    const meritko = 0.92;
    const tr = (x, y, smer, rot = 0) => `translate(${pt([x, y])}) rotate(${f(rot)}) scale(${f(smer * meritko)} ${meritko})`;
    if (k.poza === "jde") s = `<g transform="${tr(k.x, k.y, 1)}">${kockaStoji(st.t, k.faze, { pohup: -Math.abs(Math.sin(k.faze)) * 0.6, oci: k.oci })}</g>`;
    else if (k.poza === "skok") s = `<g transform="${tr(k.x, k.y, 1, k.rot)}">${kockaStoji(st.t, 0, { rozkrok: k.rozkrok, pohup: k.prikrceni * 3, oci: "otevrene", ocas: 0.6 })}</g>`;
    else if (k.poza === "sedi") s = `<g transform="${tr(k.x, k.y - (k.poskok || 0), k.otoceni)}">${kockaSedi(st.t, { slapani: k.slapani, oci: k.oci })}</g>`;
    else {
      s = `<g transform="${tr(k.x, k.y, 1)}">${kockaSpi(st.t, { dech: k.dech, ucho: k.ucho, zivnuti: k.zivnuti || 0 })}</g>`;
      if (k.prolinani < 1) s = `<g opacity="${f(k.prolinani)}">${s}</g><g opacity="${f(1 - k.prolinani)}" transform="${tr(k.x, k.y, 1)}">${kockaSedi(st.t, { oci: "pul" })}</g>`;
    }
    return vOkne(s);
  };
  const vrstvaVrabci = (st) => vOkne(st.vrabci.map((v) => vrabec(v, st.t)).join(""));
  const vrstvaTvar = (st) => vSam(samotkaTvar("sn3", { oci: st.oci, usta: st.usta, tvare: st.tvare, pohled: st.pohledOka }));

  const defs = () =>
    samotkaDefs("sn3", { svetla: "#F8EEDC", stred: "#EBDAC0", tmava: "#D9C3A4" }) +
    filtrLinka("sn3-linka", { posun: 1.2, seed: 12 }) +
    `<clipPath id="sn3-okno"><circle cx="${C[0]}" cy="${C[1]}" r="${RO}"/></clipPath>` +
    `<clipPath id="sn3-kopec-1"><path d="${KOPEC_1}"/></clipPath><clipPath id="sn3-kopec-2"><path d="${KOPEC_2}"/></clipPath>` +
    `<clipPath id="sn3-okenko-lucerny"><rect x="${LUCERNA[0] - 3.6}" y="${LUCERNA[1] - 22.6}" width="7.2" height="7.4"/></clipPath>` +
    `<linearGradient id="sn3-nebe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#151A36"/><stop offset="0.3" stop-color="#232B52"/><stop offset="0.55" stop-color="#36416C"/><stop offset="0.7" stop-color="#4A5682"/></linearGradient>` +
    `<radialGradient id="sn3-mesic"><stop offset="0" stop-color="#E9E4D6" stop-opacity="0.5"/><stop offset="0.25" stop-color="#C9CCE0" stop-opacity="0.22"/><stop offset="1" stop-color="#C9CCE0" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="sn3-plan" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B9C5DE"/><stop offset="0.35" stop-color="#D6DEEE"/><stop offset="1" stop-color="#EDF1F8"/></linearGradient>` +
    `<linearGradient id="sn3-snih" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.6" stop-color="#E8EEF8"/><stop offset="1" stop-color="#C4CEE4"/></linearGradient>` +
    `<radialGradient id="sn3-mokro" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#6E6A74"/><stop offset="0.7" stop-color="#7E8296"/><stop offset="1" stop-color="#A8B2CA"/></radialGradient>` +
    `<linearGradient id="sn3-okenko" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFD98A"/><stop offset="1" stop-color="#F29A3B"/></linearGradient>` +
    `<radialGradient id="sn3-svetlo-lucerny" cx="0.5" cy="0.7" r="0.7"><stop offset="0" stop-color="#FFF0C2"/><stop offset="0.6" stop-color="#FFB45A"/><stop offset="1" stop-color="#C46A2A"/></radialGradient>` +
    `<radialGradient id="sn3-zare-lucerny"><stop offset="0" stop-color="#FFC46A" stop-opacity="0.45"/><stop offset="0.5" stop-color="#FF9A4A" stop-opacity="0.12"/><stop offset="1" stop-color="#FF9A4A" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="sn3-zare-samotky" cx="0.5" cy="0.62" r="0.5"><stop offset="0" stop-color="#FFB45A" stop-opacity="0.5"/><stop offset="0.55" stop-color="#F28A4A" stop-opacity="0.16"/><stop offset="1" stop-color="#F28A4A" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="sn3-kour"><stop offset="0" stop-color="#9A98AE" stop-opacity="0.55"/><stop offset="1" stop-color="#9A98AE" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="sn3-srst" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E2E6F0"/><stop offset="0.65" stop-color="#F4EEE6"/><stop offset="1" stop-color="#F8D6AE"/></linearGradient>` +
    `<linearGradient id="sn3-ram" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7A5A44"/><stop offset="0.5" stop-color="#4A3428"/><stop offset="1" stop-color="#2E201A"/></linearGradient>` +
    `<filter id="sn3-rozmaz" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="2.4"/></filter>` +
    `<filter id="sn3-vlakna" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9 0.04" numOctaves="2" seed="9"/><feColorMatrix type="matrix" values="0 0 0 0 0.92  0 0 0 0 0.9  0 0 0 0 0.84  0 0 0 0.7 -0.36"/></filter>`;

  /* ═══ Simulace ═══ */
  const PRISEDY = [68, 81, 120, 132];
  const VRSTVY_SNEHU = [
    { n: 46, r: [0.3, 0.55], v: [6, 9], op: [0.35, 0.6] },
    { n: 40, r: [0.55, 0.95], v: [10, 14], op: [0.6, 0.85] },
    { n: 16, r: [1.05, 1.7], v: [16, 22], op: [0.7, 0.95] },
  ];
  const novaVlocka = (R, vrstva, nahore) => {
    const L = VRSTVY_SNEHU[vrstva];
    return {
      vrstva, x: R() * 200 - 10, y: nahore ? -4 - R() * 10 : R() * 180,
      r: lerp(L.r[0], L.r[1], R()), v: lerp(L.v[0], L.v[1], R()), op: lerp(L.op[0], L.op[1], R()), fz: R() * 6.28, w: 0.6 + R() * 1.2, taje: null,
    };
  };
  const novyVrabec = (R, prised, sedi = false) => {
    const zprava = R() < 0.6;
    const x = PRISEDY[prised];
    return {
      prised, stav: sedi ? "sedi" : "let", x: sedi ? x : zprava ? 196 : -16, y: sedi ? VRCH : 30 + R() * 40,
      start: null, cil: null, t0: 0, smer: sedi ? (R() < 0.5 ? 1 : -1) : zprava ? -1 : 1, nacepyreni: sedi ? 1 : 0, hlava: 1, oci: !sedi, fz: R() * 6.28,
      naklon: 0, dalsiPohyb: 1 + R() * 4, nase: null,
    };
  };
  const novaDynamika = () => {
    const R = rng(4242);
    const vlocky = [];
    VRSTVY_SNEHU.forEach((L, i) => {
      for (let k = 0; k < L.n; k++) vlocky.push(novaVlocka(R, i, false));
    });
    return {
      vlocky, obl: [], chumaje: [], para: [], stopy: [], vrabci: [novyVrabec(R, 0, true), novyVrabec(R, 2, true)],
      kocka: null, kockaPrijde: 16, dalsiVrabec: 4, patra: PATRA.map(() => ({ uhel: 0, om: 0, snih: 1 })),
      vitr: 0, mysPred: null, zar: 0, zarPuls: 0, zvon: 0, dalsiZvon: 7, akumPara: 0, akumTani: 0, pokuk: -100, pokukKam: [90, 90], blizkoOd: null,
      pohled: [0, 0], nahoda: R, zvuk: [], krokZvuk: 0,
    };
  };
  const volnyPrised = (dyn) => {
    const obsazene = new Set(dyn.vrabci.map((v) => v.prised));
    const volne = [0, 1, 2, 3].filter((i) => !obsazene.has(i));
    return volne.length ? volne[Math.floor(dyn.nahoda() * volne.length)] : -1;
  };
  /** Kam vrabec sedá: na Šamotku, nebo — když na ní spí kočka — i na kočku. */
  const misto = (dyn, prised) => {
    const k = dyn.kocka;
    if (k && (k.stav === "spi" || k.stav === "lehá") && (prised === 1 || prised === 2)) return [prised === 1 ? FIG.x - 4 : FIG.x + 6, VRCH - 13.4];
    return [PRISEDY[prised], VRCH];
  };
  const posliVrabce = (dyn, t, R) => {
    const p = volnyPrised(dyn);
    if (p < 0) return false;
    const v = novyVrabec(R, p);
    v.t0 = t;
    v.start = [v.x, v.y];
    dyn.vrabci.push(v);
    dyn.zvuk.push({ druh: "cvrk", sila: 0.7, pan: v.x > 90 ? 0.6 : -0.6 });
    return true;
  };
  const krok = (dyn, t, dt, vstup) => {
    const R = dyn.nahoda;
    /* vítr z pohybu myši */
    let mysV = 0;
    if (vstup.mys && dyn.mysPred) mysV = (vstup.mys.x - dyn.mysPred.x) / Math.max(dt, 1 / 120);
    dyn.mysPred = vstup.mys ? { ...vstup.mys } : null;
    const cilV = clamp(mysV / 300, -1.2, 1.2) + 0.12 * Math.sin(t * 0.23);
    dyn.vitr += (cilV - dyn.vitr) * (1 - Math.exp(-dt / (Math.abs(cilV) > Math.abs(dyn.vitr) ? 0.25 : 1.2)));

    /* kliknutí: borovice shodí sníh, jinde přileti vrabec, pak přijde kočka */
    if (vstup.kliky && vstup.kliky.length) {
      for (const k of vstup.kliky) {
        const iPatra = PATRA.findIndex((p) => Math.abs(k.x - p.x) < p.w + 3 && Math.abs(k.y - p.y) < p.h + 6);
        const naSamotce = k.x > FIG.x - 46 && k.x < FIG.x + 46 && k.y > VRCH - 6 && k.y < DNO + 4;
        if (iPatra >= 0 && dyn.patra[iPatra].snih > 0.3) {
          shodSnih(dyn, iPatra, t, R);
        } else if (naSamotce) {
          dyn.zarPuls = 1;
          dyn.zvuk.push({ druh: "teplo", sila: 0.8 });
          for (let i = 0; i < 4; i++) dyn.para.push(novaPara(R, true));
          if (dyn.kocka && dyn.kocka.stav === "spi") dyn.kocka.predouce = t;
        } else if (!posliVrabce(dyn, t, R)) {
          if (!dyn.kocka) dyn.kockaPrijde = Math.min(dyn.kockaPrijde, t + 0.3);
          else {
            const i = Math.floor(R() * PATRA.length);
            if (dyn.patra[i].snih > 0.3) shodSnih(dyn, i, t, R);
          }
        }
      }
      vstup.kliky.length = 0;
    }

    /* sníh */
    for (const v of dyn.vlocky) {
      v.y += v.v * dt;
      v.x += (Math.sin(t * v.w + v.fz) * 3 + dyn.vitr * (14 + v.vrstva * 10)) * dt;
      /* nad Šamotkou taje */
      if (v.vrstva > 0 && v.taje == null && v.x > FIG.x - 46 && v.x < FIG.x + 46 && v.y > VRCH - 16 - v.vrstva * 4 && v.y < DNO) {
        v.taje = 0;
        if (R() < 0.35) dyn.obl.push({ x: v.x, y: v.y, vek: 0 });
        dyn.akumTani += 1;
      }
      if (v.taje != null) v.taje += dt / 0.35;
      if (v.y > 175 || (v.taje != null && v.taje >= 1)) Object.assign(v, novaVlocka(R, v.vrstva, true));
      if (v.x < -12) v.x += 204;
      if (v.x > 192) v.x -= 204;
    }
    while (dyn.akumTani >= 9) {
      dyn.akumTani -= 9;
      dyn.zvuk.push({ druh: "ts", sila: 0.25 + R() * 0.25, pan: (R() - 0.5) * 0.8 });
    }
    for (const o of dyn.obl) o.vek += dt;
    dyn.obl = dyn.obl.filter((o) => o.vek < 0.6);

    /* pára ze Šamotky */
    dyn.akumPara += dt * 2.4;
    while (dyn.akumPara >= 1) {
      dyn.akumPara -= 1;
      dyn.para.push(novaPara(R, false));
    }
    for (const p of dyn.para) p.vek += dt;
    dyn.para = dyn.para.filter((p) => p.vek < p.zivot);

    /* žár: pomalý dech, po kliknutí puls */
    dyn.zarPuls *= Math.exp(-dt / 1.4);
    dyn.zar = 0.5 + 0.5 * Math.sin(t * 0.8) * 0.4 + dyn.zarPuls * 0.6;

    /* zvon z pagody */
    dyn.zvon *= Math.exp(-dt / 2.5);
    if (t > dyn.dalsiZvon) {
      dyn.dalsiZvon = t + 22 + R() * 8;
      dyn.zvon = 1;
      dyn.zvuk.push({ druh: "zvon", sila: 1, pan: 0.6 });
      /* zvon z pagody: vrabci zvednou hlavu směrem k ní, kočce cukne ucho */
      for (const v of dyn.vrabci) if (v.stav === "sedi") v.zvon = t;
      if (dyn.kocka) dyn.kocka.lek = t;
    }

    /* jednou za čas se sníh z borovice sesype sám */
    if (dyn.dalsiSesuv == null) dyn.dalsiSesuv = t + 24 + R() * 12;
    if (t > dyn.dalsiSesuv) {
      dyn.dalsiSesuv = t + 32 + R() * 20;
      const plna = dyn.patra.map((q, i) => (q.snih > 0.7 ? i : -1)).filter((i) => i >= 0);
      if (plna.length) shodSnih(dyn, plna[Math.floor(R() * plna.length)], t, R);
    }
    /* borovice: patra se houpou, sníh pomalu přisněží */
    dyn.patra.forEach((q, i) => {
      const a = -40 * q.uhel - 3.2 * q.om + dyn.vitr * 4 * (1 + i * 0.2);
      q.om += a * dt;
      q.uhel += q.om * dt;
      q.snih = Math.min(1, q.snih + dt / 40);
    });
    for (const c of dyn.chumaje) {
      c.vek += dt;
      if (c.vek < 0) continue;
      c.vy += 130 * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      if (c.y > c.zem) {
        if (!c.prask) {
          c.prask = true;
          dyn.zvuk.push({ druh: "buch", sila: clamp(c.r / 4), pan: (c.x - 90) / 90 });
          for (let i = 0; i < 6; i++) dyn.obl.push({ x: c.x + (R() - 0.5) * 6, y: c.zem, vek: -R() * 0.2 });
        }
        c.op -= dt * 2;
      }
    }
    dyn.chumaje = dyn.chumaje.filter((c) => c.op > 0);

    /* vrabci */
    if (!dyn.kocka || dyn.kocka.stav === "spi") {
      if (t > dyn.dalsiVrabec) {
        dyn.dalsiVrabec = t + (dyn.kocka ? 4.5 : 5.5) + R() * 3;
        posliVrabce(dyn, t, R);
      }
    }
    for (const v of dyn.vrabci) krokVrabce(dyn, v, t, dt, vstup, R);
    dyn.vrabci = dyn.vrabci.filter((v) => !(v.stav === "pryc"));

    /* kočka */
    if (!dyn.kocka && t > dyn.kockaPrijde) {
      dyn.kocka = { stav: "jde", t0: t, x: 34, y: ZEM_KOCKY, faze: 0, ujito: 0, oci: "otevrene" };
      dyn.zvuk.push({ druh: "mnau", sila: 0.6, pan: -0.7 });
    }
    if (dyn.kocka) krokKocky(dyn, dyn.kocka, t, dt, R);
    for (const s of dyn.stopy) s.op = Math.max(0, s.op - dt / 70);
    dyn.stopy = dyn.stopy.filter((s) => s.op > 0.02);

    /* Šamotka pokukuje */
    const blizko = vstup.mys && Math.hypot(vstup.mys.x - TVAR[0], vstup.mys.y - TVAR[1]) < 26;
    if (blizko && dyn.blizkoOd == null) dyn.blizkoOd = t;
    if (!blizko) dyn.blizkoOd = null;
    if (dyn.blizkoOd != null && t - dyn.blizkoOd > 1.4 && t - dyn.pokuk > 4.5) {
      dyn.pokuk = t;
      dyn.blizkoOd = t + 3;
    }
    const kam = t - dyn.pokuk < 1.6 && vstup.mys ? [vstup.mys.x, vstup.mys.y] : null;
    let cil = [0, 0];
    if (kam) cil = [clamp((kam[0] - TVAR[0]) / 24, -1, 1) * 1.7, clamp((kam[1] - TVAR[1]) / 24, -1, 1) * 1.3];
    dyn.pohled = dyn.pohled.map((q, i) => q + (cil[i] - q) * (1 - Math.exp(-dt / 0.12)));
  };
  const novaPara = (R, silna) => ({
    x: FIG.x + (R() - 0.5) * 80, y: VRCH - 0.5, vek: 0, zivot: (silna ? 2.2 : 2.8) + R() * 1.4, delka: (silna ? 18 : 12) + R() * 8, fz: R() * 6.28, drift: (R() - 0.5) * 4,
  });
  const shodSnih = (dyn, i, t, R) => {
    const p = PATRA[i];
    const q = dyn.patra[i];
    const kolik = q.snih;
    q.snih = 0;
    q.om += 3.6;
    for (let k = 0; k < 5; k++) dyn.chumaje.push({ x: p.x + (R() - 0.5) * p.w * 1.4, y: p.y - p.h * 0.6, vx: (R() - 0.5) * 8 + dyn.vitr * 10, vy: -4 + R() * 3, r: (1.4 + R() * 2.2) * (0.6 + 0.4 * kolik), vek: -k * 0.04, op: 1, zem: 118 + R() * 6 + (p.x > 150 ? 4 : 0), prask: false });
    dyn.zvuk.push({ druh: "sesuv", sila: 0.8 * kolik, pan: 0.6 });
    for (const v of dyn.vrabci) if (v.stav === "sedi") v.lek = t;
    if (dyn.kocka) dyn.kocka.lek = t;
  };
  const krokVrabce = (dyn, v, t, dt, vstup, R) => {
    if (v.stav === "let") {
      if (!v.cil) {
        v.cil = misto(dyn, v.prised);
        v.trvani = 1.2 + Math.hypot(v.cil[0] - v.start[0], v.cil[1] - v.start[1]) / 110;
      }
      v.cil = misto(dyn, v.prised);
      const u = clamp((t - v.t0) / v.trvani);
      const e = easeInOut(u);
      v.x = lerp(v.start[0], v.cil[0], e);
      v.y = lerp(v.start[1], v.cil[1], e) - Math.sin(Math.PI * u) * 18;
      v.smer = v.cil[0] >= v.start[0] ? 1 : -1;
      v.naklon = -8 * Math.cos(Math.PI * u) * v.smer;
      if (u >= 1) {
        v.stav = "sedi";
        v.oci = true;
        v.naklon = 0;
        v.posazen = t;
        dyn.zvuk.push({ druh: "cvrk", sila: 0.45, pan: (v.x - 90) / 90 });
      }
    } else if (v.stav === "odlet") {
      const u = clamp((t - v.t0) / 1.4);
      v.x = lerp(v.start[0], v.cil[0], easeInOut(u));
      v.y = lerp(v.start[1], v.cil[1], u) - Math.sin(Math.PI * u) * 10;
      if (u >= 1) v.stav = "pryc";
    } else {
      /* sedí: postupně se načepýří a zavře oči; občas otočí hlavu */
      const [mx, my] = misto(dyn, v.prised);
      v.x += (mx - v.x) * (1 - Math.exp(-dt / 0.2));
      v.y += (my - v.y) * (1 - Math.exp(-dt / 0.2));
      const doba = t - (v.posazen ?? -10);
      const lek = v.lek != null && t - v.lek < 1.6;
      const cilPuf = lek ? 0.2 : clamp((doba - 1) / 3);
      v.nacepyreni += (cilPuf - v.nacepyreni) * (1 - Math.exp(-dt / (lek ? 0.1 : 0.9)));
      v.nacepyreni = clamp(v.nacepyreni + Math.abs(dyn.vitr) * 0.002);
      v.oci = lek || doba < 5 || (vstup.mys && Math.hypot(vstup.mys.x - v.x, vstup.mys.y - v.y) < 18);
      v.dalsiPohyb -= dt;
      if (v.zvon != null && t - v.zvon < 2.4) {
        v.hlava = 80 >= v.x ? v.smer : -v.smer;
        v.oci = true;
      } else if (vstup.mys && Math.hypot(vstup.mys.x - v.x, vstup.mys.y - v.y) < 30) v.hlava = vstup.mys.x >= v.x ? v.smer : -v.smer;
      else if (v.dalsiPohyb < 0) {
        v.dalsiPohyb = 2 + R() * 5;
        v.hlava = R() < 0.5 ? 1 : -1;
        /* občas poskočí a sedne si obráceně */
        if (R() < 0.3 && v.nacepyreni < 0.95) {
          v.smer *= -1;
          v.poskok = t;
        }
      }
      v.y -= v.poskok != null && t - v.poskok < 0.22 ? Math.sin(Math.PI * (t - v.poskok) / 0.22) * 1.6 : 0;
      v.naklon = lek ? Math.sin(t * 30) * 4 : 0;
    }
  };
  const odletVrabce = (dyn, v, t) => {
    v.stav = "odlet";
    v.t0 = t;
    v.start = [v.x, v.y];
    v.cil = v.x > 90 ? [200, 20] : [-20, 26];
    v.smer = v.cil[0] > v.x ? 1 : -1;
    v.nacepyreni = 0;
    v.oci = true;
  };
  const krokKocky = (dyn, k, t, dt, R) => {
    const u = t - k.t0;
    if (k.stav === "jde") {
      const rychlost = 9;
      const krok0 = k.ujito;
      k.ujito += rychlost * dt;
      k.x = 34 + k.ujito;
      k.faze = (k.ujito / 9) * Math.PI * 2;
      k.poza = "jde";
      /* stopy v každém půlkroku */
      if (Math.floor(krok0 / 4.5) !== Math.floor(k.ujito / 4.5)) {
        const n = Math.floor(k.ujito / 4.5);
        dyn.stopy.push({ x: k.x + (n % 2 ? 4 : -6), y: ZEM_KOCKY + (n % 2 ? 0.6 : -0.4), op: 0.75 });
        dyn.zvuk.push({ druh: "krup", sila: 0.4, pan: (k.x - 90) / 90 });
      }
      if (k.x >= 64) {
        k.stav = "prikrceni";
        k.t0 = t;
      }
    } else if (k.stav === "prikrceni") {
      k.poza = "skok";
      k.prikrceni = smooth(u / 0.5);
      k.rozkrok = 0.01;
      k.rot = 0;
      if (u > 0.2 && !k.vyplasila) {
        k.vyplasila = true;
        for (const v of dyn.vrabci) if (v.stav !== "odlet") odletVrabce(dyn, v, t);
        dyn.zvuk.push({ druh: "frr", sila: 1, pan: 0 });
        dyn.dalsiVrabec = t + 12;
      }
      if (u > 0.55) {
        k.stav = "skok";
        k.t0 = t;
        k.zX = k.x;
      }
    } else if (k.stav === "skok") {
      const q = clamp(u / 0.62);
      k.poza = "skok";
      k.prikrceni = 0;
      k.rozkrok = Math.sin(Math.PI * q);
      k.x = lerp(k.zX, FIG.x, q);
      k.y = lerp(ZEM_KOCKY, VRCH, q) - Math.sin(Math.PI * q) * 16;
      k.rot = -22 * Math.cos(Math.PI * q);
      if (q >= 1) {
        k.stav = "toci";
        k.t0 = t;
        k.y = VRCH;
        dyn.zvuk.push({ druh: "dopad", sila: 0.6, pan: 0 });
      }
    } else if (k.stav === "toci") {
      /* dvakrát se otočí dokola, než si lehne */
      k.poza = "sedi";
      /* zepředu je kočka široká jako půlka svého boku — pod tu míru se nezúží */
      const c = Math.cos(Math.PI * 2 * clamp(u / 1.6));
      k.otoceni = Math.sign(c || 1) * Math.max(0.55, Math.abs(c));
      k.poskok = Math.abs(c) < 0.55 ? Math.sin(Math.PI * (1 - Math.abs(c) / 0.55)) * 1.6 : 0;
      k.slapani = 0;
      k.oci = "otevrene";
      if (u > 1.6) {
        k.stav = "slape";
        k.t0 = t;
        dyn.zvuk.push({ druh: "mnau", sila: 0.45, pan: 0, kratce: true });
      }
    } else if (k.stav === "slape") {
      k.poza = "sedi";
      k.otoceni = 1;
      k.poskok = 0;
      k.slapani = 1;
      k.oci = "pul";
      if (Math.floor((u - dt) * 2) !== Math.floor(u * 2)) dyn.zvuk.push({ druh: "prr", sila: 0.6 });
      if (u > 2.6) {
        k.stav = "lehá";
        k.t0 = t;
      }
    } else if (k.stav === "lehá") {
      k.poza = "spi";
      k.prolinani = smooth(u / 0.9);
      k.dech = 0;
      if (u > 0.9) {
        k.stav = "spi";
        k.t0 = t;
        dyn.dalsiVrabec = Math.min(dyn.dalsiVrabec, t + 5);
      }
    } else {
      k.poza = "spi";
      k.prolinani = 1;
      k.dech = Math.sin(t * 1.9);
      const lek = k.lek != null && t - k.lek < 0.8;
      k.ucho = lek ? Math.sin((t - k.lek) * 20) : Math.max(0, Math.sin(t * 0.37) - 0.97) * 30;
      if (k.dalsiZivnuti == null) k.dalsiZivnuti = t + 14 + R() * 10;
      if (t > k.dalsiZivnuti) {
        k.dalsiZivnuti = t + 26 + R() * 16;
        k.zivaOd = t;
        dyn.zvuk.push({ druh: "mnau", sila: 0.25, pan: 0, kratce: true, za: 0.35 });
      }
      k.zivnuti = k.zivaOd != null ? Math.sin(Math.PI * clamp((t - k.zivaOd) / 1.5)) : 0;
      const silne = k.predouce != null && t - k.predouce < 3;
      if (Math.floor((u - dt) / (silne ? 0.5 : 0.9)) !== Math.floor(u / (silne ? 0.5 : 0.9))) dyn.zvuk.push({ druh: "prr", sila: silne ? 0.8 : 0.35 });
    }
  };

  const stav = (t, vstup = {}, dyn) => {
    const d = dyn || novaDynamika();
    let oci = "klid", usta = "usmev", tvare = 0.35;
    const k = d.kocka;
    if (k && (k.stav === "spi" || k.stav === "lehá")) [oci, usta, tvare] = ["spi", "usmev", 0.75];
    else if (k && (k.stav === "toci" || k.stav === "slape")) [oci, usta, tvare] = ["klid", "vlnka", 0.85];
    if (t - d.pokuk < 1.6) oci = "pokuk";
    if (d.zarPuls > 0.3) [oci, usta, tvare] = ["blaho", "usmev", 0.9];
    return {
      t, vitr: d.vitr, vlocky: d.vlocky, oblacky: d.obl, chumaje: d.chumaje, para: d.para, stopy: d.stopy, vrabci: d.vrabci, kocka: k, patra: d.patra,
      zar: d.zar, zvon: d.zvon, oci, usta, tvare, pohledOka: d.pohled,
    };
  };
  const snimek = (st) => Math.floor(st.t * 30);

  return {
    id: "v3",
    viewBox: "0 0 180 180",
    defs,
    novaDynamika,
    krok,
    stav,
    hukot: (st) => clamp(0.18 + Math.abs(st.vitr) * 0.5),
    hukotFrekvence: 520,
    klidne: { t: 8.5 },
    zacatek: 8.5,
    vrstvy: [
      { id: "nebe", kresli: vrstvaNebe, tezka: true },
      { id: "vzdaleny-snih", kresli: vrstvaVzdalenySnih, klic: (st) => Math.floor(st.t * 24) },
      { id: "kour", kresli: vrstvaKour, klic: (st) => Math.floor(st.t * 12) },
      { id: "kulna", kresli: vrstvaKulna, tezka: true },
      { id: "borovice", kresli: vrstvaBorovice, klic: (st) => st.patra.map((q) => `${f(q.uhel)}:${f(q.snih)}`).join() },
      { id: "zem", kresli: vrstvaZem, tezka: true },
      { id: "stopy", kresli: vrstvaStopy, klic: (st) => `${st.stopy.length},${f(st.stopy.length ? st.stopy[0].op : 0)}` },
      { id: "lucerna", kresli: vrstvaLucerna, tezka: true },
      { id: "plaminek", kresli: vrstvaPlaminek, klic: (st) => Math.floor(st.t * 20) },
      { id: "zar", kresli: vrstvaZar, pruhlednost: (st) => f(clamp(0.55 + 0.45 * st.zar)) },
      { id: "samotka", kresli: () => vSam(samotkaTelo("sn3")), tezka: true },
      { id: "tvar", kresli: vrstvaTvar, klic: (st) => `${st.oci},${st.usta},${f(st.tvare)},${f(st.pohledOka[0])},${f(st.pohledOka[1])}` },
      { id: "kocka", kresli: vrstvaKocka, klic: (st) => (st.kocka ? snimek(st) : 0) },
      { id: "vrabci", kresli: vrstvaVrabci, klic: (st) => st.vrabci.map((v) => `${f(v.x)},${f(v.y)},${f(v.nacepyreni)},${v.hlava},${v.oci},${f(v.naklon)},${v.stav === "sedi" ? 0 : snimek(st)}`).join("|") },
      { id: "para", kresli: vrstvaPara, klic: (st) => Math.floor(st.t * 20) },
      { id: "svetla", kresli: vrstvaSvetla, klic: (st) => Math.floor(st.t * 12), styl: "mix-blend-mode:screen" },
      { id: "snih", kresli: vrstvaSnih, klic: snimek },
      { id: "papir", kresli: vrstvaPapir, tezka: true, styl: "mix-blend-mode:multiply" },
      { id: "ram", kresli: vrstvaRam },
    ],
  };
})();
