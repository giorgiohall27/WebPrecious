-- A valid PIN must never be rejected because of stale failed attempts.
-- Check the credential first, clear its attempt history on success, and only
-- apply the limiter to PINs that do not belong to an active account.

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
  if length(v_pin) <> 6 then
    return;
  end if;

  select * into v_company
  from public.companies c
  where c.active = true and c.pin = v_pin
  limit 1;

  if found then
    delete from public.pin_attempts
    where scope = 'company'
      and pin_fingerprint = encode(extensions.digest(v_pin, 'sha256'), 'hex');

    v_token := public.create_app_session('company', v_company.id, null);
    return query select
      v_token, v_company.id, v_company.name, v_company.cif, v_company.email,
      v_company.phone, v_company.contact_person, v_company.delivery_address,
      v_company.pin, right(v_company.pin, 2), v_company.active,
      v_company.created_at, v_company.notes;
    return;
  end if;

  if not public.pin_is_limited('company', v_pin) then
    perform public.record_pin_attempt('company', v_pin, false);
  end if;
end;
$$;

create or replace function public.verify_super_admin_pin(p_pin text)
returns table (session_token text, id text, name text, email text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pin text := public.normalize_pin(p_pin);
  v_admin public.super_admins%rowtype;
  v_token text;
begin
  if length(v_pin) <> 6 then
    return;
  end if;

  select * into v_admin
  from public.super_admins a
  where a.active = true and a.pin = v_pin
  limit 1;

  if found then
    delete from public.pin_attempts
    where scope = 'super_admin'
      and pin_fingerprint = encode(extensions.digest(v_pin, 'sha256'), 'hex');

    v_token := public.create_app_session('super_admin', null, v_admin.id);
    return query select v_token, v_admin.id, v_admin.name, v_admin.email;
    return;
  end if;

  if not public.pin_is_limited('super_admin', v_pin) then
    perform public.record_pin_attempt('super_admin', v_pin, false);
  end if;
end;
$$;

create or replace function public.verify_supplier_pin(p_pin text)
returns table (
  session_token text,
  id text,
  name text,
  email text,
  phone text,
  contact_person text,
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
  v_supplier public.suppliers%rowtype;
  v_token text;
begin
  if length(v_pin) <> 6 then
    return;
  end if;

  select * into v_supplier
  from public.suppliers p
  where p.active = true and p.pin = v_pin
  limit 1;

  if found then
    delete from public.pin_attempts
    where scope = 'supplier'
      and pin_fingerprint = encode(extensions.digest(v_pin, 'sha256'), 'hex');

    v_token := encode(extensions.gen_random_bytes(32), 'hex');
    insert into public.app_sessions(token_hash, role, supplier_id, expires_at)
    values (public.hash_session_token(v_token), 'supplier', v_supplier.id, now() + interval '12 hours');

    return query select
      v_token, v_supplier.id, v_supplier.name, v_supplier.email,
      v_supplier.phone, v_supplier.contact_person, v_supplier.pin,
      right(v_supplier.pin, 2), v_supplier.active, v_supplier.created_at,
      v_supplier.notes;
    return;
  end if;

  if not public.pin_is_limited('supplier', v_pin) then
    perform public.record_pin_attempt('supplier', v_pin, false);
  end if;
end;
$$;
