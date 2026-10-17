/**
 * Kudy k nám: táhlo mezi kresbou domu a fotkou (components/kontakt/
 * KudyKNam.astro). Chytá se myší i prstem a ťuknutím kamkoli do obrázku,
 * šipkami jde přes skrytý posuvník (input range), který drží hodnotu pro
 * čtečky. Když sekce poprvé vjede do obrazovky, táhlo se samo jednou
 * zhoupne, ať je vidět, že se s ním dá hýbat.
 */
const omez = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/**
 * Mapa na vývěsce: tlačítko přepíná celý Ořech a okolí domu (na úzké
 * obrazovce začíná přiblížená, ať jdou přečíst ulice), a když mapa poprvé
 * vjede do obrazovky, šňůrka kōhaku doběhne od zastávky k bráně.
 */
function mapaVyvesky() {
  const fig = document.querySelector<HTMLElement>(".ko-mapa");
  const ram = fig?.querySelector<HTMLElement>(".ko-mapa-ram");
  if (!fig || !ram) return;
  const tl = ram.querySelector<HTMLButtonElement>(".ko-mapa-prepinac");
  const nastav = (blizko: boolean) => {
    ram.classList.toggle("blizko", blizko);
    tl?.setAttribute("aria-pressed", String(blizko));
  };
  nastav(matchMedia("(max-width: 699px)").matches);
  tl?.addEventListener("click", () => nastav(!ram.classList.contains("blizko")));

  if (matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
  fig.classList.add("ceka");
  const pozorovatel = new IntersectionObserver(
    ([z]) => {
      if (!z?.isIntersecting) return;
      pozorovatel.disconnect();
      fig.classList.remove("ceka");
      fig.classList.add("bezi");
    },
    { threshold: 0.45 },
  );
  pozorovatel.observe(ram);
}

export function kudyKNam() {
  mapaVyvesky();
  const fig = document.querySelector<HTMLElement>(".ko-srovnani");
  if (!fig) return;
  const plocha = fig.querySelector<HTMLElement>(".ko-srovnani-plocha")!;
  const tahlo = fig.querySelector<HTMLElement>(".ko-srovnani-tahlo")!;
  const posuvnik = fig.querySelector<HTMLInputElement>(".ko-srovnani-posuvnik")!;
  const klidne = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let sahl = false;

  const nastav = (proc: number) => {
    const p = omez(proc, 0, 100);
    fig.style.setProperty("--deleni", `${p.toFixed(1)}%`);
    posuvnik.value = String(Math.round(p));
    fig.classList.toggle("jen-foto", p < 3);
    fig.classList.toggle("jen-kresba", p > 97);
  };
  const zPozice = (e: PointerEvent) => {
    const r = plocha.getBoundingClientRect();
    if (r.width) nastav(((e.clientX - r.left) / r.width) * 100);
  };

  posuvnik.addEventListener("input", () => {
    sahl = true;
    nastav(Number(posuvnik.value));
  });
  let tahne = false;
  plocha.addEventListener("pointerdown", (e) => {
    sahl = true;
    tahne = true;
    tahlo.setPointerCapture?.(e.pointerId);
    fig.classList.add("tahne");
    zPozice(e);
  });
  tahlo.addEventListener("pointermove", (e) => {
    if (tahne) zPozice(e);
  });
  const pust = () => {
    tahne = false;
    fig.classList.remove("tahne");
  };
  tahlo.addEventListener("pointerup", pust);
  tahlo.addEventListener("pointercancel", pust);

  /* první příjezd do obrazovky: táhlo se jednou zhoupne 58 → 34 → 76 → 58 */
  if (klidne) return;
  const pozorovatel = new IntersectionObserver(
    ([z]) => {
      if (!z.isIntersecting) return;
      pozorovatel.disconnect();
      const body = [58, 34, 76, 58];
      let t0 = -1;
      const krok = (cas: number) => {
        if (sahl) return;
        if (t0 < 0) t0 = cas;
        const u = Math.min(1, (cas - t0) / 1800);
        const seg = Math.min(2, Math.floor(u * 3));
        const v = u * 3 - seg;
        const e = v * v * (3 - 2 * v);
        nastav(body[seg] + (body[seg + 1] - body[seg]) * e);
        if (u < 1) requestAnimationFrame(krok);
      };
      window.setTimeout(() => requestAnimationFrame(krok), 500);
    },
    { threshold: 0.6 },
  );
  pozorovatel.observe(plocha);
}
