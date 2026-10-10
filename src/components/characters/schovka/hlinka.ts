/**
 * Hlínka na schovávanou — zjednodušená kresba pro hry na hledání po webu,
 * sestra Pecinky z ./pecinka.ts, Bublinky z ./bublinka.ts a Střípka ze
 * ./stripek.ts (stejné barvy, pózy i volby, takže je hra může střídat).
 * Kulatá hrouda na dvou nožkách, která spí: očka zavřená do úsměvu, nad
 * hlavou „z z z“ a na temeni výhonek se dvěma lístky. Ten ji při
 * schovávané prozradí — trčí z úkrytu jako první.
 *
 * Je vždycky malá (16–64 px), a proto má dvě optické velikosti: kresbu na
 * mřížce 32 pro velikost od 22 px nahoru a zvlášť kreslenou na mřížce 16
 * pro úplně malou — tam zbyde jen hrouda, nožky, výhonek, dva obloučky očí
 * (v 16 px z nich jsou čárky) a jedno zetko.
 *
 * Čtyři barvy, každá řešená zvlášť (ne jen přebarvená):
 *   cerna      silueta jako vyřezaný erb: oči, úsměv, skvrny, žilky lístků
 *              a spára nad nožkami jsou díry, takže ve tmě splyne úplně
 *   pruhledna  skleněná kulička: bílá linka s tmavým vláskem, lesk, skvrny
 *              jsou bublinky ve skle a pod temenem je vidět kořínky; lístky
 *              zůstaly do zelena — nejtěžší k nalezení, a právě ty ji prozradí
 *   zlata      valounek zlata: kov s hranou, na kterou padá světlo, skvrny
 *              jako důlky a na lístku kapka rosy, co občas blikne
 *   logo       soumrak ze značky, nožky v barvě noci, lístky krémové se
 *              zlatým lemem, zetka stoupají od rumělky k fialové a na čele
 *              jí leží květ sakury z loga (spí pod sakurou, tak na ni spadl)
 *
 * Dvě pózy: `stoji` (stojí a spí) a `vykukuje` — kouká zpoza hrany, o kterou
 * se drží ručkama, ale ospale: jedno oko nechala zavřené, druhé pootevřela
 * a zívá. Vykukující kresba je nižší (spodek je hrana, za kterou se
 * schovává), hra ji staví spodkem na horní okraj čehokoli; kvůli výhonku je
 * o dva body velké mřížky vyšší než vykukující Pecinka (21 místo 19).
 *
 * Generátor vrací SVG jako text, takže jde použít při sestavení stránky
 * (Hlinka.astro) i za běhu ve hře. Pohyb (dýchání, kývání výhonku, stoupající
 * zetka, klimbání, jiskra) je v styles/schovka.css; bez něj zůstane hezký
 * nehybný obrázek.
 */
import { VELKA_OD } from "./pecinka";
import type { SchovkaBarva, SchovkaVolby } from "./pecinka";

interface Obd {
  x: number;
  y: number;
  w: number;
  h: number;
  rx: number;
}
interface Predloha {
  /** šířka a výška mřížky */
  w: number;
  h: number;
  /** tloušťka čáry v jednotkách mřížky (na 32 je to 1, na 16 půlka) */
  k: number;
  /** hrouda: střed a poloměr */
  telo: [number, number, number];
  /** nožky: středy a poloosy (vykukující je má za hranou) */
  nohy: [number, number][];
  noha: [number, number];
  /** výhonek: kořínek na temeni (kolem něj se kývá), stonek, pravý a levý lístek */
  koren: [number, number];
  stonek: string;
  stonekS: number;
  listky: [string, string];
  /** žilky lístků a kořínky pod temenem (jen na velké mřížce) */
  zilky: string | null;
  koreny: string | null;
  /** skvrny na hroudě: světlá, střední a tmavá (střed a poloměr) */
  skvrny: [number, number, number][];
  /** očka zavřená do úsměvu (obloučky) a jejich tloušťka; vykukující má zavřené jen jedno */
  vicka: string;
  vickaS: number;
  /** pootevřené oko: levý horní roh, šířka a hloubka */
  oko: [number, number, number, number] | null;
  usta: string | null;
  /** zívnutí, když vykukuje: střed a poloosy */
  zev: [number, number, number, number] | null;
  tvare: [number, number][];
  lesk: string;
  /** zetka nad hlavou, odspodu: levý horní roh a šířka */
  zzz: [number, number, number][];
  ruce: Obd[];
  /** kam na čelo patří květ z loga (malá vykukující ho nemá, pletl by se s okem) */
  kvet: [number, number] | null;
  /** kde na zlatém lístku blikne rosa */
  jiskra: [number, number];
}

