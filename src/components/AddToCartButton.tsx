"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "./CartProvider";
import type { Product } from "@/lib/types";

export default function AddToCartButton({ product }: { product: Product }) {
  const { addItem } = useCart();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const outOfStock = (product.stock_count ?? 0) <= 0;
  const maxQty = product.stock_count ?? 1;

  function buildItem() {
    return {
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      imageUrl: product.image_url,
    };
  }

  if (outOfStock) {
    return (
      <button disabled className="btn-secondary w-full opacity-50 cursor-not-allowed">
        Stok Habis
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button
          className="btn-secondary !px-3 !py-2"
          onClick={() => setQty((q) => Math.max(1, q - 1))}
        >
          −
        </button>
        <span className="w-10 text-center font-medium">{qty}</span>
        <button
          className="btn-secondary !px-3 !py-2"
          onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
        >
          +
        </button>
        <span className="text-xs text-muted">maks. {maxQty}</span>
      </div>

      <div className="flex gap-2">
        <button className="btn-secondary flex-1" onClick={() => addItem(buildItem(), qty)}>
          Tambah ke Keranjang
        </button>
        <button
          className="btn-primary flex-1"
          onClick={() => {
            addItem(buildItem(), qty);
            router.push("/checkout");
          }}
        >
          Beli Sekarang
        </button>
      </div>
    </div>
  );
}
