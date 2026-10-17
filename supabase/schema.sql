-- Rezervace dílny — databáze v Supabase.
--
-- Celé se to pustí jednou v Supabase (SQL Editor → vložit → Run). Skript se
-- dá pustit znovu, nic nesmaže. Na konci je potřeba doplnit dva řádky do
-- tabulky `nastaveni` (adresa webu a tajemství pro pozvánky).
--
-- Jak se to řídí z tabulek (Table Editor):
--
--   clenove     Kdo smí rezervovat. Lidi se registrují sami na /rezervace:
--               vyplní jméno a e-mail, přibudou tu s prázdným sloupcem
--               potvrzeno a přijde jim mail s odkazem a kódem. Kliknutím
--               registraci potvrdí (potvrzeno se vyplní) a rovnou jsou
--               přihlášení. Kdo potvrzeno prázdné má, rezervovat nemůže.
--               Další přihlášení: na /rezervace zadá e-mail a přijde mu
--               jednorázový odkaz s kódem (tabulka prihlaseni).
--               Dílna může člověka zapsat i sama novým řádkem (jméno
--               a e-mail) — ten je potvrzený hned a web mu pošle uvítací mail.
--               Uvítání poslat znovu: smazat hodnotu ve sloupci pozvanka_odeslana.
--               Vypnout člověka: aktivni = false. Odhlásit ho ze všech
--               zařízení (ztracený telefon) udělá v SQL Editoru
--                 update clenove set token = gen_random_uuid() where email = '…';
--               token je klíč, který si prohlížeč po přihlášení pamatuje —
--               mailem už nikam nechodí.
--   prihlaseni  Jednorázové odkazy a kódy. Jen otisky (sha256), samotný
--               odkaz ani kód tu není; platí pár minut a jednou.
--   rezervace   Co je zamluvené: odjezd má místa (na webu 4) a jedna
--               rezervace je jedna skupina. Zrušit = vyplnit sloupec zruseno (now()).
--               Rezervaci po telefonu jde zapsat ručně novým řádkem.
--   kurzy       Vypsané termíny kurzů: den, který kurz (kruh, glazury — jak
--               se jmenují na webu) a kolik míst; web umí nakreslit nejvýš
--               tolik sedadel, kolik má kurz v src/data/rezervace.ts (4).
--               Ten den nejedou hodinové odjezdy ani permanentky.
--   zavreno     Zavřený den (cas prázdný) nebo jeden odjezd (cas 10:30).
--   kdo_prijde  Jen ke čtení: kdo kdy přijde, permanentky rozepsané po týdnech.
--
-- Pravidla (dny, hodiny, ceny, kolik lidí) jsou na webu v src/data/rezervace.ts.
-- K tabulkám smí jen server webu se servisním klíčem — prohlížeč nikdy.

create extension if not exists pg_net with schema extensions;

/* ——— Tabulky ——— */

create table if not exists clenove (
  id bigint generated always as identity primary key,
  jmeno text not null,
  email text not null,
  telefon text,
  poznamka text,
  aktivni boolean not null default true,
  /* Kdy odešel uvítací mail. Prázdné = pošle se (znovu). */
  pozvanka_odeslana timestamptz,
  /* Kdy člověk potvrdil e-mail. Prázdné = registroval se na webu a ještě
     neklikl na odkaz z mailu; koho zapíše dílna, je potvrzený hned. */
  potvrzeno timestamptz default now(),
  /* Klíč přihlášeného prohlížeče (cookie). Nový = odhlášení všude. */
  token uuid not null unique default gen_random_uuid(),
  vytvoreno timestamptz not null default now()
);
create unique index if not exists clenove_email on clenove (lower(email));
/* Pro databáze z doby před registrací (17. 10. 2026): kdo už tu je, je potvrzený */
alter table clenove add column if not exists potvrzeno timestamptz default now();

create table if not exists kurzy (
  den date primary key,
  /* id kurzu z webu (src/data/rezervace.ts): kruh, glazury */
  kurz text not null,
  mist smallint not null default 4 check (mist > 0)
);

