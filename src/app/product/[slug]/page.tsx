import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import { formatIDR } from "@/lib/utils";
import AddToCartButton from "@/components/AddToCartButton";
import type { Product } from "@/lib/types";

async function getProduct(slug: string): Promise<Product | null> {
  const { data: product } = await supabaseAdmin
    .from("products")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!product) return null;

  const { count } = await supabaseAdmin
    .from("stock_items")
    .select("id", { count: "exact", head: true })
    .eq("product_id", product.id)
    .eq("status", "available");

  return { ...product, stock_count: count || 0 };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProduct(params.slug);
  if (!product) notFound();

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="aspect-video card overflow-hidden flex items-center justify-center">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-5xl font-bold text-muted">{product.name.charAt(0)}</span>
        )}
      </div>

      <div>
        <h1 className="text-2xl font-bold">{product.name}</h1>
        {product.duration_label && (
          <p className="text-muted mt-1">Durasi: {product.duration_label}</p>
        )}
        <p className="text-3xl font-bold text-accent2 mt-4">{formatIDR(product.price)}</p>

        {product.description && (
          <p className="text-muted mt-4 whitespace-pre-line">{product.description}</p>
        )}

        <div className="mt-6">
          <AddToCartButton product={product} />
        </div>
      </div>
    </div>
  );
}
