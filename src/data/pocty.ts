/**
 * České skloňování počtu — 1 kurz, 2–4 kurzy, 5+ kurzů.
 * Díky tomu se počty v hlavičkách sekcí počítají z dat a nemůžou lhát.
 */
export function sklonuj(n: number, jeden: string, dva: string, pet: string): string {
  if (n === 1) return `${n} ${jeden}`;
  if (n >= 2 && n <= 4) return `${n} ${dva}`;
  return `${n} ${pet}`;
}

/** „ze 7“, ale „z 5“ — předložka podle toho, jak se číslo čte (ze sedmi, z pěti) */
export const zPoctu = (n: number) => `${[2, 3, 4, 6, 7, 100].includes(n) ? "ze" : "z"} ${n}`;

/** „volné 1 místo“, „volná 3 místa“, „volných 5 míst“ */
export const volnaMista = (n: number) => (n === 1 ? "volné 1 místo" : n >= 2 && n <= 4 ? `volná ${n} místa` : `volných ${n} míst`);

/** „jen 1 místo“, „jen 3 místa“, „jen 5 míst“ — a totéž se slovesem: „zbývají jen 3 místa“ */
export const jenMist = (n: number) => (n === 1 ? "jen 1 místo" : n >= 2 && n <= 4 ? `jen ${n} místa` : `jen ${n} míst`);
export const zbyvaMist = (n: number) => `${n >= 2 && n <= 4 ? "zbývají" : "zbývá"} ${jenMist(n)}`;

export const pocetKurzu = (n: number) => sklonuj(n, "kurz", "kurzy", "kurzů");
export const pocetKusu = (n: number) => sklonuj(n, "kus", "kusy", "kusů");
