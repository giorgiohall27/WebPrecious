

create extension if not exists pgcrypto;

create table if not exists public.companies (
  id text primary key,
  name text not null,
  cif text default '',
  email text default '',
  phone text default '',
  contact_person text default '',
  delivery_address text default '',
  pin text not null unique check (pin ~ '^[0-9]{6}$'),
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id text primary key,
  name text not null,
  key text not null unique,
  icon text not null default 'package',
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subcategories (
  id text primary key,
  category_id text not null references public.categories(id) on delete cascade,
  name text not null,
  key text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, key)
);

create table if not exists public.products (
  id text primary key,
  sku text not null unique,
  name text not null,
  category_id text not null references public.categories(id) on delete restrict,
  subcategory_id text references public.subcategories(id) on delete set null,
  category_name text,
  subcategory_name text,
  price numeric(12, 3) not null default 0,
  stock integer not null default 0,
  description text,
  brand text,
  unit_measure text,
  units_per_box integer,
  image_url text,
  weight_kg numeric(10, 3),
  iva numeric(5, 2) not null default 21,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id text primary key,
  order_id text not null unique,
  company_id text references public.companies(id) on delete set null,
  company_name text not null,
  company_cif text default '',
  company_email text default '',
  company_phone text default '',
  contact_person text default '',
  delivery_address text default '',
  total_items integer not null default 0,
  total_amount numeric(12, 2) not null default 0,
  notes text,
  status text not null default 'authorization_pending'
    check (status in ('pending', 'authorization_pending', 'processing', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  estimated_delivery date
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders(id) on delete cascade,
  product_id text references public.products(id) on delete set null,
  sku text not null,
  name text not null,
  category_name text default '',
  quantity integer not null default 1,
  unit_price numeric(12, 3) not null default 0,
  subtotal numeric(12, 2) not null default 0
);

create index if not exists idx_companies_pin on public.companies(pin);
create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_active on public.products(active);
create index if not exists idx_orders_company on public.orders(company_id);
create index if not exists idx_orders_created_at on public.orders(created_at desc);
create index if not exists idx_order_items_order on public.order_items(order_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_companies_updated_at on public.companies;
create trigger set_companies_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

drop trigger if exists set_categories_updated_at on public.categories;
create trigger set_categories_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists set_subcategories_updated_at on public.subcategories;
create trigger set_subcategories_updated_at
before update on public.subcategories
for each row execute function public.set_updated_at();

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.companies to anon, authenticated;
grant select, insert, update, delete on public.categories to anon, authenticated;
grant select, insert, update, delete on public.subcategories to anon, authenticated;
grant select, insert, update, delete on public.products to anon, authenticated;
grant select, insert, update, delete on public.orders to anon, authenticated;
grant select, insert, update, delete on public.order_items to anon, authenticated;
