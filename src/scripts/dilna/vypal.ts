/**
 * Ostrý výpal na Dílně. Proměny (kartičky vpravo) se čtou shora dolů
 * a pec se s nimi rozpaluje: kurzor na pálicí křivce dojede na teplotu
 * proměny, u které člověk zrovna je, velké číslo ukazuje stupně, žár
 * v peci má barvu podle teploty a žároměrky se u vrcholu ohnou.
 *
 * Dokud člověk ke kartičkám nedojede, je pec studená (kurzor na začátku).
 * Bez skriptu stojí kurzor nahoře a pec svítí naplno — jak to nakreslil
 * build. Při omezeném pohybu kurzor skáče, nejede.
 */
import { priScrollu, priMereni, pozice, klid } from "../parta2/stav";
import { casPro, kx, ky, teplotaV, barvaZaru, silaZaru, KRIVKA_Y0 } from "../../components/dilna/kresba/krivka";

export function vypal() {
  const sekce = document.querySelector<HTMLElement>("[data-vypal]");
  if (!sekce) return;
  const karty = [...sekce.querySelectorAll<HTMLElement>(".d-milnik")];
  const kurzor = sekce.querySelector<SVGGElement>(".dkr-kurzor");
  const cara = sekce.querySelector<SVGPathElement>(".dkr-kurzor-cara");
  const tecky = [...sekce.querySelectorAll<SVGGElement>(".dkr-milnik")];
  const odecet = sekce.querySelector<HTMLElement>("[data-teplota]");
  const pec = sekce.querySelector<HTMLElement>(".d-vypal-pec");
  const zaromerky = sekce.querySelector<HTMLElement>(".d-zaromerky");
  if (!karty.length || !kurzor) return;
  sekce.classList.add("s-pruvodcem");

  /* Kde je kurzor (hodiny od zapnutí) a kam jede */
  let h = 0;
  let cil = 0;
  let jede = false;
  let aktivni = -2;

  const nakresli = (hh: number) => {
    const T = teplotaV(hh);
    kurzor.setAttribute("transform", `translate(${kx(hh).toFixed(1)} ${ky(T).toFixed(1)})`);
    cara?.setAttribute("d", `M0 0 V${(KRIVKA_Y0 - ky(T)).toFixed(1)}`);
    if (odecet) odecet.textContent = Math.round(T).toLocaleString("cs-CZ");
    if (pec) {
      pec.style.setProperty("--zar", silaZaru(T).toFixed(3));
      pec.style.setProperty("--zar-barva", barvaZaru(T));
      /* Displej regulátoru je nakreslený s 1 280 — svítí jen na vrcholu */
      pec.toggleAttribute("data-vrchol", T >= 1279);
    }
    if (zaromerky) zaromerky.dataset.ohnuti = T >= 1279 ? "2" : T >= 1235 ? "1" : "0";
  };

  const krok = () => {
    const d = cil - h;
    if (Math.abs(d) < 0.01) {
      h = cil;
      jede = false;
      nakresli(h);
      return;
    }
    /* Nahoru pomalu, jako pec; zpátky rychleji */
    h += d * (d > 0 ? 0.075 : 0.14);
    nakresli(h);
    requestAnimationFrame(krok);
  };

  const jedNa = (hh: number) => {
    cil = hh;
    if (klid) {
      h = cil;
      nakresli(h);
      return;
    }
    if (!jede) {
      jede = true;
      requestAnimationFrame(krok);
    }
  };

  let stredy: number[] = [];
  priMereni(() => {
    stredy = karty.map((k) => {
      const p = pozice(k);
      return p.top + p.height / 2;
    });
  });

  priScrollu((y, vh) => {
    if (!stredy.length) return;
    /* Aktivní je poslední kartička, jejíž střed už je nad dvěma třetinami okna */
    const hranice = y + vh * 0.62;
    let i = -1;
    for (let k = 0; k < stredy.length; k++) if (stredy[k] <= hranice) i = k;
    if (i === aktivni) return;
    aktivni = i;
    karty.forEach((k, j) => k.classList.toggle("ted", j === i));
    tecky.forEach((t, j) => t.classList.toggle("ted", j === i));
    jedNa(i < 0 ? 0 : casPro(Number(karty[i].dataset.teplota)));
  });

  nakresli(h);
}
