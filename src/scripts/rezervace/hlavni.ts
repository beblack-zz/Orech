/**
 * Rezervace: kolik vás pojede → den → odjezdy na tabuli → jízdenka →
 * e-mail. Jednotlivé kusy mají vlastní moduly:
 *
 *   more.ts      moře, trať a vlak na pozadí
 *   odjezdy.ts   klapková tabule s hodinami vybraného dne
 *   jizdenka.ts  jízdenka s vláčkem a označení
 *   darky.ts     dárkové jízdenky: tři ve vitríně, jméno, vzkaz a zabalení
 *   kalendar.ts  co je volné a kdo se dívá: skutečné rezervace z /api/volno,
 *                nebo ukázka ze simulace.ts, dokud nejsou zapojené
 *
 * Tady je stav (den, kolik vás je a co je na jízdence), dny jako lepenkové
 * jízdenky, přepážky permanentek a zvláštních vlaků, displej nad dveřmi (co bude dál a co máš vybrané), dnešek
 * a příští volný odjezd na úvodní cedulce, obloha podle hodiny na tabuli
 * a odeslání. Dny i tabule se kreslí v prohlížeči, protože záleží na
 * dnešku — statický build by zestárl.
 *
 * Na jízdence je vždycky jen jedna ze tří věcí:
 *
 *   odjezdy      po hodině a půl, každý s pár místy; kolik vás pojede (1–4),
 *                rozhoduje, kam se vejdete. Jízdné je skupinové podle toho,
 *                kolik lidí na odjezdu nakonec sedí, a platí se na místě —
 *                jízdenka proto ukazuje cenu „teď“, která už jen klesá
 *                (dětské jízdenky se spočítají až tam)
 *   kurz         zvláštní vlak na celý den s pár místy — tady se počítá,
 *                jestli se vaše skupina ještě vejde
 *   permanentka  první nebo poslední spoj dne na tři měsíce, taky s místy;
 *                je na jeden den v týdnu — na ten, který je vybraný
 *                (vybrané úterý = každé úterý), a tím dnem začíná platit
 *
 * Když si člověk vezme jednu, ostatní z jízdenky zmizí a tabule to ohlásí.
 *
 * Rezervovat smí jen člen: kdo se přihlásil e-mailem (jednorázový odkaz
 * nebo kód z mailu, prihlaseni.ts), jízdenku označí a má zamluveno
 * (/api/rezervuj); své jízdenky vidí dole v noci a může je tam zrušit.
 * Ostatní si můžou všechno projít a jízdenku si poskládat, ale tlačítko
 * je u nich registrace: skočí k cedulce nahoře, kde se zaregistrují
 * jménem a e-mailem, nebo přihlásí (Supabase). Bez skriptu je to telefon.
 *
 * Celé se to spustí při každé návštěvě stránky, i po přechodu bez
 * načtení (parta2/prechody.ts) — proto je import přechodů první.
 */
import { stranka, zaStranku } from "../parta2/prechody";
import { spust, vyzadej, klid } from "../parta2/stav";
import { initNebe } from "../parta2/nebe";
import { hlavicka } from "../parta2/hlavicka";
import { Klapka, cesta } from "../parta2/klapka";
import * as zvuk from "../parta2/zvuk";
import { rezervace as R, permanentka as P, hhmm, cenaOdjezdu, cenaZaCloveka, rozpisOdjezdu, cenaPermanentky } from "../../data/rezervace";
import { sekkiDne } from "../../data/koyomi";
import { sklonuj, zPoctu, volnaMista, jenMist, zbyvaMist } from "../../data/pocty";
import { volneHodiny, volnoVKurzu, platnostPermanentky } from "./simulace";
import type { Den } from "./simulace";
import { nactiKalendar, posli } from "./kalendar";
import type { Kalendar } from "./kalendar";
import type { Chyba, Moje } from "../../lib/rezervace/typy";
import { initMore } from "./more";
import { initOdjezdy, stavHodiny, volnoNaSpoji, KAZDY, NA_DNY } from "./odjezdy";
import type { Vyber } from "./odjezdy";
import { initJizdenka, useky } from "./jizdenka";
import { initDarky } from "./darky";
import { initPrihlaseni } from "./prihlaseni";
import { schovej } from "../parta2/sber";

const DNY = ["neděle", "pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota"];
const V_DEN = ["v neděli", "v pondělí", "v úterý", "ve středu", "ve čtvrtek", "v pátek", "v sobotu"];
const ZKR = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];
const MESICE = ["leden", "únor", "březen", "duben", "květen", "červen", "červenec", "srpen", "září", "říjen", "listopad", "prosinec"];
const MESICE_2 = ["ledna", "února", "března", "dubna", "května", "června", "července", "srpna", "září", "října", "listopadu", "prosince"];

const kc = (n: number) => `${n.toLocaleString("cs-CZ")} Kč`;
const lidi = (n: number) => (n === 1 ? "1 člověk" : `${n} lidi`);
const odjezdu = (n: number) => sklonuj(n, "hodina", "hodiny", "hodin");
const jizd = (n: number) => sklonuj(n, "týden", "týdny", "týdnů");
const dvoj = (x: number) => String(x).padStart(2, "0");
const datumKratce = (d: Date) => `${d.getDate()}. ${d.getMonth() + 1}.`;
const datumDlouze = (d: Date) => `${d.getDate()}. ${MESICE_2[d.getMonth()]}`;
const iso = (d: Date) => `${d.getFullYear()}-${dvoj(d.getMonth() + 1)}-${dvoj(d.getDate())}`;
const spojPermanentky = (h: number) => P.spoje.find((s) => s.h === h);
const spojeSlovy = (hodiny: number[]) => hodiny.map((h) => `${spojPermanentky(h)?.nazev ?? ""} ${hhmm(h)}–${hhmm(h + R.blok)}`).join(" a ");

