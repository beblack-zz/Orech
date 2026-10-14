/**
 * Úroveň 四 Tvar „Podle předlohy“ — kresba scény (čisté SVG jako text).
 *
 * Dílna v poledne: vlevo na polici stojí mistrův kus v plné glazuře
 * a vedle něj Vázička (postavička se vkládá v Tvar.astro), pod policí
 * lavice s prknem na tři vytočené kusy, uprostřed visí svitek se znakem
 * 形 a vpravo je velký kruh. Na hlavě kruhu leží hrouda a přes ni zlatá
 * přerušovaná čára — obrys předlohy ve stejném měřítku, po kterém se
 * kreslí. Všechno, co se za hry hýbe (hlína, zlatá čára, červená čára,
 * žebro, drát, kusy na prkně), přepisuje scripts/zkouska/urovne/tvar.ts.
 *
 * Výchozí stav je první kolo: miska na polici, její obrys na kruhu.
 */
import {
  SIRKA, VYSKA, CX, ZAKLAD, S, PREDLOHY, HROUDA, POLICE, PRKNO, f1,
  obrysHliny, ryhyHliny, leskHliny, okrajHliny, stinHliny, patkaHliny,
  duchUseky, duchLevy, startBod, predlohaSvg, yPasu,
} from "./tvar-tvary";
import type { Profil } from "./tvar-tvary";

const defs = () => `<defs>
  <linearGradient id="mt4-zed" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#F5EDDF"/><stop offset="0.7" stop-color="#E9DECA"/><stop offset="1" stop-color="#DACBB0"/>
  </linearGradient>
  <linearGradient id="mt4-paprsek" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#FFF8E2" stop-opacity="0.95"/><stop offset="1" stop-color="#FFF8E2" stop-opacity="0"/>
  </linearGradient>
  <radialGradient id="mt4-zare" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#FFF6DA" stop-opacity="1"/><stop offset="0.55" stop-color="#FFEBC0" stop-opacity="0.45"/><stop offset="1" stop-color="#FFEBC0" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="mt4-podlaha" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#C8B192"/><stop offset="1" stop-color="#B0977A"/>
  </linearGradient>
  <linearGradient id="mt4-drevo" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#BE8F5E"/><stop offset="1" stop-color="#8A6038"/>
  </linearGradient>
  <linearGradient id="mt4-drevo-vrch" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#EBCB98"/><stop offset="1" stop-color="#C99B67"/>
  </linearGradient>
  <linearGradient id="mt4-stin-dolu" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#3B2A1B" stop-opacity="0.2"/><stop offset="1" stop-color="#3B2A1B" stop-opacity="0"/>
  </linearGradient>
  <radialGradient id="mt4-stin-r" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#2B2420" stop-opacity="0.42"/><stop offset="0.6" stop-color="#2B2420" stop-opacity="0.16"/><stop offset="1" stop-color="#2B2420" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="mt4-svitek" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#F2EADA"/><stop offset="0.4" stop-color="#FCF8EE"/><stop offset="1" stop-color="#EDE3D0"/>
  </linearGradient>
  <linearGradient id="mt4-brokat" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#3C4470"/><stop offset="0.45" stop-color="#5A6290"/><stop offset="1" stop-color="#363D66"/>
  </linearGradient>
  <linearGradient id="mt4-tycka" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#6E4E36"/><stop offset="1" stop-color="#3B2A1B"/>
  </linearGradient>
  <linearGradient id="mt4-lavice" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#B98A58"/><stop offset="1" stop-color="#85603A"/>
  </linearGradient>
  <linearGradient id="mt4-lavice-vrch" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#E0BC86"/><stop offset="1" stop-color="#C29462"/>
  </linearGradient>
  <linearGradient id="mt4-vana" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#4A5055"/><stop offset="0.28" stop-color="#7C848A"/><stop offset="0.5" stop-color="#6A7177"/><stop offset="1" stop-color="#41464B"/>
  </linearGradient>
  <linearGradient id="mt4-vana-zad" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#636A70"/><stop offset="1" stop-color="#4A5055"/>
  </linearGradient>
  <linearGradient id="mt4-hlava" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#7E858C"/><stop offset="0.33" stop-color="#D8DDE0"/><stop offset="0.58" stop-color="#A6ADB3"/><stop offset="1" stop-color="#686F75"/>
  </linearGradient>
  <linearGradient id="mt4-hlava-bok" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#3A3F43"/><stop offset="0.32" stop-color="#7C838A"/><stop offset="1" stop-color="#363B3F"/>
  </linearGradient>
  <linearGradient id="mt4-hlina" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#4E3729"/><stop offset="0.28" stop-color="#9C7860"/><stop offset="0.43" stop-color="#C9A184"/><stop offset="0.62" stop-color="#9C7860"/><stop offset="1" stop-color="#4A3426"/>
  </linearGradient>
  <radialGradient id="mt4-vnitrek" cx="0.5" cy="0.35" r="0.7">
    <stop offset="0" stop-color="#36261C"/><stop offset="1" stop-color="#6E5040"/>
  </radialGradient>
  <linearGradient id="mt4-zebro-g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#E8C28E"/><stop offset="1" stop-color="#B98650"/>
  </linearGradient>
  <pattern id="mt4-toceni" width="44" height="${VYSKA}" patternUnits="userSpaceOnUse">
    <rect x="0" width="6" height="${VYSKA}" fill="#FFFFFF" opacity="0.13"/>
    <rect x="21" width="2" height="${VYSKA}" fill="#2E2018" opacity="0.17"/>
  </pattern>
  <clipPath id="mt4-orez"><path class="mt4-tvar" d="${obrysHliny(HROUDA)}"/></clipPath>
  <clipPath id="mt4-duch-orez"><rect class="mt4-duch-okno" x="0" y="0" width="${SIRKA}" height="${VYSKA}"/></clipPath>
</defs>`;

