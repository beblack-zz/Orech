/**
 * Registrace a přihlášení bez hesla na /rezervace — cedulka .rz-clen
 * v Nadrazi.astro.
 *
 * Stavy (data-co na cedulce, odstavce s data-clen se podle něj ukazují):
 *   host       bez skriptu: jen věta s telefonem
 *   registrace jméno a e-mail → /api/registrace pošle mail na potvrzení
 *   potvrdit   mrkni do pošty a potvrď registraci, nebo opiš kód → /api/overit
 *   prihlasit  kdo už je zaregistrovaný: e-mail → /api/prihlas pošle odkaz s kódem
 *   poslano    mrkni do pošty, nebo opiš kód → /api/overit
 *   neplatny   odkaz z mailu propadl — totéž co prihlasit, jiný nadpis
 *   clen       přihlášený: pozdrav jménem a odhlášení (/api/odhlas)
 *
 * Potvrzení registrace je zároveň první přihlášení: odkaz i kód z mailu
 * fungují stejně jako při přihlášení a server při nich registraci potvrdí.
 * Kdo se registruje s adresou, která už je mezi členy, dostane místo
 * potvrzení přihlášení — stránka to neví (server odpovídá pořád stejně),
 * proto věta v poště mluví o obojím.
 *
 * Odkaz z mailu vede přes /k/<odkaz> sem s #k=<odkaz>. Skript ho hned
 * smaže z adresy a pošle na /api/overit — až teď se spotřebuje (roboti
 * pošty, kteří odkazy otevírají, skripty nepouštějí). Uvítací mail vede
 * na #prihlaseni: cedulka se ukáže a kurzor skočí do formuláře.
 *
 * Bez serveru (ukázka) je cedulka stejná, jen odeslání řekne, že
 * rezervace se teprve zapojují, a nabídne telefon (data-telefon).
 *
 * Kdo je přihlášený, ví server (cookie, kterou skript nepřečte) — po
 * přihlášení i odhlášení se proto kalendář načte znovu (poZmene).
 */
type Krok = "registrace" | "potvrdit" | "prihlasit" | "poslano" | "neplatny";
type Stav = Krok | "clen";

interface Volby {
  /** Jsou rezervace zapojené (odpověděl server)? */
  zive: () => boolean;
  /** Přihlášený člen podle posledního kalendáře */
  clen: () => { jmeno: string } | null;
  /** Načíst kalendář znovu — po přihlášení a odhlášení */
  poZmene: () => Promise<void>;
}

const posli = async (cesta: string, telo: unknown): Promise<{ ok: boolean; chyba?: string }> => {
  try {
    const r = await fetch(cesta, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(telo) });
    return (await r.json()) as { ok: boolean; chyba?: string };
  } catch {
    return { ok: false, chyba: "chyba" };
  }
};