function init(koren: HTMLElement, dnes: Date, prvni: Kalendar) {
  const dnyEl = koren.querySelector<HTMLElement>(".rz-dny")!;
  const sekceNebe = koren.querySelector<HTMLElement>("[data-rz-nebe]");
  const jmenoEl = koren.querySelector<HTMLInputElement>('input[name="jmeno"]')!;
  const poznEl = koren.querySelector<HTMLTextAreaElement>('textarea[name="poznamka"]')!;
  const cenaEl = koren.querySelector<HTMLElement>(".rz-cena b")!;
  const cenaStitek = koren.querySelector<HTMLElement>(".rz-cena span");
  const vypocetEl = koren.querySelector<HTMLElement>(".rz-cena-vypocet");
  const odeslat = koren.querySelector<HTMLAnchorElement>(".rz-odeslat")!;
  const odeslatPozn = koren.querySelector<HTMLElement>(".rz-pozn");
  const chybi = koren.querySelector<HTMLElement>(".rz-chybi");
  const dnesEl = koren.querySelector<HTMLElement>(".rz-dnes");
  const pristiEl = koren.querySelector<HTMLButtonElement>("[data-rz-nejblizsi]");
  const pristiKurzEl = koren.querySelector<HTMLButtonElement>("[data-rz-kurz-pristi]");
  const clenEl = koren.querySelector<HTMLElement>(".rz-clen");
  const hotovoEl = koren.querySelector<HTMLElement>(".rz-hotovo");
  const mojeEl = koren.querySelector<HTMLElement>(".rz-moje");
  const pasVolby = [...koren.querySelectorAll<HTMLButtonElement>("[data-pas]")];
  const pasPozn = koren.querySelector<HTMLElement>(".rz-pas-stav");
  const pasDen = koren.querySelector<HTMLElement>(".rz-pas-den");
  const zvlastniEl = koren.querySelector<HTMLElement>(".rz-zvlastni-vlaky");
  const zvlastniStav = koren.querySelector<HTMLElement>(".rz-zvlastni-stav");
  const displej = document.querySelector<HTMLElement>(".rz-displej");
  const displejSouhrn = displej?.querySelector<HTMLElement>(".rz-displej-souhrn");

  /* Kalendář se po zamluvení a zrušení načítá znovu — pole dnů zůstává, jen se přepíše */
  let kal = prvni;
  const dny = kal.dny;
  const pasDne = (d: Den | undefined) => kal.pas(d);
  const platnost = (od: Date) => platnostPermanentky(od, kal.jeKurz);
  /** Přihlášený člen: rezervuje rovnou, bez mailu */
  const clen = () => (kal.zive ? kal.clen : null);
  /* Cedulka nahoře: přihlášení e-mailem; po přihlášení i odhlášení se kalendář načte znovu */
  const prihlaseni = clenEl ? initPrihlaseni(clenEl, { zive: () => kal.zive, clen, poZmene: () => obnovKalendar(dny[den]?.klic) }) : null;
  let den = -1;
  let osob = 1;
  /* Co je na jízdence: hodiny, nebo spoje permanentky, nebo zvláštní vlak — vždycky jen jedno */
  const vybrane = new Set<number>();
  const pasy = new Set<number>();
  let kurzVybran = false;
  let posledniVybrana: number | null = null;
  let jizdenkaVidet = false;

  const vyber = (): Vyber => ({ osob, hodiny: vybrane, pasy, kurz: kurzVybran, pasObsazeno: pasDne(dny[den]) });
  const druh = () => (kurzVybran ? "kurz" : pasy.size ? "pas" : "hodiny");
  /** Kolik odjezdů toho dne je volných pro vás všechny */
  const volnych = (d: Den) => volneHodiny(d, osob).length;
  /** Spoje permanentky, na které se ten den dá nastoupit a je na nich ještě místo */
  const volnePasy = (d: Den) => (d.kurz ? [] : d.hodiny.filter((h) => h.pas && !h.probehlo && volnoNaSpoji({ pasObsazeno: pasDne(d) }, h.h) > 0));
  /** Dá se ten den vůbec něco koupit? */
  const jdeVybrat = (d: Den) => (d.kurz ? volnoVKurzu(d.kurz) > 0 : volnych(d) > 0 || volnePasy(d).length > 0);
  /** První den, kde je volná hodina — a kdyby žádná nebyla, první, kde jde koupit aspoň něco */
  const vychoziDen = () => {
    const i = dny.findIndex((d) => volnych(d) > 0);
    return i >= 0 ? i : dny.findIndex(jdeVybrat);
  };

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
    /* Zvláštní vlak jede celý den — když se na nic neukazuje, je nad mořem poledne */
    const h = d?.kurz ? 12 : posledniVybrana ?? (d ? volneHodiny(d, osob)[0]?.h : undefined) ?? 10;
    nebeNa(h + R.blok / 2);
  };

  /* ——— Tabule a jízdenka ——— */

  const tabule = initOdjezdy({
    prepni: (h) => prepniHodinu(h),
    kurz: () => prepniKurz(),
    ukaz: (h) => (h === null ? nebeVychozi() : nebeNa(h + R.blok / 2)),
  });
  const jizdenka = initJizdenka();

  /* ——— Cedule pod tabulí: jeden list podle toho, co je v pokladně vybrané ——— */

  const cedule = document.querySelector<HTMLElement>("#rz-rad .rz-rad-cedule");
  const listy = [...document.querySelectorAll<HTMLElement>("#rz-rad [data-vysvetlivka]")];
  /** Zvláštní vlak ukáže svůj kurz, permanentka na jízdence průkazku, jinak hodina a půl. S listem se mění jméno i vzhled cedule. */
  const vysvetli = () => {
    const d = dny[den];
    const klic = d?.kurz ? `kurz-${d.kurz.kurz.id}` : pasy.size ? "pas" : "hodina";
    const list = listy.find((l) => l.dataset.vysvetlivka === klic) ?? listy[0];
    if (!cedule || !list || !list.hidden) return;
    for (const l of listy) l.hidden = l !== list;
    cedule.dataset.druh = list.dataset.druh ?? "";
    const titul = cedule.querySelector("#rz-rad-nadpis");
    const pod = cedule.querySelector(".rz-rad-ted");
    if (titul) titul.textContent = list.dataset.titul ?? "";
    if (pod) pod.textContent = list.dataset.pod ?? "";
  };

  /* ——— Dny: lepenkové jízdenky ——— */

  /** Sobotní zvláštní vlak mezi dny není — má přepážku pod permanentkami. Jízdenku má jen den, kdy je jinak otevřeno. */
  const maJizdenku = (d: Den) => R.dny.includes(d.datum.getDay());

  const kresliDny = () => {
    dnyEl.textContent = "";
    let mesic = -1;
    dny.forEach((d, i) => {
      if (!maJizdenku(d)) return;
      if (d.datum.getMonth() !== mesic) {
        mesic = d.datum.getMonth();
        const m = document.createElement("p");
        m.className = "rz-mesic";
        m.setAttribute("aria-hidden", "true");
        m.textContent = MESICE[mesic];
        dnyEl.append(m);
      }
      const dt = d.datum.getDay();
      const vybrany = i === den;
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.den = String(i);
      b.setAttribute("aria-pressed", String(vybrany));
      b.disabled = !jdeVybrat(d);
      /* Každý otevírací den má svůj sloupec: úterý vlevo, pátek vpravo */
      b.style.gridColumn = String(R.dny.indexOf(dt) + 1);

      if (d.kurz) {
        /* Den kurzu: tmavá jízdenka na zvláštní vlak, místa se počítají */
        const k = d.kurz;
        const volna = volnoVKurzu(k);
        const stav = k.probehlo ? "odjel" : volna === 0 ? "plno" : `${volnaMista(volna)} ${zPoctu(k.kurz.mist)}`;
        b.className = `rz-den kurz${volna === 0 ? (k.probehlo ? " pryc" : " plno") : volna <= 2 ? " malo" : ""}`;
        b.innerHTML = `<span class="rz-den-pas">zvláštní vlak</span>
          <b class="rz-den-cislo">${d.datum.getDate()}</b>
          <span class="rz-den-mesic">${MESICE_2[d.datum.getMonth()]} · ${DNY[dt]}</span>
          <span class="rz-den-sekki">${k.kurz.nazev}</span>
          <span class="rz-den-volno">${k.probehlo ? "odjel" : volna === 0 ? "plno" : `${volna <= 2 ? "△" : "○"} ${stav}`}</span>
          <span class="rz-den-dirka" aria-hidden="true"></span>`;
        b.setAttribute("aria-label", `${DNY[dt]} ${datumDlouze(d.datum)}: zvláštní vlak, kurz ${k.kurz.nazev} na celý den, ${stav}`);
      } else {
        const n = volnych(d);
        const pas = volnePasy(d).length > 0;
        const pryc = d.hodiny.every((h) => h.probehlo);
        const stav = n > 0 ? `volno ${odjezdu(n)}` : pas ? "volno jen na permanentku" : pryc ? "odjel" : "plno";
        const s = sekkiDne(d.datum);
        b.className = `rz-den den-${dt}${n === 0 ? (pas ? " malo" : pryc ? " pryc" : " plno") : n <= 2 ? " malo" : ""}`;
        b.innerHTML = `<span class="rz-den-pas">${DNY[dt]}</span>
          <b class="rz-den-cislo">${d.datum.getDate()}</b>
          <span class="rz-den-mesic">${MESICE_2[d.datum.getMonth()]}</span>
          <span class="rz-den-sekki">${s.cesky}</span>
          <span class="rz-den-volno">${n > 0 ? `${n <= 2 ? "△" : "○"} ${odjezdu(n)} volno` : pas ? "△ jen permanentka" : pryc ? "odjel" : "plno"}</span>
          <span class="rz-den-dirka" aria-hidden="true"></span>`;
        b.setAttribute("aria-label", `${DNY[dt]} ${datumDlouze(d.datum)}: ${stav}`);
      }
      b.addEventListener("click", () => {
        if (i !== den) vyberDen(i, true);
      });
      dnyEl.append(b);
    });
    dnyEl.classList.toggle("ma-kalendar", mqKalendar.matches);
    if (mqKalendar.matches) kresliKalendar();
  };

  /* Telefon: místo pásu všech dní jen vybraný (nejbližší) den a vedle kalendář
     po týdnech — otevírací dny se dají ťuknout, stav berou z jízdenek (rezervace.css, .ma-kalendar) */
  const mqKalendar = matchMedia("(max-width: 760px)");
  mqKalendar.addEventListener("change", () => kresliDny());
  const PO_NE = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];
  const kresliKalendar = () => {
    const listky = new Map<number, HTMLButtonElement>();
    dnyEl.querySelectorAll<HTMLButtonElement>(".rz-den").forEach((b) => listky.set(Number(b.dataset.den), b));
    const otevrene = dny.flatMap((d, i) => (maJizdenku(d) ? [{ d, i }] : []));
    if (!otevrene.length) return;
    const klic = (t: Date) => `${t.getFullYear()}-${t.getMonth()}-${t.getDate()}`;
    const podleData = new Map(otevrene.map((o) => [klic(o.d.datum), o]));
    const od = new Date(otevrene[0].d.datum);
    od.setDate(od.getDate() - ((od.getDay() + 6) % 7));
    const doDne = new Date(otevrene[otevrene.length - 1].d.datum);
    doDne.setDate(doDne.getDate() + ((7 - doDne.getDay()) % 7));
    const kal = document.createElement("div");
    kal.className = "rz-kal";
    kal.setAttribute("role", "group");
    kal.setAttribute("aria-label", "Kalendář — jiný den");
    const mesice = [...new Set(otevrene.map((o) => o.d.datum.getMonth()))].map((m) => MESICE[m]).join(" – ");
    kal.innerHTML = `<p class="rz-kal-mesic" aria-hidden="true">${mesice}</p>` + PO_NE.map((d) => `<span class="rz-kal-hlava" aria-hidden="true">${d}</span>`).join("");
    for (const t = new Date(od); t <= doDne; t.setDate(t.getDate() + 1)) {
      const o = podleData.get(klic(t));
      const prvni = t.getDate() === 1;
      if (!o) {
        const s = document.createElement("span");
        s.className = `rz-kal-den prazdny${prvni ? " prvni" : ""}`;
        s.setAttribute("aria-hidden", "true");
        s.textContent = prvni ? `1. ${t.getMonth() + 1}.` : String(t.getDate());
        kal.append(s);
        continue;
      }
      const listek = listky.get(o.i);
      const stav = listek ? ["kurz", "plno", "malo", "pryc"].filter((c) => listek.classList.contains(c)) : [];
      const b = document.createElement("button");
      b.type = "button";
      b.className = ["rz-kal-den", ...stav, o.d.datum.getDay() === 5 ? "den-5" : ""].filter(Boolean).join(" ");
      b.textContent = String(t.getDate());
      b.disabled = listek?.disabled ?? true;
      b.setAttribute("aria-pressed", String(o.i === den));
      b.setAttribute("aria-label", listek?.getAttribute("aria-label") ?? String(t.getDate()));
      b.addEventListener("click", () => {
        if (o.i !== den) vyberDen(o.i, true);
      });
      kal.append(b);
    }
    dnyEl.append(kal);
  };

  /** Permanentky v pokladně: dva spoje, kolik na nich zbývá a jestli jeden z nich bereš */
  const kresliPermanentky = () => {
    const d = dny[den];
    pasVolby.forEach((b) => {
      const h = Number(b.dataset.pas);
      const mam = pasy.has(h);
      const obsazeno = pasDne(d).get(h) ?? 0;
      const volna = P.mist - obsazeno;
      const hod = d?.hodiny.find((x) => x.h === h);
      const nejede = !d || !!d.kurz || !hod || hod.probehlo;
      b.disabled = !mam && (nejede || volna < osob);
      b.setAttribute("aria-pressed", String(mam));
      b.classList.toggle("plno", volna === 0);
      b.querySelectorAll<SVGSVGElement>(".rz-sedacka").forEach((el, i) =>
        el.setAttribute("class", `rz-sedacka${i < obsazeno ? " obs" : mam && i < obsazeno + osob ? " moje" : " pas"}`),
      );
      const stav = b.querySelector<HTMLElement>(".rz-pas-volno");
      const text = mam ? "na jízdence" : volna === 0 ? "rozebráno" : volna < osob ? jenMist(volna) : `${volnaMista(volna)} ${zPoctu(P.mist)}`;
      if (stav) stav.textContent = text;
      const spoj = spojPermanentky(h);
      b.setAttribute("aria-label", `Permanentka ${d && R.dny.includes(d.datum.getDay()) ? `${NA_DNY[d.datum.getDay()]} ` : ""}na ${spoj?.nazev ?? ""} hodinu ${hhmm(h)} až ${hhmm(h + R.blok)}, ${text}`);
    });
    /* Na který den v týdnu permanentka je, říká vybraný den — jiný se vybere o krok výš */
    const denPasu = !!d && R.dny.includes(d.datum.getDay());
    if (pasDen) pasDen.textContent = d && denPasu ? NA_DNY[d.datum.getDay()] : "";
    if (pasPozn) {
      const jine = d ? R.dny.filter((x) => x !== d.datum.getDay()).map((x) => NA_DNY[x]) : [];
      const jinam = jine.length ? ` ${jine.join(" nebo ").replace(/^n/, "N")} si nahoře vyber jiný den.` : "";
      pasPozn.textContent = !d
        ? ""
        : !denPasu
          ? `Permanentka je ${R.dny.map((x) => NA_DNY[x]).join(" nebo ")} — vyber si nahoře jeden z těch dnů.`
          : d.kurz
            ? "V den kurzu je výluka — permanentka se začíná jiným dnem."
          : `Platila by ${KAZDY[d.datum.getDay()]} od ${datumDlouze(d.datum)} do ${datumDlouze(platnost(d.datum).do)}.${jinam}`;
    }
  };

  /* ——— Přepážka zvláštních vlaků: nejbližší kurzy, které ještě nevyjely ——— */

  const zvlastni: { i: number; b: HTMLButtonElement; mista: SVGSVGElement[]; volno: HTMLElement }[] = [];
  const postavZvlastni = () => {
    if (!zvlastniEl) return;
    zvlastniEl.textContent = "";
    zvlastni.length = 0;
    /* nejbližší, které ještě nevyjely — víc než pár jich naráz vypsaných nebývá */
    const vypsane = dny.map((d, i) => ({ d, i })).filter((x) => x.d.kurz && !x.d.kurz.probehlo).slice(0, R.kurzuNaraz);
    if (!vypsane.length) {
      const nic = document.createElement("p");
      nic.className = "rz-zvlastni-nic";
      nic.textContent = "Teď není žádný vypsaný. Až bude, objeví se tady.";
      zvlastniEl.append(nic);
      return;
    }
    for (const { d, i } of vypsane) {
      const c = d.kurz!.kurz;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "rz-zvlastni-volba";
      b.dataset.den = String(i);
      b.innerHTML = `<span class="rz-zvlastni-hlava">${DNY[d.datum.getDay()]} ${datumDlouze(d.datum)}</span>
        <b class="rz-zvlastni-nazev">${c.nazev}</b>
        <span class="rz-zvlastni-emblem" aria-hidden="true">${c.emblem}</span>
        <span class="rz-zvlastni-mista" aria-hidden="true">${`<svg class="rz-sedacka" viewBox="0 0 16 18"><use href="#rz-sedacka" /></svg>`.repeat(c.mist)}</span>
        <span class="rz-zvlastni-volno"></span>`;
      b.addEventListener("click", () => {
        if (i !== den) vyberDen(i, true);
      });
      zvlastniEl.append(b);
      zvlastni.push({ i, b, mista: [...b.querySelectorAll<SVGSVGElement>(".rz-sedacka")], volno: b.querySelector<HTMLElement>(".rz-zvlastni-volno")! });
    }
  };
  /** Karty vlaků: kolik je kde místa, který je vybraný a jestli v něm sedíš */
  const kresliZvlastni = () => {
    for (const z of zvlastni) {
      const k = dny[z.i].kurz!;
      const volna = volnoVKurzu(k);
      const vybrany = z.i === den;
      const mam = vybrany && kurzVybran;
      z.b.setAttribute("aria-pressed", String(vybrany));
      z.b.disabled = !vybrany && volna === 0;
      z.b.classList.toggle("plno", volna === 0);
      z.mista.forEach((el, s) => el.setAttribute("class", `rz-sedacka${s < k.obsazeno ? " obs" : mam && s < k.obsazeno + osob ? " moje" : ""}`));
      const text = mam ? "na jízdence" : volna === 0 ? "plno" : volna < osob ? jenMist(volna) : `${volnaMista(volna)} ${zPoctu(k.kurz.mist)}`;
      z.volno.textContent = text;
      z.b.setAttribute("aria-label", `Zvláštní vlak ${k.kurz.nazev}, ${DNY[dny[z.i].datum.getDay()]} ${datumDlouze(dny[z.i].datum)}, kurz na celý den: ${text}`);
    }
    if (zvlastniStav) {
      const k = dny[den]?.kurz;
      zvlastniStav.textContent = !k ? "" : kurzVybran ? `${k.kurz.nazev} máš na jízdence.` : "Trať je na tabuli — nastup tam.";
    }
  };

  const vyberDen = (i: number, uzivatel = false) => {
    den = i;
    vybrane.clear();
    pasy.clear();
    kurzVybran = false;
    posledniVybrana = null;
    kresliDny();
    kresliPermanentky();
    kresliZvlastni();
    vysvetli();
    tabule?.hlas("");
    tabule?.zobraz(dny[den], vyber(), true);
    obnovJizdenku(true);
    souhrn();
    if (uzivatel) {
      if (hotovoEl) hotovoEl.textContent = "";
      zvuk.spoust();
      /* Zvláštní vlak ohlásí staniční rozhlas */
      if (dny[den]?.kurz) window.setTimeout(() => zvuk.rozhlas(), 260);
      koren.querySelector<HTMLButtonElement>(`.rz-pokladna [data-den="${i}"]`)?.focus({ preventScroll: true });
    }
    nebeVychozi();
  };

  /** Po každé změně toho, co je na jízdence */
  const poZmene = () => {
    if (hotovoEl) hotovoEl.textContent = "";
    kresliPermanentky();
    kresliZvlastni();
    vysvetli();
    obnovJizdenku(true);
    souhrn();
    nebeVychozi();
  };

  const prepniHodinu = (h: number) => {
    const d = dny[den];
    if (!d || d.kurz) return;
    const hod = d.hodiny.find((x) => x.h === h);
    if (!hod) return;
    if (hod.pas) return prepniPermanentku(h);
    if (vybrane.has(h)) {
      vybrane.delete(h);
      posledniVybrana = vybrane.size ? Math.max(...vybrane) : null;
      zvuk.drevo(0.8);
    } else {
      if (stavHodiny(hod, osob) !== "volno") return;
      if (pasy.size) {
        const stare = [...pasy];
        pasy.clear();
        stare.forEach((x) => tabule?.radek(d, x, vyber()));
        tabule?.hlas("Permanentku jsem z jízdenky vyndal — na jedné jízdence jsou buď hodiny v dílně, nebo permanentka.");
      }
      vybrane.add(h);
      posledniVybrana = h;
      zvuk.drevo(1.15);
      window.setTimeout(() => zvuk.drevo(1.3), 90);
    }
    tabule?.radek(d, h, vyber());
    poZmene();
  };

  const prepniPermanentku = (h: number) => {
    const d = dny[den];
    const hod = d?.hodiny.find((x) => x.h === h);
    if (!d || d.kurz || !hod) return;
    if (pasy.has(h)) {
      pasy.delete(h);
      posledniVybrana = pasy.size ? Math.max(...pasy) : null;
      zvuk.drevo(0.8);
    } else {
      if (hod.probehlo || volnoNaSpoji({ pasObsazeno: pasDne(d) }, h) < osob) return;
      if (vybrane.size) {
        const stare = [...vybrane];
        vybrane.clear();
        stare.forEach((x) => tabule?.radek(d, x, vyber()));
        tabule?.hlas("Hodiny jsem z jízdenky vyndal — na jedné jízdence jsou buď hodiny v dílně, nebo permanentka.");
      }
      pasy.add(h);
      posledniVybrana = h;
      zvuk.drevo(1.15);
      window.setTimeout(() => zvuk.cink(), 110);
    }
    tabule?.radek(d, h, vyber());
    poZmene();
  };

  const prepniKurz = () => {
    const d = dny[den];
    if (!d?.kurz) return;
    if (kurzVybran) {
      kurzVybran = false;
      zvuk.drevo(0.8);
    } else {
      if (volnoVKurzu(d.kurz) < osob) return;
      kurzVybran = true;
      zvuk.para();
      window.setTimeout(() => zvuk.drevo(1.15), 120);
    }
    tabule?.zobraz(d, vyber(), false);
    poZmene();
  };

  const obnovJizdenku = (zmena: boolean) => {
    const d = dny[den];
    jizdenka?.obnov(
      {
        den: d,
        hodiny: [...vybrane],
        osob,
        kurz: kurzVybran ? d?.kurz : undefined,
        pas: d && pasy.size ? { spoje: [...pasy].sort((a, b) => a - b), platnost: platnost(d.datum), obsazeno: pasDne(d) } : undefined,
        hned: !!clen(),
      },
      zmena,
    );
  };

  /* ——— Souhrn a displej nad dveřmi ——— */

  /** Co je na jízdence slovy a v korunách — podle toho, co člověk vybral */
  const sepis = () => {
    const d = dny[den];
    if (!d) return null;
    const zkratka = `${ZKR[d.datum.getDay()]} ${datumKratce(d.datum)}`;
    if (kurzVybran && d.kurz) {
      const c = d.kurz.kurz;
      const celkem = osob * c.cena;
      return {
        celkem,
        vypocet: `${lidi(osob)} × ${kc(c.cena)} za celý den`,
        kratce: `${zkratka} · ${c.nazev} · ${lidi(osob)} · ${kc(celkem)}`,
      };
    }
    if (pasy.size) {
      const spoje = [...pasy].sort((a, b) => a - b);
      const pl = platnost(d.datum);
      const pocet = pl.jizdy.filter((j) => !j.vyluka).length;
      const zaSpoj = cenaPermanentky(pocet);
      const celkem = spoje.length * osob * zaSpoj;
      return {
        celkem,
        vypocet: `${spoje.length > 1 ? `${spoje.length} hodiny × ` : ""}${lidi(osob)} × ${jizd(pocet)} po ${kc(P.cenaJizdy)}`,
        kratce: `Permanentka ${NA_DNY[d.datum.getDay()]} · ${spojeSlovy(spoje)} · od ${datumKratce(d.datum)} · ${lidi(osob)} · ${kc(celkem)}`,
      };
    }
    if (!vybrane.size) return null;
    const hodiny = [...vybrane].sort((a, b) => a - b);
    /* Jízdné podle toho, kolik lidí na odjezdu už sedí; platí se na místě a s každým dalším klesá */
    const ostatni = (h: number) => R.mist - (d.hodiny.find((x) => x.h === h)?.volno ?? R.mist);
    const celkem = hodiny.reduce((a, h) => a + cenaOdjezdu(osob, ostatni(h)), 0);
    const nejmin = hodiny.length * cenaOdjezdu(osob, R.mist - osob);
    const klesne = celkem > nejmin;
    const ted = hodiny.length === 1
      ? `${rozpisOdjezdu(osob, ostatni(hodiny[0]))}${ostatni(hodiny[0]) ? ` (s vámi už ${ostatni(hodiny[0]) === 1 ? "sedí 1 další" : `sedí ${ostatni(hodiny[0])} další`})` : ""}`
      : `${odjezdu(hodiny.length)} podle toho, kdo už na nich sedí`;
    return {
      celkem,
      klesne,
      vypocet: `${ted}. Platí se na místě podle toho, kolik vás v dílně opravdu bude${klesne ? ` — když přisednou další, bude to míň, při plné dílně ${kc(nejmin)}` : ""}.`,
      kratce: `${zkratka} · ${useky(hodiny)} · ${lidi(osob)} · ${klesne ? "nejvýš " : ""}${kc(celkem)}`,
    };
  };

  const souhrn = () => {
    const d = dny[den];
    const s = sepis();
    cenaEl.textContent = kc(s?.celkem ?? 0);
    if (cenaStitek) cenaStitek.textContent = s && "klesne" in s && s.klesne ? "Teď nejvýš" : "Celkem";
    if (vypocetEl) {
      vypocetEl.textContent = s?.vypocet ?? (d?.kurz ? `${kc(d.kurz.kurz.cena)} za člověka a celý den` : `Od ${kc(cenaZaCloveka(1))} za člověka, když jsi v dílně sám, po ${kc(cenaZaCloveka(R.mist))}, když je plno — platí se na místě.`);
    }
    if (odeslatPozn) {
      odeslatPozn.textContent = clen()
        ? "Jízdenka platí hned, jak ji označíš. Potvrzení ti přijde mailem."
        : "Zamlouvat si můžou ti, kdo jsou u nás zaregistrovaní — stačí jméno a e-mail, heslo nepotřebuješ. Už jsi? Přihlásíš se e-mailem.";
    }
    if (displej && displejSouhrn) {
      displej.hidden = !s || jizdenkaVidet;
      displejSouhrn.textContent = s?.kratce ?? "";
    }
    /* Host se zaregistruje nebo přihlásí kdykoli; člen označí, až má něco na jízdence */
    if (!clen()) {
      odeslat.href = "#prihlaseni";
      odeslat.removeAttribute("aria-disabled");
      return;
    }
    odeslat.removeAttribute("href");
    if (s) odeslat.removeAttribute("aria-disabled");
    else odeslat.setAttribute("aria-disabled", "true");
  };

  /* ——— Člen: kdo je přihlášený, rezervuje rovnou ——— */

  const PROC: Partial<Record<Chyba, string>> = {
    obsazeno: "Tuhle hodinu si mezitím zamluvil někdo jiný. Tabule je načtená znovu — vyber jinou.",
    plno: "Mezitím se zaplnilo a všichni už se nevejdete. Tabule je načtená znovu.",
    zavreno: "Ten den nebo hodina je nově zavřená. Tabule je načtená znovu — vyber jinou.",
    vyluka: "Ten den nově jede kurz, takže běžné hodiny nejsou. Tabule je načtená znovu.",
    nejede: "Kurz ten den už vypsaný není. Tabule je načtená znovu.",
    spatne: "Tohle už zamluvit nejde — nejspíš mezitím odjelo. Tabule je načtená znovu.",
    neznamy: "Přihlášení vypršelo. Přihlas se znovu e-mailem nahoře na stránce.",
    pozde: `Zrušit jde nejpozději ${R.zrusitHodinPredem} hodin předem. Zavolej nám, domluvíme se.`,
    permanentka: "Permanentka se tady zrušit nedá. Ozvi se nám.",
    nenalezeno: "Tahle jízdenka už zrušená je.",
  };
  const proc = (ch: Chyba) => PROC[ch] ?? "Nepovedlo se to odeslat. Zkus to za chvíli znovu, nebo nám napiš.";

  /** Co se mění podle toho, kdo se dívá: cedulka s přihlášením, jméno na jízdence, razítko a nápis na tlačítku */
  const ukazClena = () => {
    const c = clen();
    prihlaseni?.ukaz();
    /* Věta pod odjezdy, že je obsazenost jen ukázková, platí jen pro ukázku */
    const ukazka = document.querySelector<HTMLElement>(".rz-simulace");
    if (ukazka && kal.zive) ukazka.hidden = true;
    /* Člena známe jménem z tabulky — na jízdenku se nepíše znovu. Poznámku k jízdence posílá jen on, host nic neposílá */
    if (c) jmenoEl.value = c.jmeno;
    jmenoEl.readOnly = !!c;
    const poznPole = poznEl.closest<HTMLElement>(".rz-pole");
    if (poznPole) poznPole.hidden = !c;
    odeslat.textContent = c ? "Označit a zamluvit" : "Zaregistrovat se";
    souhrn();
  };

  /** Znovu načte, co je volné — po zamluvení, zrušení, nebo když server řekl, že je to jinak */
  const obnovKalendar = async (zustat?: string) => {
    const novy = await nactiKalendar(dnes);
    /* Když server zrovna neodpoví, zůstane, co je: ukázka by skutečná místa přepsala vymyšlenými */
    if (!koren.isConnected || !novy.zive) return;
    kal = novy;
    dny.splice(0, dny.length, ...novy.dny);
    postavZvlastni();
    ukazClena();
    const i = zustat ? dny.findIndex((d) => d.klic === zustat && jdeVybrat(d)) : -1;
    vyberDen(i >= 0 ? i : vychoziDen());
    dnesek(true);
    kresliMoje();
  };

  let odesilam = false;
  /** Člen označil jízdenku: zamluvit, orazítkovat a načíst tabuli znovu */
  const zamluv = async (d: Den) => {
    if (odesilam) return;
    odesilam = true;
    odeslat.setAttribute("aria-busy", "true");
    const co = druh();
    const o = await posli("/api/rezervuj", {
      druh: co === "kurz" ? "kurz" : co === "pas" ? "permanentka" : "odjezd",
      den: d.klic,
      hodiny: co === "kurz" ? [] : [...(co === "pas" ? pasy : vybrane)].sort((a, b) => a - b),
      osob,
      poznamka: poznEl.value.trim() || undefined,
    });
    if (!koren.isConnected) return;
    if (o.ok) {
      jizdenka?.oznac();
      poznEl.value = "";
      /* Razítko a odjezd vlaku nechat doznít, teprve pak je jízdenka zase prázdná */
      await new Promise((r) => window.setTimeout(r, klid ? 900 : co === "kurz" ? 2900 : 2300));
      await obnovKalendar(d.klic);
      if (hotovoEl) hotovoEl.textContent = "Zamluveno. Potvrzení ti přijde mailem a jízdenku najdeš dole mezi svými.";
    } else {
      if (chybi) chybi.textContent = proc(o.chyba);
      if (o.chyba !== "chyba") await obnovKalendar(d.klic);
    }
    odesilam = false;
    odeslat.removeAttribute("aria-busy");
  };

  /* ——— Tvoje jízdenky: co má člen zamluveno, a zrušení ——— */

  const zDne = (s: string) => new Date(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)));
  const mojeStav = mojeEl?.querySelector<HTMLElement>(".rz-moje-stav");

  const popisMoje = (m: Moje) => {
    const d = zDne(m.den);
    const h = m.h ?? R.od;
    const kdy = `${DNY[d.getDay()]} ${datumDlouze(d)}`;
    if (m.druh === "kurz") {
      const nazev = dny.find((x) => x.klic === m.den)?.kurz?.kurz.nazev;
      return `${kdy}, kurz${nazev ? ` ${nazev}` : ""} · ${lidi(m.osob)}`;
    }
    if (m.druh === "permanentka") return `permanentka ${NA_DNY[d.getDay()]}, ${spojeSlovy([h])}, do ${datumDlouze(zDne(m.do ?? m.den))} · ${lidi(m.osob)}`;
    return `${kdy}, ${hhmm(h)}–${hhmm(h + R.blok)} · ${lidi(m.osob)}`;
  };

  /** První kliknutí se zeptá, druhé zruší */
  const zrusMoje = async (m: Moje, b: HTMLButtonElement) => {
    if (b.dataset.jiste !== "1") {
      b.dataset.jiste = "1";
      b.textContent = "Opravdu zrušit?";
      window.setTimeout(() => {
        if (!b.isConnected || b.disabled) return;
        delete b.dataset.jiste;
        b.textContent = "Zrušit";
      }, 5000);
      return;
    }
    b.disabled = true;
    const o = await posli("/api/zrus", { id: m.id });
    if (!koren.isConnected) return;
    if (o.ok || o.chyba !== "chyba") await obnovKalendar(dny[den]?.klic);
    else b.disabled = false;
    if (mojeStav) mojeStav.textContent = o.ok ? "Zrušeno. Místo je zase volné." : proc(o.chyba);
  };

  const kresliMoje = () => {
    if (!mojeEl) return;
    const c = clen();
    mojeEl.hidden = !c;
    const seznam = mojeEl.querySelector<HTMLElement>(".rz-moje-seznam");
    const nic = mojeEl.querySelector<HTMLElement>(".rz-moje-nic");
    if (!c || !seznam) return;
    seznam.textContent = "";
    if (mojeStav) mojeStav.textContent = "";
    if (nic) nic.hidden = kal.moje.length > 0;
    for (const m of kal.moje) {
      const li = document.createElement("li");
      const text = document.createElement("span");
      text.className = "rz-moje-text";
      text.textContent = popisMoje(m);
      li.append(text);
      /* Permanentka se ruší jen přes dílnu; ostatní do určité doby před začátkem */
      if (m.druh !== "permanentka") {
        const d = zDne(m.den);
        const h = m.h ?? R.od;
        const zacatek = new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(h), (h % 1) * 60);
        if (zacatek.getTime() - Date.now() > R.zrusitHodinPredem * 3_600_000) {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "rz-moje-zrusit";
          b.textContent = "Zrušit";
          b.setAttribute("aria-label", `Zrušit jízdenku: ${text.textContent}`);
          b.addEventListener("click", () => void zrusMoje(m, b));
          li.append(b);
        } else {
          const pozde = document.createElement("small");
          pozde.textContent = "zrušit už jde jen po telefonu";
          li.append(pozde);
        }
      }
      seznam.append(li);
    }
  };

  odeslat.addEventListener("click", (e) => {
    /* Host skočí k registraci nahoře — rezervovat smí jen člen */
    if (!clen()) {
      if (prihlaseni) {
        e.preventDefault();
        prihlaseni.kPrihlaseni();
      }
      return;
    }
    e.preventDefault();
    const d = dny[den];
    const s = sepis();
    if (odeslat.getAttribute("aria-disabled") === "true" || !d || !s) {
      if (chybi) chybi.textContent = !d ? "Nejdřív vyber den." : d.kurz ? "Nejdřív nastup na tabuli do zvláštního vlaku." : "Nejdřív vyber aspoň jednu hodinu na tabuli.";
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
    void zamluv(d);
  });

  jmenoEl.addEventListener("input", () => {
    if (chybi && jmenoEl.value.trim()) chybi.textContent = "";
  });

  koren.querySelectorAll<HTMLInputElement>('input[name="osoby"]').forEach((r) =>
    r.addEventListener("change", () => {
      /* S počtem lidí se mění jízdné — a všude se počítají místa: na odjezdu, v kurzu
         i na permanentce. Kam se všichni nevejdete, to z jízdenky vypadne. */
      osob = Number(r.value);
      zvuk.cink();
      const d = dny[den];
      let hlaseni = "";
      const nevejdou = d ? [...vybrane].filter((h) => (d.hodiny.find((x) => x.h === h)?.volno ?? 0) < osob) : [];
      if (nevejdou.length) {
        nevejdou.forEach((h) => vybrane.delete(h));
        posledniVybrana = vybrane.size ? Math.max(...vybrane) : null;
        hlaseni = `${nevejdou.length === 1 ? `Na hodinu v ${hhmm(nevejdou[0])}` : `Na hodiny v ${nevejdou.map(hhmm).join(" a ")}`} se všichni nevejdete — vyndal jsem ${nevejdou.length === 1 ? "ji" : "je"} z jízdenky.`;
      }
      if (kurzVybran && d?.kurz && volnoVKurzu(d.kurz) < osob) {
        kurzVybran = false;
        hlaseni = `Ve zvláštním vlaku ${zbyvaMist(volnoVKurzu(d.kurz))} — všichni už se nevejdete, tak jsem vás zase vysadil.`;
      }
      for (const h of [...pasy]) {
        if (volnoNaSpoji({ pasObsazeno: pasDne(d) }, h) >= osob) continue;
        pasy.delete(h);
        hlaseni = `Na ${spojPermanentky(h)?.nazev ?? ""} hodinu už není dost permanentek pro všechny — vyndal jsem ji z jízdenky.`;
      }
      if (!pasy.size && !vybrane.size) posledniVybrana = null;
      /* Dny ukazují, kolik odjezdů je volných pro vás všechny */
      kresliDny();
      tabule?.zobraz(d, vyber(), false);
      tabule?.hlas(hlaseni);
      poZmene();
    }),
  );

  pasVolby.forEach((b) => b.addEventListener("click", () => prepniPermanentku(Number(b.dataset.pas))));

  /* Displej se schová, když je jízdenka na obrazovce — a u dárkových jízdenek, kde by zakrýval přepážku */
  const zakryva = [document.getElementById("rz-jizdenka"), document.getElementById("rz-darky")].filter((el): el is HTMLElement => !!el);
  if (zakryva.length && displej) {
    const videt = new Set<Element>();
    const pozorovatel = new IntersectionObserver((zaznamy) => {
      for (const e of zaznamy) {
        if (e.isIntersecting) videt.add(e.target);
        else videt.delete(e.target);
      }
      jizdenkaVidet = videt.size > 0;
      souhrn();
    }, { threshold: 0.12 });
    zakryva.forEach((el) => pozorovatel.observe(el));
  }

  /* ——— Dnešek, příští volný odjezd a příští zvláštní vlak ——— */

  const nejblizsi = () => {
    for (let i = 0; i < dny.length; i++) {
      const h = volneHodiny(dny[i], osob)[0];
      if (h) return { i, h: h.h };
    }
    return null;
  };
  const nejblizsiKurz = () => {
    const i = dny.findIndex((d) => d.kurz && volnoVKurzu(d.kurz) > 0);
    return i < 0 ? null : i;
  };

  const pristiKlapky = pristiEl ? [...pristiEl.querySelectorAll<HTMLElement>("[data-flap]")].map((el) => new Klapka(el)) : [];
  const pristiPopis = pristiEl?.querySelector<HTMLElement>(".rz-pristi-popis");
  let pristiUkazano = false;

  /** zaklapat — cedulka přeběhne na nové hodnoty; klapky = false nechá cedulku být (zaklape později) */
  const dnesek = (zaklapat = false, klapky = true) => {
    const ted = new Date();
    const dd = ted.getDay();
    const hod = ted.getHours() + ted.getMinutes() / 60;
    const dnesniKurz = dny.find((d) => d.klic === iso(ted))?.kurz;
    let veta: string;
    if (dnesniKurz) {
      veta = `Dnes je ${DNY[dd]} a jede zvláštní vlak: ${dnesniKurz.kurz.nazev}.${R.dny.includes(dd) ? " Běžné hodiny dnes nejsou." : ""}`;
    } else if (R.dny.includes(dd) && hod < R.do) {
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

    if (pristiKurzEl) {
      const ik = nejblizsiKurz();
      pristiKurzEl.hidden = ik === null;
      if (ik !== null) {
        const d = dny[ik];
        const k = d.kurz!;
        const text = pristiKurzEl.querySelector<HTMLElement>(".rz-kurz-pristi-text");
        if (text) text.textContent = `${V_DEN[d.datum.getDay()]} ${datumDlouze(d.datum)} — ${k.kurz.nazev}, ${volnaMista(volnoVKurzu(k))} ${zPoctu(k.kurz.mist)}`;
      }
    }

    const n = nejblizsi();
    if (!pristiEl) return;
    pristiEl.hidden = !n;
    if (!n) return;
    const d = dny[n.i].datum;
    if (pristiPopis) pristiPopis.textContent = `: ${V_DEN[d.getDay()]} ${datumDlouze(d)} v ${hhmm(n.h)} — vybrat a přejít k tabuli`;
    pristiEl.setAttribute("aria-label", `Příští volná hodina ${V_DEN[d.getDay()]} ${datumDlouze(d)} v ${hhmm(n.h)}. Nastoupit — vybrat ji a přejít k tabuli`);
    if (!klapky) return;
    const hodnoty = [ZKR[d.getDay()], ...`${dvoj(d.getDate())}${dvoj(d.getMonth() + 1)}${dvoj(Math.floor(n.h))}${dvoj(Math.round((n.h % 1) * 60))}`.split("")];
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

  /* Příští zvláštní vlak: otevře jeho den a sjede k ceduli — nastoupit už musí člověk sám */
  pristiKurzEl?.addEventListener("click", () => {
    const ik = nejblizsiKurz();
    if (ik === null) return;
    if (den !== ik) vyberDen(ik);
    zvuk.rozhlas();
    document.getElementById("rz-odjezdy")?.scrollIntoView({ behavior: klid ? "auto" : "smooth", block: "start" });
    window.setTimeout(() => tabule?.zamerKurz(), klid ? 0 : 600);
  });

  /* Cedulka v úvodu jednou zaklape, až je stránka načtená */
  if (pristiEl && !klid) {
    window.setTimeout(() => {
      if (pristiUkazano) return;
      pristiUkazano = true;
      dnesek(true);
    }, 900);
  }

  /* Rovnou otevřít první den, kde je volná hodina — a kdyby žádná nebyla, první, kde jde koupit aspoň něco */
  den = vychoziDen();
  ukazClena();
  kresliDny();
  kresliPermanentky();
  postavZvlastni();
  kresliZvlastni();
  vysvetli();
  tabule?.zobraz(dny[den], vyber(), false);
  obnovJizdenku(false);
  souhrn();
  dnesek(false, klid);
  kresliMoje();
  nebeVychozi();
}

/**
 * Stránka se rozběhne hned; pokladna a tabule až s kalendářem — skutečným,
 * nebo ukázkou. Pokračování po načtení je obalené zaStranku: hodiny tabule,
 * observery a posluchače z init() tak patří stránce a po přechodu jinam se
 * uklidí (jinak by hodiny tikaly dál i na jiných stránkách a s každou
 * návštěvou Rezervace by přibyly další).
 */
function start() {
  const koren = document.querySelector<HTMLElement>("[data-rezervace]");
  if (!koren) return;
  const dnes = new Date();
  dnes.setHours(0, 0, 0, 0);
  void nactiKalendar(dnes).then(
    zaStranku((kal: Kalendar) => {
      /* Mezitím se mohlo odejít jinam */
      if (koren.isConnected) init(koren, dnes, kal);
    }),
  );
}

stranka("rezervace", () => {
  hlavicka();
  initNebe();
  initMore();
  /* Schovaní kami (hra na hledání): Šamotka v okně vlaku na pozadí, Kachlík v tabuli příštího odjezdu */
  document.querySelectorAll<HTMLElement | SVGElement>(".rz-trat-svet [data-skryty], .rz-nadrazi [data-skryty]").forEach(schovej);
  /* Vázička za Zvláštním vlakem v dárkových jízdenkách */
  document.querySelectorAll<HTMLElement>(".rz-darky [data-skryty]").forEach(schovej);
  /* Dárkové jízdenky na kalendáři nezávisí — jedou hned */
  initDarky();
  start();
  spust();
});
