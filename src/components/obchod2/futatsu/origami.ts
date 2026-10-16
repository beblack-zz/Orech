/**
 * 五 Origami 折紙 — osvědčení kusu jako přeložený list washi.
 *
 *   washi()    papír se svislým přehybem: levá strana chytá ranní světlo
 *              zleva, pravá se od přehybu stáčí do mírného stínu. Okraje
 *              jsou ručně trhané (mimi), horní a dolní hrana se u přehybu
 *              lehce prohne, jak list leží rozevřený. Kreslí se do
 *              libovolného obdélníku (preserveAspectRatio none) — jen
 *              plochy a přechody, které natažení snesou.
 *   pecet()    rumělková pečeť ジロ作 (vlevo 作, vpravo ジロ, bílé znaky
 *              v červeném poli, jak se pečeť otiskne)
 *
 * PREHYB je poměr, kde je přehyb — stejný jako sloupce obsahu ve futatsu.css.
 */
const f = (n: number) => Math.round(n * 100) / 100;
type Bod = [number, number];
const cesta = (b: Bod[]) => "M" + b.map(([x, y]) => `${f(x)} ${f(y)}`).join("L") + "Z";

/** Kde je přehyb (podíl šířky) — sedí na mřížku .ft-washi-obsah */
export const PREHYB = 0.44;

/** Trhaný okraj: pevná vlnka z několika sinusů, bez náhody */
const vlnka = (t: number, sem: number, a: number) => a * (0.55 * Math.sin(t * 37 + sem) + 0.3 * Math.sin(t * 91 + sem * 2.3) + 0.15 * Math.sin(t * 173 + sem * 0.7));

/** List: vnitřek <svg viewBox="0 0 1000 1000" preserveAspectRatio="none"> */
export function washi(p = "ftw"): string {
  const W = 1000;
  const H = 1000;
  const px = W * PREHYB;
  /* Obrys: horní a dolní hrana se u přehybu prohnou o kousek dovnitř */
  const prohnuti = (x: number) => 9 * Math.exp(-(((x - px) / 160) ** 2));
  const horni: Bod[] = [];
  const dolni: Bod[] = [];
  for (let i = 0; i <= 120; i++) {
    const t = i / 120;
    const x = 6 + t * (W - 12);
    horni.push([x, 8 + prohnuti(x) + vlnka(t, 1.3, 2.2)]);
    dolni.push([x, H - 8 - prohnuti(x) * 0.6 + vlnka(t, 4.1, 2.2)]);
  }
  const levy: Bod[] = [];
  const pravy: Bod[] = [];
  for (let i = 1; i < 60; i++) {
    const t = i / 60;
    levy.push([6 + vlnka(t, 2.7, 2.6), 8 + t * (H - 16)]);
    pravy.push([W - 6 + vlnka(t, 5.9, 2.6), 8 + t * (H - 16)]);
  }
  const obrys = cesta([...horni, ...pravy, ...dolni.reverse(), ...levy.reverse()]);
  const defs =
    `<clipPath id="${p}-list"><path d="${obrys}"/></clipPath>` +
    /* Ráno zleva: levá strana světlá, k přehybu teplý stín, pravá strana se zase zvedá ke světlu */
    `<linearGradient id="${p}-svetlo" x1="0" y1="0" x2="1" y2="0">` +
    `<stop offset="0" stop-color="#FFFDF6"/>` +
    `<stop offset="${f(PREHYB * 0.6)}" stop-color="#FBF6EA"/>` +
    `<stop offset="${f(PREHYB - 0.01)}" stop-color="#F1E7D3"/>` +
    `<stop offset="${f(PREHYB)}" stop-color="#E2D3B8"/>` +
    `<stop offset="${f(PREHYB + 0.012)}" stop-color="#EDE2CB"/>` +
    `<stop offset="${f(PREHYB + 0.12)}" stop-color="#F6EEDE"/>` +
    `<stop offset="0.84" stop-color="#F8F1E3"/>` +
    `<stop offset="1" stop-color="#EFE5D2"/></linearGradient>` +
    `<linearGradient id="${p}-shora" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.35"/><stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="1" stop-color="#C9B48E" stop-opacity="0.12"/></linearGradient>` +
    `<radialGradient id="${p}-rano" cx="0.12" cy="0.2" r="0.8"><stop offset="0" stop-color="#FFE7C2" stop-opacity="0.35"/><stop offset="1" stop-color="#FFE7C2" stop-opacity="0"/></radialGradient>`;
  return (
    `<defs>${defs}</defs>` +
    `<path d="${obrys}" fill="url(#${p}-svetlo)"/>` +
    `<g clip-path="url(#${p}-list)"><rect width="${W}" height="${H}" fill="url(#${p}-shora)"/><rect width="${W}" height="${H}" fill="url(#${p}-rano)"/>` +
    /* Hrana přehybu: tmavší rýha a hned vedle světlý hřbet */
    `<g class="${p}-prehyb"><line x1="${f(px)}" y1="0" x2="${f(px)}" y2="${H}" stroke="#B9A47F" stroke-width="1.2" stroke-opacity="0.55" vector-effect="non-scaling-stroke"/>` +
    `<line x1="${f(px - 1.6)}" y1="0" x2="${f(px - 1.6)}" y2="${H}" stroke="#FFFFFF" stroke-width="1.4" stroke-opacity="0.7" vector-effect="non-scaling-stroke"/></g></g>` +
    /* Okraj papíru — vlákna na trhané hraně jsou o tón světlejší */
    `<path d="${obrys}" fill="none" stroke="#FFFFFF" stroke-width="1.6" stroke-opacity="0.75" vector-effect="non-scaling-stroke"/>`
  );
}

/**
 * Pečeť ジロ作: vnitřek <svg viewBox="0 0 64 64">. Znaky píše písmo webu
 * (třída ftw-pecet-znak, Yuji Syuku); pole je rumělka s otiskem, který
 * na kraji není dokonalý.
 */
export function pecet(p = "ftw"): string {
  const okraj: Bod[] = [];
  for (let i = 0; i < 48; i++) {
    const t = i / 48;
    const strana = Math.floor(t * 4);
    const u = t * 4 - strana;
    const o = 1.2 * Math.sin(i * 2.7) * Math.sin(i * 0.9 + 1);
    const b: Bod[] = [[6 + u * 52, 6], [58, 6 + u * 52], [58 - u * 52, 58], [6, 58 - u * 52]];
    const [x, y] = b[strana];
    okraj.push([x + (strana % 2 ? o : 0), y + (strana % 2 ? 0 : o)]);
  }
  return (
    `<g transform="rotate(-4 32 32)">` +
    `<path d="${cesta(okraj)}" fill="#C4432B"/>` +
    `<path d="${cesta(okraj.map(([x, y]) => [32 + (x - 32) * 0.86, 32 + (y - 32) * 0.86] as Bod))}" fill="none" stroke="#FBF3E6" stroke-width="1.1" opacity="0.9"/>` +
    `<text x="44" y="27.5" font-size="15" text-anchor="middle" class="${p}-pecet-znak">ジ</text>` +
    `<text x="44" y="46" font-size="15" text-anchor="middle" class="${p}-pecet-znak">ロ</text>` +
    `<text x="22" y="40" font-size="25" text-anchor="middle" class="${p}-pecet-znak">作</text>` +
    `</g>`
  );
}
