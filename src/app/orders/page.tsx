import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { formatIDR } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu Pembayaran",
  paid: "Lunas",
  expired: "Kedaluwarsa",
  cancelled: "Dibatalkan",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-400",
  paid: "bg-emerald-500/10 text-emerald-400",
  expired: "bg-red-500/10 text-red-400",
  cancelled: "bg-red-500/10 text-red-400",
};

export default async function OrdersPage() {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session?.user) redirect("/login?next=/orders");

  const { data: orders } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Pesanan Saya</h1>

      {!orders || orders.length === 0 ? (
        <p className="text-muted">Belum ada pesanan.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.invoice_number}`}
              className="card p-4 flex items-center justify-between hover:border-accent/60 transition-colors"
            >
              <div>
                <p className="font-medium">{order.invoice_number}</p>
                <p className="text-sm text-muted">
                  {new Date(order.created_at).toLocaleString("id-ID")}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold">{formatIDR(order.total_amount)}</p>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[order.status]}`}
                >
                  {STATUS_LABEL[order.status]}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
