/**
 * E-maily k rezervacím přes Resend: uvítání, přihlašovací odkaz s kódem,
 * potvrzení registrace, potvrzení jízdenky a zrušení. Každý má prostý
 * text; uvítání, přihlášení a registrace navíc HTML v noční edici (vzhled-mailu.ts) — pošta ukáže
 * HTML, a kde ho neumí nebo nechce, text.
 *
 * ZNĚNÍ MAILŮ JE NÁVRH a čeká na potvrzení.
 */
import { rezervace as R, permanentka as P, kurzy, hhmm, tarifSlovy, detskaSlovy, pravidloPrichodu, cenaPermanentky, dnySlovy, otevrenoSlovy } from "../../data/rezervace";
import { kontakt } from "../../data/uvod2";
import { mailVitej, mailPrihlaseni, mailRegistrace } from "./vzhled-mailu";
import { denVTydnu, konecPermanentky } from "./pravidla";
import type { Zadost } from "./typy";

export interface Posta {
  klic: string;
  /** Odesílatel, třeba „JIRO saku <rezervace@jirosaku.cz>“ — doména musí být v Resendu ověřená */
  od: string;
  /** Kam chodí skrytá kopie potvrzení a zrušení, ať o nich dílna ví */
  kopie?: string;
}

export interface Mail {
  komu: string;
  predmet: string;
  text: string;
  /** Totéž jako HTML; pošta si vybere */
  html?: string;
  /** Poslat skrytou kopii dílně */
  kopie?: boolean;
  /** Kam jde odpověď, když se na mail klikne Odpovědět — odesílatel bývá adresa, kterou nikdo nečte */
  odpovedet?: string;
}

const ZKR = ["ne", "po", "út", "st", "čt", "pá", "so"];
const KAZDY = ["každou neděli", "každé pondělí", "každé úterý", "každou středu", "každý čtvrtek", "každý pátek", "každou sobotu"];
const PODPIS = `JIRO saku — keramická dílna v Ořechu\n${kontakt.email} · ${kontakt.telefon}`;

const kc = (n: number) => `${n.toLocaleString("cs-CZ")} Kč`;
const lidi = (n: number) => (n === 1 ? "1 člověk" : `${n} lidi`);
/** „2026-10-20“ → „út 20. 10. 2026“ */
const datum = (den: string) => `${ZKR[denVTydnu(den)]} ${Number(den.slice(8))}. ${Number(den.slice(5, 7))}. ${den.slice(0, 4)}`;
/** Odjezdy jdoucí po sobě slije do jednoho úseku: 10:30 a 12:00 → „10:30–13:30“ */
const useky = (hodiny: number[]) => {
  const casti: [number, number][] = [];
  for (const h of [...hodiny].sort((a, b) => a - b)) {
    const posledni = casti[casti.length - 1];
    if (posledni && posledni[1] === h) posledni[1] = h + R.blok;
    else casti.push([h, h + R.blok]);
  }
  return casti.map(([a, b]) => `${hhmm(a)}–${hhmm(b)}`).join(", ");
};

/** Uvítání nového člena: jak se přihlásit, jak to jezdí a jak zrušit */
export function vitej(clen: { jmeno: string; email: string }, web: string): Mail {
  const m = mailVitej({ web }, { osloveni: clen.jmeno });
  return {
    komu: clen.email,
    predmet: m.predmet,
    html: m.html,
    text: [
      `Ahoj, ${clen.jmeno},`,
      "",
      "vítej v dílně — zapsali jsme tě do rezervací.",
      "",
      `Přihlásíš se bez hesla na ${web}/rezervace: zadáš tuhle adresu a pošleme ti odkaz.`,
      "",
      "Jak to u nás jezdí:",
      `1. Vyber odjezd — ${dnySlovy}, ${otevrenoSlovy}. Odjezd trvá hodinu a půl.`,
      "2. Označ jízdenku — zamluvená je hned a potvrzení ti přijde mailem.",
      `3. Přijď do dílny — ${kontakt.ulice}, ${kontakt.obec}. Jízdné se platí na místě.`,
      `4. Nemůžeš? Jízdenku zrušíš na webu nejpozději ${R.zrusitHodinPredem} hodin předem, potom nám zavolej.`,
      "",
      PODPIS,
    ].join("\n"),
  };
}

/** Jednorázový odkaz a kód na přihlášení */
export function prihlaseni(clen: { jmeno: string; email: string }, odkaz: string, kod: string, minut: number, web: string): Mail {
  const m = mailPrihlaseni({ web }, { osloveni: clen.jmeno, odkaz, kod, minut });
  return {
    komu: clen.email,
    predmet: m.predmet,
    html: m.html,
    text: [
      `Ahoj, ${clen.jmeno},`,
      "",
      "tady je tvůj odkaz na přihlášení do rezervací:",
      odkaz,
      "",
      `Nebo na webu opiš kód: ${kod.slice(0, 3)} ${kod.slice(3)}`,
      "",
      `Odkaz i kód platí ${minut} minut a jen jednou. Pokud o přihlášení nevíš, mail klidně smaž — bez kliknutí se nikdo nepřihlásí.`,
      "",
      PODPIS,
    ].join("\n"),
  };
}

