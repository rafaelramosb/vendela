-- Vendela · funciones de negocio
-- Todo lo que mueve inventario o dinero pasa por aquí, dentro de una transacción.

create or replace function public.slugify(t text) returns text
language sql immutable set search_path = '' as $$
  select trim(both '-' from regexp_replace(
    lower(translate(coalesce(t, ''), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun')),
    '[^a-z0-9]+', '-', 'g'))
$$;

create or replace function public.norm_phone(t text) returns text
language plpgsql immutable set search_path = '' as $$
declare d text := regexp_replace(coalesce(t, ''), '\D', '', 'g');
begin
  if char_length(d) = 12 and left(d, 2) = '57' then d := substr(d, 3); end if;
  if char_length(d) < 7 or char_length(d) > 15 then return null; end if;
  return d;
end $$;

-- Crear el negocio de quien se registra ---------------------------------------
create or replace function public.create_business(p_name text, p_phone text default null, p_city text default 'Bogotá')
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_base text; v_slug text; v_id uuid;
begin
  if v_uid is null then raise exception 'Debes iniciar sesión'; end if;
  if exists (select 1 from public.business_members where user_id = v_uid) then
    raise exception 'Tu cuenta ya tiene un negocio';
  end if;
  if char_length(trim(coalesce(p_name, ''))) < 2 then raise exception 'Escribe el nombre del negocio'; end if;
  v_base := left(public.slugify(p_name), 30);
  if char_length(v_base) < 3 then v_base := trim(both '-' from 'tienda-' || v_base); end if;
  v_slug := v_base;
  while exists (select 1 from public.businesses where slug = v_slug) loop
    v_slug := v_base || '-' || substr(md5(random()::text), 1, 4);
  end loop;
  insert into public.businesses (name, slug, phone, city, created_by)
  values (trim(p_name), v_slug, public.norm_phone(p_phone), coalesce(nullif(trim(p_city), ''), 'Bogotá'), v_uid)
  returning id into v_id;
  insert into public.business_members (business_id, user_id, role) values (v_id, v_uid, 'owner');
  return v_id;
end $$;

-- Agrega ítems a un pedido descontando stock (uso interno) -------------------
create or replace function public._add_items(p_business uuid, p_order uuid, p_items jsonb, p_reason text,
  p_max_qty integer default 999, out subtotal integer, out cost_total integer)
language plpgsql security definer set search_path = '' as $$
declare it jsonb; v record; v_qty integer; v_price integer;
begin
  subtotal := 0; cost_total := 0;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Agrega al menos un producto';
  end if;
  if jsonb_array_length(p_items) > 50 then raise exception 'Máximo 50 productos por pedido'; end if;
  for it in select value from jsonb_array_elements(p_items) loop
    v_qty := (it->>'qty')::integer;
    if v_qty is null or v_qty <= 0 or v_qty > p_max_qty then raise exception 'Cantidad inválida'; end if;
    select va.id, va.stock, va.size, va.color, pr.id as product_id, pr.name, pr.price, pr.cost
      into v
      from public.variants va join public.products pr on pr.id = va.product_id
     where va.id = (it->>'variant_id')::uuid and va.business_id = p_business
       for update of va;
    if not found then raise exception 'Uno de los productos ya no existe'; end if;
    if v.stock < v_qty then
      raise exception 'No hay suficiente stock de % (% · %). Quedan %.', v.name, v.size, v.color, v.stock;
    end if;
    v_price := coalesce((it->>'price')::integer, v.price);
    if v_price < 0 then raise exception 'Precio inválido'; end if;
    update public.variants set stock = stock - v_qty where id = v.id;
    insert into public.order_items (business_id, order_id, product_id, variant_id, name, size, color, qty, price, cost)
    values (p_business, p_order, v.product_id, v.id, v.name, v.size, v.color, v_qty, v_price, v.cost);
    insert into public.stock_movements (business_id, variant_id, delta, reason, ref_id)
    values (p_business, v.id, -v_qty, p_reason, p_order);
    subtotal := subtotal + v_price * v_qty;
    cost_total := cost_total + v.cost * v_qty;
  end loop;
end $$;

-- Registrar una venta desde la app ------------------------------------------
create or replace function public.create_sale(
  p_business uuid, p_items jsonb,
  p_customer_id uuid default null, p_customer_name text default null, p_customer_phone text default null,
  p_channel text default 'WhatsApp', p_payment text default 'Nequi', p_paid boolean default true,
  p_delivery boolean default false, p_locality text default null, p_address text default null,
  p_shipping integer default 0, p_notes text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_cust uuid; v_num integer; v_order uuid; r record;
begin
  if not public.is_member(p_business) then raise exception 'No tienes acceso a este negocio'; end if;
  if public.plan_of(p_business) = 'free' and (
      select count(*) from public.orders o
       where o.business_id = p_business and o.status <> 'cancelado'
         and date_trunc('month', o.sold_on) = date_trunc('month', public.co_today())) >= 30 then
    raise exception 'El plan Gratis permite 30 ventas al mes. Activa el plan Emprendedor para seguir vendiendo.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_business::text, 0));

  if p_customer_id is not null then
    select id into v_cust from public.customers where id = p_customer_id and business_id = p_business;
  elsif nullif(trim(coalesce(p_customer_name, '')), '') is not null then
    select id into v_cust from public.customers
     where business_id = p_business and lower(name) = lower(trim(p_customer_name)) limit 1;
    if v_cust is null then
      insert into public.customers (business_id, name, phone, locality, address)
      values (p_business, left(trim(p_customer_name), 80), public.norm_phone(p_customer_phone),
              nullif(trim(coalesce(p_locality, '')), ''), nullif(trim(coalesce(p_address, '')), ''))
      returning id into v_cust;
    end if;
  end if;

  select coalesce(max(number), 1000) + 1 into v_num from public.orders where business_id = p_business;
  insert into public.orders (business_id, number, customer_id, channel, payment_method, paid, status, delivery,
                             shipping, locality, address, notes)
  values (p_business, v_num, v_cust, p_channel, p_payment,
          coalesce(p_paid, false) and p_payment <> 'Contraentrega',
          case when coalesce(p_delivery, false) then 'nuevo' else 'entregado' end,
          coalesce(p_delivery, false),
          case when coalesce(p_delivery, false) then greatest(coalesce(p_shipping, 0), 0) else 0 end,
          case when coalesce(p_delivery, false) then nullif(trim(coalesce(p_locality, '')), '') end,
          case when coalesce(p_delivery, false) then nullif(trim(coalesce(p_address, '')), '') end,
          nullif(trim(coalesce(p_notes, '')), ''))
  returning id into v_order;

  select * into r from public._add_items(p_business, v_order, p_items, 'venta');
  update public.orders set subtotal = r.subtotal, cost_total = r.cost_total where id = v_order;

  if v_cust is not null and coalesce(p_delivery, false) then
    update public.customers
       set locality = coalesce(nullif(trim(coalesce(p_locality, '')), ''), locality),
           address = coalesce(nullif(trim(coalesce(p_address, '')), ''), address)
     where id = v_cust;
  end if;
  return jsonb_build_object('order_id', v_order, 'number', v_num, 'subtotal', r.subtotal);
end $$;

-- Cambiar estado de entrega --------------------------------------------------
create or replace function public.set_order_status(p_order uuid, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare o record;
begin
  select id, business_id, status into o from public.orders where id = p_order for update;
  if not found or not public.is_member(o.business_id) then raise exception 'Pedido no encontrado'; end if;
  if p_status not in ('nuevo','encamino','entregado') then raise exception 'Estado inválido'; end if;
  if o.status = 'cancelado' then raise exception 'El pedido está cancelado'; end if;
  update public.orders set status = p_status where id = p_order;
end $$;

-- Cancelar un pedido devuelve el stock -----------------------------------------
create or replace function public.cancel_order(p_order uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare o record; it record;
begin
  select id, business_id, status into o from public.orders where id = p_order for update;
  if not found or not public.is_member(o.business_id) then raise exception 'Pedido no encontrado'; end if;
  if o.status = 'cancelado' then return; end if;
  for it in select variant_id, qty from public.order_items where order_id = p_order and variant_id is not null loop
    update public.variants set stock = stock + it.qty where id = it.variant_id;
    insert into public.stock_movements (business_id, variant_id, delta, reason, ref_id)
    values (o.business_id, it.variant_id, it.qty, 'cancelacion', p_order);
  end loop;
  update public.orders set status = 'cancelado' where id = p_order;
end $$;

-- Compra de mercancía: suma stock y promedia el costo -------------------------
create or replace function public.register_purchase(p_variant uuid, p_qty integer, p_unit_cost integer default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v record; v_total integer;
begin
  select va.id, va.business_id, va.product_id into v from public.variants va where va.id = p_variant for update;
  if not found or not public.is_member(v.business_id) then raise exception 'Producto no encontrado'; end if;
  if p_qty is null or p_qty <= 0 or p_qty > 100000 then raise exception 'Cantidad inválida'; end if;
  if p_unit_cost is not null and p_unit_cost < 0 then raise exception 'Costo inválido'; end if;
  select coalesce(sum(stock), 0) into v_total from public.variants where product_id = v.product_id;
  if p_unit_cost is not null then
    update public.products
       set cost = round((cost::numeric * v_total + p_unit_cost::numeric * p_qty) / (v_total + p_qty))
     where id = v.product_id;
  end if;
  update public.variants set stock = stock + p_qty where id = p_variant;
  insert into public.purchases (business_id, product_id, variant_id, qty, unit_cost)
  values (v.business_id, v.product_id, p_variant, p_qty,
          coalesce(p_unit_cost, (select cost from public.products where id = v.product_id)));
  insert into public.stock_movements (business_id, variant_id, delta, reason)
  values (v.business_id, p_variant, p_qty, 'compra');
end $$;

-- Corregir el stock contado a mano --------------------------------------------
create or replace function public.adjust_stock(p_variant uuid, p_stock integer)
returns void language plpgsql security definer set search_path = '' as $$
declare v record;
begin
  select id, business_id, stock into v from public.variants where id = p_variant for update;
  if not found or not public.is_member(v.business_id) then raise exception 'Producto no encontrado'; end if;
  if p_stock is null or p_stock < 0 then raise exception 'Stock inválido'; end if;
  if p_stock = v.stock then return; end if;
  update public.variants set stock = p_stock where id = p_variant;
  insert into public.stock_movements (business_id, variant_id, delta, reason)
  values (v.business_id, p_variant, p_stock - v.stock, 'ajuste');
end $$;

-- Resumen del mes para Inicio y Cuentas --------------------------------------
create or replace function public.month_summary(p_business uuid, p_day date default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  d date := coalesce(p_day, public.co_today());
  m_start date := date_trunc('month', d)::date;
  m_end date := (date_trunc('month', d) + interval '1 month')::date;
  res jsonb;
begin
  if not public.is_member(p_business) then raise exception 'No tienes acceso a este negocio'; end if;
  with mo as (
    select * from public.orders
     where business_id = p_business and status <> 'cancelado' and sold_on >= m_start and sold_on < m_end
  ), me as (
    select * from public.expenses where business_id = p_business and spent_on >= m_start and spent_on < m_end
  )
  select jsonb_build_object(
    'month_start', m_start,
    'sales', coalesce((select sum(subtotal) from mo), 0),
    'cost', coalesce((select sum(cost_total) from mo), 0),
    'orders', (select count(*) from mo),
    'collected', coalesce((select sum(subtotal) from mo where paid), 0),
    'expenses', coalesce((select sum(amount) from me), 0),
    'fixed_expenses', coalesce((select sum(amount) from me where kind = 'fijo'), 0),
    'expense_count', (select count(*) from me),
    'purchases', coalesce((select sum(qty * unit_cost) from public.purchases
                            where business_id = p_business and purchased_on >= m_start and purchased_on < m_end), 0),
    'today_sales', coalesce((select sum(subtotal) from mo where sold_on = public.co_today()), 0),
    'today_orders', (select count(*) from mo where sold_on = public.co_today()),
    'unpaid_total', coalesce((select sum(subtotal + shipping) from public.orders
                               where business_id = p_business and status <> 'cancelado' and not paid), 0),
    'unpaid_orders', (select count(*) from public.orders
                       where business_id = p_business and status <> 'cancelado' and not paid),
    'active_orders', (select count(*) from public.orders
                       where business_id = p_business and status in ('nuevo','encamino')),
    'by_channel', coalesce((select jsonb_agg(x order by x.total desc) from (
                    select channel, sum(subtotal) as total, count(*) as n from mo group by channel) x), '[]'::jsonb),
    'by_payment', coalesce((select jsonb_agg(x order by x.total desc) from (
                    select payment_method, sum(subtotal) as total from mo group by payment_method) x), '[]'::jsonb),
    'by_expense', coalesce((select jsonb_agg(x order by x.total desc) from (
                    select category, sum(amount) as total from me group by category) x), '[]'::jsonb),
    'top_products', coalesce((select jsonb_agg(x order by x.units desc) from (
                    select oi.name, sum(oi.qty) as units, sum(oi.qty * oi.price) as total
                      from public.order_items oi join mo on mo.id = oi.order_id
                     group by oi.name order by units desc limit 5) x), '[]'::jsonb),
    'low_stock', coalesce((select jsonb_agg(x order by x.stock, x.name) from (
                    select p.name, p.category, va.size, va.color, va.stock, va.id as variant_id
                      from public.variants va join public.products p on p.id = va.product_id
                     where va.business_id = p_business and p.active and va.stock <= 1
                     order by va.stock, p.name limit 8) x), '[]'::jsonb)
  ) into res;
  return res;
end $$;

-- Tienda pública ---------------------------------------------------------------
create or replace function public.get_store(p_slug text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare b record;
begin
  select * into b from public.businesses where slug = lower(trim(coalesce(p_slug, '')));
  if not found then return null; end if;
  if not b.store_enabled or public.plan_of(b.id) = 'free' then
    return jsonb_build_object('name', b.name, 'slug', b.slug, 'phone', b.phone, 'enabled', false);
  end if;
  return jsonb_build_object(
    'name', b.name, 'slug', b.slug, 'phone', b.phone, 'city', b.city, 'tagline', b.store_tagline,
    'shipping', b.default_shipping, 'enabled', true,
    'products', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'name', p.name, 'category', p.category, 'price', p.price,
        'variants', (select jsonb_agg(jsonb_build_object('id', va.id, 'size', va.size, 'color', va.color,
                                                        'stock', least(va.stock, 5)) order by va.created_at)
                       from public.variants va where va.product_id = p.id and va.stock > 0)
      ) order by p.created_at desc)
      from public.products p
      where p.business_id = b.id and p.active
        and exists (select 1 from public.variants va where va.product_id = p.id and va.stock > 0)
    ), '[]'::jsonb));
end $$;

create or replace function public.place_store_order(
  p_slug text, p_items jsonb, p_name text, p_phone text,
  p_locality text default null, p_address text default null, p_notes text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare b record; v_phone text; v_cust uuid; v_num integer; v_order uuid; r record;
begin
  select * into b from public.businesses where slug = lower(trim(coalesce(p_slug, '')));
  if not found or not b.store_enabled or public.plan_of(b.id) = 'free' then
    raise exception 'Esta tienda no está recibiendo pedidos en línea';
  end if;
  if char_length(trim(coalesce(p_name, ''))) < 2 then raise exception 'Escribe tu nombre'; end if;
  v_phone := public.norm_phone(p_phone);
  if v_phone is null then raise exception 'Escribe un celular válido'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) > 10 then
    raise exception 'Máximo 10 productos por pedido';
  end if;
  -- Freno a pedidos repetidos o masivos que apartan stock sin comprar.
  if (select count(*) from public.orders o join public.customers c on c.id = o.customer_id
       where o.business_id = b.id and o.channel = 'Tienda' and c.phone = v_phone
         and o.created_at > now() - interval '1 hour') >= 3 then
    raise exception 'Ya recibimos tus pedidos. La tienda te escribirá por WhatsApp.';
  end if;
  if (select count(*) from public.orders o where o.business_id = b.id and o.channel = 'Tienda'
         and o.created_at > now() - interval '10 minutes') >= 30 then
    raise exception 'La tienda está recibiendo muchos pedidos. Intenta en unos minutos.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(b.id::text, 0));
  select id into v_cust from public.customers where business_id = b.id and phone = v_phone limit 1;
  if v_cust is null then
    insert into public.customers (business_id, name, phone, locality, address)
    values (b.id, left(trim(p_name), 80), v_phone, nullif(left(trim(coalesce(p_locality, '')), 40), ''),
            nullif(left(trim(coalesce(p_address, '')), 160), ''))
    returning id into v_cust;
  end if;
  select coalesce(max(number), 1000) + 1 into v_num from public.orders where business_id = b.id;
  insert into public.orders (business_id, number, customer_id, channel, payment_method, paid, status, delivery,
                             shipping, locality, address, notes, created_by)
  values (b.id, v_num, v_cust, 'Tienda', 'Por definir', false, 'nuevo', true, b.default_shipping,
          nullif(left(trim(coalesce(p_locality, '')), 40), ''), nullif(left(trim(coalesce(p_address, '')), 160), ''),
          nullif(left(trim(coalesce(p_notes, '')), 300), ''), null)
  returning id into v_order;
  select * into r from public._add_items(b.id, v_order, p_items, 'tienda', 5);
  update public.orders set subtotal = r.subtotal, cost_total = r.cost_total where id = v_order;
  return jsonb_build_object('number', v_num, 'subtotal', r.subtotal, 'shipping', b.default_shipping,
                            'business', b.name, 'phone', b.phone, 'payment_key', b.payment_key);
end $$;

-- Suscripción ------------------------------------------------------------------
create or replace function public.start_subscription_payment(p_business uuid, p_months integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_amount bigint; v_ref text;
begin
  if not public.is_member(p_business) then raise exception 'No tienes acceso a este negocio'; end if;
  v_amount := case p_months when 1 then 4990000 when 3 then 13470000 when 12 then 44900000 end;
  if v_amount is null then raise exception 'Plan inválido'; end if;
  v_ref := 'VDL-' || replace(p_business::text, '-', '') || '-' || extract(epoch from now())::bigint;
  insert into public.subscription_payments (business_id, reference, months, amount_in_cents)
  values (p_business, v_ref, p_months, v_amount);
  return jsonb_build_object('reference', v_ref, 'amount_in_cents', v_amount);
end $$;

-- Solo la usa el webhook de pagos con la llave de servicio.
create or replace function public.apply_subscription_payment(
  p_reference text, p_tx_id text, p_status text, p_amount_in_cents bigint)
returns text language plpgsql security definer set search_path = '' as $$
declare sp record; b record;
begin
  select * into sp from public.subscription_payments where reference = p_reference for update;
  if not found then return 'referencia desconocida'; end if;
  if sp.status = 'APPROVED' then return 'ya aplicado'; end if;
  update public.subscription_payments
     set status = p_status, provider_tx_id = p_tx_id, updated_at = now()
   where id = sp.id;
  if p_status <> 'APPROVED' then return 'registrado ' || p_status; end if;
  if p_amount_in_cents <> sp.amount_in_cents then return 'monto no coincide'; end if;
  select * into b from public.businesses where id = sp.business_id for update;
  update public.businesses
     set plan = 'pro',
         paid_until = greatest(now(), coalesce(b.paid_until, now())) + make_interval(months => sp.months)
   where id = sp.business_id;
  return 'activado';
end $$;

-- Permisos de ejecución ----------------------------------------------------------
revoke execute on all functions in schema public from public, anon;
grant execute on function public.co_today() to anon, authenticated;
grant execute on function public.slugify(text) to authenticated;
grant execute on function public.norm_phone(text) to authenticated;
grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.plan_of(uuid) to authenticated;
grant execute on function public.create_business(text, text, text) to authenticated;
grant execute on function public.create_sale(uuid, jsonb, uuid, text, text, text, text, boolean, boolean, text, text, integer, text) to authenticated;
grant execute on function public.set_order_status(uuid, text) to authenticated;
grant execute on function public.cancel_order(uuid) to authenticated;
grant execute on function public.register_purchase(uuid, integer, integer) to authenticated;
grant execute on function public.adjust_stock(uuid, integer) to authenticated;
grant execute on function public.month_summary(uuid, date) to authenticated;
grant execute on function public.start_subscription_payment(uuid, integer) to authenticated;
grant execute on function public.get_store(text) to anon, authenticated;
grant execute on function public.place_store_order(text, jsonb, text, text, text, text, text) to anon, authenticated;
revoke execute on function public._add_items(uuid, uuid, jsonb, text, integer) from authenticated;
revoke execute on function public.apply_subscription_payment(text, text, text, bigint) from authenticated;
grant execute on function public.apply_subscription_payment(text, text, text, bigint) to service_role;
