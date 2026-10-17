/**
 * Vzhled mailů k rezervacím — NÁVRH, na stránce /marcel (Maily.astro).
 * Uvítání a přihlášení už posílá server (posta.ts), ostatní jsou zatím
 * jen návrh.
 *
 * Šest mailů jako HTML, které snese pošta: tabulky, styly přímo v prvcích,
 * žádné SVG. Hlavička je noční bublina z webu: modrá buňka a v ní jako
 * pozadí obloha s obláčky a hvězdami (nebe-noc.jpg z HlavickaNebe.astro;
 * kde pošta pozadí neumí, třeba Outlook, zůstane jen modrá). Značka je
 * PNG — ensō v levém půlkruhu a nápis štětcem ve světlé noční sadě
 * (znacka-noc.png z Enso.astro a ZnackaStetec.astro, 3× rozlišení), dole
 * v podpisu nápis sám (znacka-podpis-noc.png), za mailem hvězdy (hvezdy.png). Písma Fraunces a Newsreader si
 * stáhne jen Apple Mail a pár dalších, ostatní (Gmail, Outlook) ukážou
 * Georgii — návrh s tím počítá. Celý mail je noční edice (paleta N níž)
 * a hlásí `color-scheme: dark`, ať ho tmavý režim pošty nepřebarvuje.
 *
 * Každá funkce vrací předmět, náhledový řádek a HTML. Prostý text
 * skládá posta.ts a Resend dostane obojí.
 *
 *   mailVitej      uvítání: jak se přihlásit, jak to jezdí i jak zrušit
 *   mailPrihlaseni jednorázový odkaz a kód na přihlášení
 *   mailAdresa     potvrzení e-mailové adresy
 *   mailPripominka 24 hodin před odjezdem
 *   mailZruseni    zrušená jízdenka
 */
import { rezervace as R, hhmm, rozpetiJizdneho, pravidloPrichodu, dnySlovy, otevrenoSlovy } from "../../data/rezervace";
import { kontakt, mapa } from "../../data/uvod2";

export interface MailNavrh {
  predmet: string;
  /** Řádek, který pošta ukáže v seznamu za předmětem */
  nahled: string;
  html: string;
}

export interface Zdroje {
  /** Adresa webu pro odkazy v mailu: „https://jirosaku.cz“ */
  web: string;
  /** Odkud se berou písma a značka; na náhledu prázdné (stejný web), v poště jako `web` */
  zdroje?: string;
}

/** Jízdenka, jak ji mail ukazuje */
export interface JizdenkaMail {
  cislo: string;
  /** RRRR-MM-DD */
  den: string;
  /** Začátek odjezdu, hodiny s půlkou: 10.5 je 10:30 */
  h: number;
  osob: number;
}

/* ——— Barvy a písma webu (styles/parta2.css) ——— */
const B = {
  papir: "#F7F1E3",
  papir2: "#EFE5D1",
  papir3: "#E2D4B9",
  listek: "#FFFCF4",
  inkoust: "#2B2420",
  inkoust2: "#5C5047",
  inkoust3: "#8A7C70",
  rumelka: "#C4432B",
  zelena: "#3E8C84",
};
/*
 * Noční edice: celý mail je noc z webu — modrá noční hlavičky (.hlava.je-noc
 * v styles/parta2.css), krémové písmo a rumělka o kus světlejší, jako
 * ensō na tmavém. Jízdenka a políčka s kódem zůstávají papírové (B),
 * svítí v noci jako lístek pod lucernou.
 */
const N = {
  nebe: "#151A3A",
  karta: "#1F2652",
  hlava: "#2A3160",
  linka: "#373F72",
  kanji: "#414A84",
  krem: "#F1E8D6",
  krem2: "#D6D0DC",
  krem3: "#A09DBE",
  rumelka: "#EE7B58",
  tlacitko: "#D4502F",
};
const F = {
  display: "'Fraunces',Georgia,'Times New Roman',serif",
  text: "'Newsreader',Georgia,'Times New Roman',serif",
  kanji: "'Yu Mincho','Hiragino Mincho ProN','Noto Serif JP','MS Mincho',serif",
  mono: "'SFMono-Regular',Menlo,Consolas,'Courier New',monospace",
};

