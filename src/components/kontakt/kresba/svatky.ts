/**
 * Svátky na provázku. Pár dní v roce na provázku Kontaktu (venku i na
 * louce pod první obrazovkou) visí mezi visačkami ozdoby podle japonského
 * kalendáře: na Nový rok papírové klikatice 紙垂, při hanami lampiony
 * bonbori, na Den dětí kapři koinobori, na Tanabatu přání tanzaku a na Obon
 * lucerny chōchin. Řídí se jen datem (i datem ukázky ?cas=…), nikoho nesleduje.
 *
 * `zaves` kreslí jednu ozdobu: visí z bodu 0,0 dolů, při m = 1 je asi
 * 70 jednotek vysoká. Barvy jsou atributy (kresba platí i v náhledu bez CSS),
 * třída `ko-svatek-svetlo` značí, co v noci svítí, a `ko-svatek-vlaje`, co
 * se ve větru kýve (styly v kontakt.css).
 */
import { f, nahoda } from "./zaklad";

export type SvatekId = "shogatsu" | "hanami" | "kodomo" | "tanabata" | "obon";

export interface Svatek {
  id: SvatekId;
  /** Česky, jak se o něm mluví na webu */
  nazev: string;
  ja: string;
  /** Co řekne ten, kdo má službu, když se na provázku něco stane */
  pozdrav: string;
}

/** Od–do včetně, [měsíc, den] */
const KALENDAR: { od: [number, number]; do: [number, number]; s: Svatek }[] = [
  { od: [12, 29], do: [12, 31], s: { id: "shogatsu", nazev: "Nový rok", ja: "正月", pozdrav: "Uklízíme dílnu na Nový rok!" } },
  { od: [1, 1], do: [1, 7], s: { id: "shogatsu", nazev: "Nový rok", ja: "正月", pozdrav: "Akemašite omedetó! Šťastný nový rok!" } },
  { od: [4, 1], do: [4, 15], s: { id: "hanami", nazev: "hanami", ja: "花見", pozdrav: "Sakura kvete, pojď se dívat!" } },
  { od: [5, 1], do: [5, 5], s: { id: "kodomo", nazev: "Den dětí", ja: "こどもの日", pozdrav: "Kapři plavou proti proudu!" } },
  { od: [7, 1], do: [7, 7], s: { id: "tanabata", nazev: "Tanabata", ja: "七夕", pozdrav: "Napiš si přání na lísteček!" } },
  { od: [8, 13], do: [8, 16], s: { id: "obon", nazev: "Obon", ja: "お盆", pozdrav: "Lucerny svítí na cestu domů." } },
];

/** Svátek, který je dnes, nebo null */
export function svatekDne(d: Date): Svatek | null {
  const md = (d.getMonth() + 1) * 100 + d.getDate();
  for (const k of KALENDAR) {
    if (md >= k.od[0] * 100 + k.od[1] && md <= k.do[0] * 100 + k.do[1]) return k.s;
  }
  return null;
}

/** Jedna ozdoba svátku `id` (i mění barvu a tvar), visí z 0,0 dolů */
export function zaves(id: SvatekId, i: number, m = 1): string {
  const R = nahoda(9100 + i * 37);
  const vnitrek = KRESBY[id](i, R);
  return `<g class="ko-svatek ko-svatek-${id}" transform="scale(${f(m)})"><g class="ko-svatek-vlaje" style="--i:${i % 5}">${vnitrek}</g></g>`;
}

const nit = (delka: number) => `<path d="M0 0 C-1.5 ${f(delka * 0.4)} 1.5 ${f(delka * 0.7)} 0 ${f(delka)}" stroke="#7A6A58" stroke-width="1.1" fill="none"/>`;

