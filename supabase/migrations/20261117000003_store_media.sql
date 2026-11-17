-- Vendela · fotos de producto y personalización de la tienda

create or replace function public.valid_urls(arr text[]) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(bool_and(u ~ '^https://[^\s"''<>]+$'), true) from unnest(arr) as u
$$;

alter table public.products
  add column if not exists description text check (description is null or char_length(description) <= 600),
  add column if not exists images text[] not null default '{}'
    check (cardinality(images) <= 6 and public.valid_urls(images));

alter table public.businesses
  add column if not exists logo_url text check (logo_url is null or public.valid_urls(array[logo_url])),
  add column if not exists cover_url text check (cover_url is null or public.valid_urls(array[cover_url])),
  add column if not exists brand_color text check (brand_color is null or brand_color ~ '^#[0-9a-fA-F]{6}$'),
  add column if not exists instagram text check (instagram is null or instagram ~ '^[A-Za-z0-9._]{1,40}$'),
  add column if not exists tiktok text check (tiktok is null or tiktok ~ '^[A-Za-z0-9._]{1,40}$'),
  add column if not exists store_about text check (store_about is null or char_length(store_about) <= 400);

grant update (logo_url, cover_url, brand_color, instagram, tiktok, store_about) on public.businesses to authenticated;

-- Archivos: store-media/<business_id>/<archivo>. Lectura pública por URL; escritura solo de miembros.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('store-media', 'store-media', true, 3145728, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.is_member_path(p text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin
  if p is null or p !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return false; end if;
  return public.is_member(p::uuid);
end $$;
revoke execute on function public.is_member_path(text) from public, anon;
grant execute on function public.is_member_path(text) to authenticated;

create policy store_media_select on storage.objects for select to authenticated
  using (bucket_id = 'store-media' and public.is_member_path((storage.foldername(name))[1]));
create policy store_media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'store-media' and public.is_member_path((storage.foldername(name))[1]));
create policy store_media_update on storage.objects for update to authenticated
  using (bucket_id = 'store-media' and public.is_member_path((storage.foldername(name))[1]));
create policy store_media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'store-media' and public.is_member_path((storage.foldername(name))[1]));

-- Tienda pública con la información nueva --------------------------------------
create or replace function public.get_store(p_slug text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare b record;
begin
  select * into b from public.businesses where slug = lower(trim(coalesce(p_slug, '')));
  if not found then return null; end if;
  if not b.store_enabled or public.plan_of(b.id) = 'free' then
    return jsonb_build_object('name', b.name, 'slug', b.slug, 'phone', b.phone, 'enabled', false,
      'logo', b.logo_url, 'brand_color', b.brand_color, 'instagram', b.instagram, 'tiktok', b.tiktok);
  end if;
  return jsonb_build_object(
    'name', b.name, 'slug', b.slug, 'phone', b.phone, 'city', b.city, 'tagline', b.store_tagline,
    'about', b.store_about, 'logo', b.logo_url, 'cover', b.cover_url, 'brand_color', b.brand_color,
    'instagram', b.instagram, 'tiktok', b.tiktok, 'payment_key_set', b.payment_key is not null,
    'shipping', b.default_shipping, 'enabled', true,
    'products', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'name', p.name, 'category', p.category, 'price', p.price,
        'description', p.description, 'images', to_jsonb(p.images),
        'is_new', p.created_at > now() - interval '14 days',
        'stock', least((select sum(va.stock) from public.variants va where va.product_id = p.id), 99),
        'variants', (select jsonb_agg(jsonb_build_object('id', va.id, 'size', va.size, 'color', va.color,
                                                        'stock', least(va.stock, 5)) order by va.created_at)
                       from public.variants va where va.product_id = p.id and va.stock > 0)
      ) order by p.created_at desc)
      from public.products p
      where p.business_id = b.id and p.active
        and exists (select 1 from public.variants va where va.product_id = p.id and va.stock > 0)
    ), '[]'::jsonb));
end $$;
revoke execute on function public.get_store(text) from public;
grant execute on function public.get_store(text) to anon, authenticated;
revoke execute on function public.valid_urls(text[]) from public, anon;
grant execute on function public.valid_urls(text[]) to authenticated;
