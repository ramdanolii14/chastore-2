"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/CartProvider";
import { useSession } from "@/lib/auth-client";
import { formatIDR } from "@/lib/utils";

export default function CheckoutPage() {
  const { items, totalPrice, clear } = useCart();
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Gagal membuat pesanan. Coba lagi.");
        setLoading(false);
        return;
      }

      clear();
      window.location.href = data.paymentUrl;
    } catch (e) {
      setError("Terjadi kesalahan jaringan. Coba lagi.");
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return <p className="text-muted text-center py-16">Keranjang kosong, tidak ada yang bisa dibayar.</p>;
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>

      <div className="card p-4 space-y-2 mb-4">
        {items.map((item) => (
          <div key={item.productId} className="flex justify-between text-sm">
            <span>
              {item.name} <span className="text-muted">x{item.quantity}</span>
            </span>
            <span>{formatIDR(item.price * item.quantity)}</span>
          </div>
        ))}
        <div className="border-t border-border pt-2 flex justify-between font-bold">
          <span>Total</span>
          <span>{formatIDR(totalPrice)}</span>
        </div>
      </div>

      <div className="card p-4 mb-4 text-sm text-muted">
        Invoice dan detail akun/lisensi akan dikirim ke{" "}
        <span className="text-white font-medium">{session?.user?.email}</span> setelah
        pembayaran berhasil.
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3 mb-4">
          {error}
        </div>
      )}

      <button onClick={handlePay} disabled={loading} className="btn-primary w-full">
        {loading ? "Memproses..." : `Bayar ${formatIDR(totalPrice)} via DOKU`}
      </button>
    </div>
  );
}
