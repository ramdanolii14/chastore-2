import { supabaseAdmin } from "@/lib/supabase";
import { formatIDR } from "@/lib/utils";

export default async function AdminDashboard() {
  const [{ count: productCount }, { count: availableStock }, { data: paidOrders }] =
    await Promise.all([
      supabaseAdmin.from("products").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("stock_items")
        .select("id", { count: "exact", head: true })
        .eq("status", "available"),
      supabaseAdmin.from("orders").select("total_amount").eq("status", "paid"),
    ]);

  const revenue = (paidOrders || []).reduce((sum, o) => sum + o.total_amount, 0);

  const stats = [
    { label: "Produk Aktif", value: productCount ?? 0 },
    { label: "Stok Tersedia", value: availableStock ?? 0 },
    { label: "Pesanan Lunas", value: paidOrders?.length ?? 0 },
    { label: "Total Pendapatan", value: formatIDR(revenue) },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-sm text-muted">{s.label}</p>
            <p className="text-xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
