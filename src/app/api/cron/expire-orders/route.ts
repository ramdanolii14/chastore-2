import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// Dipanggil berkala oleh Vercel Cron (lihat vercel.json) buat cari order
// "pending" yang udah lama banget dan gak kunjung dibayar, lalu melepas
// reservasi stoknya balik ke "available".
//
// CATATAN: ini cuma pelengkap. reserve_stock() di database sudah
// otomatis melepas reservasi kedaluwarsa dengan sendirinya begitu ada
// orang lain coba checkout produk yang sama -- jadi sistem tetap aman
// walau cron ini belum/tidak di-setup.
const EXPIRE_AFTER_MINUTES = 65; // sedikit di atas RESERVE_MINUTES di checkout

export async function GET(req: NextRequest) {
  // Vercel Cron mengirim header ini otomatis; kalau CRON_SECRET di-set,
  // cek biar endpoint ini gak bisa dipanggil sembarangan orang dari luar.
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - EXPIRE_AFTER_MINUTES * 60 * 1000).toISOString();

  const { data: staleOrders } = await supabaseAdmin
    .from("orders")
    .select("id, invoice_number")
    .eq("status", "pending")
    .lt("created_at", cutoff);

  for (const order of staleOrders || []) {
    await supabaseAdmin.rpc("release_order_stock", { p_order_id: order.id });
    await supabaseAdmin.from("orders").update({ status: "expired" }).eq("id", order.id);
  }

  return NextResponse.json({ expired: staleOrders?.length || 0 });
}
