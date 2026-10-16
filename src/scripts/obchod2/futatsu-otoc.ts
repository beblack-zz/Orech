/**
 * Futatsu, který jde vzít do ruky. Každý prvek [data-futatsu-otoc] s vnitřním
 * <svg viewBox=PODOBIZNA.viewBox> se dá otáčet:
 *
 *   tah         myší nebo prstem do strany; bod pod prstem jede s ním, po puštění
 *               hrnek dobíhá setrvačností. Svislý tah prstem dál posouvá stránkou
 *               (touch-action: pan-y), tah se nepočítá jako kliknutí.
 *   klávesy     ← → po 15°, Home = výchozí natočení
 *   data-auto   pomalu se točí sám (8°/s), jen když je vidět a nikdo na něj
 *               nesahá; po doteku, najetí myší nebo fokusu chvíli stojí
 *   data-vstup  při prvním zobrazení se jednou přitočí z odvrácené strany —
 *               podpis přejde přes celou přední stranu
 *
 * Atributy: data-id (předpona id v kresbě, povinná), data-uhel (výchozí 62),
 * data-nadhled, data-svetlo, data-vypal. Ven: CustomEvent „futatsu-otoc“
 * ({ uhel }) při každé změně natočení a el.dataset.uhel; dovnitř:
 * „futatsu-nastav“ ({ uhel?, vypal?, nadhled?, svetlo? }).
 *
 * Kreslí se nejvýš jednou za snímek (svg.innerHTML = podobizna(…)). Při
 * omezeném pohybu (klid) bez setrvačnosti, bez točení a bez vstupu. Posluchače
 * visí na samotném prvku a IntersectionObserver založený kódem stránky odpojí
 * při odchodu prechody.ts, takže se všechno uklidí s obsahem.
 */
import { podobizna, PODOBIZNA } from "../../components/obchod2/futatsu/podobizna";
import { klid } from "../parta2/stav";

type Svetlo = "vlevo" | "shora";
interface Nastav {
  uhel?: number;
  vypal?: number;
  nadhled?: number;
  svetlo?: Svetlo;
}

/** Rychlost samo-otáčení (°/s) a jak dlouho po doteku stojí (ms) */
const AUTO = 8;
const PAUZA = 2800;
/** Setrvačnost: časová konstanta doběhu (ms) a nejvyšší rychlost po puštění (°/ms) */
const DOBEH = 260;
const SVIH = 0.6;
const KROK = 15;
const VSTUP = 1600;

const hotove = new WeakSet<Element>();
const kolem = (u: number) => ((u % 360) + 360) % 360;
const cislo = (s: string | undefined, vychozi: number) => {
  const n = Number(s);
  return s !== undefined && s !== "" && Number.isFinite(n) ? n : vychozi;
};
const vyjezd = (t: number) => 1 - (1 - t) ** 3;

