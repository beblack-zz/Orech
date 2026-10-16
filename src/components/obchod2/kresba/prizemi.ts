/**
 * Přízemí krámku — dvě výlohy s policemi, dveře s norenem, pultem
 * a hodinami, čtyři sloupy, schránka rolety s dřevěnými cedulkami mezi
 * lampiony, roleta (kreslená stažená), kamenný schod s dřevěnou podlážkou
 * a sousedská vývěska s letáky na zdi levého souseda.
 *
 * Rozměry jsou ze zaklad.ts (PRIZEMI, ZBOZI, MISTA), tady se nic
 * nepřeměřuje. Co je kde:
 *
 *   uvnitr  výlohy: světlá zadní stěna, police s horní plochou přesně na
 *           police1 a police2 (přední hrana 26), pod nimi skříňka se
 *           šuplíky a kováním; drobnosti jen v okrajích mezi rámem
 *           a kusem a v pruhu pod horní policí — za kusy zůstává čistá
 *           zeď. Dveře: krámek do hloubky — regál se zásobami, které
 *           nejsou keramika (noviny na balení, krabice tomobako, šňůry,
 *           šátky, rádio, daruma, kytka), kamidana, hřebík nad hodinami,
 *           smaltovaná lampa a pult s pokladnou vpravo.
 *   zem     kamenný schod přes průčelí a nízká podlážka z prken.
 *   predni  sklo a rámy výloh (jedna příčka mezi sloupci kusů), papírky
 *           v dolních rozích skla, odsunutá křídla dveří, sloupy, noren,
 *           roleta, schránka rolety s cedulkami, vodicí lišty, vývěska.
 *   svetla  světlo výloh a krámku, lampa nad pultem, světlo rozlité na
 *           schod a podlážku, lampička nad vývěskou.
 *
 * Kusy zboží (HTML) stojí v ZBOZI.vylohaL/P — přes ně jde v predni jen
 * odlesk skla do 0,12. Hodiny (HTML, schovává se v nich Střípek) visí na
 * prázdné zdi PRIZEMI.hodiny. Na levé části pultu (x 1490–1560) stojí
 * Cedulka (HTML) — deska tam zůstává prázdná.
 */
import { P, SVIT, PISMO, PRAH, PRIZEMI, ZBOZI, MISTA, X, Y, svetlo, f, nahoda, obdelnik, cara, kruh, elipsa, mnohouhelnik } from "./zaklad";
import type { Vrstvy, Obdelnik, Bod } from "./zaklad";

/* ——— Rozměry ——— */
const VL = PRIZEMI.vylohaL;
const VP = PRIZEMI.vylohaP;
const DV = PRIZEMI.dvere;
const PULT = PRIZEMI.pult;
const NAHORE = Y.prekladDole;
const DOLE = Y.podlaha;
const HRANA = ZBOZI.hranaPolice;
/** Rám výlohy — zasahuje do otvoru, kusy začínají až 28 od kraje */
const RAM = 12;
/** Příčka výlohy od kraje výlohy: 144…156, přesně mezi sloupci kusů */
const PRICKA = 144;
/** Volný pruh mezi rámem a kusem (vnější a vnitřní okraj výlohy) */
const OKRAJ = 16;
/** Spodní hrana norenu */
const NOREN_DOLE = PRIZEMI.norenDole;

/* ——— Barvy navíc (rodina palety P) ——— */
const B = {
  zedVylohy: "#F3EAD6",
  zedKramu: "#E5D4B4",
  policeVrch: "#D3AC80",
  lista: "#EFE8D8",
  skrin: "#5E3D28",
  skrinCelo: "#7C5437",
  ram: "#4B301F",
  regal: "#8A6446",
  pultVrch: "#CDA57A",
  pultCelo: "#8A5E3C",
  podlaha: "#B98C62",
  schranka: "#D3DCE4",
  lamela: "#8E979E",
  lamelaSvetla: "#BAC3C9",
  lamelaTma: "#6B747B",
  lamelaSpara: "#4C5359",
  hinoki: "#E9D4AA",
  hinokiStin: "#C8AD7E",
  mosaz: "#C9A44A",
  smalt: "#3F6B57",
  smaltSvetly: "#6E9A84",
  deska: "#56705F",
  bambus: "#B7A76C",
  bambusSvetly: "#D5C88F",
  bambusTma: "#8C7E4C",
  juta: "#B89A68",
  jutaTma: "#957848",
  novinySvetle: "#ECE8DD",
  novinyTma: "#D5CFBF",
  tisk: "#8F897D",
  paulownie: "#E6D1A6",
  paulownieStin: "#C9B184",
  kuze: "#E9C6A2",
  hlina: "#B8875A",
  zluta: "#D9A441",
  salvej: "#8FA58A",
};

/* ——— Pomocníci ——— */
type Obd = [number, number, number, number];

/** Hodně obdélníků stejné barvy jako jedna cesta */
const obdelniky = (r: Obd[], atributy: string) =>
  r.length ? `<path d="${r.map(([x, y, w, h]) => `M${f(x)} ${f(y)}h${f(w)}v${f(h)}h${f(-w)}z`).join("")}" ${atributy}/>` : "";

/** Hodně kruhů stejné barvy jako jedna cesta */
const kruhy = (k: [number, number, number][], atributy: string) =>
  k.length ? `<path d="${k.map(([x, y, r]) => `M${f(x + r)} ${f(y)}a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0z`).join("")}" ${atributy}/>` : "";

const otoc = (uhel: number, cx: number, cy: number, obsah: string) => `<g transform="rotate(${f(uhel)} ${f(cx)} ${f(cy)})">${obsah}</g>`;
const posun = (x: number, y: number, obsah: string, uhel = 0, cx = 0, cy = 0) =>
  `<g transform="translate(${f(x)} ${f(y)})${uhel ? ` rotate(${f(uhel)} ${f(cx)} ${f(cy)})` : ""}">${obsah}</g>`;

/** Nápis vodorovně */
const napis = (x: number, y: number, obsah: string, velikost: number, pismo: string, atributy = "") =>
  `<text x="${f(x)}" y="${f(y)}" font-size="${f(velikost)}" font-family="${pismo}" ${atributy}>${obsah}</text>`;

/** Nápis svisle, znak pod znakem: x je střed sloupce, y účaří prvního znaku */
const svisle = (x: number, y: number, znaky: string, velikost: number, krok: number, atributy = "") =>
  `<text font-size="${f(velikost)}" font-family="${PISMO.kanji}" text-anchor="middle" ${atributy}>${[...znaky]
    .map((z, i) => `<tspan x="${f(x)}" y="${f(y + i * krok)}">${z}</tspan>`)
    .join("")}</text>`;

/** Kousek papírové lepicí pásky */
const paska = (x: number, y: number, w: number, h: number, uhel: number, barva = "#EFE3C2") =>
  `<rect x="${f(x - w / 2)}" y="${f(y - h / 2)}" width="${f(w)}" height="${f(h)}" fill="${barva}" opacity="0.88" transform="rotate(${f(uhel)} ${f(x)} ${f(y)})"/>`;

/** Připínáček: barevná hlavička, stín vpravo dole, odlesk vlevo nahoře */
const pripinacek = (x: number, y: number, barva: string, r = 2.6) =>
  kruh(x + 0.9, y + 1.1, r, `fill="${P.inkoust}" opacity="0.28"`) + kruh(x, y, r, `fill="${barva}"`) + kruh(x - r * 0.32, y - r * 0.32, r * 0.36, `fill="${P.bila}" opacity="0.75"`);

/** Hřebík ve zdi */
const hrebik = (x: number, y: number) => kruh(x, y, 1.3, `fill="${P.kovTma}"`) + kruh(x - 0.4, y - 0.4, 0.5, `fill="${P.kovSvetly}"`);

/** Stín pod papírem nebo cedulkou (světlo zleva shora → stín vpravo dole) */
const stin = (x: number, y: number, w: number, h: number, sila = 0.18, d = 2) => obdelnik(x + d, y + d * 1.2, w, h, `fill="${P.inkoust}" opacity="${sila}"`);

/* ════════════════════ UVNITŘ: výlohy ════════════════════ */

