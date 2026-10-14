/**
 * Dárkové jízdenky (components/rezervace/Darky.astro): tři svislé nabídky,
 * každá s vlastním tlačítkem. Jméno, vzkaz a podpis se píšou rovnou na
 * jízdenku — co se napíše na jednu, objeví se i na ostatních dvou, ať jde
 * porovnat, jak by vypadaly. U zvláštního vlaku se pod jízdenkou vybírá
 * kurz a jízdenka se podle něj přepíše (znak, kurz, lektor, vláček).
 *
 * Zabalit a darovat: jízdenka dostane razítko Dárek, ovine ji páska
 * s mašlí mizuhiki, vláček v okně odjede a vrátí se — a otevře se e-mail
 * s objednávkou té jedné jízdenky. Stránka sama nic neodesílá. Rozepsaný
 * dárek si prohlížeč pamatuje (rezervace-darek), ať se při návratu
 * nepíše znovu.
 *
 * Jízdenky se dají naklonit myší
 * a otočit na rub, kde je, jak je uplatnit. UV lampa zhasne papír kolem
 * a kruh lampy jde za myší — v jízdenkách pod ním svítí skrytý tisk (maska
 * v kresbě, darky.ts). S omezeným pohybem se nic nenaklání ani nebalí na
 * pokračování, jen se rovnou ukáže výsledek.
 */
import { vlakKurz, ZNAK_KTERYKOLI } from "../../components/rezervace/darky";
import { rezervace as R, permanentka as P, kurzy, cenaOdjezdu, darky as D, odjezduDarku } from "../../data/rezervace";
import { sklonuj } from "../../data/pocty";
import { klid, omez, nacti, uloz } from "../parta2/stav";
import * as zvuk from "../parta2/zvuk";

type Dar = "hodiny" | "pas" | "kurz";
type Forma = "pdf" | "papir";
type Pole = "pro" | "vzkaz" | "od";

interface Rozepsany {
  pro: string;
  od: string;
  vzkaz: string;
  kurz: string;
  forma: Forma;
}

const KLIC = "rezervace-darek";
const POLE: Pole[] = ["pro", "vzkaz", "od"];
const DELKA: Record<Pole, number> = { pro: 28, vzkaz: 70, od: 28 };
const ODJEZDU = ["", "jeden odjezd", "dva odjezdy", "tři odjezdy", "čtyři odjezdy"];
const kc = (n: number) => `${n.toLocaleString("cs-CZ")} Kč`;
const dvoj = (n: number) => String(n).padStart(2, "0");
const hhmm = (h: number) => `${Math.floor(h)}:${dvoj(Math.round((h % 1) * 60))}`;
const mistKurzu = Math.max(...kurzy.map((k) => k.mist));
const lektori = [...new Set(kurzy.map((k) => k.lektor))];
const kurzPodle = (id: string) => kurzy.find((k) => k.id === id) ?? null;

/** Cena dárku. Na kterýkoli kurz se počítá ten nejdražší, ať jízdenka pokryje každý. */
const cenaZa = (dar: Dar, kurz: string) =>
  dar === "hodiny" ? odjezduDarku * cenaOdjezdu : dar === "pas" ? P.cena : (kurzPodle(kurz)?.cena ?? Math.max(...kurzy.map((k) => k.cena)));

/* ——— Měření písma: jméno, podpis a kurz se vejdou podle skutečné šířky ——— */

let platno: CanvasRenderingContext2D | null | undefined;
const sirkaTextu = (el: Element, text: string, velikost: number) => {
  if (platno === undefined) {
    try {
      platno = document.createElement("canvas").getContext("2d");
    } catch {
      platno = null;
    }
  }
  if (!platno) return text.length * velikost * 0.44;
  const cs = getComputedStyle(el);
  platno.font = `${cs.fontStyle} ${cs.fontWeight} ${velikost}px ${cs.fontFamily}`;
  return platno.measureText(text).width;
};
const pismo = (el: Element, vychozi: number) => parseFloat(getComputedStyle(el).fontSize) || vychozi;

