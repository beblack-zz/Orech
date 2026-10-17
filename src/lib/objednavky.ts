/**
 * Objednávky z webu: šátek z Obchodu 2 a dárková jízdenka z Rezervace.
 * Stránka pošle, co člověk vybral, a tady se z toho složí dva maily:
 * dílně (odpověď jde rovnou zákazníkovi) a zákazníkovi (odpověď jde
 * dílně). Názvy a ceny se berou z dat webu, ne z toho, co poslal
 * prohlížeč. Platí se dál po domluvě, web nic neúčtuje.
 *
 * NAOKO: dokud chybí RESEND_API_KEY a odesílatel (REZERVACE_OD), nic se
 * neodesílá — objednávka se jen zapíše do logu funkce a stránka dostane
 * `naoko: true`. Odesílatel musí být z domény ověřené v Resendu.
 *
 * ZNĚNÍ MAILŮ JE NÁVRH a čeká na potvrzení.
 */
import { RESEND_API_KEY, REZERVACE_OD, OBJEDNAVKY_KOMU } from "astro:env/server";
import { kramek } from "../data/kramek";
import { vzorPodleId, VYCHOZI_VZOR } from "../data/furoshiki";
import { kurzy, permanentka as P, cenaOdjezdu, cenaPermanentky, odjezduDarku } from "../data/rezervace";
import { kontakt } from "../data/uvod2";
import { sklonuj } from "../data/pocty";
import { posli, type Mail, type Posta } from "./rezervace/posta";

export type Dar = "hodiny" | "pas" | "kurz";

export interface ObjednavkaSatek {
  druh: "satek";
  kusy: string[];
  doprava: "odber" | "zasilkovna";
  /** Do jakého šátku zabalit (id z data/furoshiki.ts) */
  vzor: string;
}
export interface ObjednavkaDarek {
  druh: "darek";
  dar: Dar;
  /** Id kurzu, nebo prázdné = kterýkoli */
  kurz: string;
  forma: "pdf" | "papir";
  pro: string;
  vzkaz: string;
  od: string;
}
export type Objednavka = (ObjednavkaSatek | ObjednavkaDarek) & {
  jmeno: string;
  email: string;
  poznamka: string;
};

export type Vysledek = { ok: true; naoko: boolean } | { ok: false; chyba: "spatne" | "kusy" | "moc" | "posta" };

const kc = (n: number) => `${n.toLocaleString("cs-CZ")} Kč`;
const cislo = (s: string) => Number(s.replace(/[^\d]/g, ""));
const PODPIS = `JIRO saku — keramická dílna v Ořechu\n${kontakt.email} · ${kontakt.telefon}`;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const HODIN = ["", "Jedna hodina", "Dvě hodiny", "Tři hodiny", "Čtyři hodiny"];

const text = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** Z těla požadavku udělá objednávku, nebo vrátí null, když je špatně */
export function precti(t: unknown): Objednavka | null {
  if (!t || typeof t !== "object") return null;
  const o = t as Record<string, unknown>;
  const zaklad = { jmeno: text(o.jmeno, 60), email: text(o.email, 120), poznamka: text(o.poznamka, 400) };
  if (!zaklad.jmeno || !EMAIL.test(zaklad.email)) return null;
  if (o.druh === "satek") {
    const kusy = Array.isArray(o.kusy) ? [...new Set(o.kusy.filter((k): k is string => typeof k === "string"))].slice(0, 30) : [];
    return { ...zaklad, druh: "satek", kusy, doprava: o.doprava === "zasilkovna" ? "zasilkovna" : "odber", vzor: vzorPodleId(o.vzor)?.id ?? VYCHOZI_VZOR };
  }
  if (o.druh === "darek") {
    const dar = o.dar === "hodiny" || o.dar === "pas" || o.dar === "kurz" ? o.dar : null;
    if (!dar) return null;
    const kurz = typeof o.kurz === "string" && kurzy.some((k) => k.id === o.kurz) ? o.kurz : "";
    return { ...zaklad, druh: "darek", dar, kurz, forma: o.forma === "papir" ? "papir" : "pdf", pro: text(o.pro, 28), vzkaz: text(o.vzkaz, 70), od: text(o.od, 28) };
  }
  return null;
}

/** Cena dárku — stejně jako na stránce: na kterýkoli kurz ten nejdražší */
export const cenaDarku = (dar: Dar, kurz: string) =>
  dar === "hodiny" ? odjezduDarku * cenaOdjezdu(1) : dar === "pas" ? cenaPermanentky() : (kurzy.find((k) => k.id === kurz)?.cena ?? Math.max(...kurzy.map((k) => k.cena)));

