/**
 * 二 Výkres — rýsovací prkno v noci pod lampou. Na prkně leží modrotisk
 * (kresba.ts), pod ním pauzák s izometrií, vedle připíchnutý kusovník
 * a tři pracovní fotky předlohy. Ty jsou HTML a kladou se mřížkou
 * (styles/futatsu.css); tady se kreslí, na čem a pod čím leží:
 *
 *   deska()    plocha prkna — lípa, kterou zespodu osvětluje lampa.
 *              Kreslí se do libovolného obdélníku (preserveAspectRatio
 *              none), proto jen přechody a pár dlouhých let dřeva, které
 *              natažení snesou; čáry mají stálou tloušťku.
 *   hrana()    přední hrana prkna — dlouhý pruh, ořízne se na šířku
 *   lampa()    architektská lampa přišroubovaná nahoře vpravo
 *   pripinacek()  rumělkový připínáček na fotky a kusovník
 *
 * Světlo jde od lampy vpravo nahoře, jinak je noc. Barvy jen jako
 * přechody a plochy, bez filtrů a zrna.
 */
const f = (n: number) => Math.round(n * 100) / 100;

/** Plocha prkna: vnitřek <svg viewBox="0 0 1000 1000" preserveAspectRatio="none"> */
export function deska(p = "ftp"): string {
  const defs =
    `<linearGradient id="${p}-drevo" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3A2A1E"/><stop offset="0.3" stop-color="#7A5A3C"/><stop offset="0.62" stop-color="#A9835A"/><stop offset="0.86" stop-color="#8E6B47"/><stop offset="1" stop-color="#4C3626"/></linearGradient>` +
    `<linearGradient id="${p}-shora" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE2B0" stop-opacity="0.22"/><stop offset="0.35" stop-color="#FFE2B0" stop-opacity="0.08"/><stop offset="0.75" stop-color="#1A120C" stop-opacity="0.18"/><stop offset="1" stop-color="#1A120C" stop-opacity="0.55"/></linearGradient>` +
    `<radialGradient id="${p}-tune" cx="0.6" cy="0.32" r="0.55"><stop offset="0" stop-color="#FFD8A0" stop-opacity="0.4"/><stop offset="0.45" stop-color="#F2B878" stop-opacity="0.14"/><stop offset="1" stop-color="#F2B878" stop-opacity="0"/></radialGradient>`;
  /* Léta dřeva: pár dlouhých, mírně zvlněných čar přes celé prkno */
  let leta = "";
  for (let i = 0; i < 14; i++) {
    const y = 40 + i * 68 + (i % 3) * 9;
    const a = 6 + (i % 4) * 3;
    leta += `<path d="M-10 ${y}C250 ${y - a} 420 ${y + a * 1.4} 620 ${y + 2}S880 ${y - a} 1010 ${y + a * 0.5}" fill="none" stroke="#2A1C12" stroke-opacity="${f(0.07 + (i % 2) * 0.04)}" stroke-width="1.2" vector-effect="non-scaling-stroke"/>`;
  }
  return (
    `<defs>${defs}</defs>` +
    `<rect width="1000" height="1000" fill="url(#${p}-drevo)"/>` +
    leta +
    `<rect width="1000" height="1000" fill="url(#${p}-shora)"/>` +
    `<rect width="1000" height="1000" fill="url(#${p}-tune)"/>`
  );
}

/** Přední hrana prkna: <svg viewBox="0 0 3000 22" preserveAspectRatio="xMinYMid slice"> */
export function hrana(p = "ftp"): string {
  return (
    `<defs><linearGradient id="${p}-hrana" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E7C48E"/><stop offset="0.12" stop-color="#9C7348"/><stop offset="0.6" stop-color="#5C3F28"/><stop offset="1" stop-color="#2A1C12"/></linearGradient>` +
    `<linearGradient id="${p}-hrana-svetlo" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000000" stop-opacity="0.45"/><stop offset="0.45" stop-color="#000000" stop-opacity="0"/><stop offset="0.75" stop-color="#FFD8A0" stop-opacity="0.12"/><stop offset="1" stop-color="#000000" stop-opacity="0.3"/></linearGradient></defs>` +
    `<rect width="3000" height="22" fill="url(#${p}-hrana)"/><rect width="3000" height="22" fill="url(#${p}-hrana-svetlo)"/>`
  );
}

