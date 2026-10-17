/**
 * Šátek furoshiki — košík Obchodu 2. Pamatuje si, co v něm je
 * (localStorage, klíč obchod2-satek), kreslí kusy na rozprostřený šátek,
 * počítá cenu a skládá e-mail. Každé tlačítko „Do šátku“ má
 * data-satek-pridat a data-satek-id (v krámku i v detailu kusu); kus
 * v krámku má data-satek-kus, aby šlo poznat, že leží v šátku.
 *
 * Zavázání: šátek se zaváže a objednávka odejde na /api/objednavka
 * (scripts/parta2/objednavka.ts). Odkaz na tlačítku je připravený e-mail
 * se stejným seznamem — ten se ukáže jako záloha, když server neodpoví.
 *
 * Kde je WebGL2, je šátek skutečná látka ve 3D (satek3d/latka.ts): kusy na
 * ní leží jako balíky v novinách s visačkou (fotka a číslo, stejné číslo má
 * řádek účtenky), při dopadu látku rozvlní a „Zavázat“ je opravdové
 * otsukai-tsutsumi s uzlem ma-musubi. Prázdný šátek je složený, s prvním
 * kusem se rozloží a po posledním zase složí. Najetí na balík prosvětlí
 * řádek účtenky a naopak. Vzor šátku (data/furoshiki.ts) si prohlížeč
 * pamatuje (obchod2-satek-vzor) a posílá se s objednávkou. Bez WebGL2
 * zůstává SVG kresba z Satek.astro.
 *
 * Vázička (scripts/parta2/pruvodce.ts) nosí hostovi zavázaný uzlík
 * s počtem kusů, když šátek není vidět. Posílá se jí na document:
 *   satek:zmena    { pocet, vzor }  — při startu a po každé změně
 *   satek:videt    { videt }        — sekce #satek je / není na obrazovce
 *   satek:pridano  { id, videt }    — kus doletěl do šátku nebo k ní
 * Kus přidaný mimo šátek letí do jejího uzlíku (.pruvodce-satek). Staré
 * plovoucí tlačítko se ukáže, jen když je schovaná do čárky
 * (pruvodce:schovana) nebo na stránce není.
 */
import { nacti, uloz, klid } from "../parta2/stav";
import { pocetKusu } from "../../data/pocty";
import * as zvuk from "../parta2/zvuk";
import { posliObjednavku, platnyEmail, proc, zaloha } from "../parta2/objednavka";
import { vytvorLatku } from "./satek3d/latka";
import type { Latka, KusNaSatku } from "./satek3d/latka";
import { NEJVIC_BALIKU } from "./satek3d/typy";
import type { TvarBaliku } from "./satek3d/typy";
import { vzory, vzorPodleId, VYCHOZI_VZOR } from "../../data/furoshiki";
import type { VzorSatku } from "../../data/furoshiki";

interface Zbozi {
  id: string;
  nazev: string;
  cena: number;
  cenaText: string;
  popis: string;
  /** Jak se kus zabalí do novin (Satek.astro podle tvaru kusu) */
  tvar: TvarBaliku;
  /** Fotka na visačku balíku, když ji kus má */
  foto?: string;
}

export interface Satek {
  ma: (id: string) => boolean;
  prepni: (id: string, odkud?: Element) => void;
  obnovTlacitka: () => void;
}

const KLIC = "obchod2-satek";
const KLIC_VZOR = "obchod2-satek-vzor";

const kc = (n: number) => `${n.toLocaleString("cs-CZ")} Kč`;
const ohlas = (jmeno: string, detail: unknown) => document.dispatchEvent(new CustomEvent(jmeno, { detail }));