/** Malý závěsný svitek (kakejiku) do úzkého okraje výlohy */
function svitek(cx: number, y: number, malba: "svestka" | "enso") {
  const w = 12;
  const h = 82;
  const x = cx - w / 2;
  let s = stin(x, y, w, h, 0.12, 2);
  s += `<path d="M${f(x + 1.5)} ${f(y)} L${f(cx)} ${f(y - 7)} L${f(x + w - 1.5)} ${f(y)}" stroke="${P.inkoust}" stroke-width="0.6" fill="none" opacity="0.7"/>`;
  s += hrebik(cx, y - 7.5);
  s += obdelnik(x, y, w, h, `fill="#A88E64"`);
  s += obdelnik(x + 1.6, y + 10, w - 3.2, h - 25, `fill="#F7F1E1"`);
  s += obdelnik(x - 0.6, y - 0.6, w + 1.2, 2.6, `fill="${P.drevoTma2}"`);
  s += obdelnik(x - 2.2, y + h - 3.2, w + 4.4, 3.6, `fill="${P.drevoTma2}"`);
  s += obdelnik(x - 3.2, y + h - 3.6, 1.8, 4.4, `fill="${P.drevoHrana}"`) + obdelnik(x + w + 1.4, y + h - 3.6, 1.8, 4.4, `fill="${P.drevoHrana}"`);
  if (malba === "svestka") {
    // větvička švestky: tah tuší a pár červených kvítků
    s += `<path d="M${f(x + 2.6)} ${f(y + 62)} C${f(x + 4)} ${f(y + 50)} ${f(x + 7)} ${f(y + 42)} ${f(x + 9)} ${f(y + 24)} M${f(x + 5.6)} ${f(y + 46)} L${f(x + 9.4)} ${f(y + 40)}" stroke="${P.inkoust}" stroke-width="0.9" fill="none"/>`;
    s += kruhy([[x + 9, y + 25, 1.3], [x + 9.4, y + 39.5, 1.2], [x + 4.6, y + 52, 1.3], [x + 7, y + 33, 1.1]], `fill="${P.rumelka}"`);
  } else {
    // ensó — kruh jedním tahem štětce, dole nedotažený
    s += `<path d="M${f(cx + 1)} ${f(y + 48)} A4.2 4.6 0 1 1 ${f(cx + 3.6)} ${f(y + 44.5)}" stroke="${P.inkoust}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
    s += obdelnik(cx + 1.5, y + 56, 2.4, 2.4, `fill="${P.rumelka}"`);
  }
  return s;
}

/** Úzký papírový proužek se svislým nápisem na hřebíku */
function prouzek(cx: number, y: number, znaky: string) {
  const w = 12;
  const h = 12 + [...znaky].length * 12;
  const x = cx - w / 2;
  return (
    hrebik(cx, y) +
    stin(x, y + 3, w, h, 0.14, 1.6) +
    obdelnik(x, y + 3, w, h, `fill="${P.papir}"`) +
    obdelnik(x, y + 3, w, 2, `fill="${P.rumelka}"`) +
    svisle(cx, y + 18, znaky, 9.6, 12, `fill="${P.inkoust}"`)
  );
}

/** Papírový jeřábek (orizuru) na niti ze stropu výlohy */
function jerab(cx: number, y: number) {
  const c = "#E07A6A";
  let s = cara(cx, NAHORE + 16, cx, y - 1, `stroke="${P.inkoust}" stroke-width="0.5" opacity="0.55"`);
  // z boku: křídlo nahoru, tělo, krk dopředu se zobáčkem, ocas dozadu
  s += mnohouhelnik([[cx - 6, y + 4], [cx, y + 1.5], [cx + 6, y + 4], [cx, y + 7]], `fill="#C25A4C"`);
  s += mnohouhelnik([[cx - 1, y + 3], [cx + 3, y - 8], [cx + 2, y + 4]], `fill="#EA9686"`);
  s += mnohouhelnik([[cx - 2, y + 3.5], [cx - 4, y - 6], [cx + 1, y + 3.5]], `fill="${c}"`);
  s += mnohouhelnik([[cx + 4, y + 4.5], [cx + 7.5, y - 2], [cx + 6, y + 4.5]], `fill="${c}"`);
  s += mnohouhelnik([[cx + 7.5, y - 2], [cx + 9, y - 1.5], [cx + 7, y - 1]], `fill="${c}"`);
  s += mnohouhelnik([[cx - 4, y + 4.5], [cx - 8, y - 1], [cx - 5.5, y + 4.5]], `fill="${c}"`);
  return s;
}

/** Papírový pásek s nápisem pod horní policí */
function pasek(x: number, y: number, w: number, h: number, jp: boolean) {
  let s = stin(x, y, w, h, 0.12, 1.8);
  s += obdelnik(x, y, w, h, `fill="${P.papir}"`);
  s += obdelnik(x, y + h - 1.6, w, 1.6, `fill="${P.papirStin}"`);
  s += jp
    ? napis(x + w / 2 - 4, y + h - 5, "工房の器", 13, PISMO.kanji, `text-anchor="middle" fill="${P.inkoust}"`) + kruh(x + w - 9, y + h / 2, 3.2, `fill="${P.rumelka}"`)
    : napis(x + w / 2, y + h - 5.5, "z naší dílny", 15, PISMO.ruka, `text-anchor="middle" fill="${P.inkoust}"`);
  s += pripinacek(x + 4, y + 4, P.rumelka, 1.8) + pripinacek(x + w - 4, y + 4, P.zlata, 1.8);
  return s;
}

/** Bambusová váza se snítkou (nanten s bobulemi nebo borovice) — stojí na spodní polici */
function bambus(cx: number, pata: number, rostlina: "nanten" | "borovice") {
  const w = 10;
  const h = 38;
  const x = cx - w / 2;
  let s = elipsa(cx + 3, pata - 1, 7, 1.6, `fill="${P.drevoTma2}" opacity="0.2"`);
  // snítka: za trubkou, ať vyrůstá zevnitř
  if (rostlina === "nanten") {
    s += `<path d="M${f(cx)} ${f(pata - h + 2)} C${f(cx - 1)} ${f(pata - h - 10)} ${f(cx + 2)} ${f(pata - h - 22)} ${f(cx - 1)} ${f(pata - h - 34)}" stroke="#6B5236" stroke-width="1.1" fill="none"/>`;
    const listy: [number, number, number][] = [[-3, -8, -35], [3, -14, 35], [-3, -21, -30], [2.6, -27, 30], [-2.4, -32, -20]];
    s += listy.map(([dx, dy, u]) => elipsa(cx + dx, pata - h + dy, 1.8, 4.4, `fill="${P.list}" transform="rotate(${u} ${f(cx + dx)} ${f(pata - h + dy)})"`)).join("");
    s += kruhy([[cx - 1.6, pata - h - 35, 1.4], [cx + 0.8, pata - h - 36.5, 1.4], [cx - 0.4, pata - h - 33.4, 1.3], [cx + 1.6, pata - h - 33.8, 1.2], [cx - 2.2, pata - h - 37.4, 1.1]], `fill="${P.rumelka}"`);
  } else {
    s += `<path d="M${f(cx)} ${f(pata - h + 2)} C${f(cx + 2)} ${f(pata - h - 12)} ${f(cx - 2)} ${f(pata - h - 20)} ${f(cx + 1)} ${f(pata - h - 30)}" stroke="#6B5236" stroke-width="1.3" fill="none"/>`;
    // jehličí jako vějířky
    for (const [dx, dy] of [[0, -30], [-2, -21], [2, -14]] as Bod[]) {
      const bx = cx + dx;
      const by = pata - h + dy;
      s += `<path d="M${f(bx)} ${f(by)} l-5 -4 M${f(bx)} ${f(by)} l-3 -6 M${f(bx)} ${f(by)} l0 -6.5 M${f(bx)} ${f(by)} l3 -6 M${f(bx)} ${f(by)} l5 -4" stroke="${P.listTma}" stroke-width="1" stroke-linecap="round"/>`;
    }
  }
  // trubka se šikmo seříznutým vrškem a kolénkem
  s += mnohouhelnik([[x, pata], [x, pata - h + 4], [x + w, pata - h - 1], [x + w, pata]], `fill="${B.bambus}"`);
  s += mnohouhelnik([[x, pata], [x, pata - h + 4], [x + 2.4, pata - h + 2.8], [x + 2.4, pata]], `fill="${B.bambusSvetly}"`);
  s += obdelnik(x + w - 2.4, pata - h - 0.4, 2.4, h + 0.4, `fill="${B.bambusTma}"`);
  s += obdelnik(x - 0.5, pata - 15, w + 1, 2, `fill="${B.bambusTma}"`) + obdelnik(x - 0.5, pata - 15, w + 1, 0.7, `fill="#E6DCAE"`);
  return s;
}

/** Štos malých lakovaných stojánků (dai) pod kusy — náhradní, čekají na další kus */
function stojanky(cx: number, pata: number) {
  let s = elipsa(cx + 2, pata - 0.6, 8, 1.4, `fill="${P.drevoTma2}" opacity="0.25"`);
  const barvy = [P.cerna, P.rumelkaTma, P.cerna];
  barvy.forEach((b, i) => {
    const y = pata - (i + 1) * 5.4;
    const dx = i === 1 ? 0.8 : -0.4;
    s += obdelnik(cx - 7 + dx, y, 14, 3.4, `rx="0.8" fill="${b}"`) + obdelnik(cx - 6 + dx, y + 3.4, 2, 2, `fill="${b}"`) + obdelnik(cx + 4 + dx, y + 3.4, 2, 2, `fill="${b}"`);
    s += obdelnik(cx - 7 + dx, y, 14, 0.8, `fill="${P.bila}" opacity="0.3"`);
  });
  return s;
}

/** Zadní stěna výlohy, dvě police, skříňka dole a drobnosti v okrajích. strana −1 = levá výloha, 1 = pravá */
function vylohaVnitrek(v: Obdelnik, strana: -1 | 1): string {
  const x0 = v.x;
  const x1 = v.x + v.w;
  const y1 = v.y + v.h;
  const sx0 = x0 + RAM;
  const sx1 = x1 - RAM;
  const p1 = Y.police1;
  const p2 = Y.police2;
  /** Středy vnějšího a vnitřního okraje (pruh 16 mezi rámem a kusem) */
  const venku = strana < 0 ? sx0 + OKRAJ / 2 : sx1 - OKRAJ / 2;
  const blizDveri = strana < 0 ? sx1 - OKRAJ / 2 : sx0 + OKRAJ / 2;
  let s = "";

  // Zadní stěna: světlá omítka, ať kusy vyniknou. Nahoře stín stropu výlohy, vlevo stín sloupu (světlo jde zleva).
  s += obdelnik(x0, v.y, v.w, v.h, `fill="${B.zedVylohy}"`);
  s += obdelnik(x0, v.y, v.w, 44, `fill="${P.drevoTma2}" opacity="0.06"`);
  s += obdelnik(x0, v.y, RAM + OKRAJ, v.h, `fill="${P.drevoTma2}" opacity="0.07"`);
  // Strop výlohy a lišta se světlem (v noci svítí — vrstva svetla)
  s += obdelnik(x0, v.y, v.w, RAM + 4, `fill="${P.drevoTma}"`);
  s += obdelnik(sx0, v.y + RAM, sx1 - sx0, 3.5, `fill="${B.lista}"`);
  s += obdelnik(sx0, v.y + RAM + 3.5, sx1 - sx0, 1, `fill="${P.drevoTma2}" opacity="0.35"`);

  // Police: horní plocha (je vidět shora), přední hrana 26 — na ní leží páska se jménem a tlačítko (HTML)
  for (const p of [p1, p2]) {
    s += obdelnik(x0, p - 9, v.w, 9, `fill="${B.policeVrch}"`);
    s += obdelnik(x0, p - 9, v.w, 1.4, `fill="${P.drevo}" opacity="0.45"`);
    s += obdelnik(x0, p, v.w, HRANA, `fill="${P.drevoSvetle}"`);
    s += obdelnik(x0, p, v.w, 2.4, `fill="${P.drevoHrana}"`);
    s += obdelnik(x0, p + HRANA - 3, v.w, 3, `fill="${P.drevo}"`);
    s += `<path d="M${f(x0)} ${f(p + 9)} C${f(x0 + 90)} ${f(p + 7)} ${f(x0 + 160)} ${f(p + 11)} ${f(x1)} ${f(p + 9)} M${f(x0)} ${f(p + 17)} C${f(x0 + 120)} ${f(p + 19)} ${f(x0 + 200)} ${f(p + 15)} ${f(x1)} ${f(p + 17)}" stroke="${P.drevo}" stroke-width="0.8" fill="none" opacity="0.35"/>`;
  }
  // Stín horní police na zdi
  s += obdelnik(x0, p1 + HRANA, v.w, 9, `fill="${P.drevoTma2}" opacity="0.1"`);

  // Skříňka pod spodní policí: v každé půlce šuplík s kroužkem a dvoje posuvná dvířka, černé kování
  const sk = p2 + HRANA;
  s += obdelnik(x0, sk, v.w, y1 - sk, `fill="${B.skrin}"`);
  s += obdelnik(x0, sk, v.w, 3, `fill="${P.drevoTma2}" opacity="0.55"`);
  const cela: Obd[] = [];
  const svetle: Obd[] = [];
  const tmave: Obd[] = [];
  let kovani = "";
  for (const [a, b] of [[sx0, x0 + PRICKA], [x0 + PRICKA + 12, sx1]] as [number, number][]) {
    const w = b - a;
    const cx = a + w / 2;
    cela.push([a + 4, sk + 6, w - 8, 20]);
    svetle.push([a + 4, sk + 6, w - 8, 1.4]);
    tmave.push([a + 4, sk + 24.6, w - 8, 1.4]);
    const dy = sk + 30;
    const dh = y1 - RAM - dy - 1;
    cela.push([a + 4, dy, w / 2 - 5, dh], [cx + 1, dy, w / 2 - 5, dh]);
    svetle.push([a + 4, dy, w / 2 - 5, 1.2], [cx + 1, dy, w / 2 - 5, 1.2]);
    kovani += elipsa(cx, sk + 12, 5.5, 3.2, `fill="${P.cerna}"`);
    kovani += `<path d="M${f(cx - 4)} ${f(sk + 13)} A4 4.6 0 0 0 ${f(cx + 4)} ${f(sk + 13)}" stroke="${P.cerna}" stroke-width="1.6" fill="none"/>`;
    kovani += elipsa(cx - 9, dy + dh / 2, 2, 3, `fill="${P.drevoTma2}"`) + elipsa(cx + 9, dy + dh / 2, 2, 3, `fill="${P.drevoTma2}"`);
    kovani += `<path d="M${f(a + 5)} ${f(sk + 13)} V${f(sk + 7)} H${f(a + 11)} M${f(b - 11)} ${f(sk + 7)} H${f(b - 5)} V${f(sk + 13)}" stroke="${P.cerna}" stroke-width="2" fill="none"/>`;
  }
  s += obdelniky(cela, `fill="${B.skrinCelo}"`) + obdelniky(svetle, `fill="${P.drevoHrana}" opacity="0.55"`) + obdelniky(tmave, `fill="${P.drevoTma2}" opacity="0.5"`) + kovani;

  // Drobnosti jen v okrajích a v pruhu pod horní policí — přímo za kusy zůstává čistá zeď
  s += svitek(venku, v.y + 32, strana < 0 ? "svestka" : "enso");
  // u dveří: vlevo proužek 一点物 až ve spodní řadě (nahoře visí venku cedulka 営業中),
  // vpravo jeřábek a na spodní polici štos náhradních stojánků pod kusy
  s += strana < 0 ? prouzek(blizDveri, p1 + HRANA + 30, "一点物") : jerab(blizDveri, v.y + 52) + stojanky(blizDveri, p2 - 1);
  const pasX = strana < 0 ? x0 + 28 + 10 : x0 + 160 + 10;
  s += pasek(pasX, p1 + HRANA + 8, 92, 20, strana < 0);
  s += bambus(venku, p2 - 1, strana < 0 ? "nanten" : "borovice");
  return s;
}

/* ════════════════════ UVNITŘ: krámek za dveřmi ════════════════════ */

/** Daruma: jedno oko už domalované, druhé čeká na splněné přání */
function daruma(cx: number, pata: number, v: number) {
  const w = v * 0.86;
  let s = elipsa(cx + 2, pata, w * 0.45, 1.6, `fill="${P.drevoTma2}" opacity="0.3"`);
  s += `<path d="M${f(cx - w / 2)} ${f(pata - v * 0.45)} C${f(cx - w / 2)} ${f(pata - v * 1.02)} ${f(cx + w / 2)} ${f(pata - v * 1.02)} ${f(cx + w / 2)} ${f(pata - v * 0.45)} C${f(cx + w / 2)} ${f(pata - v * 0.06)} ${f(cx + w * 0.3)} ${f(pata)} ${f(cx)} ${f(pata)} C${f(cx - w * 0.3)} ${f(pata)} ${f(cx - w / 2)} ${f(pata - v * 0.06)} ${f(cx - w / 2)} ${f(pata - v * 0.45)} Z" fill="${P.rumelka}"/>`;
  s += `<path d="M${f(cx + w * 0.28)} ${f(pata - v * 0.8)} C${f(cx + w * 0.46)} ${f(pata - v * 0.6)} ${f(cx + w * 0.44)} ${f(pata - v * 0.25)} ${f(cx + w * 0.2)} ${f(pata - v * 0.06)}" stroke="${P.rumelkaTma}" stroke-width="${f(v * 0.08)}" fill="none" opacity="0.6"/>`;
  s += elipsa(cx, pata - v * 0.55, w * 0.29, v * 0.2, `fill="#F7EFE0"`);
  s += kruh(cx - w * 0.12, pata - v * 0.56, v * 0.075, `fill="${P.inkoust}"`);
  s += kruh(cx + w * 0.12, pata - v * 0.56, v * 0.075, `fill="${P.bila}" stroke="${P.inkoust}" stroke-width="0.5"`);
  s += `<path d="M${f(cx - w * 0.2)} ${f(pata - v * 0.67)} q${f(w * 0.08)} ${f(-v * 0.05)} ${f(w * 0.16)} 0 M${f(cx + w * 0.04)} ${f(pata - v * 0.67)} q${f(w * 0.08)} ${f(-v * 0.05)} ${f(w * 0.16)} 0 M${f(cx - w * 0.14)} ${f(pata - v * 0.44)} q${f(w * 0.14)} ${f(v * 0.06)} ${f(w * 0.28)} 0" stroke="${P.inkoust}" stroke-width="0.8" fill="none"/>`;
  s += `<path d="M${f(cx - w * 0.22)} ${f(pata - v * 0.22)} q${f(w * 0.22)} ${f(v * 0.1)} ${f(w * 0.44)} 0" stroke="${P.zlata}" stroke-width="${f(v * 0.06)}" fill="none"/>`;
  s += elipsa(cx - w * 0.26, pata - v * 0.74, w * 0.07, v * 0.12, `fill="${P.bila}" opacity="0.35"`);
  return s;
}

/** Starší elektronkové rádio s obloukovým vrškem */
function radio(x: number, pata: number) {
  const w = 54;
  const h = 42;
  let s = obdelnik(x + 3, pata - 1, w, 2.4, `fill="${P.drevoTma2}" opacity="0.35"`);
  s += `<path d="M${f(x)} ${f(pata)} V${f(pata - h + 14)} Q${f(x)} ${f(pata - h)} ${f(x + 14)} ${f(pata - h)} H${f(x + w - 14)} Q${f(x + w)} ${f(pata - h)} ${f(x + w)} ${f(pata - h + 14)} V${f(pata)} Z" fill="#7A4A2A"/>`;
  s += `<path d="M${f(x + 1.6)} ${f(pata - 2)} V${f(pata - h + 14)} Q${f(x + 1.6)} ${f(pata - h + 1.6)} ${f(x + 14)} ${f(pata - h + 1.6)} H${f(x + 30)}" stroke="${P.drevoHrana}" stroke-width="1.6" fill="none" opacity="0.7"/>`;
  s += obdelnik(x + 5, pata - h + 9, 27, 26, `rx="3" fill="#DCCBA2"`);
  s += obdelniky([0, 1, 2, 3, 4, 5].map((i): Obd => [x + 7.5 + i * 4.2, pata - h + 10, 1.6, 24]), `fill="#7A4A2A"`);
  s += obdelnik(x + 36, pata - h + 10, 14, 11, `rx="1.6" fill="#F3E3B5"`);
  s += `<path d="M${f(x + 37.5)} ${f(pata - h + 14)} h11 M${f(x + 37.5)} ${f(pata - h + 17.5)} h11" stroke="${P.inkoust}" stroke-width="0.4" opacity="0.6"/>`;
  s += cara(x + 44, pata - h + 11, x + 42, pata - h + 20, `stroke="${P.rumelka}" stroke-width="0.9"`);
  s += kruhy([[x + 39, pata - 11, 3.3], [x + 47.5, pata - 11, 3.3]], `fill="${P.drevoTma2}"`);
  s += kruhy([[x + 38.4, pata - 11.6, 1.1], [x + 46.9, pata - 11.6, 1.1]], `fill="${B.mosaz}"`);
  s += obdelniky([[x + 4, pata, 6, 2], [x + w - 10, pata, 6, 2]], `fill="${P.drevoTma2}"`);
  return s;
}

/** Krabice z paulovnie (tomobako) převázaná šňůrou, s papírovým štítkem */
function krabice(x: number, pata: number, w: number, h: number, snura: string) {
  const cx = x + w / 2;
  let s = obdelnik(x, pata - h, w, h, `fill="${B.paulownie}"`);
  s += obdelnik(x, pata - h, w, h * 0.3, `fill="#EEDDB8"`);
  s += obdelnik(x, pata - h + h * 0.3, w, 1, `fill="${B.paulownieStin}"`);
  s += obdelnik(x + w - 3, pata - h, 3, h, `fill="${B.paulownieStin}"`);
  s += obdelnik(cx - 1.5, pata - h, 3, h, `fill="${snura}"`);
  s += elipsa(cx - 3, pata - h + h * 0.3, 3, 1.7, `fill="none" stroke="${snura}" stroke-width="1.2"`) + elipsa(cx + 3, pata - h + h * 0.3, 3, 1.7, `fill="none" stroke="${snura}" stroke-width="1.2"`);
  s += obdelnik(x + 4, pata - h + h * 0.45, 7, h * 0.42, `fill="${P.papir}"`);
  s += `<path d="M${f(x + 7.5)} ${f(pata - h + h * 0.5)} v${f(h * 0.3)}" stroke="${P.inkoust}" stroke-width="0.8" stroke-dasharray="1.6 1.2"/>`;
  return s;
}

/** Štos novin na balení, převázaný provázkem */
function noviny(x: number, pata: number, w: number, n: number, seed: number) {
  const r = nahoda(seed);
  const svetle: Obd[] = [];
  const tmave: Obd[] = [];
  for (let i = 0; i < n; i++) {
    const dx = (r() - 0.5) * 3;
    (i % 2 ? svetle : tmave).push([x + dx, pata - (i + 1) * 3, w, 3]);
  }
  let s = obdelniky(tmave, `fill="${B.novinyTma}"`) + obdelniky(svetle, `fill="${B.novinySvetle}"`);
  s += obdelniky([[x + 3, pata - n * 3 - 2, w * 0.4, 1.2], [x + 3, pata - n * 3 - 0.2, w * 0.7, 0.6]], `fill="${B.tisk}"`);
  s += obdelnik(x + w * 0.62, pata - n * 3 - 1, 1.8, n * 3 + 1, `fill="${B.juta}"`);
  return s;
}

/** Cívka šňůry z boku */
function civka(cx: number, pata: number, w: number, h: number, barva: string, pruh: string) {
  let s = obdelnik(cx - w / 2 - 1, pata - h, w + 2, 2.4, `fill="${P.drevoSvetle}"`) + obdelnik(cx - w / 2 - 1, pata - 2.4, w + 2, 2.4, `fill="${P.drevoSvetle}"`);
  s += obdelnik(cx - w / 2, pata - h + 2.4, w, h - 4.8, `fill="${barva}"`);
  let d = "";
  for (let y = pata - h + 4; y < pata - 3; y += 2.6) d += `M${f(cx - w / 2)} ${f(y)} l${f(w)} 1.6`;
  s += `<path d="${d}" stroke="${pruh}" stroke-width="0.9" opacity="0.7"/>`;
  s += obdelnik(cx + w / 2 - 2.4, pata - h + 2.4, 2.4, h - 4.8, `fill="${P.drevoTma2}" opacity="0.18"`);
  return s;
}

/** Štos složených šátků (furoshiki) */
function satky(x: number, pata: number, w: number) {
  const barvy = [P.indigo, P.rumelka, B.zluta, B.salvej, "#E8DCC8"];
  let s = "";
  barvy.forEach((b, i) => {
    const y = pata - (i + 1) * 5;
    const dx = i % 2 ? 1.5 : -1;
    s += `<path d="M${f(x + dx)} ${f(y + 5)} V${f(y + 1.6)} Q${f(x + dx)} ${f(y)} ${f(x + dx + 2)} ${f(y)} H${f(x + dx + w - 2)} Q${f(x + dx + w)} ${f(y)} ${f(x + dx + w)} ${f(y + 1.6)} V${f(y + 5)} Z" fill="${b}"/>`;
  });
  s += kruhy([[x + 6, pata - 2.6, 0.7], [x + 11, pata - 2.4, 0.7], [x + 16, pata - 2.6, 0.7], [x + 21, pata - 2.4, 0.7]], `fill="${P.bila}" opacity="0.8"`);
  return s;
}

/** Potos v květináči, šlahouny přes hranu police */
function kytka(cx: number, pata: number) {
  let s = mnohouhelnik([[cx - 7, pata - 12], [cx + 7, pata - 12], [cx + 5.6, pata], [cx - 5.6, pata]], `fill="#B9714A"`);
  s += obdelnik(cx - 7.6, pata - 13.4, 15.2, 2.8, `fill="#C98260"`);
  s += `<path d="M${f(cx - 3)} ${f(pata - 13)} C${f(cx - 10)} ${f(pata - 8)} ${f(cx - 9)} ${f(pata + 8)} ${f(cx - 6)} ${f(pata + 18)} M${f(cx + 3)} ${f(pata - 13)} C${f(cx + 10)} ${f(pata - 6)} ${f(cx + 8)} ${f(pata + 4)} ${f(cx + 10)} ${f(pata + 12)}" stroke="#5B7A3E" stroke-width="0.9" fill="none"/>`;
  const listy: [number, number, number, string][] = [
    [cx - 4, pata - 18, -20, P.list], [cx + 3, pata - 20, 25, P.listSvetly], [cx, pata - 16, 0, P.listTma],
    [cx - 9, pata - 6, -40, P.list], [cx - 9, pata + 4, -10, P.listSvetly], [cx - 6.5, pata + 15, 10, P.list],
    [cx + 9, pata - 4, 35, P.listTma], [cx + 9.6, pata + 9, 15, P.list],
  ];
  s += listy.map(([x, y, u, c]) => `<path d="M${f(x)} ${f(y + 4)} C${f(x - 4)} ${f(y + 1)} ${f(x - 3.6)} ${f(y - 4)} ${f(x)} ${f(y - 2.4)} C${f(x + 3.6)} ${f(y - 4)} ${f(x + 4)} ${f(y + 1)} ${f(x)} ${f(y + 4)} Z" fill="${c}" transform="rotate(${u} ${f(x)} ${f(y)})"/>`).join("");
  return s;
}

/** Konce rolí balicího papíru (pyramida, čelem k nám) */
function role(x: number, pata: number) {
  const r = 8.6;
  const barvy = [B.juta, "#F1ECE0", "#E7C3B2", "#F1ECE0", B.juta, "#C9D5C4"];
  const mista: Bod[] = [[0, 0], [2, 0], [4, 0], [1, 1], [3, 1], [2, 2]];
  let s = "";
  mista.forEach(([i, j], k) => {
    const cx = x + r + i * r;
    const cy = pata - r - j * r * 1.72;
    s += kruh(cx, cy, r, `fill="${barvy[k]}"`);
    s += kruh(cx, cy, r * 0.62, `fill="none" stroke="${P.drevoTma2}" stroke-width="0.5" opacity="0.35"`);
    s += kruh(cx, cy, r * 0.22, `fill="${P.drevoTma}"`);
  });
  return s;
}

/** Proutěný košík */
function kosik(x: number, pata: number, w: number, h: number) {
  let s = `<path d="M${f(x)} ${f(pata - h)} H${f(x + w)} L${f(x + w - 2)} ${f(pata)} H${f(x + 2)} Z" fill="#C49A5E"/>`;
  let d = "";
  for (let y = pata - h + 3; y < pata; y += 3) d += `M${f(x + 1)} ${f(y)} H${f(x + w - 1)}`;
  s += `<path d="${d}" stroke="#9A7440" stroke-width="0.8"/>`;
  s += `<path d="M${f(x + 2)} ${f(pata - h)} Q${f(x + w / 2)} ${f(pata - h - 10)} ${f(x + w - 2)} ${f(pata - h)}" stroke="#9A7440" stroke-width="1.4" fill="none"/>`;
  return s;
}

/** Regál na zadní stěně vlevo: tři police se zásobami, které nejsou keramika */
function regal() {
  const xl = DV.x + 26;
  const xp = 1632;
  const top = NAHORE + 16;
  const dno = PULT.y - 8;
  const desky = [1420, 1484, 1548];
  let s = obdelnik(xl + 6, top, xp - xl - 12, dno - top, `fill="${B.regal}"`);
  s += obdelniky(desky.map((d): Obd => [xl + 6, d + 6, xp - xl - 12, 9]), `fill="${P.drevoTma2}" opacity="0.28"`);
  // horní plochy polic
  s += obdelniky(desky.map((d): Obd => [xl, d - 4, xp - xl, 4]), `fill="${P.drevoHrana}"`);
  // horní police (většinou za norenem): role papíru, daruma, košík
  s += role(xl + 8, desky[0] - 1);
  s += daruma(1578, desky[0] - 1, 30);
  s += kosik(1598, desky[0] - 1, 24, 18);
  // prostřední: noviny, dvě krabice, cívky šňůr (červenobílá na mizuhiki)
  s += noviny(xl + 9, desky[1] - 1, 36, 7, 1484);
  s += krabice(1552, desky[1] - 1, 34, 20, P.indigo) + krabice(1556, desky[1] - 21, 27, 16, P.rumelka);
  s += civka(1596, desky[1] - 1, 12, 20, B.juta, B.jutaTma) + civka(1610, desky[1] - 1, 10, 17, "#F2ECE2", P.rumelka);
  // spodní (za Cedulkou na pultu jen nízké a klidné): šátky, kytka, rádio
  s += satky(xl + 9, desky[2] - 1, 34);
  s += kytka(1554, desky[2] - 1);
  s += radio(1569, desky[2] - 1);
  // přední hrany polic a bočnice
  s += obdelniky(desky.map((d): Obd => [xl, d, xp - xl, 6]), `fill="${P.drevo}"`);
  s += obdelniky(desky.map((d): Obd => [xl, d, xp - xl, 1.2]), `fill="${P.drevoHrana}" opacity="0.8"`);
  s += obdelnik(xl, top, 6, dno - top, `fill="${P.drevo}"`) + obdelnik(xl, top, 1.6, dno - top, `fill="${P.drevoHrana}" opacity="0.7"`);
  s += obdelnik(xp - 6, top, 6, dno - top, `fill="${P.drevoTma}"`);
  return s;
}

/** Kamidana nad hodinami: police se svatyňkou, sakaki, provaz šimenawa a papírové šide */
function kamidana() {
  const x0 = 1644;
  const x1 = 1712;
  const cx = (x0 + x1) / 2;
  const d = 1420;
  let s = "";
  // konzoly a police
  s += mnohouhelnik([[x0 + 4, d + 5], [x0 + 12, d + 5], [x0 + 4, d + 14]], `fill="${P.drevoTma}"`) + mnohouhelnik([[x1 - 4, d + 5], [x1 - 12, d + 5], [x1 - 4, d + 14]], `fill="${P.drevoTma}"`);
  s += obdelnik(x0, d - 3, x1 - x0, 3, `fill="${P.drevoHrana}"`) + obdelnik(x0, d, x1 - x0, 5, `fill="${P.drevo}"`);
  // svatyňka (miyagata): podstavec, tělo s dvířky, střecha
  s += obdelnik(cx - 17, d - 9, 34, 6, `fill="#D9C08E"`);
  s += obdelnik(cx - 13, d - 31, 26, 22, `fill="${B.paulownie}"`);
  s += obdelnik(cx - 7, d - 27, 6.4, 16, `fill="#CDB07A"`) + obdelnik(cx + 0.6, d - 27, 6.4, 16, `fill="#CDB07A"`);
  s += kruh(cx - 1.4, d - 19, 0.9, `fill="${B.mosaz}"`) + kruh(cx + 1.4, d - 19, 0.9, `fill="${B.mosaz}"`);
  s += `<path d="M${f(cx - 22)} ${f(d - 30)} Q${f(cx - 10)} ${f(d - 33)} ${f(cx)} ${f(d - 44)} Q${f(cx + 10)} ${f(d - 33)} ${f(cx + 22)} ${f(d - 30)} L${f(cx + 20)} ${f(d - 27)} H${f(cx - 20)} Z" fill="#5C4632"/>`;
  s += obdelnik(cx - 5, d - 46, 10, 3, `fill="${B.mosaz}"`);
  // sakaki ve dvou bílých vázičkách
  for (const vx of [x0 + 6, x1 - 6]) {
    s += obdelnik(vx - 3, d - 11, 6, 8, `rx="1.5" fill="#F4F1EA"`);
    s += [[-3, -16, -30], [2, -18, 30], [-1, -22, -10], [3, -13, 50]].map(([dx, dy, u]) => elipsa(vx + dx, d + dy, 1.8, 3.6, `fill="${P.listTma}" transform="rotate(${u} ${f(vx + dx)} ${f(d + dy)})"`)).join("");
  }
  // šimenawa: kroucený provaz přes hranu police, prověšený
  const provaz = `M${f(x0 + 1)} ${f(d + 4)} Q${f(cx)} ${f(d + 14)} ${f(x1 - 1)} ${f(d + 4)}`;
  s += `<path d="${provaz}" stroke="#C9A85E" stroke-width="4.4" fill="none" stroke-linecap="round"/>`;
  s += `<path d="${provaz}" stroke="#9C7E3E" stroke-width="4.4" fill="none" stroke-dasharray="1.6 3"/>`;
  // šide: bílé papírové klikatky, každý článek šikmo na opačnou stranu
  for (const [sx, sy] of [[cx - 17, d + 9.5], [cx + 17, d + 9.5]] as Bod[]) {
    let dd = "";
    for (let k = 0; k < 4; k++) {
      const y = sy + k * 5;
      const o = k % 2 ? -1 : 1;
      const x = sx - 2.4 + (k % 2 ? 2.4 : 0);
      dd += `M${f(x)} ${f(y)} h4.8 l${f(o * 2.4)} 5 h-4.8 z`;
    }
    s += `<path d="${dd}" fill="${P.bila}"/>`;
    s += `<path d="${dd}" fill="none" stroke="${P.papirStin}" stroke-width="0.4"/>`;
  }
  return s;
}

/** Smaltovaná lampa nad pultem (bez světla — to je ve vrstvě svetla) */
function lampa() {
  const cx = 1600;
  let s = obdelnik(cx - 6, NAHORE + 16, 12, 4, `fill="${P.drevoTma}"`);
  s += cara(cx, NAHORE + 20, cx, 1426, `stroke="${P.inkoust}" stroke-width="1.3"`);
  s += obdelnik(cx - 4, 1423, 8, 8, `rx="1" fill="${P.inkoust}"`);
  s += `<path d="M${cx - 9} 1430 L${cx + 9} 1430 L${cx + 35} 1453 Q${cx} 1458 ${cx - 35} 1453 Z" fill="${B.smalt}"/>`;
  s += `<path d="M${cx - 9} 1430 L${cx - 4} 1430 L${cx - 24} 1454 L${cx - 31} 1453.4 Z" fill="${B.smaltSvetly}" opacity="0.85"/>`;
  s += elipsa(cx, 1453.5, 35, 4.2, `fill="#F1EADB"`);
  s += elipsa(cx, 1454.2, 31, 2.8, `fill="#D8CDB6"`);
  s += elipsa(cx, 1457, 6, 4.6, `fill="#F6EFD9"`);
  return s;
}

/** Stará pokladna: zásuvka, šikmá klávesnice, věžička s okénkem a mosazným hřebínkem */
function pokladna(x: number, pata: number) {
  const tmava = "#3D4A42";
  let s = obdelnik(x + 4, pata - 1, 60, 2.4, `fill="${P.drevoTma2}" opacity="0.35"`);
  s += obdelnik(x - 2, pata - 15, 64, 15, `fill="#2E3832"`);
  s += obdelnik(x - 2, pata - 15, 64, 1.4, `fill="#5C6B62"`);
  s += obdelnik(x + 25, pata - 9, 10, 2.6, `rx="1" fill="${B.mosaz}"`);
  s += mnohouhelnik([[x, pata - 15], [x + 60, pata - 15], [x + 55, pata - 42], [x + 5, pata - 42]], `fill="${tmava}"`);
  s += mnohouhelnik([[x, pata - 15], [x + 5, pata - 42], [x + 7.5, pata - 42], [x + 3, pata - 15]], `fill="#5C6B62"`);
  const klavesy: [number, number, number][] = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) klavesy.push([x + 10 + c * 8 + r * 0.7, pata - 20 - r * 6, 2.3]);
  s += kruhy(klavesy.map(([a, b]) => [a + 0.4, b + 0.5, 2.6]), `fill="${P.cerna}"`);
  s += kruhy(klavesy, `fill="#F1E6D0"`);
  s += kruhy(klavesy.filter((_, i) => i % 7 === 3).map(([a, b]): [number, number, number] => [a, b, 2.3]), `fill="${P.rumelka}"`);
  s += obdelnik(x + 14, pata - 58, 32, 16, `fill="${tmava}"`);
  s += obdelnik(x + 18, pata - 55, 24, 8, `fill="#F4E9C8"`);
  s += obdelniky([[x + 21, pata - 53.6, 3, 5], [x + 27, pata - 53.6, 3, 5], [x + 33, pata - 53.6, 3, 5]], `fill="${P.inkoust}" opacity="0.75"`);
  s += `<path d="M${f(x + 11)} ${f(pata - 58)} Q${f(x + 30)} ${f(pata - 66)} ${f(x + 49)} ${f(pata - 58)} Z" fill="${B.mosaz}"/>`;
  s += obdelnik(x + 10, pata - 58.6, 40, 1.6, `fill="${B.mosaz}"`);
  s += obdelnik(x - 2, pata - 43, 64, 1.6, `fill="${B.mosaz}"`);
  return s;
}

/** Počítadlo soroban opřené o zeď */
function soroban(x: number, pata: number) {
  const w = 13;
  const h = 50;
  let s = otoc(5, x + w / 2, pata, (() => {
    let t = obdelnik(x, pata - h, w, h, `fill="#4A2F1E"`);
    t += obdelnik(x + 1.6, pata - h + 1.6, w - 3.2, h - 3.2, `fill="#6E4A30"`);
    t += obdelnik(x + 4.2, pata - h + 1.6, 1.2, h - 3.2, `fill="#3E2819"`);
    const k: [number, number, number][] = [];
    for (let i = 0; i < 8; i++) {
      const y = pata - h + 5 + i * 5.6;
      k.push([x + 3, y, 1.2]);
      for (let j = 0; j < 3; j++) k.push([x + 7 + j * 2.1 + (i % 3 === 0 && j === 0 ? -0.6 : 0), y, 1.1]);
    }
    t += kruhy(k, `fill="#2B2420"`);
    return t;
  })());
  return s;
}

/** Balíček zabalený do novin a převázaný provázkem — jak se tu kusy balí */
function balicek(x: number, pata: number, w: number, h: number) {
  let s = elipsa(x + w / 2 + 3, pata, w / 2 + 2, 1.8, `fill="${P.drevoTma2}" opacity="0.28"`);
  s += obdelnik(x, pata - h, w, h, `rx="2" fill="#E9E4D6"`);
  s += obdelnik(x + 4, pata - h + 3, w * 0.5, 2.6, `fill="#6E6A62"`);
  let d = "";
  for (let r = 0; r < 4; r++) for (const [a, b] of [[4, 17], [20, w - 5]]) d += `M${f(x + a)} ${f(pata - h + 9 + r * 3.4)}H${f(x + b)}`;
  s += `<path d="${d}" stroke="${B.tisk}" stroke-width="1" opacity="0.65"/>`;
  s += mnohouhelnik([[x + w - 12, pata - h], [x + w, pata - h], [x + w, pata - h + 9]], `fill="${B.novinyTma}"`);
  s += obdelnik(x + w * 0.56, pata - h, 1.6, h, `fill="${B.juta}"`) + obdelnik(x, pata - h * 0.46, w, 1.6, `fill="${B.juta}"`);
  s += elipsa(x + w * 0.56 - 3, pata - h - 1.4, 3.4, 2, `fill="none" stroke="${B.juta}" stroke-width="1.3"`) + elipsa(x + w * 0.56 + 4.4, pata - h - 1.4, 3.4, 2, `fill="none" stroke="${B.juta}" stroke-width="1.3"`);
  return s;
}

/** Mosazný zvonek na pultu */
function zvonek(cx: number, pata: number) {
  let s = elipsa(cx, pata - 1, 7.4, 2, `fill="${P.inkoust}"`);
  s += `<path d="M${f(cx - 6.4)} ${f(pata - 2)} Q${f(cx - 6.4)} ${f(pata - 11.6)} ${f(cx)} ${f(pata - 11.6)} Q${f(cx + 6.4)} ${f(pata - 11.6)} ${f(cx + 6.4)} ${f(pata - 2)} Z" fill="${P.zlata}"/>`;
  s += `<path d="M${f(cx - 4.4)} ${f(pata - 3)} Q${f(cx - 4.4)} ${f(pata - 9)} ${f(cx - 1)} ${f(pata - 10)}" stroke="${P.bila}" stroke-width="1.1" fill="none" opacity="0.6"/>`;
  s += obdelnik(cx - 1, pata - 15, 2, 3.6, `fill="${P.inkoust}"`);
  return s;
}

/** Pult: deska nahoře na PRIZEMI.pult.y, čelo s mřížkou, sokl, před ním pruh podlahy */
function pult() {
  const vrch = PULT.y;
  const x0 = PULT.x - 3;
  const x1 = PULT.x + PULT.w + 3;
  const celoDole = 1706;
  let s = "";
  // podlaha z prken mezi soklem pultu a prahem
  s += obdelnik(DV.x, celoDole + 6, DV.w, DOLE - celoDole - 6, `fill="${B.podlaha}"`);
  s += obdelnik(DV.x, celoDole + 6, DV.w, 3, `fill="${P.drevoTma2}" opacity="0.3"`);
  s += `<path d="M${DV.x} ${celoDole + 13} H${DV.x + DV.w} M${DV.x} ${celoDole + 19} H${DV.x + DV.w}" stroke="${P.drevo}" stroke-width="0.8" opacity="0.55"/>`;
  // čelo: rám a mřížka (koši)
  s += obdelnik(PULT.x, vrch + 8, PULT.w, celoDole - vrch - 8, `fill="url(#kd-pr-mrize)"`);
  const pricka = vrch + 62;
  s += obdelniky([[PULT.x, vrch + 8, PULT.w, 7], [PULT.x, celoDole - 8, PULT.w, 8], [PULT.x, pricka, PULT.w, 6], [PULT.x, vrch + 8, 9, celoDole - vrch - 8], [PULT.x + PULT.w - 9, vrch + 8, 9, celoDole - vrch - 8], [PULT.x + PULT.w / 2 - 4.5, vrch + 8, 9, celoDole - vrch - 8]], `fill="${P.drevo}"`);
  s += obdelniky([[PULT.x, celoDole - 8, PULT.w, 1.2], [PULT.x, pricka, PULT.w, 1.2], [PULT.x, vrch + 8, 1.6, celoDole - vrch - 8], [PULT.x + PULT.w / 2 - 4.5, vrch + 15, 1.6, celoDole - vrch - 23]], `fill="${P.drevoHrana}" opacity="0.6"`);
  s += obdelniky([[PULT.x, pricka + 6, PULT.w, 2], [PULT.x, vrch + 15, PULT.w, 2]], `fill="${P.drevoTma2}" opacity="0.4"`);
  s += obdelnik(PULT.x + 3, celoDole, PULT.w - 6, 6, `fill="${P.drevoTma2}"`);
  // deska: horní plocha, čelo desky, stín pod ní
  s += obdelnik(x0, vrch - 9, x1 - x0, 9, `fill="${B.pultVrch}"`);
  s += obdelnik(x0, vrch - 9, x1 - x0, 1.2, `fill="${P.drevo}" opacity="0.5"`);
  s += obdelnik(x0, vrch, x1 - x0, 8, `fill="${B.pultCelo}"`);
  s += obdelnik(x0, vrch, x1 - x0, 1.5, `fill="#D9B88E"`);
  s += obdelnik(PULT.x, vrch + 8, PULT.w, 4, `fill="${P.drevoTma2}" opacity="0.45"`);
  // na desce (levý kus x 1490–1560 nechává volný pro Cedulku): zvonek, balíček v novinách, soroban, pokladna
  s += zvonek(1573, vrch - 2.5);
  s += balicek(1586, vrch - 2, 40, 23);
  s += soroban(1636, vrch - 2.5);
  s += pokladna(1652, vrch - 2.5);
  return s;
}

function kramVnitrek() {
  const x0 = DV.x;
  let s = "";
  // Stěna krámku: hlouběji, tak o kus tmavší než výlohy; nahoře stín stropu
  s += obdelnik(x0, NAHORE, DV.w, DV.h, `fill="${B.zedKramu}"`);
  s += obdelnik(x0, NAHORE, DV.w, 64, `fill="${P.drevoTma2}" opacity="0.12"`);
  // Strop s trámem
  s += obdelnik(x0, NAHORE, DV.w, 16, `fill="${P.drevoTma2}"`);
  s += obdelnik(x0, NAHORE + 16, DV.w, 3, `fill="${P.drevoTma}"`);
  // Regál vlevo, sloupek, kamidana nad hodinami
  s += regal();
  s += obdelnik(1632, NAHORE + 16, 8, PULT.y - NAHORE - 24, `fill="${P.drevoTma}"`) + obdelnik(1632, NAHORE + 16, 1.6, PULT.y - NAHORE - 24, `fill="${P.drevo}"`);
  s += kamidana();
  // Hodiny jsou HTML — tady jen prázdná zeď a hřebík s kouskem šňůrky nad nimi
  const hx = PRIZEMI.hodiny.x + PRIZEMI.hodiny.w / 2;
  s += cara(hx, 1446, hx, PRIZEMI.hodiny.y + 2, `stroke="${P.inkoust}" stroke-width="0.7" opacity="0.6"`) + hrebik(hx, 1446);
  s += lampa();
  s += pult();
  return s;
}

/* ════════════════════ ZEM: schod a podlážka ════════════════════ */

function zem(): string {
  const r = nahoda(1765);
  const x0 = X.zedL;
  const x1 = X.zedP;
  const ch = Y.chodnik;
  let s = "";
  // ——— Kamenný schod (žula) přes celé průčelí: čtyři desky souměrně, krajní o tón tmavší ———
  const desky: [number, number, string][] = [[x0, 1350, "#B9AF9E"], [1350, 1600, P.kamen], [1600, 1850, P.kamen], [1850, x1, "#B9AF9E"]];
  for (const [a, b, c] of desky) s += obdelnik(a, DOLE, b - a, ch - DOLE, `fill="${c}"`);
  // horní plocha na světle; před dveřmi vyšlapaná, světlejší a hladší
  s += obdelnik(x0, DOLE, x1 - x0, 7, `fill="#D5CDBE"`);
  s += `<path d="M${DV.x - 30} ${DOLE} H${DV.x + DV.w + 30} L${DV.x + DV.w + 18} ${DOLE + 7} H${DV.x - 18} Z" fill="#DFD8CB"/>`;
  s += obdelnik(x0, DOLE + 7, x1 - x0, 1.6, `fill="#ECE6DA"`);
  // čelo: zkosená spodní hrana a stín u chodníku
  s += obdelnik(x0, ch - 9, x1 - x0, 4, `fill="${P.kamenTma}" opacity="0.45"`);
  s += obdelnik(x0, ch - 5, x1 - x0, 5, `fill="${P.kamenTma}"`);
  // spáry mezi deskami — souměrně
  for (const x of [1350, 1600, 1850]) s += obdelnik(x - 1, DOLE, 2, ch - DOLE, `fill="#8E8475"`) + obdelnik(x + 1, DOLE + 8.6, 1.2, ch - DOLE - 14, `fill="#D4CCBD"`);
  // pár skvrn, žilka v kameni a odštípnuté hrany (nesouměrné — schod je starý)
  s += mnohouhelnik([[1236, DOLE + 7], [1252, DOLE + 7], [1246, DOLE + 13]], `fill="${P.kamenTma}" opacity="0.7"`);
  s += mnohouhelnik([[1968, DOLE + 7], [1978, DOLE + 7], [1974, DOLE + 11]], `fill="${P.kamenTma}" opacity="0.6"`);
  s += mnohouhelnik([[2100, DOLE + 9], [2100, DOLE + 20], [2093, DOLE + 9]], `fill="${P.kamenTma}" opacity="0.8"`);
  s += elipsa(1452, ch - 15, 22, 4, `fill="${P.kamenTma}" opacity="0.22"`) + elipsa(1790, ch - 17, 14, 3, `fill="${P.kamenTma}" opacity="0.2"`) + elipsa(1150, ch - 18, 18, 3, `fill="${P.kamenTma}" opacity="0.18"`);
  s += `<path d="M1660 ${DOLE + 12} q30 6 52 2 t44 8 M1170 ${DOLE + 20} q24 -4 40 2" stroke="#D2CAB9" stroke-width="1" fill="none" opacity="0.8"/>`;
  // mech ve spárách u krajů
  s += `<path d="M1349 ${ch - 5} q1 -6 2 0 M1847 ${ch - 5} q1.5 -7 3 0 M1851 ${ch - 5} q1 -4 2 0" stroke="${P.list}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  // ——— Dřevěná podlážka na chodníku ———
  const d0 = 1080;
  const d1 = 2120;
  const prkna: [number, string][] = [[ch, "#BD9268"], [ch + 8, "#B0865D"], [ch + 16, "#B98E63"]];
  s += obdelnik(d0, ch, d1 - d0, 4, `fill="${P.drevoTma2}" opacity="0.35"`);
  const spoje: Obd[] = [];
  prkna.forEach(([y, c], i) => {
    s += obdelnik(d0, y, d1 - d0, 8, `fill="${c}"`);
    s += obdelnik(d0, y + 0.8, d1 - d0, 1, `fill="#D8B48A" opacity="0.6"`);
    let x = d0 + 60 + i * 95 + r() * 40;
    while (x < d1 - 30) {
      spoje.push([x, y, 1.4, 8]);
      x += 230 + r() * 90;
    }
  });
  s += obdelnik(d0, ch, d1 - d0, 2.6, `fill="${P.drevoTma2}" opacity="0.45"`);
  s += obdelniky([[d0, ch + 7.4, d1 - d0, 1.2], [d0, ch + 15.4, d1 - d0, 1.2]], `fill="${P.drevoTma2}" opacity="0.7"`);
  s += obdelniky(spoje, `fill="${P.drevoTma2}" opacity="0.6"`);
  // rohožka před dveřmi: kokos s indigovým lemem, ležící v perspektivě podlážky
  const r0 = ch + 3.5;
  const r1 = ch + 21.5;
  s += mnohouhelnik([[1504, r1 + 1.6], [1698, r1 + 1.6], [1696, r1], [1506, r1]], `fill="${P.inkoust}" opacity="0.25"`);
  s += mnohouhelnik([[1514, r0], [1686, r0], [1696, r1], [1504, r1]], `fill="${P.indigo}"`);
  s += mnohouhelnik([[1521, r0 + 2.4], [1679, r0 + 2.4], [1686.4, r1 - 2.8], [1513.6, r1 - 2.8]], `fill="#B08A57"`);
  s += `<path d="M1519 ${f(r0 + 7)} H1681 M1517 ${f(r0 + 11.4)} H1683 M1515.5 ${f(r1 - 6)} H1684.5" stroke="#8E6B3E" stroke-width="0.9"/>`;
  s += `<path d="M1520 ${f(r0 + 2.6)} H1680" stroke="#4B5C98" stroke-width="0.8"/>`;
  // čelo podlážky, hlavičky hřebíků, stín na chodníku
  s += obdelnik(d0, ch + 24, d1 - d0, 8, `fill="${P.drevo}"`);
  s += obdelnik(d0, ch + 24, d1 - d0, 1.2, `fill="${P.drevoHrana}" opacity="0.7"`);
  const hreb: [number, number, number][] = [];
  for (let x = d0 + 20; x < d1; x += 130) hreb.push([x, ch + 28, 0.9], [x + 6, ch + 28, 0.9]);
  s += kruhy(hreb, `fill="${P.drevoTma2}"`);
  s += obdelniky([[d0 + 260, ch + 24, 1.2, 8], [d0 + 520, ch + 24, 1.2, 8], [d0 + 780, ch + 24, 1.2, 8]], `fill="${P.drevoTma2}" opacity="0.6"`);
  s += obdelnik(d0, ch + 24, 3, 8, `fill="${P.drevoTma}"`) + obdelnik(d1 - 3, ch + 24, 3, 8, `fill="${P.drevoTma}"`);
  s += mnohouhelnik([[d0 + 2, ch + 32], [d1, ch + 32], [d1 + 8, ch + 38], [d0 + 10, ch + 38]], `fill="${P.inkoust}" opacity="0.2"`);
  return s;
}

/* ════════════════════ PŘEDNÍ: výlohy zvenku ════════════════════ */

/** Papírek nalepený zevnitř na skle v dolním rohu */
function listek(x: number, y: number, w: number, h: number, uhel: number, obsah: string, barva: string = P.papir) {
  return otoc(uhel, x + w / 2, y + h / 2, stin(x, y, w, h, 0.16, 1.4) + obdelnik(x, y, w, h, `fill="${barva}"`) + obsah + paska(x + 3, y + 1, 12, 4.4, -35) + paska(x + w - 3, y + 1, 12, 4.4, 35));
}

/** Sklo, rám s jednou příčkou a papírky v dolních rozích */
function vylohaPred(v: Obdelnik, strana: -1 | 1): string {
  const x0 = v.x;
  const x1 = v.x + v.w;
  const y0 = v.y;
  const y1 = v.y + v.h;
  const px = x0 + PRICKA;
  let s = "";
  // Sklo: jemný chladný nádech a šikmé odlesky — i přes sebe zůstanou přes kusy pod 0,12
  s += obdelnik(x0 + RAM, y0 + RAM, v.w - 2 * RAM, v.h - 2 * RAM, `fill="#DCE8F0" opacity="0.04"`);
  for (const [a, b] of [[x0 + RAM, px], [px + 12, x1 - RAM]] as [number, number][]) {
    const w = b - a;
    s += mnohouhelnik([[a, y0 + 150], [a + 54, y0 + RAM], [a + 84, y0 + RAM], [a, y0 + 222]], `fill="${P.bila}" opacity="0.08"`);
    s += mnohouhelnik([[a + w * 0.55, y1 - RAM], [b, y0 + 210], [b, y0 + 236], [a + w * 0.7, y1 - RAM]], `fill="${P.bila}" opacity="0.07"`);
  }
  // Stín sloupu vlevo na rámu (světlo zleva)
  // Rám: horní, dolní, boky a jedna příčka uprostřed
  const dily: Obd[] = [[x0, y0, v.w, RAM], [x0, y1 - RAM, v.w, RAM], [x0, y0, RAM, v.h], [x1 - RAM, y0, RAM, v.h], [px, y0, 12, v.h]];
  s += obdelniky(dily, `fill="${B.ram}"`);
  s += obdelniky([[x0 + RAM - 1.4, y0 + RAM, 1.4, v.h - 2 * RAM], [x1 - RAM, y0 + RAM, 1.4, v.h - 2 * RAM], [px - 0.2, y0 + RAM, 1.2, v.h - 2 * RAM], [px + 11, y0 + RAM, 1.2, v.h - 2 * RAM], [x0 + RAM, y0 + RAM - 1.2, v.w - 2 * RAM, 1.2]], `fill="${P.inkoust}" opacity="0.5"`);
  s += obdelniky([[x0, y0, 2, v.h], [x1 - RAM + 1.4, y0 + RAM, 1.8, v.h - 2 * RAM], [px + 1, y0 + RAM, 1.8, v.h - 2 * RAM], [x0 + RAM, y1 - RAM, v.w - 2 * RAM, 1.8], [x0, y0, v.w, 1.6]], `fill="${P.drevoSvetle}" opacity="0.75"`);
  s += obdelnik(x0, y0, 10, v.h, `fill="${P.inkoust}" opacity="0.14"`);
  // Mosazné rohovníky v rozích rámu a šroubky
  let rohy = "";
  const sroubky: [number, number, number][] = [];
  for (const [cx, cy, sx, sy] of [[x0 + 1.5, y0 + 1.5, 1, 1], [x1 - 1.5, y0 + 1.5, -1, 1], [x0 + 1.5, y1 - 1.5, 1, -1], [x1 - 1.5, y1 - 1.5, -1, -1]]) {
    rohy += `M${f(cx)} ${f(cy)} h${f(sx * 10.5)} v${f(sy * 2.6)} h${f(-sx * 7.9)} v${f(sy * 7.9)} h${f(-sx * 2.6)} z`;
    sroubky.push([cx + sx * 1.3, cy + sy * 1.3, 0.6]);
  }
  s += `<path d="${rohy}" fill="${B.mosaz}"/>` + kruhy(sroubky, `fill="#7E6526"`);
  // Papírky v dolních rozích skla (nad skříňkou, mimo kusy)
  const yl = 1664;
  if (strana < 0) {
    s += listek(x0 + RAM + 4, yl, 48, 52, -3,
      napis(x0 + RAM + 28, yl + 22, "どうぞ", 13, PISMO.kanji, `text-anchor="middle" fill="${P.inkoust}"`) +
      napis(x0 + RAM + 28, yl + 42, "Pojď dál", 13, PISMO.ruka, `text-anchor="middle" fill="${P.rumelka}"`));
    // dětský obrázek pastelkami: hrnek s obličejem a sluníčko
    const kx = x1 - RAM - 54;
    s += listek(kx, yl + 4, 50, 48, 2.5,
      `<path d="M${kx + 12} ${yl + 22} h24 l-3 22 h-18 z" fill="none" stroke="#5B7FD1" stroke-width="2" stroke-linejoin="round"/>` +
      `<path d="M${kx + 36} ${yl + 26} q8 2 0 12" fill="none" stroke="#5B7FD1" stroke-width="2"/>` +
      kruhy([[kx + 20, yl + 30, 1.2], [kx + 28, yl + 30, 1.2]], `fill="${P.inkoust}"`) +
      `<path d="M${kx + 19} ${yl + 36} q5 4 10 0" fill="none" stroke="${P.rumelka}" stroke-width="1.4"/>` +
      kruh(kx + 41, yl + 12, 5, `fill="${P.zlata}"`) +
      `<path d="M${kx + 41} ${yl + 3} v-2 M${kx + 49} ${yl + 6} l2 -2 M${kx + 50} ${yl + 13} h2 M${kx + 33} ${yl + 6} l-2 -2" stroke="${P.zlata}" stroke-width="1.4" stroke-linecap="round"/>` +
      `<path d="M${kx + 6} ${yl + 46} q8 -3 16 0 t16 0 t10 0" fill="none" stroke="${P.list}" stroke-width="2"/>`, "#FFFFFF");
  } else {
    // ワレモノ注意 — křehké, s prasklou miskou (v pravé tabuli u příčky)
    const kx = px + 12 + 4;
    s += listek(kx, yl + 6, 50, 46, -2,
      obdelnik(kx + 2, yl + 8, 46, 42, `fill="none" stroke="${P.rumelka}" stroke-width="1.6"`) +
      `<path d="M${kx + 13} ${yl + 18} h24 q-2 13 -12 13 q-10 0 -12 -13 z" fill="${P.rumelka}"/>` +
      `<path d="M${kx + 24} ${yl + 18} l3 5 l-4 4 l3 4" stroke="#FFFFFF" stroke-width="1.4" fill="none"/>` +
      napis(kx + 25, yl + 44, "ワレモノ注意", 7.6, PISMO.kanji, `text-anchor="middle" fill="${P.rumelka}"`), "#FFFFFF");
    const ox = x1 - RAM - 64;
    s += listek(ox, yl, 48, 54, 3,
      napis(ox + 24, yl + 21, "一点物", 13, PISMO.kanji, `text-anchor="middle" fill="${P.inkoust}"`) +
      napis(ox + 24, yl + 36, "Každý kus", 11, PISMO.ruka, `text-anchor="middle" fill="${P.inkoust}"`) +
      napis(ox + 24, yl + 48, "je originál", 11, PISMO.ruka, `text-anchor="middle" fill="${P.inkoust}"`));
  }
  return s;
}

/* ════════════════════ PŘEDNÍ: dveře ════════════════════ */

/** Odsunuté křídlo posuvných dveří: u sloupu kousek skla, u otvoru náběžný rám s úchytkou */
function kridlo(okraj: number, smer: 1 | -1) {
  const sklo = smer > 0 ? okraj : okraj - 14;
  const ram = smer > 0 ? okraj + 14 : okraj - 26;
  const hn = NAHORE + 10;
  const dn = DOLE - 6;
  let s = "";
  s += obdelnik(sklo, hn, 14, 1640 - hn, `fill="#C9DAE4" opacity="0.28"`);
  s += mnohouhelnik([[sklo, hn + 120], [sklo + 14, hn + 92], [sklo + 14, hn + 104], [sklo, hn + 132]], `fill="${P.bila}" opacity="0.3"`);
  s += obdelniky([[sklo, hn, 14, 10], [sklo, 1640, 14, dn - 1640], [sklo, 1500, 14, 3]], `fill="#5E3E28"`);
  s += obdelnik(sklo, 1646, 14, 1.2, `fill="${P.drevoTma2}" opacity="0.6"`);
  s += obdelnik(ram, hn, 12, dn - hn, `fill="#5E3E28"`);
  s += obdelnik(ram, hn, 1.8, dn - hn, `fill="${P.drevoHrana}" opacity="0.6"`);
  s += obdelnik(ram + 10.4, hn, 1.6, dn - hn, `fill="${P.drevoTma2}"`);
  // zapuštěná úchytka (hikite)
  const ux = ram + 6;
  s += elipsa(ux, 1566, 3, 9, `fill="${B.mosaz}"`) + elipsa(ux, 1566, 1.8, 7.4, `fill="${P.drevoTma2}"`);
  return s;
}

function dverePred() {
  const x0 = DV.x;
  const x1 = DV.x + DV.w;
  let s = "";
  // nadpraží (kamoi) a práh s kolejničkou (shikii)
  s += obdelnik(x0, NAHORE, DV.w, 10, `fill="${P.drevoTma}"`) + obdelnik(x0, NAHORE + 8.6, DV.w, 1.4, `fill="${P.drevoTma2}"`);
  s += obdelnik(x0, DOLE - 6, DV.w, 6, `fill="${P.drevoTma}"`) + obdelnik(x0, DOLE - 6, DV.w, 1.2, `fill="${P.drevoHrana}" opacity="0.7"`);
  s += obdelniky([[x0, DOLE - 3.4, DV.w, 0.9], [x0, DOLE - 1.6, DV.w, 0.9]], `fill="${P.kovSvetly}"`);
  s += kridlo(x0, 1) + kridlo(x1, -1);
  return s;
}

/* ════════════════════ PŘEDNÍ: sloupy ════════════════════ */

function sloup(x: number, i: number) {
  const y0 = NAHORE;
  const v = DOLE - y0;
  let s = obdelnik(x, y0, 30, v, `fill="${P.drevo}"`);
  s += obdelnik(x, y0, 4, v, `fill="${P.drevoHrana}"`);
  s += obdelnik(x + 4, y0, 2, v, `fill="${P.drevoSvetle}" opacity="0.7"`);
  s += obdelnik(x + 25, y0, 5, v, `fill="${P.drevoTma}"`);
  const k = i % 2 ? -1 : 1;
  s += `<path d="M${f(x + 12)} ${y0} C${f(x + 12 + k * 3)} ${f(y0 + 120)} ${f(x + 11 - k * 2)} ${f(y0 + 260)} ${f(x + 13)} ${DOLE} M${f(x + 18)} ${f(y0 + 40)} C${f(x + 19 + k * 2)} ${f(y0 + 170)} ${f(x + 17)} ${f(y0 + 290)} ${f(x + 19 - k)} ${f(DOLE - 60)}" stroke="${P.drevoTma}" stroke-width="0.9" fill="none" opacity="0.4"/>`;
  // spodek napuštěný proti vlhku, kovová patka
  s += obdelnik(x, DOLE - 18, 30, 18, `fill="${P.drevoTma2}"`) + obdelnik(x, DOLE - 18, 30, 1.6, `fill="${P.drevoSvetle}" opacity="0.6"`);
  return s;
}

/** Nálepky a lístečky na sloupech (zakryje je stažená roleta) */
function nalepky() {
  let s = "";
  // levý krajní sloup: 火の用心 (pozor na oheň — u hrnčířů dvojnásob)
  s += otoc(-2, 1121, 1632, stin(1115, 1606, 12, 52, 0.18, 1.2) + obdelnik(1115, 1606, 12, 52, `fill="${P.papir}"`) + obdelnik(1115.6, 1606.6, 10.8, 50.8, `fill="none" stroke="${P.rumelka}" stroke-width="0.9"`) + svisle(1121, 1620, "火の用心", 9, 11.6, `fill="${P.inkoust}"`));
  // sloup u dveří vlevo: kulatá a obdélníková nálepka
  s += kruh(1445, 1660, 7.4, `fill="${P.zlata}"`) + kruh(1445, 1660, 5, `fill="none" stroke="${P.rumelka}" stroke-width="1.6"`) + kruh(1445, 1660, 1.6, `fill="${P.rumelka}"`);
  s += otoc(-8, 1445, 1682, obdelnik(1437, 1677, 16, 10, `fill="#BFD6E6"`) + obdelnik(1439, 1680, 12, 1.2, `fill="${P.indigo}"`) + obdelnik(1439, 1683, 8, 1.2, `fill="${P.indigo}"`));
  // sloup u dveří vpravo: 福 na kosočtverci (novoroční)
  s += otoc(45, 1755, 1648, obdelnik(1747, 1640, 16, 16, `fill="${P.rumelka}"`)) + napis(1755, 1653, "福", 11, PISMO.kanji, `text-anchor="middle" fill="${P.zlata}"`);
  // pravý krajní sloup: zbytek strženého letáku pod páskou
  s += `<path d="M2073 1612 h13 v9 l-3 2 l2 3 l-4 2 l1 3 h-9 z" fill="${P.papir}"/>` + paska(2079, 1612, 12, 4, -6);
  return s;
}

/* ════════════════════ PŘEDNÍ: noren ════════════════════ */

/**
 * Noren: tři pruhy indiga s bílým ジロ作 (JIRO saku) — うつわ屋 už nese
 * velký štít nad patrem, noren dává značku. Pruhy jsou od sebe na 4,
 * mezerou prosvítá krámek.
 */
const NOREN_ZNAKY = ["ジ", "ロ", "作"];
const NOREN_DIL = (DV.w - 4 - 2 * 4) / 3;
const NOREN = {
  x: DV.x - 12,
  y: NAHORE,
  w: DV.w + 24,
  dily: NOREN_ZNAKY.map((_, i): Obdelnik => ({ x: DV.x + 2 + i * (NOREN_DIL + 4), y: NAHORE + 3, w: NOREN_DIL, h: NOREN_DOLE - NAHORE - 3 })),
};

function noren() {
  const znaky = NOREN_ZNAKY;
  let s = "";
  // tyč (zůstává ve skupině — uklízí se s norenem)
  s += obdelnik(NOREN.x, NAHORE + 1, NOREN.w, 6, `rx="3" fill="${P.drevoSvetle}"`) + obdelnik(NOREN.x, NAHORE + 1.6, NOREN.w, 1.4, `fill="${P.drevoHrana}"`);
  s += obdelnik(NOREN.x - 3, NAHORE, 5, 8, `rx="1.5" fill="${P.drevoTma2}"`) + obdelnik(NOREN.x + NOREN.w - 2, NAHORE, 5, 8, `rx="1.5" fill="${P.drevoTma2}"`);
  NOREN.dily.forEach((d, i) => {
    const vlna = i % 2 ? 1.6 : -1.6;
    const dole = d.y + d.h;
    let t = `<path d="M${f(d.x)} ${f(d.y)} H${f(d.x + d.w)} V${f(dole - 1)} Q${f(d.x + d.w * 0.75)} ${f(dole + vlna)} ${f(d.x + d.w / 2)} ${f(dole)} Q${f(d.x + d.w * 0.25)} ${f(dole - vlna)} ${f(d.x)} ${f(dole - 1)} Z" fill="${P.indigo}"/>`;
    // záhyby: světlejší pruhy, kde látka chytá světlo zleva, tmavší vpravo; nahoře tunýlek přes tyč
    t += obdelnik(d.x + 6, d.y + 12, 10, d.h - 14, `fill="#3B4E8E" opacity="0.8"`);
    t += obdelnik(d.x + d.w * 0.52, d.y + 12, 6, d.h - 14, `fill="#35478A" opacity="0.7"`);
    t += obdelnik(d.x + d.w - 9, d.y + 12, 9, d.h - 14, `fill="${P.indigoTma}"`);
    t += obdelnik(d.x, d.y, d.w, 11, `fill="${P.indigoTma}"`);
    t += `<path d="M${f(d.x + 3)} ${f(d.y + 9)} H${f(d.x + d.w - 3)}" stroke="#5A6BA6" stroke-width="0.8" stroke-dasharray="2 2"/>`;
    // bílá linka u spodního lemu a znak
    t += obdelnik(d.x, dole - 13, d.w, 2.4, `fill="#F4F1EA" opacity="0.92"`);
    t += napis(d.x + d.w / 2, d.y + 70, znaky[i], 46, PISMO.kanji, `text-anchor="middle" fill="#F4F1EA"`);
    s += `<g class="krm-pr-noren-dil" data-i="${i}">${t}</g>`;
  });
  return `<g class="krm-noren krm-vitr">${s}</g>`;
}

/* ════════════════════ PŘEDNÍ: roleta ════════════════════ */

/** Papír na roletě: 本日は閉店しました a česky, s čmáranicí spící kočky z balkonu */
function oznameni() {
  const cx = 1600;
  const cy = 1590;
  const w = 204;
  const h = 138;
  const x = cx - w / 2;
  const y = cy - h / 2;
  let t = stin(x, y, w, h, 0.32, 3);
  t += obdelnik(x, y, w, h, `fill="${P.papir}"`);
  t += obdelniky([0, 1, 2, 3, 4, 5].map((i): Obd => [x + 10, y + 40 + i * 16, w - 20, 0.7]), `fill="#C9D6E2"`);
  t += obdelnik(x + 18, y, 1, h, `fill="#E8A9A0" opacity="0.7"`);
  t += napis(cx + 4, y + 30, "本日は閉店しました", 17, PISMO.kanji, `text-anchor="middle" fill="${P.inkoust}"`);
  t += napis(cx, y + 70, "Dnes už zavřeno —", 24, PISMO.ruka, `text-anchor="middle" fill="${P.inkoust}"`);
  t += napis(cx + 26, y + 108, "přijď zas", 30, PISMO.ruka, `text-anchor="middle" fill="${P.rumelka}"`);
  t += `<path d="M${x + w - 17} ${y + 99} c-3 -5 -10 -2 -6 4 l6 6 l6 -6 c4 -6 -3 -9 -6 -4 z" fill="${P.rumelka}"/>`;
  // spící kočka z balkonu (čmáranice perem) a „zzz“ vlevo dole
  const tx = x + 36;
  const ty = y + 106;
  t += `<g fill="none" stroke="${P.inkoust}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">` +
    // stočený bochník, ocas přes tlapky
    `<path d="M${tx - 15} ${ty + 3} C${tx - 16} ${ty - 12} ${tx + 16} ${ty - 12} ${tx + 15} ${ty + 3} C${tx + 14} ${ty + 13} ${tx - 14} ${ty + 13} ${tx - 15} ${ty + 3} Z"/>` +
    `<path d="M${tx + 14} ${ty + 6} q2 7 -8 7.4 q-6 0.2 -9 -2"/>` +
    // špičaté uši
    `<path d="M${tx - 12.5} ${ty - 4} l1.6 -8.6 l6.4 5.2 M${tx + 12.5} ${ty - 4} l-1.6 -8.6 l-6.4 5.2"/>` +
    // zavřené oči, tlamička a vousky
    `<path d="M${tx - 9} ${ty + 0.6} q3 2 6 0 M${tx + 3} ${ty + 0.6} q3 2 6 0 M${tx - 3} ${ty + 6.6} q1.5 1.6 3 0 q1.5 1.6 3 0"/>` +
    `<path d="M${tx - 7} ${ty + 4.4} l-9 -1.4 M${tx - 7} ${ty + 6} l-8.6 1.6 M${tx + 7} ${ty + 4.4} l9 -1.4 M${tx + 7} ${ty + 6} l8.6 1.6" stroke-width="0.8"/>` +
    `</g>`;
  t += elipsa(tx, ty + 4.6, 1.5, 1.1, `fill="${P.rumelka}"`);
  t += napis(tx + 17, ty - 9, "z", 9, PISMO.ruka, `fill="${P.indigo}"`) + napis(tx + 22, ty - 15, "z", 11, PISMO.ruka, `fill="${P.indigo}"`) + napis(tx + 28, ty - 22, "z", 13, PISMO.ruka, `fill="${P.indigo}"`);
  // razítko ジロ
  t += obdelnik(x + w - 30, y + h - 26, 18, 18, `rx="2" fill="none" stroke="${P.rumelka}" stroke-width="1.6"`);
  t += svisle(x + w - 21, y + h - 18.6, "ジロ", 7.4, 7.6, `fill="${P.rumelka}"`);
  let s = otoc(-1.4, cx, cy, t);
  s += paska(x + 8, y + 3, 40, 12, -30, "#F1D7A0") + paska(x + w - 8, y + 3, 40, 12, 30, "#F1D7A0");
  s += paska(x + 10, y + h - 4, 34, 11, 26, "#BFD6E6") + paska(x + w - 12, y + h - 2, 34, 11, -22, "#BFD6E6");
  return s;
}

function roleta() {
  const R = PRIZEMI.roleta;
  const dole = R.y + R.h;
  let s = obdelnik(R.x, R.y, R.w, R.h, `fill="url(#kd-pr-lamely)"`);
  // dole zašlejší (prach od chodníku)
  s += obdelnik(R.x, dole - 74, R.w, 50, `fill="${P.inkoust}" opacity="0.06"`);
  // sdělení na roletě: zákaz parkování před roletou (vlevo dole)
  s += obdelnik(1166, 1618, 92, 40, `rx="2" fill="#F4F1EA"`) + obdelnik(1166, 1618, 92, 40, `rx="2" fill="none" stroke="${P.rumelka}" stroke-width="1.6"`);
  s += napis(1212, 1633, "シャッター前", 10, PISMO.kanji, `text-anchor="middle" fill="${P.inkoust}"`);
  s += napis(1212, 1652, "駐車禁止", 16, PISMO.kanji, `text-anchor="middle" fill="${P.rumelka}"`);
  s += kruhy([[1170.5, 1622.5, 1.2], [1253.5, 1622.5, 1.2], [1170.5, 1653.5, 1.2], [1253.5, 1653.5, 1.2]], `fill="${P.kovTma}"`);
  s += oznameni();
  // spodní lišta s gumou, dvě madla souměrně a zámek uprostřed
  s += obdelnik(R.x, dole - 24, R.w, 24, `fill="${B.lamelaTma}"`);
  s += obdelnik(R.x, dole - 24, R.w, 2.4, `fill="${B.lamelaSvetla}"`);
  s += obdelnik(R.x, dole - 13, R.w, 1.2, `fill="${B.lamelaSpara}" opacity="0.7"`);
  s += obdelnik(R.x, dole - 4, R.w, 4, `fill="${P.inkoust}"`);
  for (const mx of [1340, 1860]) {
    s += obdelnik(mx - 15, dole - 19, 4, 8, `fill="${B.lamelaSpara}"`) + obdelnik(mx + 11, dole - 19, 4, 8, `fill="${B.lamelaSpara}"`);
    s += `<path d="M${mx - 13} ${dole - 13} V${dole - 8} H${mx + 13} V${dole - 13}" stroke="${P.kovTma}" stroke-width="3" fill="none" stroke-linejoin="round"/>`;
    s += `<path d="M${mx - 12} ${dole - 9} H${mx + 12}" stroke="${P.kovSvetly}" stroke-width="1" opacity="0.8"/>`;
  }
  s += obdelnik(1592, dole - 21, 16, 16, `rx="2" fill="${P.kovTma}"`);
  s += kruh(1600, dole - 13, 5, `fill="${B.mosaz}"`) + kruh(1600, dole - 13, 3.4, `fill="#A8862E"`) + obdelnik(1599.3, dole - 15, 1.4, 4, `fill="${P.inkoust}"`);
  return `<g clip-path="url(#kd-pr-roleta-orez)"><g class="krm-roleta">${s}</g></g>`;
}

/** Vodicí lišty rolety na krajních sloupech (zůstávají, i když je roleta nahoře) */
function listy() {
  let s = "";
  for (const x of [X.zedL + 1, X.zedP - 13]) {
    s += obdelnik(x, NAHORE, 12, DOLE - NAHORE, `fill="${P.kov}"`);
    s += obdelnik(x, NAHORE, 2, DOLE - NAHORE, `fill="${P.kovSvetly}"`);
    s += obdelnik(x + 4.5, NAHORE, 3, DOLE - NAHORE, `fill="${P.kovTma}"`);
    s += obdelnik(x + 10, NAHORE, 2, DOLE - NAHORE, `fill="${P.kovTma}" opacity="0.6"`);
    s += kruhy([1390, 1530, 1670].map((y): [number, number, number] => [x + 2.4, y, 1]), `fill="${P.kovSvetly}"`);
    s += obdelnik(x - 1, DOLE - 7, 14, 7, `fill="${P.kovTma}"`);
  }
  return s;
}

/** Mořidžio — kužílky soli na miskách po stranách vchodu, pro štěstí a dobré hosty */
function morijio() {
  let s = "";
  for (const cx of [DV.x + 22, DV.x + DV.w - 22]) {
    const y = DOLE + 4;
    s += elipsa(cx + 2, y + 1.6, 10, 2.2, `fill="${P.inkoust}" opacity="0.18"`);
    s += elipsa(cx, y, 9, 2.4, `fill="#F4F1EA"`) + obdelnik(cx - 9, y - 0.6, 18, 1.2, `fill="#D9D3C6"`);
    s += mnohouhelnik([[cx - 5.4, y - 0.6], [cx, y - 11], [cx + 5.4, y - 0.6]], `fill="${P.bila}"`);
    s += mnohouhelnik([[cx, y - 11], [cx + 5.4, y - 0.6], [cx + 1.6, y - 0.6]], `fill="#E3E0D8"`);
  }
  return s;
}

/* ════════════════════ PŘEDNÍ: schránka rolety a cedulky ════════════════════ */

/** Dřevěná cedulka se svislým nápisem (hinoki, tuš) */
function cedulkaSvisla(cx: number, znaky: string) {
  const w = 30;
  const h = 68;
  const x = cx - w / 2;
  const y = 1250;
  let s = `<path d="M${f(cx - 8)} ${f(y)} L${f(cx)} ${f(y - 8)} L${f(cx + 8)} ${f(y)}" stroke="${P.inkoust}" stroke-width="0.9" fill="none"/>` + hrebik(cx, y - 8.5);
  s += stin(x, y, w, h, 0.22, 2.6);
  s += obdelnik(x, y, w, h, `fill="${B.hinoki}"`);
  s += obdelnik(x + w - 3, y, 3, h, `fill="${B.hinokiStin}"`) + obdelnik(x, y + h - 3, w, 3, `fill="${B.hinokiStin}"`);
  s += obdelnik(x, y, 1.6, h, `fill="#F6E7C6"`);
  s += svisle(cx - 1, y + 21, znaky, 17, 20, `fill="${P.inkoust}"`);
  return s;
}

/**
 * Papírový lístek senjafuda nalepený na plechu nad dveřmi — přání do
 * obchodu, jaká se lepí na vrata svatyní i krámků (千客万来 ať chodí
 * hosté, 商売繁盛 ať se daří). Barevný lem, svislý nápis tuší.
 */
function senjafuda(cx: number, uhel: number, znaky: string, lem: string, roh: string) {
  const w = 18;
  const h = 56;
  const x = cx - w / 2;
  const y = 1252;
  let t = stin(x, y, w, h, 0.18, 1.4);
  t += obdelnik(x, y, w, h, `fill="${P.papir}"`);
  t += obdelnik(x + 1.4, y + 1.4, w - 2.8, h - 2.8, `fill="none" stroke="${lem}" stroke-width="1.6"`);
  t += mnohouhelnik([[x, y], [x + 7, y], [x, y + 7]], `fill="${roh}"`) + mnohouhelnik([[x + w, y + h], [x + w - 7, y + h], [x + w, y + h - 7]], `fill="${roh}"`);
  t += svisle(cx, y + 14.5, znaky, 10.4, 12, `fill="${P.inkoust}" font-weight="700"`);
  return otoc(uhel, cx, y + h / 2, t);
}

function schranka() {
  const S = PRIZEMI.schranka;
  const x0 = S.x;
  const x1 = S.x + S.w;
  const y0 = S.y;
  const y1 = S.y + S.h;
  let s = "";
  s += obdelnik(x0, y0, S.w, S.h, `fill="${B.schranka}"`);
  // stín stříšky nahoře
  s += obdelnik(x0, y0, S.w, 24, `fill="${P.taskaTma}" opacity="0.16"`);
  s += obdelnik(x0, y0, S.w, 3, `fill="${P.plechTma}"`);
  // prolis (žebro) a spodní hrana se štěrbinou, kudy jede roleta
  s += obdelnik(x0, y1 - 32, S.w, 2.4, `fill="${P.bila}" opacity="0.55"`) + obdelnik(x0, y1 - 29.6, S.w, 1.6, `fill="${P.plechTma}" opacity="0.6"`);
  s += obdelnik(x0, y1 - 14, S.w, 14, `fill="${P.plech}"`);
  s += obdelnik(x0, y1 - 14, S.w, 1.8, `fill="${P.plechSvetly}"`);
  s += obdelnik(x0, y1 - 4, S.w, 4, `fill="${P.taskaHrana}"`);
  // čela na koncích a dva spoje plechu (souměrně)
  s += obdelniky([[x0, y0, 13, S.h], [x1 - 13, y0, 13, S.h]], `fill="${P.plech}"`);
  s += obdelniky([[x0, y0, 2, S.h], [x1 - 13, y0, 1.4, S.h]], `fill="${P.plechSvetly}"`);
  s += obdelniky([[x0 + 12, y0, 1.2, S.h], [x1 - 2, y0, 2, S.h]], `fill="${P.plechTma}"`);
  for (const x of [1350, 1850]) s += obdelnik(x - 1, y0 + 3, 2, S.h - 17, `fill="${P.plechTma}" opacity="0.7"`) + obdelnik(x + 1, y0 + 3, 1, S.h - 17, `fill="${P.bila}" opacity="0.6"`);
  const sroub: [number, number, number][] = [];
  for (const x of [x0 + 6.5, x1 - 6.5, 1344, 1356, 1844, 1856]) sroub.push([x, y0 + 30, 1.4], [x, y1 - 22, 1.4]);
  s += kruhy(sroub, `fill="${P.plechTma}"`);
  // v mezerách mezi lampiony: nad výlohami dřevěné cedulky 手作り a 一点物,
  // nad dveřmi dva papírové lístky s přáním (lampiony nesou svou řadu znaků, cedulky jsou tišší)
  s += cedulkaSvisla(1216, "手作り") + cedulkaSvisla(1370, "一点物");
  s += senjafuda(1521, -3, "千客万来", P.indigo, P.rumelka) + senjafuda(1679, 2.5, "商売繁盛", P.rumelka, P.indigo);
  s += cedulkaSvisla(1830, "一点物") + cedulkaSvisla(1983, "手作り");
  return s;
}

/* ════════════════════ PŘEDNÍ: sousedská vývěska ════════════════════ */

interface Letak {
  x: number;
  y: number;
  w: number;
  h: number;
  uhel: number;
}

/** Tři letáky, přes které stránka položí odkazy */
const LETAKY_ODKAZY: (Letak & { odkaz: string; popis: string; kresba: (l: Letak) => string })[] = [
  { x: 567, y: 1399, w: 70, h: 90, uhel: -2.2, odkaz: "/rezervace#rz-rad", popis: "Leták: Kurzy u kruhu", kresba: letakKurzy },
  { x: 648, y: 1401, w: 70, h: 88, uhel: 1.6, odkaz: "/rezervace", popis: "Leták: Rezervace", kresba: letakRezervace },
  { x: 606, y: 1497, w: 72, h: 90, uhel: -1, odkaz: "/dilna", popis: "Leták: Jak to chodí v dílně", kresba: letakDilna },
];

/** Obálka otočeného letáku ve světě (pro HTML odkaz) */
function obalka(l: Letak): Obdelnik {
  const a = (l.uhel * Math.PI) / 180;
  const cx = l.x + l.w / 2;
  const cy = l.y + l.h / 2;
  const rohy = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
    const dx = (sx * l.w) / 2;
    const dy = (sy * l.h) / 2;
    return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)];
  });
  const xs = rohy.map((p) => p[0]);
  const ys = rohy.map((p) => p[1]);
  const x = Math.floor(Math.min(...xs));
  const y = Math.floor(Math.min(...ys));
  return { x, y, w: Math.ceil(Math.max(...xs)) - x, h: Math.ceil(Math.max(...ys)) - y };
}