/* ——— Mřížka 32: stojí a spí ——— */
const S32: Predloha = {
  w: 32, h: 32, k: 1,
  telo: [14, 18.3, 10.6],
  nohy: [[10.9, 29.3], [17.1, 29.3]], noha: [2.7, 1.35],
  koren: [14, 8],
  stonek: "M14 8 C13.7 5.6 14.3 4 15.3 2.6", stonekS: 1,
  listky: ["M15 3.7 C15.8 0.9 18.9 0.5 20.8 1.9 C19.6 4.3 16.6 4.9 15 3.7 Z", "M14.4 5.4 C13.4 2.8 10.7 2.6 9.1 3.8 C10.3 5.9 12.8 6.5 14.4 5.4 Z"],
  zilky: "M15.9 3.2 Q17.8 2.2 19.8 2.1 M13.6 4.9 Q12 4 10.2 4",
  koreny: "M14 8.4 Q13.5 9.8 14.1 11 Q14.5 11.9 14 12.7 M13.8 9.9 Q12.7 10.3 12.1 11.4 M14.2 11.1 Q15.3 11.4 15.8 12.4",
  skvrny: [[9.6, 14.3, 1.75], [18, 21.4, 1.3], [12.2, 23.2, 1.1]],
  vicka: "M9.7 17.9 Q11.3 16.1 12.9 17.9 M15.1 17.9 Q16.7 16.1 18.3 17.9", vickaS: 0.95,
  oko: null,
  usta: "M12.8 20.6 Q14 21.8 15.2 20.6",
  zev: null,
  tvare: [[9.1, 19.9], [18.9, 19.9]],
  lesk: "M22.2 20.9 A8.7 8.7 0 0 1 17.7 26.1",
  zzz: [[22.6, 7.8, 2.1], [25, 4.2, 2.6], [27.8, 0.6, 3.1]],
  ruce: [],
  kvet: [9.6, 14.3],
  jiskra: [19.3, 2.2],
};
/* ——— Mřížka 32: vykukuje zpoza hrany (spodek kresby je hrana). Jedno oko spí dál, druhé pootevřela a zívá. ——— */
const V32: Predloha = {
  w: 32, h: 21, k: 1,
  telo: [16, 17.8, 10.6],
  nohy: [], noha: [0, 0],
  koren: [16, 7.5],
  stonek: "M16 7.5 C15.7 5.1 16.3 3.5 17.3 2.1", stonekS: 1,
  listky: ["M17 3.2 C17.8 0.4 20.9 0 22.8 1.4 C21.6 3.8 18.6 4.4 17 3.2 Z", "M16.4 4.9 C15.4 2.3 12.7 2.1 11.1 3.3 C12.3 5.4 14.8 6 16.4 4.9 Z"],
  zilky: "M17.9 2.7 Q19.8 1.7 21.8 1.6 M15.6 4.4 Q14 3.5 12.2 3.5",
  koreny: "M16 7.9 Q15.5 9.3 16.1 10.5 Q16.5 11.4 16 12.2 M15.8 9.4 Q14.7 9.8 14.1 10.9 M16.2 10.6 Q17.3 10.9 17.8 11.9",
  skvrny: [[9.6, 11.9, 1.6]],
  vicka: "M10.9 15.4 Q12.5 13.6 14.1 15.4", vickaS: 0.95,
  oko: [17.4, 13.8, 3.4, 2],
  usta: null,
  zev: [15.9, 18.2, 1, 1.15],
  tvare: [],
  lesk: "M23.3 12.5 A9 9 0 0 1 24.9 16.6",
  zzz: [[26.8, 3.1, 2.6]],
  ruce: [{ x: 4.4, y: 17.7, w: 5, h: 3.4, rx: 1.6 }, { x: 22.6, y: 17.7, w: 5, h: 3.4, rx: 1.6 }],
  kvet: [9.6, 11.9],
  jiskra: [21.3, 1.7],
};
/* ——— Mřížka 16: stojí a spí. Bez úsměvu, skvrn a žilek, zetko jen jedno. ——— */
const S16: Predloha = {
  w: 16, h: 16, k: 0.5,
  telo: [7.2, 9.5, 5.2],
  nohy: [[5.5, 14.9], [8.9, 14.9]], noha: [1.5, 0.95],
  koren: [7.2, 4.6],
  stonek: "M7.2 4.6 Q7.1 3 7.8 1.6", stonekS: 0.8,
  listky: ["M7.7 2.3 C8.1 0.2 10.4 0 11.3 1 C10.6 2.8 8.8 3.1 7.7 2.3 Z", "M7.4 3.6 C6.9 1.7 4.8 1.5 3.9 2.4 C4.6 4 6.3 4.3 7.4 3.6 Z"],
  zilky: null,
  koreny: null,
  skvrny: [],
  vicka: "M4.3 9.9 Q5.2 8.2 6.1 9.9 M8.3 9.9 Q9.2 8.2 10.1 9.9", vickaS: 0.8,
  oko: null,
  usta: null,
  zev: null,
  tvare: [],
  lesk: "M11.3 10.7 A4.3 4.3 0 0 1 9.1 13.2",
  zzz: [[12.6, 1, 2.8]],
  ruce: [],
  kvet: [5, 6.7],
  jiskra: [10.2, 1.3],
};
const V16: Predloha = {
  w: 16, h: 10.5, k: 0.5,
  telo: [8, 9.4, 5.3],
  nohy: [], noha: [0, 0],
  koren: [8, 4.4],
  stonek: "M8 4.4 Q7.9 2.8 8.6 1.3", stonekS: 0.8,
  listky: ["M8.5 2 C8.9 -0.1 11.2 -0.3 12.1 0.7 C11.4 2.5 9.6 2.8 8.5 2 Z", "M8.2 3.3 C7.7 1.4 5.6 1.2 4.7 2.1 C5.4 3.7 7.1 4 8.2 3.3 Z"],
  zilky: null,
  koreny: null,
  skvrny: [],
  vicka: "M4.7 7.9 Q5.7 6.1 6.7 7.9", vickaS: 0.8,
  oko: [8.8, 6.8, 2, 1.15],
  usta: null,
  zev: null,
  tvare: [],
  lesk: "M12.1 6.6 A4.8 4.8 0 0 1 12.7 8.4",
  zzz: [],
  ruce: [{ x: 1.8, y: 8.8, w: 2.6, h: 1.7, rx: 0.8 }, { x: 11.6, y: 8.8, w: 2.6, h: 1.7, rx: 0.8 }],
  kvet: null,
  jiskra: [11, 1],
};