create table if not exists zavreno (
  id bigint generated always as identity primary key,
  den date not null,
  /* Začátek odjezdu (9:00, 10:30…). Prázdné = celý den. */
  cas time,
  duvod text
);

create table if not exists rezervace (
  id bigint generated always as identity primary key,
  clen_id bigint not null references clenove (id),
  druh text not null check (druh in ('odjezd', 'kurz', 'permanentka')),
  /* Den jízdy; u permanentky první den, kdy platí */
  den date not null,
  /* Jen permanentka: poslední den platnosti */
  den_do date,
  /* Začátek odjezdu nebo spoje; kurz je na celý den, tak čas nemá */
  cas time,
  osob smallint not null check (osob between 1 and 4),
  poznamka text,
  /* Co se zamluvilo jedním kliknutím, má stejné číslo jízdenky */
  jizdenka uuid not null default gen_random_uuid(),
  vytvoreno timestamptz not null default now(),
  /* Vyplněné = zrušená, místo je zase volné */
  zruseno timestamptz,
  check (
    (druh = 'odjezd' and cas is not null and den_do is null)
    or (druh = 'kurz' and cas is null and den_do is null)
    or (druh = 'permanentka' and cas is not null and den_do is not null and den_do >= den)
  )
);
/* Databáze z doby před 16. 10. 2026, kdy se odjezd zamlouval celý: zrušit index,
   který na jeden odjezd pouštěl jen jednu rezervaci. Odjezd má teď místa
   a plní se po skupinách — hlídá to rezervuj(). */
drop index if exists rezervace_odjezd;
create index if not exists rezervace_den on rezervace (den);

/* Žádosti o přihlášení: odkaz a kód z jednoho mailu, jen jejich otisky */
create table if not exists prihlaseni (
  id bigint generated always as identity primary key,
  clen_id bigint not null references clenove (id) on delete cascade,
  odkaz text not null unique,
  kod text not null,
  plati_do timestamptz not null,
  /* Vyplněné = už použitý, nebo spálený po moc špatných kódech */
  pouzito timestamptz,
  pokusu smallint not null default 0,
  vytvoreno timestamptz not null default now()
);
create index if not exists prihlaseni_clen on prihlaseni (clen_id, vytvoreno desc);

create table if not exists nastaveni (
  klic text primary key,
  hodnota text not null
);

/* ——— Zabezpečení: zamčeno všem kromě servisního klíče ——— */

alter table clenove enable row level security;
alter table kurzy enable row level security;
alter table zavreno enable row level security;
alter table rezervace enable row level security;
alter table nastaveni enable row level security;
alter table prihlaseni enable row level security;

revoke all on clenove, kurzy, zavreno, rezervace, nastaveni, prihlaseni from anon, authenticated;
grant select, insert, update on clenove, rezervace, prihlaseni to service_role;
grant select on kurzy, zavreno to service_role;

/* ——— Přehledy pro dílnu ——— */

create or replace view kdo_prijde with (security_invoker = true) as
  select r.den, r.cas, r.druh, c.jmeno, c.telefon, r.osob, r.poznamka
    from rezervace r join clenove c on c.id = r.clen_id
   where r.zruseno is null and r.druh <> 'permanentka' and r.den >= current_date
  union all
  select t::date, r.cas, r.druh, c.jmeno, c.telefon, r.osob, r.poznamka
    from rezervace r join clenove c on c.id = r.clen_id
   cross join lateral generate_series(r.den::timestamp, r.den_do::timestamp, interval '7 days') t
   where r.zruseno is null and r.druh = 'permanentka' and t::date >= current_date
     and not exists (select 1 from kurzy k where k.den = t::date)
   order by 1, 2 nulls first;

/* Trvalé osobní odkazy skončily 17. 10. 2026 — přihlašuje se jednorázovým odkazem */
drop view if exists odkazy;

revoke all on kdo_prijde from anon, authenticated;

/* ——— Funkce, které volá web ——— */

/**
 * Co je zamluvené ode dneška dál — bez jmen. U odjezdů kolik míst je pryč. Když přijde platný token,
 * přibude jméno člena a jeho vlastní jízdenky.
 */