/* ——— Zeď, světlo, podlaha ——— */

const zed = () => `
  <rect width="${SIRKA}" height="${VYSKA}" fill="url(#mt4-zed)"/>
  <path class="mt4-paprsek" d="M0 0 L262 0 L640 ${VYSKA} L176 ${VYSKA} Z" fill="url(#mt4-paprsek)" opacity="0.42"/>
  <rect x="0" y="494" width="${SIRKA}" height="8" fill="#B89A74"/>
  <rect x="0" y="502" width="${SIRKA}" height="${VYSKA - 502}" fill="url(#mt4-podlaha)"/>
  <g stroke="#A08566" stroke-width="1" opacity="0.5">
    <path d="M0 522 H${SIRKA}"/><path d="M0 544 H${SIRKA}"/>
  </g>`;

/* Svitek kakejiku se znakem zastavení: 形, tvar */
const svitek = () => `
  <g class="mt4-svitek">
    <path d="M354 46 L378 20 L402 46" fill="none" stroke="#5C4636" stroke-width="1.4"/>
    <circle cx="378" cy="19" r="2.6" fill="#8C7A68"/>
    <rect x="356" y="52" width="48" height="186" fill="#2B2420" opacity="0.08" transform="translate(5 4)"/>
    <rect x="354" y="48" width="48" height="186" fill="url(#mt4-brokat)"/>
    <rect x="360" y="72" width="36" height="142" fill="url(#mt4-svitek)"/>
    <rect x="360" y="69" width="36" height="3" fill="#D6A23A"/>
    <rect x="360" y="214" width="36" height="3" fill="#D6A23A"/>
    <path d="M368 48 V92 M388 48 V92" stroke="#2A3058" stroke-width="3"/>
    <path d="M368 92 V96 M388 92 V96" stroke="#D6A23A" stroke-width="3"/>
    <text class="mt4-znak" x="378" y="152" text-anchor="middle" font-size="34" font-family="Yuji Syuku, Yu Mincho, serif" fill="#2B2420">形</text>
    <rect x="373" y="184" width="10" height="10" rx="1.2" fill="#C4432B"/>
    <path d="M375.5 187 h5 M375.5 191 h5 M378 186.5 v5" stroke="#FBF3E6" stroke-width="0.9"/>
    <rect x="352" y="44" width="52" height="6" rx="2" fill="url(#mt4-tycka)"/>
    <rect x="350" y="232" width="56" height="8" rx="3" fill="url(#mt4-tycka)"/>
    <circle cx="349" cy="236" r="4.6" fill="#3B2A1B"/><circle cx="407" cy="236" r="4.6" fill="#3B2A1B"/>
    <circle cx="347.8" cy="234.6" r="1.3" fill="#FFFFFF" opacity="0.35"/><circle cx="405.8" cy="234.6" r="1.3" fill="#FFFFFF" opacity="0.35"/>
  </g>`;

