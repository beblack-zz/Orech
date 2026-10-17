/**
 * Kudy k nám — nakreslená mapa Ořechu na washi papíře, jak ji visí na
 * vývěsce (高札) v sekci pod otázkami. Podklad je z OpenStreetMap
 * (data/mapa-orech.ts, metry od domu), kreslí se ale po svém: pole
 * šrafovaná, les z korunek, rybník s vlnkami, domy jako střechy z nadhledu,
 * silnice dvojitou čarou a jména ulic perem podél nich.
 *
 * Cesta pěšky od zastávky Ořech, K Ovčínu je červenobílá šňůrka kōhaku —
 * stejná jako provázek z první obrazovky — s uzlíkem u zastávky a hrnkem
 * u brány. Do mapy přichází zleva (MAPA_PRIVOD): je to konec šňůry, která
 * vede přes louku pod první obrazovkou (scripts/kontakt/snura.ts). Kreslí se při buildu; skript (scripts/kontakt/kudy.ts) jen
 * přibližuje mapu a nechá šňůrku jednou doběhnout.
 *
 * Popisky jsou dvojí: `ko-m-z1` pro celý Ořech, `ko-m-z2` pro přiblížené
 * okolí domu (CSS je přepíná podle třídy na rámečku mapy).
 */
import { nahoda, chomac, f } from "./zaklad";
import {
  VYREZ, silnice, budovy, voda, lesy, parky, pole, mista, cestaPesky,
  type MBod, type MSilnice,
} from "../../../data/mapa-orech";

/** Výřez mapy v metrech (o kousek menší než podklad, ať čáry vybíhají za okraj) */
export const MAPA = { x0: -330, y0: -770, w: 660, h: 1010 } as const;
/**
 * Přiblížení na okolí domu: střed pohledu v procentech rámečku (mezi
 * zastávkou a domem) a zvětšení. CSS z nich dopočítá transform-origin.
 */
const STRED_BLIZKO: MBod = [-55, -40];
export const MAPA_BLIZKO = {
  cx: ((STRED_BLIZKO[0] - MAPA.x0) / MAPA.w) * 100,
  cy: ((STRED_BLIZKO[1] - MAPA.y0) / MAPA.h) * 100,
  s: 2,
};

/**
 * Přívod: šňůra z louky (scripts/kontakt/snura.ts) vchází do mapy zleva
 * a tady pokračuje k zastávce, odkud vede cesta pěšky. Body jdou v x
 * jen doprava, ať skript najde, kde přívod protíná levý okraj rámečku
 * (u přiblížené mapy je to jinde než u celé).
 */
export const MAPA_PRIVOD: MBod[] = [[-352, -122], [-310, -121], [-270, -119], [-238, -115], [-214, -108], [-198, -101], [-188, -97]];

const P = (b: MBod) => `${f(b[0])} ${f(b[1])}`;
const cara = (B: MBod[]) => `M${B.map(P).join("L")}`;
const obrys = (B: MBod[]) => `${cara(B)}Z`;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

/** Délka lomené čáry a bod v polovině (kam patří jméno ulice) */
function delka(B: MBod[]) {
  let d = 0;
  for (let i = 1; i < B.length; i++) d += Math.hypot(B[i][0] - B[i - 1][0], B[i][1] - B[i - 1][1]);
  return d;
}

/** Spojí úseky ulice se stejným jménem, které na sebe navazují (pro popisek) */
function spojene(jmeno: string): MBod[] {
  const kusy = silnice.filter((s) => s.jmeno === jmeno).map((s) => s.b.slice());
  if (!kusy.length) return [];
  let cesta = kusy.shift()!;
  let zmena = true;
  while (zmena && kusy.length) {
    zmena = false;
    for (let i = 0; i < kusy.length; i++) {
      const k = kusy[i];
      const stejne = (a: MBod, b: MBod) => Math.abs(a[0] - b[0]) < 2 && Math.abs(a[1] - b[1]) < 2;
      if (stejne(cesta[cesta.length - 1], k[0])) cesta = [...cesta, ...k.slice(1)];
      else if (stejne(cesta[cesta.length - 1], k[k.length - 1])) cesta = [...cesta, ...k.slice(0, -1).reverse()];
      else if (stejne(cesta[0], k[k.length - 1])) cesta = [...k.slice(0, -1), ...cesta];
      else if (stejne(cesta[0], k[0])) cesta = [...k.slice(1).reverse(), ...cesta];
      else continue;
      kusy.splice(i, 1);
      zmena = true;
      break;
    }
  }
  return cesta;
}

