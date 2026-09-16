"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth, isAdminEmail } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { slugify } from "@/lib/utils";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session?.user || !isAdminEmail(session.user.email)) {
    throw new Error("Bukan admin.");
  }
}

export async function createProduct(formData: FormData) {
  await requireAdmin();

  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const price = Number(formData.get("price"));
  const durationLabel = String(formData.get("duration_label") || "").trim();
  const imageUrl = String(formData.get("image_url") || "").trim();

  if (!name || !price || price < 0) {
    throw new Error("Nama dan harga produk wajib diisi.");
  }

  const slug = slugify(name) + "-" + Math.random().toString(36).slice(2, 6);

  const { error } = await supabaseAdmin.from("products").insert({
    name,
    slug,
    description: description || null,
    price,
    duration_label: durationLabel || null,
    image_url: imageUrl || null,
    is_active: true,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/products");
  revalidatePath("/");
}

export async function toggleProductActive(formData: FormData) {
  await requireAdmin();
  const productId = String(formData.get("product_id") || "");
  const nextActive = String(formData.get("next_active")) === "true";
  const { error } = await supabaseAdmin
    .from("products")
    .update({ is_active: nextActive })
    .eq("id", productId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/products");
  revalidatePath("/");
}

export async function deleteProduct(formData: FormData) {
  await requireAdmin();
  const productId = String(formData.get("product_id") || "");
  const { error } = await supabaseAdmin.from("products").delete().eq("id", productId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/products");
  revalidatePath("/");
}

// Ini bagian "nge-stok" yang ditanya: produk apa, email & password-nya
// apa, dan durasinya berapa lama.
export async function addStockItem(formData: FormData) {
  await requireAdmin();

  const productId = String(formData.get("product_id") || "");
  const credentialEmail = String(formData.get("credential_email") || "").trim();
  const credentialPassword = String(formData.get("credential_password") || "").trim();
  const credentialExtra = String(formData.get("credential_extra") || "").trim();
  const durationLabel = String(formData.get("duration_label") || "").trim();

  if (!productId) throw new Error("Pilih produk dulu.");
  if (!credentialEmail && !credentialPassword && !credentialExtra) {
    throw new Error("Isi minimal salah satu: email, password, atau catatan/lisensi.");
  }

  const { error } = await supabaseAdmin.from("stock_items").insert({
    product_id: productId,
    credential_email: credentialEmail || null,
    credential_password: credentialPassword || null,
    credential_extra: credentialExtra || null,
    duration_label: durationLabel || null,
    status: "available",
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/stock");
  revalidatePath("/");
}

// Tempel banyak baris sekaligus, format per baris:
// email;password;catatan  (catatan opsional)
export async function bulkAddStock(formData: FormData) {
  await requireAdmin();

  const productId = String(formData.get("product_id") || "");
  const durationLabel = String(formData.get("duration_label") || "").trim();
  const bulkText = String(formData.get("bulk_text") || "");

  if (!productId) throw new Error("Pilih produk dulu.");

  const rows = bulkText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [email, password, ...rest] = line.split(";").map((s) => s.trim());
      return {
        product_id: productId,
        credential_email: email || null,
        credential_password: password || null,
        credential_extra: rest.join(";") || null,
        duration_label: durationLabel || null,
        status: "available" as const,
      };
    });

  if (rows.length === 0) return;

  const { error } = await supabaseAdmin.from("stock_items").insert(rows);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/stock");
  revalidatePath("/");
}

export async function deleteStockItem(formData: FormData) {
  await requireAdmin();
  const stockId = String(formData.get("stock_id") || "");
  const { error } = await supabaseAdmin
    .from("stock_items")
    .delete()
    .eq("id", stockId)
    .eq("status", "available"); // jangan pernah hapus stok yang sudah terjual
  if (error) throw new Error(error.message);
  revalidatePath("/admin/stock");
}
