-- ========================================================================
-- SCHEMA UNTUK AKUN STORE
-- Jalankan file ini di Supabase SQL Editor (Project > SQL Editor > New query)
-- Tabel auth (user/session/account/verification) dibuat terpisah oleh
-- better-auth lewat `npm run auth:migrate` — jalankan itu SETELAH ini.
-- ========================================================================

create extension if not exists "pgcrypto";

-- Kategori produk (opsional, cuma buat filter di storefront)
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

-- Produk yang dijual (mis. "Netflix Premium 1 Bulan", "Windows 11 Pro Key")
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  category_id uuid references categories(id) on delete set null,
  price integer not null check (price >= 0), -- dalam Rupiah, tanpa desimal
  image_url text,
  duration_label text, -- label default, mis. "1 Bulan" (bisa ditimpa per-stok)
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_active on products(is_active);

-- Stok kredensial per produk. Satu baris = satu akun/lisensi yang bisa dijual.
create table if not exists stock_items (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  credential_email text,       -- email/username akun
  credential_password text,    -- password akun
  credential_extra text,       -- catatan tambahan / license key / profile PIN dll
  duration_label text,         -- durasi khusus item ini, mis. "1 Bulan", "Lifetime"
  status text not null default 'available' check (status in ('available','sold','disabled')),
  order_id uuid,               -- diisi saat terjual
  created_at timestamptz not null default now(),
  sold_at timestamptz
);

create index if not exists idx_stock_product_status on stock_items(product_id, status);

-- Pesanan
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  user_id text not null,          -- id user dari better-auth
  customer_email text not null,
  customer_name text,
  total_amount integer not null check (total_amount >= 0),
  status text not null default 'pending' check (status in ('pending','paid','expired','cancelled')),
  payment_url text,
  payment_token text,
  doku_response jsonb,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists idx_orders_user on orders(user_id);
create index if not exists idx_orders_status on orders(status);

-- Item per pesanan (snapshot harga & nama produk saat dibeli)
create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id),
  product_name text not null,
  unit_price integer not null,
  quantity integer not null check (quantity > 0),
  subtotal integer not null
);

create index if not exists idx_order_items_order on order_items(order_id);

alter table stock_items
  add constraint fk_stock_order foreign key (order_id) references orders(id) on delete set null;

-- ------------------------------------------------------------------------
-- Fungsi atomik untuk menjatah stok saat pembayaran sukses.
-- Pakai FOR UPDATE SKIP LOCKED supaya aman dari race condition kalau ada
-- lebih dari satu notifikasi/worker yang jalan bersamaan.
-- Return: baris stock_items yang berhasil dijatahkan.
-- ------------------------------------------------------------------------
create or replace function assign_stock(p_order_id uuid, p_product_id uuid, p_quantity integer)
returns setof stock_items
language plpgsql
as $$
declare
  v_ids uuid[];
begin
  select array_agg(id) into v_ids
  from (
    select id from stock_items
    where product_id = p_product_id and status = 'available'
    order by created_at asc
    limit p_quantity
    for update skip locked
  ) sub;

  if v_ids is null or array_length(v_ids, 1) is distinct from p_quantity then
    raise exception 'INSUFFICIENT_STOCK: butuh % stok untuk produk %, hanya tersedia %',
      p_quantity, p_product_id, coalesce(array_length(v_ids, 1), 0);
  end if;

  return query
    update stock_items
    set status = 'sold', order_id = p_order_id, sold_at = now()
    where id = any(v_ids)
    returning *;
end;
$$;

-- Row Level Security: semua tabel di atas HANYA diakses lewat server
-- (service role key), tidak pernah lewat anon/public key. RLS diaktifkan
-- tanpa policy publik supaya anon key tidak bisa baca/tulis apa pun.
alter table categories enable row level security;
alter table products enable row level security;
alter table stock_items enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

-- Storefront butuh baca daftar produk aktif tanpa service role (opsional,
-- kalau mau fetch produk langsung dari client). Kalau semua fetch produk
-- tetap lewat Next.js server (recommended & yang dipakai template ini),
-- policy ini boleh dilewati/dihapus.
create policy "public can read active products" on products
  for select using (is_active = true);
create policy "public can read categories" on categories
  for select using (true);
