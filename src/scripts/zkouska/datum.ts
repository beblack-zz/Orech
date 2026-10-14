/**
 * Data v sešitě a na mistrovském listu — česky i japonsky, jak se píšou
 * štětcem do knížek goshuin: 十月十四日, rok éry 令和八年.
 */
const CISLICE = ["〇", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

/** 1–99 znaky: 14 → 十四, 20 → 二十, 31 → 三十一 */
export function kanjiCislo(n: number) {
  const c = Math.max(0, Math.floor(n));
  if (c < 10) return CISLICE[c];
  const desitky = Math.floor(c / 10) % 10;
  const jednotky = c % 10;
  return `${desitky > 1 ? CISLICE[desitky] : ""}十${jednotky ? CISLICE[jednotky] : ""}`;
}

export const datumJaponsky = (t: number) => {
  const d = new Date(t);
  return `${kanjiCislo(d.getMonth() + 1)}月${kanjiCislo(d.getDate())}日`;
};

/** Éra Reiwa začala rokem 2019 — 2026 je osmý rok */
export const rokJaponsky = (t: number) => `令和${kanjiCislo(new Date(t).getFullYear() - 2018)}年`;

export const datumCesky = (t: number) => {
  const d = new Date(t);
  return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`;
};
