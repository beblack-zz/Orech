/**
 * Vyrobí noční obrázky krámku (Obchod) z běžícího dev serveru.
 *
 *   astro dev --background
 *   node scripts/kramek-noc.mjs
 *
 * Bere stránku /kresby/kramek (kresba/nocni.ts — žádná druhá kopie kresby),
 * pro každé roční období a obě vrstvy (vzadu pod zbožím, vpredu nad ním)
 * udělá headless Edgem snímek 3200 × 2000 px na průhledném pozadí a uloží
 * ho do public/kramek/ jako AVIF a WebP. Vedle zapíše otisk.json s otiskem
 * kresby — když se kresba krámku změní a obrázky ne, build na to upozorní
 * (Kramek.astro). Spustit znovu po každé změně v components/obchod2/kresba.
 *
 * Proměnné: KRAMEK_URL (jinak http://localhost:4321), EDGE (cesta k msedge.exe).
 */
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";

const spust = promisify(execFile);
const zaklad = process.env.KRAMEK_URL ?? "http://localhost:4321";
const edge = process.env.EDGE ?? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const slozka = "public/kramek";
const SEZONY = ["zima", "predjari", "jaro", "leto", "podzim"];
const VRSTVY = ["vzadu", "vpredu"];
const W = 3200;
const H = 2000;

const html = await fetch(`${zaklad}/kresby/kramek`).then((r) => {
  if (!r.ok) throw new Error(`${zaklad}/kresby/kramek vrátilo ${r.status}. Běží dev server?`);
  return r.text();
});
const otisk = html.match(/data-otisk="([^"]+)"/)?.[1];
if (!otisk) throw new Error("Na stránce chybí data-otisk.");

await mkdir(slozka, { recursive: true });
const tmp = await mkdtemp(join(tmpdir(), "kramek-"));
try {
  for (const sezona of SEZONY) {
    for (const vrstva of VRSTVY) {
      const png = join(tmp, `${sezona}-${vrstva}.png`);
      await spust(edge, [
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--force-device-scale-factor=1",
        `--window-size=${W},${H}`,
        "--default-background-color=00000000",
        "--virtual-time-budget=10000",
        `--user-data-dir=${join(tmp, "profil")}`,
        `--screenshot=${png}`,
        `${zaklad}/kresby/kramek?vrstva=${vrstva}&sezona=${sezona}`,
      ], { timeout: 120_000 });
      const obraz = sharp(await readFile(png)).resize(W, H, { fit: "fill" });
      const jmeno = `noc-${sezona}-${vrstva}`;
      await obraz.clone().avif({ quality: 58, effort: 6 }).toFile(join(slozka, `${jmeno}.avif`));
      await obraz.clone().webp({ quality: 82, alphaQuality: 90, effort: 6 }).toFile(join(slozka, `${jmeno}.webp`));
      console.log("hotovo", jmeno);
    }
  }
  await writeFile(join(slozka, "otisk.json"), `${JSON.stringify({ otisk }, null, 2)}\n`);
  console.log("otisk", otisk);
} finally {
  await rm(tmp, { recursive: true, force: true });
}