const PLATEK = "M0 0 C-2.5 -1.5 -4.1 -3.9 -4.2 -6.6 C-4.3 -9.4 -3.1 -11.5 -1.9 -12.6 L0 -9.5 L1.9 -12.6 C3.1 -11.5 4.3 -9.4 4.2 -6.6 C4.1 -3.9 2.5 -1.5 0 0 Z";
const HVEZDA = "M0 -1 Q0.18 -0.18 1 0 Q0.18 0.18 0 1 Q-0.18 0.18 -1 0 Q-0.18 -0.18 0 -1 Z";

const c = (n: number) => String(Math.round(n * 100) / 100);
const obd = ({ x, y, w, h, rx }: Obd, atributy = "") => `<rect x="${c(x)}" y="${c(y)}" width="${c(w)}" height="${c(h)}" rx="${c(rx)}"${atributy}/>`;
const cesta = (d: string | null, atributy = "") => (d ? `<path d="${d}"${atributy}/>` : "");
const koule = (m: Predloha, atributy = "", o = 0) => `<circle cx="${m.telo[0]}" cy="${m.telo[1]}" r="${c(m.telo[2] - o)}"${atributy}/>`;
const nohy = (m: Predloha, atributy = "") => m.nohy.map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="${m.noha[0]}" ry="${m.noha[1]}"${atributy}/>`).join("");
const ruce = (m: Predloha, atributy = "") => m.ruce.map((r) => obd(r, atributy)).join("");
const skvrna = ([x, y, r]: [number, number, number], atributy: string, o = 1) => `<circle cx="${x}" cy="${y}" r="${c(r * o)}"${atributy}/>`;
const listky = (m: Predloha, atributy = "") => m.listky.map((d) => cesta(d, atributy)).join("");
const stonek = (m: Predloha, barva: string, s = 1, atributy = "") => cesta(m.stonek, ` stroke="${barva}" stroke-width="${c(m.stonekS * s)}" stroke-linecap="round" fill="none"${atributy}`);
/**
 * Výhonek na temeni se kývá kolem kořínku. Střed otáčení si nese s sebou
 * v jednotkách kresby (ne v procentech obrysu — ten se mění, když na lístku
 * blikne rosa); hýbe se, když je styles/schovka.css.
 */
const vyhonek = (m: Predloha, obsah: string, atributy = "") => `<g class="sh-vyhonek" style="transform-origin:${m.koren[0]}px ${m.koren[1]}px"${atributy}>${obsah}</g>`;
/** Hrouda dýchá jen, když stojí na nožkách: zvedá se od země, proto je střed dole mezi nimi. */
const dech = (m: Predloha, obsah: string) =>
  m.nohy.length ? `<g class="sh-dech" style="transform-origin:${m.telo[0]}px ${c(m.nohy[0][1] + m.noha[1])}px">${obsah}</g>` : obsah;
/** „z“ jako tah, ne písmo — písma webu se do kresby nedostanou. O něco vyšší než širší, jako na velké kresbě. */
const zetkoD = ([x, y, s]: [number, number, number]) => `M${c(x)} ${c(y)} h${c(s)} l${c(-s)} ${c(s * 1.15)} h${c(s)}`;
/** Zetka nad hlavou: každé zvlášť, ať můžou jedno po druhém stoupat a mizet. tah dostane cestu, tloušťku a pořadí. */
const zzz = (m: Predloha, tah: (d: string, s: number, i: number) => string) =>
  m.zzz.map((z, i) => `<g class="sh-z" style="--sh-i:${i}" opacity="${c(1 - i * 0.12)}">${tah(zetkoD(z), z[2] * 0.34, i)}</g>`).join("");
const zetko = (barva: string) => (d: string, s: number) => `<path d="${d}" stroke="${barva}" stroke-width="${c(s)}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
/**
 * Oči: zavřené obloučky do úsměvu. Když vykukuje, je jedno pootevřené —
 * nahoře rovné víčko, dole oblouk — a klimbá (styles/schovka.css). Tečka
 * v něm je buď zornička (na světlém oku), nebo odlesk (na tmavém).
 */