/** Úsek čáry mezi vzdálenostmi d0 a d1 od začátku */
function usek(B: MBod[], d0: number, d1: number): MBod[] {
  const out: MBod[] = [];
  let d = 0;
  for (let i = 1; i < B.length; i++) {
    const [ax, ay] = B[i - 1], [bx, by] = B[i];
    const l = Math.hypot(bx - ax, by - ay);
    const bod = (t: number): MBod => [ax + (bx - ax) * t, ay + (by - ay) * t];
    if (d + l >= d0 && d <= d1) {
      if (!out.length) out.push(bod(Math.max(0, (d0 - d) / l)));
      if (d + l <= d1) out.push([bx, by]);
      else {
        out.push(bod((d1 - d) / l));
        break;
      }
    }
    d += l;
  }
  return out;
}

/**
 * Popisek ulice perem podél čáry: vezme se kus kolem `kde` (0–1) dlouhý
 * jako text a nápis se natočí podle jeho směru — ulice v Ořechu jsou
 * skoro rovné, tak stačí jeden úhel. Když čára vede zprava doleva, otočí
 * se, ať se nečte vzhůru nohama. `posun` odsune nápis kolmo od osy ulice.
 */
function popisekUlice(B: MBod[], text: string, velikost: number, kde: number, trida: string, posun = 0) {
  if (B.length < 2) return "";
  const L = delka(B);
  const potreba = text.length * velikost * 0.56 + velikost;
  if (L < potreba * 0.9) return "";
  const stred = Math.min(L - potreba / 2, Math.max(potreba / 2, L * kde));
  let kus = usek(B, stred - potreba / 2, stred + potreba / 2);
  if (kus[kus.length - 1][0] < kus[0][0]) kus = kus.reverse();
  const [ax, ay] = kus[0], [bx, by] = kus[kus.length - 1];
  const uhel = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI;
  const [cx, cy] = usek(kus, delka(kus) / 2, delka(kus) / 2 + 0.01)[0] ?? [(ax + bx) / 2, (ay + by) / 2];
  return `<text class="ko-m-ulice ${trida}" font-size="${f(velikost)}" text-anchor="middle" transform="translate(${f(cx)} ${f(cy)}) rotate(${f(uhel)})" y="${f(velikost * 0.34 + posun)}">${esc(text)}</text>`;
}

/** Tečkovaná šňůrka kōhaku po cestě: tmavý lem, červené jádro a bílé šikmé proužky */
function snurka(B: MBod[], w: number) {
  const d = cara(B);
  return `<g class="ko-m-snurka">
    <path class="ko-m-snurka-stin" d="${d}" stroke-width="${f(w + 5)}" transform="translate(2.4 3.2)"/>
    <path class="ko-m-snurka-lem" d="${d}" stroke-width="${f(w + 2.6)}"/>
    <path class="ko-m-snurka-jadro" d="${d}" stroke-width="${f(w)}"/>
    <path class="ko-m-snurka-zkrut" d="${d}" stroke-width="${f(w * 0.9)}" stroke-dasharray="${f(w * 0.42)} ${f(w * 1.1)}"/>
  </g>`;
}

