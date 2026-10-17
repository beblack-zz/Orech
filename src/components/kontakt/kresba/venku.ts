/**
 * Kontakt venku — provázkový telefon (糸電話). Vpředu v trávě leží Futatsu
 * otvorem k nám, z jeho paty vede provázek kōhaku přes údolí s Ořechem až
 * k zelenému domu z Luční, kde na plotě sedí ten, kdo má službu, s druhým
 * hrnkem. Provázek, světélka, visačky s otázkami, dopis a vrabce kreslí
 * scripts/kontakt/scena.ts po snímcích; tady je jen stálá krajina, konec
 * provázku a popředí, plus body, kde co je.
 *
 * Dvě rozvržení:
 *   siroka  počítač: výška scény je vždy 900 jednotek, šířka podle okna;
 *           text je vlevo nahoře na obloze, hrnek pod ním, dům vpravo
 *   uzka    mobil a úzká okna: jednotky jsou CSS pixely, text je nahoře
 *           přes celou šířku a scéna je pás pod ním (od `panel.dolni`)
 *
 * Barvy krajiny jsou třídy svt-* z úvodu (svitaniStyly), takže je přebarví
 * roční období; vzdálené hřebeny berou barvu z oblohy (--kopec-daleko).
 */
import { domek } from "../../domek2/kresba/domek";
import type { PostavaId } from "../../../data/parta";
import {
  type Bod, f, omez, lerp, chomac, nahoda, vzorkuj, hladka, vyskaNa,
  hreben, plocha, les, pole, vesnice, strom, briza, pesina, cedulkaBrany, noren, kami, hrnek, list,
  provazek, provazekSvg,
} from "./zaklad";

export type Rezim = "siroka" | "uzka";

export interface VenkuVolby {
  /** Rozměr scény v jednotkách */
  W: number;
  H: number;
  rezim: Rezim;
  /** Pravý a dolní okraj textu v jednotkách scény */
  panel: { prava: number; dolni: number };
  otevreno: boolean;
  /** Hodiny telefonu: ten na plotě je vzhůru (jinak spí) */
  vzhuru: boolean;
  /** Kdo sedí na plotě s druhým hrnkem */
  kdo: PostavaId;
}

export interface Slot {
  t: number;
  nit: number;
  sirka: number;
}

export interface VenkuBody {
  /** Pata našeho hrnku (začátek provázku) a otvor (kam se kliká) */
  pata: Bod;
  otvor: Bod;
  otvorR: number;
  /** Pata druhého hrnku na plotě (konec provázku) */
  konec: Bod;
  /** Průhyb volného provázku a napnutého při hovoru */
  prohyb: number;
  napnuty: number;
  /** Šířka provázku u nás a vzadu */
  w0: number;
  w1: number;
  /** Okno dílny (kamera do něj vjede) */
  okno: Bod;
  /** Hlava toho, kdo má službu (sem míří bubliny) */
  hlava: Bod;
  /** Brána (sem se přichází) a obdélník domu (klik = kudy k nám) */
  brana: Bod;
  dum: [number, number, number, number];
  /** Okno dílny jako druhý vchod (klik = nahlédnout dovnitř bez hovoru) */
  oknoKlik: [number, number, number, number];
  /** Pěšina od brány k divákovi jako cesta SVG */
  cesta: string;
  sloty: Slot[];
  visackaM: number;
  vrabci: { t: number; m: number; zrcadlo: boolean }[];
  dopisM: number;
  /** Měřítko drobností (vrabci, dopis, světélka) vůči počítači */
  m: number;
  /** Kde druhá šňůra od paty Futatsu přechází přes spodní okraj na louku, a její šířka */
  sestup: Bod;
  sestupW: number;
}

const KAMI_DUM = { x: 150, y: 276 };

