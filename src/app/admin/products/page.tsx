import { supabaseAdmin } from "@/lib/supabase";
import { formatIDR } from "@/lib/utils";
import { createProduct, toggleProductActive, deleteProduct } from "../actions";

export default async function AdminProductsPage() {
  const { data: products } = await supabaseAdmin
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Produk</h1>

      <form action={createProduct} className="card p-4 space-y-3 mb-8">
        <h2 className="font-semibold">Tambah Produk Baru</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <input name="name" placeholder="Nama produk, mis. Netflix Premium" className="input" required />
          <input name="price" type="number" min={0} placeholder="Harga (Rp)" className="input" required />
          <input name="duration_label" placeholder="Durasi default, mis. 1 Bulan" className="input" />
          <input name="image_url" placeholder="URL gambar (opsional)" className="input" />
        </div>
        <textarea name="description" placeholder="Deskripsi produk (opsional)" className="input" rows={3} />
        <button type="submit" className="btn-primary">Simpan Produk</button>
      </form>

      <div className="space-y-2">
        {(products || []).map((p) => (
          <div key={p.id} className="card p-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">{p.name}</p>
              <p className="text-sm text-muted">
                {formatIDR(p.price)} {p.duration_label ? `· ${p.duration_label}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${
                  p.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-surface2 text-muted"
                }`}
              >
                {p.is_active ? "Aktif" : "Nonaktif"}
              </span>
              <form action={toggleProductActive}>
                <input type="hidden" name="product_id" value={p.id} />
                <input type="hidden" name="next_active" value={(!p.is_active).toString()} />
                <button className="btn-secondary !py-1.5 !px-3 text-sm">
                  {p.is_active ? "Nonaktifkan" : "Aktifkan"}
                </button>
              </form>
              <form action={deleteProduct}>
                <input type="hidden" name="product_id" value={p.id} />
                <button className="text-red-400 hover:text-red-300 text-sm px-2">Hapus</button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
