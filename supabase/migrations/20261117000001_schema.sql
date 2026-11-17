-- Vendela · esquema base multiempresa
-- Cada negocio ve solo sus filas (RLS por business_id). Las operaciones que mueven
-- inventario o dinero pasan por funciones (ver 20261117000002_functions.sql).

create or replace function public.co_today() returns date
language sql stable set search_path = '' as $$
  select (now() at time zone 'America/Bogota')::date
$$;

-- Negocios -------------------------------------------------------------------
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,39}$'),
  phone text check (phone is null or phone ~ '^[0-9]{7,15}$'),
  city text not null default 'Bogotá',
  store_tagline text check (store_tagline is null or char_length(store_tagline) <= 120),
  store_enabled boolean not null default true,
  default_shipping integer not null default 10000 check (default_shipping >= 0),
  payment_key text check (payment_key is null or char_length(payment_key) <= 80),
  plan text not null default 'trial' check (plan in ('trial','free','pro')),
  trial_ends_at timestamptz not null default now() + interval '30 days',
  paid_until timestamptz,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.business_members (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','seller')),
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);
create index business_members_user_idx on public.business_members(user_id);

-- Catálogo e inventario ------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  category text not null default 'otro' check (char_length(category) <= 30),
  cost integer not null default 0 check (cost >= 0),
  price integer not null check (price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index products_business_idx on public.products(business_id, active);

create table public.variants (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  size text not null default 'Única' check (char_length(size) between 1 and 20),
  color text not null default 'Único' check (char_length(color) between 1 and 30),
  stock integer not null default 0 check (stock >= 0),
  created_at timestamptz not null default now(),
  unique (product_id, size, color)
);
create index variants_business_idx on public.variants(business_id);
create index variants_product_idx on public.variants(product_id);

create table public.stock_movements (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  variant_id uuid references public.variants(id) on delete set null,
  delta integer not null,
  reason text not null check (reason in ('inicial','venta','tienda','compra','ajuste','cancelacion')),
  ref_id uuid,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index stock_movements_business_idx on public.stock_movements(business_id, created_at desc);

-- Clientas -------------------------------------------------------------------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  phone text check (phone is null or phone ~ '^[0-9]{7,15}$'),
  locality text check (locality is null or char_length(locality) <= 40),
  address text check (address is null or char_length(address) <= 160),
  notes text check (notes is null or char_length(notes) <= 300),
  created_at timestamptz not null default now()
);
create index customers_business_idx on public.customers(business_id);
create index customers_name_idx on public.customers(business_id, lower(name));

-- Pedidos y ventas -----------------------------------------------------------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  number integer not null,
  customer_id uuid references public.customers(id) on delete set null,
  channel text not null check (channel in ('TikTok','Instagram','Facebook','WhatsApp','Tienda','Local','Otro')),
  payment_method text not null check (payment_method in ('Nequi','Bre-B','Efectivo','Contraentrega','Tarjeta','Por definir')),
  paid boolean not null default false,
  status text not null default 'nuevo' check (status in ('nuevo','encamino','entregado','cancelado')),
  delivery boolean not null default false,
  shipping integer not null default 0 check (shipping >= 0),
  locality text check (locality is null or char_length(locality) <= 40),
  address text check (address is null or char_length(address) <= 160),
  notes text check (notes is null or char_length(notes) <= 300),
  subtotal integer not null default 0 check (subtotal >= 0),
  cost_total integer not null default 0 check (cost_total >= 0),
  sold_on date not null default public.co_today(),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique (business_id, number)
);
create index orders_business_date_idx on public.orders(business_id, sold_on desc);
create index orders_business_status_idx on public.orders(business_id, status);
create index orders_customer_idx on public.orders(customer_id);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.variants(id) on delete set null,
  name text not null,
  size text not null,
  color text not null,
  qty integer not null check (qty > 0),
  price integer not null check (price >= 0),
  cost integer not null default 0 check (cost >= 0)
);
create index order_items_order_idx on public.order_items(order_id);
create index order_items_business_idx on public.order_items(business_id);

-- Gastos y compras -----------------------------------------------------------
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  concept text not null check (char_length(concept) between 1 and 80),
  category text not null check (char_length(category) <= 30),
  amount integer not null check (amount > 0),
  kind text not null default 'variable' check (kind in ('fijo','variable')),
  spent_on date not null default public.co_today(),
  created_at timestamptz not null default now()
);
create index expenses_business_date_idx on public.expenses(business_id, spent_on desc);

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.variants(id) on delete set null,
  qty integer not null check (qty > 0),
  unit_cost integer not null check (unit_cost >= 0),
  purchased_on date not null default public.co_today(),
  created_at timestamptz not null default now()
);
create index purchases_business_date_idx on public.purchases(business_id, purchased_on desc);

-- Pagos de suscripción (Wompi) -------------------------------------------------
create table public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  reference text not null unique,
  months integer not null check (months in (1,3,12)),
  amount_in_cents bigint not null,
  status text not null default 'PENDING',
  provider_tx_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index subscription_payments_business_idx on public.subscription_payments(business_id);

