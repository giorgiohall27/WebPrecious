-- Correct order totals and persist all data required by order emails.
alter table public.order_items add column if not exists brand text default '';
alter table public.order_items add column if not exists units_per_box integer not null default 1;
alter table public.order_items add column if not exists iva numeric(5, 2) not null default 0;

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
  v_boxes integer;
  v_units_per_box integer;
  v_stock_units integer;
  v_box_price numeric;
  v_line_total numeric;
  v_total numeric := 0;
  v_lines integer := 0;
begin
  v_company_id := public.require_company_session(p_company_token);
  select * into v_company from public.companies where id = v_company_id;

  insert into public.orders (
    id, order_id, company_id, company_name, company_cif, company_email,
    company_phone, contact_person, delivery_address, total_items, total_amount,
    notes, status, created_at, estimated_delivery
  ) values (
    v_order_id, v_public_order_id, v_company.id, v_company.name, v_company.cif,
    v_company.email, v_company.phone, v_company.contact_person, v_company.delivery_address,
    0, 0, nullif(p_order->>'notes', ''), 'authorization_pending', now(),
    coalesce(nullif(p_order->>'estimated_delivery', '')::date, current_date + 3)
  );

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    v_boxes := greatest(coalesce((v_item->>'quantity')::integer, 0), 0);
    if v_boxes <= 0 then continue; end if;

    select * into v_product from public.products
    where id = v_item->>'product_id' and active = true for update;
    if not found then raise exception 'Product not found: %', v_item->>'product_id'; end if;

    v_units_per_box := greatest(coalesce(v_product.units_per_box, 1), 1);
    v_stock_units := v_boxes * v_units_per_box;
    if v_product.stock < v_stock_units then raise exception 'Insufficient stock for %', v_product.name; end if;

    -- The frontend sends price per box so active promotional prices are preserved.
    v_box_price := greatest(coalesce((v_item->>'unit_price')::numeric, v_product.price * v_units_per_box), 0);
    v_line_total := round((v_box_price * v_boxes * (1 + coalesce(v_product.iva, 0) / 100.0))::numeric, 2);

    update public.products set stock = stock - v_stock_units where id = v_product.id;
    insert into public.order_items (
      order_id, product_id, sku, brand, name, category_name, quantity,
      unit_price, units_per_box, iva, subtotal
    ) values (
      v_order_id, v_product.id, v_product.sku, coalesce(v_product.brand, ''), v_product.name,
      coalesce(v_product.category_name, ''), v_boxes, v_box_price, v_units_per_box,
      coalesce(v_product.iva, 0), v_line_total
    );
    v_total := v_total + v_line_total;
    v_lines := v_lines + 1;
  end loop;

  if v_lines = 0 then raise exception 'Order requires at least one item'; end if;
  update public.orders set total_items = v_lines, total_amount = round(v_total, 2) where id = v_order_id;
  return public.order_with_items_json(v_order_id);
end;
$$;

create or replace function public.admin_create_preorder(
  p_admin_token text, p_company_id text, p_order jsonb, p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company public.companies%rowtype;
  v_order_id text := coalesce(nullif(p_order->>'id', ''), 'preorder-' || gen_random_uuid()::text);
  v_public_order_id text := coalesce(nullif(p_order->>'order_id', ''), 'PRE-' || to_char(now(), 'YYYY') || '-' || lpad(floor(random() * 100000)::int::text, 5, '0'));
  v_item jsonb;
  v_product public.products%rowtype;
  v_boxes integer;
  v_box_price numeric;
  v_units_per_box integer;
  v_line_total numeric;
  v_total numeric := 0;
  v_lines integer := 0;
begin
  perform public.require_admin_session(p_admin_token);
  select * into v_company from public.companies where id = p_company_id and active = true;
  if not found then raise exception 'Active company not found'; end if;

  insert into public.orders (
    id, order_id, company_id, company_name, company_cif, company_email,
    company_phone, contact_person, delivery_address, total_items, total_amount,
    notes, status, created_at, estimated_delivery
  ) values (
    v_order_id, v_public_order_id, v_company.id, v_company.name, v_company.cif,
    v_company.email, v_company.phone, v_company.contact_person, v_company.delivery_address,
    0, 0, nullif(p_order->>'notes', ''), 'pending', now(),
    coalesce(nullif(p_order->>'estimated_delivery', '')::date, current_date + 3)
  );

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    v_boxes := greatest(coalesce((v_item->>'quantity')::integer, 0), 0);
    if v_boxes <= 0 then continue; end if;
    select * into v_product from public.products where id = v_item->>'product_id' and active = true;
    if not found then raise exception 'Product not found: %', v_item->>'product_id'; end if;

    v_units_per_box := greatest(coalesce(v_product.units_per_box, 1), 1);
    v_box_price := greatest(coalesce((v_item->>'unit_price')::numeric, v_product.price * v_units_per_box), 0);
    v_line_total := round((v_box_price * v_boxes * (1 + coalesce(v_product.iva, 0) / 100.0))::numeric, 2);
    insert into public.order_items (
      order_id, product_id, sku, brand, name, category_name, quantity,
      unit_price, units_per_box, iva, subtotal
    ) values (
      v_order_id, v_product.id, v_product.sku, coalesce(v_product.brand, ''), v_product.name,
      coalesce(v_product.category_name, ''), v_boxes, v_box_price, v_units_per_box,
      coalesce(v_product.iva, 0), v_line_total
    );
    v_total := v_total + v_line_total;
    v_lines := v_lines + 1;
  end loop;

  if v_lines = 0 then raise exception 'Preorder requires at least one item'; end if;
  update public.orders set total_items = v_lines, total_amount = round(v_total, 2) where id = v_order_id;
  return public.order_with_items_json(v_order_id);
end;
$$;

grant execute on function public.create_order(text, jsonb, jsonb) to anon, authenticated;
grant execute on function public.admin_create_preorder(text, text, jsonb, jsonb) to anon, authenticated;