/* ——— Police s předlohou ——— */

const police = (kolo: number) => {
  const d = POLICE.deska;
  const st = POLICE.x + POLICE.w / 2;
  const konzola = (x: number) =>
    `<path d="M${x - 9} ${d + 12} H${x + 9} V${d + 18} C${x + 9} ${d + 34} ${x + 2} ${d + 46} ${x - 9} ${d + 52} Z" fill="#9A7350" stroke="#6E5236" stroke-width="1"/>`;
  return `
  <g class="mt4-police">
    <ellipse cx="${st}" cy="${d - 92}" rx="132" ry="136" fill="url(#mt4-zare)"/>
    <rect x="16" y="${d + 12}" width="310" height="44" fill="url(#mt4-stin-dolu)"/>
    ${konzola(52)}${konzola(292)}
    <path d="M18 ${d - 4} H322 L326 ${d} H14 Z" fill="url(#mt4-drevo-vrch)"/>
    <rect x="14" y="${d}" width="312" height="12" rx="2" fill="url(#mt4-drevo)"/>
    <path d="M15 ${d + 0.8} H325" stroke="#F3D7A8" stroke-width="1" opacity="0.7"/>
    <path d="M40 ${d + 7} C90 ${d + 5} 120 ${d + 9} 180 ${d + 6} M210 ${d + 8} C250 ${d + 6} 280 ${d + 8} 312 ${d + 6}" stroke="#7A5532" stroke-width="0.8" fill="none" opacity="0.5"/>
    <g class="mt4-predloha">${predlohaSvg(PREDLOHY[kolo])}</g>
    <g class="mt4-jiskry-police"></g>
    <path d="M${st} ${d + 12} C${st - 3} ${d + 18} ${st + 3} ${d + 22} ${st} ${d + 27}" stroke="#8C7A68" stroke-width="1" fill="none"/>
    <g class="mt4-cedulka" transform="rotate(-3 ${st} ${d + 46})">
      <rect x="${st - 50}" y="${d + 26}" width="100" height="42" rx="3" fill="#FBF6EA" stroke="#D8C7A6" stroke-width="1"/>
      <circle cx="${st}" cy="${d + 31}" r="2" fill="#D8C7A6"/>
      <text x="${st}" y="${d + 44}" text-anchor="middle" font-size="13" font-family="Caveat, cursive" fill="#C4432B" class="mt4-ruka">předloha</text>
      <text class="mt4-cedulka-nazev mt4-ruka" x="${st}" y="${d + 62}" text-anchor="middle" font-size="22" font-family="Caveat, cursive" fill="#2B2420">${PREDLOHY[kolo].nazev}</text>
    </g>
  </g>`;
};

/* ——— Lavice s prknem na vytočené kusy ——— */