/** Potvrzení registrace z webu: odkaz a kód, kterým se registrace potvrdí a člověk rovnou přihlásí */
export function registrace(clen: { jmeno: string; email: string }, odkaz: string, kod: string, minut: number, web: string): Mail {
  const m = mailRegistrace({ web }, { osloveni: clen.jmeno, email: clen.email, odkaz, kod, minut });
  return {
    komu: clen.email,
    predmet: m.predmet,
    html: m.html,
    text: [
      `Ahoj, ${clen.jmeno},`,
      "",
      "díky za registraci do rezervací. Potvrď nám ještě, že tahle adresa patří tobě — klikni na odkaz:",
      odkaz,
      "",
      `Nebo na webu opiš kód: ${kod.slice(0, 3)} ${kod.slice(3)}`,
      "",
      `Odkaz i kód platí ${minut} minut a jen jednou. Pak už si hodiny v dílně zamlouváš sám na ${web}/rezervace, bez hesla.`,
      "Pokud o registraci nevíš, mail klidně smaž — bez kliknutí se nepotvrdí.",
      "",
      PODPIS,
    ].join("\n"),
  };
}

/**
 * Co je na jízdence slovy a v korunách. `kurz` je id kurzu, který ten den
 * jede; `vyluk` kolik týdnů permanentky má výluku — ty se neplatí.
 */
function sepis(z: Zadost, kurz: string | null, vyluk = 0): { nazev: string; radky: string[] } {
  if (z.druh === "kurz") {
    const k = kurzy.find((x) => x.id === kurz);
    const zastavky = k?.program.map((p) => p.h) ?? [R.od];
    return {
      nazev: k ? `kurz ${k.nazev}, ${datum(z.den)}` : `kurz, ${datum(z.den)}`,
      radky: [
        `Kurz: ${k?.nazev ?? "na celý den"}`,
        `Kdy: ${datum(z.den)}, ${hhmm(Math.min(...zastavky))}–${hhmm(Math.max(...zastavky) + R.blok)}`,
        `Počet lidí: ${z.osob}`,
        ...(k ? [`Cena: ${kc(z.osob * k.cena)} (${kc(k.cena)} za člověka)`] : []),
      ],
    };
  }
  if (z.druh === "permanentka") {
    /* Jízda je každý týden od prvního dne do posledního, kromě výluk */
    const jizd = Math.floor((Date.parse(konecPermanentky(z.den)) - Date.parse(z.den)) / 604_800_000) + 1 - vyluk;
    const spoje = z.hodiny.map((h) => `${P.spoje.find((s) => s.h === h)?.nazev ?? ""} ${hhmm(h)}–${hhmm(h + R.blok)}`.trim()).join(" a ");
    return {
      nazev: `permanentka ${KAZDY[denVTydnu(z.den)]}, ${spoje}`,
      radky: [
        `Permanentka: ${KAZDY[denVTydnu(z.den)]}, ${spoje}`,
        `Platí: od ${datum(z.den)} do ${datum(konecPermanentky(z.den))} (v den kurzu se nejede)`,
        `Počet lidí: ${z.osob}`,
        `Cena: ${kc(z.hodiny.length * z.osob * cenaPermanentky(jizd))} (${jizd}× po ${kc(P.cenaJizdy)} za člověka a hodinu)`,
      ],
    };
  }
  return {
    nazev: `${datum(z.den)}, ${useky(z.hodiny)}`,
    radky: [
      `Kdy: ${datum(z.den)}, ${useky(z.hodiny)}`,
      `Počet lidí: ${z.osob}`,
      /* Kolik lidí na odjezdu nakonec bude, se ví až na místě — tam se i platí */
      `Jízdné: platí se na místě podle toho, kolik lidí v dílně opravdu je — ${tarifSlovy()}; ${detskaSlovy}. ${pravidloPrichodu}`,
    ],
  };
}

export function potvrzeni(clen: { jmeno: string; email: string }, z: Zadost, kurz: string | null, web: string, vyluk = 0): Mail {
  const s = sepis(z, kurz, vyluk);
  return {
    komu: clen.email,
    predmet: `Jízdenka do dílny: ${s.nazev}`,
    kopie: true,
    text: [
      `Ahoj, ${clen.jmeno},`,
      "",
      "máš zamluveno:",
      "",
      ...s.radky,
      ...(z.poznamka ? [`Poznámka: ${z.poznamka}`] : []),
      "",
      z.druh === "permanentka"
        ? "Kdyby bylo potřeba něco změnit, ozvi se nám."
        : `Kdyby ti to nevyšlo, jízdenku zrušíš na ${web}/rezervace, nejpozději ${R.zrusitHodinPredem} hodin předem. Později nám radši zavolej.`,
      "",
      "Těšíme se!",
      "",
      PODPIS,
    ].join("\n"),
  };
}

export function zruseni(clen: { jmeno: string; email: string }, r: { druh: Zadost["druh"]; den: string; h: number | null; osob: number }): Mail {
  const co = r.druh === "kurz" ? `kurz, ${datum(r.den)}` : `${datum(r.den)}, ${useky([r.h ?? R.od])}`;
  return {
    komu: clen.email,
    predmet: `Zrušená jízdenka: ${co}`,
    kopie: true,
    text: [`Ahoj, ${clen.jmeno},`, "", `jízdenka je zrušená: ${co}, ${lidi(r.osob)}.`, "Místo je zase volné.", "", PODPIS].join("\n"),
  };
}

/** Odešle mail. Vrací, jestli ho Resend přijal — volající rozhodne, co s neúspěchem. */
export async function posli(p: Posta, m: Mail): Promise<boolean> {
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.klic}` },
      body: JSON.stringify({
        from: p.od,
        to: [m.komu],
        subject: m.predmet,
        text: m.text,
        ...(m.html ? { html: m.html } : {}),
        ...(m.kopie && p.kopie ? { bcc: [p.kopie] } : {}),
        ...(m.odpovedet ? { reply_to: m.odpovedet } : {}),
      }),
    });
    if (!r.ok) console.error(`[rezervace] Resend odmítl mail (${r.status}): ${await r.text().catch(() => "")}`);
    return r.ok;
  } catch (e) {
    console.error("[rezervace] mail se nepodařilo odeslat", e);
    return false;
  }
}
