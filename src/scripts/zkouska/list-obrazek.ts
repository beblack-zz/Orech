/**
 * Mistrovský list jako obrázek ke stažení (PNG, A4 při 150 dpi). Kreslí se
 * na plátno podle stejných dat jako list na stránce (Sin.astro): písmo je
 * to, které stránka už má načtené, razítka jsou z cest v razitka.ts (Path2D),
 * pečeť z pecet.ts, kus a parta se obkreslí ze svých SVG.
 *
 * Inkoust razítek dostane drobné vynechávky jako opravdový otisk —
 * deterministicky, ať je obrázek při každém stažení stejný.
 */
import { urovne, znamky, osloveni, list } from "../../data/mistr";
import type { OsloveniId, UrovenId, Znamka } from "../../data/mistr";
import { motivy, KRUHY, napisRazitka, znakRazitka, inkoustRazitka } from "../../components/zkouska/razitka";
import type { Tah } from "../../components/zkouska/razitka";
import { obrysPeceti, rozlozeni, PISMO_LATINKA, PISMO_ZNAKY } from "../../components/zkouska/pecet";
import type { Pecet } from "../../components/zkouska/pecet";
import { nahoda } from "../../components/parta2/tvary";
import { datumCesky, datumJaponsky, rokJaponsky } from "./datum";

export interface DataListu {
  jmeno: string;
  osloveni: OsloveniId;
  kdy: number;
  znamky: Partial<Record<UrovenId, Znamka>>;
  pecet: Pecet;
  /** SVG kusu z Tvaru (kusSvg), nebo nic */
  kusSvg?: string;
  /** SVG devíti postaviček party, jak jsou na stránce */
  partaSvg: string[];
}

const W = 1240;
const H = 1754;
const PAPIR = "#F8F1E2";
const INKOUST = "#2B2420";
const RUMELKA = "#C4432B";

const FRAUNCES = `"Fraunces Variable", Fraunces, Georgia, serif`;
const NEWSREADER = `"Newsreader Variable", Newsreader, Georgia, serif`;
const CAVEAT = `Caveat, "Comic Sans MS", cursive`;
const KANJI = `"Yuji Syuku", "Yu Mincho", "Hiragino Mincho ProN", serif`;

/* ——— Pomocníci ——— */

function obrazek(svg: string): Promise<HTMLImageElement | null> {
  return new Promise((hotovo) => {
    const s = svg.includes("xmlns=") ? svg : svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
    const url = URL.createObjectURL(new Blob([s], { type: "image/svg+xml" }));
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      hotovo(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      hotovo(null);
    };
    img.src = url;
  });
}

function zalom(c: CanvasRenderingContext2D, text: string, sirka: number) {
  const slova = text.split(/\s+/);
  const radky: string[] = [];
  let radek = "";
  for (const s of slova) {
    const zkus = radek ? `${radek} ${s}` : s;
    if (c.measureText(zkus).width > sirka && radek) {
      radky.push(radek);
      radek = s;
    } else radek = zkus;
  }
  if (radek) radky.push(radek);
  return radky;
}

/** Text s prostrkáním (canvas letterSpacing ještě všude neumí) */
function prostrkane(c: CanvasRenderingContext2D, text: string, x: number, y: number, mezera: number) {
  const znaky = [...text];
  const sirky = znaky.map((z) => c.measureText(z).width);
  const celkem = sirky.reduce((a, b) => a + b, 0) + mezera * (znaky.length - 1);
  let px = x - celkem / 2;
  const zarovnani = c.textAlign;
  c.textAlign = "left";
  znaky.forEach((z, i) => {
    c.fillText(z, px, y);
    px += sirky[i] + mezera;
  });
  c.textAlign = zarovnani;
}

function tahy(c: CanvasRenderingContext2D, seznam: Tah[], barva: string) {
  for (const t of seznam) {
    const p = new Path2D(t.d);
    const b = t.papir ? PAPIR : barva;
    if (t.tl === undefined) {
      c.fillStyle = b;
      c.fill(p);
    } else {
      c.strokeStyle = b;
      c.lineWidth = t.tl;
      c.lineCap = "round";
      c.lineJoin = "round";
      c.setLineDash(t.carky ?? []);
      c.stroke(p);
      c.setLineDash([]);
    }
  }
}