const oci = (m: Predloha, linka: string, tecka: string | null, zornicka = false, atributy = "") => {
  let s = `<path d="${m.vicka}" stroke="${linka}" stroke-width="${c(m.vickaS)}" stroke-linecap="round" fill="none"${atributy}/>`;
  if (!m.oko) return s;
  const [x, y, w, h] = m.oko;
  s += `<g class="sh-oko"${atributy}><path d="M${x} ${y} h${w} a${c(w / 2)} ${h} 0 0 1 ${-w} 0 Z" fill="${linka}"/>`;
  if (tecka && m.k === 1) s += zornicka ? `<circle cx="${c(x + w * 0.44)}" cy="${c(y + h * 0.46)}" r="0.72" fill="${tecka}"/>` : `<circle cx="${c(x + w * 0.7)}" cy="${c(y + h * 0.38)}" r="0.42" fill="${tecka}"/>`;
  return s + `</g>`;
};
const usta = (m: Predloha, barva: string) => (m.usta ? `<path d="${m.usta}" stroke="${barva}" stroke-width="${c(0.85 * m.k)}" stroke-linecap="round" fill="none"/>` : "");
const zev = (m: Predloha, atributy: string) => (m.zev ? `<ellipse cx="${m.zev[0]}" cy="${m.zev[1]}" rx="${m.zev[2]}" ry="${m.zev[3]}"${atributy}/>` : "");
const tvare = (m: Predloha, barva: string, op: number) => m.tvare.map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.5" ry="0.95" fill="${barva}" opacity="${op}"/>`).join("");
/** Květ z loga na čele: pět plátků, na malé mřížce jen tečka se středem */
const kvet = (m: Predloha, vypln: string, lem: string, stred: string) => {
  if (!m.kvet) return "";
  const [x, y] = m.kvet;
  if (m.k !== 1) return `<circle cx="${x}" cy="${y}" r="0.85" fill="${vypln}"/><circle cx="${x}" cy="${y}" r="0.36" fill="${stred}"/>`;
  return (
    `<g transform="translate(${x} ${y}) scale(0.15)" fill="${vypln}" stroke="${lem}" stroke-width="1.6" stroke-linejoin="round">` +
    [0, 72, 144, 216, 288].map((u) => `<path d="${PLATEK}" transform="rotate(${u + 14}) translate(0 -1.7)"/>`).join("") +
    `</g><circle cx="${x}" cy="${y}" r="0.5" fill="${stred}"/>`
  );
};

