/**
 * Domek do krajiny — malá podoba zeleného domu z Luční, stejně velká jako
 * DilnaKresba z Party 2 (480 × 320), aby šla postavit do kopců místo
 * vesnického stavení s kůlnou. Štít do ulice se zábradlím balkonů, bok se
 * dvěma okny, střecha z tašek, pod balkony okna dílny na konci rampy,
 * posuvná brána, zídka s plotem, lampa s rozhlasem a za domem borovice.
 * Pec je elektrická a stojí uvnitř — komín ani kůlna tu proto nejsou.
 *
 * Okna berou barvu z --domek-okno (večer se rozsvítí), dílna z --domek-dilna.
 */
import { B, chomac } from "./zaklad";

export function domek() {
  const okno = "var(--domek-okno, #A9C2D2)";
  const dilna = "var(--domek-dilna, #2E3A46)";
  const tasky = Array.from({ length: 7 }, (_, i) => {
    const t = (i + 1) / 8;
    return `M${198 + 74 * t} ${110 + 72 * t} L${326 + 76 * t} ${100 + 74 * t}`;
  }).join(" ");
  return `<g>
    <ellipse cx="250" cy="304" rx="236" ry="12" fill="#2E3B25" opacity="0.2"/>
    <!-- borovice za domem -->
    <path d="M418 300 L420 130" stroke="#4B3A2E" stroke-width="7"/>
    <path d="${chomac(420, 150, 44, 30, 12, 7101, 0.6, 0.7)}" fill="${B.borovice}"/>
    <path d="${chomac(410, 200, 56, 34, 12, 7102, 0.6, 0.7)}" fill="${B.borovice}"/>
    <path d="${chomac(426, 250, 50, 30, 12, 7103, 0.6, 0.7)}" fill="${B.boroviceSvetla}"/>
    <!-- střecha: boční rovina s taškami -->
    <path d="M196 106 L270 184 L404 176 L328 98 Z" fill="${B.tasky}"/>
    <path d="${tasky}" stroke="${B.taskyTma}" stroke-width="1.6" opacity="0.6"/>
    <path d="M196 104 L328 96" stroke="#7A3424" stroke-width="5" stroke-linecap="round"/>
    <path d="M270 186 L404 178" stroke="${B.drevo}" stroke-width="4"/>
    <!-- bok domu ve stínu se dvěma okny -->
    <path d="M270 300 L270 186 L400 178 L400 296 Z" fill="${B.zedStin}"/>
    <rect x="300" y="208" width="26" height="30" fill="${okno}" stroke="${B.ram}" stroke-width="3"/>
    <rect x="350" y="206" width="26" height="30" fill="${okno}" stroke="${B.ram}" stroke-width="3"/>
    <rect x="300" y="252" width="26" height="28" fill="${okno}" stroke="${B.ram}" stroke-width="3"/>
    <!-- štít do ulice -->
    <path d="M118 300 L118 182 L196 110 L270 182 L270 300 Z" fill="${B.zed}"/>
    <path d="M110 190 L196 104 L278 190" stroke="${B.drevo}" stroke-width="9" stroke-linejoin="round" fill="none"/>
    <path d="M108 188 L196 100 L280 188" stroke="${B.tasky}" stroke-width="4" stroke-linejoin="round" fill="none"/>
    <rect x="190" y="116" width="11" height="184" fill="${B.pilastr}"/>
    <rect x="140" y="186" width="30" height="28" fill="${okno}" stroke="${B.ram}" stroke-width="3"/>
    <rect x="140" y="234" width="30" height="26" fill="${okno}" stroke="${B.ram}" stroke-width="3"/>
    <!-- balkony nad sebou: podkroví, přízemí a pod nimi dílna -->
    <rect x="212" y="170" width="38" height="34" fill="${okno}" stroke="${B.ram}" stroke-width="3"/>
    <rect x="201" y="204" width="69" height="5" fill="${B.deska}"/>
    <path d="M203 186 H268 M203 202 H268 ${Array.from({ length: 12 }, (_, i) => `M${206 + i * 5.4} 186 V202`).join(" ")}" stroke="${B.mata}" stroke-width="1.6"/>
    <rect x="201" y="209" width="69" height="44" fill="${B.lodzie}"/>
    <rect x="222" y="216" width="18" height="20" fill="${okno}" stroke="${B.ram}" stroke-width="2.5"/>
    <path d="M203 236 H268 M203 250 H268 ${Array.from({ length: 12 }, (_, i) => `M${206 + i * 5.4} 236 V250`).join(" ")}" stroke="${B.mata}" stroke-width="1.6"/>
    <rect x="201" y="252" width="69" height="6" fill="${B.deskaSeda}"/>
    <rect x="262" y="204" width="8" height="96" fill="${B.zed}"/>
    <g class="domek-dilna">
      <rect x="203" y="258" width="58" height="34" fill="${dilna}"/>
      <path d="M203 258 H261 V292 H203 Z M216 258 V292 M238 258 V292 M216 268 H261" stroke="${B.ram}" stroke-width="2.4" fill="none"/>
    </g>
    <!-- zídka s plotem, posuvná brána, cedulka -->
    <rect x="100" y="286" width="100" height="16" fill="${B.zidka}"/>
    <rect x="100" y="276" width="96" height="10" fill="${B.plot}"/>
    <path d="M100 280 H196 M100 283 H196" stroke="${B.plotSpara}" stroke-width="0.8"/>
    <path d="M200 276 H264 M200 288 H264 M200 301 H264 ${Array.from({ length: 12 }, (_, i) => `M${203 + i * 5.2} 276 V301`).join(" ")}" stroke="${B.pozink}" stroke-width="1.8"/>
    <rect x="264" y="282" width="10" height="20" fill="${B.zidka}"/>
    <rect x="240" y="279" width="16" height="9" rx="1" fill="#F2E8D2" stroke="#8A6A48" stroke-width="0.8"/>
    <!-- lampa s rozhlasem -->
    <path d="M96 302 V196" stroke="${B.pozinkTma}" stroke-width="3"/>
    <path d="M96 198 C96 190 92 188 84 188" stroke="${B.pozinkTma}" stroke-width="2" fill="none"/>
    <path class="domek-lampa" d="M76 186 H90 L88 190 H78 Z" fill="#E9EDEF"/>
    <path d="M90 208 L100 204 L101 214 L90 212 Z" fill="#D9D3C2"/>
    <!-- mladá sakura na trávníku vlevo -->
    <path d="M58 304 L60 262" stroke="#7A4E3C" stroke-width="3"/>
    <path d="M61 258 C48 256 42 264 40 276 M61 258 C74 256 80 264 82 276 M61 258 C56 262 52 270 52 280 M61 258 C66 262 70 270 70 280" stroke="#6A4434" stroke-width="1.4" fill="none"/>
    <g class="koruna"><path class="sak-1" d="${chomac(61, 266, 24, 14, 11, 7104, 1, 0.6)}" opacity="0.9"/><path class="sak-2" d="${chomac(56, 262, 14, 8, 9, 7105, 1, 0.6)}"/></g>
  </g>`;
}
