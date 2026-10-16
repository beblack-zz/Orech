/**
 * Co si posílá stránka /rezervace se serverem (src/pages/api). Časy jsou
 * hodiny dne i s půlkou jako všude na webu: 10.5 je 10:30.
 */
export type Druh = "odjezd" | "kurz" | "permanentka";

/** Rezervace přihlášeného člena, jak ji vidí on sám */
export interface Moje {
  id: number;
  druh: Druh;
  /** RRRR-MM-DD; u permanentky první den, kdy platí */
  den: string;
  /** Jen permanentka: poslední den platnosti */
  do: string | null;
  /** Kurz je na celý den a čas nemá */
  h: number | null;
  osob: number;
}

/** GET /api/volno — co je zamluvené ode dneška dál, bez jmen */
export interface Volno {
  /** false = rezervace nejsou zapojené; stránka ukáže ukázku a jízdenku pošle mailem */
  zive: boolean;
  /** Kolik míst je na kterém odjezdu zamluvených */
  obsazeno: { den: string; h: number; osob: number }[];
  /** h null = zavřený celý den */
  zavreno: { den: string; h: number | null }[];
  kurzy: { den: string; kurz: string; mist: number; obsazeno: number }[];
  /** dt = den v týdnu podle Date.getDay() */
  permanentky: { dt: number; h: number; osob: number; do: string }[];
  /** Kdo přišel přes svůj odkaz — jinak null a stránka je jen ke čtení */
  clen: { jmeno: string } | null;
  moje: Moje[];
}

/** POST /api/rezervuj */
export interface Zadost {
  druh: Druh;
  den: string;
  /** Začátky odjezdů nebo spojů permanentky; u kurzu prázdné */
  hodiny: number[];
  osob: number;
  poznamka?: string;
}

/**
 * Proč to nešlo:
 *   neznamy     odkaz chybí nebo už neplatí
 *   spatne      žádost nesedí s pravidly (den, hodina, počet lidí)
 *   obsazeno    (starší hláška) odjezd je mezitím celý pryč
 *   plno        na odjezdu, v kurzu nebo na permanentce už není dost míst
 *   zavreno     ten den nebo odjezd je zavřený
 *   vyluka      ten den jede kurz
 *   nejede      kurz ten den vypsaný není
 *   pozde       zrušit už nejde, je moc blízko
 *   permanentka permanentka se přes web neruší
 *   nenalezeno  taková rezervace není (nebo není tvoje)
 *   vypnuto     rezervace nejsou zapojené
 *   chyba       něco se pokazilo na serveru
 */
export type Chyba =
  | "neznamy" | "spatne" | "obsazeno" | "plno" | "zavreno" | "vyluka" | "nejede"
  | "pozde" | "permanentka" | "nenalezeno" | "vypnuto" | "chyba";

export type Odpoved = { ok: true } | { ok: false; chyba: Chyba };
