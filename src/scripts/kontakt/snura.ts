/**
 * Šňůra přes louku (components/kontakt/kresba/snura.ts): změří, kde na
 * stránce leží sestup z první obrazovky (data-sestup-x/-w od scena.ts),
 * kotvy šňůry na stojanu ema (`.ko-ema-kotva[data-snura-kotva]`: střed je
 * bod, výška tloušťka nakreslené šňůry, `data-smer` ve stupních směr ven
 * ze stojanu: 0 doprava, 90 dolů, 180 doleva), spodek party u paty stojanu,
 * konec trámu vývěsky a levý okraj mapy, a podle toho šňůru nakreslí do
 * dvou vrstev v .ko-dole — za obsah (nad trávu louky) a přes vývěsku.
 * Po změně velikosti, zalomení textu, přiblížení mapy nebo nové události
 * `ko:sestup` kreslí znovu. Když stojan s kotvami chybí, vede šňůra od
 * sestupu přes kolíčky rovnou k vývěsce.
 *
 * Drnknutí: myš, která přejede přes volný kus šňůry, ho rozkmitá (vrabec
 * uletí) a se zapnutým zvukem zazní tón podle místa na šňůře, stejně jako
 * provázek nahoře (struna.ts). Kdo zahraje začátek Sakury, tomu se
 * rozhoupe celá šňůra. S omezeným pohybem se nehýbe nic.
 *
 * Bez skriptu tu šňůra není — je jen ozdoba, obsah je HTML.
 */
import { rozvrh, snuraPod, snuraNad, rozpetiSvg, rozpetiStin, type Snura, type SnuraMereni, type Kotva } from "../../components/kontakt/kresba/snura";
import { MAPA, MAPA_BLIZKO, MAPA_PRIVOD } from "../../components/kontakt/kresba/mapa";
import { svatekDne } from "../../components/kontakt/kresba/svatky";
import { ted } from "./cas";
import { stupen, brnk, hlidacMotivu } from "./struna";

/** Plátno začíná nad sekcí stejně jako louka (scripts/kontakt/louka.ts) */
const PRESAH = 60;
const NS = "http://www.w3.org/2000/svg";

/** Kde přívod mapy protíná levý okraj rámečku: podíl výšky rámečku a zvětšení */
function vstupDoMapy(blizko: boolean, s: number) {
  const zv = blizko ? s : 1;
  const cx = blizko ? MAPA_BLIZKO.cx / 100 : 0.5;
  const cy = blizko ? MAPA_BLIZKO.cy / 100 : 0.5;
  const xL = MAPA.x0 + MAPA.w * (cx - 0.5 / zv);
  const B = MAPA_PRIVOD;
  let y = B[B.length - 1][1];
  for (let i = 1; i < B.length; i++) {
    if (B[i][0] >= xL) {
      const u = Math.max(0, Math.min(1, (xL - B[i - 1][0]) / (B[i][0] - B[i - 1][0] || 1)));
      y = B[i - 1][1] + (B[i][1] - B[i - 1][1]) * u;
      break;
    }
  }
  return { podil: 0.5 + zv * ((y - MAPA.y0) / MAPA.h - cy), zv };
}

/** Průsečík úseček ab a cd: podíl na cd, nebo null */
function protne(a: [number, number], b: [number, number], c: [number, number], d: [number, number]) {
  const r = [b[0] - a[0], b[1] - a[1]], s = [d[0] - c[0], d[1] - c[1]];
  const den = r[0] * s[1] - r[1] * s[0];
  if (Math.abs(den) < 1e-9) return null;
  const qp = [c[0] - a[0], c[1] - a[1]];
  const t = (qp[0] * s[1] - qp[1] * s[0]) / den;
  const u = (qp[0] * r[1] - qp[1] * r[0]) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? u : null;
}

