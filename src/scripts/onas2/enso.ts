/**
 * Ensō na papíře — kreslí se štětcem do <canvas>. Šířka tahu jde
 * s rychlostí (pomalu tlustě, rychle tence), u pera i s přítlakem, a ke
 * konci štětec vysychá: tah se trhá do vláken, jako u ensō ve značce.
 * Po zvednutí se tah změří (velikost, kulatost, kolikrát obešel střed)
 * a ozve se někdo z party (data/onas2.ts — ensoReakce). Obrázek jde
 * uložit jako PNG i s pečetí a datem.
 *
 * Kdo nechce nebo nemůže kreslit, nechá kruh nakreslit („za mě“).
 */
import { klid } from "../parta2/stav";
import { jmeno } from "../parta2/kami";
import { ensoReakce } from "../../data/onas2";
import type { EnsoDruh } from "../../data/onas2";
import type { PostavaId } from "../../data/parta";
import * as zvuk from "../parta2/zvuk";

interface Bod {
  x: number;
  y: number;
  /** Šířka štětce v tomhle bodě */
  w: number;
  /** Kolik tuše ve štětci ještě zbývá (1 = plný) */
  i: number;
}

const hash = (a: number, b: number) => {
  let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

export function enso() {
  const koren = document.querySelector<HTMLElement>("[data-enso]");
  if (!koren) return;
  const canvas = koren.querySelector<HTMLCanvasElement>(".enso-platno")!;
  const ctx = canvas.getContext("2d")!;
  const pokyn = koren.querySelector<HTMLElement>(".enso-pokyn");
  const odpoved = koren.querySelector<HTMLElement>(".enso-odpoved")!;
  const odpJmeno = koren.querySelector<HTMLElement>(".enso-odpoved-jmeno")!;
  const odpVeta = koren.querySelector<HTMLElement>(".enso-odpoved-veta")!;
  const znovu = koren.querySelector<HTMLButtonElement>("[data-enso-znovu]")!;
  const zaMe = koren.querySelector<HTMLButtonElement>("[data-enso-zaMe]")!;
  const ulozit = koren.querySelector<HTMLAnchorElement>("[data-enso-ulozit]")!;

  let W = 0;
  let H = 0;
  let dpr = 1;
  let papir: HTMLCanvasElement | null = null;
  let body: Bod[] = [];
  let kresli = false;
  let hotovo = false;
  let delka = 0;
  let sirka = 0;
  let posledni = { x: 0, y: 0, t: 0 };
  let animace = 0;

  /* Papír: teplá běl, vlákna a zrno — kreslí se jednou a pak se jen kopíruje */
  const vyrobPapir = () => {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const p = c.getContext("2d")!;
    p.fillStyle = "#FBF6EA";
    p.fillRect(0, 0, W, H);
    for (let k = 0; k < 900; k++) {
      const x = hash(k, 1) * W;
      const y = hash(k, 2) * H;
      p.fillStyle = hash(k, 3) > 0.5 ? "rgba(160, 130, 90, 0.08)" : "rgba(255, 255, 255, 0.5)";
      p.fillRect(x, y, 1.2 * dpr, 1.2 * dpr);
    }
    p.lineWidth = 0.6 * dpr;
    for (let k = 0; k < 70; k++) {
      const x = hash(k, 4) * W;
      const y = hash(k, 5) * H;
      const a = hash(k, 6) * Math.PI;
      const l = (12 + hash(k, 7) * 30) * dpr;
      p.strokeStyle = "rgba(150, 120, 80, 0.12)";
      p.beginPath();
      p.moveTo(x, y);
      p.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + 4, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
      p.stroke();
    }
    return c;
  };

  const maxW = () => Math.min(W, H) * 0.06;

  /** Jeden kousek tahu mezi dvěma body; vlákna podle zbylé tuše */
  const usek = (a: Bod, b: Bod, k: number) => {
    const w = (a.w + b.w) / 2;
    const inkoust = (a.i + b.i) / 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = `rgba(30, 22, 18, ${(0.6 + 0.32 * inkoust).toFixed(3)})`;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 1;
    const nx = -dy / d;
    const ny = dx / d;
    ctx.lineWidth = Math.max(0.6, w * 0.1);
    for (let v = 0; v < 7; v++) {
      const o = ((v + 0.5) / 7 - 0.5) * w * 1.02;
      const suche = hash(k >> 1, v) > inkoust * 1.25;
      ctx.strokeStyle = suche ? `rgba(251, 246, 234, ${(0.75 * (1 - inkoust)).toFixed(3)})` : `rgba(18, 12, 9, ${(0.16 * inkoust).toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(a.x + nx * o, a.y + ny * o);
      ctx.lineTo(b.x + nx * o, b.y + ny * o);
      ctx.stroke();
    }
  };

  /** Kapka, kde štětec dosedl */
  const dosednuti = (b: Bod) => {
    ctx.fillStyle = "rgba(30, 22, 18, 0.9)";
    ctx.beginPath();
    ctx.ellipse(b.x, b.y, maxW() * 0.55, maxW() * 0.48, 0.6, 0, Math.PI * 2);
    ctx.fill();
  };

  const prekresli = () => {
    if (!papir) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(papir, 0, 0);
    if (!body.length) return;
    dosednuti(body[0]);
    for (let k = 1; k < body.length; k++) usek(body[k - 1], body[k], k);
  };

  const velikost = () => {
    const r = canvas.getBoundingClientRect();
    if (!r.width) return;
    const stareW = W;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.round(r.width * dpr);
    H = Math.round(r.height * dpr);
    if (stareW && stareW !== W) {
      const k = W / stareW;
      body = body.map((b) => ({ ...b, x: b.x * k, y: b.y * k, w: b.w * k }));
    }
    canvas.width = W;
    canvas.height = H;
    papir = vyrobPapir();
    prekresli();
  };

  const vycisti = () => {
    cancelAnimationFrame(animace);
    body = [];
    delka = 0;
    hotovo = false;
    kresli = false;
    prekresli();
    odpoved.hidden = true;
    znovu.disabled = true;
    ulozit.setAttribute("aria-disabled", "true");
    ulozit.removeAttribute("href");
    pokyn?.classList.remove("pryc");
  };

  const pridej = (x: number, y: number, t: number, tlak = 0) => {
    const v = Math.hypot(x - posledni.x, y - posledni.y) / Math.max(1, t - posledni.t) / dpr;
    let cil = maxW() * Math.min(1, Math.max(0.2, 1.18 - v * 0.62));
    if (tlak > 0) cil *= 0.45 + tlak;
    sirka += (cil - sirka) * 0.32;
    delka += Math.hypot(x - posledni.x, y - posledni.y);
    const inkoust = Math.min(1, Math.max(0.1, 1 - delka / (Math.min(W, H) * 3.1)));
    const b: Bod = { x, y, w: sirka, i: inkoust };
    const a = body[body.length - 1];
    body.push(b);
    if (a) usek(a, b, body.length - 1);
    posledni = { x, y, t };
    zvuk.stetecSila(Math.min(1, v * 1.4));
  };

  const zacni = (x: number, y: number, t: number) => {
    if (hotovo || body.length) vycisti();
    kresli = true;
    sirka = maxW() * 0.9;
    posledni = { x, y, t };
    const b: Bod = { x, y, w: sirka, i: 1 };
    body.push(b);
    dosednuti(b);
    pokyn?.classList.add("pryc");
  };

  /* ——— Rozbor tahu ——— */
  const rozbor = (): EnsoDruh => {
    if (body.length < 8) return "kratky";
    const cx = body.reduce((s, b) => s + b.x, 0) / body.length;
    const cy = body.reduce((s, b) => s + b.y, 0) / body.length;
    const r = body.map((b) => Math.hypot(b.x - cx, b.y - cy));
    const R = r.reduce((s, x) => s + x, 0) / r.length;
    const sd = Math.sqrt(r.reduce((s, x) => s + (x - R) ** 2, 0) / r.length);
    let uhel = 0;
    let pred = Math.atan2(body[0].y - cy, body[0].x - cx);
    for (const b of body.slice(1)) {
      const a = Math.atan2(b.y - cy, b.x - cx);
      let d = a - pred;
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      uhel += d;
      pred = a;
    }
    const otacky = Math.abs(uhel) / (Math.PI * 2);
    const vel = R / Math.min(W, H);
    if (otacky < 0.55 || R < 8 * dpr) return "kratky";
    if (vel < 0.13) return "mrnavy";
    if (vel > 0.42) return "obri";
    if (otacky > 1.25) return "dvakrat";
    if (otacky < 0.92) return "otevreny";
    const kulatost = sd / R;
    if (kulatost < 0.055) return "kulaty";
    if (kulatost > 0.15) return "krivy";
    return "jiny";
  };

  const dokonci = () => {
    kresli = false;
    hotovo = true;
    zvuk.stetecSila(0);
    const druh = rozbor();
    const r = ensoReakce[druh];
    koren.querySelectorAll<HTMLElement>("[data-enso-kami]").forEach((k) => (k.hidden = k.dataset.ensoKami !== r.kdo));
    odpJmeno.textContent = jmeno(r.kdo as PostavaId);
    odpVeta.textContent = r.text;
    odpoved.hidden = false;
    odpoved.classList.remove("nova");
    void odpoved.offsetWidth;
    odpoved.classList.add("nova");
    zvuk.reakce(r.kdo as PostavaId);
    znovu.disabled = false;
    pripravUlozeni();
  };

  /* ——— Uložení: papír, tah, pečeť a datum ——— */
  const pripravUlozeni = async () => {
    try {
      await document.fonts?.load(`${Math.round(20 * dpr)}px "Yuji Syuku"`, "ジロ作");
    } catch {}
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const p = c.getContext("2d")!;
    p.drawImage(canvas, 0, 0);
    const s = Math.min(W, H) * 0.085;
    const x = W - s * 1.5;
    const y = H - s * 3.9;
    p.save();
    p.translate(x, y);
    p.rotate(-0.06);
    p.strokeStyle = "rgba(196, 67, 43, 0.9)";
    p.lineWidth = s * 0.09;
    p.strokeRect(0, 0, s, s * 2.7);
    p.fillStyle = "rgba(196, 67, 43, 0.92)";
    p.font = `${Math.round(s * 0.72)}px "Yuji Syuku", "Yu Mincho", serif`;
    p.textAlign = "center";
    p.textBaseline = "middle";
    ["ジ", "ロ", "作"].forEach((z, i) => p.fillText(z, s / 2, s * (0.48 + i * 0.86)));
    p.restore();
    const d = new Date();
    p.fillStyle = "rgba(43, 36, 32, 0.6)";
    p.font = `${Math.round(Math.min(W, H) * 0.032)}px "Fraunces Variable", Fraunces, Georgia, serif`;
    p.textAlign = "left";
    p.textBaseline = "alphabetic";
    p.fillText(`JIRO saku · Ořech · ${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`, Math.min(W, H) * 0.05, H - Math.min(W, H) * 0.05);
    ulozit.href = c.toDataURL("image/png");
    ulozit.removeAttribute("aria-disabled");
  };

  /* ——— Ovládání ——— */
  const bod = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * dpr, y: (e.clientY - r.top) * dpr };
  };
  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    const p = bod(e);
    zacni(p.x, p.y, performance.now());
  });
  canvas.addEventListener("pointermove", (e) => {
    // Kreslí jen držený štětec — ne myš, která jede přes papír, když se kreslí „za mě“
    if (!kresli || !canvas.hasPointerCapture(e.pointerId)) return;
    const udalosti = typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : [e];
    for (const u of udalosti.length ? udalosti : [e]) {
      const p = bod(u);
      if (Math.hypot(p.x - posledni.x, p.y - posledni.y) < 1.5 * dpr) continue;
      pridej(p.x, p.y, u.timeStamp || performance.now(), u.pointerType === "pen" ? u.pressure : 0);
    }
  });
  const pust = () => {
    if (kresli) dokonci();
  };
  canvas.addEventListener("pointerup", pust);
  canvas.addEventListener("pointercancel", pust);
  znovu.addEventListener("click", () => {
    vycisti();
    zvuk.papir();
  });
  ulozit.addEventListener("click", (e) => {
    if (ulozit.getAttribute("aria-disabled") === "true") e.preventDefault();
  });

  /* Za mě: kruh s rukou — poloměr dýchá, mezera náhodná, ke konci se stočí ven */
  zaMe.addEventListener("click", () => {
    vycisti();
    const cx = W / 2;
    const cy = H / 2;
    const R = Math.min(W, H) * (0.27 + Math.random() * 0.06);
    const od = Math.random() * Math.PI * 2;
    const rozsah = (Math.PI * 2 * (300 + Math.random() * 45)) / 360;
    const f = Math.random() * 6;
    const kroku = 90;
    const bodNa = (k: number) => {
      const t = k / kroku;
      const a = od + rozsah * t;
      const r = R * (1 + 0.03 * Math.sin(a * 2 + f) + 0.015 * Math.sin(a * 5 + f)) + R * 0.05 * Math.max(0, t - 0.8) / 0.2;
      return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
    };
    const z = bodNa(0);
    let t = performance.now();
    zacni(z.x, z.y, t);
    let k = 1;
    const krok = () => {
      // Rychlost: pomalé nasazení, rychlý střed, zpomalení na konci
      const n = klid ? kroku : Math.min(kroku, k + 2);
      for (; k <= n; k++) {
        const p = bodNa(k);
        const u = k / kroku;
        t += 4 + 22 * (1 - Math.sin(Math.PI * Math.min(1, u * 1.1)));
        pridej(p.x, p.y, t);
      }
      if (k <= kroku) animace = requestAnimationFrame(krok);
      else dokonci();
    };
    animace = requestAnimationFrame(krok);
  });

  new ResizeObserver(velikost).observe(canvas);
  velikost();
}