/* ═══ Černá: silueta jako vyřezaný erb, detaily jsou díry ═══ */
const cerna = (m: Predloha, id: string) => {
  const k = m.k;
  const tus = "#1E1A18";
  /* maska je celá bílá, černé jsou jen díry; kreslí se pod ní rovnou tvary, ať se má hrouda při dýchání o co opřít */
  let maska = `<rect x="-2" y="-2" width="${m.w + 4}" height="${m.h + 6}" fill="#fff"/>`;
  maska += cesta(m.zilky, ` stroke="#000" stroke-width="0.42" stroke-linecap="round" fill="none"`);
  /* skvrny jako důlky po prstech: jen dvě větší, třetí by se pletla s úsměvem; vykukující má v tváři děr dost i bez nich */
  if (!m.oko) maska += m.skvrny.slice(0, 2).map((s) => skvrna(s, ` fill="#000"`, 0.62)).join("");
  maska += oci(m, "#000", "#fff", true);
  maska += usta(m, "#000");
  maska += zev(m, ` fill="#000"`);
  /* nožky se od hroudy oddělí spárou, ručky taky, ať je vidět, že se drží hrany */
  maska += nohy(m, ` fill="#fff" stroke="#000" stroke-width="${c(0.95 * k)}"`);
  maska += ruce(m, ` fill="#fff" stroke="#000" stroke-width="${c(0.9 * k)}"`);
  const pod = ` mask="url(#${id}-m)"`;
  return (
    `<defs><mask id="${id}-m" maskUnits="userSpaceOnUse" x="-2" y="-2" width="${m.w + 4}" height="${m.h + 6}">${maska}</mask></defs>` +
    zzz(m, zetko(tus)) +
    dech(
      m,
      /* výhonek má masku s sebou, takže se žilky kývou s ním */
      vyhonek(m, stonek(m, tus) + listky(m, ` fill="${tus}"`), pod) + `<g fill="${tus}"${pod}>${koule(m)}${nohy(m)}${ruce(m)}</g>`,
    )
  );
};

