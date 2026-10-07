/**
 * Kus keramiky do kresby jako text — stejné tvary a glazury jako
 * components/uvod2/Nadoba.astro (miska, váza, hrnek, talíř opřený
 * o hranu). Pata kusu stojí v bodě (x, y), 1 = miska široká 52.
 * Navíc je tu syrový a přežahnutý střep: na regálu v dílně schne
 * většina kusů ještě bez glazury.
 */
import { glazury } from "../../../data/kurzy2";
import type { Tvar } from "../../../data/obchod";

const SYROVA = { svetlo: "#D9CFC2", stred: "#C2B5A5", stin: "#8F8172" };
const PREZAH = { svetlo: "#F1DDCB", stred: "#E2C3A8", stin: "#B98E6E" };

/** `glazura` je název z obchod.ts, nebo „syrová“ / „přežah“ */
export function nadoba(tvar: Tvar, x: number, y: number, s: number, glazura: string, trida = "") {
  const g =
    glazura === "syrová" ? SYROVA : glazura === "přežah" ? PREZAH : (glazury.find((z) => z.nazev === glazura.toLowerCase()) ?? glazury[3]);
  const o = `stroke="#3B2A1B" stroke-width="1" stroke-opacity="0.45"`;
  let t = "";
  if (tvar === "bowl") {
    t = `<ellipse cx="0" cy="1" rx="22" ry="3" fill="#2B2420" opacity="0.18"/>
      <path d="M-26 -22 C-25 -8 -14 0 0 0 C14 0 25 -8 26 -22 Z" fill="${g.stred}" ${o}/>
      <ellipse cx="0" cy="-22" rx="26" ry="5" fill="${g.svetlo}" ${o}/>
      <ellipse cx="0" cy="-21.4" rx="22.5" ry="3.4" fill="${g.stin}" opacity="0.75"/>
      <path d="M-21 -17 C-19 -9 -13 -4 -6 -2.5" stroke="${g.svetlo}" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.7"/>`;
  } else if (tvar === "vase") {
    t = `<ellipse cx="0" cy="1" rx="14" ry="2.6" fill="#2B2420" opacity="0.18"/>
      <path d="M-8 -64 C-8 -58 -6 -54 -10 -46 C-19 -32 -17 -8 -8 0 L8 0 C17 -8 19 -32 10 -46 C6 -54 8 -58 8 -64 Z" fill="${g.stred}" ${o}/>
      <ellipse cx="0" cy="-64" rx="8" ry="2.2" fill="${g.stin}" ${o}/>
      <path d="M-11 -40 C-15 -28 -14 -14 -8 -6" stroke="${g.svetlo}" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.7"/>`;
  } else if (tvar === "mug") {
    t = `<ellipse cx="0" cy="1" rx="15" ry="2.6" fill="#2B2420" opacity="0.18"/>
      <path d="M14 -27 C26 -27 26 -9 13 -9" stroke="${g.stred}" stroke-width="4.5" fill="none" stroke-linecap="round"/>
      <path d="M-15 -34 L-14 -2 Q-14 0 -11 0 L11 0 Q14 0 14 -2 L15 -34 Z" fill="${g.stred}" ${o}/>
      <ellipse cx="0" cy="-34" rx="15" ry="3.2" fill="${g.stin}" ${o}/>
      <path d="M-10 -29 L-9.5 -6" stroke="${g.svetlo}" stroke-width="3" stroke-linecap="round" opacity="0.65"/>`;
  } else {
    t = `<ellipse cx="0" cy="1" rx="18" ry="2.6" fill="#2B2420" opacity="0.18"/>
      <ellipse cx="0" cy="-25" rx="24" ry="25" fill="${g.stred}" ${o}/>
      <ellipse cx="0" cy="-25" rx="15" ry="16" fill="${g.svetlo}" opacity="0.55"/>
      <ellipse cx="0" cy="-25" rx="15" ry="16" fill="none" stroke="${g.stin}" stroke-width="1.2" opacity="0.6"/>`;
  }
  return `<g${trida ? ` class="${trida}"` : ""} transform="translate(${Math.round(x * 10) / 10} ${Math.round(y * 10) / 10}) scale(${Math.round(s * 1000) / 1000})">${t}</g>`;
}
