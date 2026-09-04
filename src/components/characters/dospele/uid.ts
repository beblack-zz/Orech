let citac = 0;

/**
 * Unikátní prefix pro `id` uvnitř jedné SVG kresby.
 *
 * Postavičky se na /parta vykreslují dvakrát (vzorník bez tváře a s tváří).
 * Bez tohohle by se `id` gradientů, patternů a clipPathů zdvojila, `url(#…)`
 * by se vždycky trefilo do první instance a druhá by tiše jela na cizí
 * definici. Dokud jsou obě kresby shodné, projde to — ale rozejde se to
 * ve chvíli, kdy se jedna z nich změní.
 *
 * Čítač běží v rámci jednoho buildu, takže výstup je deterministický.
 */
export const uid = () => `p${(citac++).toString(36)}`;
