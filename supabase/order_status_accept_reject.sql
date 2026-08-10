alter table public.orders drop constraint if exists orders_status_check;

alter table public.orders add constraint orders_status_check
  check (status in ('pending', 'authorization_pending', 'accepted', 'rejected', 'processing', 'completed', 'cancelled'));

create or replace function public.admin_update_order_status(p_admin_token text, p_order_id text, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_admin_session(p_admin_token);

  if p_status not in ('pending', 'authorization_pending', 'accepted', 'rejected', 'processing', 'completed', 'cancelled') then
    raise exception 'Invalid order status';
  end if;

  update public.orders
  set status = p_status
  where id = p_order_id;

  return public.order_with_items_json(p_order_id);
end;
$$;
