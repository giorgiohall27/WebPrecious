drop function if exists public.list_active_promotions();

create or replace function public.list_active_promotions(p_session_token text)
returns table (
  product_id text,
  promo_price numeric,
  active boolean,
  starts_at timestamptz,
  ends_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_valid_catalog_session(p_session_token) then
    raise exception 'Invalid catalog session';
  end if;

  return query
  select p.product_id, p.promo_price, p.active, p.starts_at, p.ends_at
  from public.promotions p
  where p.active = true
    and p.starts_at <= now()
    and p.ends_at > now()
  order by p.updated_at desc;
end;
$$;

grant execute on function public.list_active_promotions(text) to anon, authenticated;
