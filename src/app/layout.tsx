import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "AkunStore — Akun Premium & Lisensi",
  description: "Jual akun media sosial dan lisensi software, kirim otomatis via email.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen flex flex-col">
        <CartProvider>
          <Navbar />
          <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">{children}</main>
          <footer className="border-t border-border py-6 text-center text-sm text-muted">
            &copy; {new Date().getFullYear()} AkunStore. Semua transaksi diproses aman lewat DOKU.
          </footer>
        </CartProvider>
      </body>
    </html>
  );
}
