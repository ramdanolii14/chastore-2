import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { createDokuPayment } from "@/lib/doku";
import { generateInvoiceNumber } from "@/lib/utils";

const bodySchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1).max(50),
      })
    )
    .min(1),
});

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Kamu harus login dulu." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Data pesanan tidak valid." }, { status: 400 });
  }

  const requestedItems = parsed.data.items;
  const productIds = requestedItems.map((i) => i.productId);

  const { data: products, error: productErr } = await supabaseAdmin
    .from("products")
    .select("id, name, price, is_active")
    .in("id", productIds);

  if (productErr || !products || products.length !== productIds.length) {
    return NextResponse.json({ error: "Ada produk yang tidak ditemukan." }, { status: 400 });
  }

  const productMap = new Map(products.map((p) => [p.id, p]));

  // Cek stok tersedia untuk tiap item (validasi awal; penjatahan final &
  // atomik tetap terjadi di webhook lewat fungsi assign_stock).
  for (const item of requestedItems) {
    const product = productMap.get(item.productId);
    if (!product || !product.is_active) {
      return NextResponse.json({ error: "Salah satu produk tidak aktif." }, { status: 400 });
    }
    const { count } = await supabaseAdmin
      .from("stock_items")
      .select("id", { count: "exact", head: true })
      .eq("product_id", item.productId)
      .eq("status", "available");

    if ((count || 0) < item.quantity) {
      return NextResponse.json(
        { error: `Stok "${product.name}" tidak cukup (sisa ${count || 0}).` },
        { status: 400 }
      );
    }
  }

  const totalAmount = requestedItems.reduce((sum, item) => {
    const product = productMap.get(item.productId)!;
    return sum + product.price * item.quantity;
  }, 0);

  const invoiceNumber = generateInvoiceNumber();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  const { data: order, error: orderErr } = await supabaseAdmin
    .from("orders")
    .insert({
      invoice_number: invoiceNumber,
      user_id: session.user.id,
      customer_email: session.user.email,
      customer_name: session.user.name,
      total_amount: totalAmount,
      status: "pending",
    })
    .select()
    .single();

  if (orderErr || !order) {
    return NextResponse.json({ error: "Gagal membuat pesanan." }, { status: 500 });
  }

  const orderItemsPayload = requestedItems.map((item) => {
    const product = productMap.get(item.productId)!;
    return {
      order_id: order.id,
      product_id: item.productId,
      product_name: product.name,
      unit_price: product.price,
      quantity: item.quantity,
      subtotal: product.price * item.quantity,
    };
  });

  await supabaseAdmin.from("order_items").insert(orderItemsPayload);

  try {
    const payment = await createDokuPayment({
      invoiceNumber,
      amount: totalAmount,
      customerName: session.user.name || undefined,
      customerEmail: session.user.email,
      callbackUrl: `${appUrl}/orders/${invoiceNumber}`,
      lineItems: orderItemsPayload.map((i) => ({
        name: i.product_name,
        quantity: i.quantity,
        price: i.unit_price,
      })),
    });

    await supabaseAdmin
      .from("orders")
      .update({
        payment_url: payment.paymentUrl,
        payment_token: payment.tokenId,
        doku_response: payment.raw as any,
      })
      .eq("id", order.id);

    return NextResponse.json({ paymentUrl: payment.paymentUrl, invoiceNumber });
  } catch (err) {
    console.error("DOKU createPayment error:", err);
    await supabaseAdmin.from("orders").update({ status: "cancelled" }).eq("id", order.id);
    return NextResponse.json(
      { error: "Gagal membuat link pembayaran. Coba lagi sebentar lagi." },
      { status: 502 }
    );
  }
}