const lavice = () => {
  const y = PRKNO.y;
  return `
  <g class="mt4-lavice">
    <ellipse cx="152" cy="${y + 90}" rx="160" ry="10" fill="url(#mt4-stin-r)"/>
    <rect x="26" y="${y + 12}" width="10" height="80" rx="2" fill="#6E5236"/>
    <rect x="268" y="${y + 12}" width="10" height="80" rx="2" fill="#6E5236"/>
    <rect x="30" y="${y + 56}" width="244" height="6" rx="2" fill="#7E5E3E"/>
    <path d="M10 ${y - 14} H294 L302 ${y} H2 Z" fill="url(#mt4-lavice-vrch)"/>
    <rect x="2" y="${y}" width="300" height="13" rx="2" fill="url(#mt4-lavice)"/>
    <path d="M3 ${y + 0.8} H301" stroke="#F0D0A0" stroke-width="1" opacity="0.6"/>
    <g fill="none" stroke="#FFFFFF" stroke-width="1.2" stroke-dasharray="4 4" opacity="0.5">
      ${PRKNO.x.map((x) => `<ellipse cx="${x}" cy="${y - 6}" rx="36" ry="5"/>`).join("")}
    </g>
    <g class="mt4-cisla" font-size="10" font-family="Fraunces, Georgia, serif" font-weight="600" fill="#FFF3DE" opacity="0.75" text-anchor="middle">
      ${PRKNO.x.map((x, i) => `<text x="${x}" y="${y + 10}">${i + 1}</text>`).join("")}
    </g>
    <g class="mt4-sloty">${PRKNO.x.map((_, i) => `<g class="mt4-slot" data-slot="${i}"></g>`).join("")}</g>
  </g>`;
};

/* ——— Kruh ——— */

const kruhZadni = () => `
  <g class="mt4-kruh">
    <ellipse cx="${CX}" cy="${ZAKLAD + 16}" rx="252" ry="62" fill="url(#mt4-vana-zad)"/>
    <ellipse cx="${CX}" cy="${ZAKLAD + 12}" rx="238" ry="53" fill="#3B4044"/>
    <ellipse class="mt4-slikr" cx="${CX}" cy="${ZAKLAD + 20}" rx="198" ry="36" fill="#7E604C" opacity="0.34"/>
    <path d="M${CX - 170} ${ZAKLAD + 4} A170 31 0 0 0 ${CX + 170} ${ZAKLAD + 4} L${CX + 170} ${ZAKLAD + 13} A170 31 0 0 1 ${CX - 170} ${ZAKLAD + 13} Z" fill="url(#mt4-hlava-bok)"/>
    <ellipse cx="${CX}" cy="${ZAKLAD + 4}" rx="170" ry="31" fill="url(#mt4-hlava)"/>
    <ellipse cx="${CX}" cy="${ZAKLAD + 4}" rx="162" ry="28.6" fill="none" stroke="#EEF1F3" stroke-width="1.2" opacity="0.55"/>
    <ellipse class="mt4-krouzek" cx="${CX}" cy="${ZAKLAD + 4}" rx="124" ry="22" fill="none" stroke="#5E656B" stroke-width="1.6" stroke-dasharray="7 11"/>
    <ellipse cx="${CX}" cy="${ZAKLAD + 4}" rx="66" ry="11.8" fill="none" stroke="#6B7278" stroke-width="1.2" opacity="0.55"/>
    <ellipse cx="${CX - 52}" cy="${ZAKLAD - 6}" rx="62" ry="6" fill="#FFFFFF" opacity="0.16"/>
  </g>`;

