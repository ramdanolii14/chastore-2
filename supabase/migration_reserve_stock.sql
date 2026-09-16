-- ========================================================================
-- MIGRASI: sistem reservasi stok (mencegah 2 pembeli rebutan stok yang
-- sama pas checkout bersamaan).
-- Jalankan file ini SEKALI di Supabase SQL Editor untuk database yang
-- SUDAH ada isinya (sudah pernah jalanin schema.sql versi lama).
-- Aman dijalankan berkali-kali (idempotent).
-- ========================================================================

-- 1. Tambah kolom & status baru di stock_items
alter table stock_items add column if not exists reserved_until timestamptz;

alter table stock_items drop constraint if exists stock_items_status_check;
alter table stock_items add constraint stock_items_status_check
  check (status in ('available','reserved','sold','disabled'));

-- 2. Fungsi reserve_stock (dipanggil pas checkout dibuat)
create or replace function reserve_stock(
  p_order_id uuid, p_product_id uuid, p_quantity integer, p_reserve_minutes integer default 60
)
returns setof stock_items
language plpgsql
as $$
declare
  v_ids uuid[];
begin
  update stock_items
  set status = 'available', order_id = null, reserved_until = null
  where product_id = p_product_id and status = 'reserved' and reserved_until < now();

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
    set status = 'reserved', order_id = p_order_id,
        reserved_until = now() + (p_reserve_minutes || ' minutes')::interval
    where id = any(v_ids)
    returning *;
end;
$$;

-- 3. Fungsi release_order_stock (dipanggil pas checkout gagal/order expired)
create or replace function release_order_stock(p_order_id uuid)
returns void
language sql
as $$
  update stock_items
  set status = 'available', order_id = null, reserved_until = null
  where order_id = p_order_id and status = 'reserved';
$$;

-- 4. Fungsi fulfill_order_item (dipanggil pas pembayaran sukses / tandai
--    lunas manual) -- menggantikan fungsi assign_stock yang lama.
create or replace function fulfill_order_item(p_order_id uuid, p_product_id uuid, p_quantity integer)
returns setof stock_items
language plpgsql
as $$
declare
  v_finalized integer;
  v_need integer;
  v_new_ids uuid[];
begin
  update stock_items
  set status = 'sold', sold_at = now(), reserved_until = null
  where order_id = p_order_id and product_id = p_product_id and status = 'reserved';
  get diagnostics v_finalized = row_count;

  v_need := p_quantity - v_finalized;

  if v_need > 0 then
    update stock_items
    set status = 'available', order_id = null, reserved_until = null
    where product_id = p_product_id and status = 'reserved' and reserved_until < now();

    select array_agg(id) into v_new_ids
    from (
      select id from stock_items
      where product_id = p_product_id and status = 'available'
      order by created_at asc
      limit v_need
      for update skip locked
    ) sub;

    if v_new_ids is null or array_length(v_new_ids, 1) is distinct from v_need then
      raise exception 'INSUFFICIENT_STOCK: butuh % lagi stok untuk produk %, hanya tersedia %',
        v_need, p_product_id, coalesce(array_length(v_new_ids, 1), 0);
    end if;

    update stock_items
    set status = 'sold', order_id = p_order_id, sold_at = now(), reserved_until = null
    where id = any(v_new_ids);
  end if;

  return query
    select * from stock_items
    where order_id = p_order_id and product_id = p_product_id and status = 'sold';
end;
$$;

-- 5. assign_stock lama sudah gak dipakai kode terbaru, boleh dihapus.
drop function if exists assign_stock(uuid, uuid, integer);
