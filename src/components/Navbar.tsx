"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";
import { useSession, signOut, signIn } from "@/lib/auth-client";

export default function Navbar() {
  const { totalItems } = useCart();
  const { data: session, isPending } = useSession();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg tracking-tight">
          Akun<span className="text-accent">Store</span>
        </Link>

        <nav className="flex items-center gap-2">
          <Link
            href="/cart"
            className="relative px-3 py-2 rounded-lg hover:bg-surface2 text-sm font-medium"
          >
            Keranjang
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-accent text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </Link>

          {!isPending && session?.user && (
            <Link
              href="/orders"
              className="px-3 py-2 rounded-lg hover:bg-surface2 text-sm font-medium"
            >
              Pesanan
            </Link>
          )}

          {!isPending && session?.user ? (
            <div className="flex items-center gap-2 ml-1">
              <span className="text-sm text-muted hidden sm:inline">
                {session.user.name || session.user.email}
              </span>
              <button
                onClick={() => signOut()}
                className="btn-secondary !px-3 !py-1.5 text-sm"
              >
                Keluar
              </button>
            </div>
          ) : (
            !isPending && (
              <button
                onClick={() =>
                  signIn.social({ provider: "google", callbackURL: "/" })
                }
                className="btn-primary !px-3 !py-1.5 text-sm ml-1"
              >
                Masuk dengan Google
              </button>
            )
          )}
        </nav>
      </div>
    </header>
  );
}
