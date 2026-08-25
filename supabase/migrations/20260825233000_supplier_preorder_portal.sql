create table if not exists public.suppliers (
  id text primary key,
  name text not null,
  email text default '',
  phone text default '',
  contact_person text default '',
  pin text not null unique check (pin ~ '^[0-9]{6}$'),
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_sessions add column if not exists supplier_id text references public.suppliers(id) on delete cascade;
alter table public.app_sessions drop constraint if exists app_sessions_role_check;
alter table public.app_sessions add constraint app_sessions_role_check check (role in ('company', 'super_admin', 'supplier'));

create or replace function public.require_supplier_session(p_session_token text)
returns text language plpgsql security definer set search_path = public as $$
declare v_supplier_id text;
begin
  select s.supplier_id into v_supplier_id
  from public.app_sessions s join public.suppliers p on p.id = s.supplier_id
  where s.token_hash = public.hash_session_token(p_session_token)
    and s.role = 'supplier' and s.revoked_at is null and s.expires_at > now() and p.active = true
  limit 1;
  if v_supplier_id is null then raise exception 'Invalid supplier session'; end if;
  return v_supplier_id;
end;
$$;

create or replace function public.verify_supplier_pin(p_pin text)
returns table (session_token text, id text, name text, email text, phone text, contact_person text, pin text, pin_hint text, active boolean, created_at timestamptz, notes text)
language plpgsql security definer set search_path = public as $$
declare v_pin text := public.normalize_pin(p_pin); v_supplier public.suppliers%rowtype; v_token text;
begin
  if length(v_pin) <> 6 or public.pin_is_limited('supplier', v_pin) then
    perform public.record_pin_attempt('supplier', v_pin, false); return;
  end if;
  select * into v_supplier from public.suppliers p where p.active = true and p.pin = v_pin limit 1;
  if not found then perform public.record_pin_attempt('supplier', v_pin, false); return; end if;
  perform public.record_pin_attempt('supplier', v_pin, true);
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.app_sessions(token_hash, role, supplier_id, expires_at)
  values (public.hash_session_token(v_token), 'supplier', v_supplier.id, now() + interval '12 hours');
  return query select v_token, v_supplier.id, v_supplier.name, v_supplier.email, v_supplier.phone,
    v_supplier.contact_person, v_supplier.pin, right(v_supplier.pin, 2), v_supplier.active, v_supplier.created_at, v_supplier.notes;
end;
$$;

create or replace function public.validate_supplier_session(p_session_token text)
returns table (id text, name text, email text, phone text, contact_person text, pin text, pin_hint text, active boolean, created_at timestamptz, notes text)
language sql security definer set search_path = public as $$
  select p.id, p.name, p.email, p.phone, p.contact_person, ''::text, right(p.pin, 2), p.active, p.created_at, p.notes
  from public.suppliers p where p.id = public.require_supplier_session(p_session_token);
$$;

create or replace function public.list_admin_suppliers(p_admin_token text)
returns table (id text, name text, email text, phone text, contact_person text, pin text, pin_hint text, active boolean, created_at timestamptz, notes text)
language sql security definer set search_path = public as $$
  select p.id, p.name, p.email, p.phone, p.contact_person, p.pin, right(p.pin, 2), p.active, p.created_at, p.notes
  from public.suppliers p where public.require_admin_session(p_admin_token) is not null order by p.created_at desc;
$$;

create or replace function public.admin_create_supplier(p_admin_token text, p_supplier jsonb, p_pin text)
returns setof public.suppliers language plpgsql security definer set search_path = public as $$
declare v_id text := coalesce(nullif(p_supplier->>'id', ''), 'supplier-' || gen_random_uuid()::text); v_pin text := public.normalize_pin(p_pin);
begin
  perform public.require_admin_session(p_admin_token);
  if length(v_pin) <> 6 then raise exception 'Supplier PIN must have 6 digits'; end if;
  insert into public.suppliers(id, name, email, phone, contact_person, pin, active, notes)
  values (v_id, p_supplier->>'name', coalesce(p_supplier->>'email',''), coalesce(p_supplier->>'phone',''), coalesce(p_supplier->>'contact_person',''), v_pin, coalesce((p_supplier->>'active')::boolean,true), nullif(p_supplier->>'notes',''));
  return query select * from public.suppliers where suppliers.id = v_id;
end;
$$;

create or replace function public.admin_update_supplier(p_admin_token text, p_supplier_id text, p_updates jsonb, p_pin text default null)
returns setof public.suppliers language plpgsql security definer set search_path = public as $$
declare v_pin text := public.normalize_pin(coalesce(p_pin,''));
begin
  perform public.require_admin_session(p_admin_token);
  update public.suppliers set
    name = coalesce(nullif(p_updates->>'name',''), name), email = coalesce(p_updates->>'email', email),
    phone = coalesce(p_updates->>'phone', phone), contact_person = coalesce(p_updates->>'contact_person', contact_person),
    active = coalesce((p_updates->>'active')::boolean, active), notes = coalesce(p_updates->>'notes', notes),
    pin = case when length(v_pin) = 6 then v_pin else pin end, updated_at = now()
  where id = p_supplier_id;
  return query select * from public.suppliers where suppliers.id = p_supplier_id;
end;
$$;

create or replace function public.admin_delete_supplier(p_admin_token text, p_supplier_id text)
returns void language plpgsql security definer set search_path = public as $$
begin perform public.require_admin_session(p_admin_token); delete from public.suppliers where id = p_supplier_id; end;
$$;

create or replace function public.list_supplier_companies(p_supplier_token text)
returns table (id text, name text, cif text, email text, phone text, contact_person text, delivery_address text, pin text, pin_hint text, active boolean, created_at timestamptz, notes text)
language sql security definer set search_path = public as $$
  select c.id, c.name, c.cif, c.email, c.phone, c.contact_person, c.delivery_address,
    ''::text, right(c.pin,2), c.active, c.created_at, c.notes
  from public.companies c where public.require_supplier_session(p_supplier_token) is not null and c.active = true order by c.name;
$$;

create or replace function public.has_valid_catalog_session(p_session_token text)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.app_sessions s
    left join public.companies c on c.id = s.company_id and s.role = 'company'
    left join public.super_admins a on a.id = s.super_admin_id and s.role = 'super_admin'
    left join public.suppliers p on p.id = s.supplier_id and s.role = 'supplier'
    where s.token_hash = public.hash_session_token(p_session_token) and s.revoked_at is null and s.expires_at > now()
      and ((s.role='company' and c.active) or (s.role='super_admin' and a.active) or (s.role='supplier' and p.active))
  );
