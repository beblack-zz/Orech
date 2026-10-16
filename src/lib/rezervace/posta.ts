/**
 * E-maily k rezervacím přes Resend: pozvánka s osobním odkazem, potvrzení
 * jízdenky a zrušení. Jen prostý text — dojde všude a nevypadá jako reklama.
 *
 * ZNĚNÍ MAILŮ JE NÁVRH a čeká na potvrzení.
 */
import { rezervace as R, permanentka as P, kurzy, hhmm, tarifSlovy, detskaSlovy, pravidloPrichodu, cenaPermanentky } from "../../data/rezervace";
import { kontakt } from "../../data/uvod2";
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

export function pozvanka(clen: { jmeno: string; email: string }, odkaz: string): Mail {
  return {
    komu: clen.email,
    predmet: "Tvůj odkaz na rezervace v dílně",
    text: [
      `Ahoj, ${clen.jmeno},`,
      "",
      "tady je tvůj odkaz na rezervace v dílně:",
      odkaz,
      "",
      "Stačí ho otevřít. Web si tě zapamatuje a příště už jen vybereš den a hodinu — jízdenka platí hned, nic se nepotvrzuje.",
      "Odkaz je jen tvůj, tak ho nikomu neposílej. Kdyby se ztratil, ozvi se a pošleme nový.",
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
