/**
 * Čas Kontaktu. Na ukázku jde přepnout: /kontakt?cas=pa-17:40 (den a hodina
 * tohoto týdne; po/ut/st/ct/pa/so/ne) nebo ?cas=2026-07-07T10:00 (i s datem,
 * tedy i roční období a svátky). Všechno na stránce, co závisí na čase,
 * se ptá přes `ted()`, ať ukázka platí všude stejně.
 */

/** O kolik ms je čas stránky posunutý proti skutečnému */
function posunCasu(): number {
  const q = new URLSearchParams(window.location.search).get("cas");
  if (!q) return 0;
  const DNY: Record<string, number> = { ne: 0, po: 1, ut: 2, "út": 2, st: 3, ct: 4, "čt": 4, pa: 5, "pá": 5, so: 6 };
  const m = q.toLowerCase().match(/^([a-zúčá]{2})-?(\d{1,2})(?::(\d{2}))?$/);
  let cil: Date | null = null;
  if (m && DNY[m[1]] !== undefined) {
    cil = new Date();
    cil.setDate(cil.getDate() + ((DNY[m[1]] - cil.getDay() + 7) % 7));
    cil.setHours(Number(m[2]), Number(m[3] ?? 0), 0, 0);
  } else {
    const d = new Date(q);
    if (!Number.isNaN(d.getTime())) cil = d;
  }
  return cil ? cil.getTime() - Date.now() : 0;
}

let posun: number | null = null;

/** Posun ukázky v ms (0 = skutečný čas) */
export const posunUkazky = () => (posun ??= posunCasu());

/** Teď — se započtenou ukázkou */
export const ted = () => new Date(Date.now() + posunUkazky());