/**
 * Architektská lampa: svorka na horní hraně prkna vpravo, dvě ramena
 * s pružinami a kuželové stínidlo, které míří doleva dolů na výkres.
 * viewBox LAMPA; svorka sedí dole vpravo na y = LAMPA.hrana.
 */
export const LAMPA = { w: 360, h: 300, hrana: 270 };
export function lampa(p = "ftp"): string {
  const kov = "#2E3A34";
  const kovSvetlo = "#7C968A";
  const kovStin = "#1A211D";
  /* Klouby: svorka → loket → hlava */
  const S: [number, number] = [318, 252];
  const L: [number, number] = [262, 54];
  const H: [number, number] = [96, 118];
  const rameno = (a: [number, number], b: [number, number], posun: number) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy);
    const nx = (-dy / l) * posun;
    const ny = (dx / l) * posun;
    return `M${f(a[0] + nx)} ${f(a[1] + ny)}L${f(b[0] + nx)} ${f(b[1] + ny)}`;
  };
  const pruzina = (a: [number, number], b: [number, number], posun: number, n: number) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy);
    const nx = (-dy / l) * posun;
    const ny = (dx / l) * posun;
    let d = "";
    for (let i = 0; i <= n; i++) {
      const t = 0.22 + (0.5 * i) / n;
      const x = a[0] + dx * t + nx;
      const y = a[1] + dy * t + ny;
      d += `M${f(x - nx * 0.5 - (dx / l) * 1.6)} ${f(y - ny * 0.5 - (dy / l) * 1.6)}l${f(nx * 1.0 + (dx / l) * 3.2)} ${f(ny * 1.0 + (dy / l) * 3.2)}`;
    }
    return d;
  };
  /* Stínidlo: kužel osou doleva dolů (−130°), ústí elipsa */
  const osa = (-128 * Math.PI) / 180;
  const ox = Math.cos(osa);
  const oy = Math.sin(osa) * -1;
  const kolX = -oy;
  const kolY = ox;
  const vrch: [number, number] = [H[0] + 8, H[1] - 6];
  const delka = 74;
  const usti: [number, number] = [vrch[0] + ox * delka, vrch[1] + oy * delka];
  const r0 = 13;
  const r1 = 44;
  const kuzel = `M${f(vrch[0] + kolX * r0)} ${f(vrch[1] + kolY * r0)}L${f(usti[0] + kolX * r1)} ${f(usti[1] + kolY * r1)}L${f(usti[0] - kolX * r1)} ${f(usti[1] - kolY * r1)}L${f(vrch[0] - kolX * r0)} ${f(vrch[1] - kolY * r0)}Z`;
  const uhelUsti = (Math.atan2(kolY, kolX) * 180) / Math.PI;
  const defs =
    `<linearGradient id="${p}-kuzel" gradientUnits="userSpaceOnUse" x1="${f(usti[0] + kolX * r1)}" y1="${f(usti[1] + kolY * r1)}" x2="${f(usti[0] - kolX * r1)}" y2="${f(usti[1] - kolY * r1)}"><stop offset="0" stop-color="${kovSvetlo}"/><stop offset="0.3" stop-color="${kov}"/><stop offset="1" stop-color="${kovStin}"/></linearGradient>` +
    `<radialGradient id="${p}-ziri" gradientUnits="userSpaceOnUse" cx="${f(usti[0])}" cy="${f(usti[1])}" r="70"><stop offset="0" stop-color="#FFF6E2" stop-opacity="0.9"/><stop offset="0.35" stop-color="#FFDDA6" stop-opacity="0.45"/><stop offset="1" stop-color="#FFC982" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="${p}-usti" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFF8EA"/><stop offset="0.6" stop-color="#FFE3B4"/><stop offset="1" stop-color="#F0B97A"/></linearGradient>`;
  let s = `<defs>${defs}</defs>`;
  /* Záře kolem ústí (pod lampou, ať ji kov zakryje) */
  s += `<circle cx="${f(usti[0])}" cy="${f(usti[1])}" r="70" fill="url(#${p}-ziri)"/>`;
  /* Svorka na hraně prkna */
  s += `<path d="M${S[0] - 22} ${LAMPA.hrana - 30}h40v52h-40z" fill="${kov}"/><path d="M${S[0] - 22} ${LAMPA.hrana - 30}h40v5h-40z" fill="${kovSvetlo}" opacity="0.6"/>`;
  s += `<path d="M${S[0] - 14} ${LAMPA.hrana + 22}v8h24v-8" fill="${kovStin}"/><circle cx="${S[0] - 2}" cy="${LAMPA.hrana + 30}" r="5" fill="${kov}"/>`;
  /* Ramena: dvojitá tyčka a pružina */
  for (const [a, b] of [[S, L], [L, H]] as [[number, number], [number, number]][]) {
    s += `<path d="${rameno(a, b, 3.2)}${rameno(a, b, -3.2)}" stroke="${kov}" stroke-width="3.4" stroke-linecap="round"/>`;
    s += `<path d="${rameno(a, b, 3.2)}" stroke="${kovSvetlo}" stroke-width="1" stroke-linecap="round" opacity="0.7"/>`;
    s += `<path d="${pruzina(a, b, 9, 16)}" stroke="#8FA69A" stroke-width="1.1" stroke-linecap="round" opacity="0.8"/>`;
  }
  /* Klouby */
  for (const k of [S, L, H]) s += `<circle cx="${k[0]}" cy="${k[1]}" r="7.5" fill="${kovStin}"/><circle cx="${k[0] - 1.6}" cy="${k[1] - 1.6}" r="3" fill="${kovSvetlo}" opacity="0.8"/>`;
  /* Stínidlo a svítící ústí */
  s += `<path d="${kuzel}" fill="url(#${p}-kuzel)"/>`;
  s += `<path d="${rameno(vrch, usti, r0 * 0.4)}" stroke="#A9C2B5" stroke-width="1.2" opacity="0.45"/>`;
  s += `<ellipse cx="${f(usti[0])}" cy="${f(usti[1])}" rx="${r1}" ry="${f(r1 * 0.34)}" transform="rotate(${f(uhelUsti)} ${f(usti[0])} ${f(usti[1])})" fill="url(#${p}-usti)"/>`;
  s += `<ellipse cx="${f(usti[0] - ox * 4)}" cy="${f(usti[1] - oy * 4)}" rx="${f(r1 * 0.42)}" ry="${f(r1 * 0.17)}" transform="rotate(${f(uhelUsti)} ${f(usti[0] - ox * 4)} ${f(usti[1] - oy * 4)})" fill="#FFFFFF" opacity="0.85"/>`;
  /* Vršek stínidla s vypínačem */
  s += `<circle cx="${f(vrch[0])}" cy="${f(vrch[1])}" r="${r0 + 2}" fill="${kov}"/><circle cx="${f(vrch[0] - 3)}" cy="${f(vrch[1] - 4)}" r="5" fill="${kovSvetlo}" opacity="0.5"/>`;
  return s;
}
/** Kde svítí ústí lampy (souřadnice LAMPA) — sem míří světelná tůně na prkně */
export const USTI_LAMPY = { x: 50, y: 176 };

