/**
 * Rezervace hodin v dílně — /rezervace.
 *
 * Termíny jsou každé úterý a pátek po hodinách od 9 do 18, na měsíc
 * dopředu. Obsazenost je zatím SIMULOVANÁ (scripts/rezervace/hlavni.ts):
 * backend nemáme, rezervace se posílá mailem. Až bude skutečný kalendář,
 * stačí místo simulace načíst volná místa odjinud.
 */
export const rezervace = {
  /** Dny v týdnu podle Date.getDay(): 2 = úterý, 5 = pátek */
  dny: [2, 5],
  /** První a poslední hodina — poslední termín je 17:00–18:00 */
  od: 9,
  do: 18,
  /** Cena za jednoho člověka a hodinu */
  cena: 400,
  maxOsob: 4,
  /** Kolik dní dopředu se dá rezervovat */
  dniDopredu: 31,
  /**
   * Míst na jednu hodinu — jen pro simulaci obsazenosti. Číslo je ze
   * stránky Open studio („kapacita je 6 lidí na směnu“); pokud platí
   * pro rezervace jiné, přepiš ho tady.
   */
  kapacita: 6,
};
