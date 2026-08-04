/**
 * České skloňování počtu — 1 kurz, 2–4 kurzy, 5+ kurzů.
 * Díky tomu se počty v hlavičkách sekcí počítají z dat a nemůžou lhát.
 */
export function sklonuj(n: number, jeden: string, dva: string, pet: string): string {
  if (n === 1) return `${n} ${jeden}`;
  if (n >= 2 && n <= 4) return `${n} ${dva}`;
  return `${n} ${pet}`;
}

export const pocetKurzu = (n: number) => sklonuj(n, "kurz", "kurzy", "kurzů");
export const pocetKusu = (n: number) => sklonuj(n, "kus", "kusy", "kusů");