-- Acceso ----------------------------------------------------------------------
create or replace function public.is_member(bid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.business_members m
    where m.business_id = bid and m.user_id = (select auth.uid())
  )
$$;

create or replace function public.plan_of(bid uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when b.plan = 'pro' and b.paid_until > now() then 'pro'
    when b.trial_ends_at > now() then 'trial'
    else 'free'
  end
  from public.businesses b where b.id = bid
$$;

revoke execute on function public.is_member(uuid) from public, anon;
revoke execute on function public.plan_of(uuid) from public, anon;
grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.plan_of(uuid) to authenticated;

alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.products enable row level security;
alter table public.variants enable row level security;
alter table public.stock_movements enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.expenses enable row level security;
alter table public.purchases enable row level security;
alter table public.subscription_payments enable row level security;

-- Nadie anónimo toca tablas: la tienda pública usa funciones.
revoke all on all tables in schema public from anon;

-- Negocio: leer y editar solo campos de perfil (nunca plan ni fechas de pago).
create policy businesses_select on public.businesses for select to authenticated
  using (public.is_member(id));
create policy businesses_update on public.businesses for update to authenticated
  using (public.is_member(id)) with check (public.is_member(id));
revoke insert, update, delete on public.businesses from authenticated;
grant update (name, slug, phone, city, store_tagline, store_enabled, default_shipping, payment_key)
  on public.businesses to authenticated;

create policy members_select on public.business_members for select to authenticated
  using (user_id = (select auth.uid()) or public.is_member(business_id));
revoke insert, update, delete on public.business_members from authenticated;

-- Catálogo: CRUD completo, salvo el stock que solo cambia por funciones.
create policy products_all on public.products for all to authenticated
  using (public.is_member(business_id)) with check (public.is_member(business_id));

create policy variants_select on public.variants for select to authenticated
  using (public.is_member(business_id));
create policy variants_insert on public.variants for insert to authenticated
  with check (public.is_member(business_id));
create policy variants_update on public.variants for update to authenticated
  using (public.is_member(business_id)) with check (public.is_member(business_id));
create policy variants_delete on public.variants for delete to authenticated
  using (public.is_member(business_id));
revoke update on public.variants from authenticated;
grant update (size, color) on public.variants to authenticated;

create policy customers_all on public.customers for all to authenticated
  using (public.is_member(business_id)) with check (public.is_member(business_id));

create policy expenses_all on public.expenses for all to authenticated
  using (public.is_member(business_id)) with check (public.is_member(business_id));

-- Pedidos: se crean y cancelan por funciones; desde la app solo cambia estado/pago/datos de envío.
create policy orders_select on public.orders for select to authenticated
  using (public.is_member(business_id));
create policy orders_update on public.orders for update to authenticated
  using (public.is_member(business_id)) with check (public.is_member(business_id));
revoke insert, update, delete on public.orders from authenticated;
grant update (paid, payment_method, locality, address, notes, shipping) on public.orders to authenticated;

create policy order_items_select on public.order_items for select to authenticated
  using (public.is_member(business_id));
revoke insert, update, delete on public.order_items from authenticated;

create policy purchases_select on public.purchases for select to authenticated
  using (public.is_member(business_id));
revoke insert, update, delete on public.purchases from authenticated;

create policy stock_movements_select on public.stock_movements for select to authenticated
  using (public.is_member(business_id));
revoke insert, update, delete on public.stock_movements from authenticated;

create policy subscription_payments_select on public.subscription_payments for select to authenticated
  using (public.is_member(business_id));
revoke insert, update, delete on public.subscription_payments from authenticated;

-- Reglas que no dependen de quién escribe ------------------------------------
-- Las variantes siempre pertenecen al mismo negocio que su producto.
create or replace function public.tg_variant_business() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_bid uuid;
begin
  select business_id into v_bid from public.products where id = new.product_id;
  if v_bid is null or v_bid <> new.business_id then
    raise exception 'La variante no corresponde al producto';
  end if;
  return new;
end $$;
create trigger variants_business_check before insert or update of product_id, business_id on public.variants
  for each row execute function public.tg_variant_business();

-- El stock inicial queda en el historial.
create or replace function public.tg_variant_initial_stock() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.stock > 0 then
    insert into public.stock_movements (business_id, variant_id, delta, reason)
    values (new.business_id, new.id, new.stock, 'inicial');
  end if;
  return new;
end $$;
create trigger variants_initial_stock after insert on public.variants
  for each row execute function public.tg_variant_initial_stock();

-- Límite del plan Gratis: 20 productos activos.
create or replace function public.tg_products_plan_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if public.plan_of(new.business_id) = 'free'
     and (select count(*) from public.products p where p.business_id = new.business_id and p.active) >= 20 then
    raise exception 'El plan Gratis permite 20 productos. Activa el plan Emprendedor para agregar más.'
      using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger products_plan_limit before insert on public.products
  for each row execute function public.tg_products_plan_limit();

revoke execute on function public.tg_variant_business() from public, anon, authenticated;
revoke execute on function public.tg_variant_initial_stock() from public, anon, authenticated;
revoke execute on function public.tg_products_plan_limit() from public, anon, authenticated;