/** Co je v objednávce, po řádcích, a kolik to dělá — společné pro oba maily */
function obsah(o: Objednavka): { predmet: string; radky: string[] } | null {
  if (o.druh === "satek") {
    const kusy = o.kusy.map((id) => kramek.find((k) => k.id === id)).filter((k) => !!k);
    if (!kusy.length) return null;
    const nazev = (k: (typeof kusy)[number]) => (k.druh ? `${k.nazev} (${k.druh.znak})` : k.nazev);
    const celkem = kusy.reduce((s, k) => s + cislo(k.cena), 0);
    const nazvy = kusy.map(nazev);
    return {
      predmet: `Obchod: ${nazvy.slice(0, 3).join(", ")}${nazvy.length > 3 ? ` a ${nazvy.length - 3} další` : ""}`,
      radky: [
        ...kusy.map((k) => `– ${nazev(k)} (${k.odkud === "japonsko" ? `${k.autor} · z Japonska` : `${k.autor} · ${k.glazura}`}) — ${k.cena}`),
        "",
        `Celkem: ${kc(celkem)}`,
        `Doprava: ${o.doprava === "zasilkovna" ? "Zásilkovnou" : "osobní odběr v dílně"}`,
        `Šátek: ${(() => {
          const v = vzorPodleId(o.vzor);
          return v ? `${v.nazev} (${v.kanji}) — ${v.vyznam}` : o.vzor;
        })()}`,
      ],
    };
  }
  const kurz = kurzy.find((k) => k.id === o.kurz) ?? null;
  const nazev = o.dar === "hodiny" ? `${HODIN[odjezduDarku] ?? `${odjezduDarku} hodin`} v dílně` : o.dar === "pas" ? "Permanentka" : `Zvláštní vlak — ${kurz ? kurz.nazev : "kterýkoli kurz"}`;
  const popis =
    o.dar === "hodiny"
      ? `${odjezduDarku}× 90 minut, hodiny si obdarovaný vybere sám`
      : o.dar === "pas"
        ? `na ${sklonuj(P.mesicu, "měsíc", "měsíce", "měsíců")}, jeden den v týdnu a pokaždé stejná hodina — den a hodinu si obdarovaný vybere sám`
        : `${kurz ? `kurz ${kurz.nazev}` : "kterýkoli kurz"} na celý den — ${kurz ? "termín" : "kurz i termín"} si obdarovaný vybere sám`;
  return {
    predmet: `Dárková jízdenka: ${nazev}`,
    radky: [
      `${nazev}: ${popis}`,
      `Cena: ${kc(cenaDarku(o.dar, o.kurz))} (jízdenka pro jednoho)`,
      "",
      "Na jízdence:",
      `Pro: ${o.pro || "—"}`,
      `Vzkaz: ${o.vzkaz || "—"}`,
      `Od: ${o.od || "—"}`,
      "",
      o.forma === "papir" ? "Jízdenka vytištěná." : "Jízdenka v PDF mailem.",
    ],
  };
}

export function maily(o: Objednavka, dilna: string): { dilne: Mail; zakaznikovi: Mail } | null {
  const c = obsah(o);
  if (!c) return null;
  const pozn = o.poznamka ? ["", `Poznámka: ${o.poznamka}`] : [];
  return {
    dilne: {
      komu: dilna,
      predmet: c.predmet,
      odpovedet: o.email,
      text: [`Nová objednávka z webu od ${o.jmeno} (${o.email}).`, "Odpověď na tenhle mail půjde rovnou zákazníkovi.", "", ...c.radky, ...pozn].join("\n"),
    },
    zakaznikovi: {
      komu: o.email,
      predmet: `Máme to: ${c.predmet.replace(/^Obchod: /, "")}`,
      odpovedet: dilna,
      text: [
        `Ahoj, ${o.jmeno},`,
        "",
        o.druh === "satek"
          ? "díky, šátek je u nás. Kusy jsou originály, tak se nejdřív podíváme, jestli je všechno ještě k mání, a ozveme se s platbou."
          : "díky, objednávka dárkové jízdenky je u nás. Ozveme se, jak ji zaplatit, a pak ji pošleme.",
        "",
        ...c.radky,
        ...pozn,
        "",
        "Kdyby něco, stačí odpovědět na tenhle mail.",
        "",
        PODPIS,
      ].join("\n"),
    },
  };
}

/* Jednoduchý limit: z jedné adresy nejvýš 5 objednávek za 10 minut. Funkce na hostingu
   žije jen chvíli, takže to zastaví hlavně skript, který posílá jednu za druhou. */
const posledni = new Map<string, number[]>();
export function prilisCasto(kdo: string, ted = Date.now()): boolean {
  const okno = (posledni.get(kdo) ?? []).filter((t) => ted - t < 10 * 60_000);
  okno.push(ted);
  posledni.set(kdo, okno);
  return okno.length > 5;
}

export async function prijmi(o: Objednavka): Promise<Vysledek> {
  const dilna = OBJEDNAVKY_KOMU || kontakt.email;
  const m = maily(o, dilna);
  if (!m) return { ok: false, chyba: "kusy" };
  const posta: Posta | null = RESEND_API_KEY && REZERVACE_OD ? { klic: RESEND_API_KEY, od: REZERVACE_OD } : null;
  if (!posta) {
    console.info(`[objednavky] NAOKO, nic se neodeslalo:\n${m.dilne.predmet}\n${m.dilne.text}`);
    return { ok: true, naoko: true };
  }
  /* Bez mailu dílně by se objednávka ztratila — ten musí projít; zákazníkův je potvrzení navíc */
  if (!(await posli(posta, m.dilne))) return { ok: false, chyba: "posta" };
  await posli(posta, m.zakaznikovi);
  return { ok: true, naoko: false };
}
