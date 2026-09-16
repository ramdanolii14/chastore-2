import { supabaseAdmin } from "@/lib/supabase";
import { formatIDR } from "@/lib/utils";
import { markOrderPaidManually } from "../actions";

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-400",
  paid: "bg-emerald-500/10 text-emerald-400",
  expired: "bg-red-500/10 text-red-400",
  cancelled: "bg-red-500/10 text-red-400",
};

export default async function AdminOrdersPage() {
  const { data: orders } = await supabaseAdmin
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Semua Pesanan</h1>
      <p className="text-sm text-muted mb-6">
        Pakai "Tandai Lunas Manual" HANYA setelah kamu cek sendiri di dashboard DOKU
        bahwa pembayarannya beneran sukses — jangan asal klik karena kata pembeli doang.
      </p>
      <div className="space-y-2">
        {(orders || []).map((o) => (
          <div key={o.id} className="card p-4 flex items-center justify-between gap-3 text-sm">
            <div>
              <p className="font-medium">{o.invoice_number}</p>
              <p className="text-muted">{o.customer_email}</p>
              <p className="text-muted text-xs">{new Date(o.created_at).toLocaleString("id-ID")}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <p className="font-bold">{formatIDR(o.total_amount)}</p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[o.status]}`}>
                  {o.status}
                </span>
              </div>
              {o.status === "pending" && (
                <form action={markOrderPaidManually}>
                  <input type="hidden" name="order_id" value={o.id} />
                  <button className="btn-secondary !py-1.5 !px-3 text-xs whitespace-nowrap">
                    Tandai Lunas Manual
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
        {(!orders || orders.length === 0) && <p className="text-muted">Belum ada pesanan.</p>}
      </div>
    </div>
  );
}
