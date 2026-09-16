import { supabaseAdmin } from "@/lib/supabase";
import { addStockItem, bulkAddStock, deleteStockItem } from "../actions";

export default async function AdminStockPage() {
  const { data: products } = await supabaseAdmin
    .from("products")
    .select("id, name")
    .order("name");

  const { data: stockItems } = await supabaseAdmin
    .from("stock_items")
    .select("*, products(name)")
    .eq("status", "available")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Stok Akun / Lisensi</h1>

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <form action={addStockItem} className="card p-4 space-y-3">
          <h2 className="font-semibold">Tambah 1 Stok</h2>
          <select name="product_id" className="input" required defaultValue="">
            <option value="" disabled>Pilih produk</option>
            {(products || []).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <input name="credential_email" placeholder="Email / username akun" className="input" />
          <input name="credential_password" placeholder="Password" className="input" />
          <input name="credential_extra" placeholder="Catatan / license key (opsional)" className="input" />
          <input name="duration_label" placeholder="Durasi, mis. 1 Bulan / Lifetime" className="input" />
          <button type="submit" className="btn-primary w-full">Tambah Stok</button>
        </form>

        <form action={bulkAddStock} className="card p-4 space-y-3">
          <h2 className="font-semibold">Tambah Banyak Sekaligus</h2>
          <select name="product_id" className="input" required defaultValue="">
            <option value="" disabled>Pilih produk</option>
            {(products || []).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <input name="duration_label" placeholder="Durasi untuk semua baris, mis. 1 Bulan" className="input" />
          <textarea
            name="bulk_text"
            placeholder={"email@x.com;password123;catatan opsional\nemail2@x.com;password456"}
            className="input font-mono text-xs"
            rows={6}
          />
          <p className="text-xs text-muted">Format per baris: email;password;catatan (catatan opsional)</p>
          <button type="submit" className="btn-primary w-full">Tambah Semua</button>
        </form>
      </div>

      <h2 className="font-semibold mb-3">Stok Tersedia ({stockItems?.length ?? 0})</h2>
      <div className="space-y-2">
        {(stockItems || []).map((s: any) => (
          <div key={s.id} className="card p-3 flex items-center justify-between gap-3 text-sm">
            <div className="font-mono">
              <span className="text-accent2 font-sans font-medium">{s.products?.name}</span>
              {s.credential_email && ` · ${s.credential_email}`}
              {s.credential_password && ` · ${s.credential_password}`}
              {s.duration_label && ` · ${s.duration_label}`}
            </div>
            <form action={deleteStockItem}>
              <input type="hidden" name="stock_id" value={s.id} />
              <button className="text-red-400 hover:text-red-300 shrink-0">Hapus</button>
            </form>
          </div>
        ))}
        {(!stockItems || stockItems.length === 0) && (
          <p className="text-muted text-sm">Belum ada stok tersedia.</p>
        )}
      </div>
    </div>
  );
}
