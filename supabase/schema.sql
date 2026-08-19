create extension if not exists pgcrypto;

create or replace function public.normalize_pin(p_pin text)
returns text
language sql
immutable
as $$
  select left(regexp_replace(coalesce(p_pin, ''), '\D', '', 'g'), 6);
$$;

create or replace function public.hash_pin(p_pin text, p_salt text)
returns text
language sql
immutable
as $$
  select encode(extensions.digest(public.normalize_pin(p_pin) || coalesce(p_salt, ''), 'sha256'), 'hex');
$$;

create or replace function public.hash_session_token(p_token text)
returns text
language sql
immutable
as $$
  select encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.super_admins (
  id text primary key,
  name text not null,
  email text not null unique,
  pin text not null unique check (pin ~ '^[0-9]{6}$'),
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.companies (
  id text primary key,
  legal_name text not null default '',
  name text not null,
  cif text default '',
  email text default '',
  phone text default '',
  contact_person text default '',
  delivery_address text default '',
  pin text not null unique check (pin ~ '^[0-9]{6}$'),
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id text primary key,
  name text not null,
  key text not null unique,
  icon text not null default 'package',
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subcategories (
  id text primary key,
  category_id text not null references public.categories(id) on delete cascade,
  name text not null,
  key text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, key)
);

create table if not exists public.products (
  id text primary key,
  sku text not null unique,
  name text not null,
  category_id text not null references public.categories(id) on delete restrict,
  subcategory_id text references public.subcategories(id) on delete set null,
  category_name text,
  subcategory_name text,
  price numeric(12, 3) not null default 0,
  stock integer not null default 0,
  description text,
  brand text,
  unit_measure text,
  units_per_box integer,
  image_url text,
  weight_kg numeric(10, 3),
  iva numeric(5, 2) not null default 21,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id text primary key,
  order_id text not null unique,
  company_id text references public.companies(id) on delete set null,
  company_name text not null,
  company_cif text default '',
  company_email text default '',
  company_phone text default '',
  contact_person text default '',
  delivery_address text default '',
  total_items integer not null default 0,
  total_amount numeric(12, 2) not null default 0,
  notes text,
  status text not null default 'authorization_pending'
    check (status in ('pending', 'authorization_pending', 'accepted', 'accepted_modified', 'rejected', 'processing', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  estimated_delivery date
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders(id) on delete cascade,
  product_id text references public.products(id) on delete set null,
  sku text not null,
  name text not null,
  category_name text default '',
  quantity integer not null default 1,
  unit_price numeric(12, 3) not null default 0,
  subtotal numeric(12, 2) not null default 0,
  availability_status text not null default 'available'
    check (availability_status in ('available', 'unavailable')),
  admin_note text
);

create table if not exists public.app_sessions (
  token_hash text primary key,
  role text not null check (role in ('company', 'super_admin')),
  company_id text references public.companies(id) on delete cascade,
  super_admin_id text references public.super_admins(id) on delete cascade,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (role = 'company' and company_id is not null and super_admin_id is null) or
    (role = 'super_admin' and super_admin_id is not null and company_id is null)
  )
);

create table if not exists public.pin_attempts (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('company', 'super_admin')),
  pin_fingerprint text not null,
  success boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.super_admins add column if not exists pin text;
alter table public.companies add column if not exists pin text;

update public.super_admins
set pin = coalesce(pin, '909090')
where id = 'super-admin-main';

update public.companies
set pin = case id
  when 'comp-hotel-costa-demo' then '123456'
  when 'comp-market-sol' then '234567'
  when 'comp-restaurante-marina' then '345678'
  else coalesce(pin, lpad(floor(random() * 1000000)::int::text, 6, '0'))
end
where pin is null;

alter table public.super_admins alter column pin set not null;
alter table public.companies alter column pin set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'super_admins_pin_format') then
    alter table public.super_admins
      add constraint super_admins_pin_format check (pin ~ '^[0-9]{6}$');
  end if;

  if not exists (select 1 from pg_constraint where conname = 'companies_pin_format') then
    alter table public.companies
      add constraint companies_pin_format check (pin ~ '^[0-9]{6}$');
  end if;
end $$;

alter table public.super_admins drop column if exists pin_hash;
alter table public.super_admins drop column if exists pin_salt;
alter table public.super_admins drop column if exists pin_hint;
alter table public.companies drop column if exists pin_hash;
alter table public.companies drop column if exists pin_salt;
alter table public.companies drop column if exists pin_hint;

create index if not exists idx_super_admins_active on public.super_admins(active);
create unique index if not exists idx_super_admins_pin on public.super_admins(pin);
create index if not exists idx_companies_active on public.companies(active);
create unique index if not exists idx_companies_pin on public.companies(pin);
create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_active on public.products(active);
create index if not exists idx_orders_company on public.orders(company_id);
create index if not exists idx_orders_created_at on public.orders(created_at desc);
create index if not exists idx_order_items_order on public.order_items(order_id);
create index if not exists idx_sessions_company on public.app_sessions(company_id);
create index if not exists idx_sessions_admin on public.app_sessions(super_admin_id);
create index if not exists idx_sessions_expires_at on public.app_sessions(expires_at);
create index if not exists idx_pin_attempts_scope_time on public.pin_attempts(scope, created_at desc);

drop trigger if exists set_super_admins_updated_at on public.super_admins;
create trigger set_super_admins_updated_at
before update on public.super_admins
for each row execute function public.set_updated_at();

drop trigger if exists set_companies_updated_at on public.companies;
create trigger set_companies_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

drop trigger if exists set_categories_updated_at on public.categories;
create trigger set_categories_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists set_subcategories_updated_at on public.subcategories;
create trigger set_subcategories_updated_at
before update on public.subcategories
for each row execute function public.set_updated_at();

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create or replace function public.pin_is_limited(p_scope text, p_pin text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select count(*) >= 8
  from public.pin_attempts
  where scope = p_scope
    and pin_fingerprint = encode(extensions.digest(public.normalize_pin(p_pin), 'sha256'), 'hex')
    and success = false
    and created_at > now() - interval '15 minutes';
$$;

create or replace function public.record_pin_attempt(p_scope text, p_pin text, p_success boolean)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.pin_attempts(scope, pin_fingerprint, success)
  values (p_scope, encode(extensions.digest(public.normalize_pin(p_pin), 'sha256'), 'hex'), p_success);
$$;

create or replace function public.create_app_session(p_role text, p_company_id text, p_super_admin_id text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
begin
  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.app_sessions(token_hash, role, company_id, super_admin_id, expires_at)
  values (
    public.hash_session_token(v_token),
    p_role,
    p_company_id,
    p_super_admin_id,
    now() + interval '12 hours'
  );

  return v_token;
end;
$$;

create or replace function public.require_company_session(p_session_token text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id text;
begin
  select s.company_id into v_company_id
  from public.app_sessions s
  join public.companies c on c.id = s.company_id
  where s.token_hash = public.hash_session_token(p_session_token)
    and s.role = 'company'
    and s.revoked_at is null
    and s.expires_at > now()
    and c.active = true
  limit 1;

  if v_company_id is null then
    raise exception 'Invalid company session';
  end if;

  return v_company_id;
end;
$$;

create or replace function public.require_admin_session(p_session_token text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id text;
begin
  select s.super_admin_id into v_admin_id
  from public.app_sessions s
  join public.super_admins a on a.id = s.super_admin_id
  where s.token_hash = public.hash_session_token(p_session_token)
    and s.role = 'super_admin'
    and s.revoked_at is null
    and s.expires_at > now()
    and a.active = true
  limit 1;

  if v_admin_id is null then
    raise exception 'Invalid super admin session';
  end if;

  return v_admin_id;
end;
$$;

create or replace function public.has_valid_catalog_session(p_session_token text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_sessions s
    left join public.companies c on c.id = s.company_id and s.role = 'company'
    left join public.super_admins a on a.id = s.super_admin_id and s.role = 'super_admin'
    where s.token_hash = public.hash_session_token(p_session_token)
      and s.revoked_at is null
      and s.expires_at > now()
      and ((s.role = 'company' and c.active = true) or (s.role = 'super_admin' and a.active = true))
  );
$$;

create or replace function public.verify_company_pin(p_pin text)
returns table (
  session_token text,
  id text,
  name text,
  cif text,
  email text,
  phone text,
  contact_person text,
  delivery_address text,
  pin text,
  pin_hint text,
  active boolean,
  created_at timestamptz,
  notes text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pin text := public.normalize_pin(p_pin);
  v_company public.companies%rowtype;
  v_token text;
begin
  if length(v_pin) <> 6 or public.pin_is_limited('company', v_pin) then
    perform public.record_pin_attempt('company', v_pin, false);
    return;
  end if;

  select * into v_company
  from public.companies c
  where c.active = true
    and c.pin = v_pin
  limit 1;

  if not found then
    perform public.record_pin_attempt('company', v_pin, false);
    return;
  end if;

  perform public.record_pin_attempt('company', v_pin, true);
  v_token := public.create_app_session('company', v_company.id, null);

  return query select
    v_token,
    v_company.id,
    v_company.name,
    v_company.cif,
    v_company.email,
    v_company.phone,
    v_company.contact_person,
    v_company.delivery_address,
    v_company.pin,
    right(v_company.pin, 2),
    v_company.active,
    v_company.created_at,
    v_company.notes;
end;
$$;

create or replace function public.verify_super_admin_pin(p_pin text)
returns table (
  session_token text,
  id text,
  name text,
  email text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pin text := public.normalize_pin(p_pin);
  v_admin public.super_admins%rowtype;
  v_token text;
begin
  if length(v_pin) <> 6 or public.pin_is_limited('super_admin', v_pin) then
    perform public.record_pin_attempt('super_admin', v_pin, false);
    return;
  end if;

  select * into v_admin
  from public.super_admins a
  where a.active = true
    and a.pin = v_pin
  limit 1;

  if not found then
    perform public.record_pin_attempt('super_admin', v_pin, false);
    return;
  end if;

  perform public.record_pin_attempt('super_admin', v_pin, true);
  v_token := public.create_app_session('super_admin', null, v_admin.id);

  return query select v_token, v_admin.id, v_admin.name, v_admin.email;
end;
$$;

create or replace function public.validate_company_session(p_session_token text)
returns table (
  id text,
  name text,
  cif text,
  email text,
  phone text,
  contact_person text,
  delivery_address text,
  pin text,
  pin_hint text,
  active boolean,
  created_at timestamptz,
  notes text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id text;
begin
  v_company_id := public.require_company_session(p_session_token);

  return query
  select c.id, c.name, c.cif, c.email, c.phone, c.contact_person, c.delivery_address,
         c.pin, right(c.pin, 2), c.active, c.created_at, c.notes
  from public.companies c
  where c.id = v_company_id;
end;
$$;

create or replace function public.validate_super_admin_session(p_session_token text)
returns table (
  id text,
  name text,
  email text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id text;
begin
  v_admin_id := public.require_admin_session(p_session_token);

  return query
  select a.id, a.name, a.email
  from public.super_admins a
  where a.id = v_admin_id;
end;
$$;

create or replace function public.list_admin_companies(p_admin_token text)
returns table (
  id text,
  name text,
  cif text,
  email text,
  phone text,
  contact_person text,
  delivery_address text,
  pin text,
  pin_hint text,
  active boolean,
  created_at timestamptz,
  notes text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_admin_session(p_admin_token);

  return query
  select c.id, c.name, c.cif, c.email, c.phone, c.contact_person, c.delivery_address,
         c.pin, right(c.pin, 2), c.active, c.created_at, c.notes
  from public.companies c
  order by c.name;
end;
$$;

create or replace function public.company_pin_exists(p_pin text, p_current_company_id text default null)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.companies c
    where (p_current_company_id is null or c.id <> p_current_company_id)
      and c.pin = public.normalize_pin(p_pin)
  );
$$;

create or replace function public.admin_create_company(p_admin_token text, p_company jsonb, p_pin text default null)
returns table (
  id text,
  name text,
  cif text,
  email text,
  phone text,
  contact_person text,
  delivery_address text,
  pin text,
  pin_hint text,
  active boolean,
  created_at timestamptz,
  notes text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text := coalesce(nullif(p_company->>'id', ''), 'comp-' || gen_random_uuid()::text);
  v_pin text := public.normalize_pin(coalesce(p_pin, ''));
  v_attempt integer := 0;
begin
  perform public.require_admin_session(p_admin_token);

  if nullif(trim(coalesce(p_company->>'name', '')), '') is null then
    raise exception 'Company name is required';
  end if;

  while length(v_pin) <> 6 or public.company_pin_exists(v_pin, null) loop
    v_pin := lpad(floor(random() * 1000000)::int::text, 6, '0');
    v_attempt := v_attempt + 1;
    if v_attempt > 30 then
      raise exception 'Could not generate a unique PIN';
    end if;
  end loop;

  insert into public.companies (
    id, name, cif, email, phone, contact_person, delivery_address,
    pin, active, notes, created_at
  )
  values (
    v_id,
    trim(p_company->>'name'),
    coalesce(p_company->>'cif', ''),
    coalesce(p_company->>'email', ''),
    coalesce(p_company->>'phone', ''),
    coalesce(p_company->>'contact_person', ''),
    coalesce(p_company->>'delivery_address', ''),
    v_pin,
    coalesce((p_company->>'active')::boolean, true),
    nullif(p_company->>'notes', ''),
    now()
  )
  on conflict on constraint companies_pkey do update set
    name = excluded.name,
    cif = excluded.cif,
    email = excluded.email,
    phone = excluded.phone,
    contact_person = excluded.contact_person,
    delivery_address = excluded.delivery_address,
    pin = excluded.pin,
    active = excluded.active,
    notes = excluded.notes;

  return query
  select c.id, c.name, c.cif, c.email, c.phone, c.contact_person, c.delivery_address,
         c.pin, right(c.pin, 2), c.active, c.created_at, c.notes
  from public.companies c
  where c.id = v_id;
end;
$$;

create or replace function public.admin_update_company(p_admin_token text, p_company_id text, p_updates jsonb, p_pin text default null)
returns table (
  id text,
  name text,
  cif text,
  email text,
  phone text,
  contact_person text,
  delivery_address text,
  pin text,
  pin_hint text,
  active boolean,
  created_at timestamptz,
  notes text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pin text := public.normalize_pin(coalesce(p_pin, ''));
begin
  perform public.require_admin_session(p_admin_token);

  if not exists (select 1 from public.companies where companies.id = p_company_id) then
    raise exception 'Company not found';
  end if;

  update public.companies c
  set
    name = coalesce(nullif(trim(p_updates->>'name'), ''), c.name),
    cif = coalesce(p_updates->>'cif', c.cif),
    email = coalesce(p_updates->>'email', c.email),
    phone = coalesce(p_updates->>'phone', c.phone),
    contact_person = coalesce(p_updates->>'contact_person', c.contact_person),
    delivery_address = coalesce(p_updates->>'delivery_address', c.delivery_address),
    active = case when p_updates ? 'active' then (p_updates->>'active')::boolean else c.active end,
    notes = case when p_updates ? 'notes' then nullif(p_updates->>'notes', '') else c.notes end
  where c.id = p_company_id;

  if length(v_pin) = 6 then
    if public.company_pin_exists(v_pin, p_company_id) then
      raise exception 'PIN already assigned to another company';
    end if;

    update public.companies
    set pin = v_pin
    where companies.id = p_company_id;
  else
    v_pin := null;
  end if;

  return query
  select c.id, c.name, c.cif, c.email, c.phone, c.contact_person, c.delivery_address,
         c.pin, right(c.pin, 2), c.active, c.created_at, c.notes
  from public.companies c
  where c.id = p_company_id;
end;
$$;

create or replace function public.admin_delete_company(p_admin_token text, p_company_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_admin_session(p_admin_token);
  delete from public.companies where id = p_company_id;
end;
$$;

create or replace function public.get_catalog(p_session_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_valid_catalog_session(p_session_token) then
    raise exception 'Invalid catalog session';
  end if;

  return jsonb_build_object(
    'categories', coalesce((select jsonb_agg(to_jsonb(c)) from (select * from public.categories order by sort_order) c), '[]'::jsonb),
    'subcategories', coalesce((select jsonb_agg(to_jsonb(s)) from (select * from public.subcategories order by sort_order) s), '[]'::jsonb),
    'products', coalesce((select jsonb_agg(to_jsonb(p)) from (select * from public.products order by name) p), '[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_upsert_product(p_admin_token text, p_product jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text := coalesce(nullif(p_product->>'id', ''), 'prod-' || gen_random_uuid()::text);
  v_row public.products%rowtype;
begin
  perform public.require_admin_session(p_admin_token);

  insert into public.products (
    id, sku, name, category_id, subcategory_id, category_name, subcategory_name,
    price, stock, description, brand, unit_measure, units_per_box, image_url,
    weight_kg, iva, active
  )
  values (
    v_id,
    p_product->>'sku',
    p_product->>'name',
    p_product->>'category_id',
    nullif(p_product->>'subcategory_id', ''),
    nullif(p_product->>'category_name', ''),
    nullif(p_product->>'subcategory_name', ''),
    coalesce((p_product->>'price')::numeric, 0),
    coalesce((p_product->>'stock')::integer, 0),
    nullif(p_product->>'description', ''),
    nullif(p_product->>'brand', ''),
    nullif(p_product->>'unit_measure', ''),
    nullif(p_product->>'units_per_box', '')::integer,
    nullif(p_product->>'image_url', ''),
    nullif(p_product->>'weight_kg', '')::numeric,
    coalesce((p_product->>'iva')::numeric, 21),
    coalesce((p_product->>'active')::boolean, true)
  )
  on conflict on constraint products_pkey do update set
    sku = excluded.sku,
    name = excluded.name,
    category_id = excluded.category_id,
    subcategory_id = excluded.subcategory_id,
    category_name = excluded.category_name,
    subcategory_name = excluded.subcategory_name,
    price = excluded.price,
    stock = excluded.stock,
    description = excluded.description,
    brand = excluded.brand,
    unit_measure = excluded.unit_measure,
    units_per_box = excluded.units_per_box,
    image_url = excluded.image_url,
    weight_kg = excluded.weight_kg,
    iva = excluded.iva,
    active = excluded.active;

  select * into v_row from public.products where id = v_id;
  return to_jsonb(v_row);
end;
$$;

create or replace function public.admin_delete_product(p_admin_token text, p_product_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_admin_session(p_admin_token);
  delete from public.products where id = p_product_id;
end;
$$;

create or replace function public.admin_upsert_category(p_admin_token text, p_category jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text := coalesce(nullif(p_category->>'id', ''), 'cat-' || gen_random_uuid()::text);
  v_row public.categories%rowtype;
begin
  perform public.require_admin_session(p_admin_token);

  insert into public.categories(id, name, key, icon, sort_order, active)
  values (
    v_id,
    p_category->>'name',
    p_category->>'key',
    coalesce(nullif(p_category->>'icon', ''), 'package'),
    coalesce((p_category->>'sort_order')::integer, 0),
    coalesce((p_category->>'active')::boolean, true)
  )
  on conflict on constraint categories_pkey do update set
    name = excluded.name,
    key = excluded.key,
    icon = excluded.icon,
    sort_order = excluded.sort_order,
    active = excluded.active;

  select * into v_row from public.categories where id = v_id;
  return to_jsonb(v_row);
end;
$$;

create or replace function public.admin_delete_category(p_admin_token text, p_category_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_admin_session(p_admin_token);
  delete from public.categories where id = p_category_id;
end;
$$;

create or replace function public.admin_upsert_subcategory(p_admin_token text, p_subcategory jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text := coalesce(nullif(p_subcategory->>'id', ''), 'sub-' || gen_random_uuid()::text);
  v_row public.subcategories%rowtype;
begin
  perform public.require_admin_session(p_admin_token);

  insert into public.subcategories(id, category_id, name, key, sort_order, active)
  values (
    v_id,
    p_subcategory->>'category_id',
    p_subcategory->>'name',
    p_subcategory->>'key',
    coalesce((p_subcategory->>'sort_order')::integer, 0),
    coalesce((p_subcategory->>'active')::boolean, true)
  )
  on conflict on constraint subcategories_pkey do update set
    category_id = excluded.category_id,
    name = excluded.name,
    key = excluded.key,
    sort_order = excluded.sort_order,
    active = excluded.active;

  select * into v_row from public.subcategories where id = v_id;
  return to_jsonb(v_row);
end;
$$;

create or replace function public.admin_delete_subcategory(p_admin_token text, p_subcategory_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_admin_session(p_admin_token);
  delete from public.subcategories where id = p_subcategory_id;
end;
$$;

create or replace function public.order_with_items_json(p_order_id text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select to_jsonb(o) || jsonb_build_object(
    'order_items',
    coalesce((
      select jsonb_agg(to_jsonb(i) order by i.name)
      from public.order_items i
      where i.order_id = o.id
    ), '[]'::jsonb)
  )
  from public.orders o
  where o.id = p_order_id;
$$;

create or replace function public.create_order(p_company_token text, p_order jsonb, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id text;
  v_company public.companies%rowtype;
  v_order_id text := coalesce(nullif(p_order->>'id', ''), 'ord-' || gen_random_uuid()::text);
  v_public_order_id text := coalesce(nullif(p_order->>'order_id', ''), 'PED-' || to_char(now(), 'YYYY') || '-' || lpad(floor(random() * 100000)::int::text, 5, '0'));
  v_item jsonb;
  v_product public.products%rowtype;
  v_quantity integer;
  v_total numeric := 0;
  v_lines integer := 0;
begin
  v_company_id := public.require_company_session(p_company_token);
  select * into v_company from public.companies where id = v_company_id;

  insert into public.orders (
    id, order_id, company_id, company_name, company_cif, company_email,
    company_phone, contact_person, delivery_address, total_items, total_amount,
    notes, status, created_at, estimated_delivery
  )
  values (
    v_order_id, v_public_order_id, v_company.id, v_company.name, v_company.cif,
    v_company.email, v_company.phone, v_company.contact_person,
    v_company.delivery_address, 0, 0, nullif(p_order->>'notes', ''),
    'authorization_pending', now(), coalesce(nullif(p_order->>'estimated_delivery', '')::date, current_date + 3)
  );

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    v_quantity := greatest(coalesce((v_item->>'quantity')::integer, 0), 0);
    if v_quantity <= 0 then
      continue;
    end if;

    select * into v_product
    from public.products
    where id = v_item->>'product_id' and active = true
    for update;

    if not found then
      raise exception 'Product not found: %', v_item->>'product_id';
    end if;

    if v_product.stock < v_quantity then
      raise exception 'Insufficient stock for %', v_product.name;
    end if;

    update public.products
    set stock = stock - v_quantity
    where id = v_product.id;

    insert into public.order_items (
      order_id, product_id, sku, name, category_name, quantity, unit_price, subtotal
    )
    values (
      v_order_id, v_product.id, v_product.sku, v_product.name,
      coalesce(v_product.category_name, ''), v_quantity, v_product.price,
      round((v_product.price * v_quantity)::numeric, 2)
    );

    v_total := v_total + (v_product.price * v_quantity);
    v_lines := v_lines + 1;
  end loop;

  if v_lines = 0 then
    raise exception 'Order requires at least one item';
  end if;

  update public.orders
  set total_items = v_lines,
      total_amount = round(v_total, 2)
  where id = v_order_id;

  return public.order_with_items_json(v_order_id);
end;
$$;

create or replace function public.list_admin_orders(p_admin_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_admin_session(p_admin_token);

  return coalesce((
    select jsonb_agg(public.order_with_items_json(o.id) order by o.created_at desc)
    from public.orders o
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_update_order_status(p_admin_token text, p_order_id text, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_admin_session(p_admin_token);

  if p_status not in ('pending', 'authorization_pending', 'accepted', 'accepted_modified', 'rejected', 'processing', 'completed', 'cancelled') then
    raise exception 'Invalid order status';
  end if;

  update public.orders
  set status = p_status
  where id = p_order_id;

  return public.order_with_items_json(p_order_id);
end;
$$;

create or replace function public.admin_update_order_with_item_decisions(p_admin_token text, p_order_id text, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_availability text;
begin
  perform public.require_admin_session(p_admin_token);

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    v_availability := coalesce(nullif(v_item->>'availability_status', ''), 'available');

    if v_availability not in ('available', 'unavailable') then
      raise exception 'Invalid item availability status';
    end if;

    update public.order_items
    set availability_status = v_availability,
        admin_note = nullif(v_item->>'admin_note', '')
    where order_id = p_order_id
      and product_id = v_item->>'product_id';
  end loop;

  update public.orders
  set status = 'accepted_modified'
  where id = p_order_id;

  return public.order_with_items_json(p_order_id);
end;
$$;

alter table public.super_admins enable row level security;
alter table public.companies enable row level security;
alter table public.categories enable row level security;
alter table public.subcategories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.app_sessions enable row level security;
alter table public.pin_attempts enable row level security;

revoke all on public.super_admins from anon, authenticated;
revoke all on public.companies from anon, authenticated;
revoke all on public.categories from anon, authenticated;
revoke all on public.subcategories from anon, authenticated;
revoke all on public.products from anon, authenticated;
revoke all on public.orders from anon, authenticated;
revoke all on public.order_items from anon, authenticated;
revoke all on public.app_sessions from anon, authenticated;
revoke all on public.pin_attempts from anon, authenticated;

grant usage on schema public to anon, authenticated;
grant execute on function public.verify_company_pin(text) to anon, authenticated;
grant execute on function public.verify_super_admin_pin(text) to anon, authenticated;
grant execute on function public.validate_company_session(text) to anon, authenticated;
grant execute on function public.validate_super_admin_session(text) to anon, authenticated;
grant execute on function public.list_admin_companies(text) to anon, authenticated;
grant execute on function public.admin_create_company(text, jsonb, text) to anon, authenticated;
grant execute on function public.admin_update_company(text, text, jsonb, text) to anon, authenticated;
grant execute on function public.admin_delete_company(text, text) to anon, authenticated;
grant execute on function public.get_catalog(text) to anon, authenticated;
grant execute on function public.admin_upsert_product(text, jsonb) to anon, authenticated;
grant execute on function public.admin_delete_product(text, text) to anon, authenticated;
grant execute on function public.admin_upsert_category(text, jsonb) to anon, authenticated;
grant execute on function public.admin_delete_category(text, text) to anon, authenticated;
grant execute on function public.admin_upsert_subcategory(text, jsonb) to anon, authenticated;
grant execute on function public.admin_delete_subcategory(text, text) to anon, authenticated;
grant execute on function public.create_order(text, jsonb, jsonb) to anon, authenticated;
grant execute on function public.list_admin_orders(text) to anon, authenticated;
grant execute on function public.admin_update_order_status(text, text, text) to anon, authenticated;
grant execute on function public.admin_update_order_with_item_decisions(text, text, jsonb) to anon, authenticated;
