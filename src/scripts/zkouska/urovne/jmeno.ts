/**
 * 六 Jméno — „Čí je která“. Úroveň komnaty U mistra (/zkouska); scéna je
 * v components/zkouska/urovne/Jmeno.astro, kresba v jmeno-kresba.ts,
 * záměny v jmeno-kola.ts.
 *
 * A) Pečeť — nehodnotí se. Jméno, znaky na pečeť (nanejvýš dva), tvar
 *    a styl: 朱文 shubun (červené znaky) nebo 白文 hakubun (bílé znaky).
 *    Na lístku je živý návrh, na kameni náčrt — zrcadlově, jak se ryje.
 *    „Vyrýt“: rydlo vyryje pečeť do kamene, kámen se namočí v rumělce
 *    a otiskne na list. Pečeť se uloží hned po stisku — patří hráči,
 *    i kdyby dál neprošel, a podepisuje se jí i mistrovský list. Kdo už
 *    pečeť má, může ji ponechat a rytí přeskočit.
 * B) Čí je která — hodnotí se. Tři kola hry na skořápky. Cedulka zvedne
 *    misky jednu po druhé a ukáže dno (tvoje má tvou pečeť, ostatní
 *    znamení party), pak je přeskládá: vždy dvě misky naráz, jedna jede
 *    před ostatními (větší, se stínem), druhá za nimi (menší, ve stínu).
 *    Hráč jednou vybere tu svou a miska se zvedne.
 *      kolo 1: 3 misky, 5 záměn po 0,55 s
 *      kolo 2: 4 misky, 8 záměn po 0,42 s
 *      kolo 3: 5 misek, 12 záměn po 0,32 s a jedna klamná
 *
 * Body: k = uhodnutá kola; body = [15, 45, 72, 100][k]; prošlo od k = 1.
 * Ovládání: formulář normálně (Enter vyryje); misky myší, prstem, nebo
 * šipkami ← → a Enterem.
 *
 * Všechen pohyb jede v jedné snímkové smyčce s herním časem: anim() a
 * pockej() vracejí sliby, které smyčka splní — děj se tak dá psát po
 * sobě (async), a po stop() už nic nedoběhne.
 */
import type { Uroven } from "../hra";
import * as zvuk from "../../parta2/zvuk";
import { omez, mix } from "../../parta2/stav";
import { nactiPecet, ulozPecet, nactiJmeno, ulozJmeno } from "../postup";
import { pecetSvg, inicialy, cistaZnaky, vychoziPecet, tvaryPeceti, stylyPeceti } from "../../../components/zkouska/pecet";
import type { Pecet, TvarPeceti, StylPeceti } from "../../../components/zkouska/pecet";
import {
  KAMEN,
  KAMEN_STRED,
  DOZA,
  OTISK,
  RYDLO_KLID,
  CEDULKA_STUL,
  CEDULKA_Y,
  CEDULKA_W,
  VIEW_W,
  VIEW_H,
  POLICE_Y,
  MISKA_MERITKO,
  MISKA_STRED,
  TRAM_Y,
  MAJITELE,
  KOHO,
  JMENA,
  ZNACKY,
  mistaMisek,
  celoKamene,
  navrh,
  otisk,
  podpis,
  naCedulku,
  drahaRyti,
  trisk,
  miskaSvg,
  pecetDoDna,
  jiskra,
  popisek,
} from "../../../components/zkouska/urovne/jmeno-kresba";
import type { Majitel } from "../../../components/zkouska/urovne/jmeno-kresba";
import { KOLA, noveKolo } from "./jmeno-kola";
import type { Kolo, Tah } from "./jmeno-kola";

const SVGNS = "http://www.w3.org/2000/svg";
const BODY = [15, 45, 72, 100];
const VETY = [
  "Ani jedna. Piš čitelně — já to pak budu muset přečíst.",
  "Jedna. Příště se podepiš větší.",
  "Dvě ze tří. Já bych si to pamatovala.",
  "Tři ze tří. Tvoje jméno si zapíšu. Rydlem.",
];
const SPRAVNE = ["Přesně. Pamatuješ si líp než já. Skoro.", "Tvoje. Poznala bych ji i poslepu.", "Sedí. Jako pečeť."];
const MICHANI = ["Dvacet stejných misek. Jedna je tvoje. Já vím která.", "Teď rychleji. Já to stihnu. A ty?", "Pět misek. Pořád vím, která je tvoje."];

/** Jak vysoko a jak velká se miska zvedne, když ukazuje dno */
const ZDVIH = 140;
const ZVETSENI = 2 / MISKA_MERITKO;
/** Úhel rydla při rytí (stupně) */
const UHEL_RYTI = 32;

/** Výchozí DOM scény — každý nový pokus z něj začíná (DOM zůstává z minulého pokusu) */
const puvodni = new WeakMap<HTMLElement, string>();

/** Přerušení děje po stop() — chytá se nahoře, nic se nehlásí */
const PRERUSENO = Symbol("prerušeno");

const f = (n: number) => (Math.round(n * 10) / 10).toString();
const f3 = (n: number) => (Math.round(n * 1000) / 1000).toString();
/** Plynulý rozjezd i dojezd */
const sinus = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * omez(t));
/** Pružné dosednutí s malým překmitem */
const pruzina = (t: number) => 1 - Math.cos(t * Math.PI * 2.5) * Math.exp(-t * 5.5);

type Kdo = Majitel | "hrac";

interface Miska {
  kdo: Kdo;
  obal: SVGGElement;
  telo: SVGGElement;
  otoc: SVGGElement;
  bok: SVGGElement;
  dno: SVGGElement;
  zastin: SVGGElement;
  stin: SVGEllipseElement;
  x: number;
  /** Posun dopředu (+) nebo dozadu (−) po hloubce police */
  hloubka: number;
  zdvih: number;
  meritko: number;
  /** 0 = stojí, 1 = dnem k divákovi */
  otoceni: number;
  tma: number;
  viditelnost: number;
}

interface Triska {
  el: SVGGElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  vr: number;
  vek: number;
}

interface Animace {
  od: number;
  doba: number;
  krok: (t: number) => void;
  hotovo: () => void;
}

