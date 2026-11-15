/**
 * Miska na plotně z pece — to, o co se na úvodu přetahují Pecinka
 * a Bublinka (components/domek2/Parta.astro). Čajová miska chawan na
 * šamotové plotně se dvěma sloupky, jak stojí v peci.
 *
 * Kresba má všechny stavy naráz a přepíná je CSS podle data-atributů
 * obalu (styles/uvod-ochutnavky.css, obsluha scripts/domek2/souboj.ts):
 *
 *   .{p}-syra       syrová hlína, šedohnědá a matná
 *   .{p}-vypalena   po výpalu: krémová glazura shino s rezavým nádechem
 *                   u okraje (jako Futatsu); průhlednost podle data-pal
 *   .{p}-zar        teplá záře, když Pecinka fouhne
 *   .{p}-chlad      studený záblesk, když fouhne Bublinka
 *   .{p}-bublina    bublina vzduchu, vystoupá stěnou a praskne
 *   .{p}-praskl     tmavá prasklina (data-praskla)
 *   .{p}-zlato      táž prasklina zalitá zlatem — kintsugi (data-zlato)
 *   .{p}-jiskry     cinknutí, když je miska hotová
 *
 * Generátor vrací vnitřek <svg> jako text; `p` je předpona id, ať se
 * přechody nepotkají s jinou kresbou na stránce.
 */
export const MISKA = { w: 240, h: 176 };

