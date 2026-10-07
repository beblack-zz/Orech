/**
 * Tah štětce po okraji hlavičky (kresba v tah-kresba.ts). Jak člověk čte
 * stránku, vlas z ensō v logu maluje bublinu: po horní hraně, obloukem
 * kolem zvonkohry — cestou o ni zavadí a ta se zhoupne —, zpátky po spodní
 * hraně, a když dojde na konec stránky, tah se skoro uzavře a z květu
 * v mezeře spadne plátek dovnitř kruhu. Vlas jde za scrollem s malým
 * zpožděním, jako když se tuš táhne za štětcem.
 *
 * Se scrollem se točí i rýha uvnitř kruhu — hlava hrnčířského kruhu:
 * každý odscrollovaný pixel ji pootočí, takže nahoře na stránce stojí tam,
 * kde ji má značka. Najetí myší na logo kruh jednou protočí.
 *
 * Při přechodu na jinou stránku (prechody.ts) se vlas stáhne zpátky do kruhu,
 * rýha se odtočí a maluje se znovu. Úvodní kreslení kruhu (HlavickaEnso.astro)
 * patří jen k prvnímu načtení. Kdo si nepřeje pohyb, má vlas bez zpoždění,
 * rýhu v klidu a zvonkohra se nezhoupne.
 */
import { tahBublinou, R0, type TahBublinou } from "./tah-kresba";
import { priScrollu, priMereni, omez, klid, SVGNS } from "./stav";

/** O kolik stupňů se rýha pootočí na každý odscrollovaný pixel */
const STUPNE_NA_PX = 0.2;
/** Jak dlouho se tuš táhne za štětcem (s) */
const ZPOZDENI = 0.18;
/** Po přechodu na jinou stránku se vlas stahuje pomaleji, ať je vidět, jak se vrací do kruhu */
const ZPOZDENI_NAVRATU = 0.42;

/** Kam vlas došel a jak byla otočená rýha na minulé stránce — na nové se z toho stáhnou */
let minule = 0;
let minulaRyha = 0;

/* Nová hlavička po přechodu už je namalovaná — třída přijde dřív, než se
   poprvé vykreslí, takže se úvodní kreslení kruhu nespustí */
document.addEventListener("astro:after-swap", () => {
  document.querySelector(".hlava")?.classList.add("je-namalovana");
});

const prvek = <K extends keyof SVGElementTagNameMap>(jmeno: K, atributy: Record<string, string | number>) => {
  const el = document.createElementNS(SVGNS, jmeno);
  for (const [a, h] of Object.entries(atributy)) el.setAttribute(a, String(h));
  return el;
};

