/**
 * Rezervace: den → hodiny → počet lidí → cena → e-mail.
 *
 * Volná místa jsou SIMULOVANÁ. Počítají se z data a hodiny pevnou
 * „náhodou“, takže se při každém načtení ukáže stejná obsazenost, a pár
 * dní je schválně skoro nebo úplně plných. Termíny, které dnes už začaly,
 * se nabízet nedají.
 */
import { spust } from "../parta2/stav";
import { initNebe } from "../parta2/nebe";
import { hlavicka } from "../parta2/hlavicka";
import { rezervace as R } from "../../data/rezervace";
import { sklonuj } from "../../data/pocty";

interface Hodina {
  h: number;
  volno: number;
  probehlo: boolean;
}
interface Den {
  datum: Date;
  klic: string;
  hodiny: Hodina[];
}

const DNY = ["neděle", "pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota"];
const ZKR = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];
const dvoj = (n: number) => String(n).padStart(2, "0");
const kc = (n: number) => `${n.toLocaleString("cs-CZ")} Kč`;
const lidi = (n: number) => (n === 1 ? "1 člověk" : `${n} lidi`);
const mist = (n: number) => sklonuj(n, "místo", "místa", "míst");
const hodin = (n: number) => sklonuj(n, "hodina", "hodiny", "hodin");

/** Pevná náhoda z textu — stejný den a hodina dají vždycky stejné číslo 0–1 */
const nahoda = (s: string) => {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  h ^= h >>> 13;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

function simuluj(dnes: Date): Den[] {
  const dny: Den[] = [];
  const ted = new Date();
  for (let i = 0; i <= R.dniDopredu; i++) {
    const d = new Date(dnes.getFullYear(), dnes.getMonth(), dnes.getDate() + i);
    if (!R.dny.includes(d.getDay())) continue;
    const klic = `${d.getFullYear()}-${dvoj(d.getMonth() + 1)}-${dvoj(d.getDate())}`;
    // Některé dny jsou rozebrané víc než jiné: 0 = klid, 1 = plno
    const naval = nahoda(`${klic}-den`);
    const hodiny: Hodina[] = [];
    for (let h = R.od; h < R.do; h++) {
      const r = nahoda(`${klic}-${h}`);
      const obsazeno = naval > 0.82 ? R.kapacita : Math.min(R.kapacita, Math.floor(r * (R.kapacita + 1) + naval * 4));
      const zacatek = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h);
      hodiny.push({ h, volno: R.kapacita - obsazeno, probehlo: zacatek <= ted });
    }
    dny.push({ datum: d, klic, hodiny });
  }
  return dny;
}