const JE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function initPrihlaseni(el: HTMLElement, v: Volby) {
  const formReg = el.querySelector<HTMLFormElement>("[data-rz-registrace]");
  const formEmail = el.querySelector<HTMLFormElement>("[data-rz-prihlas]");
  const formKod = el.querySelector<HTMLFormElement>("[data-rz-kod]");
  const jmeno = formReg?.querySelector<HTMLInputElement>('input[name="jmeno"]') ?? null;
  const emailReg = formReg?.querySelector<HTMLInputElement>('input[name="email"]') ?? null;
  const email = formEmail?.querySelector<HTMLInputElement>('input[name="email"]') ?? null;
  const kod = el.querySelector<HTMLInputElement>('input[name="kod"]');
  const chyba = el.querySelector<HTMLElement>(".rz-clen-chyba");
  const telefon = el.dataset.telefon ?? "";
  /* Co si člověk právě dělá — přihlášení se bere z kalendáře */
  let krok: Krok = "registrace";
  /** Adresa, na kterou šel poslední mail — k ní patří kód */
  let adresa = "";

  const hlasit = (text = "") => {
    if (!chyba) return;
    chyba.textContent = text;
    chyba.hidden = !text;
  };

  const ukaz = () => {
    const c = v.clen();
    const co: Stav = c ? "clen" : krok;
    el.dataset.co = co;
    el.querySelectorAll<HTMLElement>("[data-clen]").forEach((p) => (p.hidden = !(p.dataset.clen ?? "").split(" ").includes(co)));
    const jm = el.querySelector(".rz-clen-jmeno");
    if (jm) jm.textContent = c?.jmeno ?? "";
    el.querySelectorAll(".rz-clen-adresa").forEach((a) => (a.textContent = adresa));
  };

  const prepni = (k: Krok) => {
    krok = k;
    hlasit();
    ukaz();
  };

  /** Přihlášení nebo odhlášení proběhlo: kalendář ví, kdo je kdo */
  const zmena = async () => {
    krok = "registrace";
    await v.poZmene();
    ukaz();
  };

  const zaneprazdni = (form: HTMLFormElement | null, ano: boolean) => {
    const b = form?.querySelector("button:not([hidden])");
    if (!b) return;
    if (ano) b.setAttribute("aria-busy", "true");
    else b.removeAttribute("aria-busy");
  };

  /** Co říct, když server nepřijal žádost o mail */
  const nevyslo = (o: { chyba?: string }) =>
    o.chyba === "spatne"
      ? "Zkontroluj jméno a e-mail — něco z toho nesedí."
      : o.chyba === "vypnuto" || !v.zive()
        ? `Rezervace na webu se teprve zapojují. Zatím nám zavolej${telefon ? ` na ${telefon}` : ""} — zapíšeme tě.`
        : "Teď se to nepovedlo odeslat. Zkus to za chvíli, nebo nám zavolej.";

  const poOdeslani = (k: "potvrdit" | "poslano", na: string) => {
    adresa = na;
    if (email && !email.value) email.value = na;
    if (kod) kod.value = "";
    prepni(k);
    kod?.focus();
  };

  const registruj = async () => {
    const j = jmeno?.value.trim() ?? "";
    const a = emailReg?.value.trim() ?? "";
    if (j.length < 2) {
      hlasit("Napiš nám, jak ti říkat.");
      jmeno?.focus();
      return;
    }
    if (!JE_EMAIL.test(a)) {
      hlasit("Tohle nevypadá jako e-mail. Zkontroluj ho.");
      emailReg?.focus();
      return;
    }
    zaneprazdni(formReg, true);
    const o = await posli("/api/registrace", { jmeno: j, email: a });
    zaneprazdni(formReg, false);
    if (!el.isConnected) return;
    if (!o.ok) return hlasit(nevyslo(o));
    poOdeslani("potvrdit", a);
  };

  const pozadej = async (na = email?.value.trim() ?? "") => {
    if (!JE_EMAIL.test(na)) {
      hlasit("Tohle nevypadá jako e-mail. Zkontroluj ho.");
      email?.focus();
      return;
    }
    zaneprazdni(formEmail, true);
    const o = await posli("/api/prihlas", { email: na });
    zaneprazdni(formEmail, false);
    if (!el.isConnected) return;
    if (!o.ok) return hlasit(nevyslo(o));
    poOdeslani("poslano", na);
  };

  formReg?.addEventListener("submit", (e) => {
    e.preventDefault();
    void registruj();
  });
  formEmail?.addEventListener("submit", (e) => {
    e.preventDefault();
    void pozadej();
  });

  formKod?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const cisla = (kod?.value ?? "").replace(/\D/g, "");
    if (cisla.length !== 6) {
      hlasit("Kód má šest číslic.");
      kod?.focus();
      return;
    }
    zaneprazdni(formKod, true);
    const o = await posli("/api/overit", { email: adresa, kod: cisla });
    zaneprazdni(formKod, false);
    if (!el.isConnected) return;
    if (!o.ok) {
      hlasit("Kód nesedí, nebo už neplatí. Zkontroluj ho, nebo si pošli nový.");
      kod?.select();
      return;
    }
    await zmena();
  });

  /* Kód se píše po číslicích; „123456“ se pro čitelnost rozdělí mezerou */
  kod?.addEventListener("input", () => {
    const c = kod.value.replace(/\D/g, "").slice(0, 6);
    kod.value = c.length > 3 ? `${c.slice(0, 3)} ${c.slice(3)}` : c;
  });

  /* Poslat znovu: kdo se registroval, dostane znovu potvrzení, kdo se přihlašoval, odkaz */
  el.querySelector("[data-rz-znovu]")?.addEventListener("click", () => void (krok === "potvrdit" ? registruj() : pozadej(adresa)));
  el.querySelector("[data-rz-jiny]")?.addEventListener("click", () => {
    const zpet = krok === "potvrdit" ? "registrace" : "prihlasit";
    prepni(zpet);
    (zpet === "registrace" ? emailReg : email)?.select();
  });
  el.querySelectorAll("[data-rz-mam]").forEach((b) =>
    b.addEventListener("click", () => {
      if (email && !email.value && emailReg?.value) email.value = emailReg.value;
      prepni("prihlasit");
      email?.focus();
    }),
  );
  el.querySelectorAll("[data-rz-nova]").forEach((b) =>
    b.addEventListener("click", () => {
      if (emailReg && !emailReg.value && email?.value) emailReg.value = email.value;
      prepni("registrace");
      jmeno?.focus();
    }),
  );
  el.querySelector("[data-rz-odhlas]")?.addEventListener("click", async () => {
    await posli("/api/odhlas", {});
    if (el.isConnected) await zmena();
  });

  /** Ukáže cedulku a skočí do formuláře — z tlačítka na jízdence a z #prihlaseni */
  const kPrihlaseni = () => {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    if (v.clen()) return;
    const kam = krok === "registrace" ? jmeno : krok === "potvrdit" || krok === "poslano" ? kod : email;
    window.setTimeout(() => kam?.focus({ preventScroll: true }), 400);
  };

  /* Přišel z mailu: odkaz za mřížkou spotřebovat, uvítání vede rovnou k přihlášení */
  const hash = window.location.hash;
  if (hash.startsWith("#k=")) {
    const odkaz = decodeURIComponent(hash.slice(3));
    history.replaceState(history.state, "", window.location.pathname + window.location.search);
    void (async () => {
      const o = await posli("/api/overit", { odkaz });
      if (!el.isConnected) return;
      if (o.ok) await zmena();
      else prepni("neplatny");
      el.scrollIntoView({ block: "center" });
    })();
  } else if (hash === "#prihlaseni") {
    krok = "prihlasit";
    kPrihlaseni();
  }

  ukaz();
  return { ukaz, kPrihlaseni };
}
