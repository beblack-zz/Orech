/**
 * Kami z papíru — skládá PDF s vystřihovánkou a omalovánkou.
 *
 *   node scripts/papirna/papirna.mjs [složka s náhledy PNG]
 *
 * Výstup jde do public/papirna: kami-z-papiru.pdf a do listy/ malý náhled
 * každé strany (webp), který ukazuje stránka /papirna. Náhledy PNG s texty
 * (písmo jen přibližné) jsou na ladění rozvržení.
 *
 * Kresby jsou SVG (site.mjs, kresby.mjs, listy.mjs); sharp je převede na
 * obrázek 300 dpi a pdf-lib ho položí na stránku A4. Texty jdou do PDF
 * zvlášť jako písmo — Fraunces a Caveat z webu, spojené z latin
 * a latin-ext do jednoho TTF (scripts/papirna/pisma).
 *
 * Písma se dělala jednou fontTools (Python) z @fontsource souborů: varianta
 * latin a latin-ext se spojí do jednoho TTF (fontTools.merge.Merger),
 * Fraunces se předtím ustálí instancerem na wght 600, opsz 48, SOFT 100.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { listKachlik, listKapka, listDilna } from "./listy.mjs";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const { PDFDocument, rgb } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");

const tady = path.dirname(fileURLToPath(import.meta.url));
const koren = path.resolve(tady, "../..");
const VYSTUP = path.join(koren, "public/papirna/kami-z-papiru.pdf");
const NAHLEDY_WEBU = path.join(koren, "public/papirna/listy");
const nahledy = process.argv[2];

const MM = 72 / 25.4;
const A4 = [210 * MM, 297 * MM];
const DPI = 300;

const listy = [
  ["kachlik", listKachlik(false)],
  ["kapka", listKapka(false)],
  ["kachlik-obrys", listKachlik(true)],
  ["kapka-obrys", listKapka(true)],
  ["dilna", listDilna()],
];

const barva = (hex) => rgb(parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255);

const doc = await PDFDocument.create();
doc.registerFontkit(fontkit);
doc.setTitle("Kami z papíru");
doc.setAuthor("JIRO saku");
const pisma = {
  f: await doc.embedFont(fs.readFileSync(path.join(tady, "pisma/fraunces-600.ttf")), { subset: true }),
  c: await doc.embedFont(fs.readFileSync(path.join(tady, "pisma/caveat-600.ttf")), { subset: true }),
};

for (const [jmeno, list] of listy) {
  const px = [Math.round((210 / 25.4) * DPI), Math.round((297 / 25.4) * DPI)];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 297" width="${px[0]}" height="${px[1]}"><rect width="210" height="297" fill="#FFFFFF"/>${list.svg}</svg>`;
  const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: false }).toBuffer();
  const strana = doc.addPage(A4);
  strana.drawImage(await doc.embedPng(png), { x: 0, y: 0, width: A4[0], height: A4[1] });
  fs.mkdirSync(NAHLEDY_WEBU, { recursive: true });
  await sharp(png).resize(620).webp({ quality: 82 }).toFile(path.join(NAHLEDY_WEBU, `${jmeno}.webp`));
  for (const t of list.texty) {
    const font = pisma[t.pismo];
    const sirka = font.widthOfTextAtSize(t.t, t.vel);
    const x = t.x * MM - (t.zarovnani === "r" ? sirka : t.zarovnani === "c" ? sirka / 2 : 0);
    strana.drawText(t.t, { x, y: A4[1] - t.y * MM, size: t.vel, font, color: barva(t.barva) });
  }
  if (nahledy) {
    /* náhled i s texty — písmo jen přibližné (Georgia), jde o rozložení */
    const pt = 25.4 / 72;
    const texty = list.texty.map((t) => `<text x="${t.x}" y="${t.y}" font-family="Georgia" font-size="${(t.vel * pt).toFixed(2)}" fill="${t.barva}" text-anchor="${t.zarovnani === "r" ? "end" : t.zarovnani === "c" ? "middle" : "start"}">${t.t.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>`).join("");
    const nahled = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 297" width="1240" height="1754"><rect width="210" height="297" fill="#FFFFFF"/>${list.svg}${texty}</svg>`;
    fs.mkdirSync(nahledy, { recursive: true });
    await sharp(Buffer.from(nahled)).png().toFile(path.join(nahledy, `${jmeno}.png`));
  }
}

fs.mkdirSync(path.dirname(VYSTUP), { recursive: true });
fs.writeFileSync(VYSTUP, await doc.save());
console.log(`${path.relative(koren, VYSTUP)} — ${listy.length} stran`);
