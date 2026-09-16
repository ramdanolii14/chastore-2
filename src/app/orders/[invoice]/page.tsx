import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { formatIDR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: { params: { invoice: string } }) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session?.user) redirect(`/login?next=/orders/${params.invoice}`);

  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("*, order_items(*)")
    .eq("invoice_number", params.invoice)
    .single();

  if (!order || order.user_id !== session.user.id) notFound();

  const { data: stockItems } = await supabaseAdmin
    .from("stock_items")
    .select("*")
    .eq("order_id", order.id);

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-1">{order.invoice_number}</h1>
      <p className="text-muted mb-6">{new Date(order.created_at).toLocaleString("id-ID")}</p>

      <div className="card p-4 space-y-2 mb-4">
        {order.order_items.map((item: any) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span>
              {item.product_name} <span className="text-muted">x{item.quantity}</span>
            </span>
            <span>{formatIDR(item.subtotal)}</span>
          </div>
        ))}
        <div className="border-t border-border pt-2 flex justify-between font-bold">
          <span>Total</span>
          <span>{formatIDR(order.total_amount)}</span>
        </div>
      </div>

      {order.status === "pending" && order.payment_url && (
        <div className="card p-4 text-center">
          <p className="text-amber-400 font-medium mb-3">Menunggu pembayaran</p>
          <a href={order.payment_url} className="btn-primary inline-block">
            Lanjutkan Pembayaran
          </a>
          <p className="text-xs text-muted mt-3">
            Sudah bayar tapi status belum berubah? Coba muat ulang halaman ini beberapa saat lagi.
          </p>
        </div>
      )}

      {order.status === "paid" && (
        <div className="card p-4">
          <p className="text-emerald-400 font-medium mb-3">
            Pembayaran berhasil — detail juga sudah dikirim ke {order.customer_email}
          </p>
          <div className="space-y-3">
            {stockItems?.map((stock) => (
              <div key={stock.id} className="bg-surface2 border border-border rounded-lg p-3 font-mono text-sm">
                {stock.credential_email && <div>Email/Username: {stock.credential_email}</div>}
                {stock.credential_password && <div>Password: {stock.credential_password}</div>}
                {stock.credential_extra && <div>Catatan: {stock.credential_extra}</div>}
                {stock.duration_label && (
                  <div className="text-muted">Durasi: {stock.duration_label}</div>
                )}
              </div>
            ))}
            {(!stockItems || stockItems.length === 0) && (
              <p className="text-sm text-muted">
                Pembayaran diterima, akun sedang disiapkan admin. Cek email kamu secara berkala.
              </p>
            )}
          </div>
        </div>
      )}

      {(order.status === "cancelled" || order.status === "expired") && (
        <div className="card p-4 text-center text-red-400 font-medium">
          Pesanan {order.status === "cancelled" ? "dibatalkan" : "kedaluwarsa"}.
        </div>
      )}
    </div>
  );
}
