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
 *   permanentka  zaškrtávátko pod dnem: vybrané odjezdy se budou tři
 *                měsíce opakovat každý týden — vybrané úterý = každé úterý,
 *                a tím dnem začíná platit. Hodina může být kterákoli, kde je
 *                ten den místo; týdny, kdy je plná, se vynechají a neplatí.
 *                Sedí na místech odjezdu jako ostatní
 *
 * Když si člověk vezme kurz, hodiny z jízdenky zmizí (jiný den).
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
import * as zvuk from "../parta2/zvuk";
import { rezervace as R, permanentka as P, hhmm, cenaOdjezdu, cenaZaCloveka, rozpisOdjezdu, cenaPermanentky } from "../../data/rezervace";
import { sekkiDne } from "../../data/koyomi";
import { sklonuj, zPoctu, volnaMista, jenMist, zbyvaMist } from "../../data/pocty";
import { volneHodiny, volnoVKurzu, platnostPermanentky, jizdNaHodinu } from "./simulace";
import type { Den } from "./simulace";
import { nactiKalendar, posli } from "./kalendar";
import type { Kalendar } from "./kalendar";
import type { Chyba, Moje } from "../../lib/rezervace/typy";
import { initMore } from "./more";
import { initOdjezdy, stavHodiny, KAZDY, NA_DNY } from "./odjezdy";
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
/** Hodiny permanentky slovy: „10:30–12:00 a 14:00–15:30“ */
const hodinySlovy = (hodiny: number[]) => hodiny.map((h) => `${hhmm(h)}–${hhmm(h + R.blok)}`).join(" a ");

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
  const clenEl = koren.querySelector<HTMLElement>(".rz-clen");
  const hotovoEl = koren.querySelector<HTMLElement>(".rz-hotovo");
  const mojeEl = koren.querySelector<HTMLElement>(".rz-moje");
  const pasEl = koren.querySelector<HTMLInputElement>('input[name="permanentka"]');
  const casyEl = koren.querySelector<HTMLElement>(".rz-casy");
  const pasPozn = koren.querySelector<HTMLElement>(".rz-pas-stav");
  const pasDen = koren.querySelector<HTMLElement>(".rz-pas-den");
  const zvlastniEl = koren.querySelector<HTMLElement>(".rz-zvlastni-vlaky");
  const zvlastniStav = koren.querySelector<HTMLElement>(".rz-zvlastni-stav");
  const kurzEl = koren.querySelector<HTMLInputElement>('input[name="kurz"]');
  const kurzZaskrt = kurzEl?.closest<HTMLElement>(".rz-pas-kurz") ?? null;
  const displej = document.querySelector<HTMLElement>(".rz-displej");
  const displejSouhrn = displej?.querySelector<HTMLElement>(".rz-displej-souhrn");
  /* Telefon: lišta dole ukazuje den, hodinu a permanentku a dá se v ní permanentka zaškrtnout */
  const displejDen = displej?.querySelector<HTMLElement>('[data-displej="den"] b');
  const displejHodina = displej?.querySelector<HTMLElement>('[data-displej="hodina"] b');
  const displejPas = displej?.querySelector<HTMLInputElement>('input[name="displej-permanentka"]');
  const displejTlacitko = displej?.querySelector<HTMLAnchorElement>(".rz-displej-tlacitko");
  const mqTelefon = matchMedia("(max-width: 760px)");
  /** Pokladna a tabule jsou na obrazovce — na telefonu je lišta vidět jen tehdy */
  let vHale = false;

  /* Kalendář se po zamluvení a zrušení načítá znovu — pole dnů zůstává, jen se přepíše */
  let kal = prvni;
  const dny = kal.dny;
  /** Týdny permanentky od dne `od` — u `hodiny` i to, který týden je pro vás plný (vynechá se a neplatí) */
  const platnost = (od: Date, hodiny: readonly number[] = []) => platnostPermanentky(od, kal.jeKurz, kal.volnoTydne, hodiny, osob);
  /** Přihlášený člen: rezervuje rovnou, bez mailu */
  const clen = () => (kal.zive ? kal.clen : null);
  /* Cedulka nahoře: přihlášení e-mailem; po přihlášení i odhlášení se kalendář načte znovu */
  const prihlaseni = clenEl ? initPrihlaseni(clenEl, { zive: () => kal.zive, clen, poZmene: () => obnovKalendar(dny[den]?.klic) }) : null;
  let den = -1;
  let osob = 1;
  /* Co je na jízdence: hodiny (se zaškrtnutou permanentkou opakované každý týden), nebo zvláštní vlak */
  const vybrane = new Set<number>();
  let naPas = false;
  let kurzVybran = false;
  let posledniVybrana: number | null = null;
  let jizdenkaVidet = false;

  /** Kolik týdnů permanentky vybraného dne v hodinu `h` je pro vás plných */
  const plnychTydnu = (h: number) => {
    const d = dny[den];
    return d && !d.kurz ? platnost(d.datum, [h]).jizdy.filter((j) => j.plno.length).length : 0;
  };
  /** Je permanentka zaškrtnutá a dá se ten den vůbec vzít? V den kurzu ne. */
  const pasPlati = () => naPas && !!dny[den] && !dny[den].kurz;
  const vyber = (): Vyber => ({ osob, hodiny: vybrane, pas: pasPlati(), kurz: kurzVybran, plnychTydnu });
  const druh = () => (kurzVybran ? "kurz" : pasPlati() ? "pas" : "hodiny");
  /** Kolik odjezdů toho dne je volných pro vás všechny */
  const volnych = (d: Den) => volneHodiny(d, osob).length;
  /** Dá se ten den vůbec něco koupit? */
  const jdeVybrat = (d: Den) => (d.kurz ? volnoVKurzu(d.kurz) > 0 : volnych(d) > 0);
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
    const klic = d?.kurz ? `kurz-${d.kurz.kurz.id}` : pasPlati() ? "pas" : "hodina";
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

  /* Jízdenka se nakreslí každému dni — vidět je jen ta vybraná a z ostatních si kalendář bere stav.
     Sobota se zvláštním vlakem dostane tmavou jízdenku jen tehdy, když je vybraná z jeho přepážky. */
  const kresliDny = () => {
    dnyEl.textContent = "";
    dny.forEach((d, i) => {
      if (!maJizdenku(d) && i !== den) return;
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
        const pryc = d.hodiny.every((h) => h.probehlo);
        const stav = n > 0 ? `volno ${odjezdu(n)}` : pryc ? "odjel" : "plno";
        const s = sekkiDne(d.datum);
        b.className = `rz-den den-${dt}${n === 0 ? (pryc ? " pryc" : " plno") : n <= 2 ? " malo" : ""}`;
        b.innerHTML = `<span class="rz-den-pas">${DNY[dt]}</span>
          <b class="rz-den-cislo">${d.datum.getDate()}</b>
          <span class="rz-den-mesic">${MESICE_2[d.datum.getMonth()]}</span>
          <span class="rz-den-sekki">${s.cesky}</span>
          <span class="rz-den-volno">${n > 0 ? `${n <= 2 ? "△" : "○"} ${odjezdu(n)} volno` : pryc ? "odjel" : "plno"}</span>
          <span class="rz-den-dirka" aria-hidden="true"></span>`;
        b.setAttribute("aria-label", `${DNY[dt]} ${datumDlouze(d.datum)}: ${stav}`);
      }
      b.addEventListener("click", () => {
        if (i !== den) vyberDen(i, true);
      });
      dnyEl.append(b);
    });
    dnyEl.classList.add("ma-kalendar");
    kresliKalendar();
  };

  /* Vedle jízdenky vybraného (nejbližšího) dne kalendář po týdnech — otevírací dny
     se dají ťuknout, stav berou z jízdenek (rezervace.css, .ma-kalendar). Do 8. 11. 2026
     jen na telefonu; na počítači byly pod sebou jízdenky všech dní. */
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

  /** Telefon: časy vybraného dne nad permanentkou — vybírají totéž co řádky tabule (rezervace.css, .rz-casy) */
  const kresliCasy = () => {
    if (!casyEl) return;
    const d = dny[den];
    casyEl.textContent = "";
    casyEl.hidden = !d || !!d.kurz;
    if (!d || d.kurz) return;
    for (const h of d.hodiny) {
      const mam = vybrane.has(h.h);
      const st = stavHodiny(h, osob);
      const b = document.createElement("button");
      b.type = "button";
      b.className = `rz-cas ${st}${mam ? " vybrana" : ""}`;
      b.disabled = st !== "volno" && !mam;
      b.setAttribute("aria-pressed", String(mam));
      const pozn = mam ? "vybráno" : st === "pryc" ? "odjel" : st === "plno" ? "plno" : sklonuj(h.volno, "místo", "místa", "míst");
      b.innerHTML = `<b>${hhmm(h.h)}</b><small>${pozn}</small>`;
      b.setAttribute("aria-label", `${hhmm(h.h)} až ${hhmm(h.h + R.blok)}: ${pozn}`);
      b.addEventListener("click", () => prepniHodinu(h.h));
      casyEl.append(b);
    }
  };

  /** Zaškrtávátko permanentky: na který den v týdnu by byla, odkdy dokdy a kolik by stála */
  const kresliPermanentky = () => {
    kresliCasy();
    const d = dny[den];
    /* Na který den v týdnu permanentka je, říká vybraný den — jiný se vybere v kalendáři */
    const denPasu = !!d && R.dny.includes(d.datum.getDay()) && !d.kurz;
    if (pasEl) {
      pasEl.checked = naPas;
      pasEl.disabled = !denPasu && !naPas;
    }
    if (pasDen) pasDen.textContent = d && denPasu ? NA_DNY[d.datum.getDay()] : "";
    if (!pasPozn) return;
    if (!d) {
      pasPozn.textContent = "";
      return;
    }
    if (!denPasu) {
      pasPozn.textContent = d.kurz
        ? "V den kurzu je výluka — permanentka začíná jiným dnem."
        : `Permanentka je ${R.dny.map((x) => NA_DNY[x]).join(" nebo ")} — vyber v kalendáři jeden z těch dnů.`;
      return;
    }
    const hodiny = [...vybrane].sort((a, b) => a - b);
    const pl = platnost(d.datum, hodiny);
    const tydnu = pl.jizdy.filter((j) => !j.vyluka).length;
    const odDo = `${KAZDY[d.datum.getDay()]} od ${datumDlouze(d.datum)} do ${datumDlouze(pl.do)}`;
    if (!naPas) {
      pasPozn.textContent = "";
      return;
    }
    /* Plné týdny se vynechají a neplatí — kolik jízd má která hodina */
    const jizdy = hodiny.map((h) => jizdNaHodinu(pl.jizdy, h));
    const plnych = hodiny.reduce((a, h, i) => a + tydnu - jizdy[i], 0);
    pasPozn.textContent = hodiny.length
      ? `${hodinySlovy(hodiny)} ${odDo} — ${hodiny.length === 1 ? jizd(jizdy[0]) : `${sklonuj(jizdy.reduce((a, b) => a + b, 0), "jízda", "jízdy", "jízd")} dohromady`} po ${kc(P.cenaJizdy)}.${plnych ? ` ${plnych === 1 ? "Jeden týden je plný" : `${plnych} ${plnych < 5 ? "týdny jsou plné" : "týdnů je plných"}`} — vynechá se a neplatí.` : ""}`
      : `Platila by ${odDo} — ${jizd(tydnu)}. Teď na tabuli vyber hodinu.`;
  };

  /* ——— Přepážka zvláštního vlaku: nejbližší kurz, který ještě nevyjel — karta, vedle text, pod tím zaškrtávátko ——— */

  const zvlastni: { i: number; b: HTMLButtonElement; mista: SVGSVGElement[]; volno: HTMLElement }[] = [];
  const postavZvlastni = () => {
    if (!zvlastniEl) return;
    zvlastniEl.textContent = "";
    zvlastni.length = 0;
    /* nejbližší, které ještě nevyjely — víc než pár jich naráz vypsaných nebývá */
    const vypsane = dny.map((d, i) => ({ d, i })).filter((x) => x.d.kurz && !x.d.kurz.probehlo).slice(0, R.kurzuNaraz);
    if (kurzZaskrt) kurzZaskrt.hidden = !vypsane.length;
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
      /* Vedle karty: co se na kurzu dělá, kdo ho vede a kdy jede */
      const od = Math.min(...c.program.map((z) => z.h));
      const konec = Math.max(...c.program.map((z) => z.h)) + R.blok;
      const text = document.createElement("div");
      text.className = "rz-zvlastni-text";
      text.innerHTML = `<p class="rz-zvlastni-popis"></p><p class="rz-zvlastni-udaje"></p>`;
      text.querySelector(".rz-zvlastni-popis")!.textContent = c.popis;
      text.querySelector(".rz-zvlastni-udaje")!.textContent = `${hhmm(od)}–${hhmm(konec)} · lektor ${c.lektor} · ${c.proKoho}`;
      zvlastniEl.append(b, text);
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
    /* Zaškrtávátko nastoupí do vlaku na kartě — i když je zrovna vybraný jiný den */
    const z = zvlastni[0];
    const k = z && dny[z.i].kurz;
    const mam = !!z && z.i === den && kurzVybran;
    if (kurzEl) {
      kurzEl.checked = mam;
      kurzEl.disabled = !mam && (!k || volnoVKurzu(k) < osob);
    }
    if (zvlastniStav) {
      zvlastniStav.textContent = !k ? "" : mam ? `${k.kurz.nazev} máš na jízdence${osob > 1 ? ` pro ${lidi(osob)}` : ""}.` : volnoVKurzu(k) === 0 ? "Vlak je plný." : volnoVKurzu(k) < osob ? `${zbyvaMist(volnoVKurzu(k)).replace(/^z/, "Z")} — tolik vás nepojede.` : "";
    }
  };

  const vyberDen = (i: number, uzivatel = false) => {
    den = i;
    vybrane.clear();
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
    if (vybrane.has(h)) {
      vybrane.delete(h);
      posledniVybrana = vybrane.size ? Math.max(...vybrane) : null;
      zvuk.drevo(0.8);
    } else {
      if (stavHodiny(hod, osob) !== "volno") return;
      vybrane.add(h);
      posledniVybrana = h;
      zvuk.drevo(1.15);
      window.setTimeout(() => (pasPlati() ? zvuk.cink() : zvuk.drevo(1.3)), pasPlati() ? 110 : 90);
    }
    tabule?.radek(d, h, vyber());
    poZmene();
  };

  /** Zaškrtnutí permanentky: vybrané hodiny se budou opakovat; týdny, kdy na nich není místo, se vynechají */
  const prepniPas = (zapnout: boolean) => {
    naPas = zapnout;
    zvuk.cink();
    tabule?.zobraz(dny[den], vyber(), false);
    tabule?.hlas("");
    poZmene();
  };
  pasEl?.addEventListener("change", () => prepniPas(pasEl.checked));
  kurzEl?.addEventListener("change", () => {
    const z = zvlastni[0];
    if (!z) return;
    if (kurzEl.checked) {
      if (den !== z.i) vyberDen(z.i, true);
      if (!kurzVybran) prepniKurz();
    } else if (kurzVybran && den === z.i) prepniKurz();
    /* Kdyby nastoupit nešlo, zaškrtávátko se vrátí */
    kresliZvlastni();
  });

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
        pas: d && pasPlati() && vybrane.size
          ? {
              spoje: [...vybrane].sort((a, b) => a - b),
              platnost: platnost(d.datum, [...vybrane]),
              /* Kdo na hodině první den už sedí — na obrázku jako stíny */
              obsazeno: new Map(d.hodiny.map((x) => [x.h, R.mist - x.volno])),
            }
          : undefined,
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
    if (pasPlati()) {
      if (!vybrane.size) return null;
      const spoje = [...vybrane].sort((a, b) => a - b);
      const pl = platnost(d.datum, spoje);
      /* Každá hodina má své jízdy — týdny bez výluky, kdy je na ní místo */
      const pocet = spoje.reduce((a, h) => a + jizdNaHodinu(pl.jizdy, h), 0);
      const celkem = osob * cenaPermanentky(pocet);
      return {
        celkem,
        vypocet: `${lidi(osob)} × ${spoje.length > 1 ? `${sklonuj(pocet, "jízda", "jízdy", "jízd")} na všech hodinách` : jizd(pocet)} po ${kc(P.cenaJizdy)}`,
        kratce: `Permanentka ${NA_DNY[d.datum.getDay()]} · ${hodinySlovy(spoje)} · od ${datumKratce(d.datum)} · ${lidi(osob)} · ${kc(celkem)}`,
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
        : "Zamlouvat si můžou ti, kdo jsou u nás zaregistrovaní — stačí jméno a e-mail, heslo nepotřebuješ.";
    }
    if (displej && displejSouhrn) {
      const telefon = mqTelefon.matches;
      /* Na počítači se ukáže, až je něco vybrané; na telefonu po celou dobu výběru (s tím, co vybrat) */
      displej.hidden = jizdenkaVidet || (telefon ? !vHale : !s);
      displej.classList.toggle("je-vybrano", !!s);
      displejSouhrn.textContent = s?.kratce ?? "";
      const hodiny = [...vybrane].sort((a, b) => a - b);
      if (displejDen) displejDen.textContent = d ? `${ZKR[d.datum.getDay()]} ${datumKratce(d.datum)}` : "vyber";
      if (displejHodina) displejHodina.textContent = d?.kurz ? (kurzVybran ? "celý den" : "nastup") : hodiny.length ? (hodiny.length === 1 ? hhmm(hodiny[0]) : `${odjezdu(hodiny.length)}`) : "vyber";
      if (displejPas) {
        displejPas.checked = naPas;
        displejPas.disabled = !d || !!d.kurz || !R.dny.includes(d.datum.getDay());
      }
      if (displejTlacitko) {
        /* Dokud není co dát na jízdenku, tlačítko vede k tabuli */
        displejTlacitko.href = s ? "#rz-jizdenka" : "#rz-odjezdy";
        displejTlacitko.innerHTML = s ? `Pokračovat <span aria-hidden="true">→</span>` : d?.kurz ? "K vlaku" : "Vybrat hodinu";
      }
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
      hodiny: co === "kurz" ? [] : [...vybrane].sort((a, b) => a - b),
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
    if (m.druh === "permanentka") return `permanentka ${NA_DNY[d.getDay()]}, ${hodinySlovy([h])}, do ${datumDlouze(zDne(m.do ?? m.den))} · ${lidi(m.osob)}`;
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
    /* Políčko se jménem je na telefonu schované — tam se nevyžaduje (člen ho má vyplněné ze svého účtu) */
    if (!jmenoEl.value.trim() && jmenoEl.offsetParent !== null) {
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
      const volnoH = (h: number) => d?.hodiny.find((x) => x.h === h)?.volno ?? 0;
      const nevejdou = d ? [...vybrane].filter((h) => volnoH(h) < osob) : [];
      if (nevejdou.length) {
        nevejdou.forEach((h) => vybrane.delete(h));
        posledniVybrana = vybrane.size ? Math.max(...vybrane) : null;
        hlaseni = `${nevejdou.length === 1 ? `Na hodinu v ${hhmm(nevejdou[0])}` : `Na hodiny v ${nevejdou.map(hhmm).join(" a ")}`} se všichni nevejdete — vyndal jsem ${nevejdou.length === 1 ? "ji" : "je"} z jízdenky.`;
      }
      if (kurzVybran && d?.kurz && volnoVKurzu(d.kurz) < osob) {
        kurzVybran = false;
        hlaseni = `Ve zvláštním vlaku ${zbyvaMist(volnoVKurzu(d.kurz))} — všichni už se nevejdete, tak jsem vás zase vysadil.`;
      }
      if (!vybrane.size) posledniVybrana = null;
      /* Dny ukazují, kolik odjezdů je volných pro vás všechny */
      kresliDny();
      tabule?.zobraz(d, vyber(), false);
      tabule?.hlas(hlaseni);
      poZmene();
    }),
  );

  /* Telefon: lišta je vidět, dokud je pokladna s tabulí na obrazovce */
  const hala = document.getElementById("rz-pokladna");
  if (hala && displej) {
    new IntersectionObserver((z) => {
      vHale = z.some((e) => e.isIntersecting);
      souhrn();
    }).observe(hala);
  }
  mqTelefon.addEventListener("change", () => souhrn());
  displejPas?.addEventListener("change", () => prepniPas(displejPas.checked));

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
  /* Schovaní kami (hra na hledání): Šamotka v okně vlaku na pozadí, Kachlík nad hodinami odjezdové tabule */
  document.querySelectorAll<HTMLElement | SVGElement>(".rz-trat-svet [data-skryty], .rz-tabule [data-skryty]").forEach(schovej);
  /* Vázička za Zvláštním vlakem v dárkových jízdenkách */
  document.querySelectorAll<HTMLElement>(".rz-darky [data-skryty]").forEach(schovej);
  /* Dárkové jízdenky na kalendáři nezávisí — jedou hned */
  initDarky();
  start();
  spust();
});
