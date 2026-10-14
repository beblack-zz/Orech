/**
 * Sítě pro vystřihovánku Kami z papíru — kvádr, miska a stojánek.
 * Všechno v milimetrech, y dolů jako v SVG. Kresby stěn dodává volající
 * jako funkce (š, v) → SVG v místních souřadnicích, nastojato (nahoře je
 * nahoře, až bude model složený). Síť je sama otočí, kam patří.
 *
 * Čáry: plná = stříhat, čárkovaná = ohnout, šedá chlopeň = lepidlo.
 * Chlopně se lepí zevnitř, takže z hotového modelu nejsou vidět.
 */

export const INKOUST = "#2B2420";
export const CHLOPEN = { barva: "#E6DED0", obrys: "#EEEEEE" };
const STRIH = `stroke="${INKOUST}" stroke-width="0.32" fill="none" stroke-linejoin="round"`;
const OHYB = `stroke="${INKOUST}" stroke-width="0.26" fill="none" stroke-dasharray="1.8 1.2"`;

const f = (n) => Math.round(n * 100) / 100;

/** Úsečka */
const cara = (x1, y1, x2, y2, styl) => `<path d="M${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)}" ${styl}/>`;

/**
 * Chlopeň na hraně z bodu A do bodu B, vyčnívá směrem `ven` ([±1, 0] nebo
 * [0, ±1]). Hloubku hlídá `proti` — rozměr stěny, na kterou se chlopeň
 * zevnitř přilepí.
 */
function chlopen([ax, ay], [bx, by], ven, { hloubka = 6, proti = 99, obrys = false }) {
  const delka = Math.hypot(bx - ax, by - ay);
  const ux = (bx - ax) / delka, uy = (by - ay) / delka;
  const [nx, ny] = ven;
  const h = Math.min(hloubka, proti * 0.8, delka * 0.7);
  const z = Math.min(h * 0.75, delka * 0.3);
  const p = [
    [ax, ay],
    [ax + nx * h + ux * z, ay + ny * h + uy * z],
    [bx + nx * h - ux * z, by + ny * h - uy * z],
    [bx, by],
  ];
  const d = `M${p.map(([x, y]) => `${f(x)} ${f(y)}`).join(" L")}`;
  return {
    plocha: `<path d="${d} Z" fill="${obrys ? CHLOPEN.obrys : CHLOPEN.barva}"/>`,
    strih: `<path d="${d}" ${STRIH}/>`,
    ohyb: cara(ax, ay, bx, by, OHYB),
  };
}

/**
 * Stěna v síti: obdélník (x, y, w, h) a směr, kam míří „nahoru“ hotové
 * stěny: "-y" (nastojato), "+y" (vzhůru nohama), "-x" (doleva), "+x".
 */
function stena(kresba, x, y, w, h, nahoru, id) {
  const nalezato = nahoru === "-x" || nahoru === "+x";
  const sw = nalezato ? h : w;
  const sv = nalezato ? w : h;
  const t = {
    "-y": `translate(${f(x)} ${f(y)})`,
    "+y": `translate(${f(x + w)} ${f(y + h)}) rotate(180)`,
    "-x": `translate(${f(x)} ${f(y + h)}) rotate(-90)`,
    "+x": `translate(${f(x + w)} ${f(y)}) rotate(90)`,
  }[nahoru];
  return `<clipPath id="${id}"><rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}"/></clipPath><g clip-path="url(#${id})"><g transform="${t}">${kresba ? kresba(sw, sv) : ""}</g></g>`;
}

/**
 * Kvádr W × D × H (šířka zepředu, hloubka, výška). Síť je kříž: ve sloupci
 * víko, čelo, dno a záda, po stranách čela boky. Vrací SVG a rozměry sítě.
 * `steny` = { cело, vrch, dno, zada, levy, pravy } — kresby stěn.
 */