$$;

create or replace function public.supplier_create_preorder(p_supplier_token text, p_company_id text, p_order jsonb, p_items jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_supplier_id text; v_company public.companies%rowtype; v_order_id text := coalesce(nullif(p_order->>'id',''), 'preorder-' || gen_random_uuid()::text);
  v_public_order_id text := coalesce(nullif(p_order->>'order_id',''), 'PRE-' || to_char(now(),'YYYY') || '-' || lpad(floor(random()*100000)::int::text,5,'0'));
  v_item jsonb; v_product public.products%rowtype; v_boxes integer; v_units integer; v_box_price numeric; v_line_total numeric; v_total numeric := 0; v_lines integer := 0;
begin
  v_supplier_id := public.require_supplier_session(p_supplier_token);
  select * into v_company from public.companies where id=p_company_id and active=true;
  if not found then raise exception 'Active company not found'; end if;
  insert into public.orders(id,order_id,company_id,company_name,company_cif,company_email,company_phone,contact_person,delivery_address,total_items,total_amount,notes,status,created_at,estimated_delivery)
  values(v_order_id,v_public_order_id,v_company.id,v_company.name,v_company.cif,v_company.email,v_company.phone,v_company.contact_person,v_company.delivery_address,0,0,nullif(p_order->>'notes',''),'pending',now(),coalesce(nullif(p_order->>'estimated_delivery','')::date,current_date+3));
  for v_item in select * from jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) loop
    v_boxes := greatest(coalesce((v_item->>'quantity')::integer,0),0); if v_boxes<=0 then continue; end if;
    select * into v_product from public.products where id=v_item->>'product_id' and active=true; if not found then raise exception 'Product not found'; end if;
    v_units := greatest(coalesce(v_product.units_per_box,1),1);
    v_box_price := greatest(coalesce((v_item->>'unit_price')::numeric,v_product.price*v_units),0);
    v_line_total := round((v_box_price*v_boxes*(1+coalesce(v_product.iva,0)/100.0))::numeric,2);
    insert into public.order_items(order_id,product_id,sku,brand,name,category_name,quantity,unit_price,units_per_box,iva,subtotal)
    values(v_order_id,v_product.id,v_product.sku,coalesce(v_product.brand,''),v_product.name,coalesce(v_product.category_name,''),v_boxes,v_box_price,v_units,coalesce(v_product.iva,0),v_line_total);
    v_total:=v_total+v_line_total; v_lines:=v_lines+1;
  end loop;
  if v_lines=0 then raise exception 'Preorder requires at least one item'; end if;
  update public.orders set total_items=v_lines,total_amount=round(v_total,2) where id=v_order_id;
  return public.order_with_items_json(v_order_id);
end;
$$;

alter table public.suppliers enable row level security;
revoke all on public.suppliers from anon, authenticated;
grant execute on function public.verify_supplier_pin(text) to anon, authenticated;
grant execute on function public.validate_supplier_session(text) to anon, authenticated;
grant execute on function public.list_admin_suppliers(text) to anon, authenticated;
grant execute on function public.admin_create_supplier(text,jsonb,text) to anon, authenticated;
grant execute on function public.admin_update_supplier(text,text,jsonb,text) to anon, authenticated;
grant execute on function public.admin_delete_supplier(text,text) to anon, authenticated;
grant execute on function public.list_supplier_companies(text) to anon, authenticated;
grant execute on function public.supplier_create_preorder(text,text,jsonb,jsonb) to anon, authenticated;
