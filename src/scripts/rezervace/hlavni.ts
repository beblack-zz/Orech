/**
 * Rezervace: kolik vás pojede → den → odjezdy na tabuli → jízdenka →
 * e-mail. Jednotlivé kusy mají vlastní moduly:
 *
 *   more.ts      moře, trať a vlak na pozadí
 *   odjezdy.ts   klapková tabule s hodinami vybraného dne
 *   jizdenka.ts  jízdenka s vláčkem a označení
 *   simulace.ts  ukázková obsazenost (dokud nemáme skutečný kalendář)
 *
 * Tady je stav (den, kolik vás je, vybrané hodiny), dny jako lepenkové
 * jízdenky, displej nad dveřmi (co bude dál a co máš vybrané), dnešek
 * a příští volný odjezd na úvodní cedulce, obloha podle hodiny na tabuli
 * a odeslání. Dny i tabule se kreslí v prohlížeči, protože záleží na
 * dnešku — statický build by zestárl.
 *
 * Hodina je buď volná, nebo obsazená a zamlouvá se celá: kolik vás
 * pojede (1–4), mění jen cenu a jízdenku, ne to, co je volné.
 *
 * Celé se to spustí při každé návštěvě stránky, i po přechodu bez
 * načtení (parta2/prechody.ts) — proto je import přechodů první.
 */
import { stranka } from "../parta2/prechody";
import { spust, vyzadej, klid, nacti, uloz } from "../parta2/stav";
import { initNebe } from "../parta2/nebe";
import { hlavicka } from "../parta2/hlavicka";
import { Klapka, cesta } from "../parta2/klapka";
import * as zvuk from "../parta2/zvuk";
import { rezervace as R } from "../../data/rezervace";
import { sekkiDne, DNY_ZNAK } from "../../data/koyomi";
import { sklonuj } from "../../data/pocty";
import { simuluj } from "./simulace";
import type { Den } from "./simulace";
import { initMore } from "./more";
import { initOdjezdy, stavHodiny } from "./odjezdy";
import { initJizdenka, useky } from "./jizdenka";

const DNY = ["neděle", "pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota"];
const V_DEN = ["v neděli", "v pondělí", "v úterý", "ve středu", "ve čtvrtek", "v pátek", "v sobotu"];
const ZKR = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];
const MESICE = ["leden", "únor", "březen", "duben", "květen", "červen", "červenec", "srpen", "září", "říjen", "listopad", "prosinec"];
const MESICE_2 = ["ledna", "února", "března", "dubna", "května", "června", "července", "srpna", "září", "října", "listopadu", "prosince"];
const KLIC_POSLEDNI = "rezervace-posledni";

const kc = (n: number) => `${n.toLocaleString("cs-CZ")} Kč`;
const lidi = (n: number) => (n === 1 ? "1 člověk" : `${n} lidi`);
const hodin = (n: number) => sklonuj(n, "hodina", "hodiny", "hodin");
const dvoj = (x: number) => String(x).padStart(2, "0");
const datumKratce = (d: Date) => `${d.getDate()}. ${d.getMonth() + 1}.`;
const datumDlouze = (d: Date) => `${d.getDate()}. ${MESICE_2[d.getMonth()]}`;
const iso = (d: Date) => `${d.getFullYear()}-${dvoj(d.getMonth() + 1)}-${dvoj(d.getDate())}`;

interface Posledni {
  text: string;
  /** Den rezervace — po něm se vzkaz schová */
  den: string;
}