create or replace function volno(p_od date, p_token uuid default null)
returns jsonb language plpgsql stable as $$
declare
  v_clen clenove;
  v jsonb;
begin
  v := jsonb_build_object(
    'obsazeno', coalesce((
      select jsonb_agg(jsonb_build_object('den', den, 'cas', to_char(cas, 'HH24:MI'), 'osob', osob))
        from (select den, cas, sum(osob) as osob from rezervace
               where druh = 'odjezd' and zruseno is null and den >= p_od group by den, cas) o), '[]'::jsonb),
    'zavreno', coalesce((
      select jsonb_agg(jsonb_build_object('den', den, 'cas', to_char(cas, 'HH24:MI')))
        from zavreno where den >= p_od), '[]'::jsonb),
    'kurzy', coalesce((
      select jsonb_agg(jsonb_build_object('den', k.den, 'kurz', k.kurz, 'mist', k.mist, 'obsazeno', coalesce((
               select sum(r.osob) from rezervace r where r.druh = 'kurz' and r.den = k.den and r.zruseno is null), 0)))
        from kurzy k where k.den >= p_od), '[]'::jsonb),
    'permanentky', coalesce((
      select jsonb_agg(jsonb_build_object('dt', extract(dow from den)::int, 'cas', to_char(cas, 'HH24:MI'), 'osob', osob, 'do', den_do))
        from rezervace where druh = 'permanentka' and zruseno is null and den_do >= p_od), '[]'::jsonb),
    'clen', null,
    'moje', '[]'::jsonb
  );
  if p_token is null then return v; end if;

  select * into v_clen from clenove where token = p_token and aktivni;
  if not found then return v; end if;

  return v || jsonb_build_object(
    'clen', jsonb_build_object('jmeno', v_clen.jmeno),
    'moje', coalesce((
      select jsonb_agg(jsonb_build_object('id', id, 'druh', druh, 'den', den, 'do', den_do, 'cas', to_char(cas, 'HH24:MI'), 'osob', osob)
                       order by den, cas nulls first)
        from rezervace where clen_id = v_clen.id and zruseno is null and coalesce(den_do, den) >= p_od), '[]'::jsonb)
  );
end $$;

/* Trvalý odkaz /k/<token> skončil — jméno podle tokenu už nikdo nepotřebuje */
drop function if exists clen(uuid);

/**
 * Zapíše otisk odkazu a kódu z jednoho mailu. Starší nepoužité žádosti
 * člena tím přestanou platit. Chyba: casto (víc než 5 za čtvrt hodiny).
 */
create or replace function prihlaseni_zapis(p_clen bigint, p_odkaz text, p_kod text, p_minut int)
returns void language plpgsql as $$
begin
  if (select count(*) from prihlaseni where clen_id = p_clen and vytvoreno > now() - interval '15 minutes') >= 5 then
    raise exception 'casto';
  end if;
  update prihlaseni set pouzito = now() where clen_id = p_clen and pouzito is null;
  insert into prihlaseni (clen_id, odkaz, kod, plati_do)
    values (p_clen, p_odkaz, p_kod, now() + make_interval(mins => p_minut));
end $$;

/**
 * Žádost o přihlášení: člen zadal e-mail. Když je mezi aktivními členy,
 * zapíše se otisk odkazu a kódu a vrátí se, komu mail poslat a jestli už
 * registraci potvrdil (když ne, web pošle potvrzení místo přihlášení);
 * jinak nic (web odpoví stejně, ať se nedá zkoušet, kdo je členem).
 */
create or replace function prihlas_zadost(p_email text, p_odkaz text, p_kod text, p_minut int)
returns jsonb language plpgsql as $$
declare
  v_clen clenove;
begin
  select * into v_clen from clenove where lower(email) = lower(trim(p_email)) and aktivni;
  if not found then return null; end if;
  perform prihlaseni_zapis(v_clen.id, p_odkaz, p_kod, p_minut);
  return jsonb_build_object('jmeno', v_clen.jmeno, 'email', v_clen.email, 'potvrzeny', v_clen.potvrzeno is not null);
