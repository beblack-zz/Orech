/**
 * Úroveň 八 Oheň — Pálicí křivka. Hlídá Pecinka.
 *
 * Výpal ostrého ohně celý den: 11,4 hodiny podle křivky z data/kami.ts,
 * hodina trvá šest vteřin. Tlačítko Topit (nebo mezerník) se drží — pec
 * topí, puštěné tlačítko a pec chladne. Pec má setrvačnost (ohen-model.ts):
 * co se přitopí teď, ukáže pero na zapisovači až za chvíli, takže se musí
 * topit dopředu. Cíl je držet pero v zeleném pásu ±35 °C kolem křivky.
 *
 * Nehody (každá jednou a stojí body):
 *   pára     pod stovkou moc rychle, dokud je v hlíně voda — Bum
 *   křemen   kolem 573 °C moc rychle — prasklina
 *   glazura  přes 1 310 °C stéká až na Šamotku
 *   brzo     pec otevřená nad 200 °C — teplotní šok
 *
 * Po konci křivky se pec sama vypne, noc běží rychle a pec chladne.
 * Otevřít jde kdykoli (pokušení!), bezpečné je to až pod 200 °C. Pak se
 * ukážou kusy a žároměrky: ideál je první ohnutá celá, druhá do pravého
 * úhlu a třetí stojí.
 *
 * Body: 100 − max(0, průměrná odchylka − 6 °C) − pokuty (pára 15, křemen 15,
 * glazura 12, brzo 15) − 12 · chyba žároměrek (ohen-model.ts, hodnot).
 * Prošlo od 40.
 *
 * Kresba je v components/zkouska/urovne/ohen-kresba.ts, vzhled
 * v styles/zkouska-urovne/ohen.css.
 */
import type { Uroven, Vysledek } from "../hra";
import type { PostavaId } from "../../../data/parta";
import { milniky, zaromerky } from "../../../data/kami";
import * as zvuk from "../../parta2/zvuk";
import { cislo } from "../../parta2/stav";
import { kusSvg } from "../../../components/dilna/kus";
import type { Kus } from "../../../components/dilna/kus";
import type { StavKusu } from "../../../data/dilna";
import {
  barvaZaru, zhava, nebe, noc, smichej, gx, gy, zaromerkaD, SEGMENTY, SEG_ZAP, SEG_VYP, LUPA, DVIRKA, OKNO,
} from "../../../components/zkouska/urovne/ohen-kresba";
import {
  novaPec, krok as krokPece, otevri as otevriPec, hodnot, sklon, cil, sklonCile, omez, VYDRZ_ZRALA,
} from "./ohen-model";
import type { Pec, Udalost } from "./ohen-model";

const SVGNS = "http://www.w3.org/2000/svg";
const f1 = (n: number) => (Math.round(n * 10) / 10).toString();

/** Hodiny z času výpalu: h = 0 je šest ráno */
const hodiny = (h: number) => {
  const t = (((6 + h) % 24) + 24) % 24;
  const hod = Math.floor(t);
  const min = Math.floor((t - hod) * 60);
  return `${hod}:${String(min).padStart(2, "0")}`;
};
const zlomek = (c: number) => ["0", "¼", "½", "¾", "1"][Math.round(omez(c) * 4)];

const BARVA_KAMI: Record<PostavaId, string> = {
  kapka: "#5B8DB8", bublinka: "#3A2E28", stripek: "#D6A23A", hlinka: "#8A6A48", cedulka: "#6B5D4F",
  samotka: "#C9A24A", kachlik: "#C87E4E", vazicka: "#C87E4E", pecinka: "#C4432B",
};

/** Co řeknou kami na milnících — kde se liší od data/kami.ts, je to kvůli hře */
const REPLIKY: Partial<Record<number, string>> = {
  1280: "Tisíc dvě stě osmdesát. A pořád se usmívám.",
};
const TOASTY: Partial<Record<number, string>> = {
  100: "100 °C — sušení. Držet.",
  573: "573 °C — křemen",
  1280: "1 280 °C — vrchol. Držet.",
};

interface Replika {
  text: string;
  kdo: PostavaId;
  kotva: Element | null;
  kdy: number;
  dulezite: boolean;
}

