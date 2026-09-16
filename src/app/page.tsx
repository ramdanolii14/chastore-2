import { supabaseAdmin } from "@/lib/supabase";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/lib/types";

export const revalidate = 30;

async function getProducts(): Promise<Product[]> {
  const { data: products, error } = await supabaseAdmin
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error || !products) return [];

  const { data: stockRows } = await supabaseAdmin
    .from("stock_items")
    .select("product_id")
    .eq("status", "available");

  const counts = new Map<string, number>();
  for (const row of stockRows || []) {
    counts.set(row.product_id, (counts.get(row.product_id) || 0) + 1);
  }

  return products.map((p) => ({ ...p, stock_count: counts.get(p.id) || 0 }));
}

export default async function HomePage() {
  const products = await getProducts();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Akun & Lisensi Premium</h1>
        <p className="text-muted mt-1">
          Beli akun media sosial dan lisensi software, langsung dikirim ke email kamu.
        </p>
      </div>

      {products.length === 0 ? (
        <p className="text-muted">Belum ada produk yang tersedia.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
