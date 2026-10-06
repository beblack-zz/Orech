/**
 * Jízdenky a kalendář: soubor do kalendáře (.ics) pro každý termín,
 * v kalendáři svítí den jízdenky, která je právě vidět, a dnešek.
 *
 * Do .ics jde jen první lekce — formát v datech neříká, jestli jdou další
 * týden po týdnu, tak je nevymýšlíme. Konec je tam, jen když ho formát
 * uvádí; jinak má událost jen začátek.
 */
import * as zvuk from "../parta2/zvuk";

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

function ics(b: HTMLElement) {
  const { nazev = "", den = "", od = "", do: konec = "", popis = "" } = b.dataset;
  const datum = den.replace(/-/g, "");
  const zacatek = od ? `${datum}T${od}00` : datum;
  const ted = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const radky = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//JIRO saku//Kurzy//CS",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${datum}-${od || "den"}-${nazev.replace(/[^a-z0-9]/gi, "").toLowerCase()}@jirosaku.cz`,
    `DTSTAMP:${ted}`,
    od ? `DTSTART:${zacatek}` : `DTSTART;VALUE=DATE:${zacatek}`,
    ...(od && konec ? [`DTEND:${datum}T${konec}00`] : []),
    `SUMMARY:${esc(`${nazev} — JIRO saku`)}`,
    `LOCATION:${esc("JIRO saku, Luční 235, Ořech")}`,
    `DESCRIPTION:${esc(`${popis}\nPrvní lekce. Zápis a další termíny: ahoj@jirosaku.cz`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  const soubor = new Blob([radky.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(soubor);
  a.download = `jiro-saku-${den}.ics`;
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export function terminy() {
  for (const b of document.querySelectorAll<HTMLButtonElement>(".jizdenka-ics")) {
    b.addEventListener("click", () => {
      ics(b);
      zvuk.papir();
    });
  }

  const dvoj = (x: number) => String(x).padStart(2, "0");
  const d = new Date();
  const dnes = `${d.getFullYear()}-${dvoj(d.getMonth() + 1)}-${dvoj(d.getDate())}`;
  document.querySelector(`.kal-den[data-den="${dnes}"]`)?.classList.add("dnes");

  const dny = [...document.querySelectorAll<HTMLElement>(".kal-den.je-kurz")];
  const jizdenky = [...document.querySelectorAll<HTMLElement>(".jizdenka")];
  if (!dny.length || !jizdenky.length) return;
  const viditelne = new Map<Element, number>();
  const rozsvit = () => {
    let nej: HTMLElement | null = null;
    let max = 0;
    for (const [el, pomer] of viditelne) {
      if (pomer > max) {
        max = pomer;
        nej = el as HTMLElement;
      }
    }
    const den = nej?.dataset.den;
    dny.forEach((k) => k.classList.toggle("sviti", !!den && k.dataset.den === den));
  };
  const io = new IntersectionObserver(
    (zaznamy) => {
      for (const z of zaznamy) {
        if (z.isIntersecting) viditelne.set(z.target, z.intersectionRatio);
        else viditelne.delete(z.target);
      }
      rozsvit();
    },
    { threshold: [0, 0.25, 0.5, 0.75, 1], rootMargin: "-20% 0px -30% 0px" },
  );
  jizdenky.forEach((j) => io.observe(j));
}