const ZKR = ["ne", "po", "út", "st", "čt", "pá", "so"];
const DNY = ["neděli", "pondělí", "úterý", "středu", "čtvrtek", "pátek", "sobotu"];
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const dt = (den: string) => new Date(`${den}T12:00:00Z`).getUTCDay();
/** „2026-10-20“ → „út 20. 10. 2026“ */
const datum = (den: string) => `${ZKR[dt(den)]} ${Number(den.slice(8))}. ${Number(den.slice(5, 7))}. ${den.slice(0, 4)}`;
/** „2026-10-20“ → „20. 10.“ */
const kratce = (den: string) => `${Number(den.slice(8))}. ${Number(den.slice(5, 7))}.`;
const lidi = (n: number) => (n === 1 ? "1 člověk" : `${n} lidi`);
const telOdkaz = `tel:${kontakt.telefonOdkaz}`;

/* ——— Kousky ——— */

const odstavec = (html: string, styl = "") =>
  `<p style="margin:0 0 16px;font-family:${F.text};font-size:17px;line-height:1.55;color:${N.krem2};${styl}">${html}</p>`;

const drobne = (html: string, styl = "") =>
  `<p style="margin:0;font-family:${F.text};font-size:14px;line-height:1.5;color:${N.krem3};${styl}">${html}</p>`;

/** Tlačítko z tabulky — drží tvar i v Outlooku */
function tlacitko(text: string, href: string, barva = N.tlacitko): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:6px auto 22px"><tr>
<td style="border-radius:999px;background:${barva}"><a href="${esc(href)}" style="display:inline-block;padding:15px 32px;font-family:${F.display};font-size:17px;font-weight:600;letter-spacing:0.01em;color:#FFF8EE;text-decoration:none;border-radius:999px">${text}</a></td>
</tr></table>`;
}

/** Tenká linka s kanji uprostřed, jako oddělovač na webu */
const linka = (znak: string) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 22px"><tr>
<td style="border-top:1px solid ${N.linka};font-size:0;line-height:0">&nbsp;</td>
<td width="44" align="center" style="font-family:${F.kanji};font-size:15px;line-height:1;color:${N.kanji};padding:0 10px;white-space:nowrap" lang="ja">${znak}</td>
<td style="border-top:1px solid ${N.linka};font-size:0;line-height:0">&nbsp;</td>
</tr></table>`;

/**
 * Jízdenka do dílny: vlevo údaje, za perforací útržek s razítkem. Razítko
 * se v Apple Mailu pootočí, jinde stojí rovně — obojí vypadá jako razítko.
 */
