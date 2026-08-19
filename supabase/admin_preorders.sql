-- Apply this migration in Supabase before using Super Admin > Preventa.
create or replace function public.admin_create_preorder(
  p_admin_token text,
  p_company_id text,
  p_order jsonb,
  p_items jsonb
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
  v_quantity integer;
  v_unit_price numeric;
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
    v_quantity := greatest(coalesce((v_item->>'quantity')::integer, 0), 0);
    if v_quantity <= 0 then continue; end if;
    select * into v_product from public.products where id = v_item->>'product_id' and active = true;
    if not found then raise exception 'Product not found: %', v_item->>'product_id'; end if;
    v_unit_price := greatest(coalesce((v_item->>'unit_price')::numeric, v_product.price), 0);

    insert into public.order_items (
      order_id, product_id, sku, name, category_name, quantity, unit_price, subtotal
    ) values (
      v_order_id, v_product.id, v_product.sku, v_product.name,
      coalesce(v_product.category_name, ''), v_quantity, v_unit_price,
      round((v_unit_price * v_quantity * (1 + coalesce(v_product.iva, 0) / 100.0))::numeric, 2)
    );
    v_total := v_total + (v_unit_price * v_quantity * (1 + coalesce(v_product.iva, 0) / 100.0));
    v_lines := v_lines + 1;
  end loop;

  if v_lines = 0 then raise exception 'Preorder requires at least one item'; end if;
  update public.orders set total_items = v_lines, total_amount = round(v_total, 2) where id = v_order_id;
  return public.order_with_items_json(v_order_id);
end;
$$;

grant execute on function public.admin_create_preorder(text, text, jsonb, jsonb) to anon, authenticated;
