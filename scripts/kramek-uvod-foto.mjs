/**
 * Vyfotí živý noční krámek z /obchod pro střepy na úvodu (VKramku.astro).
 *
 *   astro dev --background
 *   node scripts/kramek-uvod-foto.mjs
 *
 * Na rozdíl od scripts/kramek-noc.mjs (jen kresba, vrstvy zvlášť) bere
 * hotovou stránku i se vším, co na kresbě žije: lampiony, neon, zboží ve
 * výlohách, hodiny, automat, postavičky. Headless Edge otevře /obchod,
 * nechá scénu doběhnout, skryje všechno kromě .krm-svet, srovná ho na
 * 1 : 1 (3200 × 2000) a vyfotí. Výsledek jde do src/images/kramek-uvod.webp
 * (2400 px na šířku, úvod si z něj getImage udělá menší).
 *
 * Fotí roční období, které má /obchod dnes — po změně krámku nebo období
 * pustit znovu. Proměnné: KRAMEK_URL (jinak http://localhost:4321), EDGE.
 */
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";

const URL_ = (process.env.KRAMEK_URL ?? "http://localhost:4321") + "/obchod";
const EDGE = process.env.EDGE ?? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const VYSTUP = "src/images/kramek-uvod.webp";
const PORT = 9333;

const cekej = (ms) => new Promise((r) => setTimeout(r, ms));
const profil = await mkdtemp(join(tmpdir(), "kramek-uvod-"));
const edge = spawn(EDGE, ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profil}`, "--window-size=1600,1000", "--hide-scrollbars", "--mute-audio", "about:blank"], { stdio: "ignore" });

try {
  let cil;
  for (let i = 0; i < 40 && !cil; i++) {
    await cekej(250);
    try {
      cil = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find((t) => t.type === "page");
    } catch {}
  }
  if (!cil) throw new Error("Edge se nespustil");

  const ws = new WebSocket(cil.webSocketDebuggerUrl);
  await new Promise((r, e) => ((ws.onopen = r), (ws.onerror = e)));
  let id = 0;
  const cekajici = new Map();
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && cekajici.has(m.id)) {
      cekajici.get(m.id)(m);
      cekajici.delete(m.id);
    }
  };
  const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; cekajici.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const js = async (vyraz) => (await cdp("Runtime.evaluate", { expression: vyraz, awaitPromise: true, returnByValue: true })).result?.result?.value;

  await cdp("Page.enable");
  await cdp("Emulation.setDeviceMetricsOverride", { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
  await cdp("Page.navigate", { url: URL_ });
  /* scéna se ukáže celá najednou, až se načtou obrázky a lampiony se rozsvítí */
  await cekej(9000);

  const [w, h] = await js(`(() => {
    const svet = document.querySelector(".krm-svet");
    if (!svet) return [0, 0];
    const st = document.createElement("style");
    st.textContent = "body *{visibility:hidden!important} .krm-svet,.krm-svet *{visibility:visible!important} .krm,.krm-scena{transform:none!important;overflow:visible!important;contain:none!important} html,body{overflow:hidden!important}";
    document.head.append(st);
    svet.style.cssText += ";position:fixed!important;left:0!important;top:0!important;transform:none!important;z-index:2147483647;margin:0!important";
    return [svet.offsetWidth, svet.offsetHeight];
  })()`);
  if (!w) throw new Error("Na stránce není .krm-svet");

  await cdp("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await cekej(3000);
  const snimek = await cdp("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: w, height: h, scale: 1 } });
  ws.close();

  await sharp(Buffer.from(snimek.result.data, "base64")).resize(2400).webp({ quality: 86 }).toFile(VYSTUP);
  console.log(`[kramek-uvod] ${VYSTUP} (${w} × ${h} → 2400 px)`);
} finally {
  edge.kill();
  await cekej(500);
  await rm(profil, { recursive: true, force: true }).catch(() => {});
}