function jizdenka(j: JizdenkaMail, stav: "platí" | "zrušená"): string {
  const zrusena = stav === "zrušená";
  const tah = zrusena ? `text-decoration:line-through;text-decoration-color:${B.rumelka};` : "";
  const hodnota = zrusena ? B.inkoust3 : B.inkoust;
  const radek = (popis: string, text: string) => `<tr>
<td class="m-popis" style="padding:7px 0;border-top:1px solid ${B.papir2};font-family:${F.display};font-size:11px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:${B.inkoust3};width:96px;vertical-align:top">${popis}</td>
<td style="padding:6px 0;border-top:1px solid ${B.papir2};font-family:${F.text};font-size:16px;line-height:1.4;color:${hodnota};${tah}">${text}</td>
</tr>`;
  const razitko = zrusena
    ? `<div style="display:inline-block;border:2.5px solid ${B.rumelka};border-radius:6px;padding:6px 6px 5px;transform:rotate(-14deg);color:${B.rumelka};font-family:${F.display};font-size:13px;font-weight:800;letter-spacing:0.14em;line-height:1">ZRUŠENO</div>`
    : `<div style="display:inline-block;border:2.5px solid ${B.rumelka};border-radius:6px;padding:6px 5px 4px;transform:rotate(-10deg);color:${B.rumelka};font-family:${F.display};line-height:1"><span style="display:block;font-size:11px;font-weight:800;letter-spacing:0.1em">ZAMLUVENO</span><span style="display:block;margin-top:3px;font-family:${F.text};font-style:italic;font-size:12px">platí</span></div>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 24px;background:${B.listek};border:1.5px solid ${zrusena ? B.papir3 : B.zelena};border-radius:14px;border-collapse:separate">
<tr>
<td class="m-listek" style="padding:16px 18px 12px 20px;vertical-align:top">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td class="m-druh" style="font-family:${F.display};font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;white-space:nowrap;color:${zrusena ? B.inkoust3 : B.zelena}">Jízdenka do dílny</td>
    <td align="right" style="font-family:${F.mono};font-size:12px;color:${B.inkoust3};white-space:nowrap">№&nbsp;${esc(j.cislo)}</td>
  </tr></table>
  <p class="m-trasa" style="margin:8px 0 10px;font-family:${F.display};font-size:24px;line-height:1.2;font-weight:600;white-space:nowrap;color:${hodnota}">${esc(kontakt.obec)} <span style="color:${zrusena ? B.papir3 : B.zelena};font-weight:400">&nbsp;⟶&nbsp;</span> Dílna</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    ${radek("Den", datum(j.den).replace(/ /g, "&nbsp;"))}
    ${radek("Odjezd", `${hhmm(j.h)}–${hhmm(j.h + R.blok)}`)}
    ${radek("Cestující", lidi(j.osob))}
    ${radek("Jízdné", `${rozpetiJizdneho.od}–${rozpetiJizdneho.do}&nbsp;Kč za člověka`)}
  </table>
</td>
<td class="m-utrzek" width="92" align="center" style="width:92px;padding:14px 8px;border-left:2px dashed ${B.papir3};vertical-align:middle">
  <p style="margin:0 0 10px;font-family:${F.display};font-size:9px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:${B.inkoust3}">kontrola</p>
  <p class="m-cas" style="margin:0;font-family:${F.display};font-size:24px;line-height:1;font-weight:600;color:${hodnota};${tah}">${hhmm(j.h)}</p>
  <p style="margin:4px 0 14px;font-family:${F.text};font-size:13px;color:${B.inkoust3}">${ZKR[dt(j.den)]} ${kratce(j.den)}</p>
  ${razitko}
</td>
</tr>
</table>`;
}