/** Jméno na lince jízdenky: dlouhé se zmenší, ať se vejde (--zmenseni na poli) */
function vejdiJmeno(input: HTMLInputElement) {
  const obal = input.parentElement;
  if (!obal) return;
  obal.style.removeProperty("--zmenseni");
  const sirka = input.clientWidth;
  if (!sirka) return;
  const px = pismo(input, 30);
  const w = sirkaTextu(input, input.value || input.placeholder, px);
  const pomer = omez((sirka - px * 0.35) / Math.max(1, w), 0.5, 1);
  if (pomer < 1) obal.style.setProperty("--zmenseni", pomer.toFixed(3));
}

/** Věnování na dva řádky: když přeteče, písmo se zmenšuje, dokud se nevejde */
function vejdiVzkaz(pole: HTMLTextAreaElement) {
  const obal = pole.parentElement;
  if (!obal) return;
  obal.style.removeProperty("--zmenseni");
  if (!pole.clientHeight) return;
  for (let k = 1; k <= 4 && pole.scrollHeight > pole.clientHeight + 1; k++) obal.style.setProperty("--zmenseni", (1 - k * 0.1).toFixed(2));
}

/** Podpis: pole je široké jako to, co je v něm, ať pomlčka stojí hned před jménem */
function vejdiPodpis(input: HTMLInputElement) {
  const px = pismo(input, 20);
  const w = sirkaTextu(input, input.value || input.placeholder, px);
  input.style.width = `${(w / px + 0.45).toFixed(2)}em`;
}

/** Text v kresbě na pevnou šířku (data-sirka): když je dlouhý, písmo se zmenší, a nakonec se zúží */
function napisSvg(el: SVGTextElement, text: string) {
  el.textContent = text;
  el.style.fontSize = "";
  el.removeAttribute("textLength");
  el.removeAttribute("lengthAdjust");
  const max = Number(el.dataset.sirka ?? 0);
  if (!max) return;
  const zaklad = pismo(el, 14);
  const w = sirkaTextu(el, text, zaklad);
  if (w <= max) return;
  const velikost = Math.max(zaklad * 0.7, (zaklad * max) / w);
  el.style.fontSize = `${velikost.toFixed(1)}px`;
  if (sirkaTextu(el, text, velikost) > max) {
    el.setAttribute("textLength", String(max));
    el.setAttribute("lengthAdjust", "spacingAndGlyphs");
  }
}