export function venku(o: VenkuVolby) {
  const { W, H, rezim, panel, otevreno, vzhuru, kdo } = o;
  const siroka = rezim === "siroka";
  const R = nahoda(4401);

  /* ——— geometrie podle rozvržení ——— */
  let k: number; // měřítko vůči návrhu
  let yH1: number, yH2: number, yKopce: number, yBlizko: number, zem: number;
  let DS: number, DX: number;
  let cup: { x: number; y: number; s: number; rot: number; uhel: number };
  let louka: Bod[];
  if (siroka) {
    k = 1;
    yH1 = 418; yH2 = 460; yKopce = 496; yBlizko = 650; zem = 600;
    DS = omez((W - panel.prava - 140) / 560, 0.72, 1.15);
    DX = W - 64 - 470 * DS;
    const volno = H - panel.dolni;
    /* pod textem je místo na hrnek, nebo si lehne vedle karty (nízká okna, dlouhý panel) */
    const pod = volno >= 24 + 87.9 * 3.55 * 0.62;
    const s = 3.55 * (pod ? omez(volno / 378, 0.62, 1.08) : 0.66);
    const y = pod ? Math.max(742, panel.dolni + 24 + 47.9 * s) : H - 64 * s - 22;
    const x = pod ? 60 + 72 * s : panel.prava + 64 * s;
    cup = { x, y, s, rot: -104, uhel: 62 };
    const dy = y - 742, dx = x - (60 + 72 * s);
    louka = [[-60, 792], [90, 780], [250, 788], [420, 814], [560, 852], [660, 900], [720, 960]].map(([bx, yy]) => [bx * (s / 3.55) + dx, yy + dy] as Bod);
    /* vedle karty: kopeček s hrnkem vybíhá zleva zdola, ať nemá useknutý kraj */
    if (!pod) louka.unshift([-60, H + 30]);
  } else {
    const st = panel.dolni;
    const sh = Math.max(240, H - st);
    k = Math.min(sh / 374, (W / 390) * 1.25);
    const Y = (y: number) => st + (y - 470) * k;
    yH1 = Y(540); yH2 = Y(557); yKopce = Y(576); yBlizko = Y(654); zem = Y(702);
    DS = 0.46 * k;
    DX = W - 404 * DS + 12 * k;
    cup = { x: 58 * k, y: H - 34 * k, s: 1.38 * k, rot: -124, uhel: 30 };
    louka = [[-30, 818], [60, 810], [130, 820], [196, 846], [236, 880], [260, 920]].map(([x, y]) => [x * k, H - (844 - y) * k] as Bod);
  }
  const DY = zem - 300 * DS;
  const naDum = (x: number, y: number): Bod => [DX + x * DS, DY + y * DS];
  const [gx, gy] = naDum(232, 303);
  const cast = siroka ? 1 : k;

  /* ——— hřebeny ——— */
  const H1 = hreben(-60, W + 60, yH1, 12 * cast, 160 * cast, 11);
  const H2 = hreben(-60, W + 60, yH2, 10 * cast, 180 * cast, 12);
  const KOPCE = hreben(-60, W + 60, yKopce, 8 * cast, 200 * cast, 13);
  const BLIZKO = hreben(-60, W + 60, yBlizko, 7 * cast, 220 * cast, 14);
  const levyKraj = siroka ? panel.prava : 0;

  let s = `<g class="ko-hrebeny">`;
  s += `<path d="${plocha(H1, H + 20)}" style="fill:var(--kopec-daleko)"/>`;
  s += `<path class="svt-snih-daleko" d="${plocha(H1, H + 20)}"/>`;
  s += `<g style="fill:var(--kopec-blizko)" opacity="0.4"><path d="${les(H1, Math.max(levyKraj, W * 0.3), W * 0.72, 13 * cast, 501)}"/><path d="${les(H1, W * 0.78, W + 40, 11 * cast, 502)}"/></g>`;
  s += `<path d="${plocha(H2, H + 20)}" style="fill:var(--kopec-blizko)"/>`;
  s += `<path class="svt-snih-blizko" d="${plocha(H2, H + 20)}"/>`;
  s += `<g class="svt-les-blizko"><path d="${les(H2, W * 0.62, W * 0.95, 15 * cast, 512)}"/><path d="${les(H2, Math.max(levyKraj, W * 0.4), W * 0.52, 11 * cast, 513)}"/></g>`;

  s += `</g><g class="ko-zeme">`;

  /* kopce s poli a Ořech */
  const dole = yBlizko + 18 * cast;
  s += `<path class="svt-kopce" d="${plocha(KOPCE, H + 20)}"/>`;
  const hranice: number[] = [];
  for (let x = -160 * cast; x < W + 260 * cast; x += (220 + R() * 60) * cast) hranice.push(x);
  s += pole(KOPCE, hranice, dole, W * 0.52, 7301);
  s += `<path d="${plocha(KOPCE, H + 20)}" fill="url(#ko-svah)" opacity="0.8"/>`;
  const vx = siroka ? lerp(panel.prava, DX, 0.24) + 40 : Math.max(86 * k, W * 0.2);
  const vm = siroka ? 1 : 0.56 * k;
  const mista = [-104, -76, -50, 2, 30, 58, 86, 112].map((d) => vx + d * vm);
  const ves = vesnice(KOPCE, mista, vx - 28 * vm, 8811, vm);
  s += ves;
  const stromyKopce = siroka ? [[0.64, 18], [0.74, 16], [0.85, 14], [0.58, 15]] : [[0.5, 12], [0.62, 10]];
  stromyKopce.forEach(([p, r], i) => {
    const x = W * p;
    if (siroka && x < panel.prava + 40) return;
    s += strom(x, vyskaNa(vzorkuj(KOPCE, 8), x) - r * 0.4, r * cast, i);
  });

  /* blízká louka v údolí */
  s += `<path class="svt-blizko" d="${plocha(BLIZKO, H + 20)}"/>`;
  s += `<path class="svt-blizko-lem" d="${hladka(vzorkuj(BLIZKO, 40), false)}" fill="none" stroke-width="${f(5 * cast)}"/>`;
  const stromyBlizko = siroka ? [[0.35, 26], [0.54, 22], [0.23, 20], [0.09, 24]] : [[0.45, 12], [0.55, 9]];
  stromyBlizko.forEach(([p, r], i) => {
    const x = W * p;
    s += strom(x, vyskaNa(vzorkuj(BLIZKO, 8), x) - 10 * cast, r * cast, i + 10);
  });

  /* pahorek s domem */
  const PAHOREK: Bod[] = [
    [DX - 230 * DS, zem + 200 * DS], [DX - 150 * DS, zem + 130 * DS], [DX - 50 * DS, zem + 64 * DS], [DX + 40 * DS, zem + 22 * DS],
    [DX + 130 * DS, zem + 4 * DS], [DX + 240 * DS, zem], [DX + 360 * DS, zem + 1 * DS], [DX + 470 * DS, zem + 7 * DS], [W + 60, zem + 20 * DS],
  ];
  s += `<path class="svt-blizko" d="${plocha(PAHOREK, H + 20)}"/>`;
  s += `<path d="${plocha(PAHOREK, H + 20)}" fill="url(#ko-svah)"/>`;
  s += `<path class="svt-blizko-lem" d="${hladka(vzorkuj(PAHOREK, 40), false)}" fill="none" stroke-width="${f(4 * cast)}" opacity="0.8"/>`;
  s += briza(DX - 6 * DS, zem + 52 * DS, 38 * DS, 1);
  if (DX + 520 * DS < W + 40) s += briza(DX + 500 * DS, zem + 22 * DS, 44 * DS, 2);
  const osa: Bod[] = [
    [gx, gy], [gx - 44 * DS, gy + 22 * DS], [gx - 128 * DS, gy + 48 * DS], [gx - 214 * DS, gy + 80 * DS],
    [gx - 280 * DS, gy + 122 * DS], [gx - 318 * DS, gy + 182 * DS], [gx - 332 * DS, gy + 256 * DS], [gx - 336 * DS, H + 40],
  ];
  const cesta = pesina(osa, 7 * DS, 48 * DS, gy, H);
  s += cesta.svg;

  /* dům z Luční; okna podle CSS proměnných, sakura podle ročního období */
  s += `<g class="ko-domek" transform="translate(${f(DX)} ${f(DY)}) scale(${f(DS)})">${domek()}</g>`;
  const [nx, ny] = naDum(216, 258.6);
  if (otevreno) s += noren(nx, ny, 22 * DS, 11 * DS);
  const [cx, cy] = naDum(244, 277);
  s += `<g class="ko-cedulka-brany" transform="translate(${f(cx)} ${f(cy)}) scale(${f(0.64 * DS)})">${cedulkaBrany(otevreno)}</g>`;

  /* noc ztmaví zemi filtrem (kontakt.css), světla jsou až nad ní */
  s += `</g><g class="ko-svetla">`;
  const okna: [number, number, number, number][] = [[300, 208, 26, 30], [350, 206, 26, 30], [300, 252, 26, 28], [140, 186, 30, 28], [140, 234, 30, 26], [212, 170, 38, 34], [222, 216, 18, 20]];
  okna.forEach(([x, y, w, h]) => {
    const [ox, oy] = naDum(x, y);
    s += `<rect class="ko-okno-noc" x="${f(ox)}" y="${f(oy)}" width="${f(w * DS)}" height="${f(h * DS)}"/>`;
  });
  const [dx0, dy0] = naDum(203, 258);
  if (otevreno) {
    const [ox, oy] = naDum(232, 275);
    s += `<ellipse class="ko-zare-dilny" cx="${f(ox)}" cy="${f(oy)}" rx="${f(74 * DS)}" ry="${f(40 * DS)}" fill="url(#ko-zare-okna)"/>`;
    s += `<rect class="ko-dilna-sviti" x="${f(dx0)}" y="${f(dy0)}" width="${f(58 * DS)}" height="${f(14 * DS)}"/>`;
  }
  const [lx, ly] = naDum(83, 190);
  s += `<ellipse class="ko-lampa-zare" cx="${f(lx)}" cy="${f(ly + 6 * DS)}" rx="${f(70 * DS)}" ry="${f(56 * DS)}" fill="url(#ko-zare-lampy)"/>`;
  s += `</g>`;
  const krajina = s;

  /* ——— konec provázku: kdo má službu a druhý hrnek ——— */
  const [kx, ky] = naDum(KAMI_DUM.x, KAMI_DUM.y);
  const KV = 86 * (DS / 1.15);
  const km = KV / 180;
  const kamiX = kx - KV / 2, kamiY = ky - 158 * km;
  const druhy = hrnek({ id: "ko-h2", x: kamiX + 40 * km, y: kamiY + 92 * km, s: 0.3 * (DS / 1.15), rot: siroka ? 80 : 58, uhel: 62, nadhled: 12 });
  const konecBod = druhy.naObraz(0, 76);
  const spi = !vzhuru;
  const konecSvg = `<g class="ko-konec${spi ? " spi" : ""}">
    ${kami(kdo, kamiX, kamiY, KV, "ko-sluzba")}
    <g class="ko-druhy-hrnek">${druhy.svg}</g>
    ${spi ? `<g class="ko-zzz ko-ruka-tucne" font-size="${f(15 * DS)}"><text x="${f(kx + 18 * DS)}" y="${f(kamiY + 6 * DS)}">z</text><text x="${f(kx + 28 * DS)}" y="${f(kamiY - 8 * DS)}" font-size="${f(19 * DS)}">z</text><text x="${f(kx + 40 * DS)}" y="${f(kamiY - 26 * DS)}" font-size="${f(24 * DS)}">Z</text></g>` : ""}
  </g>`;

  /* ——— popředí: kopec u nás, Futatsu v trávě ——— */
  const nas = hrnek({ id: "ko-h1", x: cup.x, y: cup.y, s: cup.s, rot: cup.rot, uhel: cup.uhel, nadhled: 60, uzel: true });
  const pata = nas.naObraz(0, 76);
  const otvor = nas.naObraz(0, 38);
  const otvorR = 40 * cup.s;
  let p = "";
  p += `<path d="${plocha(louka, H + 40)}" fill="url(#ko-louka)"/>`;
  p += `<path class="ko-louka-lem" d="${hladka(vzorkuj(louka, 40), false)}" fill="none" stroke-width="${f(5 * cast)}"/>`;
  p += `<path class="svt-snih-blizko" d="${plocha(louka.map(([x, y]) => [x, y + 6] as Bod), H + 40)}"/>`;
  p += stebla(louka, -60, louka[louka.length - 2][0], siroka ? 220 : 110, 58 * cup.s / 3.55, 4101, ["svt-trava-1", "svt-trava-3", "ko-trava-sucha"], 0);
  /* sestup: od uzlu na patě vede druhá šňůra trávou dolů přes okraj obrazovky na louku */
  const w0 = siroka ? 6.6 : 4.4 * k;
  const sestup: Bod = [pata[0] + 26 * cup.s / 3.55, H + 4];
  const sestupTvar = (t: number): Bod => {
    const u = 1 - t;
    const c1: Bod = [pata[0] + 34 * cup.s / 3.55, pata[1] + (H - pata[1]) * 0.15];
    const c2: Bod = [sestup[0] - 18 * cup.s / 3.55, lerp(pata[1], H, 0.7)];
    return [
      u * u * u * pata[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * sestup[0],
      u * u * u * pata[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * sestup[1],
    ];
  };
  p += provazekSvg(provazek(sestupTvar, w0 * 0.9, w0, 0, 60), "ko-sestup", w0);
  const [stx, sty] = nas.naObraz(30, 76);
  p += `<ellipse cx="${f(stx + 40 * cup.s)}" cy="${f(Math.max(sty, cup.y) + 34 * cup.s)}" rx="${f(52 * cup.s)}" ry="${f(6 * cup.s)}" fill="url(#ko-stin-hrnku)"/>`;
  /* čárky zvonění kolem otvoru — bliknou, když hrnek zvoní (pozvani ve scena.ts) */
  const oblouk = (r: number, a0: number, a1: number) => {
    const [ox, oy] = otvor;
    const b0: Bod = [ox + Math.cos(a0) * r, oy + Math.sin(a0) * r], b1: Bod = [ox + Math.cos(a1) * r, oy + Math.sin(a1) * r];
    return `M${f(b0[0])} ${f(b0[1])} A${f(r)} ${f(r)} 0 0 1 ${f(b1[0])} ${f(b1[1])}`;
  };
  const D = Math.PI / 180;
  const carky = [1.16, 1.32, 1.48].map((q) => `${oblouk(otvorR * q, 158 * D, 196 * D)} ${oblouk(otvorR * q, 236 * D, 268 * D)}`).join(" ");
  p += `<g class="ko-nas-hrnek">${nas.svg}<path class="ko-hrnek-carky" d="${carky}" stroke-width="${f(Math.max(2, 3.2 * cup.s / 3.55))}" fill="none" stroke-linecap="round"/></g>`;
  p += stebla(louka, -60, louka[louka.length - 2][0], siroka ? 120 : 60, 70 * cup.s / 3.55, 4102, ["svt-trava-2", "svt-trava-1", "ko-trava-sucha"], 64 * cup.s / 3.55);
  p += drobnosti(louka, cup.s / 3.55);

  /* ——— drobnosti na provázku ——— */
  const delka = Math.hypot(konecBod[0] - pata[0], konecBod[1] - pata[1]);
  const sloty: Slot[] =
    delka > 560 ? [{ t: 0.355, nit: 12, sirka: 164 }, { t: 0.485, nit: 80, sirka: 150 }, { t: 0.6, nit: 10, sirka: 164 }]
    : delka > 330 ? [{ t: 0.4, nit: 12, sirka: 164 }, { t: 0.58, nit: 56, sirka: 150 }]
    : [{ t: 0.52, nit: 6, sirka: 150 }];
  const m = siroka ? Math.min(1, DS / 1.15 + 0.1) : 0.66 * k;
  const vrabci = siroka ? [{ t: 0.205, m: 1.12, zrcadlo: false }, { t: 0.275, m: 1.04, zrcadlo: true }] : [{ t: 0.31, m: 0.66 * k, zrcadlo: false }];

  const body: VenkuBody = {
    pata, otvor, otvorR,
    konec: konecBod,
    prohyb: siroka ? 58 : 34 * k,
    napnuty: siroka ? 26 : 14 * k,
    w0,
    w1: siroka ? 1.6 : 1.4 * k,
    okno: naDum(232, 275),
    hlava: [kx, kamiY + 14 * km],
    brana: [gx, gy],
    dum: [DX + 90 * DS, DY + 90 * DS, DX + 410 * DS, DY + 305 * DS],
    oknoKlik: [DX + 190 * DS, DY + 246 * DS, DX + 274 * DS, DY + 300 * DS],
    cesta: cesta.osa,
    sloty,
    visackaM: siroka ? 0.9 * m : 0.72 * k,
    vrabci,
    dopisM: siroka ? 1.15 * m : 0.66 * k,
    m,
    sestup,
    sestupW: w0,
  };
  return { krajina, konec: konecSvg, popredi: p, body };

  /** Stébla podél hrany kopce; barvy jsou třídy ročních období */
  function stebla(hrana: Bod[], x0: number, x1: number, pocet: number, vyska: number, seed: number, tridy: string[], posun: number) {
    const Rs = nahoda(seed);
    const Bh = vzorkuj(hrana, 8);
    let out = "";
    for (let i = 0; i < pocet; i++) {
      const x = x0 + Rs() * (x1 - x0);
      const y = vyskaNa(Bh, x) + 4 + posun * (0.4 + Rs() * 0.8);
      const w = (3 + Rs() * 5) * (siroka ? 1 : k);
      const h = vyska * (0.4 + Rs() * 0.6);
      const l = (Rs() - 0.35) * 34 * (vyska / 58);
      out += `<path class="${tridy[Math.floor(Rs() * tridy.length)]}" d="M${f(x - w / 2)} ${f(y)} Q${f(x + l * 0.35)} ${f(y - h * 0.6)} ${f(x + l)} ${f(y - h)} Q${f(x + l * 0.45)} ${f(y - h * 0.55)} ${f(x + w / 2)} ${f(y)} Z"/>`;
    }
    return out;
  }

  /** Spadané listy ořešáku, ořechy a ocúny na podzim; sedmikrásky na jaře, máky v létě, sníh v zimě */
  function drobnosti(hrana: Bod[], mm: number) {
    const Rd = nahoda(5501);
    const Bh = vzorkuj(hrana, 8);
    const x1 = hrana[hrana.length - 2][0];
    const misto = () => {
      const x = 20 * mm + Rd() * (x1 - 40 * mm);
      return [x, vyskaNa(Bh, x) + (30 + Rd() * 60) * mm] as Bod;
    };
    let podzim = "", jaro = "", leto = "", predjari = "";
    for (let i = 0; i < 16; i++) {
      const [x, y] = misto();
      podzim += `<g transform="translate(${f(x)} ${f(y)}) rotate(${f((Rd() - 0.5) * 140)}) scale(${f((1.2 + Rd() * 0.8) * mm)})">${list(Rd() < 0.5 ? "#D9A63C" : "#C27C2E")}</g>`;
    }
    for (let i = 0; i < 4; i++) {
      const [x, y] = misto();
      podzim += `<g transform="translate(${f(x)} ${f(y)}) scale(${f(1.5 * mm)})"><ellipse rx="6.4" ry="5.6" fill="#B98F5E"/><ellipse cx="-1.6" cy="-1.6" rx="2.6" ry="2" fill="#D9B482"/><path d="M-6 0 Q0 1.6 6 0" stroke="#7E5A36" stroke-width="1" fill="none"/></g>`;
    }
    for (let i = 0; i < 6; i++) {
      const [x, y] = misto();
      podzim += `<g transform="translate(${f(x)} ${f(y)}) scale(${f((1.2 + Rd() * 0.4) * mm)})"><path d="M0 0 L0 -16" stroke="#EDE6EE" stroke-width="2.4"/><path d="M-5 -16 C-6 -24 -3 -31 0 -32 C3 -31 6 -24 5 -16 C3 -14 -3 -14 -5 -16 Z" fill="#C8A2D6"/></g>`;
    }
    for (let i = 0; i < 14; i++) {
      const [x, y] = misto();
      jaro += `<g transform="translate(${f(x)} ${f(y)}) scale(${f((1.1 + Rd() * 0.5) * mm)})"><path d="M0 0 L0 -8" stroke="#4F7A36" stroke-width="1.6"/><g fill="#FFFFFF"><ellipse cx="0" cy="-10" rx="5" ry="2"/><ellipse cx="0" cy="-10" rx="2" ry="5"/></g><circle cx="0" cy="-10" r="1.8" fill="#F0BE3A"/></g>`;
      if (i % 2) jaro += `<g transform="translate(${f(x + 14 * mm)} ${f(y + 6 * mm)}) scale(${f(1.2 * mm)})"><path d="M0 0 Q-2 -10 0 -20" stroke="#4F7A36" stroke-width="2" fill="none"/><circle cx="0" cy="-23" r="6.6" fill="#F3C622"/><circle cx="0" cy="-23" r="4" fill="#F7D84A"/></g>`;
    }
    for (let i = 0; i < 10; i++) {
      const [x, y] = misto();
      leto += `<g transform="translate(${f(x)} ${f(y)}) scale(${f((1.1 + Rd() * 0.5) * mm)})"><path d="M0 0 Q2 -14 0 -26" stroke="#4F7A36" fill="none" stroke-width="2"/><circle cx="-3.4" cy="-28" r="6.4" fill="#D9452E"/><circle cx="3.4" cy="-28" r="6.4" fill="#E25A3E"/><circle cx="0" cy="-31" r="5" fill="#EC6A4A"/><circle cx="0" cy="-27.5" r="2.2" fill="#2B2420"/></g>`;
    }
    for (let i = 0; i < 10; i++) {
      const [x, y] = misto();
      predjari += `<g transform="translate(${f(x)} ${f(y)}) scale(${f((1.2 + Rd() * 0.4) * mm)})"><path d="M0 0 Q-1 -14 4 -20 Q7 -22 8 -18" stroke="#4F7A36" fill="none" stroke-width="1.5"/><path d="M8 -18 C4 -16 4 -9 8 -6 C12 -9 12 -16 8 -18 Z" fill="#FFFFFF"/></g>`;
    }
    return `<g class="svt-jen-podzim">${podzim}</g><g class="svt-jen-jaro">${jaro}</g><g class="svt-jen-leto">${leto}</g><g class="svt-jen-predjari">${predjari}</g>`;
  }
}

/** Přechody, které scéna potřebuje (vloží je skript do <defs>) */
export const VENKU_DEFS = `
  <linearGradient id="ko-svah" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#FFE3B8" stop-opacity="0.55"/><stop offset="0.45" stop-color="#FFE3B8" stop-opacity="0.14"/><stop offset="1" stop-color="#FFE3B8" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="ko-louka" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="svt-lz1"/><stop offset="1" class="svt-lz2"/></linearGradient>
  <radialGradient id="ko-zare-okna"><stop offset="0" stop-color="#FFC977" stop-opacity="0.6"/><stop offset="1" stop-color="#FFC977" stop-opacity="0"/></radialGradient>
  <radialGradient id="ko-zare-lampy"><stop offset="0" stop-color="#FFE7A3" stop-opacity="0.85"/><stop offset="0.4" stop-color="#FFC66E" stop-opacity="0.3"/><stop offset="1" stop-color="#FFB25A" stop-opacity="0"/></radialGradient>
  <radialGradient id="ko-stin-hrnku"><stop offset="0" stop-color="#2E3B25" stop-opacity="0.42"/><stop offset="1" stop-color="#2E3B25" stop-opacity="0"/></radialGradient>
  <radialGradient id="ko-koralek"><stop offset="0" stop-color="#FFF8E4" stop-opacity="1"/><stop offset="0.35" stop-color="#FFE29A" stop-opacity="0.65"/><stop offset="1" stop-color="#FFC66E" stop-opacity="0"/></radialGradient>`;