/** Obal mailu: hlavička se značkou, štítek, nadpis, tělo a patička */
function obal(z: Zdroje, o: { predmet: string; nahled: string; stitek: string; kanji: string; nadpis: string; telo: string; proc: string }): string {
  const zdroje = z.zdroje ?? z.web;
  /* Náhledový řádek a za ním výplň, ať si pošta do náhledu nepřibere začátek mailu */
  const vypln = "&#847;&zwnj;&nbsp;".repeat(60);
  return `<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<meta name="x-apple-disable-message-reformatting">
<title>${esc(o.predmet)}</title>
<style>
@font-face{font-family:'Fraunces';font-weight:100 900;src:url(${zdroje}/fonts/web/fraunces-normal.woff2) format('woff2')}
@font-face{font-family:'Newsreader';font-weight:200 800;src:url(${zdroje}/fonts/web/newsreader-normal.woff2) format('woff2')}
@font-face{font-family:'Newsreader';font-style:italic;font-weight:200 800;src:url(${zdroje}/fonts/web/newsreader-italic.woff2) format('woff2')}
:root{color-scheme:dark}
body{margin:0;padding:0;-webkit-text-size-adjust:100%}
a{color:${N.rumelka}}
@media (max-width:520px){
  .m-vnejsi{padding:12px 8px 28px !important}
  .m-karta{padding:26px 20px 24px !important}
  .m-nadpis{font-size:27px !important}
  .m-kanji{font-size:38px !important}
  .m-skryt{display:none !important}
  .m-listek{padding:14px 12px 10px 14px !important}
  .m-popis{width:70px !important;font-size:10px !important;letter-spacing:0.1em !important}
  .m-utrzek{width:64px !important;padding:12px 4px !important}
  .m-cas{font-size:19px !important}
  .m-druh{font-size:10px !important;letter-spacing:0.12em !important}
  .m-trasa{font-size:20px !important}
}
</style>
</head>
<body style="margin:0;padding:0;background:${N.nebe}">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${N.nebe}">${esc(o.nahled)}${vypln}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${N.nebe}" style="background-color:${N.nebe}">
<tr><td class="m-vnejsi" align="center" background="${zdroje}/maily/hvezdy.png" style="padding:28px 16px 40px;background-image:url(${zdroje}/maily/hvezdy.png);background-size:300px 300px;background-repeat:repeat">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">
<tr><td style="padding:0 0 14px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate"><tr>
    <td background="${zdroje}/maily/nebe-noc.jpg" bgcolor="${N.hlava}" style="height:60px;border-radius:999px;background-color:${N.hlava};background-image:url(${zdroje}/maily/nebe-noc.jpg);background-position:left center;background-size:cover;background-repeat:no-repeat">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="vertical-align:middle;height:60px"><img src="${zdroje}/maily/znacka-noc.png" width="180" height="60" alt="JIRO saku" style="display:block;border:0;width:180px;height:60px;font-family:${F.display};font-size:20px;color:${N.krem}"></td>
        <td class="m-skryt" align="right" style="vertical-align:middle;padding-right:24px;font-family:${F.text};font-style:italic;font-size:13px;color:${N.krem};opacity:0.8">keramická dílna v&nbsp;Ořechu</td>
      </tr></table>
    </td>
  </tr></table>
</td></tr>

<tr><td class="m-karta" style="background:${N.karta};border-radius:20px;border:1px solid ${N.linka};padding:34px 36px 30px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="vertical-align:top">
      <p style="margin:0 0 10px;font-family:${F.display};font-size:12px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:${N.rumelka}">${o.stitek}</p>
      <h1 class="m-nadpis" style="margin:0 0 20px;font-family:${F.display};font-size:31px;line-height:1.15;font-weight:500;color:${N.krem}">${o.nadpis}</h1>
    </td>
    <td class="m-kanji" width="64" align="right" style="vertical-align:top;font-family:${F.kanji};font-size:46px;line-height:1;color:${N.kanji};white-space:nowrap" lang="ja" aria-hidden="true">${o.kanji}</td>
  </tr></table>
  ${o.telo}
  ${drobne("Těšíme se na tebe", `margin-top:8px;font-size:16px;color:${N.krem2}`)}
  <img src="${zdroje}/maily/znacka-podpis-noc.png" width="86" height="23" alt="JIRO saku" style="display:block;border:0;width:86px;height:23px;margin-top:6px;font-family:${F.display};font-size:16px;color:${N.krem2}">
</td></tr>

<tr><td align="center" style="padding:22px 18px 0">
  ${drobne(`${esc(kontakt.ulice)}, ${esc(kontakt.psc)} ${esc(kontakt.obec)} · <a href="mailto:${kontakt.email}" style="color:${N.krem2}">${kontakt.email}</a> · <a href="${telOdkaz}" style="color:${N.krem2};text-decoration:none;white-space:nowrap">${esc(kontakt.telefon)}</a>`, "font-size:13px;text-align:center")}
  ${drobne(o.proc, "margin-top:8px;font-size:12px;text-align:center")}
</td></tr>
</table>

</td></tr>
</table>
</body>
</html>`;
}

/* ——— Šest mailů ——— */

/**
 * Uvítání — přijde, když dílna člověka zapíše do rezervací (pozvi
 * v sluzba.ts). Odkaz v něm není: přihlašuje se na webu e-mailem
 * (mailPrihlaseni). Pod tím čtyři kroky, jak to u nás jezdí, i jak
 * jízdenku zrušit.
 */