export const jmeno: Uroven = (p) => {
  const koren = p.koren;
  const vychozi = puvodni.get(koren);
  if (vychozi === undefined) puvodni.set(koren, koren.innerHTML);
  else koren.innerHTML = vychozi;

  const $ = <T extends Element>(s: string) => koren.querySelector<T>(s)!;
  const $$ = <T extends Element>(s: string) => [...koren.querySelectorAll<T>(s)];

  const kamera = $<SVGGElement>(".mj6-kamera");
  const celoPecet = $<SVGGElement>(".mj6-celo-pecet");
  const navrhEl = $<SVGGElement>(".mj6-navrh");
  const podpisEl = $<SVGTextElement>(".mj6-podpis");
  const otiskEl = $<SVGGElement>(".mj6-otisk");
  const ramecek = $<SVGRectElement>(".mj6-ramecek");
  const ramecekPopis = $<SVGTextElement>(".mj6-ramecek-popis");
  const kamenG = $<SVGGElement>(".mj6-kamen");
  const kamenStin = $<SVGRectElement>(".mj6-kamen-stin");
  const kamenCelo = $<SVGGElement>(".mj6-kamen-celo");
  const kamenHlava = $<SVGGElement>(".mj6-kamen-hlava");
  const dulek = $<SVGRectElement>(".mj6-pasta-dulek");
  const drahy = $$<SVGPathElement>(".mj6-rez-draha");
  const rydloG = $<SVGGElement>(".mj6-rydlo");
  const rydloStin = $<SVGPathElement>(".mj6-rydlo-stin");
  const triskyG = $<SVGGElement>(".mj6-trisky");
  const miskyG = $<SVGGElement>(".mj6-misky");
  const popiskyG = $<SVGGElement>(".mj6-popisky");
  const jiskryG = $<SVGGElement>(".mj6-jiskry");
  const provaz = $<SVGPathElement>(".mj6-provaz");
  const krouzek = $<SVGCircleElement>(".mj6-krouzek");
  const cedulka = $<HTMLElement>(".mj6-cedulka");
  const napis = $<SVGTextElement>(".mj6-cedulka-napis text");
  const mistaEl = $<HTMLElement>(".mj6-mista");
  const formular = $<HTMLFormElement>(".mj6-formular");
  const sada = $<HTMLFieldSetElement>(".mj6-sada");
  const inJmeno = $<HTMLInputElement>(".mj6-jmeno");
  const inZnaky = $<HTMLInputElement>(".mj6-znaky");
  const btTvary = $$<HTMLButtonElement>("[data-tvar]");
  const btStyly = $$<HTMLButtonElement>("[data-styl]");
  const btPonechat = $<HTMLButtonElement>(".mj6-ponechat");
  const kolaEl = $<HTMLElement>(".mj6-kola");
  const zetony = $$<HTMLElement>(".mj6-zeton");
  const stavEl = $<HTMLElement>(".mj6-stav");

  const ac = new AbortController();
  const signal = ac.signal;

  type Faze = "uvod" | "pecet" | "ryti" | "prechod" | "kolo" | "vyber" | "konec";
  let faze: Faze = "uvod";
  let spusteno = false;
  let zastaveno = false;
  let skonceno = false;
  /** Hraje se z klávesnice? (poslední vstup byla klávesa) — podle toho se posouvá fokus */
  let klavesnice = false;

  /* ═════════════ Herní čas a animace ═════════════ */

  let cas = 0;
  let posledni = 0;
  let snimek = 0;
  const animace: Animace[] = [];
  const cekani: { kdy: number; hotovo: () => void }[] = [];

  const tik = (ted: number) => {
    if (zastaveno) return;
    /* Další snímek se objedná hned — kdyby něco níž spadlo, smyčka nesmí tiše umřít */
    snimek = requestAnimationFrame(tik);
    const dt = posledni ? omez(ted - posledni, 0, 50) : 16.7;
    posledni = ted;
    cas += dt;
    try {
      for (const a of [...animace]) {
        const t = omez((cas - a.od) / a.doba);
        a.krok(t);
        if (t >= 1) {
          animace.splice(animace.indexOf(a), 1);
          a.hotovo();
        }
      }
      for (const c of [...cekani]) {
        if (cas >= c.kdy) {
          cekani.splice(cekani.indexOf(c), 1);
          c.hotovo();
        }
      }
      priSnimku(dt);
    } catch (e) {
      console.error(e);
      dokonci();
    }
  };

  /** Animace po dobu `doba` ms: krok(t) dostává 0–1. Po stop() se slib nesplní. */
  const anim = async (doba: number, krok: (t: number) => void) => {
    if (doba <= 1) krok(1);
    else await new Promise<void>((hotovo) => animace.push({ od: cas, doba, krok, hotovo }));
    if (zastaveno) throw PRERUSENO;
  };
  const pockej = async (ms: number) => {
    await new Promise<void>((hotovo) => cekani.push({ kdy: cas + ms, hotovo }));
    if (zastaveno) throw PRERUSENO;
  };
  /** Animace, na kterou se nečeká */
  const soubezne = (pr: Promise<void>) => {
    pr.catch(() => {});
  };
  /** Děj běží asynchronně; přerušení po stop() se spolkne, chyba hru ukončí, ať hráč nezůstane viset */
  const behej = (fn: () => Promise<void>) => {
    fn().catch((e: unknown) => {
      if (e === PRERUSENO || zastaveno) return;
      console.error(e);
      dokonci();
    });
  };

  /* ═════════════ Řeč ═════════════ */

  let posledniRec = -1e9;
  const rekni = (text: string, vzdy = false) => {
    if (!vzdy && cas - posledniRec < 3200) return;
    posledniRec = cas;
    p.rekni(text, cedulka);
  };
  const stav = (text: string) => {
    stavEl.textContent = text;
  };

  /* ═════════════ Cedulka ═════════════ */

  const ced = { x: CEDULKA_STUL.x, y: CEDULKA_STUL.y, uhel: CEDULKA_STUL.uhel, meritko: CEDULKA_STUL.meritko, visi: false };
  let cedCil = VIEW_W / 2 - CEDULKA_W / 2;
  let cedRychlost = 0;
  let cedKyv = 0;
  let cedSkok = 0;

  const kresliCedulku = () => {
    const kyv = ced.visi && !p.klid ? Math.sin(cas * 0.0021) * 2.2 - cedRychlost * 0.012 + cedKyv : 0;
    const y = ced.y + cedSkok;
    cedulka.style.transform = `translate(${f((ced.x / CEDULKA_W) * 100)}%, ${f((y / CEDULKA_W) * 100)}%) rotate(${f(ced.uhel + kyv)}deg) scale(${f3(ced.meritko)})`;
    if (ced.visi) {
      const cx = ced.x + CEDULKA_W / 2;
      provaz.setAttribute("d", `M${f(cx)} ${TRAM_Y - 3} V${f(y + 17)}`);
      krouzek.setAttribute("cx", f(cx));
    }
  };

  const jmenoNaCedulku = () => {
    const c = naCedulku(inJmeno.value);
    napis.textContent = c.text;
    napis.setAttribute("font-size", String(c.velikost));
    cedulka.classList.toggle("ma-jmeno", c.text !== "");
  };

  /* ═════════════ Snímek: Cedulka, třísky, jiskry, nápověda ═════════════ */

  const trisky: Triska[] = [];
  const jiskry: { el: SVGGElement; x: number; y: number; vx: number; vy: number; vek: number }[] = [];
  let vyberOd = 0;
  let napovezeno = false;

  function priSnimku(dt: number) {
    const s = dt / 1000;
    if (ced.visi) {
      const pred = ced.x;
      ced.x = p.klid ? cedCil : mix(ced.x, cedCil, 1 - Math.exp(-s * 9));
      cedRychlost = mix(cedRychlost, (ced.x - pred) / Math.max(s, 0.001), 0.2);
      cedKyv *= Math.exp(-s * 4);
      kresliCedulku();
    }
    for (const t of [...trisky]) {
      t.vek += dt;
      const brzda = Math.exp(-s * 7);
      t.vx *= brzda;
      t.vy *= brzda;
      t.vr *= brzda;
      t.x += t.vx * s;
      t.y += t.vy * s;
      t.r += t.vr * s;
      t.el.setAttribute("transform", `translate(${f(t.x)} ${f(t.y)}) rotate(${f(t.r)})`);
      if (t.vek > 900) t.el.setAttribute("opacity", f3(omez(1 - (t.vek - 900) / 700)));
      if (t.vek > 1600) {
        t.el.remove();
        trisky.splice(trisky.indexOf(t), 1);
      }
    }
    for (const j of [...jiskry]) {
      j.vek += dt;
      j.x += j.vx * s;
      j.y += j.vy * s;
      j.vy += 120 * s;
      const t = j.vek / 900;
      j.el.setAttribute("transform", `translate(${f(j.x)} ${f(j.y)}) scale(${f3(0.6 + Math.sin(Math.PI * omez(t)) * 0.8)}) rotate(${f(j.vek * 0.2)})`);
      j.el.setAttribute("opacity", f3(omez(1.4 - t * 1.4)));
      if (t >= 1) {
        j.el.remove();
        jiskry.splice(jiskry.indexOf(j), 1);
      }
    }
    if (faze === "vyber" && !napovezeno && cas - vyberOd > 12000) {
      napovezeno = true;
      rekni("Tak co? Já to vím.");
    }
  }

  /* ═════════════ A: Pečeť ═════════════ */

  const ulozena = nactiPecet();
  const ulozeneJmeno = nactiJmeno();
  const zacatek = ulozena ?? vychoziPecet(ulozeneJmeno);
  let tvar: TvarPeceti = zacatek.tvar;
  let styl: StylPeceti = zacatek.styl;
  let pecet: Pecet = { ...zacatek };
  /** Znaky psané ručně — pak už je jméno nepřepisuje */
  let znakyRucne = !!ulozena && ulozena.znaky !== inicialy(ulozeneJmeno);
  inJmeno.value = ulozeneJmeno;
  inZnaky.value = zacatek.znaky;
  btPonechat.hidden = !ulozena;

  const znakyTed = () => cistaZnaky(inZnaky.value) || inicialy(inJmeno.value) || vychoziPecet().znaky;

  const prekresliPecet = () => {
    pecet = { znaky: znakyTed(), tvar, styl };
    celoPecet.innerHTML = celoKamene(pecet);
    navrhEl.innerHTML = navrh(pecet);
    btTvary.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tvar === tvar)));
    btStyly.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.styl === styl)));
  };
  const prekresliJmeno = () => {
    const pod = podpis(inJmeno.value);
    podpisEl.textContent = pod.text;
    podpisEl.setAttribute("font-size", String(pod.velikost));
    jmenoNaCedulku();
  };

  inJmeno.addEventListener(
    "input",
    () => {
      if (faze !== "pecet") return;
      if (!znakyRucne) inZnaky.value = inicialy(inJmeno.value);
      prekresliJmeno();
      prekresliPecet();
    },
    { signal },
  );
  const upravZnaky = () => {
    if (faze !== "pecet") return;
    const cista = cistaZnaky(inZnaky.value);
    if (inZnaky.value !== cista) inZnaky.value = cista;
    znakyRucne = cista !== "" && cista !== inicialy(inJmeno.value);
    prekresliPecet();
  };
  inZnaky.addEventListener(
    "input",
    (e) => {
      if ((e as InputEvent).isComposing) return;
      upravZnaky();
    },
    { signal },
  );
  inZnaky.addEventListener("compositionend", upravZnaky, { signal });

  btTvary.forEach((b) =>
    b.addEventListener(
      "click",
      () => {
        const t = b.dataset.tvar;
        if (faze !== "pecet" || !t || !(t in tvaryPeceti)) return;
        tvar = t as TvarPeceti;
        zvuk.drevo(1.5);
        prekresliPecet();
      },
      { signal },
    ),
  );
  btStyly.forEach((b) =>
    b.addEventListener(
      "click",
      () => {
        const s = b.dataset.styl;
        if (faze !== "pecet" || !s || !(s in stylyPeceti)) return;
        styl = s as StylPeceti;
        zvuk.drevo(1.3);
        prekresliPecet();
      },
      { signal },
    ),
  );
  formular.addEventListener(
    "submit",
    (e) => {
      e.preventDefault();
      if (faze === "pecet") behej(() => vyryt(false));
    },
    { signal },
  );
  btPonechat.addEventListener(
    "click",
    () => {
      if (faze === "pecet" && ulozena) behej(() => vyryt(true));
    },
    { signal },
  );

  /* ——— Rydlo ——— */

  const polozRydlo = (x: number, y: number, uhel: number, zdvih = 0) => {
    rydloG.setAttribute("transform", `translate(${f(x)} ${f(y)}) rotate(${f(uhel)})`);
    rydloStin.setAttribute("transform", `translate(${f(5 + zdvih * 9)} ${f(9 + zdvih * 12)})`);
  };

  const pridejTrisku = (x: number, y: number) => {
    const g = document.createElementNS(SVGNS, "g");
    g.innerHTML = trisk(Math.random);
    triskyG.append(g);
    /* Třísky odletují od ostří, tedy nahoru doleva, s rozptylem */
    const u = Math.PI + (UHEL_RYTI * Math.PI) / 180 + (Math.random() - 0.5) * 2.4;
    const v = 70 + Math.random() * 130;
    trisky.push({ el: g, x, y, vx: Math.cos(u) * v, vy: Math.sin(u) * v, r: Math.random() * 360, vr: (Math.random() - 0.5) * 900, vek: 0 });
  };

  /** Bod na lomené čáře ve vzdálenosti s od začátku */
  const naDraze = (body: [number, number][], delky: number[], s: number): [number, number] => {
    let i = 1;
    while (i < body.length - 1 && delky[i] < s) i++;
    const l0 = delky[i - 1];
    const t = omez((s - l0) / Math.max(1e-6, delky[i] - l0));
    return [mix(body[i - 1][0], body[i][0], t), mix(body[i - 1][1], body[i][1], t)];
  };

  const vyrytoEl = () => celoPecet.querySelector<SVGGElement>(".mj6-vyryto")!;
  const nacrtEl = () => celoPecet.querySelector<SVGGElement>(".mj6-nacrt")!;
  const inkoustEl = () => celoPecet.querySelector<SVGGElement>(".mj6-inkoust")!;

  /** Rydlo projede dráhu a za ním zůstávají jamky; třísky odletují */
  async function ryti() {
    const { body, sirka } = drahaRyti(pecet);
    const delky = [0];
    for (let i = 1; i < body.length; i++) delky.push(delky[i - 1] + Math.hypot(body[i][0] - body[i - 1][0], body[i][1] - body[i - 1][1]));
    const L = delky[delky.length - 1];
    const d = "M" + body.map((b) => `${f(b[0])} ${f(b[1])}`).join(" L");
    for (const dr of drahy) {
      dr.setAttribute("d", d);
      dr.setAttribute("stroke-width", f(sirka));
      dr.setAttribute("stroke-dasharray", `${f(L + 2)} ${f(L + 20)}`);
      dr.setAttribute("stroke-dashoffset", f(L + 2));
    }
    const [x0, y0] = body[0];
    await anim(p.klid ? 0 : 440, (t) => {
      const e = sinus(t);
      polozRydlo(mix(RYDLO_KLID.x, x0, e), mix(RYDLO_KLID.y, y0, e), mix(RYDLO_KLID.uhel, UHEL_RYTI, e), Math.sin(Math.PI * t));
    });
    const doba = p.klid ? 1200 : omez(L * 1.6, 2600, 3600);
    let dalsiTriska = 0;
    let dalsiZvuk = 0;
    const osa = (UHEL_RYTI * Math.PI) / 180;
    await anim(doba, (t) => {
      const s = L * t;
      const [x, y] = naDraze(body, delky, s);
      for (const dr of drahy) dr.setAttribute("stroke-dashoffset", f(L + 2 - s));
      /* Rydlo se při rytí krátce posouvá tam a zpátky po své ose */
      const j = p.klid ? 0 : Math.sin(cas * 0.07) * 2.4;
      polozRydlo(x + Math.cos(osa) * j, y + Math.sin(osa) * j, UHEL_RYTI + (p.klid ? 0 : Math.sin(cas * 0.011) * 3));
      if (!p.klid && cas >= dalsiTriska) {
        pridejTrisku(x, y);
        dalsiTriska = cas + 45 + Math.random() * 70;
      }
      if (cas >= dalsiZvuk) {
        zvuk.sumik(0.05, 2600 + Math.random() * 1600, 2.4, 0.06);
        if (Math.random() < 0.3) zvuk.ton(3600, 2700, 0.03, "triangle", 0.02);
        dalsiZvuk = cas + 75 + Math.random() * 55;
      }
    });
    hotoveRyti();
    await anim(p.klid ? 0 : 380, (t) => {
      const e = sinus(t);
      const [x1, y1] = body[body.length - 1];
      polozRydlo(mix(x1, RYDLO_KLID.x, e), mix(y1, RYDLO_KLID.y, e), mix(UHEL_RYTI, RYDLO_KLID.uhel, e), Math.sin(Math.PI * t));
    });
    zvuk.drevo(1.8);
  }

  /** Čelo je celé vyryté: jamky bez masky, náčrt pryč */
  const hotoveRyti = () => {
    vyrytoEl().removeAttribute("mask");
    nacrtEl().setAttribute("display", "none");
  };

  /* ——— Kámen: zvednout, otočit, namočit, otisknout ——— */

  const kam = { dx: 0, dy: 0, s: 1, u: 0, fy: 1, zdvih: 0 };
  const kresliKamen = () => {
    const S = KAMEN_STRED;
    kamenG.setAttribute("transform", `translate(${f(S.x + kam.dx)} ${f(S.y + kam.dy)}) rotate(${f(kam.u)}) scale(${f3(kam.s)} ${f3(kam.s * Math.max(0.02, kam.fy))}) translate(${-S.x} ${-S.y})`);
    kamenStin.setAttribute(
      "transform",
      `translate(${f(S.x + kam.dx + 8 + kam.zdvih * 22)} ${f(S.y + kam.dy + 10 + kam.zdvih * 30)}) rotate(${f(kam.u)}) scale(${f3(kam.s)}) translate(${-S.x} ${-S.y})`,
    );
    kamenStin.setAttribute("opacity", f3(0.4 - kam.zdvih * 0.18));
  };
  /** Otočí kámen čelem dolů (hlava nahoru) nebo zpátky — přes „hranu“ */
  const otocKamen = async (hlavou: boolean) => {
    await anim(170, (t) => {
      kam.fy = 1 - sinus(t);
      kresliKamen();
    });
    if (hlavou) {
      kamenCelo.setAttribute("display", "none");
      kamenHlava.removeAttribute("display");
    } else {
      kamenCelo.removeAttribute("display");
      kamenHlava.setAttribute("display", "none");
    }
    await anim(170, (t) => {
      kam.fy = sinus(t);
      kresliKamen();
    });
  };
  /** Přesun kamene obloukem nad stolem */
  const presunKamen = (dx: number, dy: number, u: number, doba: number) => {
    const z = { dx: kam.dx, dy: kam.dy, u: kam.u };
    return anim(doba, (t) => {
      const e = sinus(t);
      kam.dx = mix(z.dx, dx, e);
      kam.dy = mix(z.dy, dy, e) - Math.sin(Math.PI * e) * 26;
      kam.u = mix(z.u, u, e);
      kresliKamen();
    });
  };

  const ukazOtisk = () => {
    otiskEl.innerHTML = otisk(pecet);
    otiskEl.setAttribute("opacity", "0.95");
    ramecek.setAttribute("opacity", "0");
    ramecekPopis.setAttribute("opacity", "0");
  };

  async function otiskni(rychle: boolean) {
    if (p.klid) {
      zvuk.razitko();
      otiskEl.innerHTML = otisk(pecet);
      await anim(260, (t) => {
        inkoustEl().setAttribute("opacity", f3(0.92 * t));
        otiskEl.setAttribute("opacity", f3(0.95 * t));
      });
      ukazOtisk();
      return;
    }
    const S = KAMEN_STRED;
    const stredCela = { x: KAMEN.x + KAMEN.s / 2, y: KAMEN.y + KAMEN.s / 2 };
    /* zvednout ze svěráku */
    await anim(rychle ? 260 : 360, (t) => {
      const e = sinus(t);
      kam.s = 1 + 0.08 * e;
      kam.zdvih = e;
      kam.dy = -10 * e;
      kresliKamen();
    });
    zvuk.sumik(0.18, 1200, 0.8, 0.05);
    await otocKamen(true);
    /* do rumělky */
    await presunKamen(DOZA.x - S.x, DOZA.y - S.y + 12, -6, rychle ? 420 : 540);
    for (let i = 0; i < (rychle ? 1 : 2); i++) {
      await anim(210, (t) => {
        const dolu = Math.sin(Math.PI * t);
        kam.s = 1.08 - 0.1 * dolu;
        kam.zdvih = 1 - 0.85 * dolu;
        kresliKamen();
        if (t >= 0.5 && dulek.getAttribute("data-tuk") !== String(i)) {
          dulek.setAttribute("data-tuk", String(i));
          dulek.setAttribute("opacity", f3(0.22 + 0.12 * i));
          zvuk.hnet();
        }
      });
    }
    /* na list */
    await presunKamen(OTISK.x - stredCela.x, OTISK.y - stredCela.y, OTISK.uhel, rychle ? 520 : 640);
    await anim(170, (t) => {
      const e = t * t;
      kam.s = mix(1.08, 0.9, e);
      kam.zdvih = 1 - e;
      kresliKamen();
    });
    zvuk.razitko();
    ukazOtisk();
    inkoustEl().setAttribute("opacity", "0.92");
    /* pečetí se při otisku trochu zakolébá */
    await anim(260, (t) => {
      kam.u = OTISK.uhel + Math.sin(Math.PI * 2 * t) * 2.6;
      kresliKamen();
    });
    await anim(220, (t) => {
      const e = sinus(t);
      kam.s = mix(0.9, 1.08, e);
      kam.zdvih = e;
      kresliKamen();
    });
    await presunKamen(0, -10, 0, rychle ? 520 : 640);
    await otocKamen(false);
    await anim(300, (t) => {
      const e = sinus(t);
      kam.s = mix(1.08, 1, e);
      kam.zdvih = 1 - e;
      kam.dy = -10 * (1 - e);
      kresliKamen();
    });
    zvuk.drevo(0.9);
  }

  /** Kdo hraje z klávesnice, nemá po zakázání formuláře ztratit fokus — přejde na police */
  const fokusDoSceny = () => {
    if (klavesnice) mistaEl.focus({ preventScroll: true });
  };

  async function vyryt(ponechat: boolean) {
    faze = "ryti";
    if (ponechat && ulozena) {
      tvar = ulozena.tvar;
      styl = ulozena.styl;
      inZnaky.value = ulozena.znaky;
      prekresliPecet();
    } else {
      prekresliPecet();
      inZnaky.value = pecet.znaky;
    }
    const jm = inJmeno.value.trim().slice(0, 40);
    if (jm !== ulozeneJmeno) ulozJmeno(jm);
    /* Pečeť patří hráči hned — i kdyby kola potom nevyšla */
    ulozPecet(pecet);
    prekresliJmeno();
    sada.disabled = true;
    fokusDoSceny();
    zvuk.cink();

    if (ponechat) {
      hotoveRyti();
      const v = vyrytoEl();
      await anim(p.klid ? 0 : 320, (t) => v.setAttribute("opacity", f3(t)));
      v.removeAttribute("opacity");
    } else await ryti();
    await pockej(p.klid ? 100 : 260);
    await otiskni(ponechat);
    rekni(ponechat ? "Stará známá. Pořád ti sedí." : "Tak. Teď tě poznám i po výpalu.", true);
    p.zprava("Pečeť je tvoje — podepíšeš se jí i na mistrovský list.");
    await pockej(p.klid ? 900 : 1500);
    await naPolici();
    for (let i = 0; i < KOLA.length; i++) await hrajKolo(i);
    await pockej(700);
    dokonci();
  }

  /* ═════════════ B: Čí je která ═════════════ */

  let misky: Miska[] = [];
  let naMiste: Miska[] = [];
  let mista: number[] = [];
  const vysledky: boolean[] = [];
  let cekaVyber: ((i: number) => void) | null = null;

  const kresliMisku = (m: Miska) => {
    const s = MISKA_MERITKO * m.meritko;
    m.telo.setAttribute("transform", `translate(${f(m.x)} ${f(POLICE_Y + m.hloubka - m.zdvih)}) scale(${f3(s)})`);
    const fy = Math.abs(Math.cos(m.otoceni * Math.PI));
    m.otoc.setAttribute("transform", fy > 0.999 ? "" : `translate(0 ${MISKA_STRED}) scale(1 ${f3(Math.max(0.02, fy))}) translate(0 ${-MISKA_STRED})`);
    const dnem = m.otoceni >= 0.5;
    if (dnem) {
      m.bok.setAttribute("display", "none");
      m.dno.removeAttribute("display");
    } else {
      m.bok.removeAttribute("display");
      m.dno.setAttribute("display", "none");
    }
    const vys = omez(m.zdvih / 160);
    m.stin.setAttribute("cx", f(m.x));
    m.stin.setAttribute("cy", f(POLICE_Y + 2 + m.hloubka * 0.9));
    m.stin.setAttribute("rx", f(50 * s * (1 - 0.4 * vys)));
    m.stin.setAttribute("ry", f(8 * s * (1 - 0.4 * vys)));
    m.stin.setAttribute("opacity", f3(m.viditelnost * (1 - 0.7 * vys)));
    m.zastin.setAttribute("opacity", f3(m.tma * 0.34));
    if (m.viditelnost < 1) m.obal.setAttribute("opacity", f3(m.viditelnost));
    else m.obal.removeAttribute("opacity");
  };

  const postavMista = () => {
    mistaEl.textContent = "";
    const sirka = Math.min(mista.length > 1 ? mista[1] - mista[0] - 6 : 170, 170);
    mista.forEach((x, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "mj6-misto";
      b.dataset.i = String(i);
      b.setAttribute("aria-label", `Miska ${i + 1} z ${mista.length}, zleva`);
      b.setAttribute("aria-disabled", "true");
      b.tabIndex = i === Math.floor(mista.length / 2) ? 0 : -1;
      b.style.left = `${f3(((x - sirka / 2) / VIEW_W) * 100)}%`;
      b.style.top = `${f3((292 / VIEW_H) * 100)}%`;
      b.style.width = `${f3((sirka / VIEW_W) * 100)}%`;
      b.style.height = `${f3((214 / VIEW_H) * 100)}%`;
      mistaEl.append(b);
    });
  };

  const postavMisky = (kdo: Kdo[], pec: Pecet) => {
    miskyG.textContent = "";
    popiskyG.textContent = "";
    mista = mistaMisek(kdo.length);
    misky = kdo.map((k, i) => {
      miskyG.insertAdjacentHTML("beforeend", miskaSvg(k === "hrac" ? pecetDoDna(pec) : ZNACKY[k]));
      const obal = miskyG.lastElementChild as SVGGElement;
      const q = <T extends Element>(s: string) => obal.querySelector<T>(s)!;
      const m: Miska = {
        kdo: k,
        obal,
        telo: q<SVGGElement>(".mj6-miska"),
        otoc: q<SVGGElement>(".mj6-otoc"),
        bok: q<SVGGElement>(".mj6-bok"),
        dno: q<SVGGElement>(".mj6-dno"),
        zastin: q<SVGGElement>(".mj6-zastin"),
        stin: q<SVGEllipseElement>(".mj6-miska-stin"),
        x: mista[i],
        hloubka: 0,
        zdvih: 0,
        meritko: 1,
        otoceni: 0,
        tma: 0,
        viditelnost: 1,
      };
      kresliMisku(m);
      return m;
    });
    naMiste = [...misky];
    postavMista();
  };

  const zamichane = <T>(a: T[]) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  /** Kdo má misku v kole: tvoje na místě `start`, ostatní náhodně z party */
  const majitele = (n: number, start: number): Kdo[] => {
    const ostatni = zamichane([...MAJITELE]).slice(0, n - 1);
    const kdo: Kdo[] = [];
    for (let i = 0, o = 0; i < n; i++) kdo.push(i === start ? "hrac" : ostatni[o++]);
    return kdo;
  };

  const doPopredi = (m: Miska) => miskyG.append(m.obal);

  const ukazPopisek = (m: Miska, text: string, tvoje: boolean) => {
    popiskyG.innerHTML = popisek(m.x, POLICE_Y - 52, text, "middle", tvoje ? "#C4432B" : "#2B2420");
  };
  const skryjPopisek = () => {
    popiskyG.textContent = "";
  };

  const zvedni = async (m: Miska) => {
    doPopredi(m);
    zvuk.ton(1250, 1500, 0.09, "triangle", 0.035);
    await anim(p.klid ? 240 : 380, (t) => {
      const e = sinus(t);
      m.zdvih = ZDVIH * e;
      m.meritko = 1 + (ZVETSENI - 1) * e;
      m.otoceni = omez((t - 0.25) / 0.75);
      kresliMisku(m);
    });
  };
  const poloz = async (m: Miska) => {
    await anim(p.klid ? 220 : 340, (t) => {
      const e = sinus(t);
      m.otoceni = omez(1 - t / 0.6);
      m.zdvih = ZDVIH * (1 - e);
      m.meritko = 1 + (ZVETSENI - 1) * (1 - e);
      kresliMisku(m);
    });
    zvuk.ton(900, 760, 0.07, "triangle", 0.05);
  };

  /** Cedulka zvedne misky jednu po druhé a ukáže dna */
  async function ukazDna() {
    for (let j = 0; j < naMiste.length; j++) {
      const m = naMiste[j];
      cedCil = m.x - CEDULKA_W / 2;
      const tvoje = m.kdo === "hrac";
      await zvedni(m);
      ukazPopisek(m, tvoje ? "tvoje" : JMENA[m.kdo as Majitel], tvoje);
      if (tvoje) zvuk.cink();
      await pockej(tvoje ? 850 : 520);
      skryjPopisek();
      const dolu = poloz(m);
      if (j < naMiste.length - 1) {
        soubezne(dolu);
        await pockej(p.klid ? 240 : 230);
      } else await dolu;
    }
    cedCil = VIEW_W / 2 - CEDULKA_W / 2;
  }

  /**
   * Jedna záměna: miska vpředu jede dolů a roste, miska vzadu nahoru, zmenší
   * se a ztmavne. Skok ob misku míjí stojící misku uprostřed — oblouky jsou
   * pak hlubší, ať je i tam vidět, která jede před a která za ní.
   */
  async function tah(t: Tah) {
    const A = naMiste[t.a];
    const B = naMiste[t.b];
    const predniA = Math.random() < 0.5;
    const P = predniA ? A : B;
    const Z = predniA ? B : A;
    miskyG.prepend(Z.obal);
    miskyG.append(P.obal);
    const xa = mista[t.a];
    const xb = mista[t.b];
    cedCil = (xa + xb) / 2 - CEDULKA_W / 2;
    if (!p.klid) cedKyv += xb > xa ? -3 : 3;
    const ob1 = Math.abs(t.a - t.b) > 1;
    const vpred = ob1 ? 28 : 18;
    const vzad = ob1 ? 42 : 24;
    zvuk.sumik(Math.min(0.3, t.doba / 1000), 900, 0.7, 0.035);
    await anim(t.doba, (u) => {
      const e = t.klam ? (u < 0.5 ? sinus(u * 2) : 1 - sinus((u - 0.5) * 2)) * 0.42 : sinus(u);
      const ob = Math.sin(Math.PI * e);
      A.x = mix(xa, xb, e);
      B.x = mix(xb, xa, e);
      P.hloubka = vpred * ob;
      P.meritko = 1 + (ob1 ? 0.18 : 0.13) * ob;
      Z.hloubka = -vzad * ob;
      Z.meritko = 1 - (ob1 ? 0.16 : 0.12) * ob;
      Z.tma = ob;
      P.tma = 0;
      kresliMisku(A);
      kresliMisku(B);
    });
    for (const m of [A, B]) {
      m.hloubka = 0;
      m.meritko = 1;
      m.tma = 0;
      kresliMisku(m);
    }
    if (!t.klam) {
      naMiste[t.a] = B;
      naMiste[t.b] = A;
    }
    zvuk.ton(1700 + Math.random() * 500, 1500, 0.05, "triangle", 0.03);
  }

  const tlacitka = () => [...mistaEl.querySelectorAll<HTMLButtonElement>(".mj6-misto")];

  /** Hráč vybírá: tlačítka nad miskami ožijí, slib se splní indexem místa */
  const vyber = () =>
    new Promise<number>((hotovo) => {
      faze = "vyber";
      vyberOd = cas;
      napovezeno = false;
      mistaEl.classList.add("vyber");
      const tl = tlacitka();
      tl.forEach((b) => b.setAttribute("aria-disabled", "false"));
      stav("Která je tvoje? Klikni na ni — nebo šipky a Enter.");
      p.zprava("Která je tvoje?");
      if (klavesnice) {
        const i = tl.findIndex((b) => b.tabIndex === 0);
        tl[Math.max(0, i)]?.focus({ preventScroll: true });
      }
      cekaVyber = hotovo;
    });

  const vybrano = (i: number) => {
    if (faze !== "vyber" || !cekaVyber || !(i >= 0 && i < naMiste.length)) return;
    faze = "kolo";
    mistaEl.classList.remove("vyber");
    tlacitka().forEach((b) => b.setAttribute("aria-disabled", "true"));
    const hotovo = cekaVyber;
    cekaVyber = null;
    hotovo(i);
  };

  mistaEl.addEventListener(
    "click",
    (e) => {
      const b = (e.target as Element).closest<HTMLButtonElement>(".mj6-misto");
      if (b) vybrano(Number(b.dataset.i));
    },
    { signal },
  );
  mistaEl.addEventListener(
    "keydown",
    (e) => {
      const tl = tlacitka();
      if (!tl.length) return;
      const i = tl.indexOf(document.activeElement as HTMLButtonElement);
      let j = -1;
      if (e.key === "ArrowLeft") j = i <= 0 ? tl.length - 1 : i - 1;
      else if (e.key === "ArrowRight") j = i < 0 || i >= tl.length - 1 ? 0 : i + 1;
      else if (e.key === "Home") j = 0;
      else if (e.key === "End") j = tl.length - 1;
      if (j < 0) return;
      e.preventDefault();
      tl.forEach((b, x) => (b.tabIndex = x === j ? 0 : -1));
      tl[j].focus({ preventScroll: true });
    },
    { signal },
  );
  koren.addEventListener("keydown", () => (klavesnice = true), { signal, capture: true });
  koren.addEventListener("pointerdown", () => (klavesnice = false), { signal, capture: true });

  const pridejJiskry = (m: Miska) => {
    const cy = POLICE_Y - ZDVIH + MISKA_STRED * MISKA_MERITKO * ZVETSENI;
    for (let i = 0; i < 9; i++) {
      const g = document.createElementNS(SVGNS, "g");
      g.innerHTML = jiskra();
      jiskryG.append(g);
      const u = (i / 9) * Math.PI * 2 + Math.random() * 0.5;
      const v = 140 + Math.random() * 90;
      jiskry.push({ el: g, x: m.x + Math.cos(u) * 70, y: cy + Math.sin(u) * 70, vx: Math.cos(u) * v, vy: Math.sin(u) * v - 40, vek: 0 });
    }
  };
  const cedulkaRadost = () => {
    if (p.klid) return;
    soubezne(
      anim(700, (t) => {
        cedSkok = -16 * Math.sin(Math.PI * Math.min(1, t * 1.6)) * (t < 0.62 ? 1 : 0);
        cedKyv = Math.sin(t * Math.PI * 4) * 5 * (1 - t);
      }),
    );
  };
  const cedulkaVrti = () => {
    if (p.klid) return;
    soubezne(
      anim(650, (t) => {
        cedKyv = Math.sin(t * Math.PI * 6) * 9 * (1 - t);
      }),
    );
  };

  const oznacZeton = (i: number, ano: boolean, kdo: Kdo) => {
    const z = zetony[i];
    if (!z) return;
    z.dataset.stav = ano ? "ano" : "ne";
    const kresba = z.querySelector<HTMLElement>(".mj6-zeton-kresba");
    if (kresba) kresba.innerHTML = ano || kdo === "hrac" ? pecetSvg(pecet, { id: `mj6-pz${i}`, textura: false }) : `<svg viewBox="-20 -20 40 40" aria-hidden="true">${ZNACKY[kdo]}</svg>`;
    z.setAttribute("aria-label", `Kolo ${i + 1}: ${ano ? "poznáno" : "vedle"}`);
  };

  /** První kolo se chystá už před přejezdem kamery — misky stojí na polici, když se k ní dojede */
  let pripravene: Kolo | null = null;

  /** Kamera přejede ze stolu nahoru k polici, Cedulka sjede po provázku z trámu */
  async function naPolici() {
    faze = "prechod";
    pripravene = noveKolo(KOLA[0]);
    postavMisky(majitele(KOLA[0].misek, pripravene.start), pecet);
    formular.hidden = true;
    kolaEl.hidden = false;
    stav("");
    if (p.klid) {
      kamera.setAttribute("transform", `translate(0 ${VIEW_H})`);
    } else {
      zvuk.sumik(0.7, 520, 0.5, 0.05);
      await anim(1150, (t) => {
        const e = sinus(t);
        kamera.setAttribute("transform", `translate(0 ${f(VIEW_H * e)})`);
        ced.y = CEDULKA_STUL.y + VIEW_H * e;
        kresliCedulku();
      });
    }
    ced.visi = true;
    ced.x = cedCil = VIEW_W / 2 - CEDULKA_W / 2;
    ced.uhel = 0;
    ced.meritko = 1;
    ced.y = p.klid ? CEDULKA_Y : -170;
    provaz.setAttribute("opacity", "1");
    krouzek.setAttribute("opacity", "1");
    kresliCedulku();
    if (!p.klid) {
      await anim(820, (t) => {
        ced.y = mix(-170, CEDULKA_Y, pruzina(t));
        kresliCedulku();
      });
    }
    zvuk.drevo(1);
    zvuk.reakce("cedulka");
  }

  async function hrajKolo(i: number) {
    const d = KOLA[i];
    let kolo = pripravene;
    pripravene = null;
    zetony[i]?.setAttribute("data-stav", "hraje");
    p.ukazatel(`Kolo ${i + 1}/${KOLA.length}`);
    if (!kolo) {
      kolo = noveKolo(d);
      /* staré misky odejdou, nové přijdou */
      const stare = misky;
      await anim(p.klid ? 0 : 300, (t) => {
        for (const m of stare) {
          m.viditelnost = 1 - t;
          m.zdvih = 30 * t;
          kresliMisku(m);
        }
      });
      postavMisky(majitele(d.misek, kolo.start), pecet);
      if (!p.klid) {
        const nove = misky;
        for (const m of nove) {
          m.viditelnost = 0;
          kresliMisku(m);
        }
        await anim(560 + nove.length * 60, (t) => {
          nove.forEach((m, j) => {
            const u = omez((t * (560 + nove.length * 60) - j * 60) / 560);
            m.viditelnost = omez(u * 3);
            m.zdvih = 60 * (1 - pruzina(u));
            kresliMisku(m);
          });
        });
      }
      zvuk.ton(1500, 1300, 0.06, "triangle", 0.04);
    }
    stav(`Kolo ${i + 1} ze ${KOLA.length}: dívej se, která je tvoje.`);
    await pockej(250);
    await ukazDna();
    await pockej(300);
    rekni(MICHANI[i], i === 0);
    stav("Sleduj ji…");
    for (const t of kolo.tahy) {
      await tah(t);
      await pockej(d.mezera);
    }
    cedCil = VIEW_W / 2 - CEDULKA_W / 2;
    await pockej(200);
    const misto = await vyber();
    if (zastaveno) throw PRERUSENO;
    const m = naMiste[misto];
    const ok = m.kdo === "hrac";
    vysledky.push(ok);
    cedCil = m.x - CEDULKA_W / 2;
    await zvedni(m);
    if (ok) {
      zvuk.nalezeno();
      ukazPopisek(m, "tvoje!", true);
      p.zprava("Tvoje!");
      rekni(SPRAVNE[vysledky.filter(Boolean).length - 1] ?? SPRAVNE[0], true);
      stav("Tvoje! Přesně ta.");
      if (!p.klid) pridejJiskry(m);
      cedulkaRadost();
      oznacZeton(i, true, m.kdo);
      await pockej(1500);
      skryjPopisek();
      await poloz(m);
    } else {
      zvuk.ton(330, 210, 0.3, "sine", 0.1);
      const koho = KOHO[m.kdo as Majitel];
      ukazPopisek(m, JMENA[m.kdo as Majitel], false);
      rekni(`Tahle je ${koho}.`, true);
      stav(`Tahle je ${koho}. Tvoje byla…`);
      cedulkaVrti();
      oznacZeton(i, false, m.kdo);
      await pockej(1150);
      skryjPopisek();
      soubezne(poloz(m));
      await pockej(160);
      const prava = misky.find((x) => x.kdo === "hrac")!;
      cedCil = prava.x - CEDULKA_W / 2;
      await zvedni(prava);
      ukazPopisek(prava, "tvoje", true);
      zvuk.cink();
      stav("…tahle.");
      await pockej(1300);
      skryjPopisek();
      await poloz(prava);
    }
    cedCil = VIEW_W / 2 - CEDULKA_W / 2;
    await pockej(350);
  }

  /* ═════════════ Konec ═════════════ */

  function dokonci() {
    if (skonceno) return;
    skonceno = true;
    faze = "konec";
    mistaEl.classList.remove("vyber");
    cekaVyber = null;
    const k = vysledky.filter(Boolean).length;
    p.konec({
      body: BODY[k],
      proslo: k >= 1,
      veta: VETY[k],
      udaje: [
        ["Pečeť", `${pecet.znaky} · ${tvaryPeceti[pecet.tvar].toLocaleLowerCase("cs-CZ")} · ${stylyPeceti[pecet.styl].znak}`],
        ["Poznáno", `${k} ze ${KOLA.length}`],
      ],
    });
  }

  /* ═════════════ Výchozí stav ═════════════ */

  prekresliPecet();
  prekresliJmeno();
  polozRydlo(RYDLO_KLID.x, RYDLO_KLID.y, RYDLO_KLID.uhel);
  kresliCedulku();

  return {
    start() {
      if (spusteno || zastaveno) return;
      spusteno = true;
      faze = "pecet";
      p.ukazatel("Pečeť");
      rekni("Napiš se na mě. Za dva týdny mi poděkuješ.", true);
      posledni = 0;
      snimek = requestAnimationFrame(tik);
      if (window.matchMedia?.("(pointer: fine)").matches) inJmeno.focus({ preventScroll: true });
    },
    stop() {
      if (zastaveno) return;
      zastaveno = true;
      cancelAnimationFrame(snimek);
      ac.abort();
      animace.length = 0;
      cekani.length = 0;
      cekaVyber = null;
    },
  };
};