export function miska(p = "uom") {
  /* Tělo misky: rovný okraj nahoře, oblé boky, patka dole */
  const telo = "M70 54 C70 96 92 120 106 121 L134 121 C148 120 170 96 170 54 Z";
  const praskl = "M141 51 L136 66 L142 77 L135 92 L139 106";
  /* Hrubé zrno šamotu na plotně — pevné, ať je kresba při každém buildu stejná */
  const zrno = [
    [44, 133], [58, 138], [77, 131], [96, 140], [118, 134], [139, 139], [160, 132], [181, 138], [199, 133], [66, 144], [151, 145], [108, 146], [187, 146],
  ]
    .map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 3 === 0 ? 1.3 : 0.8}"/>`)
    .join("");

  return (
    `<defs>` +
    `<linearGradient id="${p}-syra" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8E8170"/><stop offset="0.38" stop-color="#B3A691"/><stop offset="0.7" stop-color="#A39582"/><stop offset="1" stop-color="#7C705F"/></linearGradient>` +
    `<linearGradient id="${p}-shino" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#D9CDB8"/><stop offset="0.4" stop-color="#F6EFE2"/><stop offset="0.72" stop-color="#EDE3D1"/><stop offset="1" stop-color="#C9BBA3"/></linearGradient>` +
    `<linearGradient id="${p}-ruz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C8642F" stop-opacity="0.85"/><stop offset="0.35" stop-color="#D98B52" stop-opacity="0.35"/><stop offset="0.6" stop-color="#D98B52" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="${p}-plotna" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D8CCB6"/><stop offset="1" stop-color="#B9AB92"/></linearGradient>` +
    `<linearGradient id="${p}-zlato" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF0B0"/><stop offset="0.5" stop-color="#E9B949"/><stop offset="1" stop-color="#B9852A"/></linearGradient>` +
    `<radialGradient id="${p}-zar"><stop offset="0" stop-color="#FFB45A" stop-opacity="0.95"/><stop offset="0.45" stop-color="#FF7A2E" stop-opacity="0.45"/><stop offset="1" stop-color="#FF5A1E" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="${p}-chlad"><stop offset="0" stop-color="#C9FFF6" stop-opacity="0.9"/><stop offset="0.45" stop-color="#5FD4E0" stop-opacity="0.4"/><stop offset="1" stop-color="#2A7FB8" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="${p}-bublina" cx="0.35" cy="0.3"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.95"/><stop offset="0.5" stop-color="#DDF7FF" stop-opacity="0.35"/><stop offset="1" stop-color="#9FD8F0" stop-opacity="0.75"/></radialGradient>` +
    `<clipPath id="${p}-telo"><path d="${telo}"/></clipPath>` +
    `<filter id="${p}-svit" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2" result="r"/><feMerge><feMergeNode in="r"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` +
    `</defs>` +
    /* záře za miskou */
    `<ellipse class="${p}-zar" cx="120" cy="84" rx="112" ry="82" fill="url(#${p}-zar)"/>` +
    `<ellipse class="${p}-chlad" cx="120" cy="84" rx="104" ry="78" fill="url(#${p}-chlad)"/>` +
    /* plotna na dvou sloupcích */
    `<g class="${p}-plotna">` +
    `<rect x="52" y="146" width="16" height="26" rx="2" fill="#9D8F78"/><rect x="172" y="146" width="16" height="26" rx="2" fill="#9D8F78"/>` +
    `<rect x="52" y="146" width="5" height="26" fill="#B5A78E"/><rect x="172" y="146" width="5" height="26" fill="#B5A78E"/>` +
    `<path d="M24 128 Q120 122 216 128 L220 143 Q120 150 20 143 Z" fill="url(#${p}-plotna)" stroke="#5E5040" stroke-width="1.2" stroke-linejoin="round"/>` +
    `<path d="M20 143 Q120 150 220 143 L219 149 Q120 156 21 149 Z" fill="#A2937A"/>` +
    `<g fill="#8F806A" opacity="0.55">${zrno}</g>` +
    `<ellipse cx="120" cy="129" rx="40" ry="5" fill="#5B4E40" opacity="0.35"/>` +
    `</g>` +
    /* miska: patka, syrové tělo, vypálené tělo přes něj */
    `<path d="M104 119 L106 129 Q120 132 134 129 L136 119 Z" fill="#9A8B76"/>` +
    `<g class="${p}-syra"><path d="${telo}" fill="url(#${p}-syra)"/>` +
    `<path d="M80 70 C84 92 96 110 108 116" fill="none" stroke="#C8BCA8" stroke-width="2" stroke-linecap="round" opacity="0.5"/>` +
    `<path d="M74 66 Q120 74 166 66 M78 84 Q120 92 162 84 M88 102 Q120 108 152 102" fill="none" stroke="#7E7262" stroke-width="0.9" opacity="0.45"/></g>` +
    `<g class="${p}-vypalena"><path d="${telo}" fill="url(#${p}-shino)"/><path d="${telo}" fill="url(#${p}-ruz)"/>` +
    `<path d="M86 60 C88 72 92 80 95 92 C96 98 92 100 91 94 C89 84 84 72 84 60 Z M150 60 C151 70 148 82 146 88 C145 93 141 92 142 86 C144 78 146 68 146 60 Z" fill="#E6D6BC" opacity="0.8"/>` +
    `<path d="M82 66 C86 90 98 108 110 114" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity="0.75"/>` +
    `<g fill="#B4572A" opacity="0.6"><circle cx="96" cy="58" r="1.1"/><circle cx="131" cy="61" r="0.9"/><circle cx="152" cy="57" r="1.2"/><circle cx="112" cy="63" r="0.7"/></g></g>` +
    /* bublina vzduchu ve stěně */
    `<g clip-path="url(#${p}-telo)"><circle class="${p}-bublina" cx="138" cy="104" r="7" fill="url(#${p}-bublina)" stroke="#E8FBFF" stroke-width="0.8"/></g>` +
    /* prasklina: tmavá, pak zlatá */
    `<path class="${p}-praskl" d="${praskl}" fill="none" stroke="#3A2A20" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>` +
    `<path class="${p}-zlato" d="${praskl}" fill="none" stroke="url(#${p}-zlato)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" filter="url(#${p}-svit)"/>` +
    /* obrys jako u kreseb kami: tmavá linka kolem těla a patky */
    `<path d="${telo}" fill="none" stroke="#4A3A2E" stroke-width="1.4" stroke-linejoin="round"/>` +
    `<path d="M104 120 L106 129 Q120 132 134 129 L136 120" fill="none" stroke="#4A3A2E" stroke-width="1.2" stroke-linejoin="round"/>` +
    /* okraj a vnitřek */
    `<ellipse cx="120" cy="54" rx="50" ry="10" fill="#6B5E4F" stroke="#4A3A2E" stroke-width="1.4"/>` +
    `<ellipse class="${p}-vnitrek-syry" cx="120" cy="55" rx="46" ry="7.6" fill="#857766"/>` +
    `<ellipse class="${p}-vnitrek" cx="120" cy="55" rx="46" ry="7.6" fill="#E4D8C2"/>` +
    `<ellipse class="${p}-jezirko" cx="122" cy="57" rx="16" ry="2.4" fill="#C9D9C9" opacity="0.8"/>` +
    `<path class="${p}-okraj" d="M70 54 A50 10 0 0 0 170 54" fill="none" stroke="#C8642F" stroke-width="1.6" opacity="0"/>` +
    /* cinknutí */
    `<g class="${p}-jiskry" fill="#FFF3C4">` +
    `<path d="M58 40 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2 z"/><path d="M182 30 l1.6 5 5 1.6 -5 1.6 -1.6 5 -1.6 -5 -5 -1.6 5 -1.6 z"/><path d="M196 92 l1.2 3.6 3.6 1.2 -3.6 1.2 -1.2 3.6 -1.2 -3.6 -3.6 -1.2 3.6 -1.2 z"/>` +
    `</g>`
  );
}