export function initSatek(): Satek {
  const zbozi: Zbozi[] = JSON.parse(document.getElementById("o2-zbozi")?.textContent ?? "[]");
  const podleId = new Map(zbozi.map((z) => [z.id, z]));
  const vSatku = new Set<string>(nacti<string[]>(KLIC, []).filter((id) => podleId.has(id)));
  const koren = document.querySelector<HTMLElement>("[data-satek]");
  const email = koren?.dataset.email ?? "";
  const veci = document.querySelector<SVGGElement>(".o2-satek-veci");
  const seznam = document.querySelector<HTMLElement>(".o2-satek-polozky");
  const celkemEl = document.querySelector<HTMLElement>(".o2-satek-celkem b");
  const zavazat = document.querySelector<HTMLAnchorElement>(".o2-zavazat");
  const rozvazat = document.querySelector<HTMLButtonElement>(".o2-rozvazat");
  const prazdno = document.querySelector<HTMLElement>(".o2-satek-prazdno");
  const kresba = document.querySelector<HTMLElement>(".o2-satek-kresba");
  const plovouci = document.querySelector<HTMLAnchorElement>(".o2-satek-tlacitko");
  const ikony = document.getElementById("o2-ikony") as HTMLTemplateElement | null;
  const jmeno = koren?.querySelector<HTMLInputElement>('input[name="jmeno"]');
  const mailEl = koren?.querySelector<HTMLInputElement>('input[name="email"]');
  const pozn = koren?.querySelector<HTMLTextAreaElement>('textarea[name="poznamka"]');
  const pasticka = koren?.querySelector<HTMLInputElement>('input[name="web"]');
  const zprava = koren?.querySelector<HTMLElement>(".o2-satek-zprava");
  let zavazano = false;
  let odesila = false;
  let satekVidet = false;
  let vzor: VzorSatku = vzorPodleId(nacti<string>(KLIC_VZOR, VYCHOZI_VZOR)) ?? vzory[0];

  /* ——— Látka ve 3D a balíky na ní ——— */
  const platno = kresba?.querySelector<HTMLCanvasElement>(".o2-satek-platno") ?? null;
  const vrstva = kresba?.querySelector<HTMLElement>(".o2-satek-vrstva") ?? null;
  let latka: Latka | null = null;
  if (platno && vrstva && kresba) {
    platno.hidden = false;
    latka = vytvorLatku(platno, { klid, maly: window.innerWidth < 700 || (navigator.hardwareConcurrency ?? 8) <= 4 });
    if (latka) {
      vrstva.hidden = false;
      kresba.classList.add("zive");
    } else platno.hidden = true;
  }
  /** Kusy pro látku v pořadí šátku; číslo na visačce je stejné jako na účtence */
  const kusyProLatku = (ids: string[]): KusNaSatku[] =>
    ids.slice(0, NEJVIC_BALIKU).map((id, i) => {
      const z = podleId.get(id)!;
      return { id, cislo: i + 1, tvar: z.tvar, nazev: z.nazev, foto: z.foto, seme: 0 };
    });
  let latkaZacala = false;
  /** Balíky na látce podle obsahu šátku; co se nevejde, je „+N“ */
  const kusyNaLatce = (ids: string[]) => {
    if (!latka || !vrstva) return;
    if (latkaZacala) latka.nastavKusy(kusyProLatku(ids));
    else {
      latkaZacala = true;
      void latka.start(kusyProLatku(ids));
    }
    vrstva.querySelector(".o2-satek-kus-vic")?.remove();
    if (ids.length > NEJVIC_BALIKU) {
      const t = document.createElement("span");
      t.className = "o2-satek-kus-vic";
      t.textContent = `+${ids.length - NEJVIC_BALIKU}`;
      vrstva.append(t);
    }
  };
  /* Najetí na balík prosvětlí řádek účtenky */
  latka?.priNajeti((id) => {
    seznam?.querySelectorAll<HTMLElement>(".o2-satek-polozka").forEach((li) => li.classList.toggle("najeto", li.dataset.id === id));
  });

  /* ——— Vzor šátku ——— */
  const vzorEl = koren?.querySelector<HTMLElement>(".o2-vzory");
  const nastavVzor = (v: VzorSatku, ulozit = true) => {
    vzor = v;
    if (ulozit) uloz(KLIC_VZOR, v.id);
    koren?.querySelectorAll<HTMLInputElement>('input[name="vzor"]').forEach((i) => (i.checked = i.value === v.id));
    /* Náhradní kresba */
    document.querySelectorAll(".o2-satek-lic").forEach((el) => el.setAttribute("fill", `url(#o2-vzor-${v.id})`));
    document.querySelectorAll(".o2-roh-rub").forEach((el) => el.setAttribute("fill", v.barva.rub));
    document.querySelector(".o2-satek-lem")?.setAttribute("stroke", v.barva.lem);
    document.querySelectorAll(".o2-uzel-latka").forEach((el) => {
      el.setAttribute("fill", `url(#o2-vzor-${v.id})`);
      el.setAttribute("stroke", v.barva.lem);
    });
    /* Význam pod vzorníkem a řádek na účtence */
    const vyznam = vzorEl?.querySelector(".o2-vzor-vyznam");
    if (vyznam) {
      vyznam.querySelector(".o2-vzor-kanji")!.textContent = v.kanji;
      vyznam.querySelector("b")!.textContent = v.nazev;
      vyznam.querySelector(".o2-vzor-text")!.textContent = v.vyznam;
    }
    const zab = koren?.querySelector(".o2-satek-zabal");
    if (zab) {
      zab.querySelector("b")!.textContent = v.nazev;
      zab.querySelector("span")!.textContent = v.kanji;
    }
    latka?.nastavVzor(v).catch((e) => console.warn("[šátek] vzor se nepodařilo nakreslit", e));
    ohlas("satek:zmena", { pocet: vSatku.size, vzor: v.id });
  };
  vzorEl?.addEventListener("change", (e) => {
    const v = vzorPodleId((e.target as HTMLInputElement).value);
    if (!v) return;
    nastavVzor(v);
    zvuk.latka();
    mail();
  });

  const ikona = (id: string) => ikony?.content.querySelector(`[data-ikona="${id}"]`)?.cloneNode(true) as SVGSVGElement | undefined;

  const obnovTlacitka = () => {
    document.querySelectorAll<HTMLButtonElement>("[data-satek-pridat]").forEach((b) => {
      const je = vSatku.has(b.dataset.satekId ?? "");
      /* Malá tlačítka na balících v krámku mají kratší nápisy (data-pridat / data-vyndat) */
      b.textContent = je ? (b.dataset.vyndat ?? "Vyndat ze šátku") : (b.dataset.pridat ?? "Do šátku");
      b.classList.toggle("v-satku", je);
    });
    document.querySelectorAll<HTMLElement>("[data-satek-kus]").forEach((p) => {
      const je = vSatku.has(p.dataset.satekKus ?? "");
      p.classList.toggle("v-satku", je);
      const s = p.querySelector<HTMLElement>("[data-v-satku]");
      if (s) s.hidden = !je;
    });
  };

  /* ——— Plovoucí tlačítko: jen když Vázička uzlík nenese (je schovaná do čárky, nebo tu není) ——— */
  let pruvodceSchovana = false;
  const vazickaNese = () => !!document.querySelector(".pruvodce") && !pruvodceSchovana && !document.querySelector(".pruvodce.schovana");
  const obnovPlovouci = () => {
    if (!plovouci) return;
    plovouci.hidden = vSatku.size === 0 || satekVidet || vazickaNese();
    const p = plovouci.querySelector("[data-satek-pocet]");
    if (p) p.textContent = String(vSatku.size);
    plovouci.setAttribute("aria-label", `Šátek: ${pocetKusu(vSatku.size)}`);
  };
  document.addEventListener("pruvodce:schovana", (e) => {
    pruvodceSchovana = !!(e as CustomEvent<{ schovana: boolean }>).detail?.schovana;
    obnovPlovouci();
  });

  const mail = () => {
    if (!zavazat) return;
    const polozky = [...vSatku].map((id) => podleId.get(id)!);
    if (!polozky.length) {
      zavazat.removeAttribute("href");
      zavazat.setAttribute("aria-disabled", "true");
      return;
    }
    const zasilkovna = koren?.querySelector<HTMLInputElement>('input[name="doprava"]:checked')?.value === "zasilkovna";
    const celkem = polozky.reduce((s, z) => s + z.cena, 0);
    const nazvy = polozky.map((z) => z.nazev);
    const predmet = `Obchod: ${nazvy.slice(0, 3).join(", ")}${nazvy.length > 3 ? ` a ${nazvy.length - 3} další` : ""}`;
    const radky = [
      "Ahoj, mám zájem o tyhle kusy:",
      "",
      ...polozky.map((z) => `– ${z.nazev} (${z.popis}) — ${z.cenaText}`),
      "",
      `Celkem: ${kc(celkem)}`,
      `Doprava: ${zasilkovna ? "Zásilkovnou" : "osobní odběr v dílně"}`,
      `Šátek: ${vzor.nazev} (${vzor.kanji})`,
      "",
      `Jméno: ${jmeno?.value.trim() ?? ""}`,
    ];
    if (pozn?.value.trim()) radky.push(`Poznámka: ${pozn.value.trim()}`);
    radky.push("", "Dejte mi prosím vědět, jestli jsou ještě k mání. Díky!");
    zavazat.href = `mailto:${email}?subject=${encodeURIComponent(predmet)}&body=${encodeURIComponent(radky.join("\n"))}`;
    zavazat.removeAttribute("aria-disabled");
  };

  const kresli = () => {
    const ids = [...vSatku];
    let celkem = 0;
    if (seznam) {
      seznam.textContent = "";
      ids.forEach((id, i) => {
        const z = podleId.get(id)!;
        celkem += z.cena;
        const li = document.createElement("li");
        li.className = "o2-satek-polozka";
        li.dataset.id = id;
        /* Obrázek s číslem, které má balík na visačce (jen kusy, které na šátek vejdou) */
        const obal = document.createElement("span");
        obal.className = "o2-satek-polozka-obal";
        const obr = ikona(id);
        if (obr) {
          obr.setAttribute("class", "o2-satek-polozka-obr");
          obr.setAttribute("aria-hidden", "true");
          obal.append(obr);
        }
        if (latka && i < NEJVIC_BALIKU) {
          const c = document.createElement("b");
          c.className = "o2-satek-polozka-cislo";
          c.setAttribute("aria-hidden", "true");
          c.textContent = String(i + 1);
          obal.append(c);
        }
        li.append(obal);
        const t = document.createElement("span");
        t.className = "o2-satek-polozka-text";
        const b = document.createElement("b");
        b.textContent = z.nazev;
        const s = document.createElement("small");
        s.textContent = z.popis;
        t.append(b, s);
        const c = document.createElement("span");
        c.className = "o2-satek-polozka-cena";
        c.textContent = z.cenaText;
        const x = document.createElement("button");
        x.type = "button";
        x.className = "o2-satek-pryc";
        x.setAttribute("aria-label", `Vyndat ze šátku: ${z.nazev}`);
        x.textContent = "×";
        x.addEventListener("click", () => prepni(id));
        li.append(t, c, x);
        /* Najetí na řádek prosvětlí balík na šátku */
        li.addEventListener("pointerenter", () => latka?.zvyrazni(id));
        li.addEventListener("pointerleave", () => latka?.zvyrazni(null));
        seznam.append(li);
      });
    }
    if (celkemEl) celkemEl.textContent = kc(celkem);

    /* Kusy na šátku: balíky na látce, nebo v náhradní kresbě mřížka až 3 × 3 uprostřed čtverce 108–292 */
    if (latka) kusyNaLatce(ids);
    else if (veci) {
      veci.textContent = "";
      const n = Math.min(ids.length, 9);
      const sloupce = n <= 1 ? 1 : n <= 4 ? 2 : 3;
      const vel = sloupce === 1 ? 128 : sloupce === 2 ? 84 : 58;
      const radku = Math.ceil(n / sloupce);
      ids.slice(0, 9).forEach((id, k) => {
        const obr = ikona(id);
        if (!obr) return;
        const r = Math.floor(k / sloupce);
        const c = k % sloupce;
        const vRadku = Math.min(sloupce, n - r * sloupce);
        obr.setAttribute("x", (200 - (vRadku * vel) / 2 + c * vel).toFixed(1));
        obr.setAttribute("y", (200 - (radku * vel) / 2 + r * vel).toFixed(1));
        obr.setAttribute("width", String(vel));
        obr.setAttribute("height", String(vel));
        obr.setAttribute("class", "o2-satek-vec");
        obr.style.setProperty("--z", `${k * 70}ms`);
        veci.append(obr);
      });
      if (ids.length > 9) {
        const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
        t.setAttribute("x", "284");
        t.setAttribute("y", "286");
        t.setAttribute("text-anchor", "end");
        t.setAttribute("class", "o2-satek-vic");
        t.textContent = `+${ids.length - 9}`;
        veci.append(t);
      }
    }
    if (prazdno) prazdno.hidden = ids.length > 0;
    kresba?.classList.toggle("prazdny", ids.length === 0);
    obnovPlovouci();
    mail();
    obnovTlacitka();
    ohlas("satek:zmena", { pocet: ids.length, vzor: vzor.id });
  };

  /** Kus odletí od tlačítka k šátku — nebo k Vázičce, která nese uzlík (záložně k plovoucímu tlačítku) */
  const odlet = (odkud: Element, id: string) => {
    if (klid) {
      ohlas("satek:pridano", { id, videt: satekVidet });
      return;
    }
    const obr = ikona(id);
    if (!obr) return;
    const a = odkud.getBoundingClientRect();
    const let_ = document.createElement("div");
    let_.className = "o2-let";
    let_.append(obr);
    document.body.append(let_);
    /* Cíl až o snímek později: Vázička na satek:zmena teprve ukazuje uzlík */
    requestAnimationFrame(() => {
      const cilEl = satekVidet
        ? latka
          ? platno
          : document.querySelector(".o2-satek-svg")
        : (document.querySelector(".pruvodce-satek:not([hidden])") ?? (plovouci && !plovouci.hidden ? plovouci : null));
      const b = cilEl?.getBoundingClientRect();
      const x0 = a.left + a.width / 2 - 28;
      const y0 = a.top - 40;
      const x1 = b ? b.left + b.width / 2 - 28 : x0;
      const y1 = b ? b.top + b.height / 2 - 28 : y0 - 120;
      let_.animate(
        [
          { transform: `translate(${x0}px, ${y0}px) scale(0.6) rotate(-8deg)`, opacity: 0 },
          { transform: `translate(${(x0 + x1) / 2}px, ${Math.min(y0, y1) - 90}px) scale(1.05) rotate(6deg)`, opacity: 1, offset: 0.45 },
          { transform: `translate(${x1}px, ${y1}px) scale(0.45) rotate(0deg)`, opacity: b ? 0.9 : 0 },
        ],
        { duration: 750, easing: "cubic-bezier(0.3, 0.7, 0.4, 1)" },
      ).onfinish = () => {
        let_.remove();
        ohlas("satek:pridano", { id, videt: satekVidet });
        if (cilEl === plovouci) {
          plovouci?.classList.remove("cinkne");
          void plovouci?.offsetWidth;
          plovouci?.classList.add("cinkne");
        }
      };
    });
  };

  const rekni = (co: string | ((el: HTMLElement) => void)) => {
    if (!zprava) return;
    if (typeof co === "string") zprava.textContent = co;
    else co(zprava);
    zprava.hidden = false;
  };

  const rozvaz = (zvukem = true) => {
    const bylo = zavazano;
    zavazano = false;
    kresba?.classList.remove("zavazano");
    if (latka && bylo) void latka.rozvaz();
    if (rozvazat) rozvazat.hidden = true;
    if (zprava) zprava.hidden = true;
    if (zvukem) zvuk.latka();
  };

  const prepni = (id: string, odkud?: Element) => {
    if (!podleId.has(id)) return;
    const pridat = !vSatku.has(id);
    if (pridat) {
      vSatku.add(id);
      zvuk.latka();
    } else {
      vSatku.delete(id);
      zvuk.papir();
    }
    /* Zavázaný šátek se při změně nejdřív rozváže (látka to udělá sama, tady jen stav a tlačítka) */
    if (zavazano) {
      zavazano = false;
      kresba?.classList.remove("zavazano");
      if (rozvazat) rozvazat.hidden = true;
      if (zprava) zprava.hidden = true;
    }
    uloz(KLIC, [...vSatku]);
    kresli();
    if (pridat && odkud) odlet(odkud, id);
  };

  document.addEventListener("click", (e) => {
    const b = (e.target as Element).closest<HTMLElement>("[data-satek-pridat]");
    if (!b?.dataset.satekId) return;
    prepni(b.dataset.satekId, b);
  });

  zavazat?.addEventListener("click", async (e) => {
    e.preventDefault();
    if (zavazat.getAttribute("aria-disabled") === "true" || odesila) return;
    /* Bez jména a e-mailu nevíme, komu odpovědět */
    const chybi = !jmeno?.value.trim() ? jmeno : !platnyEmail(mailEl?.value ?? "") ? mailEl : null;
    if (chybi) {
      rekni(chybi === jmeno ? "Napiš nám jméno, ať víme, komu šátek patří." : "Napiš nám e-mail, ať máme kam odpovědět.");
      chybi?.focus();
      return;
    }
    const zalozni = zavazat.href;
    odesila = true;
    zavazat.setAttribute("aria-busy", "true");
    zavazano = true;
    kresba?.classList.add("zavazano");
    if (zprava) zprava.hidden = true;
    zvuk.uzel();
    /* Objednávka letí, zatímco se šátek zavazuje; zpráva přijde, až je uzel hotový */
    const [odpoved] = await Promise.all([
      posliObjednavku({
        druh: "satek",
        kusy: [...vSatku],
        doprava: koren?.querySelector<HTMLInputElement>('input[name="doprava"]:checked')?.value ?? "odber",
        jmeno: jmeno?.value ?? "",
        email: mailEl?.value ?? "",
        poznamka: pozn?.value ?? "",
        vzor: vzor.id,
        web: pasticka?.value ?? "",
      }),
      latka ? latka.zavaz() : new Promise((hotovo) => window.setTimeout(hotovo, klid ? 0 : 1600)),
    ]);
    odesila = false;
    zavazat.removeAttribute("aria-busy");
    if (rozvazat) rozvazat.hidden = false;
    const adresa = (mailEl?.value ?? "").trim();
    if (odpoved.ok) {
      rekni(
        odpoved.naoko
          ? `Šátek je zavázaný a objednávka je u nás. Ozveme se na ${adresa}.`
          : `Šátek je zavázaný a objednávka je u nás. Potvrzení ti právě odešlo na ${adresa} — ozveme se kvůli platbě.`,
      );
      if (odpoved.naoko) console.info("[objednávka] naoko — server zatím maily neposílá");
    } else {
      rozvaz(false);
      rekni((el) => zaloha(el, proc(odpoved.chyba), email, zalozni));
    }
  });
  rozvazat?.addEventListener("click", () => rozvaz());
  koren?.querySelectorAll('input[name="doprava"]').forEach((r) => r.addEventListener("change", mail));
  jmeno?.addEventListener("input", mail);
  mailEl?.addEventListener("input", mail);
  pozn?.addEventListener("input", mail);

  const sekce = document.getElementById("satek");
  if (sekce) {
    new IntersectionObserver(([e]) => {
      /* Vidět je až pětina sekce — kousek nadpisu u spodního okraje Vázičce uzlík nevezme */
      satekVidet = e.isIntersecting && e.intersectionRatio >= 0.2;
      obnovPlovouci();
      ohlas("satek:videt", { videt: satekVidet });
    }, { threshold: 0.2 }).observe(sekce);
  }

  nastavVzor(vzor, false);
  kresli();
  /* Vázička se rozbíhá s hlavičkou a mohla se rozběhnout až po nás: po snímku jí to řekneme znovu, pak je jisté i to, jestli uzlík nese */
  requestAnimationFrame(() => {
    ohlas("satek:zmena", { pocet: vSatku.size, vzor: vzor.id });
    ohlas("satek:videt", { videt: satekVidet });
    obnovPlovouci();
  });
  return { ma: (id) => vSatku.has(id), prepni, obnovTlacitka };
}
