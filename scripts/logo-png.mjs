/**
 * Vyrobí PNG otisky značky z běžícího dev serveru.
 *
 *   node scripts/logo-png.mjs
 *
 * Bere SVG ze stránky /logo-export (tedy přesně to, co je na webu — žádná
 * druhá kopie kresby, která by se časem rozešla) a vysází ho na krémový
 * čtverec. Instagram profilovku ořezává do kruhu, takže značka nesmí
 * sahat až k okraji: `pomer` říká, jakou část strany zabere.
 */
import { writeFile, mkdir } from "node:fs/promises";
import sharp from "sharp";

const zdroj = process.env.LOGO_URL ?? "http://localhost:4321/logo-export";
const slozka = "public/znacka";
const pozadi = "#F4EBDD";

/**
 * Velikosti, které se hodí: profilovka, avatar do mailu, značka na volno.
 * `pruhledne` nechá podklad průhledný — rýhy v desce pak nejsou krémové,
 * ale prosvítá jimi to, na čem obrázek leží.
 */
const vystupy = [
  { nazev: "jirosaku-profil-1080.png", px: 1080, pomer: 0.82 },
  { nazev: "jirosaku-profil-320.png", px: 320, pomer: 0.82 },
  { nazev: "jirosaku-znacka-512.png", px: 512, pomer: 0.88 },
  { nazev: "jirosaku-znacka-1080-pruhledne.png", px: 1080, pomer: 0.88, pruhledne: true },
  { nazev: "jirosaku-znacka-512-pruhledne.png", px: 512, pomer: 0.88, pruhledne: true },
];

const html = await fetch(zdroj).then((r) => {
  if (!r.ok) throw new Error(`${zdroj} vrátilo ${r.status}. Běží dev server?`);
  return r.text();
});

const svg = html.match(/<svg[\s\S]*?<\/svg>/)?.[0];
if (!svg) throw new Error("Na stránce nebylo žádné SVG.");

await mkdir(slozka, { recursive: true });

for (const { nazev, px, pomer, pruhledne = false } of vystupy) {
  const znacka = Math.round(px * pomer);
  const okraj = Math.round((px - znacka) / 2);

  const vrstva = await sharp(Buffer.from(svg))
    .resize(znacka, znacka)
    .png()
    .toBuffer();

  const hotovo = await sharp({
    create: {
      width: px,
      height: px,
      channels: 4,
      background: pruhledne ? { r: 0, g: 0, b: 0, alpha: 0 } : pozadi,
    },
  })
    .composite([{ input: vrstva, top: okraj, left: okraj }])
    .png()
    .toBuffer();

  await writeFile(`${slozka}/${nazev}`, hotovo);
  console.log(
    `${slozka}/${nazev} — ${px}×${px} px, značka ${znacka} px${pruhledne ? ", průhledné pozadí" : ""}`,
  );
}
