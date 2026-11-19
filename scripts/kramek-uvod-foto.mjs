/**
 * Vyfotí přízemí živého nočního krámku z /obchod pro úvod (VKramku.astro):
 * lampiony, levá výloha s kusy z dílny, dveře a pravá výloha — do ní se
 * před focením přestěhují kusy z Japonska z okna patra (na místa kusů
 * z dílny v pravé výloze, ty se schovají). Tlačítka „do šátku“ a neon
 * „Vstoupit do obchodu“ se schovají, úvod má vlastní odkazy.
 *
 *   astro dev --background
 *   node scripts/kramek-uvod-foto.mjs
 *
 * Na rozdíl od scripts/kramek-noc.mjs (jen kresba, vrstvy zvlášť) bere
 * hotovou stránku i se vším, co na kresbě žije: lampiony, neon, zboží ve
 * výlohách, hodiny, automat, postavičky. Headless Edge otevře /obchod,
 * nechá scénu doběhnout, skryje všechno kromě .krm-svet, srovná ho na
 * 1 : 1 (3200 × 2000) a vyfotí jen VYREZ (pixely světa) ve dvojnásobném
 * rozlišení. Výsledek jde do src/images/kramek-prizemi.webp (1800 px na
 * šířku, úvod si z něj udělá menší). Modrý noren nad dveřmi je v kresbě
 * natvrdo — na úvodu přes něj visí náš (VKramku.astro, NOREN).
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
const VYSTUP = "src/images/kramek-prizemi.webp";
/** Přízemí od lampionů po chodník, sloup po sloup (pixely světa 3200 × 2000; VKramku.astro počítá s ním) */
const VYREZ = { x: 1060, y: 1215, width: 1080, height: 550 };
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
    /* kusy z Japonska do pravé výlohy */
    const kopie = ["left", "top", "width", "height", "--kus", "--hrana"];
    const japonsko = [...svet.querySelectorAll(".krm-kus[data-zastavka^=okno]")];
    const vpravo = [...svet.querySelectorAll(".krm-kus[data-zastavka=vylohaP]")];
    japonsko.forEach((kus, i) => {
      const misto = vpravo[i];
      if (!misto) return;
      kopie.forEach((v) => kus.style.setProperty(v, misto.style.getPropertyValue(v)));
    });
    vpravo.forEach((kus) => kus.style.setProperty("display", "none", "important"));
    svet.querySelectorAll(".krm-do-satku, .krm-vchod").forEach((el) => el.style.setProperty("display", "none", "important"));
    return [svet.offsetWidth, svet.offsetHeight];
  })()`);
  if (!w) throw new Error("Na stránce není .krm-svet");

  await cdp("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 2, mobile: false });
  await cekej(3000);
  /* svět se může na stránce posunout (rámy, okraje) — výřez se přepočte podle jeho obdélníku */
  const klip = await js(`(() => {
    const r = document.querySelector(".krm-svet").getBoundingClientRect();
    const k = r.width / 3200;
    return { x: r.left + ${VYREZ.x} * k, y: r.top + ${VYREZ.y} * k, width: ${VYREZ.width} * k, height: ${VYREZ.height} * k, k, left: r.left, top: r.top };
  })()`);
  console.log("[kramek-uvod] svět na stránce", klip);
  const snimek = await cdp("Page.captureScreenshot", { format: "png", clip: { x: klip.x, y: klip.y, width: klip.width, height: klip.height, scale: 1 } });
  ws.close();

  await sharp(Buffer.from(snimek.result.data, "base64")).resize(1800).webp({ quality: 84 }).toFile(VYSTUP);
  console.log(`[kramek-uvod] ${VYSTUP} (výřez ${VYREZ.width} × ${VYREZ.height} → 1800 px)`);
} finally {
  edge.kill();
  await cekej(500);
  await rm(profil, { recursive: true, force: true }).catch(() => {});
}