export function initDarky() {
  const koren = document.querySelector<HTMLFormElement>(".rz-darky-karta");
  if (!koren) return;
  const email = koren.dataset.email ?? "";
  const sloupce = [...koren.querySelectorAll<HTMLElement>(".rz-dar")];
  if (!sloupce.length) return;
  const pole = (jmeno: Pole) => [...koren.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(`.rzd-pero [name="${jmeno}"]`)];
  const uvTlacitko = koren.querySelector<HTMLButtonElement>(".rz-darky-uv");
  const svetlo = koren.querySelector<HTMLElement>(".rz-darky-svetlo");

  const dnes = new Date();
  const ddmm = `${dvoj(dnes.getDate())}${dvoj(dnes.getMonth() + 1)}`;
  const datum = `${dnes.getDate()}. ${dnes.getMonth() + 1}. ${dnes.getFullYear()}`;
  const KOD: Record<Dar, string> = { hodiny: `${D.hodin}H`, pas: `P${P.mesicu}`, kurz: "ZV" };

  /* ——— Rozepsaný dárek z minula ——— */

  const zaskrtni = (jmeno: string, hodnota: string) => {
    const el = koren.querySelector<HTMLInputElement>(`input[name="${jmeno}"][value="${hodnota}"]`);
    if (el) el.checked = true;
  };
  const zMinula = nacti<Partial<Rozepsany> | null>(KLIC, null);
  if (zMinula && typeof zMinula === "object") {
    for (const k of POLE) {
      const v = zMinula[k];
      if (typeof v === "string") pole(k).forEach((el) => (el.value = v.slice(0, DELKA[k])));
    }
    if (typeof zMinula.kurz === "string" && (zMinula.kurz === "" || kurzPodle(zMinula.kurz))) zaskrtni("kurz", zMinula.kurz);
    if (zMinula.forma === "papir" || zMinula.forma === "pdf") zaskrtni("forma", zMinula.forma);
  }

  const stav = (): Rozepsany => ({
    pro: pole("pro")[0]?.value.trim() ?? "",
    od: pole("od")[0]?.value.trim() ?? "",
    vzkaz: pole("vzkaz")[0]?.value.trim() ?? "",
    kurz: koren.querySelector<HTMLInputElement>('input[name="kurz"]:checked')?.value ?? "",
    forma: koren.querySelector<HTMLInputElement>('input[name="forma"]:checked')?.value === "papir" ? "papir" : "pdf",
  });

  /** Jméno, věnování a podpis se vejdou podle toho, co je napsané (u všech tří jízdenek stejně) */
  const vejdi = (jen?: Pole) => {
    if (!jen || jen === "pro") pole("pro").forEach((el) => vejdiJmeno(el as HTMLInputElement));
    if (!jen || jen === "vzkaz") pole("vzkaz").forEach((el) => vejdiVzkaz(el as HTMLTextAreaElement));
    if (!jen || jen === "od") pole("od").forEach((el) => vejdiPodpis(el as HTMLInputElement));
  };

  /* ——— Přepsání jízdenek a mailů ——— */

  /** Kurz, se kterým je ve zvláštním vlaku nakreslený vláček — překresluje se, jen když se změní */
  let vlakJe: string | null = null;

  const prepisJizdenku = (s: HTMLElement, st: Rozepsany) => {
    const dar = s.dataset.dar as Dar;
    const q = <T extends Element>(k: string) => [...s.querySelectorAll<T>(`[data-rzd="${k}"]`)];
    const cislo = `${ddmm}·${KOD[dar]}`;
    q("cislo").forEach((el) => (el.textContent = `№ ${cislo}`));
    q("cislo-kupon").forEach((el) => (el.textContent = cislo));
    q("datum").forEach((el) => (el.textContent = datum));
    if (dar !== "kurz") return;

    const kurz = kurzPodle(st.kurz);
    const hodiny = kurz ? kurz.program.map((z) => z.h) : kurzy.flatMap((k) => k.program.map((z) => z.h));
    q("radek").forEach((el) => (el.textContent = `CELÝ DEN ${hhmm(Math.min(...hodiny))}–${hhmm(Math.max(...hodiny) + R.blok)} · S LEKTOREM`));
    q("lektor").forEach((el) => (el.textContent = kurz ? kurz.lektor : lektori.length === 1 ? lektori[0] : "—"));
    q<SVGTextElement>("kurz").forEach((el) => napisSvg(el, kurz?.nazev ?? "kterýkoli kurz"));
    q<SVGTextElement>("emblem").forEach((el) => {
      const znak = kurz?.emblem ?? ZNAK_KTERYKOLI;
      el.textContent = znak;
      el.classList.toggle("rzd-t-emblem-dva", znak.length > 1);
    });
    /* Na rubu je program obou kurzů — vybraný svítí, na kterýkoli svítí oba */
    s.querySelectorAll<SVGGElement>("[data-program]").forEach((g) => (g.style.opacity = !kurz || g.dataset.program === kurz.id ? "" : "0.38"));
    const cena = s.querySelector<HTMLElement>(".rz-dar-cena b");
    if (cena) cena.textContent = kc(cenaZa("kurz", st.kurz)).replace(" Kč", " Kč");
    const vlak = s.querySelector<SVGGElement>('[data-rzd="vlak"]');
    if (vlak && vlakJe !== st.kurz) {
      /* Při načtení stránky je v kresbě vláček na kterýkoli kurz — překreslí se, až když je vybraný jiný */
      if (vlakJe !== null || st.kurz) vlak.innerHTML = vlakKurz(kurz, mistKurzu);
      vlakJe = st.kurz;
    }
  };

  const mail = (s: HTMLElement, st: Rozepsany) => {
    const dar = s.dataset.dar as Dar;
    const nazev = s.dataset.nazev ?? "";
    const kurz = dar === "kurz" ? kurzPodle(st.kurz) : null;
    const jmeno = nazev + (dar === "kurz" ? ` — ${kurz ? kurz.nazev : "kterýkoli kurz"}` : "");
    const popis =
      dar === "hodiny"
        ? `${nazev} — ${ODJEZDU[odjezduDarku] ?? `${odjezduDarku} odjezdů`} po hodině a půl (odjezdy si obdarovaný vybere sám)`
        : dar === "pas"
          ? `Permanentka na ${sklonuj(P.mesicu, "měsíc", "měsíce", "měsíců")} — jeden den v týdnu, pokaždé stejný spoj (den a spoj si obdarovaný vybere sám)`
          : `Zvláštní vlak — ${kurz ? `kurz ${kurz.nazev}` : "kterýkoli kurz"} na celý den (${kurz ? "termín" : "kurz i termín"} si obdarovaný vybere sám)`;
    const radky = [
      "Ahoj, chci objednat dárkovou jízdenku:",
      "",
      popis,
      `Cena: ${kc(cenaZa(dar, st.kurz))} (jízdenka pro jednoho)`,
      "",
      "Na jízdenku:",
      `Pro: ${st.pro || "—"}`,
      `Vzkaz: ${st.vzkaz || "—"}`,
      `Od: ${st.od || "—"}`,
      "",
      st.forma === "papir" ? "Chci ji vytištěnou." : "Chci ji v PDF.",
      "",
      "Díky!",
    ];
    return `mailto:${email}?subject=${encodeURIComponent(`Dárková jízdenka: ${jmeno}`)}&body=${encodeURIComponent(radky.join("\n"))}`;
  };

  let posledni = "";
  /** Po každé změně: jízdenky, ceny a maily. `uzivatel` = změnil to člověk, ne načtení stránky. */
  const prepis = (uzivatel = false) => {
    const st = stav();
    for (const s of sloupce) {
      prepisJizdenku(s, st);
      const a = s.querySelector<HTMLAnchorElement>(".rz-dar-darovat");
      if (a) a.href = mail(s, st);
    }
    uloz(KLIC, st);
    /* Když se zabalená jízdenka změní, sama se rozbalí — zabalené má být, co odešlo mailem */
    const otisk = JSON.stringify(st);
    if (uzivatel && otisk !== posledni) rozbal();
    posledni = otisk;
  };

  /* ——— Psaní na jízdenku a volby ——— */

  koren.addEventListener("input", (e) => {
    const t = e.target as HTMLInputElement | HTMLTextAreaElement;
    const jmeno = t.name as Pole;
    if (!t.closest(".rzd-pero") || !POLE.includes(jmeno)) return;
    /* Co se napíše na jednu jízdenku, píše se i na ostatní */
    pole(jmeno).forEach((el) => {
      if (el !== t) el.value = t.value;
    });
    vejdi(jmeno);
    prepis(true);
  });
  koren.addEventListener("change", (e) => {
    const t = e.target as HTMLInputElement;
    if (t.name === "kurz") {
      zvuk.drevo(1.15);
      if (t.value) window.setTimeout(() => zvuk.para(), 120);
    } else if (t.name === "forma") zvuk.drevo(1.15);
    else return;
    prepis(true);
  });

  /* ——— Naklánění za myší ——— */

  let uv = false;
  for (const s of sloupce) {
    const predmet = s.querySelector<HTMLElement>(".rz-dar-predmet");
    const otacec = predmet?.querySelector<HTMLElement>(".rzd-otacec");
    if (!predmet || !otacec) continue;
    let ramec = 0;
    let bod: { x: number; y: number } | null = null;
    const srovnej = () => {
      otacec.style.removeProperty("--rx");
      otacec.style.removeProperty("--ry");
    };
    const krok = () => {
      ramec = 0;
      if (!bod) return;
      const r = predmet.getBoundingClientRect();
      const px = omez((bod.x - r.left) / Math.max(1, r.width)) - 0.5;
      const py = omez((bod.y - r.top) / Math.max(1, r.height)) - 0.5;
      /* Když se do jízdenky píše, nenaklání se — písmo by ujíždělo pod rukou */
      const pise = predmet.contains(document.activeElement) && document.activeElement?.matches("input, textarea");
      if (!uv && !klid && !pise) {
        otacec.style.setProperty("--rx", `${(-py * 8).toFixed(2)}deg`);
        otacec.style.setProperty("--ry", `${(px * 13).toFixed(2)}deg`);
      }
    };
    predmet.addEventListener("pointermove", (e) => {
      if (e.pointerType === "touch") return;
      bod = { x: e.clientX, y: e.clientY };
      predmet.classList.add("nakloneno");
      if (!ramec) ramec = requestAnimationFrame(krok);
    });
    predmet.addEventListener("pointerleave", () => {
      bod = null;
      predmet.classList.remove("nakloneno");
      srovnej();
    });
    predmet.addEventListener("focusin", srovnej);
  }

  /* ——— Otočit: vzadu je, jak jízdenku uplatnit ——— */

  const naLic = (s: HTMLElement) => {
    s.classList.remove("otocena");
    s.querySelector(".rz-dar-otocit")?.setAttribute("aria-pressed", "false");
    const lic = s.querySelector<HTMLElement>(".rzd-strana-lic");
    if (lic) lic.inert = false;
  };
  for (const s of sloupce) {
    const b = s.querySelector<HTMLButtonElement>(".rz-dar-otocit");
    b?.addEventListener("click", () => {
      const otocit = !s.classList.contains("otocena");
      s.classList.toggle("otocena", otocit);
      b.setAttribute("aria-pressed", String(otocit));
      /* Pole na psaní jsou na líci — dokud je jízdenka otočená, nedá se do nich skočit tabulátorem */
      const lic = s.querySelector<HTMLElement>(".rzd-strana-lic");
      if (lic) lic.inert = otocit;
      zvuk.papir();
      window.setTimeout(() => zvuk.drevo(0.5), klid ? 0 : 520);
    });
  }

  /* ——— UV lampa ——— */

  const kruhy = sloupce.map((s) => {
    const kruh = s.querySelector<SVGCircleElement>(".rzd-uv-kruh");
    return { svg: s.querySelector<SVGSVGElement>(".rzd-strana-lic .rzd-listek"), kruh, dx: Number(kruh?.dataset.dx ?? 0), dy: Number(kruh?.dataset.dy ?? 0) };
  });
  /** Posvítí lampou na místo v okně: kruh na papíře a v každé jízdence maska na stejné místo */
  const posvit = (x: number, y: number) => {
    const r = koren.getBoundingClientRect();
    if (svetlo) {
      svetlo.style.transform = `translate(${(x - r.left).toFixed(0)}px, ${(y - r.top).toFixed(0)}px)`;
      svetlo.classList.add("sviti");
    }
    if (typeof DOMPoint === "undefined") return;
    for (const { svg, kruh, dx, dy } of kruhy) {
      const m = svg?.getScreenCTM?.();
      if (!m || !kruh) continue;
      /* Kruh je v souřadnicích jízdenky, ne desky — jízdenka v desce leží posunutá o dx, dy */
      const p = new DOMPoint(x, y).matrixTransform(m.inverse());
      kruh.setAttribute("cx", (p.x - dx).toFixed(1));
      kruh.setAttribute("cy", (p.y - dy).toFixed(1));
    }
  };
  const zhasni = () => {
    svetlo?.classList.remove("sviti");
    for (const { kruh } of kruhy) kruh?.setAttribute("cx", "-999");
  };
  uvTlacitko?.addEventListener("click", () => {
    uv = !uv;
    zvuk.cvak();
    koren.classList.toggle("uv", uv);
    uvTlacitko.setAttribute("aria-pressed", String(uv));
    const text = uvTlacitko.querySelector(".rz-darky-uv-text");
    if (text) text.textContent = uv ? "Rozsvítit" : "UV lampa";
    if (!uv) return zhasni();
    /* Svítí se na líc — otočené se vrátí, naklonění se srovná. Lampa se rozsvítí nad prostřední, ať je hned něco vidět. */
    sloupce.forEach((s) => {
      naLic(s);
      const otacec = s.querySelector<HTMLElement>(".rzd-otacec");
      otacec?.style.removeProperty("--rx");
      otacec?.style.removeProperty("--ry");
    });
    const r = kruhy[Math.min(1, kruhy.length - 1)]?.svg?.getBoundingClientRect();
    if (r) posvit(r.left + r.width * 0.5, r.top + r.height * 0.42);
  });
  koren.addEventListener("pointermove", (e) => {
    if (uv) posvit(e.clientX, e.clientY);
  });
  koren.addEventListener("pointerdown", (e) => {
    if (uv) posvit(e.clientX, e.clientY);
  });
  koren.addEventListener("pointerleave", () => {
    if (uv) zhasni();
  });

  /* ——— Zabalit a darovat ——— */

  let casovace: number[] = [];
  const pozdeji = (ms: number, fn: () => void) => casovace.push(window.setTimeout(fn, ms));
  function rozbal() {
    casovace.forEach((t) => window.clearTimeout(t));
    casovace = [];
    for (const s of sloupce) {
      s.classList.remove("balim", "zabaleno");
      const hotovo = s.querySelector(".rz-dar-hotovo");
      if (hotovo) hotovo.textContent = "";
      const rozbalit = s.querySelector<HTMLButtonElement>(".rz-dar-rozbalit");
      if (rozbalit) rozbalit.hidden = true;
      s.querySelector(".rz-dar-darovat")?.removeAttribute("aria-busy");
    }
  }

  for (const s of sloupce) {
    const odeslat = s.querySelector<HTMLAnchorElement>(".rz-dar-darovat");
    const hotovo = s.querySelector<HTMLElement>(".rz-dar-hotovo");
    const rozbalit = s.querySelector<HTMLButtonElement>(".rz-dar-rozbalit");
    if (!odeslat) continue;
    odeslat.addEventListener("click", (e) => {
      e.preventDefault();
      const dar = s.dataset.dar as Dar;
      const href = mail(s, stav());
      rozbal();
      odeslat.setAttribute("aria-busy", "true");
      /* Páska jde přes prostředek jízdenky — ten musí být vidět, jinak se k jízdence nejdřív posune */
      const predmet = s.querySelector<HTMLElement>(".rz-dar-predmet");
      const r = predmet?.getBoundingClientRect();
      const stred = r ? r.top + r.height * 0.56 : 0;
      const vidi = !r || (stred > 40 && stred < window.innerHeight - 40);
      if (!vidi) predmet?.scrollIntoView({ block: "center", behavior: klid ? "auto" : "smooth" });
      /* Balí se líc — otočená se nejdřív vrátí */
      const otocena = s.classList.contains("otocena");
      naLic(s);
      const start = klid ? 0 : Math.max(vidi ? 0 : 650, otocena ? 750 : 0);
      pozdeji(start, () => {
        void s.offsetWidth;
        s.classList.add("zabaleno");
        if (klid) return;
        s.classList.add("balim");
        window.setTimeout(() => zvuk.razitko(), 260);
        window.setTimeout(() => zvuk.papir(), 760);
        window.setTimeout(() => zvuk.uzel(), 1350);
        window.setTimeout(() => (dar === "kurz" ? zvuk.para() : zvuk.drevo(0.6)), 1750);
        window.setTimeout(() => zvuk.oslava(), 2050);
      });
      pozdeji(start + 6000, () => s.classList.remove("balim"));
      /* Mail se otevře, až je jízdenka zabalená */
      pozdeji(start + (klid ? 300 : 2300), () => {
        odeslat.removeAttribute("aria-busy");
        if (hotovo) {
          /* Kdyby prohlížeč mail z časovače neotevřel, je tu odkaz na tentýž */
          const znovu = document.createElement("a");
          znovu.href = href;
          znovu.textContent = "otevřít znovu";
          hotovo.replaceChildren("Zabaleno. Mail s objednávkou je připravený — stačí ho odeslat. Neotevřel se? ", znovu, ".");
        }
        if (rozbalit) rozbalit.hidden = false;
        window.location.href = href;
      });
    });
    rozbalit?.addEventListener("click", () => {
      zvuk.papir();
      rozbal();
    });
  }

  /* Hologram a kouř běží pořád — když sekce není vidět, stojí */
  const sekce = koren.closest<HTMLElement>(".rz-darky");
  if (sekce && "IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => sekce.classList.toggle("mimo", !e.isIntersecting), { rootMargin: "200px 0px" }).observe(sekce);
  }

  prepis();
  vejdi();
  /* Ruční písmo se načítá později — až je tu, změří se jméno, podpis a kurz znovu */
  if (document.fonts) {
    Promise.all([document.fonts.ready, document.fonts.load("600 32px Caveat"), document.fonts.load("400 26px Caveat")])
      .catch(() => null)
      .then(() => {
        if (!koren.isConnected) return;
        vejdi();
        prepis();
      });
  }
}