/** Leták v místních souřadnicích (0,0 levý horní roh), posunutý a otočený na místo */
const umisti = (l: Letak, obsah: string) => posun(l.x, l.y, stin(0, 0, l.w, l.h, 0.26, 1.6) + obsah, l.uhel, l.w / 2, l.h / 2);

/** Záhlaví letáku: barevný pruh s japonským slovem */
const zahlavi = (w: number, barva: string, slovo: string) =>
  obdelnik(0, 0, w, 22, `fill="${barva}"`) + napis(w / 2, 17.4, slovo, 16.5, PISMO.kanji, `text-anchor="middle" fill="${P.papir}"`);

/** Odtrhávací proužky dole */
function utrzky(w: number, y: number, h: number, n: number) {
  let d = "";
  for (let i = 1; i < n; i++) d += `M${f((w * i) / n)} ${f(y)} v${f(h)}`;
  let t = `<path d="${d}" stroke="${P.inkoust}" stroke-width="0.5" stroke-dasharray="1.4 1.2" opacity="0.6"/>`;
  t += obdelniky(Array.from({ length: n }, (_, i): Obd => [(w * i) / n + w / n / 2 - 0.5, y + 2, 1, h - 4]), `fill="${P.inkoust}" opacity="0.35"`);
  return t + obdelnik(0, y, w, 0.6, `fill="${P.inkoust}" opacity="0.35"`);
}