const KRESBY: Record<SvatekId, (i: number, R: () => number) => string> = {
  /* 紙垂: bílá papírová klikatice ze čtyř stupňů pod chomáčkem slámy */
  shogatsu: (i) => {
    const w = 15, h = 14;
    const s = i % 2 ? 1 : -1;
    let d = `M${-w / 2} 8`;
    for (let k = 0; k < 4; k++) {
      const y = 8 + k * h;
      const x = (k % 2 ? 1 : -1) * s * 5;
      d += ` L${f(x + w / 2)} ${f(y)} L${f(x + w / 2)} ${f(y + h)} L${f(x - w / 2)} ${f(y + h)}`;
    }
    const obrys = `${d} L${f(-w / 2 - 5 * s)} ${f(8 + 4 * h)} Z`;
    return `<path d="M-6 0 Q0 6 6 0 L4 10 Q0 12 -4 10 Z" fill="#C8A85E" stroke="#8E6E34" stroke-width="0.8"/>
      <path d="M-4 3 L-6 13 M0 4 L0 14 M4 3 L6 13" stroke="#B08A44" stroke-width="0.9"/>
      <g transform="translate(0 6)">
        <path d="${obrys}" fill="#2B2420" opacity="0.1" transform="translate(2 2)"/>
        <path d="M${-w / 2} 8 h${w} v${4 * h} h${-w} Z" fill="none"/>
        ${[0, 1, 2, 3].map((k) => {
          const x = (k % 2 ? 1 : -1) * s * 5;
          return `<rect x="${f(x - w / 2)}" y="${f(8 + k * h)}" width="${w}" height="${h + 0.6}" fill="#FFFEFA" stroke="#D8D0C2" stroke-width="0.7"/>`;
        }).join("")}
      </g>`;
  },
  /* ぼんぼり: lampion ze šestibokého papíru s květem sakury, růžový a bílý */
  hanami: (i) => {
    const ruzovy = i % 2 === 0;
    const papir = ruzovy ? "#F6C9D2" : "#FFF6EE";
    return `${nit(12)}
      <g transform="translate(0 12)">
        <rect x="-5" y="0" width="10" height="5" rx="1" fill="#3B2A22"/>
        <path d="M-13 6 Q-16 22 -12 37 L12 37 Q16 22 13 6 Z" fill="#2B2420" opacity="0.12" transform="translate(2 3)"/>
        <path class="ko-svatek-svetlo" d="M-13 6 Q-16 22 -12 37 L12 37 Q16 22 13 6 Z" fill="${papir}" stroke="#C99AA4" stroke-width="0.8"/>
        <path d="M-5 6 Q-6 22 -4 37 M5 6 Q6 22 4 37" stroke="#D9AEB6" stroke-width="0.7" fill="none"/>
        <g transform="translate(0 21)">${[0, 1, 2, 3, 4].map((k) => `<ellipse rx="2.3" ry="3.6" cy="-3.4" fill="#E58FA2" transform="rotate(${k * 72})"/>`).join("")}<circle r="1.3" fill="#F7E08A"/></g>
        <rect x="-6" y="37" width="12" height="4" rx="1" fill="#3B2A22"/>
        <path d="M0 41 L0 48" stroke="#C4432B" stroke-width="1.6"/>
      </g>`;
  },
  /* 鯉のぼり: kapr z látky, visí za kroužek v tlamě a vlaje do strany */
  kodomo: (i) => {
    const barvy = [
      { telo: "#2E2A33", bricho: "#5A5560", oko: "#F2E9D6" },
      { telo: "#C4432B", bricho: "#E9886E", oko: "#F2E9D6" },
      { telo: "#3E6FA8", bricho: "#86AAD4", oko: "#F2E9D6" },
    ][i % 3];
    const L = 48;
    const supiny = [10, 18, 26, 34].map((x) => `<path d="M${x} -5 Q${x + 4} -1 ${x} 3 M${x + 4} -3 Q${x + 8} 1 ${x + 4} 5" stroke="${barvy.bricho}" stroke-width="1.2" fill="none"/>`).join("");
    return `${nit(10)}
      <g transform="translate(0 10) rotate(80)">
        <path d="M0 -8 Q${L * 0.5} -12 ${L} -6 L${L + 8} -11 L${L + 4} 0 L${L + 8} 11 L${L} 6 Q${L * 0.5} 12 0 8 Z" fill="#2B2420" opacity="0.12" transform="translate(2 3)"/>
        <path d="M0 -8 Q${L * 0.5} -12 ${L} -6 L${L + 8} -11 L${L + 4} 0 L${L + 8} 11 L${L} 6 Q${L * 0.5} 12 0 8 Z" fill="${barvy.telo}"/>
        ${supiny}
        <ellipse cx="0" cy="0" rx="2.2" ry="8" fill="none" stroke="#E8DCC4" stroke-width="1.6"/>
        <circle cx="7" cy="-2" r="3.4" fill="${barvy.oko}"/><circle cx="7.4" cy="-2" r="1.6" fill="#1C1714"/>
      </g>`;
  },
  /* 短冊: pásek papíru pěti barev s přáním psaným štětcem (jen tahy) */
  tanabata: (i, R) => {
    const barvy = ["#4E8A5A", "#C4432B", "#E2B840", "#FBF8F0", "#6D5A9E"];
    const c = barvy[i % 5];
    const h = 46 + R() * 12;
    const tahy = Array.from({ length: 4 }, (_, k) => `<path d="M${f(-2 + R() * 2)} ${f(16 + k * 9)} q${f(1 + R() * 2)} 3 0 ${f(4 + R() * 2)}" stroke="${c === "#FBF8F0" ? "#5A4A3E" : "#FFFFFF"}" stroke-opacity="0.75" stroke-width="1.3" fill="none" stroke-linecap="round"/>`).join("");
    const vlajka = i % 3 === 2
      ? `<g transform="translate(14 0)">${nit(6)}${[0, 1, 2, 3, 4].map((k) => `<path d="M${-6 + k * 3} 6 q${f(-1 + R() * 2)} 22 ${f(-2 + R() * 4)} ${f(40 + R() * 10)}" stroke="${barvy[(k + i) % 5]}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`).join("")}</g>`
      : "";
    return `${nit(8)}
      <g transform="translate(0 8) rotate(${f(-3 + R() * 6)})">
        <rect x="-6" y="0" width="12" height="${f(h)}" fill="#2B2420" opacity="0.12" transform="translate(2 2)"/>
        <rect x="-6" y="0" width="12" height="${f(h)}" fill="${c}" stroke="#0000001A" stroke-width="0.6"/>
        <circle cx="0" cy="4" r="1.3" fill="#7A6A58"/>
        ${tahy}
      </g>${vlajka}`;
  },
  /* 提灯: bílá lucerna s červeným pásem, v noci svítí teple */
  obon: (i) => {
    const pas = i % 2 ? "#C4432B" : "#2B2420";
    const zebra = [12, 18, 24, 30, 36].map((y) => `<path d="M${f(-13 + Math.abs(y - 24) * 0.12)} ${y} H${f(13 - Math.abs(y - 24) * 0.12)}" stroke="#D9CDB8" stroke-width="0.7"/>`).join("");
    return `${nit(10)}
      <g transform="translate(0 10)">
        <rect x="-7" y="0" width="14" height="5" rx="1.2" fill="#2B2420"/>
        <ellipse cx="2" cy="27" rx="16" ry="21" fill="#2B2420" opacity="0.12"/>
        <ellipse class="ko-svatek-svetlo" cx="0" cy="24" rx="15" ry="20" fill="#FFF4DC" stroke="#CDBFA6" stroke-width="0.8"/>
        ${zebra}
        <path d="M-14.7 20 Q-15.1 24 -14.7 28 H14.7 Q15.1 24 14.7 20 Z" fill="${pas}" opacity="0.88"/>
        <rect x="-7" y="43" width="14" height="5" rx="1.2" fill="#2B2420"/>
        <path d="M-3 48 L-4 58 M0 48 L0 60 M3 48 L4 58" stroke="${pas}" stroke-width="1.2"/>
      </g>`;
  },
};