export function initTah({ zavadi }: { zavadi: (sila: number) => void }) {
  const hlava = document.querySelector<HTMLElement>(".hlava");
  const platno = hlava?.querySelector<SVGSVGElement>(".hlava-tah");
  if (!hlava || !platno) return;
  const ryha = hlava.querySelector<SVGGElement>("[data-ryha]");
  const zvonkohra = hlava.querySelector<HTMLElement>(".zvuk-tlacitko");

  let kresba: TahBublinou | null = null;
  let osa: SVGPathElement | null = null;
  let sirka = 0;
  let maxY = 0;
  /** Kam má vlas dojít (0–1 z délky) a kde zrovna je */
  let cil = 0;
  let ted = klid ? 0 : minule;
  /** Vlas se zrovna stahuje z minulé stránky */
  let navrat = ted > 0;
  /** Otočení rýhy ve stupních: kam podle scrollu a kde zrovna je */
  let ryhaCil = 0;
  let ryhaTed = klid ? 0 : minulaRyha;
  /** Kdy myš najela na logo — kruh se pak jednou protočí; −1 = netočí se */
  let roztoceno = -1;
  /** Kde na vlasu visí zvonkohra (0–1); −1 = nevíme */
  let zaves = -1;
  /** Kdy štětec o závěs zavadil naposled — kdo scrolluje tam a zpět, ať to necinká pořád */
  let zavadilo = -Infinity;
  let dokresleno = false;
  /* Při prvním načtení se počká, až se kruh namaluje */
  const odklad = !klid && !hlava.classList.contains("je-namalovana") ? performance.now() + 1400 : 0;

  const postav = () => {
    kresba = tahBublinou(sirka);
    const L = kresba.delka;
    const defs = prvek("defs", {});
    kresba.kusy.forEach((kus, i) => {
      const p = kus.prechod;
      const g = prvek("linearGradient", { id: `hlava-tah-${i}`, gradientUnits: "userSpaceOnUse", x1: p.x1, y1: p.y1, x2: p.x2, y2: p.y2 });
      /* Denní i noční barva — přepíná je CSS podle hlavičky (.je-noc), viz parta2.css */
      p.zastaveni.forEach(([offset, barva], j) =>
        g.append(prvek("stop", { offset, "stop-color": barva, style: `--den:${barva};--noc:${p.zastaveniNoc[j][1]}` })),
      );
      defs.append(g);
    });
    const maska = prvek("mask", { id: "hlava-tah-maska", maskUnits: "userSpaceOnUse", x: -10, y: -10, width: sirka + 20, height: 80 });
    /* Odkrývá se tahem po ose: čárka dlouhá jako celý vlas, posun říká, kolik ho je vidět */
    osa = prvek("path", { d: kresba.osa, fill: "none", stroke: "#fff", "stroke-width": 8, "stroke-dasharray": `${(L + 1).toFixed(1)} ${(L + 1).toFixed(1)}` });
    maska.append(osa);
    for (const s of kresba.struhy) {
      maska.append(prvek("path", { d: s.d, fill: "none", stroke: "#000", "stroke-width": s.sirka, "stroke-dasharray": s.carky }));
    }
    defs.append(maska);
    const vlas = prvek("g", { mask: "url(#hlava-tah-maska)" });
    kresba.kusy.forEach((kus, i) => vlas.append(prvek("path", { d: kus.d, fill: `url(#hlava-tah-${i})` })));
    platno.replaceChildren(defs, vlas);
    zmerZaves();
    ukaz();
  };

  const zmerZaves = () => {
    if (!kresba || !zvonkohra) return;
    const r = zvonkohra.getBoundingClientRect();
    const h = hlava.getBoundingClientRect();
    zaves = r.width ? kresba.delkaNad(r.left + r.width / 2 - h.left) / kresba.delka : -1;
  };

  const ukaz = () => {
    if (!kresba || !osa) return;
    osa.setAttribute("stroke-dashoffset", ((1 - ted) * (kresba.delka + 1)).toFixed(1));
  };

  const otoc = (t: number) => {
    if (!ryha) return;
    let navic = 0;
    if (roztoceno >= 0) {
      const k = Math.min(1, (t - roztoceno) / 1400);
      navic = 360 * (1 - Math.pow(1 - k, 3));
      /* Celá otáčka navíc je zase tatáž poloha — dál se nepočítá */
      if (k >= 1) roztoceno = -1;
    }
    ryha.setAttribute("transform", `rotate(${((ryhaTed + navic) % 360).toFixed(1)} ${R0} ${R0})`);
  };

  let bezi = false;
  let predtim = 0;
  const snimek = (t: number) => {
    const dt = predtim ? Math.min(0.05, (t - predtim) / 1000) : 1 / 60;
    predtim = t;
    if (t < odklad) {
      requestAnimationFrame(snimek);
      return;
    }

    const pred = ted;
    if (navrat && ted <= cil) navrat = false;
    const k = 1 - Math.exp(-dt / (navrat ? ZPOZDENI_NAVRATU : ZPOZDENI));
    ted = klid ? cil : ted + (cil - ted) * k;
    if (kresba && Math.abs(cil - ted) * kresba.delka < 0.3) ted = cil;
    if (ted !== pred) ukaz();
    minule = ted;
    /* Štětec zavadil o závěs zvonkohry — jen když jde dopředu; čím rychleji, tím víc */
    if (!klid && kresba && zaves > 0 && pred < zaves && ted >= zaves && t - zavadilo > 2500) {
      zavadilo = t;
      zavadi(omez(((ted - pred) * kresba.delka) / dt / 1600, 0.35, 1));
    }
    if (ted >= 0.999 && !dokresleno) {
      dokresleno = true;
      hlava.classList.add("je-dokresleno");
    }

    if (!klid) {
      ryhaTed += (ryhaCil - ryhaTed) * k;
      if (Math.abs(ryhaCil - ryhaTed) < 0.1) ryhaTed = ryhaCil;
      minulaRyha = ryhaTed;
      otoc(t);
    }

    if (ted !== cil || ryhaTed !== ryhaCil || roztoceno >= 0) requestAnimationFrame(snimek);
    else {
      bezi = false;
      predtim = 0;
    }
  };
  const rozjed = () => {
    if (bezi) return;
    bezi = true;
    requestAnimationFrame(snimek);
  };

  new ResizeObserver(() => {
    const w = hlava.offsetWidth;
    if (!w || w === sirka) return;
    sirka = w;
    postav();
  }).observe(hlava);

  priMereni(() => {
    maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    zmerZaves();
  });

  priScrollu((y) => {
    cil = maxY > 0 ? omez(y / maxY) : 0;
    if (!klid) ryhaCil = y * STUPNE_NA_PX;
    rozjed();
  });

  hlava.querySelector(".hlava-znacka")?.addEventListener("pointerenter", () => {
    if (klid || roztoceno >= 0) return;
    roztoceno = performance.now();
    rozjed();
  });

  rozjed();
}