/* ═══ Průhledná: skleněná kulička, ve které je vidět kořínky ═══ */
const pruhledna = (m: Predloha, id: string) => {
  const k = m.k;
  const vlasek = `stroke="#2B2420" stroke-opacity="0.42" stroke-width="${c(1.6 * k)}"`;
  const bila = `stroke="#FFFFFF" stroke-opacity="0.95" stroke-width="${c(0.75 * k)}"`;
  const plocha = `x="-2" y="-2" width="${m.w + 4}" height="${m.h + 6}"`;
  let s =
    `<defs><linearGradient id="${id}-l" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#FFFFFF" stop-opacity="0.5"/><stop offset="0.42" stop-color="#FFFFFF" stop-opacity="0.1"/><stop offset="0.8" stop-color="#D8E8F4" stop-opacity="0.16"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0.3"/></linearGradient>` +
    /* sklo je vidět skrz, takže spodek hroudy se za nožkami musí vyříznout */
    (m.nohy.length ? `<mask id="${id}-p" maskUnits="userSpaceOnUse" ${plocha}><rect ${plocha} fill="#fff"/><g fill="#000">${nohy(m)}</g></mask>` : "") +
    `</defs>`;
  s += zzz(m, (d, t) => `<path d="${d}" stroke="#2B2420" stroke-opacity="0.42" stroke-width="${c(t + 0.85 * k)}" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="${d}" stroke="#FFFFFF" stroke-opacity="0.95" stroke-width="${c(t * 0.62)}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`);
  /* výhonek: jediné místo, kde ve skle zůstala barva */
  let v = stonek(m, "#2B2420", 1.75, ` stroke-opacity="0.42"`) + stonek(m, "#FFFFFF", 0.8, ` stroke-opacity="0.95"`);
  v += listky(m, ` fill="#A8C58A" fill-opacity="0.62" ${vlasek} stroke-linejoin="round"`) + listky(m, ` fill="none" ${bila} stroke-linejoin="round"`);
  v += cesta(m.zilky, ` stroke="#FFFFFF" stroke-opacity="0.85" stroke-width="0.4" stroke-linecap="round" fill="none"`);
  let t = (m.nohy.length ? `<g mask="url(#${id}-p)">` : `<g>`) + koule(m, ` fill="url(#${id}-l)" ${vlasek}`) + koule(m, ` fill="none" ${bila}`) + `</g>`;
  /* kořínky pod temenem a skvrny jako bublinky zatavené ve skle */
  t += cesta(m.koreny, ` stroke="#FFFFFF" stroke-opacity="0.7" stroke-width="0.45" stroke-linecap="round" fill="none"`);
  t += m.skvrny.map((b) => skvrna(b, ` fill="#FFFFFF" fill-opacity="0.2" stroke="#FFFFFF" stroke-opacity="0.8" stroke-width="0.4"`, 0.8)).join("");
  t += nohy(m, ` fill="url(#${id}-l)" ${vlasek}`) + nohy(m, ` fill="none" ${bila}`);
  t += oci(m, "#2B2420", "#FFFFFF", false, ` opacity="0.62"`);
  if (m.usta) t += `<path d="${m.usta}" stroke="#2B2420" stroke-opacity="0.5" stroke-width="${c(1.4 * k)}" fill="none" stroke-linecap="round"/><path d="${m.usta}" stroke="#FFFFFF" stroke-width="${c(0.7 * k)}" fill="none" stroke-linecap="round"/>`;
  t += zev(m, ` fill="#2B2420" fill-opacity="0.5" stroke="#FFFFFF" stroke-width="0.45"`);
  /* lesk na skle: oblouk vpravo dole */
  t += `<path d="${m.lesk}" stroke="#FFFFFF" stroke-width="${c(1.1 * k)}" fill="none" stroke-linecap="round"/>`;
  s += dech(m, vyhonek(m, v) + t);
  s += ruce(m, ` fill="url(#${id}-l)" ${vlasek}`) + ruce(m, ` fill="none" ${bila}`);
  return s;
};

