/**
 * Průvodce výběrem kurzu. Otázky jdou po jedné; po třetí se spočítá
 * shoda s každým vypsaným termínem a ukáže se nejlepší a dva další.
 * Doporučuje jen z termínů, které na stránce opravdu jsou.
 */
import { jmeno } from "../parta2/kami";
import * as zvuk from "../parta2/zvuk";
import type { PostavaId } from "../../data/parta";

interface Termin {
  i: number;
  nazev: string;
  datum: string;
  format: string;
  lektor: string;
  cena: string | null;
  stav: string;
  popis: string;
  patron: PostavaId | null;
  uroven: string[];
  cas: string[];
  kdo: string[];
}

const NAZVY = {
  uroven: { zacatek: "od nuly", trochu: "navazuje", pokrocily: "pro pokročilé" },
  cas: { den: "jeden den", vikend: "víkend", pravidelne: "pravidelně" },
  kdo: { ja: "pro tebe", dite: "s dítětem", parta: "s kamarády" },
} as const;

export function hledac() {
  const koren = document.querySelector<HTMLElement>("[data-hledac]");
  if (!koren) return;
  koren.classList.add("js-hledac");
  const kroky = [...koren.querySelectorAll<HTMLFieldSetElement>(".hledac-krok")];
  const tecky = [...koren.querySelectorAll<HTMLLIElement>(".hledac-tecky li")];
  const form = koren.querySelector<HTMLFormElement>(".hledac-form")!;
  const vysledek = koren.querySelector<HTMLElement>(".hledac-vysledek")!;
  const data: Termin[] = JSON.parse(koren.querySelector(".hledac-data")?.textContent ?? "[]");
  const patroni = koren.querySelector<HTMLElement>(".hledac-patroni")!;
  let krok = 0;

  const ukazKrok = (k: number, fokus = true) => {
    krok = k;
    kroky.forEach((f, i) => f.classList.toggle("je", i === k));
    tecky.forEach((t, i) => t.classList.toggle("je", i <= k));
    if (fokus) kroky[k]?.querySelector<HTMLInputElement>("input:checked, input")?.focus({ preventScroll: true });
  };

  const vyhodnot = () => {
    const odpoved = Object.fromEntries(new FormData(form)) as Record<"uroven" | "cas" | "kdo", string>;
    const body = data.map((t) => {
      const shody = {
        uroven: t.uroven.includes(odpoved.uroven),
        cas: t.cas.includes(odpoved.cas),
        kdo: t.kdo.includes(odpoved.kdo),
      };
      // Kurz šitý na jednu úroveň má při shodě přednost před kurzem „pro všechny“
      const presnost = shody.uroven ? (3 - t.uroven.length) * 0.4 : 0;
      const skore = (shody.uroven ? 3 : 0) + presnost + (shody.cas ? 2 : 0) + (shody.kdo ? 2 : 0) - (t.stav === "full" ? 1 : 0);
      return { t, shody, skore };
    });
    // Stejná nabídka ve dvou časech (Velký & Malý) se nemá doporučit dvakrát
    const videno = new Set<string>();
    const poradi = body
      .sort((a, b) => b.skore - a.skore || a.t.i - b.t.i)
      .filter((x) => (videno.has(x.t.nazev) ? false : (videno.add(x.t.nazev), true)));
    const [vitez, ...dalsi] = poradi;
    if (!vitez) return;

    const v = vitez.t;
    vysledek.querySelector(".hledac-nazev")!.textContent = v.nazev;
    vysledek.querySelector(".hledac-kdy")!.textContent = `${v.datum} · ${v.format} · vede ${v.lektor}`;
    vysledek.querySelector(".hledac-popis")!.textContent = v.popis;
    const shody = vysledek.querySelector(".hledac-shody")!;
    shody.textContent = "";
    (["uroven", "cas", "kdo"] as const).forEach((k) => {
      const li = document.createElement("li");
      const nazvy = NAZVY[k] as Record<string, string>;
      li.textContent = nazvy[odpoved[k]] ?? "";
      if (!vitez.shody[k]) li.className = "ne";
      shody.append(li);
    });
    const odkaz = vysledek.querySelector<HTMLAnchorElement>(".hledac-odkaz")!;
    odkaz.href = `#kurz-${v.i}`;
    odkaz.textContent = v.stav === "pripravujeme" ? "Ukázat jízdenku" : "Jít na jízdenku a zapsat se";

    const misto = vysledek.querySelector(".hledac-patron")!;
    misto.textContent = "";
    const obr = v.patron ? patroni.querySelector(`[data-patron="${v.patron}"] svg`) : null;
    if (obr) misto.append(obr.cloneNode(true));

    const seznam = vysledek.querySelector(".hledac-dalsi-seznam")!;
    seznam.textContent = "";
    dalsi.slice(0, 2).forEach(({ t }) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = `#kurz-${t.i}`;
      const n = document.createElement("b");
      n.textContent = t.nazev;
      const kdy = document.createElement("span");
      kdy.textContent = t.datum;
      a.append(n, kdy);
      li.append(a);
      seznam.append(li);
    });
    vysledek.querySelector<HTMLElement>(".hledac-dalsi")!.hidden = dalsi.length === 0;

    form.hidden = true;
    vysledek.hidden = false;
    tecky.forEach((t) => t.classList.add("je"));
    zvuk.nalezeno();
    vysledek.querySelector<HTMLElement>(".hledac-nazev")?.setAttribute("tabindex", "-1");
    vysledek.querySelector<HTMLElement>(".hledac-nazev")?.focus({ preventScroll: true });
    if (v.patron) vysledek.querySelector(".hledac-vitez .stitek")!.textContent = `Tvůj kurz · hlídá ho ${jmeno(v.patron)}`;
  };

  form.addEventListener("change", (e) => {
    const input = e.target as HTMLInputElement;
    if (input.type !== "radio") return;
    zvuk.cink();
    window.setTimeout(() => (krok < kroky.length - 1 ? ukazKrok(krok + 1) : vyhodnot()), 280);
  });
  koren.querySelectorAll(".hledac-zpet").forEach((b) => b.addEventListener("click", () => ukazKrok(Math.max(0, krok - 1))));
  koren.querySelector(".hledac-znovu")?.addEventListener("click", () => {
    form.reset();
    form.hidden = false;
    vysledek.hidden = true;
    ukazKrok(0);
  });

  ukazKrok(0, false);
}
