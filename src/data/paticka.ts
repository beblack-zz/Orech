/**
 * Patička nového vzhledu: řez hlínou pod loukou. Nahoře kontakt, pod ním
 * se dá kopat do starších vrstev — čím hlouběji, tím dřív.
 *
 * Hloubky a vrstvy jsou zjednodušené (pod Ořechem nikdo nekopal), nálezy
 * jsou typické pro okolí Prahy. Spodní vrstva sedí na Chýnický profil
 * kousek vedle — v katastru Zbuzan a Dobříče vystupuje spodní a střední
 * devon Barrandienu (lokality.geology.cz).
 */

/** Z O nás 2 (data/onas2.ts): „Dílna je otevřená v úterý a v pátek 9:00–18:30.“ */
export const oteviraciDoba = { dny: "úterý a pátek", cas: "9:00–18:30" };

export type VrstvaId = "orech" | "kachel" | "vlnice" | "tuha" | "linearni" | "trilobit";

export interface Vrstva {
  id: VrstvaId;
  /** Hloubka a doba nad nadpisem */
  hloubka: string;
  doba: string;
  nazev: string;
  text: string;
  /** Barva hlíny — kreslí se z ní pozadí a přechod do další vrstvy */
  barva: string;
  /** Světlá vrstva (spraš) potřebuje tmavé písmo */
  svetla?: boolean;
}

export const vrstvy: Vrstva[] = [
  { id: "orech", hloubka: "0,5 m", doba: "loni na podzim", nazev: "Ořech", text: "Zahrabala ho veverka a zapomněla. Už z něj klíčí kořínek — za pár let tu bude další ořešák.", barva: "#3A2E24" },
  { id: "kachel", hloubka: "1,1 m", doba: "kolem roku 1900", nazev: "Kachel z kamen", text: "Zelená glazura a reliéf růžice. Z kamen nějakého statku — Kachlíkův praděda.", barva: "#4B3A2C" },
  { id: "vlnice", hloubka: "1,7 m", doba: "10. století", nazev: "Střep s vlnicí", text: "Hrnec točený na pomalém kruhu. Vlnici do něj vyryl hřeben.", barva: "#5A4836" },
  { id: "tuha", hloubka: "2,3 m", doba: "2. století př. n. l.", nazev: "Keltská tuhová keramika", text: "Keltové míchali do hlíny tuhu. Hrnec pak leskl jako kov a líp snesl oheň.", barva: "#6A5440" },
  { id: "linearni", hloubka: "3,0 m", doba: "asi 5 300 let př. n. l.", nazev: "Lineární keramika", text: "Nejstarší hrnčíři v Čechách. Zdobili rytými pásky — podle nich má celá kultura jméno.", barva: "#B08B55", svetla: true },
  { id: "trilobit", hloubka: "3,8 m", doba: "asi 400 milionů let", nazev: "Trilobit v kameni", text: "Prvohorní moře. Vrstvy z té doby vystupují kousek vedle, v Chýnickém profilu.", barva: "#343B43" },
];

/** Co stojí pod rýčem po každém kopnutí */
export const poznamkyKopani = [
  "Hlouběji je starší hlína.",
  "Tady už někdo bydlel.",
  "Hrnčíři tu byli i před tisíci lety.",
  "A ještě dřív?",
  "Pod spraší je kámen.",
  "Dál už je jen kámen.",
];
