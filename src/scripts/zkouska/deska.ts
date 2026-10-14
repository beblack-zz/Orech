/**
 * Deska sugoroku (components/zkouska/Deska.astro). Políčka podle postupu
 * (zamčené / na řadě / prošlé se známkou), figurka na prvním neprošlém
 * políčku, parta na cestě a stav v kartě vedle desky.
 *
 * Deska si pamatuje, co naposledy ukazovala. Když se okno úrovně zavře,
 * porovná to s postupem: nové razítko na políčko dopadne, kami se přidá
 * na cestu, figurka doskáče na další políčko a při povýšení se otočí.
 */
import { urovne, znamky, stupne, stupenPodlePoctu } from "../../data/mistr";
import type { UrovenId } from "../../data/mistr";
import { klid } from "../parta2/stav";
import * as zvuk from "../parta2/zvuk";
import { nactiPostup, zaznam, prosla, proslych, odemcena, kdeStoji, jeMistrem, ZMENA } from "./postup";
import { otevriUroven, ZAVRENO } from "./uroven";
import { otevriSesit } from "./sesit";
import { oznam } from "./oznameni";
import { jeOtevreno } from "./dvere";
import { schovej } from "../parta2/sber";

/** Figurka stojí kousek vlevo nad políčkem, ať nezakrývá znak */
const POSUN_KOMA = { x: -5.4, y: -4.6 };