function init() {
  const koren = document.querySelector<HTMLElement>("[data-rezervace]");
  if (!koren) return;
  const email = koren.dataset.email ?? "";
  const cena = Number(koren.dataset.cena ?? R.cena);
  const dnyEl = koren.querySelector<HTMLElement>(".rz-dny")!;
  const hodinyEl = koren.querySelector<HTMLElement>(".rz-hodiny")!;
  const denNazev = koren.querySelector<HTMLElement>(".rz-den-nazev")!;
  const souhrn = koren.querySelector<HTMLElement>(".rz-souhrn-text")!;
  const cenaEl = koren.querySelector<HTMLElement>(".rz-cena b")!;
  const odeslat = koren.querySelector<HTMLAnchorElement>(".rz-odeslat")!;

  const dnes = new Date();
  dnes.setHours(0, 0, 0, 0);
  const dny = simuluj(dnes);
  let den = -1;
  let osob = 1;
  const vybrane = new Set<number>();

  const volnych = (d: Den) => d.hodiny.filter((h) => !h.probehlo && h.volno >= osob).length;
  const datumText = (d: Date) => `${d.getDate()}. ${d.getMonth() + 1}.`;

  const kresliDny = () => {
    dnyEl.textContent = "";
    dny.forEach((d, i) => {
      const n = volnych(d);
      const pryc = d.hodiny.every((h) => h.probehlo);
      const stav = pryc ? "proběhlo" : "plno";
      const b = document.createElement("button");
      b.type = "button";
      b.className = `rz-den ${n === 0 && !pryc ? "plno" : ""}`;
      b.disabled = n === 0;
      b.setAttribute("aria-pressed", String(i === den));
      b.innerHTML = `<span class="rz-den-zkr">${ZKR[d.datum.getDay()]}</span><b>${datumText(d.datum)}</b><small>${n === 0 ? stav : `${hodin(n)} volno`}</small>`;
      b.setAttribute("aria-label", `${DNY[d.datum.getDay()]} ${datumText(d.datum)}: ${n === 0 ? stav : `volno ${hodin(n)}`}`);
      b.addEventListener("click", () => {
        den = i;
        vybrane.clear();
        kresliDny();
        kresliHodiny();
        souhrnUpdate();
        dnyEl.querySelectorAll<HTMLButtonElement>(".rz-den")[i]?.focus();
      });
      dnyEl.append(b);
    });
  };

  const kresliHodiny = () => {
    hodinyEl.textContent = "";
    const d = dny[den];
    if (!d) {
      denNazev.textContent = "Nejdřív vyber den.";
      return;
    }
    denNazev.textContent = `${DNY[d.datum.getDay()]} ${datumText(d.datum)} ${d.datum.getFullYear()}`;
    for (const h of d.hodiny) {
      const b = document.createElement("button");
      b.type = "button";
      const plno = h.volno === 0;
      const malo = !plno && h.volno < osob;
      const stav = h.probehlo ? "probehlo" : plno ? "plno" : h.volno <= 2 ? "malo" : "volno";
      b.className = `rz-hodina ${stav}`;
      b.disabled = h.probehlo || plno || malo;
      b.setAttribute("aria-pressed", String(vybrane.has(h.h)));
      const popis = h.probehlo ? "už proběhlo" : plno ? "obsazeno" : malo ? `jen ${mist(h.volno)}` : `volno ${mist(h.volno)}`;
      b.innerHTML = `<b>${h.h}:00</b><small>${popis}</small>`;
      b.setAttribute("aria-label", `${h.h}:00 až ${h.h + 1}:00, ${popis}`);
      b.addEventListener("click", () => {
        if (vybrane.has(h.h)) vybrane.delete(h.h);
        else vybrane.add(h.h);
        b.setAttribute("aria-pressed", String(vybrane.has(h.h)));
        souhrnUpdate();
      });
      hodinyEl.append(b);
    }
  };

  /** Hodiny po sobě se slijí do jednoho úseku: 9:00–11:00, 14:00–15:00 */
  const useky = () => {
    const h = [...vybrane].sort((a, b) => a - b);
    const out: [number, number][] = [];
    for (const x of h) {
      const p = out[out.length - 1];
      if (p && p[1] === x) p[1] = x + 1;
      else out.push([x, x + 1]);
    }
    return out.map(([a, b]) => `${a}:00–${b}:00`).join(", ");
  };

  const souhrnUpdate = () => {
    const d = dny[den];
    const n = vybrane.size;
    const celkem = n * osob * cena;
    cenaEl.textContent = kc(celkem);
    if (!d || n === 0) {
      souhrn.textContent = d ? `${lidi(osob)}, ještě vyber hodinu.` : "Zatím nic nevybráno.";
      odeslat.removeAttribute("href");
      odeslat.setAttribute("aria-disabled", "true");
      return;
    }
    const kdy = `${DNY[d.datum.getDay()]} ${datumText(d.datum)} ${d.datum.getFullYear()}, ${useky()}`;
    souhrn.textContent = `${kdy} · ${hodin(n)} × ${lidi(osob)} × ${kc(cena)}`;
    const predmet = `Rezervace: ${ZKR[d.datum.getDay()]} ${datumText(d.datum)} ${d.datum.getFullYear()}, ${useky()}, ${lidi(osob)}`;
    const telo = `Ahoj, chci si rezervovat:\n\n${kdy}\nPočet lidí: ${osob}\nCena: ${kc(celkem)} (${kc(cena)} za člověka a hodinu)\n\nJméno:\nTelefon:\n\nDíky!`;
    odeslat.href = `mailto:${email}?subject=${encodeURIComponent(predmet)}&body=${encodeURIComponent(telo)}`;
    odeslat.removeAttribute("aria-disabled");
  };

  koren.querySelectorAll<HTMLInputElement>('input[name="osoby"]').forEach((r) =>
    r.addEventListener("change", () => {
      osob = Number(r.value);
      const d = dny[den];
      if (d) for (const h of d.hodiny) if (h.volno < osob) vybrane.delete(h.h);
      kresliDny();
      kresliHodiny();
      souhrnUpdate();
    }),
  );

  // Rovnou otevřít první den, kde je něco volného
  den = dny.findIndex((d) => volnych(d) > 0);
  kresliDny();
  kresliHodiny();
  souhrnUpdate();
}

hlavicka();
initNebe();
init();
spust();