export function snuraLouky() {
  const dole = document.querySelector<HTMLElement>(".ko-dole");
  if (!dole) return;
  dole.querySelectorAll(".ko-snura, .ko-snura-nad").forEach((x) => x.remove());
  const vrstva = (trida: string) => {
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", `${trida} ko-venku`);
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    return svg;
  };
  const pod = vrstva("ko-snura");
  const nad = vrstva("ko-snura-nad");
  const platno = dole.querySelector(".ko-louka-platno");
  if (platno) platno.after(pod);
  else dole.prepend(pod);
  dole.append(nad);

  const klidne = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let snura: Snura | null = null;
  let posledni = "";
  /* rozkmitané kusy: kde se drnklo (0–1), síla a začátek */
  const kmity = new Map<number, { p: number; a: number; t0: number }>();
  const hlidac = hlidacMotivu();

  /* ——— měření ——— */
  function zmer(): SnuraMereni | null {
    const r = dole!.getBoundingClientRect();
    const W = Math.round(r.width);
    const H = Math.round(r.height + PRESAH);
    if (W < 10 || H < 200) return null;
    const X = (x: number) => x - r.left;
    const Y = (y: number) => y - r.top + PRESAH;
    const sx = Number(dole!.dataset.sestupX);
    const sw = Number(dole!.dataset.sestupW);
    const w = Number.isFinite(sw) && sw > 0 ? Math.max(3, Math.min(9, sw)) : W < 700 ? 4.4 : 6.6;

    /* stojan ema a kotvy šňůry na něm (kreslí ho Otazky.astro, tři podoby podle šířky) */
    const st = dole!.querySelector<HTMLElement>(".ko-ema-stojan")?.getBoundingClientRect();
    const stojan = st && st.width && st.height ? { l: X(st.left), r: X(st.right), t: Y(st.top), b: Y(st.bottom) } : null;
    /* parta u paty: spodek rámečků kami z offsetů (při příchodu a skocích je posouvá transform) */
    let parta: number | null = null;
    if (st && stojan) {
      dole!.querySelectorAll<HTMLElement>(".ko-ema-kami").forEach((k) => {
        if (k.offsetHeight) parta = Math.max(parta ?? -Infinity, stojan.t + k.offsetTop + k.offsetHeight);
      });
    }
    const kotva = (jmeno: string): Kotva | null => {
      const el = dole!.querySelector<HTMLElement>(`.ko-ema-kotva[data-snura-kotva="${jmeno}"]`);
      const b = el?.getBoundingClientRect();
      if (!el || !b || (!b.width && !b.height && !b.left && !b.top)) return null;
      const stupne = Number(el.dataset.smer);
      const a = (stupne * Math.PI) / 180;
      return {
        b: [X(b.left + b.width / 2), Y(b.top + b.height / 2)],
        w: b.height >= 1.5 ? Math.min(12, b.height) : w,
        smer: el.dataset.smer && Number.isFinite(stupne) ? [Math.cos(a), Math.sin(a)] : null,
      };
    };

    let vyveska: SnuraMereni["vyveska"] = null;
    const strecha = dole!.querySelector<SVGSVGElement>(".ko-vyveska-strecha")?.getBoundingClientRect();
    const fig = dole!.querySelector<HTMLElement>(".ko-mapa");
    const ram = fig?.querySelector<HTMLElement>(".ko-mapa-ram");
    if (strecha && strecha.width && fig && ram) {
      const sc = strecha.width / 1000;
      const hak: [number, number] = [X(strecha.left + 40 * sc), Y(strecha.top + 10 * sc)];
      /* levý okraj rámečku mapy i s natočením papíru */
      const fb = fig.getBoundingClientRect();
      const m = getComputedStyle(fig).transform.match(/matrix\(([^,]+),\s*([^,]+)/);
      const uhel = m ? Math.atan2(Number(m[2]), Number(m[1])) : 0;
      const blizko = ram.classList.contains("blizko");
      const s = Number(getComputedStyle(ram).getPropertyValue("--s")) || 2;
      const vs = vstupDoMapy(blizko, s);
      const lx = ram.offsetLeft - fig.offsetWidth / 2;
      const ly = ram.offsetTop + vs.podil * ram.offsetHeight - fig.offsetHeight / 2;
      const cx = fb.left + fb.width / 2, cy = fb.top + fb.height / 2;
      const vstup: [number, number] = [X(cx + lx * Math.cos(uhel) - ly * Math.sin(uhel)), Y(cy + lx * Math.sin(uhel) + ly * Math.cos(uhel))];
      const wMapy = 4.6 * (ram.offsetWidth / MAPA.w) * vs.zv;
      if (ram.offsetWidth > 40) vyveska = { hak, hakR: 10 * sc, strecha: Y(strecha.top), padX: Math.min(hak[0], vstup[0] - 8), vstup, wMapy: Math.max(2.4, Math.min(w * 1.4, wMapy)) };
    }
    return {
      W,
      H,
      y0: PRESAH,
      sx: Number.isFinite(sx) && dole!.dataset.sestupX ? sx : W * 0.12,
      w,
      stojan,
      parta,
      vstup: kotva("vstup"),
      vystup: kotva("vystup"),
      vyveska,
      svatek: svatekDne(ted())?.id ?? null,
    };
  }

  /* ——— kresba ——— */
  function kresli() {
    const m = zmer();
    if (!m) return;
    const klic = JSON.stringify(m, (_k, v) => (typeof v === "number" ? Math.round(v * 2) / 2 : v));
    if (klic === posledni) return;
    posledni = klic;
    snura = rozvrh(m);
    const sezona = dole!.dataset.sezona || "podzim";
    for (const svg of [pod, nad]) {
      svg.setAttribute("viewBox", `0 0 ${m.W} ${m.H}`);
      svg.dataset.sezona = sezona;
    }
    pod.innerHTML = snuraPod(snura);
    nad.innerHTML = snuraNad(snura);
    kmity.clear();
  }

  let pockej: number | undefined;
  const pozdeji = (ms = 120) => {
    window.clearTimeout(pockej);
    pockej = window.setTimeout(kresli, ms);
  };
  kresli();
  const hlidejVelikost = new ResizeObserver(() => pozdeji());
  hlidejVelikost.observe(dole);
  /* stojan může změnit podobu (tři podle šířky) i bez změny výšky celé louky */
  const stojanEl = dole.querySelector(".ko-ema-stojan");
  if (stojanEl) hlidejVelikost.observe(stojanEl);
  dole.addEventListener("ko:sestup", () => pozdeji(30));
  document.fonts?.ready.then(() => pozdeji());
  new MutationObserver(() => {
    const s = dole.dataset.sezona || "podzim";
    pod.dataset.sezona = s;
    nad.dataset.sezona = s;
  }).observe(dole, { attributes: true, attributeFilter: ["data-sezona"] });
  /* přiblížení mapy: vstup šňůry do rámečku se posune, až mapa dojede */
  const ram = dole.querySelector<HTMLElement>(".ko-mapa-ram");
  if (ram) new MutationObserver(() => pozdeji(klidne ? 30 : 760)).observe(ram, { attributes: true, attributeFilter: ["class"] });

  /* ——— drnknutí ——— */
  let bezi = false;
  function prekresli(i: number, kmit?: (t: number) => number) {
    if (!snura) return;
    const r = snura.rozpeti[i];
    const g = pod.querySelector(`.ko-sn-rozpeti[data-i="${i}"]`);
    const st = pod.querySelector(`.ko-sn-stin[data-i="${i}"]`);
    if (g) g.innerHTML = rozpetiSvg(snura, r, kmit);
    if (st) st.innerHTML = rozpetiStin(snura, r, kmit);
  }
  function krok(cas: number) {
    for (const [i, k] of kmity) {
      const tau = (cas - k.t0) / 1000;
      if (tau > 1.5) {
        kmity.delete(i);
        prekresli(i);
        continue;
      }
      const tl = Math.exp(-tau / 0.42);
      const c1 = Math.cos(2 * Math.PI * 6.2 * tau), c2 = Math.cos(2 * Math.PI * 12.9 * tau);
      const druhy = (k.p < 0.5 ? 1 : -1) * 0.35;
      prekresli(i, (t) => k.a * tl * (Math.sin(Math.PI * t) * c1 + druhy * Math.sin(2 * Math.PI * t) * c2));
    }
    if (kmity.size) requestAnimationFrame(krok);
    else bezi = false;
  }
  function drnkni(i: number, p: number, sila: number, zvuk = true) {
    if (!snura) return;
    const r = snura.rozpeti[i];
    const vel = Math.max(3, Math.min(14, Math.abs(sila))) * (((r.w0 + r.w1) / 2) / 6.6);
    kmity.set(i, { p, a: sila < 0 ? -vel : vel, t0: performance.now() });
    if (!bezi) {
      bezi = true;
      requestAnimationFrame(krok);
    }
    if (snura.vrabec?.i === i) {
      const vr = pod.querySelector(".ko-sn-vrabec");
      if (vr && !vr.classList.contains("leti")) {
        vr.classList.add("leti");
        window.setTimeout(() => vr.classList.remove("leti"), 3600);
      }
    }
    if (zvuk) {
      const st = stupen(r.t0 + (r.t1 - r.t0) * p);
      brnk(st, Math.min(1, Math.abs(sila) / 10 + 0.3), 0);
      if (hlidac(st)) motiv();
    }
  }
  /* Sakura: šňůra se rozhoupe kus po kusu od vývěsky zpátky k hrnku */
  function motiv() {
    if (!snura) return;
    const n = snura.rozpeti.length;
    for (let k = 0; k < n; k++) window.setTimeout(() => drnkni(n - 1 - k, 0.5, 9, false), 260 + k * 140);
  }

  if (klidne) return;
  /* myš přejede přes volný kus: kde se dráha myši protne se šňůrou, tam drnkne */
  let minule: [number, number] | null = null;
  window.addEventListener("scroll", () => (minule = null), { passive: true });
  dole.addEventListener("pointerleave", () => (minule = null));
  dole.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch" || !snura) return;
    if (!e.movementX && !e.movementY && minule) return;
    const r = dole.getBoundingClientRect();
    const kde: [number, number] = [e.clientX - r.left, e.clientY - r.top + PRESAH];
    const pred = minule;
    minule = kde;
    if (!pred || Math.hypot(kde[0] - pred[0], kde[1] - pred[1]) > 140) return;
    snura.rozpeti.forEach((rp, i) => {
      if (kmity.has(i) && performance.now() - kmity.get(i)!.t0 < 160) return;
      for (let j = 0; j < rp.body.length - 1; j++) {
        const u = protne(pred, kde, rp.body[j], rp.body[j + 1]);
        if (u === null) continue;
        const p = (j + u) / (rp.body.length - 1);
        if (p < 0.04 || p > 0.96) return;
        /* síla: rychlost myši napříč šňůrou */
        const [ax, ay] = rp.body[j], [bx, by] = rp.body[j + 1];
        const l = Math.hypot(bx - ax, by - ay) || 1;
        const napric = ((kde[0] - pred[0]) * -(by - ay) + (kde[1] - pred[1]) * (bx - ax)) / l;
        drnkni(i, p, napric * 0.8 || 4);
        return;
      }
    });
  });
}