export function initDeska() {
  const deska = document.querySelector<HTMLElement>(".msd");
  if (!deska) return;
  const koma = deska.querySelector<HTMLElement>(".msd-koma")!;
  const sin = deska.querySelector<HTMLAnchorElement>(".msd-sin")!;
  const hrat = deska.querySelector<HTMLButtonElement>(".msd-hrat")!;
  const pole = new Map(urovne.map((u) => [u.id, deska.querySelector<HTMLButtonElement>(`[data-pole="${u.id}"]`)!]));
  const kami = new Map(urovne.map((u) => [u.id, deska.querySelector<HTMLElement>(`[data-kami-pole="${u.id}"]`)!]));

  nactiPostup();
  /* Co deska ukazuje — z toho se po zavření okna pozná, co je nového */
  let ukazano = { kde: kdeStoji(), stupen: stupenPodlePoctu(proslych()), prosle: new Set(urovne.filter((u) => prosla(u.id)).map((u) => u.id)) };

  /** Kde je políčko (v procentech desky) — figurka se staví vedle */
  const kdeJe = (i: number) => {
    const el = i >= urovne.length ? sin : pole.get(urovne[i].id)!;
    return { x: parseFloat(el.style.left), y: parseFloat(el.style.top) };
  };
  const postavFigurku = (i: number) => {
    const { x, y } = kdeJe(i);
    koma.style.left = `${x + POSUN_KOMA.x}%`;
    koma.style.top = `${y + POSUN_KOMA.y}%`;
  };
  const nastavFigurku = (stupen: number, animuj: boolean) => {
    const obal = koma.querySelector<HTMLElement>(".msd-koma-obal")!;
    koma.classList.toggle("je-rub", stupen === 1);
    koma.classList.toggle("je-mistr", stupen === 2);
    /* Na mistra se lic přepíše na 名人 a kámen se otočí zpátky lícem */
    const lic = koma.querySelectorAll<SVGTextElement>(".msd-koma-lic text");
    const znak = stupen === 2 ? stupne[2].znak : stupne[0].znak;
    lic[0].textContent = znak[0];
    lic[1].textContent = znak[1];
    if (animuj && !klid) {
      obal.classList.remove("otaci");
      void obal.offsetWidth;
      obal.classList.add("otaci");
    }
  };

  const ukaz = () => {
    const kde = kdeStoji();
    const pocet = proslych();
    urovne.forEach((u, i) => {
      const b = pole.get(u.id)!;
      const z = zaznam(u.id);
      const otevreno = odemcena(i);
      b.classList.toggle("je-hotovo", !!z);
      b.classList.toggle("je-zamceno", !otevreno);
      b.classList.toggle("je-na-rade", otevreno && !z && i === kde);
      b.setAttribute("aria-disabled", String(!otevreno));
      b.dataset.znamka = z?.znamka ?? "";
      b.querySelector(".msd-pole-znamka use")?.setAttribute("href", `#mrz-znamka-${z?.znamka ?? "ka"}`);
      b.querySelector(".msd-pole-stav")!.textContent = z
        ? `Prošlo — ${znamky[z.znamka].znak} ${znamky[z.znamka].nazev}. Jde hrát znovu.`
        : otevreno
          ? "Na řadě."
          : `Zamčeno — nejdřív ${urovne[i - 1].cislo} ${urovne[i - 1].stanice}.`;
      b.setAttribute("aria-label", `${u.cislo} ${u.stanice}: ${u.nazev}`);
      kami.get(u.id)!.classList.toggle("je", !!z);
      deska.querySelector(`[data-teplo="${u.id}"]`)?.classList.toggle("je", !!z);
    });
    sin.classList.toggle("je-otevrena", jeMistrem());
    sin.setAttribute("aria-label", jeMistrem() ? "Síň mistra — mistrovský list" : `Síň mistra — otevře se po devíti razítkách, chybí ${urovne.length - pocet}`);

    const s = stupenPodlePoctu(pocet);
    deska.querySelector(".msd-stav-znak")!.textContent = s.znak;
    deska.querySelector(".msd-stav-nazev")!.textContent = s === stupne[2] ? "Mistr" : s.nazev;
    deska.querySelector(".msd-stav-pocet b")!.textContent = String(pocet);
    deska.classList.toggle("je-mistr", jeMistrem());
    hrat.textContent = jeMistrem()
      ? "Do síně mistra"
      : pocet === 0
        ? `Začít: ${urovne[0].cislo} ${urovne[0].stanice}`
        : `Pokračovat: ${urovne[kde].cislo} ${urovne[kde].stanice}`;
  };

  /** Figurka se postaví bez přechodu — jinak by při načtení přijela z rohu desky a otočila se */
  const hned = () => {
    koma.classList.add("hned");
    postavFigurku(ukazano.kde);
    nastavFigurku(stupne.indexOf(ukazano.stupen), false);
    requestAnimationFrame(() => requestAnimationFrame(() => koma.classList.remove("hned")));
  };

  /* Výchozí stav bez animace */
  ukaz();
  hned();

  /** Po zavření okna: co je nového, to se ukáže s parádou */
  const dohon = () => {
    nactiPostup();
    const kde = kdeStoji();
    const stupen = stupenPodlePoctu(proslych());
    const nove = urovne.filter((u) => prosla(u.id) && !ukazano.prosle.has(u.id)).map((u) => u.id);
    const odkud = ukazano.kde;
    const povyseni = stupen !== ukazano.stupen;
    ukaz();
    for (const id of nove) {
      const b = pole.get(id)!;
      b.classList.remove("ted");
      void b.offsetWidth;
      b.classList.add("ted");
      kami.get(id)!.classList.add("prisel");
    }
    if (nove.length) window.setTimeout(() => zvuk.razitko(), klid ? 0 : 350);

    /* Figurka skáče políčko po políčku */
    const kroky: number[] = [];
    if (kde > odkud) for (let i = odkud + 1; i <= kde; i++) kroky.push(i);
    else if (kde !== odkud) kroky.push(kde);
    let zpozdeni = klid ? 0 : 700;
    for (const i of kroky) {
      window.setTimeout(() => {
        koma.classList.remove("skace");
        void koma.offsetWidth;
        koma.classList.add("skace");
        postavFigurku(i);
        zvuk.drevo(1.2);
      }, zpozdeni);
      zpozdeni += klid ? 0 : 520;
    }
    if (povyseni) {
      window.setTimeout(() => {
        nastavFigurku(stupne.indexOf(stupen), true);
        zvuk.ki();
        window.setTimeout(() => zvuk.ki(0.7), 160);
        oznam(stupen === stupne[2] ? `${stupen.znak} — všech devět razítek. Síň mistra je otevřená.` : `Povýšení: ${stupen.znak} ${stupen.cteni}. Figurka se otočila.`);
      }, zpozdeni + 150);
    }
    ukazano = { kde, stupen, prosle: new Set(urovne.filter((u) => prosla(u.id)).map((u) => u.id)) };
  };
  document.addEventListener(ZAVRENO, dohon);
  /* Sešit jde vyprázdnit — pak se deska vrátí na začátek */
  document.addEventListener(ZMENA, (e) => {
    if (Object.keys((e as CustomEvent).detail ?? {}).length) return;
    nactiPostup();
    ukazano = { kde: kdeStoji(), stupen: stupenPodlePoctu(proslych()), prosle: new Set() };
    ukaz();
    hned();
  });

  /* ——— Klikání ——— */
  pole.forEach((b, id) => {
    b.addEventListener("click", () => {
      const i = urovne.findIndex((u) => u.id === id);
      if (!odemcena(i)) {
        oznam(`Zamčeno. Nejdřív ${urovne[i - 1].cislo} ${urovne[i - 1].stanice}.`);
        b.classList.remove("cuka");
        void b.offsetWidth;
        b.classList.add("cuka");
        zvuk.drevo(0.8);
        return;
      }
      otevriUroven(id as UrovenId);
    });
  });
  hrat.addEventListener("click", () => {
    if (jeMistrem()) {
      document.getElementById("sin")?.scrollIntoView({ behavior: klid ? "auto" : "smooth", block: "start" });
      return;
    }
    otevriUroven(urovne[kdeStoji()].id);
  });
  deska.querySelector(".msd-sesit")?.addEventListener("click", otevriSesit);
  sin.addEventListener("click", (e) => {
    if (jeMistrem()) return;
    e.preventDefault();
    oznam(`Síň mistra se otevře po devíti razítkách. Chybí ještě ${urovne.length - proslych()}.`);
  });

  /* Cedulka schovaná ve střeše síně — hra na hledání kami */
  deska.querySelectorAll<HTMLElement>("[data-skryty]").forEach(schovej);

  /* Na stránku se dá přijít i odkazem na úroveň: /zkouska#hrouda */
  const kotva = location.hash.slice(1) as UrovenId;
  const i = urovne.findIndex((u) => u.id === kotva);
  if (i >= 0 && odemcena(i) && jeOtevreno()) window.setTimeout(() => otevriUroven(kotva), 300);
}
