/**
 * Ústředna 交換台 uvnitř dílny na Kontaktu — kdo sedí na které lince a co
 * řekne, když mu host zastrčí kolík (components/kontakt/kresba/uvnitr.ts,
 * scripts/kontakt/uvnitr.ts).
 *
 * Linka 二 je skutečný telefon dílny: zvedá ji ten, kdo má zrovna službu
 * (data/kontakt.ts → sluzba, teď vždy Cedulka). Jeho pevnou linku převezme
 * Kapka nebo Pecinka, kdo službu nemá; druhý z nich sedí na lince 九.
 * Ostatní mají linku pevnou. Cedulka je vlevo u knihy rezervací,
 * Kachlík vpravo u psacího stroje — v dílně odtud skočí k práci.
 *
 * Věty vycházejí z otázek na Dílně (data/dilna.ts → otazky, kdo čemu
 * rozumí) a z povah party (data/parta.ts). Jsou to návrhy, krátké, ať se
 * vejdou do bubliny i na mobilu.
 */
import type { PostavaId } from "./parta";
import { kdy } from "./dilna";

export const CISLA = ["一", "二", "三", "四", "五", "六", "七", "八", "九"] as const;

/** Pořadí linek: „sluzba“ = linka 二, „druha“ = druhá z dvojice Kapka–Pecinka */
const PEVNE: (PostavaId | "sluzba" | "druha")[] = ["hlinka", "sluzba", "samotka", "cedulka", "bublinka", "kachlik", "stripek", "vazicka", "druha"];

/** Kdo sedí na které lince (index 0 = 一), podle toho, kdo má službu */
export function linkyParty(sluzba: PostavaId): PostavaId[] {
  /* Kapka a Pecinka bez služby: první sedne na uvolněnou linku toho, kdo službu má, druhá na 九 */
  const volni = (["kapka", "pecinka"] as PostavaId[]).filter((x) => x !== sluzba);
  return PEVNE.map((x) => (x === "sluzba" ? sluzba : x === "druha" ? volni.pop()! : x === sluzba ? volni.shift()! : x));
}

export interface RecLinky {
  /** Co řekne, když se zastrčí kolík (střídají se) */
  vety: string[];
  /** Krátké skoky do řeči, když je na lince víc lidí naráz */
  doReci: string[];
  /** Zavřeno: rozespalá věta, když ho kolík vzbudí */
  ospale: string[];
  /** Zavřeno a víc linek naráz: mluví ze spaní */
  zeSpani: string;
}

export const reci: Record<PostavaId, RecLinky> = {
  hlinka: {
    vety: ["Nic si nenos. Zástěru i hlínu tu máme.", "Přijď v tom, co snese flek. Třeba ode mě."],
    doReci: ["Já jsem pořád jen hrouda!", "Můžu taky?"],
    ospale: ["Mmm… ještě pět minut… jsem hrouda…"],
    zeSpani: "…budu miska… nebo drak…",
  },
  kapka: {
    vety: ["Kafe je v ceně. Já jsem tu stejně kvůli vodě.", "Dítě vezmi! Hlína se malých rukou nebojí."],
    doReci: ["A leskne se to?", "Kdo chce kafe?"],
    ospale: ["Blub… já nespím, já jen kapu…"],
    zeSpani: "…louže… lesklá louže…",
  },
  pecinka: {
    vety: ["Dva až tři týdny a je to tvrdý jako kámen.", "Neotvírej mě. Ještě ne. Ještě… ne."],
    doReci: ["Přitopím!", "Tady je ale horko, co?"],
    ospale: ["Jsem vyhaslá… ráno se rozpálím…"],
    zeSpani: "…tisíc dvě stě osmdesát… chrrr…",
  },
  stripek: {
    vety: ["Bez lektora? Jasně, open studio. Na kruh chce ale základy.", "Rozbít se není konec světa. Já to vím nejlíp."],
    doReci: ["To nic, to se slepí!", "Já se taky rozbil!"],
    ospale: ["Kdo… cink? Jo, to jsem jen já…"],
    zeSpani: "…zlatem… slepit zlatem…",
  },
  vazicka: {
    vety: ["Umět nemusíš nic. Lektor tě provede od první hroudy.", "Rovně sedět, rovně točit. A dýchat."],
    doReci: ["Rovná záda i u telefonu!", "Prosím, jeden po druhém."],
    ospale: ["Dáma se v noci nebudí… zavolej ráno."],
    zeSpani: "…lokty k tělu… lokty…",
  },
  samotka: {
    vety: [`Přijď s partou! Čím víc vás, tím míň platí každý.`, `Na hodinu je tu ${kdy.mist} místa. Unesu vás všechny.`],
    doReci: ["Zvládnu to.", "Unesu i tohle."],
    ospale: ["Odpočívám… i police si musí lehnout…"],
    zeSpani: "…zvládnu to… vždycky…",
  },
  kachlik: {
    vety: ["Platí se až na místě — kolik vás přijde, tolik vás je.", "Nemůžeš? Dej vědět, místo dostane někdo jiný."],
    doReci: ["Nepředbíhat!", "Pravý úhel, prosím!"],
    ospale: ["Zzz… devadesát stupňů… zzz…"],
    zeSpani: "…čtyři strany… čtyři…",
  },
  cedulka: {
    vety: ["Glazuje se až po výpalu. Přijdeš ještě jednou.", "Napiš se na mě. Za dva týdny mi poděkuješ."],
    doReci: ["Zapisuju!", "Kdo to říkal?"],
    ospale: ["Mmm… čí je která miska… zítra…"],
    zeSpani: "…tahle je tvoje… tahle ne…",
  },
  bublinka: {
    vety: ["Já tam nejsem. Fakt.", "Hněť pořádně. Jinak se uvidíme v peci."],
    doReci: ["Já to slyším taky!", "Psst, já poslouchám."],
    ospale: ["Já nespím. Já hlídám."],
    zeSpani: "…prásk… hihi…",
  },
};

/** Konferenční hovor: tři a víc linek naráz */
export const konference = {
  /** Vázička zjedná pořádek (když je na lince taky) */
  ticho: "Ticho! Jeden po druhém.",
  /** Všech devět naráz: každý se zeptá a pak se ozve ten, kdo má službu */
  vsichni: "Haló?",
  vsichniZaver: "A kdo teď hlídá dílnu?!",
};

/** Kolik jich je na lince naráz — slovem, na začátek věty */
export const POCTY = ["", "Jeden", "Dva", "Tři", "Čtyři", "Pět", "Šest", "Sedm", "Osm", "Devět"];

/** Řádek pod tlačítky (aria-live) — {cislo}, {jmeno}, {veta}, {pocet} (slovem) */
export const ustrednaHlaseni = {
  spojeno: "Linka {cislo} · {jmeno}: „{veta}“",
  zaveseno: "Linka {cislo} zavěšena.",
  konference: "{pocet} z party na jedné lince — skáčou si do řeči.",
  konferenceSpi: "{pocet} z party na jedné lince — mluví ze spaní.",
  vsichni: "Všech devět linek spojeno.",
  probudil: "Linka {cislo} · {jmeno} rozespale: „{veta}“",
};