export function initOtoc(koren: ParentNode = document) {
  const prvky = [...koren.querySelectorAll<HTMLElement>("[data-futatsu-otoc]")].filter((el) => !hotove.has(el) && el.querySelector("svg"));
  if (!prvky.length) return;
  const ukoly = new Map<Element, (videt: boolean, kolik: number) => void>();
  const io = typeof IntersectionObserver === "function"
    ? new IntersectionObserver((zaznamy) => {
        for (const z of zaznamy) ukoly.get(z.target)?.(z.isIntersecting, z.intersectionRatio);
      }, { threshold: [0, 0.4] })
    : null;

  for (const el of prvky) {
    hotove.add(el);
    const svg = el.querySelector("svg")!;
    const id = el.dataset.id || "fo";
    const vychozi = cislo(el.dataset.uhel, 62);
    const st = {
      uhel: vychozi,
      nadhled: cislo(el.dataset.nadhled, 12),
      svetlo: (el.dataset.svetlo === "shora" ? "shora" : "vlevo") as Svetlo,
      vypal: cislo(el.dataset.vypal, 1),
    };
    const auto = el.dataset.auto !== undefined && el.dataset.auto !== "false" && !klid;
    let vstup = el.dataset.vstup !== undefined && el.dataset.vstup !== "false" && !klid;

    /* ——— Kreslení: nejvýš jednou za snímek, událost jen při změně natočení ——— */
    let ceka = 0;
    let ohlaseno = NaN;
    const vykresli = () => {
      ceka = 0;
      svg.innerHTML = podobizna({ id, uhel: st.uhel, nadhled: st.nadhled, svetlo: st.svetlo, vypal: st.vypal });
      const u = Math.round(kolem(st.uhel) * 10) / 10;
      el.dataset.uhel = String(u);
      if (u !== ohlaseno) {
        ohlaseno = u;
        el.dispatchEvent(new CustomEvent("futatsu-otoc", { bubbles: true, detail: { uhel: u } }));
      }
    };
    const kresli = () => {
      if (!ceka) ceka = requestAnimationFrame(vykresli);
    };
    /* Ve smyčce se kreslí hned v tomtéž snímku, ne až v dalším */
    const hned = () => {
      if (ceka) cancelAnimationFrame(ceka);
      vykresli();
    };

    /* ——— Pohyb: setrvačnost, dojezd na cíl, vstup a samo-otáčení v jedné smyčce ——— */
    let rychlost = 0; // °/ms
    let cil: { od: number; do: number; t0: number; trvani: number } | null = null;
    let videt = !io;
    let nad = false;
    let fokus = false;
    let tah: { id: number; x: number; y: number; uhel: number; posledni: number; t: number; jede: boolean } | null = null;
    let dotek = -Infinity;
    let rozjezd = 0; // 0–1, samo-otáčení se po pauze rozjíždí plynule
    let smycka = 0;
    let minule = 0;

    const krok = (t: number) => {
      smycka = 0;
      const dt = minule ? Math.min(64, t - minule) : 16;
      minule = t;
      let dal = false;
      if (cil) {
        const k = Math.min(1, (t - cil.t0) / cil.trvani);
        st.uhel = cil.od + (cil.do - cil.od) * vyjezd(k);
        /* Po dojezdu (vstup, klávesa) chvíli stojí, ať je podpis vidět v klidu */
        if (k >= 1) {
          cil = null;
          dotek = t;
        }
        dal = true;
        hned();
      } else if (!tah && Math.abs(rychlost) > 0.002) {
        st.uhel += rychlost * dt;
        rychlost *= Math.exp(-dt / DOBEH);
        dal = true;
        hned();
      } else if (auto && videt && !tah && !nad && !fokus) {
        if (t - dotek > PAUZA) {
          rozjezd = Math.min(1, rozjezd + dt / 1200);
          st.uhel += (AUTO / 1000) * dt * rozjezd * rozjezd;
          hned();
        } else rozjezd = 0;
        dal = true;
      }
      if (dal && el.isConnected) smycka = requestAnimationFrame(krok);
      else minule = 0;
    };
    const rozjed = () => {
      if (!smycka) {
        minule = 0;
        smycka = requestAnimationFrame(krok);
      }
    };
    const zastav = () => {
      rychlost = 0;
      cil = null;
      rozjezd = 0;
    };
    const otocNa = (u: number, trvani = 260) => {
      zastav();
      dotek = performance.now();
      if (klid) {
        st.uhel = u;
        kresli();
        return;
      }
      cil = { od: st.uhel, do: u, t0: performance.now(), trvani };
      rozjed();
    };

    /* ——— Přístupnost a vzhled ovládání ——— */
    if (!el.hasAttribute("tabindex")) el.tabIndex = 0;
    if (!el.hasAttribute("role")) el.setAttribute("role", "application");
    el.setAttribute("aria-roledescription", "otočný hrnek");
    if (!el.hasAttribute("aria-describedby")) {
      const napoveda = document.createElement("span");
      napoveda.id = `${id}-napoveda`;
      napoveda.textContent = "Táhni do strany, nebo otáčej šipkami vlevo a vpravo. Home vrátí výchozí natočení.";
      napoveda.style.cssText = "position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0";
      el.append(napoveda);
      el.setAttribute("aria-describedby", napoveda.id);
    }
    svg.setAttribute("aria-hidden", "true");
    if (!svg.getAttribute("viewBox")) svg.setAttribute("viewBox", PODOBIZNA.viewBox);
    el.style.touchAction = "pan-y";
    el.style.cursor = "grab";
    el.style.userSelect = "none";
    el.style.setProperty("-webkit-user-select", "none");

    /* ——— Tah: bod pod prstem jede s prstem (poloměr hrnku v px) ——— */
    const stupnuNaPx = () => {
      const w = svg.getBoundingClientRect().width || el.clientWidth || 300;
      return 180 / Math.PI / ((42 * w) / PODOBIZNA.w);
    };
    let tazeno = false;
    el.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || tah) return;
      zastav();
      tah = { id: e.pointerId, x: e.clientX, y: e.clientY, uhel: st.uhel, posledni: st.uhel, t: e.timeStamp, jede: false };
      tazeno = false;
      dotek = performance.now();
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* bez zachycení se táhne jen nad prvkem */
      }
    });
    el.addEventListener("pointermove", (e) => {
      if (!tah || e.pointerId !== tah.id) return;
      const dx = e.clientX - tah.x;
      if (!tah.jede) {
        if (Math.abs(dx) < 3) return;
        tah.jede = true;
        tazeno = true;
        el.style.cursor = "grabbing";
      }
      const u = tah.uhel + dx * stupnuNaPx();
      const dt = Math.max(1, e.timeStamp - tah.t);
      const v = (u - tah.posledni) / dt;
      rychlost = rychlost * 0.35 + v * 0.65;
      tah.posledni = u;
      tah.t = e.timeStamp;
      st.uhel = u;
      dotek = performance.now();
      kresli();
    });
    const pust = (e: PointerEvent, setrvacnost: boolean) => {
      if (!tah || e.pointerId !== tah.id) return;
      /* Kdo se zastavil a až pak pustil, ten nechce, aby hrnek ujel */
      if (e.timeStamp - tah.t > 90) rychlost = 0;
      tah = null;
      el.style.cursor = "grab";
      dotek = performance.now();
      if (!setrvacnost || klid) rychlost = 0;
      rychlost = Math.max(-SVIH, Math.min(SVIH, rychlost));
      rozjed();
    };
    el.addEventListener("pointerup", (e) => pust(e, true));
    el.addEventListener("pointercancel", (e) => pust(e, false));
    el.addEventListener("lostpointercapture", (e) => pust(e, true));
    /* Tah není kliknutí — když je hrnek v odkazu, po tahu nikam nejde */
    el.addEventListener("click", (e) => {
      if (!tazeno) return;
      tazeno = false;
      e.preventDefault();
      e.stopPropagation();
    }, true);

    /* ——— Najetí myší a fokus pozastaví samo-otáčení ——— */
    el.addEventListener("pointerenter", (e) => {
      if (e.pointerType === "mouse") nad = true;
    });
    el.addEventListener("pointerleave", () => {
      nad = false;
      dotek = performance.now();
      rozjed();
    });
    el.addEventListener("focus", () => {
      fokus = true;
    });
    el.addEventListener("blur", () => {
      fokus = false;
      dotek = performance.now();
      rozjed();
    });

    /* ——— Klávesy ——— */
    el.addEventListener("keydown", (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const zaklad = cil ? cil.do : st.uhel;
      if (e.key === "ArrowLeft") otocNa(zaklad - KROK);
      else if (e.key === "ArrowRight") otocNa(zaklad + KROK);
      else if (e.key === "Home") {
        /* nejkratší cestou na výchozí */
        otocNa(st.uhel + ((((vychozi - st.uhel) % 360) + 540) % 360) - 180, 420);
      } else return;
      e.preventDefault();
    });

    /* ——— Zvenku: jezdec výpalu, přepnutí světla, natočení ——— */
    el.addEventListener("futatsu-nastav", (e) => {
      const d = (e as CustomEvent<Nastav>).detail ?? {};
      if (typeof d.uhel === "number" && Number.isFinite(d.uhel)) {
        zastav();
        vstup = false;
        st.uhel = d.uhel;
      }
      if (typeof d.vypal === "number" && Number.isFinite(d.vypal)) st.vypal = Math.min(1, Math.max(0, d.vypal));
      if (typeof d.nadhled === "number" && Number.isFinite(d.nadhled)) st.nadhled = d.nadhled;
      if (d.svetlo === "vlevo" || d.svetlo === "shora") st.svetlo = d.svetlo;
      kresli();
    });

    /* ——— Vidět: samo-otáčení jen na obrazovce, vstup při prvním zobrazení ——— */
    if (vstup) st.uhel = vychozi - 180;
    ukoly.set(el, (je, kolik) => {
      videt = je;
      if (je && vstup && kolik >= 0.4) {
        vstup = false;
        zastav();
        cil = { od: st.uhel, do: vychozi, t0: performance.now(), trvani: VSTUP };
      }
      if (je) rozjed();
    });
    io?.observe(el);
    if (!io && vstup) ukoly.get(el)?.(true, 1);
    if (auto && !io) rozjed();

    vykresli();
  }
}