function letakKurzy(l: Letak) {
  const { w, h } = l;
  let t = obdelnik(0, 0, w, h, `fill="${P.papir}"`);
  t += zahlavi(w, P.rumelka, "教室");
  // hrnčířský kruh a hrnek, co roste
  t += elipsa(35, 53, 20, 4.4, `fill="${P.kov}"`) + elipsa(35, 52, 20, 3.4, `fill="${P.kovSvetly}"`);
  t += obdelnik(31, 56, 8, 5, `fill="${P.kovTma}"`) + obdelnik(22, 60, 26, 3, `rx="1" fill="${P.kovTma}"`);
  t += `<path d="M26 51 C24 44 28 40 31 37 C32.4 35.4 31.6 33.4 30.4 31 L39.6 31 C38.4 33.4 37.6 35.4 39 37 C42 40 46 44 44 51 Z" fill="${B.hlina}"/>`;
  t += `<path d="M28.6 49 C27.4 44 30 41 32.4 38.4" stroke="#D7A97A" stroke-width="1.6" fill="none"/>`;
  t += elipsa(35, 31, 4.6, 1.2, `fill="#8A5E3C"`);
  t += `<path d="M11 47 q-4 6 3 9 M59 47 q4 6 -3 9" stroke="${P.rumelka}" stroke-width="1.1" fill="none" stroke-linecap="round"/>`;
  t += napis(w / 2, 75, "Kurzy u kruhu", 13, PISMO.ruka, `text-anchor="middle" fill="${P.inkoust}"`);
  t += utrzky(w, h - 11, 11, 6);
  t += pripinacek(7, 5, P.zlata) + pripinacek(w - 7, 5, P.zlata);
  return umisti(l, t);
}