const kruhPredni = () => `
  <g class="mt4-vana-pred">
    <path d="M288 ${ZAKLAD + 20} C311 ${ZAKLAD + 104} 769 ${ZAKLAD + 104} 792 ${ZAKLAD + 20} L792 ${ZAKLAD + 46} C769 ${ZAKLAD + 132} 311 ${ZAKLAD + 132} 288 ${ZAKLAD + 46} Z" fill="url(#mt4-vana)"/>
    <path d="M288 ${ZAKLAD + 20} C311 ${ZAKLAD + 104} 769 ${ZAKLAD + 104} 792 ${ZAKLAD + 20}" stroke="#A9B1B7" stroke-width="3" fill="none"/>
    <path d="M300 ${ZAKLAD + 34} C330 ${ZAKLAD + 104} 750 ${ZAKLAD + 104} 780 ${ZAKLAD + 34}" stroke="#FFFFFF" stroke-width="1.4" fill="none" opacity="0.12"/>
    <g transform="rotate(-10 318 ${ZAKLAD + 20})">
      <rect x="300" y="${ZAKLAD + 11}" width="36" height="17" rx="7.5" fill="#D9AE45"/>
      <rect x="300" y="${ZAKLAD + 11}" width="36" height="9" rx="4.5" fill="#F0CD62"/>
      <g fill="#B98F2E" opacity="0.55"><circle cx="309" cy="${ZAKLAD + 23}" r="1.5"/><circle cx="319" cy="${ZAKLAD + 25}" r="1.2"/><circle cx="328" cy="${ZAKLAD + 22}" r="1.4"/></g>
    </g>
  </g>`;

/* ——— Hlína ——— */

/** Hlína na kruhu: tvar, proužky po točení (pohybují se, když se točí), rýhy, lesk, okraj */
export const hlina = (p: Profil, otevrena: boolean) => {
  const o = okrajHliny(p);
  const st = stinHliny(p);
  return `
  <g class="mt4-hlina-g">
    <ellipse class="mt4-hlina-stin" cx="${f1(st.cx)}" cy="${f1(st.cy)}" rx="${f1(st.rx)}" ry="${f1(st.ry)}" fill="url(#mt4-stin-r)"/>
    <path class="mt4-tvar mt4-hlina" d="${obrysHliny(p)}" fill="url(#mt4-hlina)" stroke="#3B2A1B" stroke-opacity="0.3" stroke-width="1.2"/>
    <g clip-path="url(#mt4-orez)">
      <rect class="mt4-prouzky" x="-44" y="0" width="${SIRKA + 88}" height="${VYSKA}" fill="url(#mt4-toceni)" opacity="0.45"/>
      <path class="mt4-ryhy" d="${otevrena ? ryhyHliny(p) : ""}" stroke="#3E2C22" stroke-width="1.4" fill="none" opacity="0.24"/>
      <path class="mt4-lesk" d="${leskHliny(p)}" stroke="#FFF2E2" stroke-width="5" stroke-linecap="round" fill="none" opacity="0.2"/>
    </g>
    <path class="mt4-patka" d="${patkaHliny(p)}" stroke="#4A3426" stroke-width="2" fill="none" opacity="0.4"/>
    <ellipse class="mt4-okraj" cx="${f1(o.cx)}" cy="${f1(o.cy)}" rx="${otevrena ? f1(o.rx) : 0}" ry="${otevrena ? f1(o.ry) : 0}" fill="url(#mt4-vnitrek)" stroke="#D2AE90" stroke-width="2.6"/>
  </g>`;
};

/* ——— Předloha jako zlatá čára ——— */

/** Pravá strana předlohy jako jedna cesta (přerušovaná čára musí běžet vcelku) */
const duchPravy = (useky: string[]) => useky.map((d, i) => (i === 0 ? d : d.replace(/^M[^C]*/, ""))).join("");

/**
 * Zlatá přerušovaná čára předlohy přes kruh a značka „odsud nahoru“ u patky.
 * Úseky vpravo leží nad ní neviditelné a rozsvítí se, kde nakreslená čára sedí.
 */
