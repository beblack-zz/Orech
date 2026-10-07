/**
 * Šátek furoshiki — košík Obchodu 2. Pamatuje si, co v něm je
 * (localStorage, klíč obchod2-satek), kreslí kusy na rozprostřený šátek,
 * počítá cenu a skládá e-mail. Každé tlačítko „Do šátku“ má
 * data-satek-pridat a data-satek-id (v krámku i v detailu kusu); kus
 * v krámku má data-satek-kus, aby šlo poznat, že leží v šátku.
 *
 * Zavázání je jen obrázek: rohy šátku se přeloží, nahoře se udělá uzel
 * a pak se otevře e-mail. Stránka sama nic neodesílá.
 */
import { nacti, uloz, klid } from "../parta2/stav";
import { pocetKusu } from "../../data/pocty";
import * as zvuk from "../parta2/zvuk";

interface Zbozi {
  id: string;
  nazev: string;
  cena: number;
  cenaText: string;
  popis: string;
}

export interface Satek {
  ma: (id: string) => boolean;
  prepni: (id: string, odkud?: Element) => void;
  obnovTlacitka: () => void;
}

const KLIC = "obchod2-satek";
const kc = (n: number) => `${n.toLocaleString("cs-CZ")} Kč`;

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
  const pozn = koren?.querySelector<HTMLTextAreaElement>('textarea[name="poznamka"]');
  let zavazano = false;
  let satekVidet = false;

  const ikona = (id: string) => ikony?.content.querySelector(`[data-ikona="${id}"]`)?.cloneNode(true) as SVGSVGElement | undefined;

  const obnovTlacitka = () => {
    document.querySelectorAll<HTMLButtonElement>("[data-satek-pridat]").forEach((b) => {
      const je = vSatku.has(b.dataset.satekId ?? "");
      b.textContent = je ? "Vyndat ze šátku" : "Do šátku";
      b.classList.toggle("v-satku", je);
    });
    document.querySelectorAll<HTMLElement>("[data-satek-kus]").forEach((p) => {
      const je = vSatku.has(p.dataset.satekKus ?? "");
      p.classList.toggle("v-satku", je);
      const s = p.querySelector<HTMLElement>("[data-v-satku]");
      if (s) s.hidden = !je;
    });
  };

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
      for (const id of ids) {
        const z = podleId.get(id)!;
        celkem += z.cena;
        const li = document.createElement("li");
        li.className = "o2-satek-polozka";
        const obr = ikona(id);
        if (obr) {
          obr.setAttribute("class", "o2-satek-polozka-obr");
          obr.setAttribute("aria-hidden", "true");
          li.append(obr);
        }
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
        seznam.append(li);
      }
    }
    if (celkemEl) celkemEl.textContent = kc(celkem);

    /* Kusy na šátku: mřížka až 3 × 3 uprostřed čtverce 108–292 */
    if (veci) {
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
    if (plovouci) {
      plovouci.hidden = ids.length === 0 || satekVidet;
      const p = plovouci.querySelector("[data-satek-pocet]");
      if (p) p.textContent = String(ids.length);
      plovouci.setAttribute("aria-label", `Šátek: ${pocetKusu(ids.length)}`);
    }
    mail();
    obnovTlacitka();
  };

  /** Kus odletí od tlačítka k šátku (nebo k plovoucímu tlačítku) */
  const odlet = (odkud: Element, id: string) => {
    if (klid) return;
    const obr = ikona(id);
    if (!obr) return;
    const a = odkud.getBoundingClientRect();
    const cilEl = satekVidet ? document.querySelector(".o2-satek-svg") : plovouci && !plovouci.hidden ? plovouci : null;
    const b = cilEl?.getBoundingClientRect();
    const let_ = document.createElement("div");
    let_.className = "o2-let";
    let_.append(obr);
    document.body.append(let_);
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
      plovouci?.classList.remove("cinkne");
      void plovouci?.offsetWidth;
      plovouci?.classList.add("cinkne");
    };
  };

  const rozvaz = (zvukem = true) => {
    zavazano = false;
    kresba?.classList.remove("zavazano");
    if (rozvazat) rozvazat.hidden = true;
    if (zvukem) zvuk.latka();
  };

  const prepni = (id: string, odkud?: Element) => {
    if (!podleId.has(id)) return;
    if (vSatku.has(id)) {
      vSatku.delete(id);
      zvuk.papir();
    } else {
      vSatku.add(id);
      zvuk.latka();
      if (odkud) odlet(odkud, id);
    }
    if (zavazano) rozvaz(false);
    uloz(KLIC, [...vSatku]);
    kresli();
  };

  document.addEventListener("click", (e) => {
    const b = (e.target as Element).closest<HTMLElement>("[data-satek-pridat]");
    if (!b?.dataset.satekId) return;
    prepni(b.dataset.satekId, b);
  });

  zavazat?.addEventListener("click", (e) => {
    e.preventDefault();
    if (zavazat.getAttribute("aria-disabled") === "true") return;
    const href = zavazat.href;
    zavazano = true;
    kresba?.classList.add("zavazano");
    if (rozvazat) rozvazat.hidden = false;
    zvuk.uzel();
    window.setTimeout(() => {
      window.location.href = href;
    }, klid ? 0 : 1600);
  });
  rozvazat?.addEventListener("click", () => rozvaz());
  koren?.querySelectorAll('input[name="doprava"]').forEach((r) => r.addEventListener("change", mail));
  jmeno?.addEventListener("input", mail);
  pozn?.addEventListener("input", mail);

  const sekce = document.getElementById("satek");
  if (sekce) {
    new IntersectionObserver(([e]) => {
      satekVidet = e.isIntersecting;
      if (plovouci) plovouci.hidden = vSatku.size === 0 || satekVidet;
    }, { threshold: 0.2 }).observe(sekce);
  }

  kresli();
  return { ma: (id) => vSatku.has(id), prepni, obnovTlacitka };
}