function letakRezervace(l: Letak) {
  const { w, h } = l;
  let t = obdelnik(0, 0, w, h, `fill="#E8F0F2"`);
  t += zahlavi(w, P.indigo, "体験");
  // dvě jízdenky přes sebe
  t += otoc(8, 38, 44, obdelnik(22, 35, 34, 18, `rx="1.5" fill="#8FB08A"`));
  t += otoc(-7, 33, 45, obdelnik(15, 36, 38, 20, `rx="1.5" fill="${P.zlata}"`) + `<path d="M26 37 v18" stroke="${P.papir}" stroke-width="1" stroke-dasharray="1.6 1.4"/>` + kruh(20.4, 46, 2, `fill="#E8F0F2"`) + obdelniky([[30, 41, 18, 1.6], [30, 45.4, 14, 1.2], [30, 49, 16, 1.2]], `fill="${P.inkoust}" opacity="0.7"`) + kruh(46, 51, 2.4, `fill="none" stroke="${P.rumelka}" stroke-width="0.9"`));
  t += napis(w / 2, 76, "Rezervace", 15, PISMO.ruka, `text-anchor="middle" fill="${P.inkoust}"`);
  t += `<path d="M24 81 h22 m-4 -3 l4 3 l-4 3" stroke="${P.indigo}" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  t += pripinacek(7, 5, P.rumelka) + pripinacek(w - 7, 5, P.rumelka);
  return umisti(l, t);
}

function letakDilna(l: Letak) {
  const { w, h } = l;
  let t = obdelnik(0, 0, w, h, `fill="#F7ECCB"`);
  t += zahlavi(w, P.drevoTma, "工房");
  // pec s ohněm a komínem
  t += `<path d="M14 58 C14 38 26 30 38 30 C48 30 56 38 56 58 Z" fill="${B.hlina}"/>`;
  t += `<path d="M18 58 C18 42 28 34 38 34" stroke="#D7A97A" stroke-width="1.6" fill="none"/>`;
  t += obdelnik(50, 26, 7, 16, `fill="#8A5E3C"`);
  t += `<path d="M53.5 24 c-4 -4 3 -6 -1 -10" stroke="${P.kov}" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
  t += `<path d="M28 58 V50 a7 7 0 0 1 14 0 V58 Z" fill="${P.inkoust}"/>`;
  t += `<path d="M30.5 58 c-1 -5 3 -6 2.6 -10 c3 3 2 5 3.4 6 c1 -2 1 -4 0.6 -5 c3 3 3.4 6 2.4 9 Z" fill="#F07A30"/>`;
  t += `<path d="M33 58 c0 -3 2 -3 2 -6 c2 2 2.4 4 1.4 6 Z" fill="${P.zlata}"/>`;
  t += obdelnik(10, 58, 50, 2.4, `fill="#8A5E3C"`);
  t += napis(w / 2, 73, "Jak to chodí", 13, PISMO.ruka, `text-anchor="middle" fill="${P.inkoust}"`);
  t += napis(w / 2, 85, "v dílně", 13, PISMO.ruka, `text-anchor="middle" fill="${P.inkoust}"`);
  t += pripinacek(7, 5, P.list) + pripinacek(w - 7, 5, P.list);
  return umisti(l, t);
}

