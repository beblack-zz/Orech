/**
 * Úroveň 四 Tvar — „Podle předlohy“. Hlídá Vázička, nejstarší kus v dílně.
 *
 * Tři kola, každé těžší: miska, hrnek, váza. Mistr postaví na polici kus
 * v plné glazuře a jeho obrys leží na kruhu jako zlatá přerušovaná čára,
 * ve stejném měřítku jako hlína. Kreslí se jako na kruhu v Dílně: od
 * patky nahoru vpravo od osy (vlevo to jde taky, zrcadlí se). Hlína za
 * čarou roste, a kde čára sedí na zlaté, zlatá se rozsvítí. Překreslit se
 * dá, kolikrát je potřeba. Drát (tlačítko nebo Enter) kus odřízne, po 35
 * vteřinách se odřízne sám. Odříznutý kus odletí na prkno a ukáže se,
 * jak moc se shoduje s předlohou.
 *
 * Co by na kruhu spadlo (spadne() z Dílny), spadne i tady: už při
 * kreslení se hlína kývá a Vázička varuje, a kdo to i tak odřízne, má
 * v kole nulu. Body, shoda a výsledek jsou v tvar-model.ts, kresba scény
 * v components/zkouska/urovne/tvar-kresba.ts.
 *
 * Klávesnice: Enter odřízne kus. Kreslit se dá jen myší, prstem nebo perem.
 *
 * Na telefonu (kvalita.ts) odkapává šlikru a drobků polovina, jiskřiček
 * kolem shody taky.
 */
import type { Uroven } from "../hra";
import { casText } from "../hra";
import * as zvuk from "../../parta2/zvuk";
import { omez, mix, hladce, SVGNS } from "../../parta2/stav";
import { castic } from "../../parta2/kvalita";
import { kusSvg } from "../../../components/dilna/kus";
import { kamiInfo } from "../../../data/kami";
import {
  PREDLOHY, HROUDA, CX, ZAKLAD, S, N, SIRKA, VYSKA, PRKNO, f1,
  obrysHliny, ryhyHliny, leskHliny, okrajHliny, stinHliny, patkaHliny, predlohaSvg, naPrkne, vnor,
} from "../../../components/zkouska/urovne/tvar-tvary";
import type { Profil } from "../../../components/zkouska/urovne/tvar-tvary";
import { duch } from "../../../components/zkouska/urovne/tvar-kresba";
import { obrysZCary, proc, shoda, sedi, vysledekHry, procenta } from "./tvar-model";
import type { BodCary, Kolo } from "./tvar-model";

/** Jak dlouho trvá kolo */
const DOBA = 35000;
const R_MAX = 150;
const H_MAX = 300;
const KOL = PREDLOHY.length;
/** Kolik kapek šlikru najednou ve vzduchu a kolikrát řidčeji kapou při kreslení — na telefonu půl a dvakrát */
const KAPEK_NAJEDNOU = castic(26);
const RIDCEJI = 100 / castic(100);

const VAROVANI: Record<string, string> = {
  siroke: "Takhle široké to patka neunese.",
  previs: "Převis. Hlína nahoru nepadá.",
  tenke: "Vysoké a tenké. To se rozkmitá.",
};
const PADLO: Record<string, string> = {
  siroke: "Spadlo to — nahoře moc široké.",
  previs: "Spadlo to — převis.",
  tenke: "Spadlo to — moc vysoké a tenké.",
};
const DRZENI = ["Klidně. Hlína nespěchá.", "Lokty k tělu.", "Rovně sedět, rovně točit. A dýchat."];
const komentar = (s: number) =>
  s >= 0.92 ? "Skoro jako předloha. Skoro." : s >= 0.8 ? "Pěkné. Lokty ještě kousek blíž." : s >= 0.6 ? "Ujde. Předloha se tváří kysele." : "Hm. Je to kus. Svým způsobem.";

const RADA_ZACATEK = "Táhni od patky nahoru po zlaté čáře. Kruh vytočí, co nakreslíš.";
const RADA_HOTOVO = "Překresli, kolikrát chceš. Hotový tvar odřízni drátem.";

type Faze = "ceka" | "hraje" | "rez" | "konec";

interface Animace {
  od: number;
  doba: number;
  krok?: (t: number) => void;
  hotovo?: () => void;
}

interface Kapka {
  el: SVGCircleElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  zije: number;
  doba: number;
}

