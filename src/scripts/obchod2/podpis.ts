/**
 * Zadní místnost krámku (components/obchod2/Podpis.astro). Hrnek v tokonomě
 * jde vzít do ruky — to obstarává futatsu-otoc.ts (initOtoc). Tady jsou jen
 * drobnosti kolem: poznámka „vezmi ho do ruky“ zmizí, jakmile ho člověk
 * chytí (myší, prstem nebo šipkami), a noren, lampa, paprsek a prášinky
 * se hýbou, jen když je místnost na obrazovce (třída o2t-videt).
 */
export function initPodpis() {
  const sekce = document.getElementById("podpis");
  if (!sekce) return;
  const hrnek = sekce.querySelector<HTMLElement>("[data-futatsu-otoc]");
  const vRuce = () => sekce.classList.add("v-ruce");
  hrnek?.addEventListener("pointerdown", vRuce, { once: true });
  hrnek?.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") vRuce();
  });
  new IntersectionObserver(([e]) => sekce.classList.toggle("o2t-videt", e.isIntersecting), { rootMargin: "120px 0px" }).observe(sekce);
}