/** Vynechávky v inkoustu: drobné díry, aby otisk nebyl jako vytištěný */
function vynechavky(c: CanvasRenderingContext2D, x: number, y: number, s: number, seed: number, hustota = 1) {
  const r = nahoda(seed);
  c.save();
  c.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 160 * hustota; i++) {
    c.globalAlpha = 0.25 + r() * 0.6;
    c.beginPath();
    c.arc(x + r() * s, y + r() * s, (0.4 + r() * 1.3) * (s / 100), 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

/** Razítko úrovně do čtverce s rohem (x, y) a stranou s */
function razitko(c: CanvasRenderingContext2D, id: UrovenId, x: number, y: number, s: number, uhel: number, seed: number) {
  const vrstva = document.createElement("canvas");
  vrstva.width = vrstva.height = Math.ceil(s * 1.2);
  const v = vrstva.getContext("2d")!;
  const k = s / 100;
  const barva = inkoustRazitka(id);
  v.translate(s * 0.1, s * 0.1);
  v.scale(k, k);
  tahy(v, KRUHY, barva);
  tahy(v, motivy[id], barva);
  /* Nápis do oblouku: písmena po kružnici o poloměru 32,5 */
  const napis = napisRazitka(id);
  const velikost = napis.length > 15 ? 6.4 : 7.2;
  v.fillStyle = barva;
  v.font = `700 ${velikost}px ${FRAUNCES}`;
  v.textAlign = "center";
  v.textBaseline = "alphabetic";
  const sirky = [...napis].map((z) => v.measureText(z).width + 1.1);
  const delka = sirky.reduce((a, b) => a + b, 0);
  let uh = -Math.PI / 2 - delka / 2 / 32.5;
  [...napis].forEach((z, i) => {
    const a = uh + sirky[i] / 2 / 32.5;
    v.save();
    v.translate(50 + Math.cos(a) * 32.5, 50 + Math.sin(a) * 32.5);
    v.rotate(a + Math.PI / 2);
    v.fillText(z, 0, 0);
    v.restore();
    uh += sirky[i] / 32.5;
  });
  v.font = `15px ${KANJI}`;
  v.fillText(znakRazitka(id), 50, 81);
  v.setTransform(1, 0, 0, 1, 0, 0);
  vynechavky(v, s * 0.1, s * 0.1, s, seed);
  c.save();
  c.translate(x + s / 2, y + s / 2);
  c.rotate(uhel);
  c.globalAlpha = 0.93;
  c.drawImage(vrstva, -s * 0.6, -s * 0.6);
  c.restore();
}

function znamka(c: CanvasRenderingContext2D, z: Znamka, x: number, y: number, s: number, uhel: number) {
  c.save();
  c.translate(x, y);
  c.rotate(uhel);
  c.strokeStyle = RUMELKA;
  c.lineWidth = s * 0.065;
  c.beginPath();
  c.roundRect(-s / 2 + s * 0.08, -s / 2 + s * 0.08, s * 0.84, s * 0.84, s * 0.1);
  c.stroke();
  c.fillStyle = RUMELKA;
  c.font = `${s * 0.62}px ${KANJI}`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(znamky[z].znak, 0, s * 0.04);
  c.restore();
}

function pecet(c: CanvasRenderingContext2D, p: Pecet, x: number, y: number, s: number, uhel: number) {
  const vrstva = document.createElement("canvas");
  vrstva.width = vrstva.height = Math.ceil(s);
  const v = vrstva.getContext("2d")!;
  v.scale(s / 100, s / 100);
  const obrys = new Path2D(obrysPeceti(p.tvar));
  const pismena = rozlozeni(p);
  const pis = () => {
    for (const z of pismena) {
      v.font = z.japonsky ? `${z.velikost}px ${PISMO_ZNAKY}` : `700 ${z.velikost}px ${PISMO_LATINKA}`;
      v.textAlign = "center";
      v.textBaseline = "alphabetic";
      v.fillText(z.znak, z.x, z.y);
    }
  };
  v.fillStyle = RUMELKA;
  v.strokeStyle = RUMELKA;
  if (p.styl === "hakubun") {
    v.fill(obrys);
    v.globalCompositeOperation = "destination-out";
    pis();
    v.globalCompositeOperation = "source-over";
  } else {
    v.lineWidth = 5.4;
    v.stroke(obrys);
    pis();
  }
  v.setTransform(1, 0, 0, 1, 0, 0);
  vynechavky(v, 0, 0, s, 77, 0.8);
  c.save();
  c.translate(x, y);
  c.rotate(uhel);
  c.globalAlpha = 0.94;
  c.drawImage(vrstva, -s / 2, -s / 2);
  c.restore();
}

/* ——— List ——— */

export async function kresliList(d: DataListu): Promise<HTMLCanvasElement> {
  await Promise.all([
    document.fonts.load(`600 22px ${FRAUNCES}`),
    document.fonts.load(`italic 400 56px ${FRAUNCES}`),
    document.fonts.load(`500 80px ${FRAUNCES}`),
    document.fonts.load(`400 30px ${NEWSREADER}`),
    document.fonts.load(`italic 400 26px ${NEWSREADER}`),
    document.fonts.load(`34px ${CAVEAT}`),
    document.fonts.load(`150px ${KANJI}`, `${list.znak}名人胡桃工房${urovne.map((u) => u.znak).join("")}優良可令和年月日一二三四五六七八九十`),
  ]).catch(() => undefined);

  const platno = document.createElement("canvas");
  platno.width = W;
  platno.height = H;
  const c = platno.getContext("2d")!;

  /* Papír a rám */
  const g = c.createRadialGradient(W / 2, H * 0.42, 100, W / 2, H / 2, H * 0.75);
  g.addColorStop(0, "#FBF6EA");
  g.addColorStop(1, "#F0E4CB");
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  c.strokeStyle = RUMELKA;
  c.lineWidth = 6;
  c.strokeRect(46, 46, W - 92, H - 92);
  c.lineWidth = 1.5;
  c.strokeRect(62, 62, W - 124, H - 124);
  for (const [x, y] of [[54, 54], [W - 54, 54], [54, H - 54], [W - 54, H - 54]]) {
    c.save();
    c.translate(x, y);
    c.rotate(Math.PI / 4);
    c.fillStyle = PAPIR;
    c.fillRect(-13, -13, 26, 26);
    c.strokeStyle = RUMELKA;
    c.lineWidth = 2;
    c.strokeRect(-13, -13, 26, 26);
    c.fillStyle = RUMELKA;
    c.fillRect(-5, -5, 10, 10);
    c.restore();
  }

  c.textAlign = "center";
  c.textBaseline = "alphabetic";
  c.fillStyle = "#8A7C70";
  c.font = `600 21px ${FRAUNCES}`;
  prostrkane(c, "JIRO SAKU · KERAMICKÁ DÍLNA V OŘECHU", W / 2, 140, 3.4);

  c.fillStyle = INKOUST;
  c.font = `150px ${KANJI}`;
  prostrkane(c, list.znak, W / 2, 322, 22);

  c.fillStyle = RUMELKA;
  c.font = `italic 400 58px ${FRAUNCES}`;
  c.fillText(list.nazev, W / 2, 414);
  c.fillStyle = "#5C5047";
  c.font = `italic 400 27px ${NEWSREADER}`;
  c.fillText(`${list.cteni} · ${list.doslova}`, W / 2, 462);

  /* Oddělovač s kosočtvercem */
  c.strokeStyle = "rgba(43,36,32,0.35)";
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(W / 2 - 220, 512);
  c.lineTo(W / 2 - 16, 512);
  c.moveTo(W / 2 + 16, 512);
  c.lineTo(W / 2 + 220, 512);
  c.stroke();
  c.save();
  c.translate(W / 2, 512);
  c.rotate(Math.PI / 4);
  c.fillStyle = RUMELKA;
  c.fillRect(-6, -6, 12, 12);
  c.restore();

  c.fillStyle = "#5C5047";
  c.font = `36px ${CAVEAT}`;
  c.fillText("pro", W / 2, 572);

  /* Jméno a vedle něj pečeť */
  c.fillStyle = INKOUST;
  let velikost = 84;
  c.font = `500 ${velikost}px ${FRAUNCES}`;
  while (c.measureText(d.jmeno).width > 760 && velikost > 40) {
    velikost -= 4;
    c.font = `500 ${velikost}px ${FRAUNCES}`;
  }
  const sirkaJmena = c.measureText(d.jmeno).width;
  c.fillText(d.jmeno, W / 2 - 50, 668);
  pecet(c, d.pecet, W / 2 - 50 + sirkaJmena / 2 + 78, 636, 112, -0.12);
  c.strokeStyle = "rgba(43,36,32,0.4)";
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(W / 2 - 400, 690);
  c.lineTo(W / 2 + 300, 690);
  c.stroke();

  /* Titul */
  const o = osloveni[d.osloveni];
  c.font = `40px ${KANJI}`;
  const sirkaZnaku = c.measureText("名人").width;
  c.font = `600 34px ${FRAUNCES}`;
  const sirkaTitulu = c.measureText(o.z).width;
  const zacatek = W / 2 - (sirkaZnaku + 18 + sirkaTitulu) / 2;
  c.textAlign = "left";
  c.fillStyle = "#6B3E8C";
  c.font = `40px ${KANJI}`;
  c.fillText("名人", zacatek, 752);
  c.fillStyle = INKOUST;
  c.font = `600 34px ${FRAUNCES}`;
  c.fillText(o.z, zacatek + sirkaZnaku + 18, 750);
  c.textAlign = "center";

  /* Text listu */
  c.fillStyle = "#3A302A";
  c.font = `400 30px ${NEWSREADER}`;
  zalom(c, list.text, 860).forEach((r, i) => c.fillText(r, W / 2, 826 + i * 46));

  /* Devět razítek v řadě, pod každým jméno zastavení a známka */
  const s = 116;
  const krok = (W - 2 * 88) / 9;
  urovne.forEach((u, i) => {
    const x = 88 + krok * i + (krok - s) / 2;
    const y = 1052 + (i % 2 ? 16 : 0);
    const z = d.znamky[u.id];
    if (z) {
      razitko(c, u.id, x, y, s, [-0.14, 0.1, -0.05, 0.12, -0.1, 0.06, -0.12, 0.09, -0.04][i], 100 + i);
      znamka(c, z, x + s - 6, y + s - 8, 40, 0.12);
    } else {
      c.strokeStyle = "rgba(43,36,32,0.25)";
      c.setLineDash([5, 5]);
      c.beginPath();
      c.arc(x + s / 2, y + s / 2, s * 0.44, 0, Math.PI * 2);
      c.stroke();
      c.setLineDash([]);
    }
    c.fillStyle = "#5C5047";
    c.font = `600 17px ${FRAUNCES}`;
    c.fillText(u.stanice, x + s / 2, y + s + 32);
  });

  /* Dole: kus, datum, podpis party a pečeť dílny */
  const kus = d.kusSvg ? await obrazek(d.kusSvg) : null;
  if (kus) {
    c.drawImage(kus, 92, 1318, 270, 270);
    c.fillStyle = "#5C5047";
    c.font = `27px ${CAVEAT}`;
    c.fillText("Kus podle předlohy", 92 + 135, 1622);
  }
  c.fillStyle = INKOUST;
  c.font = `500 30px ${FRAUNCES}`;
  c.fillText(datumCesky(d.kdy), W / 2, 1378);
  c.fillStyle = "#5C5047";
  c.font = `28px ${KANJI}`;
  c.fillText(`${rokJaponsky(d.kdy)}${datumJaponsky(d.kdy)}`, W / 2, 1424);
  c.fillStyle = INKOUST;
  c.font = `italic 400 34px ${FRAUNCES}`;
  c.fillText(list.podpis, W / 2, 1498);
  const obrazky = await Promise.all(d.partaSvg.map(obrazek));
  const krokParty = 60;
  obrazky.forEach((img, i) => {
    if (img) c.drawImage(img, W / 2 - (9 * krokParty) / 2 + i * krokParty - 6, 1520, 72, 72);
  });

  /* Pečeť dílny 胡桃工房 — znaky jsou vyryté, prosvítá papír */
  const vrstva = document.createElement("canvas");
  vrstva.width = vrstva.height = 180;
  const v = vrstva.getContext("2d")!;
  v.fillStyle = RUMELKA;
  v.beginPath();
  v.roundRect(0, 0, 180, 180, 9);
  v.fill();
  v.globalCompositeOperation = "destination-out";
  v.lineWidth = 2.6;
  v.beginPath();
  v.roundRect(11, 11, 158, 158, 5);
  v.stroke();
  v.font = `64px ${KANJI}`;
  v.textAlign = "center";
  for (const [z, x, y] of [["胡", 130, 72], ["桃", 130, 148], ["工", 50, 72], ["房", 50, 148]] as const) v.fillText(z, x, y);
  v.globalCompositeOperation = "source-over";
  vynechavky(v, 0, 0, 180, 9, 0.6);
  c.save();
  c.translate(1010, 1470);
  c.rotate(0.05);
  c.globalAlpha = 0.95;
  c.drawImage(vrstva, -90, -90);
  c.restore();

  return platno;
}

/** Nakreslí list a nabídne ho ke stažení */
export async function stahniList(d: DataListu) {
  const platno = await kresliList(d);
  const blob = await new Promise<Blob | null>((h) => platno.toBlob(h, "image/png"));
  if (!blob) throw new Error("Obrázek listu se nepovedl");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const bezDiakritiky = d.jmeno.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
  a.download = `mistrovsky-list${bezDiakritiky ? `-${bezDiakritiky}` : ""}.png`;
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}
