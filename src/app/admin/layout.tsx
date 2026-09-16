import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, isAdminEmail } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: headers() });

  if (!session?.user) redirect("/login?next=/admin");
  if (!isAdminEmail(session.user.email)) {
    return (
      <div className="text-center py-16">
        <p className="text-red-400 font-medium">
          Akun ini tidak punya akses admin. Pastikan email kamu ada di ADMIN_EMAILS.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-1 mb-6 border-b border-border pb-3">
        <Link href="/admin" className="btn-secondary !py-1.5 !px-3 text-sm">
          Dashboard
        </Link>
        <Link href="/admin/products" className="btn-secondary !py-1.5 !px-3 text-sm">
          Produk
        </Link>
        <Link href="/admin/stock" className="btn-secondary !py-1.5 !px-3 text-sm">
          Stok
        </Link>
        <Link href="/admin/orders" className="btn-secondary !py-1.5 !px-3 text-sm">
          Pesanan
        </Link>
      </div>
      {children}
    </div>
  );
}