export const duch = (p: Profil) => {
  const levy = duchLevy(p);
  const useky = duchUseky(p);
  const pravy = duchPravy(useky);
  const top = yPasu(p, p.r.length - 1);
  const rt = p.r[p.r.length - 1] * S;
  const st = startBod(p);
  return `
  <g class="mt4-duch" clip-path="url(#mt4-duch-orez)">
    <path class="mt4-duch-svetlo" d="${levy} ${pravy}" stroke="#FFF8E6" stroke-width="6" stroke-linecap="round" fill="none" opacity="0.38"/>
    <ellipse class="mt4-duch-okraj" cx="${CX}" cy="${f1(top)}" rx="${f1(rt)}" ry="${f1(rt * 0.24)}" fill="none" stroke="#D6A23A" stroke-width="1.8" stroke-dasharray="6 6" opacity="0.7"/>
    <path class="mt4-duch-levy" d="${levy}" stroke="#D6A23A" stroke-width="2" stroke-dasharray="7 6" fill="none" opacity="0.7"/>
    <path class="mt4-duch-pravy" d="${pravy}" stroke="#D6A23A" stroke-width="2.4" stroke-dasharray="7 6" stroke-linecap="round" fill="none"/>
    <g class="mt4-duch-useky" fill="none" stroke="#FFD25E" stroke-width="3.6" stroke-linecap="round">${useky.map((d) => `<path class="mt4-duch-u" d="${d}" opacity="0"/>`).join("")}</g>
  </g>
  <g class="mt4-start" transform="translate(${f1(st.x)} ${f1(st.y)})">
    <circle class="mt4-start-vlna" r="11" fill="none" stroke="#D6A23A" stroke-width="2"/>
    <circle r="5.5" fill="#F3D27A" stroke="#8A6420" stroke-width="1.4"/>
    <path d="M10 -13 C16 -20 20 -24 26 -27" fill="none" stroke="#B9851F" stroke-width="1.4" stroke-linecap="round"/>
    <g transform="translate(24 -50)">
      <rect width="124" height="30" rx="15" fill="#FBF6EA" fill-opacity="0.94" stroke="#D6A23A" stroke-width="1.4"/>
      <text x="13" y="21" font-size="19" font-family="Caveat, cursive" fill="#7A5618" class="mt4-ruka">odsud nahoru</text>
      <path d="M109 22 V9 M104 14 L109 8.5 L114 14" fill="none" stroke="#7A5618" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  </g>`;
};

/** Měřítko vpravo od osy, jako na kruhu v Dílně: čára po 5 cm na výšku, po 2,5 cm do šířky */
const mrizka = () => {
  const ys = [1, 2, 3, 4].map((i) => ZAKLAD - i * 50 * S);
  const xs = [1, 2, 3, 4, 5].map((i) => CX + i * 25 * S);
  return `
  <g class="mt4-mrizka" stroke="#8A7C70" stroke-width="0.8" opacity="0.24">
    ${ys.map((y) => `<path d="M${CX} ${f1(y)} H${SIRKA - 6}"/>`).join("")}
    ${xs.map((x) => `<path d="M${f1(x)} 40 V${ZAKLAD - 40}"/>`).join("")}
  </g>
  <g fill="#8A7C70" font-size="12" font-family="Newsreader, Georgia, serif" opacity="0.62" text-anchor="end">
    ${ys.map((y, i) => `<text x="${SIRKA - 10}" y="${f1(y - 6)}">${(i + 1) * 5} cm</text>`).join("")}
  </g>
  <path class="mt4-osa" d="M${CX} 30 V${ZAKLAD - 4}" stroke="#C4432B" stroke-width="1" stroke-dasharray="3 6" opacity="0.42"/>`;
};

/* ——— Čára, žebro, drát ——— */

