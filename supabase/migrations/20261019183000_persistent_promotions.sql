create table if not exists public.promotions (
  product_id text primary key references public.products(id) on delete cascade,
  promo_price numeric(12, 3) not null check (promo_price >= 0),
  active boolean not null default true,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists idx_promotions_active_dates
  on public.promotions(active, starts_at, ends_at);

drop trigger if exists set_promotions_updated_at on public.promotions;
create trigger set_promotions_updated_at
before update on public.promotions
for each row execute function public.set_updated_at();

create or replace function public.list_active_promotions()
returns table (
  product_id text,
  promo_price numeric,
  active boolean,
  starts_at timestamptz,
  ends_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select p.product_id, p.promo_price, p.active, p.starts_at, p.ends_at
  from public.promotions p
  where p.active = true
    and p.starts_at <= now()
    and p.ends_at > now()
  order by p.updated_at desc;
$$;

create or replace function public.admin_upsert_promotions(p_admin_token text, p_promotions jsonb)
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
declare
  v_promotion jsonb;
begin
  perform public.require_admin_session(p_admin_token);

  for v_promotion in
    select value from jsonb_array_elements(coalesce(p_promotions, '[]'::jsonb))
  loop
    if (v_promotion->>'ends_at')::timestamptz <= (v_promotion->>'starts_at')::timestamptz then
      raise exception 'Promotion end date must be after its start date';
    end if;

    insert into public.promotions(product_id, promo_price, active, starts_at, ends_at)
    values (
      v_promotion->>'product_id',
      (v_promotion->>'promo_price')::numeric,
      coalesce((v_promotion->>'active')::boolean, true),
      (v_promotion->>'starts_at')::timestamptz,
      (v_promotion->>'ends_at')::timestamptz
    )
    on conflict (product_id) do update set
      promo_price = excluded.promo_price,
      active = excluded.active,
      starts_at = excluded.starts_at,
      ends_at = excluded.ends_at;
  end loop;

  return query
  select p.product_id, p.promo_price, p.active, p.starts_at, p.ends_at
  from public.promotions p
  where p.product_id in (
    select value->>'product_id'
    from jsonb_array_elements(coalesce(p_promotions, '[]'::jsonb))
  );
end;
$$;

create or replace function public.admin_delete_promotion(p_admin_token text, p_product_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_admin_session(p_admin_token);
  delete from public.promotions where product_id = p_product_id;
end;
$$;

create or replace function public.admin_clear_promotions(p_admin_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_admin_session(p_admin_token);
  delete from public.promotions;
end;
$$;

alter table public.promotions enable row level security;
revoke all on public.promotions from anon, authenticated;

grant execute on function public.list_active_promotions() to anon, authenticated;
grant execute on function public.admin_upsert_promotions(text, jsonb) to anon, authenticated;
grant execute on function public.admin_delete_promotion(text, text) to anon, authenticated;
grant execute on function public.admin_clear_promotions(text) to anon, authenticated;