end $$;

/**
 * Registrace z webu: jméno a e-mail. Nový člověk přibude s prázdným
 * potvrzeno (uvítací mail se mu neposílá — pozvanka_odeslana je vyplněná),
 * kdo se registroval a nepotvrdil, dostane nové jméno a nový odkaz. Kdo
 * už je potvrzený, dostane přihlášení (jméno se mu nemění). Vypnutý
 * člověk nedostane nic. Vrací, komu co poslat — web odpoví vždycky stejně.
 * Chyba: casto (víc než 5 žádostí člověka za čtvrt hodiny, nebo víc než 40
 * nepotvrzených registrací za hodinu — ať se z formuláře nedá rozesílat pošta).
 */
create or replace function registrace(p_jmeno text, p_email text, p_odkaz text, p_kod text, p_minut int)
returns jsonb language plpgsql as $$
declare
  v_clen clenove;
begin
  select * into v_clen from clenove where lower(email) = lower(trim(p_email)) for update;
  if found and not v_clen.aktivni then return null; end if;
  if not found then
    if (select count(*) from clenove where potvrzeno is null and vytvoreno > now() - interval '1 hour') >= 40 then
      raise exception 'casto';
    end if;
    insert into clenove (jmeno, email, potvrzeno, pozvanka_odeslana)
      values (trim(p_jmeno), trim(p_email), null, now())
      returning * into v_clen;
  elsif v_clen.potvrzeno is null then
    update clenove set jmeno = trim(p_jmeno) where id = v_clen.id returning * into v_clen;
  end if;
  perform prihlaseni_zapis(v_clen.id, p_odkaz, p_kod, p_minut);
  return jsonb_build_object('jmeno', v_clen.jmeno, 'email', v_clen.email, 'potvrzeny', v_clen.potvrzeno is not null);
end $$;

/** Odkaz z mailu: když platí, spotřebuje se, potvrdí registraci a vrátí klíč člena pro cookie */
create or replace function prihlas_odkaz(p_odkaz text)
returns uuid language plpgsql as $$
declare
  v_clen bigint;
  v_token uuid;
begin
  update prihlaseni p set pouzito = now()
    from clenove c
   where p.odkaz = p_odkaz and p.pouzito is null and p.plati_do > now() and c.id = p.clen_id and c.aktivni
  returning c.id into v_clen;
  if v_clen is null then return null; end if;
  update clenove set potvrzeno = coalesce(potvrzeno, now()) where id = v_clen returning token into v_token;
  return v_token;
end $$;

/**
 * Kód z mailu opsaný na webu. Platí jen poslední žádost; po pěti špatných
 * pokusech se spálí a je potřeba poslat si nový. Jako odkaz potvrdí registraci.
 */
create or replace function prihlas_kod(p_email text, p_kod text)
returns uuid language plpgsql as $$
declare
  v_p prihlaseni;
  v_token uuid;
begin
  select p.* into v_p from prihlaseni p join clenove c on c.id = p.clen_id
   where lower(c.email) = lower(trim(p_email)) and c.aktivni and p.pouzito is null and p.plati_do > now()
   order by p.vytvoreno desc limit 1 for update of p;
  if not found then return null; end if;
  if v_p.kod <> p_kod then
    update prihlaseni set pokusu = pokusu + 1, pouzito = case when pokusu + 1 >= 5 then now() end where id = v_p.id;
    return null;
  end if;
  update prihlaseni set pouzito = now() where id = v_p.id;
  update clenove set potvrzeno = coalesce(potvrzeno, now()) where id = v_p.clen_id returning token into v_token;
  return v_token;
end $$;

/**
 * Zamluví místa na odjezdech, v kurzu nebo na permanentce. Kontrola i zápis
 * jsou pod jedním zámkem, takže poslední místo dostane jen jeden. Kolik
 * míst má odjezd a spoj permanentky, posílá web (p_mist).
 *
 * Dny v týdnu, hodiny a jak daleko dopředu hlídá web; tady se hlídá to,
 * co ví jen databáze: jestli je člen, jestli je otevřeno a jestli je volno.
 * Chyby: neznamy, zavreno, vyluka, nejede, plno.
 */
