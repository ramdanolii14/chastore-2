import Link from "next/link";
import { formatIDR } from "@/lib/utils";
import type { Product } from "@/lib/types";

export default function ProductCard({ product }: { product: Product }) {
  const outOfStock = (product.stock_count ?? 0) <= 0;

  return (
    <Link
      href={`/product/${product.slug}`}
      className="card overflow-hidden hover:border-accent/60 transition-colors group"
    >
      <div className="aspect-video bg-surface2 flex items-center justify-center overflow-hidden">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <span className="text-3xl font-bold text-muted">
            {product.name.charAt(0)}
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-white truncate">{product.name}</h3>
        {product.duration_label && (
          <p className="text-xs text-muted mt-0.5">{product.duration_label}</p>
        )}
        <div className="flex items-center justify-between mt-3">
          <span className="font-bold text-accent2">{formatIDR(product.price)}</span>
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full ${
              outOfStock
                ? "bg-red-500/10 text-red-400"
                : "bg-emerald-500/10 text-emerald-400"
            }`}
          >
            {outOfStock ? "Stok habis" : `Stok ${product.stock_count}`}
          </span>
        </div>
      </div>
    </Link>
  );
}