export function kvadr({ W, D, H, x0 = 0, y0 = 0, steny = {}, obrys = false, id = "kv", hloubka = 6 }) {
  const ch = (a, b, ven, proti) => chlopen(a, b, ven, { hloubka, proti, obrys });
  const t = Math.min(hloubka, D * 0.8);
  const xL = x0 + t, x1 = xL + D, x2 = x1 + W, x3 = x2 + D;
  const yV = y0, yC = yV + D, yD = yC + H, yZ = yD + D, yK = yZ + H;

  /* chlopně: boky nahoře, dole a na zadní hraně, záda na horní hraně (v síti dole) */
  const chlopne = [
    ch([xL, yC], [x1, yC], [0, -1], W), // levý bok, horní hrana → pod víko
    ch([xL, yD], [x1, yD], [0, 1], W), // levý bok, dolní hrana → nad dno
    ch([xL, yC], [xL, yD], [-1, 0], W), // levý bok, zadní hrana → za záda
    ch([x2, yC], [x3, yC], [0, -1], W),
    ch([x2, yD], [x3, yD], [0, 1], W),
    ch([x3, yC], [x3, yD], [1, 0], W),
    ch([x1, yK], [x2, yK], [0, 1], D), // záda, horní hrana → pod víko
  ];
  const s = (k, x, y, w, h, n) => stena(steny[k], x, y, w, h, n, `${id}-${k}`);
  const plochy =
    s("vrch", x1, yV, W, D, "-y") +
    s("celo", x1, yC, W, H, "-y") +
    s("dno", x1, yD, W, D, "+y") +
    s("zada", x1, yZ, W, H, "+y") +
    s("levy", xL, yC, D, H, "-y") +
    s("pravy", x2, yC, D, H, "-y");

  const ohyby = [
    cara(x1, yC, x2, yC, OHYB), cara(x1, yD, x2, yD, OHYB), cara(x1, yZ, x2, yZ, OHYB),
    cara(x1, yC, x1, yD, OHYB), cara(x2, yC, x2, yD, OHYB),
  ];
  const strihy = [
    cara(x1, yV, x2, yV, STRIH), cara(x1, yV, x1, yC, STRIH), cara(x2, yV, x2, yC, STRIH),
    cara(x1, yD, x1, yK, STRIH), cara(x2, yD, x2, yK, STRIH),
  ];
  return {
    svg: chlopne.map((c) => c.plocha).join("") + plochy + chlopne.map((c) => c.ohyb).join("") + ohyby.join("") + chlopne.map((c) => c.strih).join("") + strihy.join(""),
    sirka: x3 + t - x0,
    vyska: yK + Math.min(hloubka, D * 0.8) - y0,
  };
}

/**
 * Miska bez víka: dno W × D a čtyři stěny výšky H kolem. Rohy drží chlopně
 * na přední a zadní stěně, na horních hranách stěn jsou chlopně dovnitř —
 * jimi se miska přilepí zespodu k jinému dílu (podstavec pod Kachlíkem).
 * `steny` = { celo, zada, levy, pravy, dno }.
 */
export function miska({ W, D, H, x0 = 0, y0 = 0, steny = {}, obrys = false, id = "ms", hloubka = 5 }) {
  const ch = (a, b, ven, proti) => chlopen(a, b, ven, { hloubka, proti, obrys });
  const t = hloubka;
  const xL = x0 + t, x1 = xL + H, x2 = x1 + W, x3 = x2 + H;
  const yZ = y0 + t, y1 = yZ + H, y2 = y1 + D, y3 = y2 + H;
  const chlopne = [
    /* rohové: na zádech a čele, vyčnívají do stran */
    ch([x1, yZ], [x1, y1], [-1, 0], D), ch([x2, yZ], [x2, y1], [1, 0], D),
    ch([x1, y2], [x1, y3], [-1, 0], D), ch([x2, y2], [x2, y3], [1, 0], D),
    /* horní hrany stěn — dovnitř pod díl, na kterém miska drží */
    ch([x1, yZ], [x2, yZ], [0, -1], W), ch([x1, y3], [x2, y3], [0, 1], W),
    ch([xL, y1], [xL, y2], [-1, 0], D), ch([x3, y1], [x3, y2], [1, 0], D),
  ];
  const s = (k, x, y, w, h, n) => stena(steny[k], x, y, w, h, n, `${id}-${k}`);
  const plochy =
    s("dno", x1, y1, W, D, "-y") +
    s("zada", x1, yZ, W, H, "-y") +
    s("celo", x1, y2, W, H, "+y") +
    s("levy", xL, y1, H, D, "-x") +
    s("pravy", x2, y1, H, D, "+x");
  const ohyby = [cara(x1, y1, x2, y1, OHYB), cara(x1, y2, x2, y2, OHYB), cara(x1, y1, x1, y2, OHYB), cara(x2, y1, x2, y2, OHYB)];
  const strihy = [
    cara(xL, y1, x1, y1, STRIH), cara(xL, y2, x1, y2, STRIH),
    cara(x2, y1, x3, y1, STRIH), cara(x2, y2, x3, y2, STRIH),
  ];
  return {
    svg: chlopne.map((c) => c.plocha).join("") + plochy + chlopne.map((c) => c.ohyb).join("") + ohyby.join("") + chlopne.map((c) => c.strih).join("") + strihy.join(""),
    sirka: x3 + t - x0,
    vyska: y3 + t - y0,
  };
}

