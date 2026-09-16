"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/CartProvider";
import { formatIDR } from "@/lib/utils";

export default function CartPage() {
  const { items, setQuantity, removeItem, totalPrice } = useCart();
  const router = useRouter();

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted mb-4">Keranjang kamu masih kosong.</p>
        <Link href="/" className="btn-primary inline-block">
          Lihat Produk
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Keranjang</h1>

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.productId} className="card p-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-lg bg-surface2 flex items-center justify-center shrink-0 overflow-hidden">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
              ) : (
                <span className="font-bold text-muted">{item.name.charAt(0)}</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{item.name}</p>
              <p className="text-sm text-muted">{formatIDR(item.price)}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                className="btn-secondary !px-2.5 !py-1.5"
                onClick={() => setQuantity(item.productId, item.quantity - 1)}
              >
                −
              </button>
              <span className="w-8 text-center">{item.quantity}</span>
              <button
                className="btn-secondary !px-2.5 !py-1.5"
                onClick={() => setQuantity(item.productId, item.quantity + 1)}
              >
                +
              </button>
            </div>

            <button
              onClick={() => removeItem(item.productId)}
              className="text-red-400 hover:text-red-300 text-sm ml-2"
            >
              Hapus
            </button>
          </div>
        ))}
      </div>

      <div className="card p-4 mt-6 flex items-center justify-between">
        <span className="text-muted">Total</span>
        <span className="text-xl font-bold">{formatIDR(totalPrice)}</span>
      </div>

      <button onClick={() => router.push("/checkout")} className="btn-primary w-full mt-4">
        Lanjut ke Checkout
      </button>
    </div>
  );
}