/** Ozdobné letáky: trh s keramikou, ztracená kočka, slavnost, svoz tříděného odpadu, ranní rozcvička */
function letakyOzdobne() {
  let s = "";
  // 祭 — slavnost (vykukuje mezi horními letáky)
  s += umisti({ x: 626, y: 1393, w: 32, h: 48, uhel: 4 },
    obdelnik(0, 0, 32, 48, `fill="${P.rumelka}"`) + napis(16, 26, "祭", 19, PISMO.kanji, `text-anchor="middle" fill="${P.papir}"`) +
    elipsa(16, 37, 5, 6, `fill="${P.zlata}"`) + obdelnik(12, 30, 8, 1.6, `fill="${P.inkoust}"`) + obdelnik(12, 42.6, 8, 1.6, `fill="${P.inkoust}"`));
  // 陶器市 — trh s keramikou
  s += umisti({ x: 566, y: 1494, w: 44, h: 58, uhel: 2.6 },
    obdelnik(0, 0, 44, 58, `fill="#F4DCD2"`) + svisle(33, 13, "陶器市", 10.4, 12, `fill="${P.rumelka}"`) +
    `<path d="M5 30 h20 q-1 9 -10 9 q-9 0 -10 -9 z" fill="#7C8F86"/>` + `<path d="M7 22 h16 q-1 7 -8 7 q-7 0 -8 -7 z" fill="${B.hlina}"/>` +
    obdelniky([[5, 46, 34, 1.4], [5, 50, 26, 1.4]], `fill="${P.inkoust}" opacity="0.4"`) + pripinacek(22, 4, P.indigo));
  // 猫を探しています — ztracená kočka
  s += umisti({ x: 680, y: 1494, w: 40, h: 62, uhel: -2.4 },
    obdelnik(0, 0, 40, 62, `fill="#FFFFFF"`) +
    napis(20, 12.4, "猫を探して", 6.4, PISMO.kanji, `text-anchor="middle" fill="${P.inkoust}"`) + napis(20, 19.8, "います", 6.4, PISMO.kanji, `text-anchor="middle" fill="${P.inkoust}"`) +
    posun(0, 3.6,
      `<path d="M11 26 l2 -7 l4 4 h6 l4 -4 l2 7 c2 8 -2 13 -9 13 c-7 0 -11 -5 -9 -13 z" fill="#FBF3E6" stroke="${P.inkoust}" stroke-width="0.7"/>` +
      `<path d="M13 19.4 l4 4 l-1 5 c-3 0 -5 -2 -5 -4 z" fill="#E59A4A"/>` + `<path d="M27 19.4 l-4 4 h2 c2 2 4 3 4 1 z" fill="${P.inkoust}"/>` +
      kruhy([[16.6, 29, 0.9], [23.4, 29, 0.9]], `fill="${P.inkoust}"`) + `<path d="M19 32 l1 1 l1 -1" stroke="${P.inkoust}" stroke-width="0.6" fill="none"/>`) +
    obdelniky([[5, 45.6, 30, 1.1], [5, 48.4, 22, 1.1]], `fill="${P.inkoust}" opacity="0.4"`) + utrzky(40, 52, 10, 5) + pripinacek(20, 3.2, P.rumelka, 2.2));
  // 資源ごみ — svoz tříděného odpadu (kalendářík)
  s += umisti({ x: 565, y: 1555, w: 42, h: 36, uhel: -3.4 },
    obdelnik(0, 0, 42, 36, `fill="#E3EDD5"`) + napis(21, 12, "資源ごみ", 7, PISMO.kanji, `text-anchor="middle" fill="${P.listTma}"`) +
    (() => {
      const barvy = ["#FFFFFF", B.salvej, "#FFFFFF", P.zlata, "#FFFFFF", "#FFFFFF", P.indigo, "#FFFFFF", B.salvej, "#FFFFFF", "#FFFFFF", P.zlata, "#FFFFFF", "#FFFFFF", P.indigo];
      return barvy.map((b, i) => obdelnik(4 + (i % 5) * 7, 14.6 + Math.floor(i / 5) * 6.6, 6, 5.6, `fill="${b}"`)).join("");
    })() + pripinacek(21, 3, P.zlata, 2));
  // ラジオ体操 — ranní rozcvička
  s += umisti({ x: 681, y: 1557, w: 40, h: 34, uhel: 2.8 },
    obdelnik(0, 0, 40, 34, `fill="#FFF3C6"`) + napis(20, 12.4, "ラジオ体操", 6.6, PISMO.kanji, `text-anchor="middle" fill="${P.rumelka}"`) +
    posun(0, 2, `<g stroke="${P.inkoust}" stroke-width="1.1" fill="none" stroke-linecap="round"><path d="M20 21 v6 M20 22 l-6 -6 M20 22 l6 -6 M20 27 l-4 5 M20 27 l4 5"/></g>` +
      kruh(20, 17.6, 2.2, `fill="${P.inkoust}"`) + kruh(32, 18, 3, `fill="${P.rumelka}" opacity="0.8"`)) + pripinacek(20, 3.2, P.indigo, 2));
  return s;
}