export function mailVitej(z: Zdroje, d: { osloveni: string }): MailNavrh {
  const predmet = "Vítej v dílně JIRO saku";
  const nahled = "Zapsali jsme tě do rezervací. Přihlásíš se e-mailem, bez hesla.";
  const krok = (cislo: string, nadpis: string, text: string) => `<td width="50%" style="vertical-align:top;padding:0 8px 18px 0">
<p style="margin:0 0 4px;font-family:${F.display};font-size:22px;line-height:1;font-weight:400;font-style:italic;color:${N.rumelka}">${cislo}</p>
<p style="margin:0 0 3px;font-family:${F.display};font-size:15px;font-weight:600;color:${N.krem}">${nadpis}</p>
<p style="margin:0;font-family:${F.text};font-size:14px;line-height:1.4;color:${N.krem3}">${text}</p>
</td>`;
  return {
    predmet,
    nahled,
    html: obal(z, {
      predmet,
      nahled,
      stitek: "Vítej na palubě",
      kanji: "歓迎",
      nadpis: `Ahoj, ${esc(d.osloveni)}.<br>Vítej v dílně.`,
      telo: [
        odstavec("Zapsali jsme tě do rezervací. Heslo nepotřebuješ: na stránce rezervací zadáš tuhle adresu a pošleme ti odkaz, kterým se přihlásíš."),
        tlacitko("Přihlásit se k rezervacím", `${z.web}/rezervace#prihlaseni`),
        linka("道"),
        `<p style="margin:0 0 14px;font-family:${F.display};font-size:12px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:${N.krem3}">Jak to u nás jezdí</p>`,
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 10px"><tr>
${krok("1", "Vyber odjezd", `${dnySlovy[0].toUpperCase()}${dnySlovy.slice(1)}, <span style="white-space:nowrap">${otevrenoSlovy}</span>. Odjezd trvá hodinu a půl.`)}
${krok("2", "Označ jízdenku", "Zamluvená je hned a potvrzení ti přijde mailem.")}
</tr><tr>
${krok("3", "Přijď do dílny", `${esc(kontakt.ulice)}, ${esc(kontakt.obec)}. Jízdné se platí na místě.`)}
${krok("4", "Nemůžeš?", `Jízdenku zrušíš na webu nejpozději ${R.zrusitHodinPredem}&nbsp;hodin předem. Potom nám <a href="${telOdkaz}" style="color:${N.rumelka}">zavolej</a>.`)}
</tr></table>`,
      ].join("\n"),
      proc: "Tenhle mail ti poslal web jirosaku.cz, protože tě dílna zapsala do rezervací. Pokud o nás nic nevíš, mail klidně smaž.",
    }),
  };
}

/** Kód z mailu po číslicích v políčkách, uprostřed tečka: 482 · 017 */
function kodPolicka(kod: string): string {
  const cislice = kod.split("");
  const pulka = Math.ceil(cislice.length / 2);
  const policko = (c: string) =>
    `<td style="padding:0 3px"><div style="width:42px;height:54px;line-height:54px;text-align:center;background:${B.listek};border:1.5px solid ${B.papir3};border-radius:9px;font-family:${F.display};font-size:30px;font-weight:600;color:${B.inkoust}">${esc(c)}</div></td>`;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:4px auto 12px" aria-label="Kód ${esc(cislice.join(" "))}"><tr>
${cislice.slice(0, pulka).map(policko).join("")}
<td style="padding:0 5px;font-family:${F.display};font-size:24px;color:${N.kanji}">·</td>
${cislice.slice(pulka).map(policko).join("")}
</tr></table>`;
}

/**
 * Přihlášení: jednorázový odkaz a k němu kód pro případ, že odkaz
 * otevře jiné zařízení, nebo ho pošta „proklikne“ dřív než člověk.
 */
export function mailPrihlaseni(z: Zdroje, d: { osloveni: string; odkaz: string; kod: string; minut: number }): MailNavrh {
  const kod = kodPolicka(d.kod);
  const predmet = `Přihlášení do rezervací — kód ${d.kod.slice(0, 3)} ${d.kod.slice(3)}`;
  const nahled = `Klikni na odkaz, nebo opiš kód. Platí ${d.minut} minut.`;
  return {
    predmet,
    nahled,
    html: obal(z, {
      predmet,
      nahled,
      stitek: "Klíč od pokladny",
      kanji: "鍵",
      nadpis: `Ahoj, ${esc(d.osloveni)}.<br>Tady je tvůj klíč.`,
      telo: [
        odstavec("Klikni na tlačítko a jsi u pokladny. Web si tě zapamatuje, takže příště už nic zadávat nemusíš."),
        tlacitko("Přihlásit se", d.odkaz),
        linka("或"),
        odstavec("Nebo opiš kód do okénka na stránce rezervací:", "text-align:center;font-size:16px;margin-bottom:12px"),
        kod,
        drobne(`Odkaz i kód platí ${d.minut}&nbsp;minut a jen jednou. Kdyby vypršel, na webu si řekni o nový.`, "text-align:center;margin-bottom:22px"),
        drobne(`Tlačítko nejde? Zkopíruj si adresu:<br><a href="${esc(d.odkaz)}" style="font-family:${F.mono};font-size:12px;color:${N.krem2};word-break:break-all">${esc(d.odkaz)}</a>`, "margin-bottom:24px"),
      ].join("\n"),
      proc: "Tenhle mail ti poslal web jirosaku.cz, protože si někdo s tvou adresou řekl o přihlášení. Pokud o něm nevíš, mail klidně smaž — bez kliknutí se nikdo nepřihlásí.",
    }),
  };
}

/**
 * Potvrzení registrace — přijde, když se člověk zaregistruje na webu
 * (registruj v sluzba.ts). Tlačítko je zároveň první přihlášení: kdo na
 * něj klikne, má registraci potvrzenou a je rovnou u pokladny. Kód je tu
 * ze stejného důvodu jako v přihlášení — kdyby odkaz otevřelo jiné zařízení.
 */
export function mailRegistrace(z: Zdroje, d: { osloveni: string; email: string; odkaz: string; kod: string; minut: number }): MailNavrh {
  const predmet = `Potvrď registraci — kód ${d.kod.slice(0, 3)} ${d.kod.slice(3)}`;
  const nahled = "Jedno kliknutí a můžeš si zamlouvat hodiny v dílně.";
  return {
    predmet,
    nahled,
    html: obal(z, {
      predmet,
      nahled,
      stitek: "Potvrzení registrace",
      kanji: "確認",
      nadpis: `Ahoj, ${esc(d.osloveni)}.<br>Je tohle tvoje adresa?`,
      telo: [
        odstavec("Díky za registraci do rezervací. Ještě nám potvrď, že tahle adresa patří tobě — pak už si hodiny v dílně zamlouváš sám, bez hesla."),
        `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:6px auto 20px"><tr>
<td style="padding:12px 20px;background:${N.hlava};border:1.5px dashed ${N.krem3};border-radius:12px;font-family:${F.mono};font-size:16px;color:${N.krem}">${esc(d.email)}</td>
</tr></table>`,
        tlacitko("Ano, potvrdit registraci", d.odkaz, B.zelena),
        linka("或"),
        odstavec("Nebo opiš kód do okénka na stránce rezervací:", "text-align:center;font-size:16px;margin-bottom:12px"),
        kodPolicka(d.kod),
        drobne(`Odkaz i kód platí ${d.minut}&nbsp;minut a jen jednou. Kdyby vypršel, zaregistruj se na webu znovu — pošleme nový.`, "text-align:center;margin-bottom:22px"),
        drobne(`Tlačítko nejde? Zkopíruj si adresu:<br><a href="${esc(d.odkaz)}" style="font-family:${F.mono};font-size:12px;color:${N.krem2};word-break:break-all">${esc(d.odkaz)}</a>`, "margin-bottom:24px"),
      ].join("\n"),
      proc: "Tenhle mail ti poslal web jirosaku.cz, protože se někdo s tvou adresou zaregistroval do rezervací. Pokud o tom nevíš, mail klidně smaž — bez kliknutí se registrace nepotvrdí.",
    }),
  };
}

/** Potvrzení e-mailové adresy: tlačítko „Ano, je moje“ */
export function mailAdresa(z: Zdroje, d: { osloveni: string; email: string; odkaz: string }): MailNavrh {
  const predmet = "Je tohle tvoje adresa?";
  const nahled = "Potvrď ji jedním kliknutím, ať ti jízdenky chodí tam, kam mají.";
  return {
    predmet,
    nahled,
    html: obal(z, {
      predmet,
      nahled,
      stitek: "Potvrzení adresy",
      kanji: "確認",
      nadpis: `Ahoj, ${esc(d.osloveni)}.<br>Je tohle tvoje adresa?`,
      telo: [
        odstavec("Tuhle adresu máme u tebe zapsanou. Než na ni pošleme první jízdenku, potvrď nám prosím, že je správně a že patří tobě."),
        `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:6px auto 20px"><tr>
<td style="padding:12px 20px;background:${N.hlava};border:1.5px dashed ${N.krem3};border-radius:12px;font-family:${F.mono};font-size:16px;color:${N.krem}">${esc(d.email)}</td>
</tr></table>`,
        tlacitko("Ano, je to moje adresa", d.odkaz, B.zelena),
        odstavec(`Je v ní chyba? Na tenhle mail neklikej a <a href="${telOdkaz}" style="color:${N.rumelka}">zavolej nám</a> — přepíšeme ji.`, "font-size:16px;text-align:center"),
      ].join("\n"),
      proc: "Tenhle mail ti poslal web jirosaku.cz. Dokud adresu nepotvrdíš, nic dalšího ti na ni nepošleme.",
    }),
  };
}

/** Připomínka den předem. Zrušit přes web už nejde — zrusitHodinPredem je stejně dlouhé. */
export function mailPripominka(z: Zdroje, d: { osloveni: string; jizdenka: JizdenkaMail }): MailNavrh {
  const j = d.jizdenka;
  const predmet = `Zítra v ${hhmm(j.h)} jedeš do dílny`;
  const nahled = `${datum(j.den)}, ${kontakt.ulice}, ${kontakt.obec}. Těšíme se!`;
  return {
    predmet,
    nahled,
    html: obal(z, {
      predmet,
      nahled,
      stitek: `Zítra · ${DNY[dt(j.den)]} ${kratce(j.den)}`,
      kanji: "明日",
      nadpis: `Ahoj, ${esc(d.osloveni)}.<br>Zítra se vidíme.`,
      telo: [
        odstavec(`Tvůj odjezd do dílny je za den. Hlína už čeká, stačí přijít pár minut před ${hhmm(j.h)}.`),
        jizdenka(j, "platí"),
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px"><tr>
<td style="vertical-align:top;padding-right:14px">
  <p style="margin:0 0 4px;font-family:${F.display};font-size:12px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:${N.krem3}">Kde nás najdeš</p>
  <p style="margin:0;font-family:${F.text};font-size:17px;line-height:1.45;color:${N.krem}">${esc(kontakt.ulice)}<br>${esc(kontakt.psc)} ${esc(kontakt.obec)}</p>
</td>
<td align="right" style="vertical-align:middle;white-space:nowrap">
  <a href="${esc(mapa)}" style="display:inline-block;padding:10px 18px;border:1.5px solid ${N.krem};border-radius:999px;font-family:${F.display};font-size:15px;font-weight:600;color:${N.krem};text-decoration:none">Mapa cesty</a>
</td>
</tr></table>`,
        linka("道"),
        odstavec(`<b style="color:${N.krem}">Jízdné se platí na místě.</b> ${pravidloPrichodu}`, "font-size:16px"),
        odstavec(`<b style="color:${N.krem}">Něco do cesty?</b> Přes web už se zítřejší jízdenka zrušit nedá, tak nám prosím <a href="${telOdkaz}" style="color:${N.rumelka}">zavolej na ${esc(kontakt.telefon)}</a>, ať místo stihneme nabídnout dál.`, "font-size:16px"),
      ].join("\n"),
      proc: "Tenhle mail ti poslal web jirosaku.cz, protože máš na zítřek zamluvenou jízdenku do dílny.",
    }),
  };
}

/** Zrušená jízdenka: přeškrtnutá, s razítkem, a cesta k nové */
export function mailZruseni(z: Zdroje, d: { osloveni: string; jizdenka: JizdenkaMail }): MailNavrh {
  const j = d.jizdenka;
  const predmet = `Jízdenka zrušená: ${datum(j.den)}, ${hhmm(j.h)}`;
  const nahled = "Místo je zase volné. Kdykoli se k nám vrať.";
  return {
    predmet,
    nahled,
    html: obal(z, {
      predmet,
      nahled,
      stitek: "Zrušená jízdenka",
      kanji: "取消",
      nadpis: `Ahoj, ${esc(d.osloveni)}.<br>Jízdenka je zrušená.`,
      telo: [
        odstavec(`Odjezd v ${DNY[dt(j.den)]} ${kratce(j.den)} v ${hhmm(j.h)} jsme ti zrušili a místo je zase volné. Nic se neplatí.`),
        jizdenka(j, "zrušená"),
        odstavec("Hlína počká. Až se ti to bude hodit, vyber si jiný odjezd.", "text-align:center"),
        tlacitko("Vybrat jiný odjezd", `${z.web}/rezervace`),
        drobne(`Jestli o zrušení víš, je všechno v pořádku. Jestli ne, <a href="${telOdkaz}" style="color:${N.rumelka}">zavolej nám</a> a podíváme se, co se stalo.`, "text-align:center;margin-bottom:24px"),
      ].join("\n"),
      proc: "Tenhle mail ti poslal web jirosaku.cz, protože se zrušila jízdenka zamluvená na tvé jméno.",
    }),
  };
}
