/**
 * Kontakt: provázkový telefon. Skládá obě kresby (components/kontakt/kresba)
 * podle velikosti okna, hodiny, ročního období a otevírací doby a oživuje je:
 *
 *   provázek    prohnutý; drnknout jde myší i prstem (kmitá, cinkne a vrabci
 *               uletí), při hovoru se napne a běží po něm světélka
 *   hrnek       „Zvednout hrnek“ (i klik na Futatsu v trávě): na mobilu se
 *               hned vytáčí, na počítači se číslo zkopíruje; mezitím hovor
 *               doběhne k domu — když je otevřeno, kamera vjede po provázku
 *               oknem dovnitř k ústředně (scripts/kontakt/uvnitr.ts); když
 *               ne, na plotě se ospale ozve a uvnitř je potmě a nezvedá nikdo
 *   visačky     otázky z Dílny; stažená odjede k domu a vrátí se odpověď
 *               od toho z party, kdo ji říká, na její místo přijede další
 *               (všechny otázky s odpověďmi jsou i pod první obrazovkou)
 *   dopis       napíše se na papír v dialogu, otevře se pošta a lístek se
 *               zalepenou 〆 mezitím odjede po provázku na kladce
 *   kudy k nám  tlačítko i klik na dům sjedou k sekci pod první obrazovkou
 *   nápověda    hrnek zvoní, dokud ho nezvedneš: chvíli po načtení a pak po
 *               každé chvilce klidu (nejvýš čtyřikrát), po provázku k němu
 *               přiběhnou světélka; okno dílny je druhý vchod — nahlédnout
 *               dovnitř bez hovoru
 *
 * Na ukázku jde čas přepnout: /kontakt?cas=pa-17:40 (den a hodina tohoto
 * týdne) nebo ?cas=2026-07-07T10:00 (i s datem, tedy i roční období
 * a svátky) — viz cas.ts.
 *
 * Údaje v panelu jsou obyčejné odkazy (tel:, mailto:, mapa) — skript je jen
 * obohacuje. S omezeným pohybem se nic nekmitá ani nelétá.
 *
 * Šetrnost: ústředna uvnitř (uvnitr.ts) je samostatný kousek skriptu —
 * načte se chvíli po první obrazovce, dřív při prvním doteku scény,
 * nejpozději se zvednutím hrnku. Snímková smyčka běží, jen když se něco
 * hýbe a scéna je na obrazovce; minutové hodiny na kartě na pozadí
 * nekontrolují nic a zvonění hrnku čeká, až se scéna vrátí na oči. Na
 * telefonu padá méně listů a při Sakuře vykvete méně lístků (kvalita.ts).
 */
import { venku, VENKU_DEFS, type VenkuBody, type Rezim } from "../../components/kontakt/kresba/venku";
import { provazek, prohnuty, vrabec, visacka, dopis, list, f, omez, lerp, hladce, nahoda, type Bod } from "../../components/kontakt/kresba/zaklad";
import { sezonaMesice, type Sezona } from "../../data/uvod2";
import { sluzba, stavSlovy, ustrednaSlovy, repliky, dopis as dopisData } from "../../data/kontakt";
import type { PostavaId } from "../../data/parta";
import { paleta } from "../parta2/paleta";
import { kresliNebe } from "../parta2/nebe";
import * as zvuk from "../parta2/zvuk";
import { zaStranku } from "../parta2/prechody";
import { naObrazovce } from "../parta2/mimo";
import { castic } from "../parta2/kvalita";
import type { uvnitrScena } from "./uvnitr";
import { ted, posunUkazky } from "./cas";
import { stupen, brnk, hlidacMotivu } from "./struna";
import { svatekDne, zaves, type Svatek } from "../../components/kontakt/kresba/svatky";

interface Data {
  otazky: { q: string; a: string; kdo: PostavaId }[];
  jmena: Record<string, string>;
  telefon: string;
  email: string;
}

/* Široké rozvržení (panel vlevo, scéna vpravo) — i telefon na šířku; přesný doplněk úzkého v kontakt.css */
const SIROKA = "(min-aspect-ratio: 6/5) and (min-width: 900px), (min-aspect-ratio: 6/5) and (max-height: 520px)";

/** Pořadí otázek na provázku: nejdřív ty, na které se lidi ptají nejvíc */
const PORADI = [0, 8, 7, 1, 2, 3, 4, 5, 6];

type Uloha = (cas: number) => boolean;

interface Visacka {
  el: SVGGElement;
  slot: number;
  otazka: number;
  t: number;
  m: number;
  naklon: number;
  jede: boolean;
}
interface Vrabec {
  el: SVGGElement;
  t: number;
  m: number;
  zrcadlo: boolean;
  /** sedí, letí pryč, nebo se vrací; let je od-do s časem začátku */
  rezim: "sedi" | "pryc" | "zpet" | "venku";
  od: Bod;
  do: Bod;
  t0: number;
}

interface Volby {
  /** Zavolá se před sjetím na louku (Kudy k nám, otázky) — ať se načte hned (hlavni.ts) */
  naLouku?: () => void;
}

/** Ústředna uvnitř (uvnitr.ts) — samostatný kousek, načtený až později */
type Uvnitr = ReturnType<typeof uvnitrScena>;

