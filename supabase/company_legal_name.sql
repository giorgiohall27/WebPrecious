-- Add the fiscal/legal name used by Super Admin > Clientes.
alter table public.companies add column if not exists legal_name text not null default '';

drop function if exists public.list_admin_companies(text);
create function public.list_admin_companies(p_admin_token text)
returns table (
  id text, legal_name text, name text, cif text, email text, phone text,
  contact_person text, delivery_address text, pin text, pin_hint text,
  active boolean, created_at timestamptz, notes text
)
language plpgsql security definer set search_path = public
as $$
begin
  perform public.require_admin_session(p_admin_token);
  return query
  select c.id, c.legal_name, c.name, c.cif, c.email, c.phone, c.contact_person,
         c.delivery_address, c.pin, right(c.pin, 2), c.active, c.created_at, c.notes
  from public.companies c order by c.name;
end;
$$;

drop function if exists public.admin_create_company(text, jsonb, text);
create function public.admin_create_company(p_admin_token text, p_company jsonb, p_pin text default null)
returns table (
  id text, legal_name text, name text, cif text, email text, phone text,
  contact_person text, delivery_address text, pin text, pin_hint text,
  active boolean, created_at timestamptz, notes text
)
language plpgsql security definer set search_path = public
as $$
declare
  v_id text := coalesce(nullif(p_company->>'id', ''), 'comp-' || gen_random_uuid()::text);
  v_pin text := public.normalize_pin(coalesce(p_pin, ''));
  v_attempt integer := 0;
begin
  perform public.require_admin_session(p_admin_token);
  if nullif(trim(coalesce(p_company->>'legal_name', '')), '') is null then raise exception 'Legal name is required'; end if;
  if nullif(trim(coalesce(p_company->>'name', '')), '') is null then raise exception 'Company name is required'; end if;
  while length(v_pin) <> 6 or public.company_pin_exists(v_pin, null) loop
    v_pin := lpad(floor(random() * 1000000)::int::text, 6, '0');
    v_attempt := v_attempt + 1;
    if v_attempt > 30 then raise exception 'Could not generate a unique PIN'; end if;
  end loop;

  insert into public.companies (
    id, legal_name, name, cif, email, phone, contact_person, delivery_address,
    pin, active, notes, created_at
  ) values (
    v_id, trim(p_company->>'legal_name'), trim(p_company->>'name'),
    coalesce(p_company->>'cif', ''), coalesce(p_company->>'email', ''),
    coalesce(p_company->>'phone', ''), coalesce(p_company->>'contact_person', ''),
    coalesce(p_company->>'delivery_address', ''), v_pin,
    coalesce((p_company->>'active')::boolean, true), nullif(p_company->>'notes', ''), now()
  );

  return query select c.id, c.legal_name, c.name, c.cif, c.email, c.phone,
    c.contact_person, c.delivery_address, c.pin, right(c.pin, 2), c.active, c.created_at, c.notes
  from public.companies c where c.id = v_id;
end;
$$;

drop function if exists public.admin_update_company(text, text, jsonb, text);
create function public.admin_update_company(p_admin_token text, p_company_id text, p_updates jsonb, p_pin text default null)
returns table (
  id text, legal_name text, name text, cif text, email text, phone text,
  contact_person text, delivery_address text, pin text, pin_hint text,
  active boolean, created_at timestamptz, notes text
)
language plpgsql security definer set search_path = public
as $$
declare v_pin text := public.normalize_pin(coalesce(p_pin, ''));
begin
  perform public.require_admin_session(p_admin_token);
  update public.companies c set
    legal_name = coalesce(nullif(trim(p_updates->>'legal_name'), ''), c.legal_name),
    name = coalesce(nullif(trim(p_updates->>'name'), ''), c.name),
    cif = coalesce(p_updates->>'cif', c.cif), email = coalesce(p_updates->>'email', c.email),
    phone = coalesce(p_updates->>'phone', c.phone),
    contact_person = coalesce(p_updates->>'contact_person', c.contact_person),
    delivery_address = coalesce(p_updates->>'delivery_address', c.delivery_address),
    active = case when p_updates ? 'active' then (p_updates->>'active')::boolean else c.active end,
    notes = case when p_updates ? 'notes' then nullif(p_updates->>'notes', '') else c.notes end
  where c.id = p_company_id;
  if not found then raise exception 'Company not found'; end if;

  if length(v_pin) = 6 then
    if public.company_pin_exists(v_pin, p_company_id) then raise exception 'PIN already assigned to another company'; end if;
    update public.companies set pin = v_pin where companies.id = p_company_id;
  end if;

  return query select c.id, c.legal_name, c.name, c.cif, c.email, c.phone,
    c.contact_person, c.delivery_address, c.pin, right(c.pin, 2), c.active, c.created_at, c.notes
  from public.companies c where c.id = p_company_id;
end;
$$;

grant execute on function public.list_admin_companies(text) to anon, authenticated;
grant execute on function public.admin_create_company(text, jsonb, text) to anon, authenticated;
grant execute on function public.admin_update_company(text, text, jsonb, text) to anon, authenticated;