export const ohen: Uroven = (p) => {
  const k = p.koren;
  const q = <T extends Element>(sel: string) => k.querySelector<T>(sel)!;
  const qa = <T extends Element>(sel: string) => [...k.querySelectorAll<T>(sel)];

  const nebeStopy = qa<SVGStopElement>(".mu-ohen-nebe");
  const hvezdy = q<SVGGElement>(".mu-ohen-hvezdy");
  const slunce = q<SVGGElement>(".mu-ohen-slunce");
  const mesic = q<SVGGElement>(".mu-ohen-mesic");
  const kopec1 = q<SVGPathElement>(".mu-ohen-kopec-1");
  const kopec2 = q<SVGPathElement>(".mu-ohen-kopec-2");
  const strom = q<SVGGElement>(".mu-ohen-strom");
  const oknoSvetlo = q<SVGRectElement>(".mu-ohen-okno-svetlo");
  const nocEl = q<SVGPathElement>(".mu-ohen-noc");
  const zarMistnost = q<SVGEllipseElement>(".mu-ohen-zar-mistnost");
  const zarMistnostStopy = qa<SVGStopElement>(".mu-ohen-zar-mistnost-stop");
  const spara = q<SVGRectElement>(".mu-ohen-spara");
  const komoraZar = q<SVGRectElement>(".mu-ohen-komora-zar");
  const spiraly = q<SVGGElement>(".mu-ohen-spiraly");
  const kusy = q<SVGGElement>(".mu-ohen-kusy");
  const horko = q<SVGGElement>(".mu-ohen-horko");
  const segmenty = qa<SVGPolygonElement>(".mu-ohen-seg");
  const vykonSeg = qa<SVGRectElement>(".mu-ohen-vykon-seg");
  const led = q<SVGCircleElement>(".mu-ohen-led");
  const stopa = q<SVGPathElement>(".mu-ohen-stopa");
  const stopaTed = q<SVGPathElement>(".mu-ohen-stopa-ted");
  const trend = q<SVGPathElement>(".mu-ohen-trend");
  const trendG = q<SVGGElement>(".mu-ohen-trend-g");
  const trendKonec = q<SVGCircleElement>(".mu-ohen-trend-konec");
  const portal = q<SVGGElement>(".mu-ohen-portal");
  const pero = q<SVGGElement>(".mu-ohen-pero");
  const znacky = q<SVGGElement>(".mu-ohen-znacky");
  const lampa = q<SVGPathElement>(".mu-ohen-lampa-svetlo");
  const zarovka = q<SVGEllipseElement>(".mu-ohen-lampa-zarovka");
  const dvirka = q<HTMLElement>(".mu-ohen-dvirka");
  const spehyrkaZar = q<SVGCircleElement>(".mu-ohen-spehyrka-zar");
  const lupaKotva = q<SVGCircleElement>(".mu-ohen-lupa-kotva");
  const lupaStopy = qa<SVGStopElement>(".mu-ohen-lupa-stop");
  const lupaCihly = q<SVGPathElement>(".mu-ohen-lupa-cihly");
  const lupaSpirala = q<SVGPathElement>(".mu-ohen-lupa-spirala");
  const lupaTma = qa<SVGElement>(".mu-ohen-lupa-kus, .mu-ohen-lupa-police, .mu-ohen-lupa-podlozka");
  const lupaJas = q<SVGRectElement>(".mu-ohen-lupa-jas");
  const kuzely = qa<SVGPathElement>(".mu-ohen-kuzel");
  const voditka = q<SVGGElement>(".mu-ohen-voditka");
  const efekty = q<SVGGElement>(".mu-ohen-efekty");
  const pecinka = q<HTMLElement>(".mu-ohen-pecinka");
  const btTopit = q<HTMLButtonElement>(".mu-ohen-topit");
  const btOtevrit = q<HTMLButtonElement>(".mu-ohen-otevrit");
  const napoveda = q<HTMLElement>(".mu-ohen-napoveda");

  const ac = new AbortController();
  const sig = { signal: ac.signal };
  const casovace = new Set<number>();
  const pozdeji = (ms: number, fn: () => void) => {
    const id = window.setTimeout(() => {
      casovace.delete(id);
      fn();
    }, ms);
    casovace.add(id);
  };

  const pec: Pec = novaPec();
  let bezi = false;
  let skonceno = false;
  let raf = 0;
  let posledni = 0;
  let drziUkazatel = false;
  let drziKlavesa = false;
  let cvaknuto = 0;
  let otevritOd = Infinity;

  /* Stopa pera a značky milníků */
  const body: [number, number][] = [];
  let posledniH = -1;
  let milnik = 0;
  let predKremenem = false;
  let rekloRano = false;
  let rekloNoc = false;
  let rekloZrala = false;
  let pojistkaHlasena = false;
  /** Glazura při chladnutí tiše cinká, jak se v ní dělá síťka (kannyū) */
  let dalsiCinknuti = 0;
  let semeno = 11;
  const nahoda = () => ((semeno = (semeno * 16807) % 2147483647) / 2147483647);
  let varovaniRychle = 0;
  let varovaniPomalu = 0;
  let posledniVarovani = -Infinity;
  let pomaluOd = -1;

  /* Repliky a zprávy jdou frontou, ať se nepřekřikují */
  const fronta: Replika[] = [];
  /** Kdy smí mluvit další kami */
  let mluvilo = -Infinity;
  const zpravy: string[] = [];
  let zpravaKdy = -Infinity;

  /* Co je na obrazovce — mění se jen to, co se změnilo */
  let ukazano = "";
  let displej = "";
  let nebeKlic = "";
  let pecZvuk = -1;

  const ted = () => performance.now();
  const rekni = (text: string, kdo: PostavaId, kotva: Element | null, dulezite = false) => {
    fronta.push({ text, kdo, kotva, kdy: ted(), dulezite });
  };
  const zprava = (text: string) => zpravy.push(text);
  const kotvaPecinky = () => pecinka;

  /* ——— Výchozí stav scény (DOM zůstává z minulého pokusu) ——— */
  const reset = () => {
    kusy.replaceChildren();
    znacky.replaceChildren();
    efekty.replaceChildren();
    stopa.setAttribute("d", "");
    stopaTed.setAttribute("d", "");
    dvirka.classList.remove("otevreno", "bez-prechodu");
    voditka.classList.remove("pryc");
    pecinka.classList.remove("otres", "spi");
    k.classList.remove("mu-ohen-chladne", "mu-ohen-otevreno", "mu-ohen-bezi", "mu-ohen-otres");
    btTopit.hidden = false;
    btTopit.disabled = false;
    btTopit.classList.remove("drzi");
    btOtevrit.hidden = true;
    btOtevrit.disabled = false;
    btOtevrit.classList.remove("ted");
    napoveda.textContent = "Drž tlačítko nebo mezerník — pec topí. Pustíš — a chladne.";
    k.style.setProperty("--vykon", "0");
    pecinka.style.setProperty("--zar", "0");
  };

  /* ——— Kreslení stavu ——— */
  const nastav = (el: Element, jmeno: string, hodnota: string) => {
    if (el.getAttribute(jmeno) !== hodnota) el.setAttribute(jmeno, hodnota);
  };

  const kresliNebe = (hodina: number) => {
    const klic = hodina.toFixed(2);
    if (klic === nebeKlic) return;
    nebeKlic = klic;
    const [a, b, c] = nebe(hodina);
    nastav(nebeStopy[0], "stop-color", a);
    nastav(nebeStopy[1], "stop-color", b);
    nastav(nebeStopy[2], "stop-color", c);
    const n = noc(hodina);
    nastav(hvezdy, "opacity", f1(n));
    nastav(nocEl, "opacity", (n * 0.36).toFixed(3));
    nastav(oknoSvetlo, "opacity", f1(n));
    nastav(kopec1, "fill", smichej("#A3B3A4", "#262A4E", n));
    nastav(kopec2, "fill", smichej("#86A08A", "#1C2042", n));
    nastav(strom, "fill", smichej("#5F7A66", "#151837", n));
    nastav(lampa, "opacity", (n * 0.9).toFixed(3));
    nastav(zarovka, "fill", smichej("#E8DFC8", "#FFF3B8", n));
    k.style.setProperty("--noc", n.toFixed(3));
    /* Slunce vychází v 7, zapadá v 18:20; měsíc svítí přes noc */
    const t = ((hodina % 24) + 24) % 24;
    const ix = OKNO.x + 9;
    const iw = OKNO.w - 18;
    const zem = OKNO.y + OKNO.h - 9;
    if (t > 6.6 && t < 18.7) {
      const u = (t - 6.6) / 12.1;
      nastav(slunce, "transform", `translate(${f1(ix + 6 + u * (iw - 12))} ${f1(zem - 22 - Math.sin(u * Math.PI) * 92)})`);
      nastav(slunce, "opacity", "1");
    } else nastav(slunce, "opacity", "0");
    const tm = t < 12 ? t + 24 : t;
    if (tm > 19 && tm < 30.6) {
      const u = (tm - 19) / 11.6;
      nastav(mesic, "transform", `translate(${f1(ix + 10 + u * (iw - 20))} ${f1(zem - 40 - Math.sin(u * Math.PI) * 70)})`);
      nastav(mesic, "opacity", f1(Math.min(1, n * 1.4)));
    } else nastav(mesic, "opacity", "0");
  };

  const kresliDisplej = (T: number) => {
    const text = String(Math.round(T)).padStart(4, " ").slice(-4);
    if (text === displej) return;
    displej = text;
    for (const s of segmenty) {
      const c = text[Number(s.dataset.cifra)] ?? " ";
      nastav(s, "fill", (SEGMENTY[c] ?? "").includes(s.dataset.seg ?? "") ? SEG_ZAP : SEG_VYP);
    }
  };

  const kresliZar = () => {
    const T = pec.T;
    const z = zhava(T);
    const barva = barvaZaru(T);
    const n = noc(6 + pec.h);
    nastav(spara, "stroke", barva);
    nastav(spara, "opacity", pec.faze === "otevreno" ? "0" : (z * 0.95).toFixed(3));
    nastav(spehyrkaZar, "stroke", barva);
    nastav(spehyrkaZar, "opacity", (z * 0.9).toFixed(3));
    zarMistnostStopy.forEach((s) => nastav(s, "stop-color", barva));
    nastav(zarMistnost, "opacity", (z * (0.22 + 0.5 * n)).toFixed(3));
    nastav(komoraZar, "fill", barva);
    nastav(komoraZar, "opacity", (z * 0.72).toFixed(3));
    nastav(horko, "opacity", (omez((T - 280) / 600) * 0.85).toFixed(3));
    /* Spirály žhnou víc než komora, dokud se topí */
    const spir = barvaZaru(T + pec.H * 300);
    nastav(lupaSpirala, "stroke", T + pec.H * 300 > 450 ? spir : "#6A4A38");
    nastav(spiraly, "stroke", T + pec.H * 300 > 450 ? spir : "#9A8A72");
    /* Lupa: žár, cihly mizí v jasu, věci se mění v siluety */
    const stred = T > 420 ? barva : smichej("#2A1A14", barvaZaru(450), omez((T - 200) / 250) * 0.4);
    const kraj = smichej(stred, "#000000", 0.42);
    nastav(lupaStopy[0], "stop-color", stred);
    nastav(lupaStopy[1], "stop-color", kraj);
    nastav(lupaCihly, "opacity", (0.55 - z * 0.4).toFixed(3));
    const silueta = smichej("#3A241A", barvaZaru(T - 90), z * 0.85);
    lupaTma.forEach((el) => nastav(el, "fill", silueta));
    nastav(lupaJas, "opacity", (omez((T - 1180) / 200) * 0.28).toFixed(3));
    const kuzelBarva = z > 0 ? smichej("#E8D7AE", barvaZaru(T - 40), z) : "#E8D7AE";
    kuzely.forEach((el, i) => {
      nastav(el, "d", zaromerkaD(LUPA.cx - 30 + i * 24, LUPA.cy + 38, pec.zar[i]));
      nastav(el, "fill", kuzelBarva);
    });
    pecinka.style.setProperty("--zar", omez((T - 100) / 1180).toFixed(3));
  };

  const kresliPanel = () => {
    kresliDisplej(pec.T);
    const n = Math.round(pec.P * 10);
    vykonSeg.forEach((s, i) => {
      const barva = i < n ? (i < 5 ? "#7FE08A" : i < 8 ? "#F3C24A" : "#F0643A") : "#3A3226";
      nastav(s, "fill", barva);
    });
    nastav(led, "fill", pec.P > 0.02 ? "#FF5A3A" : "#4A1E16");
    k.style.setProperty("--vykon", pec.P.toFixed(3));
  };

  const kresliGraf = () => {
    const x = gx(pec.h);
    const y = gy(pec.T);
    if (pec.h - posledniH >= (pec.h < 12 ? 0.04 : 0.25) || posledniH < 0) {
      body.push([x, y]);
      posledniH = pec.h;
      nastav(stopa, "d", body.length > 1 ? `M${body.map(([a, b]) => `${f1(a)} ${f1(b)}`).join(" L")}` : "");
    }
    const [lx, ly] = body[body.length - 1];
    nastav(stopaTed, "d", `M${f1(lx)} ${f1(ly)} L${f1(x)} ${f1(y)}`);
    nastav(portal, "transform", `translate(${f1(x)} 0)`);
    nastav(pero, "transform", `translate(${f1(x)} ${f1(y)})`);
    /* Čárka sklonu: kam pero dojde za půl hodiny, když se nic nezmění */
    if (pec.faze === "vypal" && bezi) {
      const L = 0.5;
      const kx = f1(gx(pec.h + L));
      const ky = f1(gy(pec.T + sklon(pec) * L));
      nastav(trend, "d", `M${f1(x)} ${f1(y)} L${kx} ${ky}`);
      nastav(trendKonec, "cx", kx);
      nastav(trendKonec, "cy", ky);
      nastav(trendG, "opacity", "0.85");
    } else nastav(trendG, "opacity", "0");
  };

  const kresliUkazatel = () => {
    const text = `${hodiny(pec.h)} · ${cislo(Math.round(pec.T))} °C`;
    if (text !== ukazano) {
      ukazano = text;
      p.ukazatel(text);
    }
  };

  const vykresli = () => {
    kresliNebe(6 + pec.h);
    kresliZar();
    kresliPanel();
    kresliGraf();
    kresliUkazatel();
    btTopit.classList.toggle("drzi", drzi() && pec.faze === "vypal");
    const mira = bezi && pec.faze === "vypal" ? 0.1 + 0.9 * pec.P : 0;
    if (Math.abs(mira - pecZvuk) > 0.02) {
      pecZvuk = mira;
      zvuk.nastavPec(mira);
    }
  };

  /* ——— Efekty ——— */
  const efekt = (html: string, ms: number) => {
    const g = document.createElementNS(SVGNS, "g");
    g.innerHTML = html;
    efekty.append(g);
    pozdeji(ms, () => g.remove());
    return g;
  };
  const otres = () => {
    if (p.klid) return;
    k.classList.remove("mu-ohen-otres");
    void k.getBoundingClientRect();
    k.classList.add("mu-ohen-otres");
    pozdeji(520, () => k.classList.remove("mu-ohen-otres"));
  };
  const pecinkaOtres = () => {
    if (p.klid) return;
    pecinka.classList.remove("otres");
    void pecinka.getBoundingClientRect();
    pecinka.classList.add("otres");
    pozdeji(700, () => pecinka.classList.remove("otres"));
  };
  /** Obláčky páry ze spáry dvířek a ze špehýrky */
  const para = (silne: boolean) => {
    const pocet = p.klid ? 3 : silne ? 9 : 4;
    let html = "";
    for (let i = 0; i < pocet; i++) {
      const x = DVIRKA.x + 10 + ((i * 47) % (DVIRKA.w - 10));
      const y = DVIRKA.y - 6 + (i % 3) * 4;
      const r = (silne ? 12 : 8) + (i % 4) * 3;
      html += `<circle class="mu-ohen-obl" style="--i:${i}" cx="${x}" cy="${y}" r="${r}" fill="#FFFFFF" opacity="0.8"/>`;
    }
    efekt(html, 2200);
  };
  /** Prasklina v lupě — bílý záblesk a klikatá čára přes žároměrky */
  const prasklina = () => {
    const { cx, cy } = LUPA;
    efekt(
      `<path class="mu-ohen-praskla" d="M${cx - 40} ${cy - 30} L${cx - 22} ${cy - 18} L${cx - 26} ${cy - 4} L${cx - 6} ${cy + 6} L${cx - 10} ${cy + 20} L${cx + 12} ${cy + 30}" fill="none" stroke="#FFF6D2" stroke-width="2.6" stroke-linejoin="round"/>`,
      1600,
    );
  };
  const znacka = (h: number, T: number, kdo: PostavaId) => {
    const c = document.createElementNS(SVGNS, "circle");
    c.setAttribute("cx", f1(gx(h)));
    c.setAttribute("cy", f1(gy(T)));
    c.setAttribute("r", "4.2");
    c.setAttribute("fill", BARVA_KAMI[kdo]);
    c.setAttribute("stroke", "#FBF6E8");
    c.setAttribute("stroke-width", "1.6");
    c.setAttribute("class", "mu-ohen-znacka");
    znacky.append(c);
  };

  /* ——— Co se děje ——— */
  const reaguj = (u: Udalost) => {
    switch (u) {
      case "varovaniPary":
        rekni("Pomalu! Ještě jsem v hlíně.", "kapka", lupaKotva, true);
        para(false);
        break;
      case "para":
        zvuk.zuch();
        otres();
        pecinkaOtres();
        para(true);
        zprava("Bum! Pára roztrhla kus.");
        rekni("Bum. Promiň. Vlastně ne.", "bublinka", lupaKotva, true);
        break;
      case "sucho":
        zprava("Voda je venku.");
        rekni("Tak já jdu. Pa.", "kapka", lupaKotva);
        break;
      case "varovaniKremene":
        zprava("Křemen! Zpomal.");
        break;
      case "kremen":
        zvuk.tres();
        prasklina();
        pecinkaOtres();
        zprava("Prasklo to — moc rychle přes 573 °C.");
        rekni("Křup. Vítej v klubu.", "stripek", lupaKotva, true);
        break;
      case "varovaniStekla":
        zprava("1 310 °C! Glazura začíná téct.");
        break;
      case "stekla":
        zvuk.reakce("samotka");
        zprava("Glazura stekla až na Šamotku.");
        rekni("Stekla. Až na mě. Zvládnu to.", "samotka", lupaKotva, true);
        break;
      case "pojistka":
        zvuk.cvak();
        if (!pojistkaHlasena) zprava("Pojistka: 1 340 °C. Topení vypnuté.");
        pojistkaHlasena = true;
        break;
      case "konecVypalu":
        konecVypalu();
        break;
      case "lzeOtevrit":
        btOtevrit.classList.add("ted");
        napoveda.textContent = "Pod 200 °C. Teď je to bezpečné.";
        zprava("Pod 200 °C. Teď.");
        zvuk.furin(1760, 0.12);
        rekni("Teď. Otevři mě.", "pecinka", kotvaPecinky(), true);
        break;
      default:
        break;
    }
  };

  const konecVypalu = () => {
    drziUkazatel = false;
    drziKlavesa = false;
    zvuk.cvak();
    zprava("Konec křivky. Pec se vypnula.");
    rekni("Neotvírej mě. Ještě ne. Ještě ne. Ještě… ne.", "pecinka", kotvaPecinky(), true);
    k.classList.add("mu-ohen-chladne");
    btTopit.hidden = true;
    btOtevrit.hidden = false;
    napoveda.textContent = "Noc. Pec chladne sama — otevřít jde kdykoli.";
    /* Kdo zrovna mačká mezerník, nesmí omylem otevřít */
    otevritOd = ted() + 900;
  };

  /** Milníky, varování a noční řeči — co plyne z teploty a času */
  const hlidej = () => {
    const T = pec.T;
    if (pec.faze === "vypal") {
      if (!predKremenem && T >= 515 && !pec.nehody.kremen) {
        predKremenem = true;
        rekni(milniky.find((m) => m.kdo === "stripek")?.replika ?? "Pomalu.", "stripek", lupaKotva, true);
      }
      /* Na vrchol se trefí i ten, kdo drží o pár stupňů níž */
      while (milnik < milniky.length && T >= milniky[milnik].teplota - 6) {
        const m = milniky[milnik++];
        znacka(pec.h, m.teplota, m.kdo);
        const toast = TOASTY[m.teplota];
        if (toast) zprava(toast);
        if (m.kdo === "kapka" || m.kdo === "stripek") continue;
        if (m.kdo === "bublinka") {
          if (!pec.nehody.para) rekni("Tentokrát nic. Příště.", "bublinka", lupaKotva);
          continue;
        }
        if (m.kdo === "samotka" && pec.nehody.stekla) continue;
        rekni(REPLIKY[m.teplota] ?? m.replika, m.kdo, m.kdo === "pecinka" ? kotvaPecinky() : lupaKotva, m.kdo === "pecinka");
        zvuk.reakce(m.kdo);
      }
      if (!rekloZrala && pec.vydrz >= VYDRZ_ZRALA) {
        rekloZrala = true;
        zprava("Glazura se rozlila.");
      }
      /* Moc rychle, nebo moc pomalu — Pecinka se ozve, ale ne pořád */
      const c = cil(pec.h);
      const s = sklon(pec);
      const sc = sklonCile(pec.h);
      const nyni = ted();
      if (nyni - posledniVarovani > 14000) {
        if (varovaniRychle < 2 && T > c + 28 && s > Math.max(sc * 1.6, sc + 110) && T > 140) {
          varovaniRychle++;
          posledniVarovani = nyni;
          rekni("Pomalu. Hlína prochází proměnami, které se nedají uspěchat.", "pecinka", kotvaPecinky());
        } else if (varovaniPomalu < 2 && T < c - 45) {
          if (pomaluOd < 0) pomaluOd = pec.h;
          if (pec.h - pomaluOd > 0.5) {
            varovaniPomalu++;
            posledniVarovani = nyni;
            pomaluOd = -1;
            rekni("Přitop. Jsem pec, ne kamínka.", "pecinka", kotvaPecinky());
          }
        }
      }
      if (T >= c - 45) pomaluOd = -1;
    } else if (pec.faze === "chladne") {
      const nyni = ted();
      if (pec.T < 900 && nyni > dalsiCinknuti) {
        if (dalsiCinknuti) zvuk.ton(3000 + nahoda() * 700, 2850, 0.07, "sine", 0.025);
        dalsiCinknuti = nyni + 1300 + nahoda() * 1500;
      }
      if (!rekloNoc && pec.h >= 18 && !pec.lzeOtevrit) {
        rekloNoc = true;
        pecinka.classList.add("spi");
        rekni("Přes noc podřimuju. Ale jedním okem.", "pecinka", kotvaPecinky());
      }
      if (!rekloRano && pec.lzeOtevrit) {
        rekloRano = true;
        pecinka.classList.remove("spi");
      }
    }
  };

  /**
   * Fronta replik a zpráv. Nová bublina v rámci zavře tu starou, takže
   * další přijde, až se ta předchozí dá přečíst (podle délky); staré
   * nedůležité repliky propadnou.
   */
  const mluv = () => {
    const nyni = ted();
    if (fronta.length && nyni >= mluvilo) {
      while (fronta.length > 1 && !fronta[0].dulezite && nyni - fronta[0].kdy > 6000) fronta.shift();
      const r = fronta.shift()!;
      mluvilo = nyni + Math.max(2800, 1300 + r.text.length * 42);
      p.rekni(r.text, r.kotva, r.kdo);
    }
    if (zpravy.length && nyni - zpravaKdy > 2200) {
      zpravaKdy = nyni;
      p.zprava(zpravy.shift()!);
    }
  };

  /* ——— Smyčka ——— */
  const drzi = () => drziUkazatel || drziKlavesa;
  const smycka = (cas: number) => {
    raf = 0;
    if (!bezi) return;
    const dt = Math.min(0.1, Math.max(0, (cas - posledni) / 1000));
    posledni = cas;
    for (const u of krokPece(pec, dt, drzi())) reaguj(u);
    hlidej();
    mluv();
    vykresli();
    if (bezi) raf = requestAnimationFrame(smycka);
  };

  /* ——— Otevření a konec ——— */
  const otevri = () => {
    if (skonceno || !bezi || pec.faze !== "chladne" || ted() < otevritOd) return;
    otevriPec(pec);
    const brzo = pec.nehody.brzo;
    skonceno = true;
    btOtevrit.disabled = true;
    zvuk.cvak();
    zvuk.ton(150, 80, 0.3, "sine", 0.28);
    k.classList.add("mu-ohen-otevreno");
    if (p.klid) dvirka.classList.add("bez-prechodu");
    dvirka.classList.add("otevreno");
    voditka.classList.add("pryc");
    pecinka.classList.remove("spi");
    kresliKusy();
    vykresli();
    if (brzo) {
      zvuk.cink();
      zvuk.tres();
      otres();
      pecinkaOtres();
      p.zprava("Cink — prasklo.");
      p.rekni("Říkala jsem: ještě ne.", pecinka, "pecinka");
    } else {
      pozdeji(p.klid ? 100 : 900, () => zvuk.zlato());
    }
    /* Smyčka doběhne — už jen kreslí, nic nepočítá */
    pozdeji(p.klid ? 1400 : 2600, () => {
      bezi = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      zvuk.nastavPec(0);
      p.konec(vysledek());
    });
  };

  const vysledek = (): Vysledek => {
    const v = hodnot(pec);
    const veta = !v.proslo
      ? pec.maxT < 1150
        ? "Tohle nebyl výpal. Sotva jsem se zahřála."
        : "Tohle nebyl výpal. To byl ohňostroj."
      : v.body >= 85
        ? "Za dva týdny to bude tvrdý jako kámen. Teda — už teď."
        : v.body >= 65
          ? "Dobrý výpal. Pár stupňů sem, pár tam."
          : "Vypáleno. Žároměrky se tváří nejistě.";
    const nehody = [
      pec.nehody.para && "pára",
      pec.nehody.kremen && "křemen",
      pec.nehody.stekla && "stekla glazura",
      pec.nehody.brzo && "brzy otevřeno",
    ].filter(Boolean) as string[];
    return {
      body: v.body,
      proslo: v.proslo,
      veta,
      udaje: [
        ["Odchylka od křivky", `${cislo(Math.round(v.mad))} °C`],
        ["Žároměrky", pec.zar.map(zlomek).join(" · ")],
        ["Nehody", nehody.length ? nehody.join(", ") : "žádné"],
        ["Otevřeno", `${hodiny(pec.h)} · ${cislo(Math.round(pec.otevrenoPri ?? pec.T))} °C`],
      ],
    };
  };

  /** Kusy v komoře podle toho, jak výpal dopadl */
  const kresliKusy = () => {
    const zrala = pec.vydrz >= VYDRZ_ZRALA;
    const stav: StavKusu = zrala ? "hotovy" : "glazovany";
    const { x, y, w, h } = DVIRKA;
    const horni = y + 112;
    const dolni = y + h - 14;
    const profil = (fn: (t: number) => number) => Array.from({ length: 24 }, (_, i) => fn(i / 23));
    const kus = (druh: Kus["druh"], g: string, r: number[], v: number, ucho = false): Kus => ({
      puvod: "kruh", druh, nazev: "", r, v, ucho: ucho || undefined, glazury: [{ g, kde: "cely" }], dno: true,
    });
    const misky = kus("miska", "celadon", profil((t) => 30 + 33 * Math.pow(Math.sin((t * Math.PI) / 2), 0.85)), 56);
    const hrnek = kus("hrnek", "tenmoku", profil((t) => 38 + 3 * Math.sin(Math.PI * t)), 92, true);
    const vaza = kus("vaza", "shino", profil((t) => 30 + 18 * Math.sin(Math.PI * Math.min(1, t * 1.15)) - (t > 0.78 ? (t - 0.78) * 40 : 0)), 160);
    const miska2 = kus("miska", "železitá hnědá", profil((t) => 26 + 28 * Math.pow(t, 0.7)), 40);
    const stekla = pec.nehody.stekla;
    const umisti = (svgText: string, bx: number, dno: number, s: number) =>
      svgText.replace(/^<svg /, `<svg x="${f1(bx)}" y="${f1(dno - s * 0.95)}" width="${s}" height="${s}" `);
    let html = "";
    /* Horní police: váza a mělká miska */
    html += umisti(kusSvg(vaza, stav, { id: "mo8-k3", stekla }), x + 20, horni, 84);
    html += umisti(kusSvg(miska2, stav, { id: "mo8-k4", stekla, prilepeny: stekla }), x + 104, horni, 70);
    /* Dolní police: miska, hrnek (nebo jeho střepy) a žároměrky */
    html += umisti(kusSvg(misky, stav, { id: "mo8-k1", stekla, prilepeny: stekla }), x + 14, dolni, 82);
    if (pec.nehody.para) {
      const sx = x + 104;
      html += `<g class="mu-ohen-strepy">
        <ellipse cx="${sx + 30}" cy="${dolni - 2}" rx="26" ry="5" fill="#2B2420" opacity="0.2"/>
        <path d="M${sx + 10} ${dolni - 2} L${sx + 16} ${dolni - 16} L${sx + 30} ${dolni - 12} L${sx + 26} ${dolni - 1} Z" fill="#3A2A22"/>
        <path d="M${sx + 30} ${dolni - 1} L${sx + 36} ${dolni - 20} L${sx + 46} ${dolni - 22} L${sx + 50} ${dolni - 2} Z" fill="#1E1612"/>
        <path d="M${sx + 2} ${dolni - 1} L${sx + 6} ${dolni - 8} L${sx + 12} ${dolni - 5} L${sx + 10} ${dolni} Z" fill="#8A5A34"/>
        <path d="M${sx + 50} ${dolni} L${sx + 56} ${dolni - 9} L${sx + 64} ${dolni - 4} L${sx + 60} ${dolni} Z" fill="#3A2A22"/>
        <path d="M${sx + 36} ${dolni - 20} L${sx + 40} ${dolni - 34} L${sx + 46} ${dolni - 22} Z" fill="#8A5A34" opacity="0.9"/>
      </g>`;
    } else {
      html += umisti(kusSvg(hrnek, stav, { id: "mo8-k2", stekla }), x + 92, dolni, 80);
    }
    /* Žároměrky na podložce vpravo dole */
    const zx = x + w - 52;
    html += `<g class="mu-ohen-zaromerky-v-peci">
      <path d="M${zx - 4} ${dolni} C${zx - 2} ${dolni - 6} ${zx + 42} ${dolni - 6} ${zx + 44} ${dolni} Z" fill="#B49A76"/>
      ${zaromerky.map((_, i) => `<path d="${zaromerkaD(zx + 4 + i * 12, dolni - 3, pec.zar[i], 22, 6)}" fill="#E8D7AE" stroke="#8A6A48" stroke-width="0.7" stroke-linejoin="round"/>`).join("")}
    </g>`;
    /* Prasklina po křemeni přes vázu, po šoku přes všechno */
    const praskliny: string[] = [];
    if (pec.nehody.kremen) praskliny.push(`M${x + 58} ${horni - 76} L${x + 54} ${horni - 58} L${x + 62} ${horni - 44} L${x + 56} ${horni - 26} L${x + 60} ${horni - 10}`);
    if (pec.nehody.brzo) {
      praskliny.push(`M${x + 40} ${dolni - 42} L${x + 50} ${dolni - 30} L${x + 46} ${dolni - 18}`);
      praskliny.push(`M${x + 140} ${horni - 30} L${x + 146} ${horni - 18} L${x + 142} ${horni - 8}`);
      if (!pec.nehody.para) praskliny.push(`M${x + 128} ${dolni - 64} L${x + 122} ${dolni - 50} L${x + 130} ${dolni - 36}`);
    }
    if (praskliny.length) html += `<path d="${praskliny.join(" ")}" fill="none" stroke="#2B2420" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" opacity="0.85"/>`;
    /* Lesk nové glazury — jiskřičky, jen když se všechno povedlo */
    const bezNehod = !pec.nehody.para && !pec.nehody.kremen && !pec.nehody.stekla && !pec.nehody.brzo;
    if (zrala && bezNehod) {
      const jiskra = (jx: number, jy: number, i: number) =>
        `<path class="mu-ohen-jiskra" style="--i:${i}" d="M${jx} ${jy - 7} L${jx + 1.6} ${jy - 1.6} L${jx + 7} ${jy} L${jx + 1.6} ${jy + 1.6} L${jx} ${jy + 7} L${jx - 1.6} ${jy + 1.6} L${jx - 7} ${jy} L${jx - 1.6} ${jy - 1.6} Z" fill="#FFF6D8"/>`;
      html += jiskra(x + 40, dolni - 50, 0) + jiskra(x + 128, dolni - 70, 1) + jiskra(x + 52, horni - 66, 2) + jiskra(x + 150, horni - 40, 3);
    }
    kusy.innerHTML = html;
  };

  /* ——— Vstup ——— */
  const zacniTopit = () => {
    if (!bezi || pec.faze !== "vypal") return;
    const nyni = ted();
    if (nyni - cvaknuto > 140) {
      cvaknuto = nyni;
      zvuk.cvak();
    }
  };
  btTopit.addEventListener(
    "pointerdown",
    (e) => {
      if (!bezi || pec.faze !== "vypal") return;
      e.preventDefault();
      zvuk.odemkni();
      drziUkazatel = true;
      try {
        btTopit.setPointerCapture(e.pointerId);
      } catch {}
      zacniTopit();
    },
    sig,
  );
  const pust = () => {
    drziUkazatel = false;
  };
  btTopit.addEventListener("pointerup", pust, sig);
  btTopit.addEventListener("pointercancel", pust, sig);
  btTopit.addEventListener("lostpointercapture", pust, sig);
  btTopit.addEventListener("contextmenu", (e) => e.preventDefault(), sig);
  const mezernik = (e: KeyboardEvent) => e.code === "Space" || e.key === " ";
  const doPole = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
  };
  document.addEventListener(
    "keydown",
    (e) => {
      if (!mezernik(e) || doPole(e) || !bezi || pec.faze !== "vypal") return;
      e.preventDefault();
      if (!drziKlavesa) zacniTopit();
      drziKlavesa = true;
    },
    sig,
  );
  document.addEventListener(
    "keyup",
    (e) => {
      if (!mezernik(e)) return;
      if (drziKlavesa) e.preventDefault();
      drziKlavesa = false;
    },
    sig,
  );
  window.addEventListener("blur", () => ((drziKlavesa = false), (drziUkazatel = false)), sig);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      drziKlavesa = false;
      drziUkazatel = false;
    }
  }, sig);
  btOtevrit.addEventListener("click", otevri, sig);

  /* ——— Start ——— */
  reset();
  vykresli();

  return {
    start() {
      if (bezi || skonceno) return;
      bezi = true;
      k.classList.add("mu-ohen-bezi");
      posledni = performance.now();
      rekni("Zavřeno. Pod stovkou pomalu — ať voda stihne odejít.", "pecinka", kotvaPecinky(), true);
      raf = requestAnimationFrame((cas) => {
        posledni = cas;
        smycka(cas);
      });
    },
    stop() {
      bezi = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      casovace.forEach((id) => window.clearTimeout(id));
      casovace.clear();
      ac.abort();
      drziKlavesa = false;
      drziUkazatel = false;
      zvuk.nastavPec(0);
    },
  };
};

