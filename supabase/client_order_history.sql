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
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.list_company_orders(text) from public;
grant execute on function public.list_company_orders(text) to anon, authenticated;