export function mapa(o: { id: string }) {
  const id = o.id;
  const R = nahoda(3301);
  const { x0, y0, w, h } = MAPA;
  const defs: string[] = [];
  let s = "";

  /* ——— papír: washi s vlákny, okraj trochu do hněda ——— */
  defs.push(`<radialGradient id="${id}-papir" cx="0.45" cy="0.4" r="0.8"><stop offset="0" stop-color="#FBF5E6"/><stop offset="0.7" stop-color="#F3E8CF"/><stop offset="1" stop-color="#E6D3AE"/></radialGradient>`);
  defs.push(`<pattern id="${id}-sraf" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-32)"><path d="M0 4.5 H9" stroke="#B9AC72" stroke-width="1.4" opacity="0.55"/></pattern>`);
  defs.push(`<pattern id="${id}-louka" width="22" height="18" patternUnits="userSpaceOnUse"><path d="M4 12 l2 -5 l2 5 M14 5 l2 -5 l2 5" stroke="#93A35E" stroke-width="1.1" fill="none" opacity="0.6"/></pattern>`);
  defs.push(`<pattern id="${id}-les" width="26" height="24" patternUnits="userSpaceOnUse"><circle cx="7" cy="7" r="6.4" fill="#86A66A"/><circle cx="20" cy="17" r="6.4" fill="#7C9C61"/><circle cx="5.6" cy="5.4" r="2.6" fill="#A5C083"/><circle cx="18.6" cy="15.4" r="2.6" fill="#9CB97C"/></pattern>`);
  defs.push(`<pattern id="${id}-hrbitov" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M8 4 V12 M5 7 H11" stroke="#8C8A78" stroke-width="1.3"/></pattern>`);
  defs.push(`<clipPath id="${id}-orez"><rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="6"/></clipPath>`);

  s += `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="url(#${id}-papir)"/>`;
  let vlakna = "";
  for (let i = 0; i < 150; i++) {
    const x = x0 + R() * w, y = y0 + R() * h, l = 6 + R() * 22, a = R() * Math.PI;
    vlakna += `M${f(x)} ${f(y)}q${f(Math.cos(a) * l * 0.5 + (R() - 0.5) * 4)} ${f(Math.sin(a) * l * 0.5 + (R() - 0.5) * 4)} ${f(Math.cos(a) * l)} ${f(Math.sin(a) * l)}`;
  }
  s += `<path d="${vlakna}" stroke="#D9C59C" stroke-width="0.9" fill="none" opacity="0.55"/>`;

  s += `<g clip-path="url(#${id}-orez)">`;

  /* ——— plochy: pole, louky, sady, parky, hřbitov, les, voda ——— */
  for (const p of pole) {
    if (p.typ === "pitch") s += `<path d="${obrys(p.b)}" fill="#D7E2B0" stroke="#F9F3E4" stroke-width="1.6"/>`;
    else if (p.typ === "farmland") s += `<path d="${obrys(p.b)}" fill="#EDE3BC"/><path d="${obrys(p.b)}" fill="url(#${id}-sraf)"/>`;
    else s += `<path d="${obrys(p.b)}" fill="#E1E6BC"/><path d="${obrys(p.b)}" fill="url(#${id}-louka)"/>`;
  }
  for (const p of parky) {
    if (p.typ === "cemetery") s += `<path d="${obrys(p.b)}" fill="#DCDDC6"/><path d="${obrys(p.b)}" fill="url(#${id}-hrbitov)"/>`;
    else s += `<path d="${obrys(p.b)}" fill="#D3E3A6"/><path d="${obrys(p.b)}" fill="url(#${id}-louka)" opacity="0.8"/>`;
  }
  for (const l of lesy) s += `<path d="${obrys(l)}" fill="#A9C188"/><path d="${obrys(l)}" fill="url(#${id}-les)"/>`;
  for (const v of voda) {
    s += `<path d="${obrys(v.b)}" fill="#9EC3D8" stroke="#6F9DBC" stroke-width="1.6" stroke-linejoin="round"/>`;
    const [cx, cy] = mista.rybnik;
    s += `<path d="M${cx - 9} ${cy - 2} q3 -2.4 6 0 t6 0 M${cx - 4} ${cy + 4} q3 -2.4 6 0 t6 0" stroke="#F4F9FC" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
  }

  /* ——— silnice: nejdřív lemy, pak výplně, ať se křižovatky slijí ——— */
  const sirka: Record<MSilnice["typ"], number> = { hlavni: 12, ulice: 8, pristup: 4.4, polni: 3.6, stezka: 2 };
  const poradi: MSilnice["typ"][] = ["stezka", "polni", "pristup", "ulice", "hlavni"];
  let lemy = "", vyplne = "", carky = "";
  for (const typ of poradi) {
    const d = silnice.filter((x) => x.typ === typ).map((x) => cara(x.b)).join("");
    if (!d) continue;
    if (typ === "stezka") carky += `<path d="${d}" stroke="#A48D6C" stroke-width="1.6" stroke-dasharray="1 5" stroke-linecap="round" fill="none"/>`;
    else if (typ === "polni") carky += `<path d="${d}" stroke="#B49C76" stroke-width="2.2" stroke-dasharray="7 5" stroke-linecap="round" fill="none"/>`;
    else {
      lemy += `<path d="${d}" stroke="${typ === "hlavni" ? "#9C7F5C" : "#B39B7A"}" stroke-width="${sirka[typ] + 3.2}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
      vyplne += `<path d="${d}" stroke="${typ === "hlavni" ? "#F7E2B4" : "#FCF8EE"}" stroke-width="${sirka[typ]}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
    }
  }
  s += `<g class="ko-m-silnice">${carky}${lemy}${vyplne}</g>`;

  /* ——— domy: střechy z nadhledu se stínem; náš dům zvlášť ——— */
  let stiny = "", strechy = "", hrebeny = "";
  for (const [cx, cy, bw, bh, uhel, druh] of budovy) {
    if (Math.hypot(cx - mista.dum[0], cy - mista.dum[1]) < 9) continue;
    const t = `rotate(${uhel} ${cx} ${cy})`;
    const barva = druh === 2 ? "#A7A39A" : ["#C46F4E", "#B8603F", "#CF8158", "#A9583C", "#8E8A86"][Math.floor(R() * 5)];
    stiny += `<rect x="${f(cx - bw / 2 + 2.2)}" y="${f(cy - bh / 2 + 2.8)}" width="${f(bw)}" height="${f(bh)}" transform="${t}"/>`;
    strechy += `<rect x="${f(cx - bw / 2)}" y="${f(cy - bh / 2)}" width="${f(bw)}" height="${f(bh)}" fill="${barva}" transform="${t}"/>`;
    if (bw > 8 && bh > 6) hrebeny += `<path d="M${f(cx - bw / 2 + 1.5)} ${cy}H${f(cx + bw / 2 - 1.5)}" transform="${t}"/>`;
  }
  s += `<g fill="#3B2A1E" opacity="0.16">${stiny}</g><g>${strechy}</g><g stroke="#FBE3CF" stroke-width="0.9" opacity="0.55">${hrebeny}</g>`;

  /* kostel na návsi: loď, věž a křížek */
  {
    const [kx, ky] = mista.kostel;
    s += `<g class="ko-m-kostel" transform="translate(${kx} ${ky})">
      <rect x="-14" y="-7" width="28" height="15" fill="#3B2A1E" opacity="0.16" transform="translate(2 3)"/>
      <rect x="-14" y="-7" width="28" height="15" fill="#E9DFCB" stroke="#8E7A62" stroke-width="1.2"/>
      <path d="M-14 0.5 H14" stroke="#8E7A62" stroke-width="1"/>
      <rect x="11" y="-10" width="11" height="11" fill="#7A8794" stroke="#56606A" stroke-width="1.1"/>
      <path d="M16.5 -10 L16.5 -18 M13 -15 H20" stroke="#56606A" stroke-width="1.6" stroke-linecap="round"/>
    </g>`;
  }
  /* škola */
  {
    const [sx, sy] = mista.skola;
    s += `<g transform="translate(${sx} ${sy})"><path d="M-10 -6 L0 -13 L10 -6 Z" fill="#B8603F"/><rect x="-9" y="-6" width="18" height="11" fill="#F1E7D3" stroke="#8E7A62" stroke-width="1"/><path d="M-3 5 V0 H3 V5" fill="#8E7A62"/></g>`;
  }
  /* bílý koník na Husím plácku */
  {
    const [bx, by] = mista.bilyKun;
    s += `<g transform="translate(${bx} ${by}) scale(0.9)"><path d="M-9 4 C-9 -2 -4 -4 2 -3 L6 -9 L9 -8 L8 -4 C10 -2 9 2 7 3 L7 9 M-7 4 L-7 9 M-2 4 L-2 9 M4 4 L4 9" fill="#FFFFFF" stroke="#6E6258" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"/></g>`;
  }

  /* ——— cesta pěšky: šňůrka kōhaku od okraje (přívod z louky) přes zastávku k bráně ——— */
  const cesta = [...MAPA_PRIVOD, ...cestaPesky];
  /* maska, kterou skript nechá doběhnout od zastávky k bráně (pathLength 1 = celá cesta) */
  defs.push(`<mask id="${id}-odkryt" maskUnits="userSpaceOnUse" x="${x0}" y="${y0}" width="${w}" height="${h}"><path class="ko-m-odkryt" d="${cara(cesta)}" pathLength="1" stroke="#FFFFFF" stroke-width="30" fill="none" stroke-linecap="round" stroke-linejoin="round"/></mask>`);
  s += `<g class="ko-m-cesta" mask="url(#${id}-odkryt)">${snurka(cesta, 4.6)}</g>`;

  /* ——— zastávky: cedulka se zeleným terčem jako PID ——— */
  for (const z of mista.zastavky) {
    const [zx, zy] = z.b;
    const m = z.nejbliz ? 1.25 : 0.95;
    s += `<g class="ko-m-zastavka${z.nejbliz ? " ko-m-nejbliz" : ""}" transform="translate(${zx} ${zy}) scale(${m})">
      <ellipse cx="0" cy="12" rx="7" ry="2.4" fill="#3B2A1E" opacity="0.2"/>
      <path d="M0 12 V-4" stroke="#5E554C" stroke-width="2"/>
      <rect x="-7.5" y="-17" width="15" height="13" rx="2.6" fill="#FBF7EE" stroke="#3E6E3A" stroke-width="1.6"/>
      <text x="0" y="-7" text-anchor="middle" font-size="9.4" class="ko-m-pismo-tucne" fill="#3E6E3A">A</text>
    </g>`;
  }

  /* ——— náš dům: zelená fasáda, terakotová střecha, záře a vlaječka (obrys z OSM je o kus níž) ——— */
  {
    const [dx, dy] = [mista.dum[0] - 1, mista.dum[1] + 4];
    s += `<g class="ko-m-dum" transform="translate(${dx} ${dy})">
      <circle class="ko-m-dum-zare" r="34" fill="url(#${id}-zare)"/>
      <circle class="ko-m-dum-kruh" r="25" fill="none" stroke="#C4432B" stroke-width="2.2" stroke-dasharray="5 4"/>
      <rect x="-12" y="-9" width="24" height="18" fill="#3B2A1E" opacity="0.2" transform="translate(2.4 3) rotate(-4)"/>
      <g transform="rotate(-4)">
        <rect x="-12" y="-9" width="24" height="18" fill="#A9C7A0" stroke="#5F7F58" stroke-width="1.3"/>
        <path d="M-12 -9 L0 0 L-12 9 Z M12 -9 L0 0 L12 9 Z" fill="#C46F4E" stroke="#8E4A30" stroke-width="1"/>
        <path d="M-12 -9 L0 0 L12 -9 M-12 9 L0 0 L12 9" fill="#B05E40"/>
        <path d="M-12 -9 L0 0 L-12 9 M12 -9 L0 0 L12 9" stroke="#8E4A30" stroke-width="1" fill="none"/>
      </g>
      <path d="M8 -6 V-34" stroke="#5E4434" stroke-width="1.8" stroke-linecap="round"/>
      <path class="ko-m-vlajka" d="M8 -34 C14 -36 18 -31 25 -33 L25 -22 C18 -20 14 -25 8 -23 Z" fill="#C4432B"/>
      <circle cx="16" cy="-28" r="3" fill="none" stroke="#FBF2E4" stroke-width="1.2"/>
    </g>`;
    defs.push(`<radialGradient id="${id}-zare"><stop offset="0" stop-color="#FFE7A3" stop-opacity="0.9"/><stop offset="0.6" stop-color="#FFD27A" stop-opacity="0.35"/><stop offset="1" stop-color="#FFD27A" stop-opacity="0"/></radialGradient>`);
  }
  /* uzlík u zastávky a malý Futatsu u brány na konci šňůrky */
  {
    const [ax, ay] = cestaPesky[0];
    s += `<g transform="translate(${ax} ${ay})"><circle r="5.6" fill="#7E1F12"/><circle r="3.8" fill="#C4432B"/><path d="M-2 -1 L2 1.4" stroke="#FBF7EE" stroke-width="1.2"/></g>`;
    const [bx, by] = mista.brana;
    s += `<g transform="translate(${bx - 1} ${by + 1}) rotate(-12)"><path d="M-5 -6 L5 -6 L4 6 Q0 7.6 -4 6 Z" fill="#F4EDE0" stroke="#7A6A58" stroke-width="1.1"/><ellipse cx="0" cy="-6" rx="5" ry="1.8" fill="#E2D6C2" stroke="#7A6A58" stroke-width="0.9"/></g>`;
  }

  s += `</g>`;

  /* ——— popisky ——— */
  const popisky: string[] = [];
  const pridej = (svg: string) => popisky.push(svg);
  /* celý Ořech */
  pridej(popisekUlice(spojene("Karlštejnská"), "Karlštejnská", 17, 0.62, "ko-m-z1"));
  pridej(popisekUlice(spojene("Kopaninská"), "Kopaninská", 15, 0.5, "ko-m-z1", -10));
  pridej(popisekUlice(spojene("Dlouhá"), "Dlouhá", 14, 0.3, "ko-m-z1", -9));
  pridej(popisekUlice(spojene("Luční"), "Luční", 14, 0.42, "ko-m-z1 ko-m-nase", 13));
  pridej(popisekUlice(spojene("Zbuzanská"), "Zbuzanská", 13, 0.55, "ko-m-z1", -9));
  pridej(popisekUlice(spojene("Slivenecká"), "Slivenecká", 13, 0.5, "ko-m-z1", -9));
  /* přiblížené okolí — menší písmo, protože se zvětší s mapou */
  pridej(popisekUlice(spojene("Dlouhá"), "Dlouhá", 9, 0.42, "ko-m-z2", -8));
  pridej(popisekUlice(spojene("Luční"), "Luční", 9, 0.36, "ko-m-z2 ko-m-nase", 9));
  pridej(popisekUlice(spojene("Rovná"), "Rovná", 8, 0.34, "ko-m-z2", 7));
  pridej(popisekUlice(spojene("Klikatá"), "Klikatá", 8, 0.62, "ko-m-z2", -7));
  pridej(popisekUlice(spojene("Hájovka"), "Hájovka", 8, 0.2, "ko-m-z2", -7));
  pridej(popisekUlice(spojene("Husí Plácek"), "Husí plácek", 7, 0.5, "ko-m-z2", 6));
  pridej(popisekUlice(spojene("Karlštejnská"), "Karlštejnská", 9, 0.83, "ko-m-z2", -9));
  pridej(popisekUlice(spojene("Kopaninská"), "Kopaninská", 9, 0.62, "ko-m-z2", -9));

  const text = (x: number, y: number, t: string, velikost: number, trida: string, kotva = "middle") =>
    `<text class="${trida}" x="${f(x)}" y="${f(y)}" font-size="${f(velikost)}" text-anchor="${kotva}">${esc(t)}</text>`;
  const [kx, ky] = mista.kostel, [rx, ry] = mista.rybnik, [sx, sy] = mista.skola;
  popisky.push(text(kx - 22, ky + 4, "náves", 17, "ko-m-misto ko-m-z1", "end"));
  popisky.push(text(kx - 22, ky + 20, "kostel a rybník", 11, "ko-m-pozn ko-m-z1", "end"));
  void rx; void ry;
  popisky.push(text(sx - 18, sy + 4, "škola", 13, "ko-m-pozn ko-m-z1", "end"));
  const [hx, hy] = mista.husiPlacek;
  popisky.push(text(hx + 16, hy - 26, "bílý koník", 7, "ko-m-pozn ko-m-z2", "start"));
  void hx; void hy;
  const [mx, my] = mista.muzeumMedu, [vx, vy] = mista.vcelin;
  popisky.push(text(mx, my + 20, "Muzeum medu", 11, "ko-m-pozn ko-m-z1"));
  popisky.push(text(vx + 4, vy + 18, "Včelín", 11, "ko-m-pozn ko-m-z1"));
  /* zastávky */
  for (const z of mista.zastavky) {
    const [zx, zy] = z.b;
    if (z.nejbliz) {
      popisky.push(text(zx - 14, zy - 20, z.jmeno, 15, "ko-m-zast ko-m-z1", "end"));
      popisky.push(text(zx + 11, zy - 28, z.jmeno, 10, "ko-m-zast ko-m-z2", "start"));
      popisky.push(text(zx + 11, zy - 19, "autobusová zastávka", 7, "ko-m-pozn ko-m-z2", "start"));
    } else {
      popisky.push(text(zx + 12, zy - 6, z.jmeno.replace("Ořech, ", ""), 10.5, "ko-m-zast-mala ko-m-z1", "start"));
    }
  }
  /* náš dům a cesta */
  popisky.push(`<g class="ko-m-z1"><text class="ko-m-my" x="30" y="40" font-size="22">tady jsme</text><path class="ko-m-sipka" d="M30 30 C20 24 16 18 18 10" fill="none" stroke-width="2.2"/><path class="ko-m-sipka" d="M13 15 L18 9 L22 16" fill="none" stroke-width="2.2"/></g>`);
  popisky.push(`<g class="ko-m-z2" text-anchor="middle"><text class="ko-m-my" x="4" y="46" font-size="13">tady jsme — JIRO saku</text><text class="ko-m-pozn" x="4" y="57" font-size="7">dílna v suterénu, vchod bránou z Luční</text></g>`);
  popisky.push(`<g class="ko-m-z2"><text class="ko-m-pesky" x="-112" y="-98" font-size="10" text-anchor="middle">pěšky asi 4 minuty</text></g>`);
  popisky.push(`<g class="ko-m-z1"><text class="ko-m-pesky" x="-112" y="-108" font-size="13" text-anchor="middle">pěšky 4 min</text></g>`);

  /* ——— okraj: kam vedou silnice, sever a měřítko ——— */
  const sipka = (x: number, y: number, uhel: number, t: string, kotva: string, tx: number, ty: number) =>
    `<g class="ko-m-ven ko-m-z1"><path d="M${x} ${y} l0 -16 m-6 7 l6 -7 l6 7" transform="rotate(${uhel} ${x} ${y})" fill="none" stroke-width="2"/><text x="${x + tx}" y="${y + ty}" font-size="12" text-anchor="${kotva}">${esc(t)}</text></g>`;
  popisky.push(sipka(176, y0 + 40, 10, "D0 · Praha", "end", -12, -2));
  popisky.push(sipka(-160, y0 + 108, -58, "Zbuzany", "start", 8, 18));
  popisky.push(sipka(312, y0 + 168, 85, "Slivenec", "end", -10, -12));
  popisky.push(sipka(-312, 226, -140, "Chýnice", "start", 12, 6));
  /* růžice: 北 = sever */
  const RX = x0 + w - 56, RY = y0 + h - 74;
  popisky.push(`<g class="ko-m-ruzice" transform="translate(${RX} ${RY})">
    <circle r="27" fill="#FBF5E6" stroke="#8E7A62" stroke-width="1.2"/>
    <circle r="21" fill="none" stroke="#C9B48E" stroke-width="0.8" stroke-dasharray="2 3"/>
    <path d="M0 -24 L6 0 L0 24 L-6 0 Z" fill="#E9DFCB" stroke="#8E7A62" stroke-width="1"/>
    <path d="M0 -24 L6 0 L-6 0 Z" fill="#C4432B"/>
    <text class="ko-kanji" x="0" y="-31" font-size="14" text-anchor="middle" fill="#2B2420">北</text>
  </g>`);
  /* měřítko 100 m */
  const MX = x0 + 26, MY = y0 + h - 30;
  popisky.push(`<g class="ko-m-meritko ko-m-z1" transform="translate(${MX} ${MY})">
    <path d="M0 0 H100" stroke="#5C5047" stroke-width="3"/><path d="M0 0 H50" stroke="#FBF5E6" stroke-width="1.6"/>
    <path d="M0 -5 V5 M50 -4 V4 M100 -5 V5" stroke="#5C5047" stroke-width="1.4"/>
    <text x="0" y="-9" font-size="11">0</text><text x="100" y="-9" font-size="11" text-anchor="middle">100 m</text>
  </g>`);
  popisky.push(`<g class="ko-m-meritko ko-m-z2" transform="translate(${-206} ${196})">
    <rect x="-6" y="-14" width="64" height="20" rx="4" fill="#FBF5E6" opacity="0.92"/>
    <path d="M0 0 H50" stroke="#5C5047" stroke-width="1.6"/><path d="M0 0 H25" stroke="#FBF5E6" stroke-width="0.8"/>
    <path d="M0 -2.6 V2.6 M25 -2 V2 M50 -2.6 V2.6" stroke="#5C5047" stroke-width="0.8"/>
    <text x="50" y="-5" font-size="6" text-anchor="middle">50 m</text>
  </g>`);
  /* zdroj podkladu — ODbL chce uvést OpenStreetMap */
  popisky.push(`<text class="ko-m-zdroj" x="${x0 + w - 12}" y="${y0 + h - 10}" font-size="8.5" text-anchor="end">podle mapy © přispěvatelé OpenStreetMap</text>`);

  /* ——— rám: přehyby papíru a jemný stín okraje ——— */
  const ram = `<g class="ko-m-prehyby" pointer-events="none">
    <path d="M${x0 + w / 2} ${y0} V${y0 + h}" stroke="#FFFFFF" stroke-width="3" opacity="0.5"/>
    <path d="M${x0 + w / 2 + 2} ${y0} V${y0 + h}" stroke="#B8A27A" stroke-width="1.4" opacity="0.35"/>
    <path d="M${x0} ${y0 + h / 3} H${x0 + w}" stroke="#FFFFFF" stroke-width="3" opacity="0.45"/>
    <path d="M${x0} ${y0 + h / 3 + 2} H${x0 + w}" stroke="#B8A27A" stroke-width="1.4" opacity="0.3"/>
    <path d="M${x0} ${y0 + (2 * h) / 3} H${x0 + w}" stroke="#FFFFFF" stroke-width="3" opacity="0.45"/>
    <path d="M${x0} ${y0 + (2 * h) / 3 + 2} H${x0 + w}" stroke="#B8A27A" stroke-width="1.4" opacity="0.3"/>
    <rect x="${x0 + 1}" y="${y0 + 1}" width="${w - 2}" height="${h - 2}" rx="6" fill="none" stroke="#C9B28A" stroke-width="2"/>
  </g>`;

  return {
    viewBox: `${x0} ${y0} ${w} ${h}`,
    svg: `<defs>${defs.join("")}</defs><g class="ko-m-kresba">${s}</g><g class="ko-m-popisky">${popisky.join("")}</g>${ram}`,
  };
}

/** Kousek trávy, ze kterého vyrůstá Kami u vývěsky — aby nestál na čáře */
export const chomacTravy = (seed: number) => chomac(0, 0, 30, 9, 9, seed, 0.6, 0.7);