const nastroje = () => `
  <path class="mt4-cara" d="" fill="none" stroke="#C4432B" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="7 5"/>
  <path class="mt4-cara mt4-cara-zrcadlo" d="" fill="none" stroke="#C4432B" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="3 6" opacity="0.5"/>
  <g class="mt4-kapky"></g>
  <g class="mt4-zebro" opacity="0">
    <g transform="scale(1.45)">
      <path d="M0 -26 C10 -24 14 -8 10 6 C8 16 4 24 -2 28 L-14 24 C-8 12 -6 0 -10 -20 Z" fill="url(#mt4-zebro-g)" stroke="#8A6038" stroke-width="1"/>
      <path d="M-3 -18 C1 -8 1 6 -5 18" stroke="#A9773F" stroke-width="0.7" fill="none" opacity="0.6"/>
      <path d="M3 -16 C6 -6 6 6 1 16" stroke="#A9773F" stroke-width="0.6" fill="none" opacity="0.45"/>
      <circle cx="-4" cy="-8" r="3.4" fill="#7A5230" opacity="0.7"/>
      <path d="M1 -24 C8 -21 11 -10 9 0" stroke="#FFF2D8" stroke-width="1.2" fill="none" opacity="0.6"/>
    </g>
  </g>
  <g class="mt4-drat" opacity="0">
    <path d="M0 0 H380" stroke="#C3CAD0" stroke-width="1.8"/>
    <path d="M0 -0.7 H380" stroke="#FFFFFF" stroke-width="0.6" opacity="0.7"/>
    <rect x="-18" y="-7" width="16" height="14" rx="5" fill="#9C7246"/>
    <rect x="382" y="-7" width="16" height="14" rx="5" fill="#9C7246"/>
  </g>`;

/**
 * Celé SVG scény ve výchozím stavu: první kolo, hrouda na kruhu.
 * Jiné kolo a jiný tvar hlíny jsou jen pro náhledy kresby.
 */
export const kresba = (kolo = 0, tvar?: Profil) => {
  const p = PREDLOHY[kolo];
  return `<svg class="mu-kresba mt4-kresba" viewBox="0 0 ${SIRKA} ${VYSKA}" aria-hidden="true" focusable="false">${defs()}${zed()}${svitek()}${mrizka()}${police(kolo)}${lavice()}${kruhZadni()}${hlina(tvar ?? HROUDA, !!tvar)}${kruhPredni()}<g class="mt4-duch-obal">${duch(p)}</g>${nastroje()}</svg>`;
};

/** HTML nad kresbou: plocha na kreslení a karta se shodou */
export const prekryvy = () =>
  `<div class="mt4-dotyk" tabindex="0" role="application" aria-roledescription="hrnčířský kruh" aria-label="Kruh s hroudou. Myší nebo prstem táhni od patky nahoru po zlaté čáře předlohy, vpravo od osy, a kruh vytočí, co nakreslíš. Kreslit se dá znovu, kolikrát je potřeba. Enter odřízne kus drátem." aria-describedby="mt4-rada"></div>` +
  `<div class="mt4-shoda" hidden><p class="mt4-shoda-stitek">Shoda</p><p class="mt4-shoda-cislo"><span class="mt4-shoda-hodnota">0</span><span class="mt4-shoda-pct">&nbsp;%</span></p><p class="mt4-shoda-kus">${PREDLOHY[0].nazev}</p><div class="mt4-jiskry" aria-hidden="true"></div></div>`;

/** Řádek pod scénou: rada a drát */
export const ovladani = () =>
  `<div class="mu-ovladani mt4-ovladani">` +
  `<p class="mt4-rada" id="mt4-rada" aria-live="polite">Táhni od patky nahoru po zlaté čáře. Kruh vytočí, co nakreslíš.</p>` +
  `<button type="button" class="tlacitko tlacitko-maly mt4-rez" disabled>Odříznout drátem<span class="mt4-klavesa" aria-hidden="true">Enter</span></button>` +
  `</div>`;

/** Poloha Vázičky na polici v procentech okna (box 180 × 180 její kresby, nohy na desce police) */
export const VAZICKA = { left: 23.5, top: 20.5, width: 20 };

/** Celá scéna jako text (pro náhledy a testy) — Tvar.astro do prázdného místa pro Vázičku vloží její kresbu */
export const scena = () =>
  `<div class="mu-okno mt4-okno">${kresba()}<div class="mt4-kami" style="left:${VAZICKA.left}%;top:${VAZICKA.top}%;width:${VAZICKA.width}%" aria-hidden="true"></div>${prekryvy()}</div>${ovladani()}`;

