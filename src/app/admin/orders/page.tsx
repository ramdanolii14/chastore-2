import { supabaseAdmin } from "@/lib/supabase";
import { formatIDR } from "@/lib/utils";

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
      <h1 className="text-2xl font-bold mb-6">Semua Pesanan</h1>
      <div className="space-y-2">
        {(orders || []).map((o) => (
          <div key={o.id} className="card p-4 flex items-center justify-between text-sm">
            <div>
              <p className="font-medium">{o.invoice_number}</p>
              <p className="text-muted">{o.customer_email}</p>
            </div>
            <div className="text-right">
              <p className="font-bold">{formatIDR(o.total_amount)}</p>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[o.status]}`}>
                {o.status}
              </span>
            </div>
          </div>
        ))}
        {(!orders || orders.length === 0) && <p className="text-muted">Belum ada pesanan.</p>}
      </div>
    </div>
  );
}