export const tvar: Uroven = (p) => {
  const k = p.koren;
  const $ = <T extends Element>(s: string) => k.querySelector<T>(s)!;
  const okno = $<HTMLElement>(".mt4-okno");
  const svg = $<SVGSVGElement>(".mt4-kresba");
  const dotyk = $<HTMLElement>(".mt4-dotyk");
  const tvary = [...k.querySelectorAll<SVGPathElement>(".mt4-tvar")];
  const hlinaG = $<SVGGElement>(".mt4-hlina-g");
  const hlinaStin = $<SVGEllipseElement>(".mt4-hlina-stin");
  const ryhy = $<SVGPathElement>(".mt4-ryhy");
  const lesk = $<SVGPathElement>(".mt4-lesk");
  const patka = $<SVGPathElement>(".mt4-patka");
  const okraj = $<SVGEllipseElement>(".mt4-okraj");
  const duchObal = $<SVGGElement>(".mt4-duch-obal");
  const duchOkno = $<SVGRectElement>(".mt4-duch-okno");
  const cara = $<SVGPathElement>(".mt4-cara:not(.mt4-cara-zrcadlo)");
  const zrcadlo = $<SVGPathElement>(".mt4-cara-zrcadlo");
  const kapkyG = $<SVGGElement>(".mt4-kapky");
  const zebro = $<SVGGElement>(".mt4-zebro");
  const drat = $<SVGGElement>(".mt4-drat");
  const predlohaG = $<SVGGElement>(".mt4-predloha");
  const jiskryPolice = $<SVGGElement>(".mt4-jiskry-police");
  const cedulkaNazev = $<SVGTextElement>(".mt4-cedulka-nazev");
  const sloty = [...k.querySelectorAll<SVGGElement>(".mt4-slot")];
  const kami = $<HTMLElement>(".mt4-kami");
  const shodaEl = $<HTMLElement>(".mt4-shoda");
  const shodaHodnota = $<HTMLElement>(".mt4-shoda-hodnota");
  const shodaKus = $<HTMLElement>(".mt4-shoda-kus");
  const jiskry = $<HTMLElement>(".mt4-jiskry");
  const rada = $<HTMLElement>(".mt4-rada");
  const btRez = $<HTMLButtonElement>(".mt4-rez");

  const ac = new AbortController();
  const signal = ac.signal;

  let faze: Faze = "ceka";
  let kolo = 0;
  let kola: Kolo[] = [];
  /** Hlína, jak je zrovna vidět, a tvar, ke kterému roste */
  let r = [...HROUDA.r];
  let v = HROUDA.v;
  let cil: Profil = { r: [...HROUDA.r], v: HROUDA.v };
  /** Podíl cesty k obrysu, který hlína ujde za snímek */
  let tah = 0.16;
  let otevrena = false;
  let zmeneno = true;
  /** Platný obrys kola (poslední dokončená čára) a její body */
  let obrys: Profil | null = null;
  let bodyObrysu: BodCary[] = [];
  /** Čára, která se právě kreslí */
  let body: BodCary[] = [];
  let ukazatel: number | null = null;
  let zbyva = DOBA;
  let hud = "";
  let usekyDucha: SVGPathElement[] = [];
  let start: SVGGElement | null = null;
  let vseSedi = false;
  let tahu = 0;
  let varovano = false;
  let radila = false;
  let pet = false;

  /* ——— Čas, animace, smyčka ——— */
  let cas = 0;
  let posledni = 0;
  let raf = 0;
  let animace: Animace[] = [];
  let tociDo = 0;
  let houpe = false;
  let dopad = false;
  let kapky: Kapka[] = [];
  let posledniKapka = 0;
  let posledniRec = -1e9;
  let posledniKlik = -1e9;

  const animuj = (doba: number, krok?: (t: number) => void, hotovo?: () => void) => {
    animace.push({ od: cas, doba: Math.max(0, doba), krok, hotovo });
  };
  const pockej = (ms: number, fn: () => void) => animuj(ms, undefined, fn);
  /** Ozdobný pohyb — s omezeným pohybem rovnou konec */
  const ozdoba = (ms: number) => (p.klid ? 0 : ms);

  const rekni = (text: string, vzdy = false) => {
    if (!vzdy && cas - posledniRec < 4000) return;
    posledniRec = cas;
    p.rekni(text, kami);
    kami.classList.remove("mluvi");
    void kami.offsetWidth;
    kami.classList.add("mluvi");
  };
  const reaguj = (trida: "radost" | "lekne") => {
    kami.classList.remove("radost", "lekne");
    void kami.offsetWidth;
    kami.classList.add(trida);
  };
  const rikej = (text: string) => {
    rada.textContent = text;
  };
  const ukazujCas = () => {
    const text = `Kus ${kolo + 1}/${KOL} · ${casText(Math.ceil(Math.max(0, zbyva) / 1000) * 1000)}`;
    if (text !== hud) {
      hud = text;
      p.ukazatel(text);
    }
  };

  let zvukKruhu = "";
  const kruhZni = (mira: number, dotyk: boolean) => {
    const stav = `${mira}${dotyk}`;
    if (stav === zvukKruhu) return;
    zvukKruhu = stav;
    zvuk.nastavKruh(mira, dotyk);
  };
  const roztoc = (ms: number) => {
    tociDo = Math.max(tociDo, cas + ms);
    okno.classList.add("toci");
    kruhZni(0.6, ukazatel !== null);
  };

  /* ——— Kresba hlíny ——— */
  const nastavHlinu = (t: string | null) => {
    if (t) hlinaG.setAttribute("transform", t);
    else hlinaG.removeAttribute("transform");
  };
  const kresliHlinu = () => {
    const pr: Profil = { r, v };
    const d = obrysHliny(pr);
    tvary.forEach((el) => el.setAttribute("d", d));
    ryhy.setAttribute("d", otevrena ? ryhyHliny(pr) : "");
    lesk.setAttribute("d", leskHliny(pr));
    patka.setAttribute("d", patkaHliny(pr));
    const st = stinHliny(pr);
    hlinaStin.setAttribute("cx", f1(st.cx));
    hlinaStin.setAttribute("cy", f1(st.cy));
    hlinaStin.setAttribute("rx", f1(st.rx));
    hlinaStin.setAttribute("ry", f1(st.ry));
    const o = okrajHliny(pr);
    okraj.setAttribute("cx", f1(o.cx));
    okraj.setAttribute("cy", f1(o.cy));
    okraj.setAttribute("rx", otevrena ? f1(o.rx) : "0");
    okraj.setAttribute("ry", otevrena ? f1(o.ry) : "0");
  };
  const novaHrouda = () => {
    r = [...HROUDA.r];
    v = HROUDA.v;
    cil = { r: [...HROUDA.r], v: HROUDA.v };
    otevrena = false;
    tah = 0.16;
    zmeneno = true;
    nastavHlinu(null);
    hlinaG.style.opacity = "";
    kresliHlinu();
  };

  /* ——— Zlatá předloha ——— */
  const ukazDucha = (i: number, odhalit: boolean) => {
    duchObal.innerHTML = duch(PREDLOHY[i]);
    usekyDucha = [...duchObal.querySelectorAll<SVGPathElement>(".mt4-duch-u")];
    start = duchObal.querySelector<SVGGElement>(".mt4-start");
    duchObal.classList.remove("pryc");
    const plna = () => {
      duchOkno.setAttribute("y", "0");
      duchOkno.setAttribute("height", String(VYSKA));
    };
    if (!odhalit || p.klid) {
      plna();
      return;
    }
    /* Zlatá čára se vykreslí od patky nahoru */
    const vyska = PREDLOHY[i].v * S + 40;
    duchOkno.setAttribute("height", "0");
    start?.classList.add("schovany");
    animuj(
      900,
      (t) => {
        const h = vyska * hladce(t);
        duchOkno.setAttribute("y", f1(ZAKLAD + 20 - h));
        duchOkno.setAttribute("height", f1(h));
      },
      () => {
        plna();
        if (tahu === 0) start?.classList.remove("schovany");
      },
    );
  };
  /** Rozsvítí úseky zlaté čáry, kde nakreslený obrys sedí. Vrací, kolik jich sedí. */
  const zvyrazni = (o: Profil | null) => {
    const pr = PREDLOHY[kolo];
    let sedici = 0;
    usekyDucha.forEach((u, i) => {
      const ok = sedi(pr, o, ((i + 0.5) / (N - 1)) * pr.v);
      if (ok) sedici++;
      u.classList.toggle("trefa", ok);
    });
    return sedici;
  };

  /* ——— Kapky šlikru a drobky ——— */
  const kapni = (x: number, y: number, pocet: number, smer: number, barva = "#8E6A52", velikost = 2.2) => {
    if (p.klid) return;
    for (let i = 0, n = castic(pocet); i < n && kapky.length < KAPEK_NAJEDNOU; i++) {
      const el = document.createElementNS(SVGNS, "circle");
      el.setAttribute("r", f1(velikost * (0.6 + Math.random() * 0.7)));
      el.setAttribute("fill", barva);
      kapkyG.appendChild(el);
      kapky.push({
        el,
        x,
        y,
        vx: smer * (0.06 + Math.random() * 0.16),
        vy: -(0.05 + Math.random() * 0.17),
        zije: 0,
        doba: 520 + Math.random() * 360,
      });
    }
  };
  const krokKapek = (dt: number) => {
    kapky = kapky.filter((d) => {
      d.zije += dt;
      d.vy += 0.0009 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      if (d.zije >= d.doba) {
        d.el.remove();
        return false;
      }
      d.el.setAttribute("cx", f1(d.x));
      d.el.setAttribute("cy", f1(d.y));
      d.el.setAttribute("opacity", f1(1 - (d.zije / d.doba) ** 2));
      return true;
    });
  };

  /* ——— Kreslení ——— */
  const vBode = (e: PointerEvent) => {
    const b = svg.getBoundingClientRect();
    if (!b.width || !b.height) return null;
    return { x: ((e.clientX - b.left) / b.width) * SIRKA, y: ((e.clientY - b.top) / b.height) * VYSKA };
  };
  const caraD = (bb: BodCary[], zrc: boolean) =>
    bb.length ? "M" + bb.map((b) => `${f1(CX + (zrc ? -1 : 1) * b.r * S)} ${f1(ZAKLAD - b.h * S)}`).join(" L") : "";
  const ukazCaru = (bb: BodCary[]) => {
    cara.setAttribute("d", caraD(bb, false));
    zrcadlo.setAttribute("d", caraD(bb, true));
  };
  /** Hlína se kývá, když by obrys spadl */
  const hlidejPad = (o: Profil | null) => {
    const pad = o ? proc(o) : null;
    houpe = !!pad;
    cara.classList.toggle("pada", !!pad);
    return pad;
  };

  const pridej = (e: PointerEvent) => {
    const m = vBode(e);
    if (!m) return;
    const b = { r: omez(Math.abs(m.x - CX) / S, 0, R_MAX), h: omez((ZAKLAD - m.y) / S, 0, H_MAX) };
    const minuly = body[body.length - 1];
    if (!minuly || Math.hypot((b.r - minuly.r) * S, (b.h - minuly.h) * S) > 3) body.push(b);
    const zx = CX + b.r * S;
    const zy = ZAKLAD - b.h * S;
    zebro.setAttribute("transform", `translate(${f1(zx + 12)} ${f1(zy)})`);
    ukazCaru(body);
    roztoc(500);
    if (body.length > 3) {
      const o = obrysZCary(body);
      if (o) {
        cil = o;
        tah = 0.16;
        if (!otevrena) {
          otevrena = true;
          zmeneno = true;
        }
        zvyrazni(o);
        hlidejPad(o);
      }
    }
    if (cas - posledniKapka > 90 * RIDCEJI && b.h > 4) {
      posledniKapka = cas;
      kapni(zx + 6, zy + 4, 1, 1);
    }
  };

  const zacniTah = (e: PointerEvent) => {
    zvuk.odemkni();
    if (faze !== "hraje" || ukazatel !== null) return;
    if (e.button > 0) return;
    ukazatel = e.pointerId;
    try {
      dotyk.setPointerCapture(e.pointerId);
    } catch {
      /* zachytávání ukazatele není všude */
    }
    body = [];
    tahu++;
    start?.classList.add("schovany");
    okno.classList.add("kresli");
    zebro.style.opacity = "1";
    pridej(e);
    e.preventDefault();
  };

  /** Konec tahu: z čáry je nový obrys, nebo zůstává ten předchozí */
  const dokonciTah = () => {
    ukazatel = null;
    okno.classList.remove("kresli");
    zebro.style.opacity = "0";
    if (faze !== "hraje") return;
    const o = obrysZCary(body);
    if (!o) {
      /* Krátké škrtnutí neplatí — hlína se vrátí k minulému obrysu */
      cil = obrys ? { r: [...obrys.r], v: obrys.v } : { r: [...HROUDA.r], v: HROUDA.v };
      if (!obrys) otevrena = false;
      zmeneno = true;
      ukazCaru(bodyObrysu);
      zvyrazni(obrys);
      hlidejPad(obrys);
      rikej("Táhni od patky nahoru — pomalu, vpravo od osy.");
      return;
    }
    obrys = o;
    bodyObrysu = body;
    cil = { r: [...o.r], v: o.v };
    povolRez(true);
    const sedici = zvyrazni(o);
    const pad = hlidejPad(o);
    if (pad) {
      rikej(`${VAROVANI[pad]} Takhle by to spadlo — překresli to.`);
      if (!varovano || cas - posledniRec > 6000) rekni(VAROVANI[pad], true);
      varovano = true;
      return;
    }
    rikej(RADA_HOTOVO);
    if (sedici === N - 1 && !vseSedi) {
      vseSedi = true;
      zvuk.cink();
      p.zprava("Celá zlatá čára sedí.");
    } else if (!radila && cas - posledniRec > 3000) {
      radila = true;
      rekni(DRZENI[kolo % DRZENI.length]);
    }
  };

  dotyk.addEventListener("pointerdown", zacniTah, { signal });
  dotyk.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerId !== ukazatel || faze !== "hraje") return;
      pridej(e);
    },
    { signal },
  );
  const pust = (e: PointerEvent) => {
    if (e.pointerId !== ukazatel) return;
    dokonciTah();
  };
  dotyk.addEventListener("pointerup", pust, { signal });
  dotyk.addEventListener("pointercancel", pust, { signal });
  dotyk.addEventListener("lostpointercapture", pust, { signal });

  /* Vázička na polici: klepnutí, a řekne něco ze svého */
  let replika = 0;
  kami.addEventListener(
    "click",
    () => {
      if (cas - posledniKlik < 2500 || faze === "konec") return;
      posledniKlik = cas;
      const repliky = kamiInfo.vazicka.repliky;
      zvuk.reakce("vazicka");
      rekni(repliky[replika++ % repliky.length], true);
    },
    { signal },
  );

  /* ——— Odříznutí ——— */
  const kusNaPrkno = (i: number, o: Profil | null, popis: string, dobre: boolean) => {
    const slot = sloty[i];
    if (!slot) return;
    const box = { w: PRKNO.w, h: PRKNO.h };
    const x = PRKNO.x[i];
    const kus = o
      ? kusSvg({ puvod: "kruh", druh: "tvar", nazev: "", r: o.r, v: o.v, glazury: [], dno: false }, "mokry", { id: `mt4-k${i}`, sirka: box.w, vyska: box.h })
      : kusSvg({ puvod: "kruh", druh: "tvar", nazev: "", r: HROUDA.r, v: HROUDA.v, glazury: [], dno: false }, "hrouda", { id: `mt4-k${i}`, sirka: box.w, vyska: box.h });
    const sirka = Math.max(42, popis.length * 7.4 + 14);
    slot.innerHTML =
      vnor(kus, x - box.w / 2, PRKNO.y + 10 - box.h, box.w, box.h) +
      `<g class="mt4-stitek${dobre ? " dobre" : ""}" transform="rotate(${i % 2 ? 2.5 : -2.5} ${x} ${PRKNO.y + 24})">` +
      `<rect x="${f1(x - sirka / 2)}" y="${PRKNO.y + 13}" width="${f1(sirka)}" height="20" rx="2.5" fill="${dobre ? "#FBF6EA" : "#F6E3DA"}" stroke="${dobre ? "#D8C7A6" : "#D9A595"}" stroke-width="1"/>` +
      `<text x="${x}" y="${PRKNO.y + 28}" text-anchor="middle" font-size="15" font-family="Caveat, cursive" fill="${dobre ? "#2B2420" : "#C4432B"}" class="mt4-ruka">${popis}</text></g>`;
    /* Dosedne a pruží kolem vlastní patky */
    slot.style.transformOrigin = `${x}px ${PRKNO.y}px`;
    slot.classList.remove("dosedl");
    void slot.getBoundingClientRect();
    slot.classList.add("dosedl");
  };

  const jiskryKolem = (pocet: number) => {
    if (p.klid) return;
    jiskry.innerHTML = "";
    for (let i = 0; i < pocet; i++) {
      const s = document.createElement("span");
      const uhel = (i / pocet) * Math.PI * 2 + Math.random() * 0.4;
      const dal = 56 + Math.random() * 44;
      s.style.setProperty("--dx", `${(Math.cos(uhel) * dal).toFixed(1)}px`);
      s.style.setProperty("--dy", `${(Math.sin(uhel) * dal * 0.8).toFixed(1)}px`);
      s.style.animationDelay = `${Math.random() * 120}ms`;
      jiskry.appendChild(s);
    }
  };

  const ukazShodu = (s: number, pod: string, stav: "ok" | "spadlo" | "hrouda") => {
    shodaEl.hidden = false;
    shodaEl.classList.remove("pryc", "vyborne", "spadlo", "hrouda");
    if (stav !== "ok") shodaEl.classList.add(stav);
    else if (s >= 0.85) shodaEl.classList.add("vyborne");
    shodaKus.textContent = pod;
    const cilova = procenta(s);
    shodaHodnota.textContent = "0";
    let tiky = 0;
    animuj(
      stav === "ok" ? ozdoba(900) : 0,
      (t) => {
        const n = Math.round(cilova * hladce(t));
        shodaHodnota.textContent = String(n);
        const tik = Math.floor(t * 9);
        if (tik > tiky && t < 1) {
          tiky = tik;
          zvuk.ton(900 + tik * 90, 860 + tik * 90, 0.04, "triangle", 0.035);
        }
      },
      () => {
        shodaHodnota.textContent = String(cilova);
        pockej(stav === "ok" ? 1500 : 1300, dalsi);
        if (stav !== "ok") return;
        if (s >= 0.85) {
          zvuk.nalezeno();
          jiskryKolem(castic(14));
          reaguj("radost");
        } else zvuk.cink();
      },
    );
  };

  /** Konec kola — další jde, až dohraje karta se shodou (ukazShodu) */
  const zapisKolo = (kz: Kolo) => {
    kola.push(kz);
  };

  const povolRez = (ano: boolean) => btRez.setAttribute("aria-disabled", String(!ano));

  /** Odříznout drátem — ručně jen nakreslený tvar, sám (`samo`) když dojde čas */
  const odrizni = (samo = false) => {
    if (faze !== "hraje") return;
    if (ukazatel !== null) dokonciTah();
    if (!obrys && !samo) {
      rikej("Nejdřív obrys — táhni od patky nahoru po zlaté čáře.");
      return;
    }
    faze = "rez";
    povolRez(false);
    start?.classList.add("schovany");
    zebro.style.opacity = "0";
    houpe = false;
    nastavHlinu(null);
    const pr = PREDLOHY[kolo];
    const i = kolo;

    /* Nic se nenakreslilo — hrouda zůstala hroudou */
    if (!obrys) {
      zvuk.hnet();
      rikej("Hrouda zůstala hroudou. Další kus.");
      rekni("Hrouda zůstala hroudou.", true);
      hlinaG.style.opacity = "0";
      duchObal.classList.add("pryc");
      kusNaPrkno(i, null, "hrouda", false);
      ukazShodu(0, "Nic nevytočeno", "hrouda");
      zapisKolo({ predloha: pr, s: 0, spadlo: false, obrys: null });
      return;
    }

    const o = obrys;
    const pad = proc(o);
    if (pad) {
      /* Spadne to: hlína se zkosí a slehne kolem patky */
      zvuk.zuch();
      reaguj("lekne");
      rekni("Lokty k tělu. A znovu.", true);
      p.zprava(PADLO[pad]);
      rikej(`${PADLO[pad]} Kolo za nulu.`);
      cara.setAttribute("d", "");
      zrcadlo.setAttribute("d", "");
      duchObal.classList.add("pryc");
      animuj(
        ozdoba(900),
        (t) => {
          const e = hladce(t);
          nastavHlinu(`translate(${f1(CX + e * 18)} ${f1(ZAKLAD + e * 4)}) skewX(${f1(-e * 16)}) scale(1 ${f1(1 - e * 0.45)}) translate(${-CX} ${-ZAKLAD})`);
        },
        () => {
          kapni(CX, ZAKLAD - 30, 9, 1, "#7E5E48", 3.4);
          kapni(CX, ZAKLAD - 30, 7, -1, "#7E5E48", 3.4);
          animuj(
            ozdoba(380),
            (t) => (hlinaG.style.opacity = f1(1 - t)),
            () => {
              hlinaG.style.opacity = "0";
              nastavHlinu(null);
              kusNaPrkno(i, null, pr.spadlo, false);
              ukazShodu(0, `${pr.nazev} ${pr.spadlo}`, "spadlo");
            },
          );
        },
      );
      zapisKolo({ predloha: pr, s: 0, spadlo: true, obrys: o });
      return;
    }

    const { s } = shoda(pr, o);
    zvuk.papir();
    rikej("Drát jde pod patku…");
    cara.setAttribute("d", "");
    zrcadlo.setAttribute("d", "");
    /* Drát projede pod patkou zprava doleva */
    const sirka = Math.max(...o.r.slice(0, 3)) * S;
    drat.style.opacity = p.klid ? "0" : "1";
    animuj(
      ozdoba(850),
      (t) => drat.setAttribute("transform", `translate(${f1(mix(CX + sirka + 40, CX - sirka - 420, hladce(t)))} ${ZAKLAD - 2})`),
      () => {
        drat.style.opacity = "0";
        kapni(CX - sirka, ZAKLAD - 2, 5, -1);
        /* Hlína dojede do přesného tvaru a odletí na prkno */
        r = [...o.r];
        v = o.v;
        cil = { r: [...o.r], v: o.v };
        kresliHlinu();
        duchObal.classList.add("pryc");
        const kam = naPrkne(o, i);
        animuj(
          ozdoba(820),
          (t) => {
            const e = hladce(t);
            const x = mix(CX, kam.x, e);
            const y = mix(ZAKLAD, kam.y, e) - Math.sin(Math.PI * t) * 70;
            nastavHlinu(`translate(${f1(x)} ${f1(y)}) scale(${(mix(1, kam.k, e)).toFixed(3)}) translate(${-CX} ${-ZAKLAD})`);
          },
          () => {
            hlinaG.style.opacity = "0";
            nastavHlinu(null);
            zvuk.drevo(0.8);
            kusNaPrkno(i, o, `${procenta(s)} %`, true);
            rikej(`${pr.nazev}: shoda ${procenta(s)} %.`);
            ukazShodu(s, pr.nazev, "ok");
            rekni(komentar(s), true);
          },
        );
      },
    );
    zapisKolo({ predloha: pr, s, spadlo: false, obrys: o });
  };
  btRez.addEventListener("click", () => odrizni(), { signal });
  k.addEventListener(
    "keydown",
    (e) => {
      if (e.key !== "Enter" || e.target instanceof HTMLButtonElement) return;
      e.preventDefault();
      odrizni();
    },
    { signal },
  );

  /* ——— Kola ——— */
  const jiskryNaPolici = () => {
    if (p.klid) return;
    jiskryPolice.innerHTML = "";
    const misto: [number, number, number][] = [[40, 120, 0], [214, 92, 160], [190, 214, 300], [60, 220, 90]];
    for (const [x, y, zpozdeni] of misto) {
      const j = document.createElementNS(SVGNS, "path");
      j.setAttribute("d", `M${x} ${y - 9} Q${x + 2} ${y - 2} ${x + 9} ${y} Q${x + 2} ${y + 2} ${x} ${y + 9} Q${x - 2} ${y + 2} ${x - 9} ${y} Q${x - 2} ${y - 2} ${x} ${y - 9} Z`);
      j.setAttribute("fill", "#F3D27A");
      j.setAttribute("class", "mt4-jiskra");
      j.style.animationDelay = `${zpozdeni}ms`;
      jiskryPolice.appendChild(j);
    }
    pockej(1400, () => (jiskryPolice.innerHTML = ""));
  };

  const zacniKolo = (i: number) => {
    kolo = i;
    obrys = null;
    bodyObrysu = [];
    body = [];
    zbyva = DOBA;
    vseSedi = false;
    varovano = false;
    radila = false;
    pet = false;
    tahu = 0;
    houpe = false;
    hud = "";
    cara.classList.remove("pada");
    ukazCaru([]);
    povolRez(false);
    rikej(RADA_ZACATEK);
    ukazujCas();
    faze = "hraje";
    zvuk.reakce("vazicka");
    rekni(PREDLOHY[i].uvod, true);
    const kdy = kolo;
    pockej(8000, () => {
      if (faze === "hraje" && kolo === kdy && tahu === 0) rekni("Od patky nahoru, po zlaté čáře.");
    });
  };

  const dalsi = () => {
    if (faze === "konec") return;
    shodaEl.classList.add("pryc");
    pockej(ozdoba(260), () => (shodaEl.hidden = true));
    if (kolo >= KOL - 1) {
      konec();
      return;
    }
    const i = kolo + 1;
    /* Mistr vymění kus na polici */
    predlohaG.classList.remove("prichazi");
    predlohaG.classList.add("odchazi");
    pockej(ozdoba(360), () => {
      predlohaG.innerHTML = predlohaSvg(PREDLOHY[i]);
      cedulkaNazev.textContent = PREDLOHY[i].nazev;
      predlohaG.classList.remove("odchazi");
      void predlohaG.getBoundingClientRect();
      predlohaG.classList.add("prichazi");
      zvuk.drevo(1.15);
      jiskryNaPolici();
      /* Čerstvá hrouda žuchne na kruh */
      novaHrouda();
      dopad = true;
      zvuk.hnet();
      animuj(
        ozdoba(620),
        (t) => {
          let dy = 0;
          let sy = 1;
          if (t < 0.32) {
            const u = t / 0.32;
            dy = -90 * (1 - u * u);
            sy = 1.1;
          } else {
            const u = (t - 0.32) / 0.68;
            sy = 1 - 0.22 * Math.exp(-4 * u) * Math.cos(9 * u);
          }
          const sx = 1 + (1 - sy) * 0.7;
          nastavHlinu(`translate(${CX} ${f1(ZAKLAD + dy)}) scale(${sx.toFixed(3)} ${sy.toFixed(3)}) translate(${-CX} ${-ZAKLAD})`);
        },
        () => {
          dopad = false;
          nastavHlinu(null);
        },
      );
      ukazDucha(i, true);
      zacniKolo(i);
    });
  };

  const konec = () => {
    faze = "konec";
    povolRez(false);
    shodaEl.hidden = true;
    const vysledek = vysledekHry(kola);
    if (vysledek.proslo) reaguj("radost");
    rikej(vysledek.proslo ? "Tři kusy na prkně. Hotovo." : "Tři pokusy na prkně. Zkus to znovu.");
    p.konec(vysledek);
    zastav();
  };

  /* ——— Smyčka ——— */
  const snimek = (ted: number) => {
    raf = requestAnimationFrame(snimek);
    const dt = posledni ? Math.min(100, Math.max(0, ted - posledni)) : 16.7;
    posledni = ted;
    cas += dt;

    if (faze === "hraje") {
      zbyva -= dt;
      ukazujCas();
      if (!pet && zbyva <= 5000) {
        pet = true;
        p.zprava("Ještě pět vteřin.");
      }
      if (zbyva <= 0) {
        zbyva = 0;
        ukazujCas();
        p.zprava("Čas. Drát jde pod patku.");
        odrizni(true);
      }
    }

    for (const a of [...animace]) {
      if (!raf) return;
      const t = a.doba > 0 ? omez((cas - a.od) / a.doba) : 1;
      a.krok?.(t);
      if (t >= 1) {
        animace.splice(animace.indexOf(a), 1);
        a.hotovo?.();
      }
    }
    if (!raf) return;

    let hybe = false;
    for (let i = 0; i < N; i++) {
      const dr = cil.r[i] - r[i];
      if (Math.abs(dr) > 0.05) {
        r[i] += dr * tah;
        hybe = true;
      }
    }
    if (Math.abs(cil.v - v) > 0.05) {
      v += (cil.v - v) * tah;
      hybe = true;
    }
    if (hybe || zmeneno) {
      zmeneno = false;
      kresliHlinu();
    }

    /* Co by spadlo, kývá se — kolem patky */
    if (faze === "hraje" && !dopad && !p.klid) {
      if (houpe) nastavHlinu(`rotate(${f1(Math.sin(cas / 70) * 2.4)} ${CX} ${ZAKLAD})`);
      else if (hlinaG.hasAttribute("transform")) nastavHlinu(null);
    }

    krokKapek(dt);

    if (tociDo && cas > tociDo && ukazatel === null) {
      tociDo = 0;
      okno.classList.remove("toci");
      kruhZni(0, false);
    }
  };

  const zastav = () => {
    cancelAnimationFrame(raf);
    raf = 0;
    animace = [];
    zvukKruhu = "";
    zvuk.nastavKruh(0, false);
    okno.classList.remove("toci", "kresli");
  };

  /* ——— Výchozí stav: scéna zůstává z minulého pokusu, uvede se do začátku ——— */
  okno.classList.remove("toci", "kresli");
  novaHrouda();
  predlohaG.classList.remove("odchazi", "prichazi");
  predlohaG.innerHTML = predlohaSvg(PREDLOHY[0]);
  cedulkaNazev.textContent = PREDLOHY[0].nazev;
  jiskryPolice.innerHTML = "";
  kapkyG.innerHTML = "";
  ukazDucha(0, false);
  cara.classList.remove("pada");
  ukazCaru([]);
  zebro.style.opacity = "0";
  drat.style.opacity = "0";
  drat.removeAttribute("transform");
  sloty.forEach((s) => {
    s.innerHTML = "";
    s.classList.remove("dosedl");
  });
  shodaEl.hidden = true;
  shodaEl.classList.remove("pryc", "vyborne", "spadlo", "hrouda");
  jiskry.innerHTML = "";
  kami.classList.remove("mluvi", "radost", "lekne");
  btRez.disabled = false;
  povolRez(false);
  rikej(RADA_ZACATEK);
  ukazujCas();

  let spusteno = false;
  let zastaveno = false;
  return {
    start() {
      if (spusteno || zastaveno) return;
      spusteno = true;
      posledni = 0;
      raf = requestAnimationFrame(snimek);
      jiskryNaPolici();
      zacniKolo(0);
    },
    stop() {
      if (zastaveno) return;
      zastaveno = true;
      if (faze !== "konec") faze = "konec";
      ac.abort();
      zastav();
      kapky.forEach((d) => d.el.remove());
      kapky = [];
    },
  };
};
