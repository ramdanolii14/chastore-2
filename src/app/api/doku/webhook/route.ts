import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyDokuNotificationSignature } from "@/lib/doku";
import { sendInvoiceEmail } from "@/lib/email";

// URL ini yang harus didaftarkan sebagai "Notification URL" di DOKU Back
// Office: https://domainmu.com/api/doku/webhook
const NOTIFICATION_PATH = "/api/doku/webhook";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const clientId = req.headers.get("client-id") || "";
  const requestId = req.headers.get("request-id") || "";
  const timestamp = req.headers.get("request-timestamp") || "";
  const signature = req.headers.get("signature") || "";

  const isValid = verifyDokuNotificationSignature({
    requestId,
    timestamp,
    requestTarget: NOTIFICATION_PATH,
    rawBody,
    receivedSignature: signature,
  });

  if (!isValid) {
    console.error("DOKU webhook: signature tidak valid", { clientId, requestId });
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const status = payload?.transaction?.status;
  const invoiceNumber = payload?.order?.invoice_number;

  // Sesuai best practice DOKU Checkout: abaikan status FAILED, karena
  // customer masih bisa retry / ganti metode bayar di halaman Checkout.
  if (status !== "SUCCESS" || !invoiceNumber) {
    return NextResponse.json({ message: "ignored" }, { status: 200 });
  }

  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("*, order_items(*)")
    .eq("invoice_number", invoiceNumber)
    .single();

  if (!order) {
    console.error("DOKU webhook: order tidak ditemukan", invoiceNumber);
    return NextResponse.json({ error: "order not found" }, { status: 404 });
  }

  // Idempoten: kalau sudah diproses sebelumnya, langsung ack tanpa ulang.
  if (order.status === "paid") {
    return NextResponse.json({ message: "already processed" }, { status: 200 });
  }

  const deliveredItems: {
    productName: string;
    credentialEmail?: string | null;
    credentialPassword?: string | null;
    credentialExtra?: string | null;
    durationLabel?: string | null;
  }[] = [];

  try {
    for (const item of order.order_items as any[]) {
      // fulfill_order_item finalisasi stok yang udah direservasi pas
      // checkout (status reserved -> sold). Kalau karena suatu hal
      // reservasinya kurang/sudah expired, fungsi ini otomatis coba
      // ambil dari stok available yang tersisa.
      const { data: assigned, error: assignErr } = await supabaseAdmin.rpc("fulfill_order_item", {
        p_order_id: order.id,
        p_product_id: item.product_id,
        p_quantity: item.quantity,
      });

      if (assignErr) throw assignErr;

      for (const stock of assigned || []) {
        deliveredItems.push({
          productName: item.product_name,
          credentialEmail: stock.credential_email,
          credentialPassword: stock.credential_password,
          credentialExtra: stock.credential_extra,
          durationLabel: stock.duration_label,
        });
      }
    }

    const paidAt = new Date();
    await supabaseAdmin
      .from("orders")
      .update({ status: "paid", paid_at: paidAt.toISOString() })
      .eq("id", order.id);

    await sendInvoiceEmail({
      to: order.customer_email,
      customerName: order.customer_name,
      invoiceNumber: order.invoice_number,
      totalAmount: order.total_amount,
      items: deliveredItems,
      paidAt,
    });

    return NextResponse.json({ message: "ok" }, { status: 200 });
  } catch (err) {
    // Stok kurang / gagal kirim email di sisi kita. Tetap ack 200 ke DOKU
    // (pembayaran sudah sah, jangan sampai DOKU retry terus), tapi order
    // TIDAK ditandai "paid" supaya admin tahu perlu fulfillment manual.
    console.error("DOKU webhook: gagal fulfillment order", invoiceNumber, err);
    return NextResponse.json({ message: "payment ok, fulfillment pending" }, { status: 200 });
  }
}
