alter table public.orders
  drop constraint if exists orders_status_check;

alter table public.orders
  add constraint orders_status_check
  check (status in ('pending', 'authorization_pending', 'accepted', 'accepted_modified', 'rejected', 'processing', 'completed', 'cancelled'));

alter table public.order_items
  add column if not exists availability_status text not null default 'available';

alter table public.order_items
  add column if not exists admin_note text;

alter table public.order_items
  drop constraint if exists order_items_availability_status_check;

alter table public.order_items
  add constraint order_items_availability_status_check
  check (availability_status in ('available', 'unavailable'));

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

grant execute on function public.admin_update_order_status(text, text, text) to anon, authenticated;
grant execute on function public.admin_update_order_with_item_decisions(text, text, jsonb) to anon, authenticated;
