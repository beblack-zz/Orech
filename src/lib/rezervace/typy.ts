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
  /** Jen permanentka: týdny, které vynechává, protože bylo plno */
  vynechat?: string[];
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
  /**
   * Prodané permanentky, které ještě platí: dt = den v týdnu podle Date.getDay(), h = hodina,
   * od–do = platnost. Každý týden v té době sedí na odjezdu v tu hodinu — v `obsazeno` nejsou —
   * kromě `vynechat`: týdny (RRRR-MM-DD), kdy při koupi bylo plno, ty se nejedou a neplatí.
   */
  permanentky: { dt: number; h: number; osob: number; od: string; do: string; vynechat: string[] }[];
  /** Kdo přišel přes svůj odkaz — jinak null a stránka je jen ke čtení */
  clen: { jmeno: string } | null;
  moje: Moje[];
}

/** POST /api/rezervuj */
export interface Zadost {
  druh: Druh;
  den: string;
  /** Začátky odjezdů — u permanentky ty, které se budou každý týden opakovat; u kurzu prázdné */
  hodiny: number[];
  osob: number;
  poznamka?: string;
}

/**
 * Proč to nešlo:
 *   neznamy     odkaz chybí nebo už neplatí
 *   spatne      žádost nesedí s pravidly (den, hodina, počet lidí)
 *   obsazeno    (starší hláška) odjezd je mezitím celý pryč
 *   plno        na odjezdu nebo v kurzu už není dost míst — u permanentky v jejím prvním týdnu (další plné se vynechají)
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
