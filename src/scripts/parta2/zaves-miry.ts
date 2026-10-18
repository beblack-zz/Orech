/**
 * Kolik má závěs s kami šňůrek a míst a kde na břevnu visí. Čistý modul
 * bez `window` a bez fyziky: potřebuje ho fyzika (zaves-fyzika.ts, i při
 * buildu) i lehká část závěsu, která se načítá hned se stránkou (zaves.ts)
 * — fyzika se dotáhne až po prvním vykreslení (zaves-pohyb.ts).
 */
export const SNUR = 3;
export const MIST = 3;
/** Kde na břevnu šňůrky visí */
export const KOTVY = [-19, 0, 19];