create or replace function rezervuj(
  p_token uuid,
  p_druh text,
  p_den date,
  p_hodiny text[],
  p_osob int,
  p_den_do date default null,
  p_mist int default null,
  p_poznamka text default null
) returns jsonb language plpgsql as $$
declare
  v_clen clenove;
  v_kurz kurzy;
  v_je_kurz boolean;
  v_jizdenka uuid := gen_random_uuid();
  v_cas time;
  v_obsazeno int;
begin
  select * into v_clen from clenove where token = p_token and aktivni;
  if not found then raise exception 'neznamy'; end if;

  perform pg_advisory_xact_lock(hashtext('rezervace'));

  if exists (select 1 from zavreno where den = p_den and cas is null) then raise exception 'zavreno'; end if;
  select * into v_kurz from kurzy where den = p_den;
  v_je_kurz := found;

  if p_druh = 'kurz' then
    if not v_je_kurz then raise exception 'nejede'; end if;
    select coalesce(sum(osob), 0) into v_obsazeno from rezervace where druh = 'kurz' and den = p_den and zruseno is null;
    if v_obsazeno + p_osob > v_kurz.mist then raise exception 'plno'; end if;
    insert into rezervace (clen_id, druh, den, osob, poznamka, jizdenka)
      values (v_clen.id, 'kurz', p_den, p_osob, p_poznamka, v_jizdenka);

  elsif p_druh in ('odjezd', 'permanentka') then
    if v_je_kurz then raise exception 'vyluka'; end if;
    if coalesce(array_length(p_hodiny, 1), 0) = 0 then raise exception 'nic'; end if;
    if p_mist is null or (p_druh = 'permanentka' and p_den_do is null) then raise exception 'nic'; end if;

    foreach v_cas in array p_hodiny::time[] loop
      if exists (select 1 from zavreno where den = p_den and cas = v_cas) then raise exception 'zavreno'; end if;
      if p_druh = 'odjezd' then
        select coalesce(sum(osob), 0) into v_obsazeno from rezervace
         where druh = 'odjezd' and den = p_den and cas = v_cas and zruseno is null;
        if v_obsazeno + p_osob > p_mist then raise exception 'plno'; end if;
        insert into rezervace (clen_id, druh, den, cas, osob, poznamka, jizdenka)
          values (v_clen.id, 'odjezd', p_den, v_cas, p_osob, p_poznamka, v_jizdenka);
      else
        /* Permanentky na stejný den v týdnu a spoj, které se s touhle kryjí */
        select coalesce(sum(osob), 0) into v_obsazeno from rezervace
         where druh = 'permanentka' and zruseno is null and cas = v_cas
           and extract(dow from den) = extract(dow from p_den)
           and den <= p_den_do and den_do >= p_den;
        if v_obsazeno + p_osob > p_mist then raise exception 'plno'; end if;
        insert into rezervace (clen_id, druh, den, den_do, cas, osob, poznamka, jizdenka)
          values (v_clen.id, 'permanentka', p_den, p_den_do, v_cas, p_osob, p_poznamka, v_jizdenka);
      end if;
    end loop;

  else
    raise exception 'nic';
  end if;

  return jsonb_build_object('jizdenka', v_jizdenka, 'jmeno', v_clen.jmeno, 'email', v_clen.email, 'kurz', v_kurz.kurz,
    /* Týdny permanentky, kdy jede kurz — výluka, ty se neplatí */
    'vyluk', case when p_druh = 'permanentka' then (
      select count(*) from kurzy k where k.den between p_den and p_den_do and extract(dow from k.den) = extract(dow from p_den)) end);
end $$;

/**
 * Zruší vlastní rezervaci — nejpozději p_hodin hodin před začátkem.
 * Permanentka se přes web neruší. Chyby: neznamy, nenalezeno, permanentka, pozde.
 */
create or replace function zrus(p_token uuid, p_id bigint, p_hodin int)
returns jsonb language plpgsql as $$
declare
  v_clen clenove;
  v_r rezervace;
