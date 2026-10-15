-- Keep the order tables bounded to the retention period requested for the
-- customer and supplier portals. order_items are removed by ON DELETE CASCADE.
delete from public.orders
where created_at < now() - interval '2 months';

create or replace function public.prune_expired_orders()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.orders
  where created_at < now() - interval '2 months';
  return null;
end;
$$;

drop trigger if exists prune_expired_orders_before_insert on public.orders;
create trigger prune_expired_orders_before_insert
before insert on public.orders
for each statement
execute function public.prune_expired_orders();

create or replace function public.list_company_orders(p_company_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id text;
begin
  v_company_id := public.require_company_session(p_company_token);

  return coalesce((
    select jsonb_agg(public.order_with_items_json(o.id) order by o.created_at desc)
    from public.orders o
    where o.company_id = v_company_id
      and o.created_at >= now() - interval '2 months'
  ), '[]'::jsonb);
end;
$$;

create or replace function public.list_supplier_orders(p_supplier_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_supplier_id text;
begin
  v_supplier_id := public.require_supplier_session(p_supplier_token);

  return coalesce((
    select jsonb_agg(public.order_with_items_json(o.id) order by o.created_at desc)
    from public.orders o
    where o.supplier_id = v_supplier_id
      and o.created_at >= now() - interval '2 months'
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.list_company_orders(text) from public;
revoke all on function public.list_supplier_orders(text) from public;
grant execute on function public.list_company_orders(text) to anon, authenticated;
grant execute on function public.list_supplier_orders(text) to anon, authenticated;
revoke all on function public.prune_expired_orders() from public;
