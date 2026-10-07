/**
 * Japonský kalendář (暦 koyomi) — pro Rezervaci a O nás 2.
 *
 * Dny v týdnu mají v japonštině jména podle živlů a nebeských těles.
 * Dílna má otevřeno v úterý a v pátek — v japonštině je to den ohně
 * (火曜日) a den zlata (金曜日). Pecinka a Střípek z toho mají radost.
 *
 * Rok se tradičně dělí na 24 období po zhruba patnácti dnech (二十四節気
 * nijūshi sekki). Začínají každý rok skoro ve stejný den; data níže jsou
 * obvyklá, skutečný začátek se může o den posunout.
 */

/** Podle Date.getDay(): 0 = neděle */
export const DNY_ZNAK = ["日", "月", "火", "水", "木", "金", "土"] as const;
export const DNY_ZNAK_VYZNAM = ["slunce", "měsíc", "oheň", "voda", "strom", "zlato", "země"] as const;

export interface Sekki {
  znak: string;
  cteni: string;
  cesky: string;
  /** Obvyklý první den: [měsíc 1–12, den] */
  od: [number, number];
}

export const sekki: Sekki[] = [
  { znak: "小寒", cteni: "shōkan", cesky: "malá zima", od: [1, 5] },
  { znak: "大寒", cteni: "daikan", cesky: "velká zima", od: [1, 20] },
  { znak: "立春", cteni: "risshun", cesky: "začátek jara", od: [2, 4] },
  { znak: "雨水", cteni: "usui", cesky: "dešťová voda", od: [2, 19] },
  { znak: "啓蟄", cteni: "keichitsu", cesky: "probouzí se hmyz", od: [3, 5] },
  { znak: "春分", cteni: "shunbun", cesky: "jarní rovnodennost", od: [3, 20] },
  { znak: "清明", cteni: "seimei", cesky: "čisto a jasno", od: [4, 5] },
  { znak: "穀雨", cteni: "kokuu", cesky: "déšť pro obilí", od: [4, 20] },
  { znak: "立夏", cteni: "rikka", cesky: "začátek léta", od: [5, 5] },
  { znak: "小満", cteni: "shōman", cesky: "malé zrání", od: [5, 21] },
  { znak: "芒種", cteni: "bōshu", cesky: "obilí v klasech", od: [6, 6] },
  { znak: "夏至", cteni: "geshi", cesky: "letní slunovrat", od: [6, 21] },
  { znak: "小暑", cteni: "shōsho", cesky: "malé horko", od: [7, 7] },
  { znak: "大暑", cteni: "taisho", cesky: "velké horko", od: [7, 23] },
  { znak: "立秋", cteni: "risshū", cesky: "začátek podzimu", od: [8, 7] },
  { znak: "処暑", cteni: "shosho", cesky: "horko polevuje", od: [8, 23] },
  { znak: "白露", cteni: "hakuro", cesky: "bílá rosa", od: [9, 8] },
  { znak: "秋分", cteni: "shūbun", cesky: "podzimní rovnodennost", od: [9, 23] },
  { znak: "寒露", cteni: "kanro", cesky: "studená rosa", od: [10, 8] },
  { znak: "霜降", cteni: "sōkō", cesky: "padá jinovatka", od: [10, 23] },
  { znak: "立冬", cteni: "rittō", cesky: "začátek zimy", od: [11, 7] },
  { znak: "小雪", cteni: "shōsetsu", cesky: "malý sníh", od: [11, 22] },
  { znak: "大雪", cteni: "taisetsu", cesky: "velký sníh", od: [12, 7] },
  { znak: "冬至", cteni: "tōji", cesky: "zimní slunovrat", od: [12, 22] },
];

/** Které z 24 období na den připadá */
export function sekkiDne(d: Date): Sekki {
  const klic = (d.getMonth() + 1) * 100 + d.getDate();
  let vysledek = sekki[sekki.length - 1];
  for (const s of sekki) if (s.od[0] * 100 + s.od[1] <= klic) vysledek = s;
  return vysledek;
}

/** Japonská jména měsíců jsou prostě čísla: 二月 je druhý měsíc */
const CISLICE = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
export const mesicZnak = (m: number) => (m <= 10 ? CISLICE[m] : `十${CISLICE[m - 10]}`) + "月";