function vyveska() {
  const V = MISTA.vyveska;
  const x0 = V.x + 8;
  const x1 = V.x + V.w - 8;
  const y0 = V.y + 26;
  const y1 = V.y + V.h - 10;
  let s = "";
  // stín vývěsky na zdi (vpravo dole)
  s += obdelnik(x0 + 7, y0 + 6, x1 - x0, y1 - y0, `fill="${P.inkoust}" opacity="0.18"`);
  // rám a deska
  s += obdelnik(x0, y0, x1 - x0, y1 - y0, `fill="${P.drevoTma}"`);
  s += obdelnik(x0 + 8, y0 + 8, x1 - x0 - 16, y1 - y0 - 16, `fill="${B.deska}"`);
  s += obdelniky([[x0, y0, 2, y1 - y0], [x0, y1 - 2.4, x1 - x0, 2.4]], `fill="${P.drevo}"`);
  s += obdelniky([[x0 + 8, y0 + 8, x1 - x0 - 16, 3], [x0 + 8, y0 + 8, 3, y1 - y0 - 16]], `fill="${P.inkoust}" opacity="0.25"`);
  // letáky: ozdobné vespod, tři s odkazy navrch
  s += letakyOzdobne();
  for (const l of LETAKY_ODKAZY) s += l.kresba(l);
  // sklo: tenké lemy a jemné odlesky
  s += mnohouhelnik([[x0 + 8, y0 + 120], [x0 + 60, y0 + 8], [x0 + 84, y0 + 8], [x0 + 8, y0 + 170]], `fill="${P.bila}" opacity="0.1"`);
  s += mnohouhelnik([[x1 - 70, y1 - 8], [x1 - 8, y1 - 120], [x1 - 8, y1 - 104], [x1 - 58, y1 - 8]], `fill="${P.bila}" opacity="0.07"`);
  s += obdelnik(x0 + 8, y0 + 8, x1 - x0 - 16, y1 - y0 - 16, `fill="none" stroke="${P.bila}" stroke-width="1" opacity="0.35"`);
  // stříška z tašek
  const rx0 = V.x - 8;
  const rx1 = V.x + V.w + 8;
  const ry0 = V.y + 2;
  const ry1 = V.y + 22;
  s += obdelnik(x0, y0, x1 - x0, 8, `fill="${P.inkoust}" opacity="0.3"`);
  s += mnohouhelnik([[x0, ry0], [x1, ry0], [rx1, ry1], [rx0, ry1]], `fill="${P.taska}"`);
  let rady = "";
  let svetla = "";
  const n = 20;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = x0 + (x1 - x0) * t;
    const b = rx0 + (rx1 - rx0) * t;
    rady += `M${f(a)} ${ry0} L${f(b)} ${ry1}`;
    svetla += `M${f(a + 2.6)} ${ry0} L${f(b + 3)} ${ry1}`;
  }
  s += `<path d="${rady}" stroke="${P.taskaTma}" stroke-width="1.6"/>`;
  s += `<path d="${svetla}" stroke="${P.taskaSvetla}" stroke-width="1" opacity="0.7"/>`;
  s += obdelnik(x0 - 4, ry0 - 5, x1 - x0 + 8, 6, `rx="2" fill="${P.taskaTma}"`) + obdelnik(x0 - 4, ry0 - 5, x1 - x0 + 8, 1.6, `fill="${P.taskaSvetla}"`);
  s += kruhy([[x0 - 6, ry0 - 3, 4], [x1 + 6, ry0 - 3, 4]], `fill="${P.taskaHrana}"`);
  s += obdelnik(rx0, ry1, rx1 - rx0, 4, `fill="${P.taskaHrana}"`);
  s += kruhy(Array.from({ length: 24 }, (_, i): [number, number, number] => [rx0 + 4 + i * ((rx1 - rx0 - 8) / 23), ry1 + 1, 2.6]), `fill="${P.taskaTma}"`);
  // tabulka 掲示板 pod stříškou
  s += stin(612, y0 - 1, 56, 16, 0.2, 1.6) + obdelnik(612, y0 - 1, 56, 16, `fill="#F6F1E4"`) + obdelnik(613.5, y0 + 0.5, 53, 13, `fill="none" stroke="${P.inkoust}" stroke-width="0.6"`);
  s += napis(640, y0 + 11, "掲示板", 10.6, PISMO.kanji, `text-anchor="middle" fill="${P.inkoust}"`);
  // lampička pod stříškou vpravo
  s += cara(706, ry1 + 4, 706, y0 + 1, `stroke="${P.inkoust}" stroke-width="1"`);
  s += `<path d="M698 ${y0 + 8} Q706 ${y0 - 2} 714 ${y0 + 8} Z" fill="${B.smalt}"/>` + elipsa(706, y0 + 8, 8, 1.6, `fill="#F1EADB"`) + elipsa(706, y0 + 10, 2.6, 2.2, `fill="#F6EFD9"`);
  return s;
}

