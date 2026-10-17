/**
 * Ichi-go ichi-e: stůl v dílně. Klepnutí na volné místo posadí ke stolu
 * kami z party (vyleze zpoza desky, před ním se objeví šálek) a řekne
 * svoje; další klepnutí ho zase zvedne. Na cedulce nad stolem svítí cena
 * za člověka podle toho, kolik lidí sedí — skupinové jízdné z rezervace.ts.
 */
import { jmeno } from "../parta2/kami";
import * as zvuk from "../parta2/zvuk";
import { spoluMista } from "../../data/onas2";
import { cenaZaCloveka } from "../../data/rezervace";
import type { PostavaId } from "../../data/parta";

export function spolu() {
  const koren = document.querySelector<HTMLElement>("[data-spolu]");
  if (!koren) return;
  const mista = [...koren.querySelectorAll<HTMLButtonElement>(".spolu-misto")];
  const salky = [...koren.querySelectorAll<SVGGElement>(".spolu-salek")];
  const ceny = [...koren.querySelectorAll<SVGGElement>(".spolu-cena")];
  const pokyn = koren.querySelector<HTMLElement>(".spolu-pokyn")!;
  const odpoved = koren.querySelector<HTMLElement>(".spolu-odpoved")!;
  const odpJmeno = koren.querySelector<HTMLElement>(".spolu-odpoved-jmeno")!;
  const odpVeta = koren.querySelector<HTMLElement>(".spolu-odpoved-veta")!;
  const tvare = [...koren.querySelectorAll<HTMLElement>("[data-spolu-kami]")];
  let mluvi: string | null = null;

  function rekni(kdo: PostavaId, text: string) {
    mluvi = kdo;
    tvare.forEach((t) => (t.hidden = t.dataset.spoluKami !== kdo));
    odpJmeno.textContent = jmeno(kdo);
    odpVeta.textContent = text;
    odpoved.hidden = false;
    odpoved.classList.remove("nova");
    void odpoved.offsetWidth;
    odpoved.classList.add("nova");
    zvuk.reakce(kdo);
  }

  function stav() {
    const n = mista.filter((m) => m.classList.contains("sedi")).length;
    ceny.forEach((c) => c.classList.toggle("je", Number(c.dataset.lidi) === n));
    const kc = `${cenaZaCloveka(n).toLocaleString("cs-CZ")} Kč`;
    pokyn.textContent =
      n === 0 ? "Přisedni si." : n === 1 ? `Jeden u stolu · ${kc}` : n < mista.length ? `${n} u stolu · ${kc} za každého` : `Plno · ${kc} za každého`;
  }

  mista.forEach((m, i) => {
    m.addEventListener("click", () => {
      const sedi = !m.classList.contains("sedi");
      const kdo = m.dataset.kdo as PostavaId;
      m.classList.toggle("sedi", sedi);
      m.setAttribute("aria-pressed", String(sedi));
      m.setAttribute("aria-label", sedi ? `U stolu sedí ${jmeno(kdo)} — zvednout se` : "Volné místo u stolu — přisednout");
      salky[i]?.classList.toggle("je", sedi);
      if (sedi) {
        const veta = spoluMista.find((s) => s.kdo === kdo)?.text ?? "";
        rekni(kdo, veta);
      } else {
        zvuk.pop();
        if (mluvi === kdo) {
          odpoved.hidden = true;
          mluvi = null;
        }
      }
      stav();
    });
  });

  stav();
}
