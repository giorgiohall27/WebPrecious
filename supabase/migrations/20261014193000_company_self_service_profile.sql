alter table public.companies
  add column if not exists legal_name text not null default '';

update public.companies
set legal_name = name
where trim(legal_name) = '';

create or replace function public.update_company_profile(p_company_token text, p_updates jsonb)
returns table (
  id text,
  legal_name text,
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
  v_company_id := public.require_company_session(p_company_token);

  update public.companies c
  set
    legal_name = coalesce(nullif(trim(p_updates->>'legal_name'), ''), c.legal_name),
    name = coalesce(nullif(trim(p_updates->>'name'), ''), c.name),
    cif = coalesce(p_updates->>'cif', c.cif),
    email = coalesce(p_updates->>'email', c.email),
    phone = coalesce(p_updates->>'phone', c.phone),
    contact_person = coalesce(p_updates->>'contact_person', c.contact_person),
    delivery_address = coalesce(p_updates->>'delivery_address', c.delivery_address)
  where c.id = v_company_id;

  return query
  select c.id, c.legal_name, c.name, c.cif, c.email, c.phone, c.contact_person,
         c.delivery_address, ''::text, right(c.pin, 2), c.active, c.created_at, c.notes
  from public.companies c
  where c.id = v_company_id;
end;
$$;

revoke all on function public.update_company_profile(text, jsonb) from public;
grant execute on function public.update_company_profile(text, jsonb) to anon, authenticated;

create or replace function public.get_company_profile(p_company_token text)
returns table (
  id text,
  legal_name text,
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
language sql
security definer
set search_path = public
as $$
  select c.id, c.legal_name, c.name, c.cif, c.email, c.phone, c.contact_person,
         c.delivery_address, ''::text, right(c.pin, 2), c.active, c.created_at, c.notes
  from public.companies c
  where c.id = public.require_company_session(p_company_token);
$$;

revoke all on function public.get_company_profile(text) from public;
grant execute on function public.get_company_profile(text) to anon, authenticated;