/* ════════════════════ SVĚTLA ════════════════════ */

function svetla(): string {
  const defs = `<defs>
    <linearGradient id="kd-pr-sv-vyloha" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${SVIT.zarBila}" stop-opacity="0.42"/>
      <stop offset="0.09" stop-color="${SVIT.zar}" stop-opacity="0.16"/>
      <stop offset="0.3" stop-color="${SVIT.zar}" stop-opacity="0.08"/>
      <stop offset="1" stop-color="${SVIT.zar}" stop-opacity="0.05"/>
    </linearGradient>
    <linearGradient id="kd-pr-sv-pod" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${SVIT.zar}" stop-opacity="0.26"/>
      <stop offset="1" stop-color="${SVIT.zar}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="kd-pr-sv-kram" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${SVIT.zarTepla}" stop-opacity="0.26"/>
      <stop offset="1" stop-color="${SVIT.zarTepla}" stop-opacity="0.08"/>
    </linearGradient>
    <radialGradient id="kd-pr-sv-zarovka" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${SVIT.zarBila}" stop-opacity="0.95"/>
      <stop offset="0.22" stop-color="${SVIT.zar}" stop-opacity="0.6"/>
      <stop offset="1" stop-color="${SVIT.zarTepla}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="kd-pr-sv-kuzel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${SVIT.zarBila}" stop-opacity="0.42"/>
      <stop offset="1" stop-color="${SVIT.zar}" stop-opacity="0.1"/>
    </linearGradient>
    <radialGradient id="kd-pr-sv-hrana" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${SVIT.zarBila}" stop-opacity="0.75"/>
      <stop offset="0.6" stop-color="${SVIT.zar}" stop-opacity="0.35"/>
      <stop offset="1" stop-color="${SVIT.zar}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="kd-pr-sv-louze" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${SVIT.zar}" stop-opacity="0.62"/>
      <stop offset="0.35" stop-color="${SVIT.zar}" stop-opacity="0.38"/>
      <stop offset="0.7" stop-color="${SVIT.zarTepla}" stop-opacity="0.14"/>
      <stop offset="1" stop-color="${SVIT.zarTepla}" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="kd-pr-sv-pred-prahem"><rect x="${X.zedL - 200}" y="${DOLE}" width="${X.zedP - X.zedL + 400}" height="200"/></clipPath>
    <radialGradient id="kd-pr-sv-vyveska" cx="0.62" cy="0.3" r="0.62" fx="0.8" fy="0.02">
      <stop offset="0" stop-color="${SVIT.zarBila}" stop-opacity="0.5"/>
      <stop offset="0.5" stop-color="${SVIT.zar}" stop-opacity="0.24"/>
      <stop offset="1" stop-color="${SVIT.zar}" stop-opacity="0"/>
    </radialGradient>
  </defs>`;

  // Výlohy: lišta pod stropem svítí, světlo padá shora, pod horní policí ještě jeden pruh
  const vylohy = [VL, VP].map((v) => {
    const a = v.x + RAM;
    const w = v.w - 2 * RAM;
    return (
      obdelnik(a, NAHORE + RAM, w, DOLE - NAHORE - 2 * RAM, `fill="url(#kd-pr-sv-vyloha)"`) +
      obdelnik(a, NAHORE + RAM, w, 3.5, `fill="${SVIT.zarBila}"`) +
      obdelnik(a, Y.police1 + HRANA, w, 40, `fill="url(#kd-pr-sv-pod)"`) +
      obdelniky([[a, Y.police1 - 0.4, w, 2], [a, Y.police2 - 0.4, w, 2]], `fill="${SVIT.zar}" opacity="0.7"`)
    );
  }).join("");
  // Krámek pod norenem
  const kram = obdelnik(DV.x + 26, NOREN_DOLE, DV.w - 52, DOLE - NOREN_DOLE - 6, `fill="url(#kd-pr-sv-kram)"`);
  // Lampa nad pultem: žárovka, záře, kužel na pult a světlá skvrna na desce
  const lampaSvit =
    `<path d="M1572 1455 L1628 1455 L1688 ${PULT.y} L1512 ${PULT.y} Z" fill="url(#kd-pr-sv-kuzel)"/>` +
    elipsa(1600, PULT.y - 4, 80, 6, `fill="${SVIT.zarBila}" opacity="0.4"`) +
    elipsa(1600, 1458, 62, 46, `fill="url(#kd-pr-sv-zarovka)"`) +
    elipsa(1600, 1454.2, 30, 2.6, `fill="${SVIT.zar}" opacity="0.9"`) +
    elipsa(1600, 1457, 6, 4.6, `fill="#FFFDF4"`);
  // Rozlité světlo: na schodu pod každým otvorem světlý pruh, na podlážce a chodníku měkká louže (ze dveří silnější)
  const otvory: [number, number, number][] = [
    [VL.x + RAM, VL.x + VL.w - RAM, 0.7],
    [DV.x + 26, DV.x + DV.w - 26, 1],
    [VP.x + RAM, VP.x + VP.w - RAM, 0.7],
  ];
  const rozliti =
    `<g clip-path="url(#kd-pr-sv-pred-prahem)">${otvory
      .map(([a, b, o]) => elipsa((a + b) / 2, DOLE, (b - a) * 0.66, 150 * o + 14, `fill="url(#kd-pr-sv-louze)" opacity="${f(o * 0.95)}"`) + elipsa((a + b) / 2, DOLE + 4, (b - a) * 0.5, 9, `fill="url(#kd-pr-sv-hrana)" opacity="${o}"`))
      .join("")}</g>`;
  // Lampička nad vývěskou
  const V = MISTA.vyveska;
  const vy = V.y + 34;
  const vyveskaSvit =
    obdelnik(V.x - 6, vy - 6, V.w + 14, V.h - 26, `fill="url(#kd-pr-sv-vyveska)"`) +
    elipsa(706, vy, 22, 16, `fill="url(#kd-pr-sv-zarovka)"`) +
    elipsa(706, vy + 2, 2.8, 2.4, `fill="#FFFDF4"`);

  return (
    defs +
    svetlo(PRAH.uvnitr, vylohy + kram, "krm-pr-uvnitr krm-pr-provoz") +
    svetlo(PRAH.uvnitr, lampaSvit, "krm-pr-lampa krm-pr-provoz") +
    svetlo(PRAH.rozliti, rozliti, "krm-pr-rozliti krm-pr-provoz") +
    svetlo(PRAH.rozliti, vyveskaSvit, "krm-pr-vyveska")
  );
}

/* ════════════════════ Vrstvy ════════════════════ */

function uvnitr(): string {
  const defs = `<defs>
    <pattern id="kd-pr-mrize" x="${PULT.x}" width="10" height="20" patternUnits="userSpaceOnUse">
      <rect width="10" height="20" fill="${P.drevoTma2}"/>
      <rect x="1" width="7" height="20" fill="${B.pultCelo}"/>
      <rect x="1" width="1.4" height="20" fill="#A87A52"/>
      <rect x="6.6" width="1.4" height="20" fill="${P.drevo}"/>
    </pattern>
  </defs>`;
  return defs + vylohaVnitrek(VL, -1) + vylohaVnitrek(VP, 1) + kramVnitrek();
}

function predni(): string {
  const R = PRIZEMI.roleta;
  const defs = `<defs>
    <clipPath id="kd-pr-roleta-orez"><rect x="${R.x}" y="${R.y}" width="${R.w}" height="${R.h}"/></clipPath>
    <pattern id="kd-pr-lamely" x="0" y="${R.y}" width="40" height="16" patternUnits="userSpaceOnUse">
      <rect width="40" height="16" fill="${B.lamela}"/>
      <rect width="40" height="3" fill="${B.lamelaSvetla}"/>
      <rect y="3" width="40" height="2" fill="#A4ADB3"/>
      <rect y="10.5" width="40" height="3.5" fill="${B.lamelaTma}"/>
      <rect y="14" width="40" height="2" fill="${B.lamelaSpara}"/>
    </pattern>
  </defs>`;
  // stín schránky pod sebou (na rámech, norenu i stažené roletě)
  const stinSchranky = obdelnik(X.zedL, NAHORE, X.zedP - X.zedL, 9, `fill="${P.inkoust}" opacity="0.16"`);
  // stín sloupů vpravo od nich (světlo zleva)
  const stinySloupu = obdelniky(PRIZEMI.sloupy.slice(0, 3).map((s): Obd => [s.x + s.w, NAHORE, 7, DOLE - NAHORE]), `fill="${P.inkoust}" opacity="0.12"`);
  return (
    defs +
    vylohaPred(VL, -1) +
    vylohaPred(VP, 1) +
    dverePred() +
    stinySloupu +
    PRIZEMI.sloupy.map((s, i) => sloup(s.x, i)).join("") +
    nalepky() +
    noren() +
    roleta() +
    stinSchranky +
    listy() +
    morijio() +
    schranka() +
    vyveska()
  );
}

export function prizemi(): Vrstvy {
  return { uvnitr: uvnitr(), zem: zem(), predni: predni(), svetla: svetla() };
}

/* ════════════════════ Pro stránku ════════════════════ */

/** Tři letáky na vývěsce, přes které stránka položí HTML odkazy (obálka otočeného papíru ve světě) */
export const PLAKATY: { x: number; y: number; w: number; h: number; odkaz: string; popis: string }[] = LETAKY_ODKAZY.map((l) => ({
  ...obalka(l),
  odkaz: l.odkaz,
  popis: l.popis,
}));

/** Místa v přízemí, na která sahá stránka */
export const PRIZEMI_MISTA = {
  /** Noren i s tyčí (skupina .krm-noren) */
  noren: { x: NOREN.x - 3, y: NOREN.y, w: NOREN.w + 6, h: NOREN_DOLE + 2 - NOREN.y } as Obdelnik,
  /** Osa norenu na tyči — transform-origin pro vítr i úklid (transform-box: view-box) */
  norenOsa: { x: X.stred, y: NAHORE + 4 },
  /** Tři pruhy látky (.krm-pr-noren-dil, data-i 0–2) — každý se smí vlnit sám kolem středu své horní hrany */
  norenDily: NOREN.dily,
  /** Žárovka lampy nad pultem (můry, záře) */
  lampa: { x: 1600, y: 1457 },
  /** Papír na stažené roletě (v poloze „zavřeno“) */
  oznameni: { x: 1498, y: 1521, w: 204, h: 138 } as Obdelnik,
  /** Lampička nad vývěskou */
  lampaVyvesky: { x: 706, y: MISTA.vyveska.y + 36 },
};

/** Japonské znaky, které přízemí píše (pro podmnožinu písma Yuji Syuku) */
export const PRIZEMI_ZNAKY = (() => {
  const v = prizemi();
  const texty = Object.values(v).join("").match(/<(?:text|tspan)[^>]*>[^<]+/g) ?? [];
  const znaky = texty.flatMap((t) => [...t.replace(/^[^>]*>/, "")]).filter((z) => z.codePointAt(0)! > 0x2fff);
  return [...new Set(znaky)].join("");
})();