function init() {
  const koren = document.querySelector<HTMLElement>("[data-rezervace]");
  if (!koren) return;
  const email = koren.dataset.email ?? "";
  const cena = Number(koren.dataset.cena ?? R.cena);
  const dnyEl = koren.querySelector<HTMLElement>(".rz-dny")!;
  const sekceNebe = koren.querySelector<HTMLElement>("[data-rz-nebe]");
  const jmenoEl = koren.querySelector<HTMLInputElement>('input[name="jmeno"]')!;
  const telEl = koren.querySelector<HTMLInputElement>('input[name="telefon"]')!;
  const poznEl = koren.querySelector<HTMLTextAreaElement>('textarea[name="poznamka"]')!;
  const cenaEl = koren.querySelector<HTMLElement>(".rz-cena b")!;
  const vypocetEl = koren.querySelector<HTMLElement>(".rz-cena-vypocet");
  const odeslat = koren.querySelector<HTMLAnchorElement>(".rz-odeslat")!;
  const chybi = koren.querySelector<HTMLElement>(".rz-chybi");
  const dnesEl = koren.querySelector<HTMLElement>(".rz-dnes");
  const pristiEl = koren.querySelector<HTMLButtonElement>("[data-rz-nejblizsi]");
  const posledniEl = koren.querySelector<HTMLElement>(".rz-posledni");
  const displej = document.querySelector<HTMLElement>(".rz-displej");
  const displejSouhrn = displej?.querySelector<HTMLElement>(".rz-displej-souhrn");

  const dnes = new Date();
  dnes.setHours(0, 0, 0, 0);
  const dny = simuluj(dnes);
  let den = -1;
  let osob = 1;
  const vybrane = new Set<number>();
  let posledniVybrana: number | null = null;
  let jizdenkaVidet = false;

  const volnych = (d: Den) => d.hodiny.filter((h) => !h.probehlo && h.volno).length;

  /* ——— Obloha podle hodiny, na kterou se ukazuje ——— */

  let hNebe = Number(sekceNebe?.dataset.hodina ?? 10);
  let cilNebe = hNebe;
  let nebeBezi = false;
  const krokNebe = () => {
    const rozdil = cilNebe - hNebe;
    hNebe = Math.abs(rozdil) < 0.01 ? cilNebe : hNebe + rozdil * 0.14;
    sekceNebe!.dataset.hodina = hNebe.toFixed(3);
    vyzadej();
    if (hNebe !== cilNebe) requestAnimationFrame(krokNebe);
    else nebeBezi = false;
  };
  const nebeNa = (h: number) => {
    if (!sekceNebe) return;
    cilNebe = h;
    if (klid) {
      hNebe = h;
      sekceNebe.dataset.hodina = h.toFixed(3);
      vyzadej();
      return;
    }
    if (!nebeBezi) {
      nebeBezi = true;
      requestAnimationFrame(krokNebe);
    }
  };
  const nebeVychozi = () => {
    const d = dny[den];
    const h = posledniVybrana ?? d?.hodiny.find((x) => !x.probehlo && x.volno)?.h ?? 10;
    nebeNa(h + 0.5);
  };

  /* ——— Tabule a jízdenka ——— */

  const tabule = initOdjezdy({
    prepni: (h) => prepniHodinu(h),
    ukaz: (h) => (h === null ? nebeVychozi() : nebeNa(h + 0.5)),
  });
  const jizdenka = initJizdenka();

  /* ——— Dny: lepenkové jízdenky ——— */

  const kresliDny = () => {
    dnyEl.textContent = "";
    let mesic = -1;
    dny.forEach((d, i) => {
      if (d.datum.getMonth() !== mesic) {
        mesic = d.datum.getMonth();
        const m = document.createElement("p");
        m.className = "rz-mesic";
        m.setAttribute("aria-hidden", "true");
        m.textContent = MESICE[mesic];
        dnyEl.append(m);
      }
      const n = volnych(d);
      const pryc = d.hodiny.every((h) => h.probehlo);
      const stav = pryc ? "odjel" : "plno";
      const s = sekkiDne(d.datum);
      const vybrany = i === den;
      const b = document.createElement("button");
      b.type = "button";
      b.className = `rz-den den-${d.datum.getDay()}${n === 0 ? ` ${pryc ? "pryc" : "plno"}` : n <= 2 ? " malo" : ""}`;
      b.disabled = n === 0;
      b.setAttribute("aria-pressed", String(vybrany));
      b.innerHTML = `<span class="rz-den-pas"><span lang="ja">${DNY_ZNAK[d.datum.getDay()]}</span> ${DNY[d.datum.getDay()]}</span>
        <b class="rz-den-cislo">${d.datum.getDate()}</b>
        <span class="rz-den-mesic">${MESICE_2[d.datum.getMonth()]}</span>
        <span class="rz-den-sekki"><span lang="ja">${s.znak}</span> ${s.cesky}</span>
        <span class="rz-den-volno">${n === 0 ? (pryc ? "odjel" : "<span lang=\"ja\">満席</span> plno") : `${n <= 2 ? "△" : "○"} ${hodin(n)} volno`}</span>
        <span class="rz-den-dirka" aria-hidden="true"></span>`;
      b.setAttribute("aria-label", `${DNY[d.datum.getDay()]} ${datumDlouze(d.datum)}: ${n === 0 ? stav : `volno ${hodin(n)}`}`);
      b.addEventListener("click", () => {
        if (i !== den) vyberDen(i, true);
      });
      dnyEl.append(b);
    });
  };

  const vyberDen = (i: number, uzivatel = false) => {
    den = i;
    vybrane.clear();
    posledniVybrana = null;
    kresliDny();
    tabule?.zobraz(dny[den], osob, vybrane, true);
    obnovJizdenku(true);
    souhrn();
    if (uzivatel) {
      zvuk.spoust();
      dnyEl.querySelectorAll<HTMLButtonElement>(".rz-den")[i]?.focus({ preventScroll: true });
    }
    nebeVychozi();
  };

  const prepniHodinu = (h: number) => {
    const d = dny[den];
    if (!d) return;
    if (vybrane.has(h)) {
      vybrane.delete(h);
      posledniVybrana = vybrane.size ? Math.max(...vybrane) : null;
      zvuk.drevo(0.8);
    } else {
      const hod = d.hodiny.find((x) => x.h === h);
      if (!hod || stavHodiny(hod) !== "volno") return;
      vybrane.add(h);
      posledniVybrana = h;
      zvuk.drevo(1.15);
      window.setTimeout(() => zvuk.drevo(1.3), 90);
    }
    tabule?.radek(d, h, osob, vybrane.has(h));
    obnovJizdenku(true);
    souhrn();
    nebeVychozi();
  };

  const obnovJizdenku = (zmena: boolean) => jizdenka?.obnov({ den: dny[den], hodiny: [...vybrane], osob, cena }, zmena);

  /* ——— Souhrn, displej nad dveřmi a e-mail ——— */

  const souhrn = () => {
    const d = dny[den];
    const n = vybrane.size;
    const celkem = n * osob * cena;
    cenaEl.textContent = kc(celkem);
    if (vypocetEl) vypocetEl.textContent = n ? `${hodin(n)} × ${lidi(osob)} × ${kc(cena)}` : `${kc(cena)} za člověka a hodinu`;
    const hodiny = [...vybrane];
    const pripraveno = !!d && n > 0;

    if (displej && displejSouhrn) {
      displej.hidden = !pripraveno || jizdenkaVidet;
      displejSouhrn.textContent = pripraveno && d ? `${ZKR[d.datum.getDay()]} ${datumKratce(d.datum)} · ${useky(hodiny)} · ${lidi(osob)} · ${kc(celkem)}` : "";
    }
    if (!pripraveno || !d) {
      odeslat.removeAttribute("href");
      odeslat.setAttribute("aria-disabled", "true");
      return;
    }
    const kdy = `${DNY[d.datum.getDay()]} ${datumKratce(d.datum)} ${d.datum.getFullYear()}, ${useky(hodiny)}`;
    const predmet = `Rezervace: ${ZKR[d.datum.getDay()]} ${datumKratce(d.datum)} ${d.datum.getFullYear()}, ${useky(hodiny)}, ${lidi(osob)}`;
    const radky = [
      "Ahoj, chci si rezervovat hodinu v dílně:",
      "",
      kdy,
      `Počet lidí: ${osob}`,
      `Cena: ${kc(celkem)} (${kc(cena)} za člověka a hodinu)`,
      "",
      `Jméno: ${jmenoEl.value.trim()}`,
      `Telefon: ${telEl.value.trim()}`,
    ];
    if (poznEl.value.trim()) radky.push(`Poznámka: ${poznEl.value.trim()}`);
    radky.push("", "Díky!");
    odeslat.href = `mailto:${email}?subject=${encodeURIComponent(predmet)}&body=${encodeURIComponent(radky.join("\n"))}`;
    odeslat.removeAttribute("aria-disabled");
  };

  odeslat.addEventListener("click", (e) => {
    e.preventDefault();
    const d = dny[den];
    if (odeslat.getAttribute("aria-disabled") === "true" || !d) {
      if (chybi) chybi.textContent = !d ? "Nejdřív vyber den." : "Nejdřív vyber aspoň jeden odjezd na tabuli.";
      return;
    }
    if (!jmenoEl.value.trim()) {
      if (chybi) chybi.textContent = "Napiš na jízdenku jméno, ať víme, koho čekat.";
      const pole = jmenoEl.closest(".rz-listek-jmeno");
      pole?.classList.remove("chybi");
      void (pole as HTMLElement | null)?.offsetWidth;
      pole?.classList.add("chybi");
      jmenoEl.focus();
      return;
    }
    if (chybi) chybi.textContent = "";
    const href = odeslat.href;
    jizdenka?.oznac();
    uloz(KLIC_POSLEDNI, {
      text: `${DNY[d.datum.getDay()]} ${datumDlouze(d.datum)}, ${useky([...vybrane])} · ${lidi(osob)} · ${kc(vybrane.size * osob * cena)}`,
      den: iso(d.datum),
    } satisfies Posledni);
    ukazPosledni();
    window.setTimeout(() => {
      window.location.href = href;
    }, klid ? 0 : 1100);
  });

  const ukazPosledni = () => {
    if (!posledniEl) return;
    const p = nacti<Posledni | null>(KLIC_POSLEDNI, null);
    const platne = !!p && typeof p.text === "string" && typeof p.den === "string" && p.den >= iso(dnes);
    posledniEl.hidden = !platne;
    const t = posledniEl.querySelector(".rz-posledni-text");
    if (t && platne) t.textContent = p!.text;
  };

  jmenoEl.addEventListener("input", () => {
    if (chybi && jmenoEl.value.trim()) chybi.textContent = "";
    souhrn();
  });
  telEl.addEventListener("input", souhrn);
  poznEl.addEventListener("input", souhrn);

  koren.querySelectorAll<HTMLInputElement>('input[name="osoby"]').forEach((r) =>
    r.addEventListener("change", () => {
      /* Hodina je celá vaše, ať vás jede kolik chce — mění se jen cena a jízdenka */
      osob = Number(r.value);
      zvuk.cink();
      tabule?.zobraz(dny[den], osob, vybrane, false);
      obnovJizdenku(true);
      souhrn();
    }),
  );

  /* Displej se schová, když je jízdenka na obrazovce */
  const sekceJizdenky = document.getElementById("rz-jizdenka");
  if (sekceJizdenky && displej) {
    new IntersectionObserver(([e]) => {
      jizdenkaVidet = e.isIntersecting;
      souhrn();
    }, { threshold: 0.12 }).observe(sekceJizdenky);
  }

  /* ——— Dnešek a příští volný odjezd ——— */

  const nejblizsi = () => {
    for (let i = 0; i < dny.length; i++) {
      const h = dny[i].hodiny.find((x) => !x.probehlo && x.volno);
      if (h) return { i, h: h.h };
    }
    return null;
  };

  const pristiKlapky = pristiEl ? [...pristiEl.querySelectorAll<HTMLElement>("[data-flap]")].map((el) => new Klapka(el)) : [];
  const pristiPopis = pristiEl?.querySelector<HTMLElement>(".rz-pristi-popis");
  let pristiUkazano = false;

  /** zaklapat — cedulka přeběhne na nové hodnoty; klapky = false nechá cedulku být (zaklape později) */
  const dnesek = (zaklapat = false, klapky = true) => {
    const ted = new Date();
    const dd = ted.getDay();
    const hod = ted.getHours() + ted.getMinutes() / 60;
    let veta: string;
    if (R.dny.includes(dd) && hod < R.do) {
      veta = hod < R.od ? `Dnes je ${DNY[dd]} — dílna otevírá v ${R.od}:00.` : `Dnes je ${DNY[dd]} — dílna má otevřeno do ${R.do}:00.`;
    } else {
      veta = `Dnes je ${DNY[dd]}, dílna má zavřeno.`;
      for (let i = 1; i <= 7; i++) {
        const d = new Date(ted.getFullYear(), ted.getMonth(), ted.getDate() + i);
        if (R.dny.includes(d.getDay())) {
          veta += ` Příště otevírá ${V_DEN[d.getDay()]} ${datumDlouze(d)} v ${R.od}:00.`;
          break;
        }
      }
    }
    if (dnesEl) dnesEl.textContent = veta;

    const n = nejblizsi();
    if (!pristiEl) return;
    pristiEl.hidden = !n;
    if (!n) return;
    const d = dny[n.i].datum;
    if (pristiPopis) pristiPopis.textContent = `: ${V_DEN[d.getDay()]} ${datumDlouze(d)} v ${n.h}:00 — vybrat a přejít k tabuli`;
    pristiEl.setAttribute("aria-label", `Příští volný odjezd ${V_DEN[d.getDay()]} ${datumDlouze(d)} v ${n.h}:00. Nastoupit — vybrat ho a přejít k tabuli`);
    if (!klapky) return;
    const hodnoty = [ZKR[d.getDay()], ...`${dvoj(d.getDate())}${dvoj(d.getMonth() + 1)}${dvoj(n.h)}00`.split("")];
    pristiKlapky.forEach((kl, i) => {
      const cil = hodnoty[i] ?? "";
      if (kl.hodnota === cil) return;
      if (zaklapat && !klid) window.setTimeout(() => kl.nastav(cil, kl.cislice ? cesta(kl.hodnota, cil) : ["Po", "St", "Čt"]), i * 45);
      else kl.okamzite(cil);
    });
    if (zaklapat && !klid) zvuk.klapky(10);
  };

  pristiEl?.addEventListener("click", () => {
    const n = nejblizsi();
    if (!n) return;
    if (den !== n.i) vyberDen(n.i);
    if (!vybrane.has(n.h)) prepniHodinu(n.h);
    document.getElementById("rz-odjezdy")?.scrollIntoView({ behavior: klid ? "auto" : "smooth", block: "start" });
    window.setTimeout(() => tabule?.zamer(n.h), klid ? 0 : 600);
  });

  /* Cedulka v úvodu jednou zaklape, až je stránka načtená */
  if (pristiEl && !klid) {
    window.setTimeout(() => {
      if (pristiUkazano) return;
      pristiUkazano = true;
      dnesek(true);
    }, 900);
  }

  /* Rovnou otevřít první den, kde je něco volného */
  den = dny.findIndex((d) => volnych(d) > 0);
  kresliDny();
  tabule?.zobraz(dny[den], osob, vybrane, false);
  obnovJizdenku(false);
  souhrn();
  dnesek(false, klid);
  ukazPosledni();
  nebeVychozi();
}

stranka("rezervace", () => {
  hlavicka();
  initNebe();
  initMore();
  init();
  spust();
});