/**
 * Stojánek (stříška): líc postavičky nastojato, pod ní podstava, pod ní
 * rub vzhůru nohama. Obě poloviny se zvednou z podstavy a nahoře se
 * slepí chlopní, která vyrůstá z temene rubu.
 *
 * `obrys` — tvary, ze kterých se skládá silueta (SVG v souřadnicích
 * kresby), `lic`/`rub` — kresby, `k` — mm na jednotku kresby, `zem` —
 * y spodku nohou v kresbě, `stred` — x osy, `temeno` — y temene,
 * `noha` — šířka podstavy v kresbě, `okraj` — bílý lem kolem siluety v mm.
 */
export function stojanek({ obrysy, obrysyRub, lic, rub, k, zem, stred, temeno, noha, x0 = 0, y0 = 0, hloubka = 14, okraj = 1.8, obrys = false, id = "st", zaTemenem = 10, sirkaChlopne = 9 }) {
  const lem = okraj / k;
  /* silueta: tvary obtažené tlustou čarou — tmavá o kousek širší dá řeznou linku po obvodu sjednocení */
  const silueta = (barva, sirka, tvary) => `<g fill="${barva}" stroke="${barva}" stroke-width="${f(sirka)}" stroke-linejoin="round" stroke-linecap="round">${tvary}</g>`;
  /* rub je zezadu, takže jeho silueta je zrcadlem líce (podle osy `stred`) */
  const zrcadlo = obrysyRub ?? `<g transform="translate(${2 * stred} 0) scale(-1 1)">${obrysy}</g>`;
  const pul = (kresba, tvary) =>
    silueta(INKOUST, 2 * lem + 0.64 / k, tvary) + silueta("#FFFFFF", 2 * lem, tvary) + kresba;

  const sirkaPodstavy = (noha + 2 * lem) * k;
  const yP = y0 + (zem - temeno + lem) * k; // horní hrana podstavy = zem líce
  const xS = x0 + (stred - noha / 2 - lem) * k; // levý okraj podstavy
  /* líc: kresba posunutá tak, aby zem ležela na yP a osa nad středem podstavy */
  const xOsa = xS + sirkaPodstavy / 2;
  const licT = `translate(${f(xOsa - stred * k)} ${f(yP - zem * k)}) scale(${k})`;
  const rubT = `translate(${f(xOsa + stred * k)} ${f(yP + hloubka + zem * k)}) scale(${-k}) `;

  /* chlopeň na temeni rubu: rub je vzhůru nohama, temeno je dole */
  /* chlopeň vyrůstá kousek pod špičkou temene, kde je silueta zhruba tak široká jako ona */
  const yTemeno = yP + hloubka + (zem - temeno - zaTemenem) * k;
  const tab = chlopen([xOsa - sirkaChlopne / 2, yTemeno], [xOsa + sirkaChlopne / 2, yTemeno], [0, 1], { hloubka: 9, proti: 99, obrys });
  /* podstava je obdélník mezi lícem a rubem; přes lem siluet se jen přelije */
  const podstava = `<rect x="${f(xS)}" y="${f(yP)}" width="${f(sirkaPodstavy)}" height="${f(hloubka)}" fill="#FFFFFF"/>`;
  const podstavaStrih = cara(xS, yP, xS, yP + hloubka, STRIH) + cara(xS + sirkaPodstavy, yP, xS + sirkaPodstavy, yP + hloubka, STRIH);
  const podstavaOhyb = cara(xS, yP, xS + sirkaPodstavy, yP, OHYB) + cara(xS, yP + hloubka, xS + sirkaPodstavy, yP + hloubka, OHYB);
  /* ořez lemu: líc končí na hraně podstavy, rub taky — lem pod nohama by přečníval do podstavy */
  const licClip = `<clipPath id="${id}-l"><rect x="${f(x0 - 50)}" y="${f(y0 - 50)}" width="400" height="${f(yP - y0 + 50)}"/></clipPath>`;
  const rubClip = `<clipPath id="${id}-r"><rect x="${f(x0 - 50)}" y="${f(yP + hloubka)}" width="400" height="400"/></clipPath>`;
  return {
    svg:
      licClip + rubClip +
      `<g clip-path="url(#${id}-l)"><g transform="${licT}">${pul(lic, obrysy)}</g></g>` +
      `<g clip-path="url(#${id}-r)"><g transform="${rubT}">${pul(rub, zrcadlo)}</g></g>` +
      podstava + tab.plocha + podstavaOhyb + tab.ohyb + podstavaStrih + tab.strih,
    sirka: sirkaPodstavy,
    yPodstava: yP,
    yKonec: yTemeno + 9,
  };
}