export function scena(volby: Volby = {}) {
  const sekce = document.querySelector<HTMLElement>(".ko-scena");
  if (!sekce) return;
  const svgVen = sekce.querySelector<SVGSVGElement>(".ko-venku")!;
  const panel = sekce.querySelector<HTMLElement>(".ko-panel")!;
  const vrstva = sekce.querySelector<HTMLElement>(".ko-vrstva")!;
  const stavEl = sekce.querySelector<HTMLElement>(".ko-stav-dilna");
  const telEl = sekce.querySelector<HTMLElement>(".ko-stav-telefon");
  const data: Data = JSON.parse(document.getElementById("ko-data")?.textContent || "{}");
  const klidne = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dotyk = matchMedia("(pointer: coarse)").matches;
  const mqSiroka = matchMedia(SIROKA);
  const posun = posunUkazky();

  /* ——— stav ——— */
  let rezim: Rezim = "siroka";
  let W = 1600, H = 900, k = 1;
  let body: VenkuBody | null = null;
  let otevreno = false;
  /** Hodiny telefonu (data/kontakt.ts telefon): parta u ústředny je vzhůru a hrnek na plotě zvedne */
  let vzhuru = false;
  let kdo: PostavaId = "kapka";
  let sezona: Sezona = "podzim";
  let prohyb = 50;
  let kmit: { p: number; a: number; t0: number } | null = null;
  let tah: { p: number; d: number } | null = null;
  let hovor = false;
  let stav = "";
  let posledniCas = 0;
  let visacky: Visacka[] = [];
  let vrabci: Vrabec[] = [];
  let dalsiOtazka = 0;
  /** Které otázky visí na kterém místě — přežijí překreslení */
  let naProvazku: number[] = [];
  let dopisT: number | null = null;
  /** Host už hrnek (nebo okno) použil — hrnek přestane zvonit */
  let pouzito = false;
  let koralky: { t: number; el: SVGGElement }[] = [];
  /** Svátek dne (ozdoby na provázku) a ozdoby, jak visí */
  let svatek: Svatek | null = null;
  let ozdoby: { el: SVGGElement; zare: SVGGElement | null; t: number; naklon: number }[] = [];
  /** Noty, okvětní lístky a jiné letce, které vyletí z provázku: bod t, posun a čas */
  let letci: { el: SVGGElement; t: number; t0: number; doba: number; dx: number; dy: number; rot: number; m: number }[] = [];
  const motiv = hlidacMotivu();
  let el: { lem: SVGPathElement; jadro: SVGPathElement; zkrut: SVGPathElement; chyt: SVGPathElement; koralky: SVGGElement; dopis: SVGGElement; kladka: SVGGElement | null; cesta: SVGPathElement; hrnek: SVGGElement | null } | null = null;

  /* ——— snímková smyčka: běží, jen když se něco hýbe a scéna je na obrazovce ——— */
  const ulohy = new Set<Uloha>();
  let bezi = false;
  /** Scéna je na obrazovce (s předstihem) — mimo ni smyčka stojí; rozběhnuté úlohy po návratu doběhnou */
  let videt = true;
  const snimek = (cas: number) => {
    if (!videt) {
      bezi = false;
      return;
    }
    posledniCas = cas;
    for (const u of [...ulohy]) if (!u(cas)) ulohy.delete(u);
    kresliDynamiku(cas);
    if (ulohy.size) requestAnimationFrame(snimek);
    else bezi = false;
  };
  const rozbehni = () => {
    if (bezi || !videt || !ulohy.size) return;
    bezi = true;
    requestAnimationFrame(snimek);
  };
  const pridej = (u: Uloha) => {
    ulohy.add(u);
    rozbehni();
  };
  /** Plynulý přechod 0 → 1 za `doba` ms */
  const tween = (doba: number, krok: (p: number) => void, hotovo?: () => void) => {
    if (klidne || doba <= 0) {
      krok(1);
      hotovo?.();
      if (!bezi) requestAnimationFrame((c) => kresliDynamiku(c));
      return;
    }
    let t0 = -1;
    pridej((cas) => {
      if (t0 < 0) t0 = cas;
      const p = Math.min(1, (cas - t0) / doba);
      krok(p);
      if (p >= 1) {
        hotovo?.();
        return false;
      }
      return true;
    });
  };

  /* ——— čas, noc, otevřeno, roční období ——— */
  function cas() {
    const nyni = ted();
    const h = nyni.getHours() + nyni.getMinutes() / 60;
    sekce!.dataset.hodina = h.toFixed(2);
    kresliNebe(h);
    const noc = paleta(h).noc;
    document.documentElement.style.setProperty("--ko-noc", noc.toFixed(3));
    sekce!.classList.toggle("soumrak", noc > 0.04);
    const s = stavSlovy(nyni);
    const u = ustrednaSlovy(nyni);
    if (telEl) {
      telEl.hidden = false;
      telEl.textContent = posun ? `ukázka · ${u.text}` : u.text;
      telEl.classList.toggle("otevreno", u.vzhuru);
    }
    if (stavEl) {
      stavEl.hidden = false;
      stavEl.textContent = s.text;
      stavEl.classList.toggle("otevreno", s.otevreno);
    }
    const sv = svatekDne(nyni);
    const zmena = s.otevreno !== otevreno || u.vzhuru !== vzhuru || sluzba(nyni) !== kdo || sezonaMesice(nyni.getMonth() + 1) !== sezona || sv?.id !== svatek?.id;
    svatek = sv;
    otevreno = s.otevreno;
    vzhuru = u.vzhuru;
    kdo = sluzba(nyni);
    sezona = sezonaMesice(nyni.getMonth() + 1);
    /* cedulka u spící ústředny říká, kdy zase zvedáme */
    stav = u.kdy;
    sekce!.classList.toggle("otevreno", otevreno);
    sekce!.classList.toggle("vzhuru", vzhuru);
    document.querySelectorAll<HTMLElement | SVGElement>(".ko-venku, .ko-dole").forEach((x) => (x.dataset.sezona = sezona));
    document.querySelector(".ko-dole")?.classList.toggle("soumrak", noc > 0.04);
    return zmena;
  }

  /* ——— vykreslení venkovní scény podle okna ——— */
  function vykresli() {
    const r = sekce!.getBoundingClientRect();
    if (r.width < 10 || r.height < 10) return;
    rezim = mqSiroka.matches ? "siroka" : "uzka";
    if (rezim === "siroka") {
      H = 900;
      W = (900 * r.width) / r.height;
      k = r.height / 900;
    } else {
      W = r.width;
      H = r.height;
      k = 1;
    }
    const p = panel.getBoundingClientRect();
    const v = venku({ W, H, rezim, panel: { prava: (p.right - r.left) / k, dolni: (p.bottom - r.top) / k }, otevreno, vzhuru, kdo });
    body = v.body;
    prohyb = hovor ? body.napnuty : body.prohyb;
    svgVen.setAttribute("viewBox", `0 0 ${f(W)} ${f(H)}`);
    const [d0, d1, d2, d3] = body.dum;
    svgVen.innerHTML = `<defs>${VENKU_DEFS}</defs>
      <g class="ko-krajina">${v.krajina}</g>
      <g class="ko-dynamika">${dynamika()}</g>
      <g class="ko-svatek-zare-vrstva">${zareOzdob()}</g>
      <g class="ko-konec-vrstva">${v.konec}</g>
      <g class="ko-popredi">${v.popredi}</g>
      <g class="ko-padani">${padani()}</g>
      <rect class="ko-dum-klik" x="${f(d0)}" y="${f(d1)}" width="${f(d2 - d0)}" height="${f(d3 - d1)}"/>
      ${oknoSvg()}`;
    const q = <T extends Element>(s: string) => svgVen.querySelector<T>(s)!;
    el = {
      lem: q(".ko-provaz-lem"),
      jadro: q(".ko-provaz-jadro"),
      zkrut: q(".ko-provaz-zkrut"),
      chyt: q(".ko-provaz-chyt"),
      koralky: q(".ko-koralky"),
      dopis: q(".ko-dopis-g"),
      kladka: svgVen.querySelector(".ko-dopis-g .ko-kladka"),
      cesta: q(".ko-cesta-ukaz"),
      hrnek: svgVen.querySelector(".ko-nas-hrnek"),
    };
    visacky = [...svgVen.querySelectorAll<SVGGElement>(".ko-visacka")].map((g, i) => ({
      el: g,
      slot: i,
      otazka: Number(g.dataset.otazka),
      t: body!.sloty[i].t,
      m: body!.visackaM,
      naklon: [3, -4, 2][i] ?? 0,
      jede: false,
    }));
    vrabci = [...svgVen.querySelectorAll<SVGGElement>(".ko-vrabec")].map((g, i) => ({
      el: g,
      t: body!.vrabci[i].t,
      m: body!.vrabci[i].m,
      zrcadlo: body!.vrabci[i].zrcadlo,
      rezim: "sedi",
      od: [0, 0],
      do: [0, 0],
      t0: 0,
    }));
    ozdoby = [...svgVen.querySelectorAll<SVGGElement>(".ko-ozdoba")].map((g, i) => ({
      el: g,
      zare: svgVen.querySelector<SVGGElement>(`.ko-ozdoba-zare[data-i="${i}"]`),
      t: Number(g.dataset.t),
      naklon: (i % 3) - 1,
    }));
    koralky = [];
    letci = [];
    navaz();
    kresliDynamiku(posledniCas);
    zverejniSestup(r);
  }

  /**
   * Kde provázek od Futatsu sestupuje přes spodní okraj první obrazovky na
   * louku (scripts/kontakt/louka.ts na něj navazuje): x v px od levého
   * okraje .ko-dole a šířka šňůry v px. Po změně pošle událost `ko:sestup`.
   */
  function zverejniSestup(r: DOMRect) {
    const dole = document.querySelector<HTMLElement>(".ko-dole");
    if (!dole || !body) return;
    const x = body.sestup[0] * k + r.left - dole.getBoundingClientRect().left;
    const w = body.sestupW * k;
    if (dole.dataset.sestupX === x.toFixed(1) && dole.dataset.sestupW === w.toFixed(2)) return;
    dole.dataset.sestupX = x.toFixed(1);
    dole.dataset.sestupW = w.toFixed(2);
    dole.dispatchEvent(new CustomEvent("ko:sestup"));
  }

  /** Obsah vrstvy s provázkem — pozice dopočítá kresliDynamiku */
  function dynamika() {
    const b = body!;
    let s = `<path class="ko-cesta-ukaz" d="${b.cesta}"/>`;
    s += `<g class="ko-provaz"><path class="ko-provaz-lem"/><path class="ko-provaz-jadro"/><path class="ko-provaz-zkrut" stroke-width="${f(b.w0 * 0.34)}" stroke-linecap="round"/></g>`;
    s += `<path class="ko-provaz-chyt"/>`;
    s += ozdobySvg();
    s += `<g class="ko-koralky"></g>`;
    b.sloty.forEach((slot, i) => {
      if (naProvazku[i] === undefined) {
        naProvazku[i] = PORADI[dalsiOtazka];
        dalsiOtazka = (dalsiOtazka + 1) % PORADI.length;
      }
      s += visackaSvg(i, naProvazku[i], slot.nit);
    });
    s += `<g class="ko-dopis-g" style="display:none">${dopis()}</g>`;
    b.vrabci.forEach(() => (s += `<g class="ko-vrabec">${vrabec()}</g>`));
    return s;
  }
  function visackaSvg(i: number, o: number, nit: number) {
    const text = data.otazky[o]?.q ?? "";
    const sirka = Math.max(120, text.length * 9.4 + 36);
    return `<g class="ko-visacka" data-slot="${i}" data-otazka="${o}">${visacka(esc(text), sirka, nit)}</g>`;
  }

  /* ——— svátky: ozdoby visí na provázku mezi visačkami a vrabci ——— */
  function mistaOzdob() {
    if (!svatek || !body) return [];
    const b = body;
    const t: number[] = [];
    for (let x = 0.13; x < 0.93; x += rezim === "siroka" ? 0.068 : 0.09) {
      if (b.sloty.some((sl) => Math.abs(sl.t - x) < 0.06) || b.vrabci.some((v) => Math.abs(v.t - x) < 0.035)) continue;
      t.push(x);
    }
    return t;
  }
  function ozdobySvg() {
    const sv = svatek;
    if (!sv) return "";
    return mistaOzdob().map((t, i) => `<g class="ko-ozdoba" data-t="${t.toFixed(3)}" data-i="${i}">${zaves(sv.id, i, 1)}</g>`).join("");
  }
  /** Lucerny a lampiony v noci svítí — záře je mimo vrstvu, kterou noc ztmaví */
  function zareOzdob() {
    if (!svatek || (svatek.id !== "obon" && svatek.id !== "hanami")) return "";
    const y = svatek.id === "obon" ? 34 : 33;
    return mistaOzdob().map((_, i) => `<g class="ko-ozdoba-zare" data-i="${i}"><circle cy="${y}" r="34" fill="url(#ko-zare-lampy)"/></g>`).join("");
  }
  /** Klik na ozdobu: rozhoupe se a ten, kdo má službu, popřeje */
  function ozdobaKlik(o: (typeof ozdoby)[number]) {
    if (!body || !svatek) return;
    drnkni(o.t, 16 * body.m, false);
    bublina("konec", svatek.pozdrav, naPx(body.hlava), 3200);
  }

  /** Padající listy ořešáku, okvětní lístky sakury nebo vločky — podle ročního období (na telefonu méně) */
  function padani() {
    if (klidne || sezona === "leto") return "";
    const R = nahoda(77);
    const pocet = castic(rezim === "siroka" ? 9 : 6);
    let s = "";
    for (let i = 0; i < pocet; i++) {
      const x = W * (0.2 + R() * 0.85);
      const doba = 12 + R() * 10;
      const tvar =
        sezona === "podzim" ? list(R() < 0.5 ? "#D9A63C" : "#C27C2E")
        : sezona === "zima" ? `<circle r="${f(2.4 + R() * 2.6)}" fill="#FFFFFF" opacity="0.9"/>`
        : `<ellipse rx="${f(4 + R() * 2)}" ry="${f(2.6 + R())}" fill="${R() < 0.5 ? "#F2B8C4" : "#F8D2DA"}"/>`;
      s += `<g transform="translate(${f(x)} 0)"><g class="pad" style="--doba:${f(doba)}s;--zpozdeni:${f(-R() * doba)}s;--vitr:${f(-(80 + R() * 200) * (rezim === "siroka" ? 1 : 0.5))}px;--vyska:${f(H)}px"><g class="tanec">${tvar}</g></g></g>`;
    }
    return s;
  }

  /* ——— tvar provázku ——— */
  const MODY = [1, 2, 3];
  function vychylka(t: number, cas: number) {
    let v = 0;
    if (tah) v += tah.d * (t < tah.p ? t / Math.max(0.01, tah.p) : (1 - t) / Math.max(0.01, 1 - tah.p));
    if (kmit) {
      const s = (cas - kmit.t0) / 1000;
      for (const n of MODY) {
        const c = (kmit.a * Math.sin(n * Math.PI * kmit.p)) / (n * n * 0.8);
        v += c * Math.sin(n * Math.PI * t) * Math.cos(2 * Math.PI * 2.4 * n * s) * Math.exp((-s * n) / 1.3);
      }
    }
    return v;
  }
  const tvar = (cas: number) => prohnuty(body!.pata, body!.konec, prohyb, (t) => vychylka(t, cas));

  /* ——— jeden snímek dynamické vrstvy ——— */
  function kresliDynamiku(cas: number) {
    if (!body || !el) return;
    const b = body;
    const pr = provazek(tvar(cas), b.w0, b.w1);
    el.lem.setAttribute("d", pr.lem);
    el.jadro.setAttribute("d", pr.jadro);
    el.zkrut.setAttribute("d", pr.zkrut);
    el.chyt.setAttribute("d", pr.osa);
    const kyv = kmit ? Math.sin(cas / 160) * Math.min(1, Math.abs(kmit.a) / 18) * Math.exp(-(cas - kmit.t0) / 1500) * 7 : 0;
    for (const v of visacky) {
      const p = pr.bod(v.t);
      v.el.setAttribute("transform", `translate(${f(p.x)} ${f(p.y)}) rotate(${f(v.naklon + kyv)}) scale(${f(v.m)})`);
    }
    const mo = b.visackaM * 0.95;
    for (const o of ozdoby) {
      const p = pr.bod(o.t);
      const tr = `translate(${f(p.x)} ${f(p.y)}) rotate(${f(o.naklon + kyv * 1.3)}) scale(${f(mo * (0.55 + 0.45 * p.m))})`;
      o.el.setAttribute("transform", tr);
      o.zare?.setAttribute("transform", tr);
    }
    for (const l of letci) {
      if (cas < l.t0) continue;
      const u = omez((cas - l.t0) / l.doba);
      const p = pr.bod(l.t);
      const e = 1 - (1 - u) * (1 - u);
      l.el.setAttribute("transform", `translate(${f(p.x + l.dx * e)} ${f(p.y + l.dy * e)}) rotate(${f(l.rot * u)}) scale(${f(l.m)})`);
      l.el.setAttribute("opacity", String(f(u < 0.7 ? 1 : (1 - u) / 0.3)));
    }
    if (dopisT !== null) {
      const p = pr.bod(dopisT);
      el.dopis.setAttribute("transform", `translate(${f(p.x)} ${f(p.y)}) scale(${f(b.dopisM)})`);
      el.kladka?.setAttribute("transform", `rotate(${f(p.uhel)})`);
    }
    for (const kr of koralky) {
      const p = pr.bod(kr.t);
      kr.el.setAttribute("transform", `translate(${f(p.x)} ${f(p.y)}) scale(${f(b.m * (0.4 + 0.6 * p.m))})`);
    }
    for (const v of vrabci) {
      if (v.rezim === "sedi") {
        const sx = v.zrcadlo ? -1 : 1;
        const p = pr.bod(v.t);
        v.el.setAttribute("transform", `translate(${f(p.x)} ${f(p.y - 1)}) rotate(${f(p.uhel)}) scale(${f(v.m * sx)} ${f(v.m)})`);
      } else if (v.rezim !== "venku") {
        const u = omez((cas - v.t0) / (v.rezim === "pryc" ? 1500 : 1300));
        const e = v.rezim === "pryc" ? u * u : 1 - (1 - u) * (1 - u);
        const x = lerp(v.od[0], v.do[0], e);
        const y = lerp(v.od[1], v.do[1], e) - Math.sin(e * Math.PI) * 60 * v.m;
        const kridla = 1 + Math.sin(cas / 45) * 0.12;
        const smer = v.do[0] < v.od[0] ? -1 : 1;
        v.el.setAttribute("transform", `translate(${f(x)} ${f(y)}) scale(${f(v.m * smer)} ${f(v.m * kridla)})`);
      }
    }
  }

  /* ——— vrabci: uletí, když se provázek pohne, a za chvíli se vrátí ——— */
  function odlet() {
    if (!body) return;
    const pr = provazek(tvar(posledniCas), body.w0, body.w1);
    vrabci.forEach((v, i) => {
      if (v.rezim !== "sedi") return;
      const p = pr.bod(v.t);
      const smer = i % 2 ? 1 : -1;
      v.rezim = "pryc";
      v.od = [p.x, p.y];
      v.do = [p.x + smer * W * 0.35, -80];
      v.t0 = performance.now();
      v.el.classList.add("leti");
      pridej((cas) => {
        if (cas - v.t0 < 1500) return true;
        v.rezim = "venku";
        v.el.setAttribute("transform", "translate(-500 -500)");
        window.setTimeout(() => navrat(v), 9000 + i * 1800);
        return false;
      });
    });
  }
  function navrat(v: Vrabec) {
    if (!body || v.rezim !== "venku") return;
    const pr = provazek(tvar(posledniCas), body.w0, body.w1);
    const p = pr.bod(v.t);
    v.rezim = "zpet";
    v.od = [p.x + (v.zrcadlo ? 1 : -1) * W * 0.3, -60];
    v.do = [p.x, p.y - 1];
    v.t0 = performance.now();
    pridej((cas) => {
      if (cas - v.t0 < 1300) return true;
      v.rezim = "sedi";
      v.el.classList.remove("leti");
      return false;
    });
  }

  /* ——— drnknutí ——— */
  function drnkni(pTah: number, d: number, hraj = true) {
    if (!body) return;
    const a = Math.max(-60 * body.m, Math.min(60 * body.m, d));
    const napnuti = omez((body.prohyb - prohyb) / Math.max(1, body.prohyb - body.napnuty));
    if (hraj) {
      /* kde drnkneš, tak vysoko zazní (struna.ts); začátek Sakury rozkvete */
      const st = stupen(pTah);
      brnk(st, Math.min(1, Math.abs(a) / 24 + 0.3), napnuti);
      if (!klidne) letec(pTah, nota(), 900, 0, -46 * body.m, (Math.random() - 0.5) * 30, body.m * 0.9);
      if (motiv(st)) window.setTimeout(sakura, 260);
    }
    if (klidne) return;
    kmit = { p: pTah, a, t0: performance.now() };
    const hotovo = kmit;
    pridej((cas) => {
      if (kmit !== hotovo) return false;
      if (cas - hotovo.t0 > 3200) {
        kmit = null;
        return false;
      }
      return true;
    });
    if (Math.abs(a) > 6 * body.m) odlet();
  }

  /** Něco, co vyletí z bodu t na provázku (nota, okvětní lístek) a za `doba` ms zmizí */
  function letec(t: number, obsah: string, doba: number, dx: number, dy: number, rot: number, m: number, zpozdeni = 0) {
    if (!el) return;
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.innerHTML = obsah;
    g.setAttribute("opacity", "0");
    el.koralky.append(g);
    const l = { el: g, t, t0: performance.now() + zpozdeni, doba, dx, dy, rot, m };
    letci.push(l);
    pridej((cas) => {
      if (cas - l.t0 < doba) return true;
      g.remove();
      letci = letci.filter((x) => x !== l);
      return false;
    });
  }
  const nota = () => `<g fill="#3A2A22" opacity="0.78"><ellipse cx="-3" cy="6" rx="5" ry="3.6" transform="rotate(-22 -3 6)"/><path d="M1.2 5 V-14 Q8 -11 9 -5 Q6 -9 2.8 -9.4 V5 Z"/></g>`;
  const lupen = (i: number) => `<path d="M0 -6 C4 -6 6 -2 5 2 C4 5 1 6 0 4 C-1 6 -4 5 -5 2 C-6 -2 -4 -6 0 -6 Z" fill="${i % 3 ? "#F6C3CF" : "#FBDDE3"}" stroke="#E79AAB" stroke-width="0.6"/>`;

  /** Sakura: po provázku vykvetou okvětní lístky (na telefonu méně) a ten na plotě dohraje další takty */
  function sakura() {
    if (!body) return;
    const m = body.m;
    if (!klidne) {
      const pocet = castic(34);
      for (let i = 0; i < pocet; i++) {
        const t = 0.06 + Math.random() * 0.9;
        /* kvetou stejně dlouho jako na počítači, jen řidčeji */
        letec(t, lupen(i), 2200 + Math.random() * 1400, (Math.random() - 0.3) * 160 * m, -(60 + Math.random() * 140) * m, (Math.random() - 0.5) * 540, (0.8 + Math.random() * 0.7) * m, (i * 45 * 34) / pocet);
      }
    }
    /* odpověď z plotu: A H C H · A H A F */
    [2, 3, 4, 3, 2, 3, 2, 1].forEach((st, i) => window.setTimeout(() => brnk(st, 0.55, 1), 500 + i * 400 + (i >= 4 ? 300 : 0)));
    bublina("konec", "♪ Sakura, sakura… ♪", naPx(body.hlava), 3600);
  }

  /** Bod na provázku nejbližší k pozici v jednotkách */
  function nejblizsiT(x: number, y: number) {
    const sampler = tvar(posledniCas);
    let nej = 0.5, d = Infinity;
    for (let i = 2; i <= 98; i++) {
      const [px, py] = sampler(i / 100);
      const dd = (px - x) ** 2 + (py - y) ** 2;
      if (dd < d) {
        d = dd;
        nej = i / 100;
      }
    }
    return nej;
  }
  const naJednotky = (e: PointerEvent | MouseEvent): Bod => {
    const r = sekce!.getBoundingClientRect();
    return [(e.clientX - r.left) / k, (e.clientY - r.top) / k];
  };

  /* ——— bubliny řečí (HTML nad kresbou), bod je v pixelech sekce ——— */
  const naPx = (p: Bod): Bod => [p[0] * k, p[1] * k];
  const bubliny = new Map<string, HTMLElement>();
  function bublina(klic: string, obsah: string | Node, bod: Bod, doba: number, trida = "") {
    bubliny.get(klic)?.remove();
    const b = document.createElement("div");
    b.className = `ko-bublina ${trida}`;
    if (typeof obsah === "string") b.textContent = obsah;
    else b.append(obsah);
    vrstva.append(b);
    const sirka = vrstva.clientWidth;
    const w = b.offsetWidth;
    const x = Math.max(w / 2 + 10, Math.min(sirka - w / 2 - 10, bod[0]));
    b.style.left = `${x}px`;
    b.style.top = `${Math.max(b.offsetHeight + 26, bod[1])}px`;
    bubliny.set(klic, b);
    requestAnimationFrame(() => b.classList.add("je"));
    window.setTimeout(() => {
      b.classList.remove("je");
      window.setTimeout(() => {
        b.remove();
        if (bubliny.get(klic) === b) bubliny.delete(klic);
      }, 400);
    }, doba);
    return b;
  }
  const smazBubliny = () => {
    bubliny.forEach((b) => b.remove());
    bubliny.clear();
  };

  /* ——— hovor ——— */
  function napni(ano: boolean, doba = 520) {
    if (!body) return;
    const od = prohyb, cil = ano ? body.napnuty : body.prohyb;
    tween(doba, (p) => {
      const e = ano ? 1 - Math.pow(1 - p, 3) + Math.sin(p * Math.PI) * 0.18 : hladce(p);
      prohyb = lerp(od, cil, e);
    });
  }
  /** Světélka po provázku: k domu (hovor), nebo od domu k nám (pozvání) */
  function svetelka(hotovo: () => void, kNam = false) {
    if (!el || !body) return hotovo();
    const pocet = kNam ? 3 : 4;
    let doneCount = 0;
    for (let i = 0; i < pocet; i++) {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.innerHTML = `<circle r="12" fill="url(#ko-koralek)"/><circle r="3.4" fill="#FFFDF4"/>`;
      el.koralky.append(g);
      const kr = { t: 0, el: g };
      koralky.push(kr);
      window.setTimeout(() => {
        tween(1150, (p) => (kr.t = kNam ? 0.98 - p * p * (3 - 2 * p) * 0.93 : p * p * (3 - 2 * p) * 0.98), () => {
          g.remove();
          koralky = koralky.filter((x) => x !== kr);
          if (++doneCount === pocet) hotovo();
        });
      }, klidne ? 0 : i * 150);
    }
    if (kNam) zvuk.ton(1320, 660, 0.9, "sine", 0.025);
    else zvuk.ton(660, 1320, 0.9, "sine", 0.035);
  }
  function zvoneni() {
    for (let i = 0; i < 6; i++) window.setTimeout(() => zvuk.ton(1350, 1340, 0.045, "square", 0.022), i * 65);
  }

  function zvedni(e?: Event) {
    if (!body || hovor || sekce!.dataset.zastavka !== "venku") {
      if (e && !dotyk) e.preventDefault();
      return;
    }
    if (!dotyk) {
      e?.preventDefault();
      navigator.clipboard?.writeText(data.telefon).then(
        () => oznam(`Číslo <b>${esc(data.telefon)}</b> je ve schránce`),
        () => {},
      );
    }
    hovor = true;
    pouzito = true;
    /* než světélka doběhnou k domu, je ústředna dávno načtená */
    void nactiUvnitr();
    zvuk.cvak();
    el?.hrnek?.classList.add("zvednuty");
    napni(true);
    odlet();
    svetelka(() => {
      if (!body) return;
      if (vzhuru) {
        zvoneni();
        bublina("konec", repliky.halo, naPx(body.hlava), 2400);
        window.setTimeout(dovnitr, klidne ? 600 : 1300);
      } else {
        /* zavřeno: na plotě se ospale ozve a kamera i tak vjede do tmavé dílny */
        bublina("konec", repliky.spi, naPx(body.hlava), 1900);
        window.setTimeout(dovnitr, klidne ? 600 : 1700);
      }
    });
  }

  /* ——— dovnitř k ústředně a zase ven ———
     Ústředna (uvnitr.ts) je samostatný kousek skriptu: načte se chvíli po
     první obrazovce (2,5 s), dřív při prvním doteku scény, nejpozději se
     zvednutím hrnku. Kdyby ještě nebyla, vjezd dovnitř na ni počká. */
  let uvnitr: Uvnitr | null = null;
  let nacitani: Promise<Uvnitr | undefined> | null = null;
  const nactiUvnitr = () =>
    (nacitani ??= import("./uvnitr").then(
      /* po importu už kód stránce nepatří — zaStranku jí vrátí posluchače ústředny */
      zaStranku((m: typeof import("./uvnitr")) =>
        (uvnitr = m.uvnitrScena(sekce, {
          klidne,
          jmeno: (id) => data.jmena[id] ?? id,
          bublina,
          smazBubliny,
          ted,
        })),
      ),
      () => {
        /* nenačetlo se (bez sítě): příště se zkusí znovu */
        nacitani = null;
        return undefined;
      },
    ));
  /** S ústřednou hned, nebo až se načte; `jinak`, když se načíst nepodařilo */
  function sUstrednou(fn: (u: Uvnitr) => void, jinak: () => void) {
    if (uvnitr) return fn(uvnitr);
    void nactiUvnitr().then(zaStranku((u?: Uvnitr) => (u ? fn(u) : jinak())));
  }
  /** Hovor se nepovedl (ústředna se nenačetla): hrnek zpátky do trávy */
  function zpatkyVen() {
    hovor = false;
    el?.hrnek?.classList.remove("zvednuty");
    napni(false, 900);
  }
  function dovnitr() {
    if (!body) return;
    smazBubliny();
    sUstrednou((u) => {
      if (!body) return;
      const [ox, oy] = body.okno;
      u.dovnitr(kdo, [ox * k, oy * k], () => {
        el?.hrnek?.classList.remove("zvednuty");
      }, vzhuru, stav);
    }, zpatkyVen);
  }
  function ven() {
    uvnitr?.ven(() => {
      hovor = false;
      napni(false, 900);
      sekce!.querySelector<HTMLElement>(".ko-zvednout")?.focus({ preventScroll: true });
    });
  }

  /* ——— visačky s otázkami ——— */
  function stahni(v: Visacka) {
    if (v.jede || !body) return;
    v.jede = true;
    zvuk.papir();
    const od = v.t;
    tween(1000, (p) => (v.t = lerp(od, 0.965, hladce(p))), () => {
      v.el.style.display = "none";
      const o = data.otazky[v.otazka];
      if (o && body) odpoved(o);
      /* na uvolněné místo přijede další otázka od hrnku */
      window.setTimeout(() => {
        if (!body) return;
        const nova = PORADI[dalsiOtazka];
        dalsiOtazka = (dalsiOtazka + 1) % PORADI.length;
        const tmp = document.createElementNS("http://www.w3.org/2000/svg", "g");
        tmp.innerHTML = visackaSvg(v.slot, nova, body.sloty[v.slot].nit);
        const g = tmp.firstElementChild as SVGGElement;
        v.el.replaceWith(g);
        v.el = g;
        v.otazka = nova;
        naProvazku[v.slot] = nova;
        v.t = 0.06;
        v.jede = false;
        navazVisacku(v);
        tween(900, (p) => (v.t = lerp(0.06, body!.sloty[v.slot].t, hladce(p))));
      }, klidne ? 0 : 700);
    });
  }
  function odpoved(o: Data["otazky"][number]) {
    if (!body) return;
    zvuk.pop();
    const obsah = document.createElement("div");
    obsah.style.display = "contents";
    obsah.innerHTML = `<svg viewBox="0 0 180 180" aria-hidden="true"><use href="#ko-k-${o.kdo}"/></svg><div><b>${esc(data.jmena[o.kdo] ?? o.kdo)}</b><q>${esc(o.q)}</q>${esc(o.a)}</div>`;
    bublina("konec", obsah, naPx(body.hlava), Math.max(6500, o.a.length * 75), "ko-bublina-odpoved");
  }

  /* ——— dopis po provázku ——— */
  function posliDopis() {
    if (!el || !body) return;
    el.dopis.style.display = "";
    dopisT = 0.05;
    zvuk.uzel();
    odlet();
    tween(2400, (p) => (dopisT = lerp(0.05, 0.965, hladce(p))), () => {
      if (el) el.dopis.style.display = "none";
      dopisT = null;
      zvuk.pop();
      if (body) bublina("konec", vzhuru ? repliky.dopis : repliky.dopisSpi, naPx(body.hlava), 3600);
    });
  }

  /* ——— posluchače na kresbě (po každém vykreslení znovu) ——— */
  function navazVisacku(v: Visacka) {
    v.el.addEventListener("click", () => stahni(v));
  }
  function navaz() {
    if (!el) return;
    el.hrnek?.addEventListener("click", (e) => {
      if (dotyk) {
        const tel = sekce!.querySelector<HTMLAnchorElement>(".ko-cislo")?.href;
        if (tel && !hovor) window.location.href = tel;
      }
      zvedni(e);
    });
    visacky.forEach(navazVisacku);
    ozdoby.forEach((o) => o.el.addEventListener("click", () => ozdobaKlik(o)));
    svgVen.querySelector(".ko-dum-klik")?.addEventListener("click", kNam);
    svgVen.querySelector(".ko-okno-klik")?.addEventListener("click", nahlednout);
    const chyt = el.chyt;
    chyt.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      chyt.setPointerCapture(e.pointerId);
      const [x, y] = naJednotky(e);
      tah = { p: nejblizsiT(x, y), d: 0 };
      kmit = null;
      pridej(() => tah !== null);
    });
    chyt.addEventListener("pointermove", (e) => {
      if (!tah || !body) return;
      const [, y] = naJednotky(e);
      const zaklad = prohnuty(body.pata, body.konec, prohyb)(tah.p)[1];
      tah.d = Math.max(-60 * body.m, Math.min(60 * body.m, y - zaklad));
    });
    const pust = () => {
      if (!tah) return;
      const t = tah;
      tah = null;
      drnkni(t.p, Math.abs(t.d) < 3 ? 14 * (body?.m ?? 1) : t.d);
    };
    chyt.addEventListener("pointerup", pust);
    chyt.addEventListener("pointercancel", pust);
  }

  /* ——— panel a dialogy ——— */
  const dlgDopis = document.querySelector<HTMLDialogElement>(".ko-dopis");
  /** Sjet k sekci pod první obrazovkou — Kudy k nám, nebo otázky (odkazy #kudy a #otazky fungují i bez skriptu) */
  function sjed(kam: string, e?: Event) {
    /* louka (hlavni.ts) se načte hned, ne až s blížícím se scrollem */
    volby.naLouku?.();
    const cil = document.getElementById(kam);
    /* bez scrollIntoView zůstane obyčejný odkaz #kudy */
    if (!cil || typeof cil.scrollIntoView !== "function") return;
    e?.preventDefault();
    cil.scrollIntoView({ behavior: klidne ? "auto" : "smooth", block: "start" });
  }
  const kNam = (e?: Event) => sjed("kudy", e);
  sekce.querySelector(".ko-zvednout")?.addEventListener("click", zvedni);
  sekce.querySelector(".ko-zavesit")?.addEventListener("click", ven);
  sekce.querySelector(".ko-ven")?.addEventListener("click", ven);
  sekce.querySelector(".ko-kudy-tl")?.addEventListener("click", kNam);
  sekce.querySelector(".ko-otazky-tl")?.addEventListener("click", (e) => sjed("otazky", e));
  sekce.querySelector(".ko-psat")?.addEventListener("click", (e) => {
    if (!dlgDopis?.showModal) return;
    e.preventDefault();
    dlgDopis.showModal();
    dlgDopis.querySelector("textarea")?.focus();
  });
  dlgDopis?.querySelector("form")?.addEventListener("submit", (e) => {
    const tlacitko = (e as SubmitEvent).submitter as HTMLButtonElement | null;
    if (tlacitko?.value !== "poslat") return;
    const form = e.currentTarget as HTMLFormElement;
    const text = (form.elements.namedItem("text") as HTMLTextAreaElement).value.trim();
    const jmeno = (form.elements.namedItem("jmeno") as HTMLInputElement).value.trim();
    const telo = `${text}${jmeno ? `\n\n— ${jmeno}` : ""}`;
    /* pošta se otevře hned (ještě v kliknutí, jinak ji prohlížeč může zablokovat), skládání běží mezitím */
    window.location.href = `mailto:${data.email}?subject=${encodeURIComponent(dopisData.predmet)}&body=${encodeURIComponent(telo)}`;
    if (klidne || !dlgDopis || typeof dlgDopis.animate !== "function") {
      window.setTimeout(posliDopis, 250);
      return;
    }
    e.preventDefault();
    sloz(dlgDopis).then(() => {
      form.reset();
      posliDopis();
    });
  });

  /** 結び文: papír v dialogu se přeloží do proužku, zaváže na uzel a uzel spadne dolů k provázku */
  async function sloz(dlg: HTMLDialogElement) {
    const papir = dlg.querySelector<HTMLElement>(".ko-papir");
    const uzel = dlg.querySelector<SVGSVGElement>(".ko-uzel-dopisu");
    if (!papir || !uzel) return dlg.close();
    dlg.classList.add("sklada");
    zvuk.papir();
    /* všechny snímky mají stejné funkce, ať se přechody mezi nimi plynule prolínají */
    const T = (z: number, x: number, sx: number, sy: number) => `perspective(900px) rotate(${z}deg) rotateX(${x}deg) scale(${sx}, ${sy})`;
    const skladani = papir.animate(
      [
        { transform: T(0, 0, 1, 1), opacity: 1, offset: 0 },
        { transform: T(0, 0, 1, 1), opacity: 1, offset: 0.2 },
        { transform: T(0, 68, 1, 0.5), opacity: 1, offset: 0.42 },
        { transform: T(0, 0, 1, 0.5), opacity: 1, offset: 0.52 },
        { transform: T(0, -68, 0.96, 0.24), opacity: 1, offset: 0.72 },
        { transform: T(0, 0, 0.92, 0.1), opacity: 1, offset: 0.82 },
        { transform: T(-24, 0, 0.92, 0.07), opacity: 1, offset: 0.92 },
        { transform: T(-24, 0, 0.22, 0.05), opacity: 0, offset: 1 },
      ],
      { duration: 1500, easing: "cubic-bezier(0.45, 0, 0.3, 1)", fill: "forwards" },
    );
    window.setTimeout(() => zvuk.papir(), 650);
    await skladani.finished;
    zvuk.uzel();
    const vaz = uzel.animate(
      [
        { opacity: 0, transform: "rotate(-40deg) scale(0.35)" },
        { opacity: 1, transform: "rotate(6deg) scale(1.08)", offset: 0.6 },
        { opacity: 1, transform: "rotate(0deg) scale(1)" },
      ],
      { duration: 480, easing: "cubic-bezier(0.3, 1.3, 0.5, 1)", fill: "forwards" },
    );
    await vaz.finished;
    dlg.classList.add("odchazi");
    const pad = uzel.animate(
      [
        { opacity: 1, transform: "rotate(0deg) scale(1)" },
        { opacity: 1, transform: "translateY(-14px) rotate(-4deg) scale(1)", offset: 0.25 },
        { opacity: 0, transform: "translateY(45vh) rotate(16deg) scale(0.45)" },
      ],
      { duration: 620, easing: "cubic-bezier(0.5, 0, 0.75, 0.4)", fill: "forwards" },
    );
    await pad.finished;
    dlg.close();
    skladani.cancel();
    vaz.cancel();
    pad.cancel();
    dlg.classList.remove("sklada", "odchazi");
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && sekce!.dataset.zastavka === "uvnitr" && !document.querySelector("dialog[open]")) ven();
  });

  /* ——— nápověda: hrnek zvoní, dokud ho nezvedneš; okno vede dovnitř taky ——— */
  /** Horká plocha přes okno dílny (souřadnice z kresby) */
  function oknoSvg() {
    if (!body) return "";
    const [a, b, c, d] = body.oknoKlik;
    return `<rect class="ko-okno-klik" x="${f(a)}" y="${f(b)}" width="${f(c - a)}" height="${f(d - b)}" rx="${f(Math.max(4.5, (c - a) * 0.09))}"/>`;
  }
  /** Okno dílny: nahlédnout dovnitř bez hovoru */
  function nahlednout() {
    if (!body || hovor || sekce!.dataset.zastavka !== "venku") return;
    hovor = true;
    pouzito = true;
    smazBubliny();
    zvuk.cvak();
    sUstrednou((u) => {
      if (!body) return;
      const [ox, oy] = body.okno;
      u.dovnitr(kdo, [ox * k, oy * k], () => {}, vzhuru, stav, false);
    }, () => (hovor = false));
  }
  /* Zvoní chvíli po načtení a pak po každých dvaceti vteřinách, nejvýš čtyřikrát.
     Nikdy hned po kliknutí do scény (aby to nevypadalo jako odpověď na klik),
     ani když je scéna odscrollovaná, otevřený dialog nebo karta na pozadí. */
  let naOcich = true;
  new IntersectionObserver(
    ([z]) => {
      naOcich = z.intersectionRatio >= 0.4;
      zvonZnovu();
    },
    { threshold: [0, 0.4, 0.8] },
  ).observe(sekce);
  let ruka = -Infinity;
  sekce.addEventListener("pointerdown", () => {
    ruka = performance.now();
    void nactiUvnitr();
  });
  let zazvonilo = 0;
  /** Zvonění čeká, až se scéna vrátí na oči a karta do popředí — mezitím se nekontroluje */
  let zvonCeka = false;
  /** Hrnek zazvoní a od domu k němu přiběhnou světélka; false, když se to teď nehodí */
  function pozvani() {
    if (pouzito || hovor || !body || !el || !naOcich || sekce!.dataset.zastavka !== "venku" || document.querySelector("dialog[open]") || document.hidden) return false;
    const hrnek = el.hrnek;
    hrnek?.classList.add("zvoni");
    window.setTimeout(() => hrnek?.classList.remove("zvoni"), 1800);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 5; j++) window.setTimeout(() => zvuk.ton(1250, 1240, 0.04, "square", 0.012), i * 560 + j * 60);
    if (!klidne) svetelka(() => {}, true);
    return true;
  }
  function zvon() {
    if (pouzito || zazvonilo >= 4) return;
    /* scéna odscrollovaná nebo karta na pozadí: počká na návrat (zvonZnovu), nekontroluje dokola */
    if (!naOcich || document.hidden) {
      zvonCeka = true;
      return;
    }
    const klid = performance.now() - ruka;
    if (klid < 5000) return void window.setTimeout(zvon, 5200 - klid);
    if (!pozvani()) return void window.setTimeout(zvon, 3000);
    zazvonilo++;
    window.setTimeout(zvon, 20000);
  }
  /** Scéna je zpátky na očích: zvonění se ozve za chvilku jako dřív */
  function zvonZnovu() {
    if (!zvonCeka || !naOcich || document.hidden) return;
    zvonCeka = false;
    window.setTimeout(zvon, 3000);
  }
  document.addEventListener("visibilitychange", zvonZnovu);
  window.setTimeout(zvon, 3500);

  /* ——— start ——— */
  cas();
  vykresli();
  let pockej: number | undefined;
  new ResizeObserver(() => {
    window.clearTimeout(pockej);
    pockej = window.setTimeout(() => {
      smazBubliny();
      vykresli();
      uvnitr?.prekresli();
    }, 160);
  }).observe(sekce);
  document.fonts?.ready.then(() => {
    window.clearTimeout(pockej);
    pockej = window.setTimeout(vykresli, 30);
  });

  /* Hodiny po minutách: na kartě na pozadí se nekontroluje nic, po návratu hned.
     Změnu (otevřeno, služba, roční období, svátek) scéna překreslí, až když je
     na obrazovce — mimo ni počká na návrat. */
  let prekreslit = false;
  const minuta = () => {
    if (document.hidden) return;
    if (cas() && sekce!.dataset.zastavka === "venku" && !hovor) {
      if (videt) vykresli();
      else prekreslit = true;
    }
  };
  window.setInterval(minuta, 60000);
  document.addEventListener("visibilitychange", minuta);
  naObrazovce(sekce, (v) => {
    videt = v;
    if (v && prekreslit && sekce!.dataset.zastavka === "venku" && !hovor) {
      prekreslit = false;
      vykresli();
    }
    rozbehni();
  });

  /* ústředna se načte v klidu, až první obrazovka stojí (před prvním zazvoněním hrnku),
     nebo dřív, když na scénu sáhne myš, prst či Tab */
  window.setTimeout(() => void nactiUvnitr(), 2500);
  sekce.addEventListener("pointerover", () => void nactiUvnitr(), { once: true });
  sekce.addEventListener("focusin", () => void nactiUvnitr(), { once: true });

  function oznam(html: string) {
    const o = document.querySelector<HTMLElement>(".oznameni");
    if (!o) return;
    o.innerHTML = `<span>${html}</span>`;
    o.classList.add("je");
    window.setTimeout(() => o.classList.remove("je"), 2800);
  }
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