/* ═══ Zlatá: valounek zlata s hranou a rosou na lístku ═══ */
const zlata = (m: Predloha, id: string) => {
  const k = m.k;
  const [cx, cy, r] = m.telo;
  let s =
    `<defs><linearGradient id="${id}-z" gradientUnits="userSpaceOnUse" x1="${c(cx - r)}" y1="${c(cy - r)}" x2="${c(cx + r)}" y2="${c(cy + r)}">` +
    `<stop offset="0" stop-color="#FFF2BC"/><stop offset="0.32" stop-color="#F2C95E"/><stop offset="0.68" stop-color="#C9922E"/><stop offset="1" stop-color="#8E6418"/></linearGradient>` +
    `<linearGradient id="${id}-k" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E2B552"/><stop offset="0.5" stop-color="#A9781E"/><stop offset="1" stop-color="#6E4A12"/></linearGradient>` +
    `<linearGradient id="${id}-h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFBEA"/><stop offset="0.5" stop-color="#FFFBEA" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="${id}-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF6D2"/><stop offset="0.5" stop-color="#F2CF74"/><stop offset="1" stop-color="#C9922E"/></linearGradient></defs>`;
  s += zzz(m, zetko("#B8862A"));
  /* výhonek: stonek s tmavým okrajem, lístky světlejší zlato */
  let v = stonek(m, "#6E4A12", 1.5) + stonek(m, "#E2B552", 0.7);
  v += listky(m, ` fill="url(#${id}-b)" stroke="#6E4A12" stroke-width="${c(0.6 * k)}" stroke-linejoin="round"`);
  v += cesta(m.zilky, ` stroke="#A9781E" stroke-width="0.4" stroke-linecap="round" fill="none"`);
  /* rosa na lístku: čtyřcípá hvězdička, občas blikne */
  v += `<g transform="translate(${m.jiskra[0]} ${m.jiskra[1]}) scale(${c(2.4 * k)})"><path class="sp-jiskra" d="${HVEZDA}" fill="#FFFFFF"/></g>`;
  let t = koule(m, ` fill="url(#${id}-z)" stroke="#6E4A12" stroke-width="${c(0.95 * k)}"`);
  /* hrana, na kterou padá světlo */
  t += koule(m, ` fill="none" stroke="url(#${id}-h)" stroke-width="${c(0.8 * k)}"`, 0.95 * k);
  /* skvrny jako důlky: světlý, kam svítí, a dva ve stínu */
  t += m.skvrny.map((d, i) => skvrna(d, i ? ` fill="#8E6418" opacity="0.34"` : ` fill="#FFF8DC" opacity="0.5"`)).join("");
  t += tvare(m, "#FFE29A", 0.75);
  t += nohy(m, ` fill="url(#${id}-k)" stroke="#5E3E0C" stroke-width="${c(0.8 * k)}"`);
  t += oci(m, "#3E2606", "#FFF8DC");
  t += usta(m, "#3E2606");
  t += zev(m, ` fill="#3E2606"`);
  t += `<path d="${m.lesk}" stroke="#FFFBEA" stroke-width="${c(0.9 * k)}" stroke-linecap="round" fill="none" opacity="0.9"/>`;
  s += dech(m, vyhonek(m, v) + t);
  s += ruce(m, ` fill="url(#${id}-z)" stroke="#6E4A12" stroke-width="${c(0.95 * k)}"`);
  return s;
};