begin
  select * into v_clen from clenove where token = p_token and aktivni;
  if not found then raise exception 'neznamy'; end if;

  select * into v_r from rezervace where id = p_id and clen_id = v_clen.id and zruseno is null for update;
  if not found then raise exception 'nenalezeno'; end if;
  if v_r.druh = 'permanentka' then raise exception 'permanentka'; end if;
  /* Kurz čas nemá, začíná ráno */
  if ((v_r.den + coalesce(v_r.cas, time '09:00')) at time zone 'Europe/Prague') - make_interval(hours => p_hodin) < now() then
    raise exception 'pozde';
  end if;

  update rezervace set zruseno = now() where id = v_r.id;
  return jsonb_build_object('druh', v_r.druh, 'den', v_r.den, 'cas', to_char(v_r.cas, 'HH24:MI'), 'osob', v_r.osob,
                            'jmeno', v_clen.jmeno, 'email', v_clen.email);
end $$;

/** Komu se má poslat uvítání — nic, když už odešlo nebo je člen vypnutý */
create or replace function pozvanka(p_id bigint)
returns jsonb language sql stable as $$
  select jsonb_build_object('jmeno', jmeno, 'email', email)
    from clenove where id = p_id and aktivni and pozvanka_odeslana is null;
$$;

create or replace function pozvanka_hotovo(p_id bigint)
returns void language sql as $$
  update clenove set pozvanka_odeslana = now() where id = p_id;
$$;

revoke execute on function volno(date, uuid), rezervuj(uuid, text, date, text[], int, date, int, text),
  zrus(uuid, bigint, int), pozvanka(bigint), pozvanka_hotovo(bigint),
  prihlas_zadost(text, text, text, int), prihlas_odkaz(text), prihlas_kod(text, text),
  prihlaseni_zapis(bigint, text, text, int), registrace(text, text, text, text, int) from public, anon, authenticated;
grant execute on function volno(date, uuid), rezervuj(uuid, text, date, text[], int, date, int, text),
  zrus(uuid, bigint, int), pozvanka(bigint), pozvanka_hotovo(bigint),
  prihlas_zadost(text, text, text, int), prihlas_odkaz(text), prihlas_kod(text, text),
  prihlaseni_zapis(bigint, text, text, int), registrace(text, text, text, text, int) to service_role;

/* ——— Uvítání: nový člen → web pošle uvítací mail ———
 *
 * Když má aktivní člen prázdné pozvanka_odeslana (nový řádek, nebo ji
 * někdo smazal, ať se pošle znovu), databáze zavolá web a ten odešle
 * mail přes Resend a čas zapíše. Kam volat a čím se prokázat, je
 * v tabulce nastaveni; dokud tam ty dva řádky nejsou, nic se neposílá.
 */
create or replace function posli_pozvanku()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_web text;
  v_tajemstvi text;
begin
  if new.aktivni and new.pozvanka_odeslana is null then
    select hodnota into v_web from nastaveni where klic = 'web';
    select hodnota into v_tajemstvi from nastaveni where klic = 'tajemstvi';
    if v_web is not null and v_tajemstvi is not null then
      perform net.http_post(
        url := v_web || '/api/pozvanka',
        body := jsonb_build_object('id', new.id),
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_tajemstvi),
        timeout_milliseconds := 10000
      );
    end if;
  end if;
  return new;
end $$;

revoke execute on function posli_pozvanku() from public, anon, authenticated;

drop trigger if exists pozvanka on clenove;
create trigger pozvanka after insert or update of pozvanka_odeslana, aktivni on clenove
  for each row execute function posli_pozvanku();

/* ——— Nastavení: doplnit a pustit zvlášť ———
 *
 * insert into nastaveni (klic, hodnota) values
 *   ('web', 'https://orechovahlina.cz'),
 *   ('tajemstvi', 'stejný dlouhý náhodný text jako POZVANKY_TAJEMSTVI na webu')
 * on conflict (klic) do update set hodnota = excluded.hodnota;
 */
