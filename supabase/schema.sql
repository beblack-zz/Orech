-- Rezervace dílny — databáze v Supabase.
--
-- Celé se to pustí jednou v Supabase (SQL Editor → vložit → Run). Skript se
-- dá pustit znovu, nic nesmaže. Na konci je potřeba doplnit dva řádky do
-- tabulky `nastaveni` (adresa webu a tajemství pro pozvánky).
--
-- Jak se to řídí z tabulek (Table Editor):
--
--   clenove     Kdo smí rezervovat. Nový řádek = jméno a e-mail; databáze
--               sama vyrobí odkaz (token) a web ho člověku pošle mailem.
--               Poslat znovu: smazat hodnotu ve sloupci pozvanka_odeslana.
--               Vypnout člověka: aktivni = false. Když odkaz unikne, nový
--               udělá v SQL Editoru
--                 update clenove set token = gen_random_uuid(), pozvanka_odeslana = null where email = '…';
--               starý tím přestane platit a nový odejde mailem.
--   rezervace   Co je zamluvené. Zrušit = vyplnit sloupec zruseno (now()).
--               Rezervaci po telefonu jde zapsat ručně novým řádkem.
--   kurzy       Vypsané termíny kurzů: den, který kurz (kruh, glazury — jak
--               se jmenují na webu) a kolik míst; web umí nakreslit nejvýš
--               tolik sedadel, kolik má kurz v src/data/rezervace.ts (7).
--               Ten den nejedou hodinové odjezdy ani permanentky.
--   zavreno     Zavřený den (cas prázdný) nebo jeden odjezd (cas 10:30).
--   kdo_prijde  Jen ke čtení: kdo kdy přijde, permanentky rozepsané po týdnech.
--   odkazy      Jen ke čtení: osobní odkazy, kdyby mail nedošel.
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
  /* Kdy odešel mail s odkazem. Prázdné = pošle se (znovu). */
  pozvanka_odeslana timestamptz,
  token uuid not null unique default gen_random_uuid(),
  vytvoreno timestamptz not null default now()
);
create unique index if not exists clenove_email on clenove (lower(email));

create table if not exists kurzy (
  den date primary key,
  /* id kurzu z webu (src/data/rezervace.ts): kruh, glazury */
  kurz text not null,
  mist smallint not null default 7 check (mist > 0)
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
/* Odjezd se zamlouvá celý: dvě platné rezervace na stejný den a čas být nemůžou */
create unique index if not exists rezervace_odjezd on rezervace (den, cas) where druh = 'odjezd' and zruseno is null;
create index if not exists rezervace_den on rezervace (den);

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

revoke all on clenove, kurzy, zavreno, rezervace, nastaveni from anon, authenticated;
grant select, insert, update on clenove, rezervace to service_role;
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

create or replace view odkazy with (security_invoker = true) as
  select c.jmeno, c.email, c.aktivni, c.pozvanka_odeslana,
         (select hodnota from nastaveni where klic = 'web') || '/k/' || c.token as odkaz
    from clenove c
   order by c.jmeno;

revoke all on kdo_prijde, odkazy from anon, authenticated;

/* ——— Funkce, které volá web ——— */

/**
 * Co je zamluvené ode dneška dál — bez jmen. Když přijde platný token,
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
      select jsonb_agg(jsonb_build_object('den', den, 'cas', to_char(cas, 'HH24:MI')))
        from rezervace where druh = 'odjezd' and zruseno is null and den >= p_od), '[]'::jsonb),
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

/** Jméno člena, kterému token patří — nebo nic, když odkaz neplatí */
create or replace function clen(p_token uuid)
returns text language sql stable as $$
  select jmeno from clenove where token = p_token and aktivni;
$$;

/**
 * Zamluví odjezdy, místa v kurzu nebo permanentku. Kontrola i zápis jsou
 * pod jedním zámkem, takže poslední místo dostane jen jeden.
 *
 * Dny v týdnu, hodiny a jak daleko dopředu hlídá web; tady se hlídá to,
 * co ví jen databáze: jestli je člen, jestli je otevřeno a jestli je volno.
 * Chyby: neznamy, zavreno, vyluka, nejede, obsazeno, plno.
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
    if p_druh = 'permanentka' and (p_den_do is null or p_mist is null) then raise exception 'nic'; end if;

    foreach v_cas in array p_hodiny::time[] loop
      if exists (select 1 from zavreno where den = p_den and cas = v_cas) then raise exception 'zavreno'; end if;
      if p_druh = 'odjezd' then
        if exists (select 1 from rezervace where druh = 'odjezd' and den = p_den and cas = v_cas and zruseno is null) then
          raise exception 'obsazeno';
        end if;
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

  return jsonb_build_object('jizdenka', v_jizdenka, 'jmeno', v_clen.jmeno, 'email', v_clen.email, 'kurz', v_kurz.kurz);
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

/** Komu se má poslat pozvánka — nic, když už odešla nebo je člen vypnutý */
create or replace function pozvanka(p_id bigint)
returns jsonb language sql stable as $$
  select jsonb_build_object('jmeno', jmeno, 'email', email, 'token', token)
    from clenove where id = p_id and aktivni and pozvanka_odeslana is null;
$$;

create or replace function pozvanka_hotovo(p_id bigint)
returns void language sql as $$
  update clenove set pozvanka_odeslana = now() where id = p_id;
$$;

revoke execute on function volno(date, uuid), clen(uuid), rezervuj(uuid, text, date, text[], int, date, int, text),
  zrus(uuid, bigint, int), pozvanka(bigint), pozvanka_hotovo(bigint) from public, anon, authenticated;
grant execute on function volno(date, uuid), clen(uuid), rezervuj(uuid, text, date, text[], int, date, int, text),
  zrus(uuid, bigint, int), pozvanka(bigint), pozvanka_hotovo(bigint) to service_role;

/* ——— Pozvánka: nový člen → web pošle mail s odkazem ———
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