/**
 * Světlo lampy přes všechno, co na prkně leží (list, kusovník, fotky):
 * teplá tůně vpravo nahoře a tma do rohů. Vnitřek <svg viewBox="0 0 1000 1000"
 * preserveAspectRatio="none">, na stránce leží nad obsahem a nechytá myš.
 */
export function svetloLampy(p = "ftp"): string {
  return (
    `<defs><radialGradient id="${p}-lampa" cx="0.66" cy="0.26" r="0.62"><stop offset="0" stop-color="#FFE3B2" stop-opacity="0.2"/><stop offset="0.5" stop-color="#FFD39C" stop-opacity="0.06"/><stop offset="1" stop-color="#FFD39C" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="${p}-tma" cx="0.62" cy="0.3" r="0.9"><stop offset="0.55" stop-color="#0E0A14" stop-opacity="0"/><stop offset="1" stop-color="#0E0A14" stop-opacity="0.38"/></radialGradient></defs>` +
    `<rect width="1000" height="1000" fill="url(#${p}-lampa)"/><rect width="1000" height="1000" fill="url(#${p}-tma)"/>`
  );
}

/** Rumělkový připínáček shora: <svg viewBox="0 0 24 24"> */
export const pripinacek = (p: string) =>
  `<defs><radialGradient id="${p}" cx="0.36" cy="0.32" r="0.7"><stop offset="0" stop-color="#F7A08A"/><stop offset="0.45" stop-color="#C4432B"/><stop offset="1" stop-color="#7A2416"/></radialGradient></defs>` +
  `<ellipse cx="14" cy="16" rx="8" ry="5" fill="#140C08" opacity="0.35"/><circle cx="11" cy="11" r="8" fill="url(#${p})"/><circle cx="8.6" cy="8.4" r="2.4" fill="#FFFFFF" opacity="0.55"/>`;