/* ═══ Barvy loga: soumrak ze značky, nožky v barvě noci a na čele sakura ═══ */
const logo = (m: Predloha, id: string) => {
  const k = m.k;
  const [cx, cy, r] = m.telo;
  /* zetka stoupají soumrakem: rumělka, růžová, fialová */
  const SOUMRAK = ["#C4432B", "#C0708A", "#7A5E8E"];
  let s =
    `<defs><linearGradient id="${id}-s" gradientUnits="userSpaceOnUse" x1="${c(cx - r)}" y1="${c(cy - r)}" x2="${c(cx + r)}" y2="${c(cy + r)}">` +
    `<stop offset="0" stop-color="#C4432B"/><stop offset="0.36" stop-color="#C0708A"/><stop offset="0.7" stop-color="#7A5E8E"/><stop offset="1" stop-color="#3E3C78"/></linearGradient>` +
    `<linearGradient id="${id}-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF6DC"/><stop offset="0.55" stop-color="#FBE9B7"/><stop offset="1" stop-color="#E2B95A"/></linearGradient></defs>`;
  s += zzz(m, (d, t, i) => zetko(SOUMRAK[i % SOUMRAK.length])(d, t));
  /* výhonek: krémové lístky se zlatým lemem, jako plátky květu */
  let v = stonek(m, "#B8862A");
  v += listky(m, ` fill="url(#${id}-b)" stroke="#B8862A" stroke-width="${c(0.6 * k)}" stroke-linejoin="round"`);
  v += cesta(m.zilky, ` stroke="#E2B95A" stroke-width="0.4" stroke-linecap="round" fill="none"`);
  let t = koule(m, ` fill="url(#${id}-s)" stroke="#2A2C5E" stroke-opacity="0.9" stroke-width="${c(0.95 * k)}"`);
  /* skvrny: na místě té světlé leží květ, zbylé dvě jsou stín */
  t += m.skvrny.slice(1).map((d) => skvrna(d, ` fill="#2A2C5E" opacity="0.26"`)).join("");
  t += tvare(m, "#F7CFCB", 0.55);
  /* květ z loga, co na ni spadl: pět plátků se zlatým lemem, uprostřed rumělka */
  t += kvet(m, "#FBE9B7", "#E2B95A", "#C4432B");
  t += nohy(m, ` fill="#2A2C5E" stroke="#1E2048" stroke-width="${c(0.8 * k)}"`);
  t += oci(m, "#FBE9B7", "#2A2C5E", true);
  t += usta(m, "#FBE9B7");
  t += zev(m, ` fill="#2A2C5E" stroke="#FBE9B7" stroke-width="0.45"`);
  t += `<path d="${m.lesk}" stroke="#FBE9B7" stroke-width="${c(0.9 * k)}" stroke-linecap="round" fill="none" opacity="0.7"/>`;
  s += dech(m, vyhonek(m, v) + t);
  s += ruce(m, ` fill="#C0708A" stroke="#2A2C5E" stroke-opacity="0.9" stroke-width="${c(0.95 * k)}"`);
  return s;
};

const KRESBY: Record<SchovkaBarva, (m: Predloha, id: string) => string> = { cerna, pruhledna, zlata, logo };

let citac = 0;

/** Hlínka na schovávanou jako SVG text */
export function hlinkaSchovka({ barva = "logo", velikost = 32, poza = "stoji", id, trida = "", zpozdeni }: SchovkaVolby = {}) {
  const velka = velikost >= VELKA_OD;
  const m = poza === "vykukuje" ? (velka ? V32 : V16) : velka ? S32 : S16;
  const pid = id ?? `sh${(citac++).toString(36)}`;
  /* posun animací podle id, ať dvě Hlínky na stránce nedýchají naráz */
  const z = zpozdeni ?? -([...pid].reduce((a, znak) => (a * 31 + znak.charCodeAt(0)) % 997, 7) % 53) / 10;
  const vyska = Math.round((velikost * m.h) / m.w * 100) / 100;
  const kresba = KRESBY[barva](m, pid);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" class="schovka schovka-hlinka schovka-${barva} schovka-${poza} ${trida}" viewBox="0 0 ${m.w} ${m.h}" width="${velikost}" height="${vyska}" style="--sp-z:${c(z)}s" fill="none" aria-hidden="true" focusable="false">` +
    /* vykukující se o hranu ořízne, ať pod ní hrouda nepřečuhuje */
    (poza === "vykukuje" ? `<clipPath id="${pid}-o"><rect x="-4" y="-4" width="${m.w + 8}" height="${m.h + 4}"/></clipPath><g clip-path="url(#${pid}-o)">${kresba}</g>` : kresba) +
    `</svg>`
  );
}
