import nodemailer from "nodemailer";
import { formatIDR } from "./utils";

// Kirim email pakai akun Gmail biasa lewat SMTP + App Password
// (bukan email custom/domain sendiri). Setup: lihat README bagian
// "Setup Email (Gmail)".
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export interface DeliveredItem {
  productName: string;
  credentialEmail?: string | null;
  credentialPassword?: string | null;
  credentialExtra?: string | null;
  durationLabel?: string | null;
}

export interface InvoiceEmailParams {
  to: string;
  customerName?: string | null;
  invoiceNumber: string;
  totalAmount: number;
  items: DeliveredItem[];
  paidAt: Date;
}

// Dikirim setelah webhook DOKU konfirmasi pembayaran sukses. Isinya
// invoice + kredensial akun/lisensi yang baru saja dijatahkan ke order ini.
export async function sendInvoiceEmail(params: InvoiceEmailParams) {
  const itemsHtml = params.items
    .map(
      (item) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #2a2a2e;">
          <div style="font-weight:600;color:#fafafa;">${escapeHtml(item.productName)}</div>
          ${item.durationLabel ? `<div style="color:#8b8b93;font-size:13px;">Durasi: ${escapeHtml(item.durationLabel)}</div>` : ""}
          <div style="margin-top:8px;background:#1c1c1f;border:1px solid #2a2a2e;border-radius:8px;padding:10px 12px;font-family:monospace;font-size:13px;color:#d4d4d8;">
            ${item.credentialEmail ? `Email/Username: ${escapeHtml(item.credentialEmail)}<br/>` : ""}
            ${item.credentialPassword ? `Password: ${escapeHtml(item.credentialPassword)}<br/>` : ""}
            ${item.credentialExtra ? `Catatan: ${escapeHtml(item.credentialExtra)}` : ""}
          </div>
        </td>
      </tr>`
    )
    .join("");

  const html = `
  <div style="background:#0a0a0b;padding:32px 16px;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#141416;border:1px solid #2a2a2e;border-radius:16px;overflow:hidden;">
      <div style="padding:24px 24px 0 24px;">
        <div style="color:#818cf8;font-weight:700;font-size:14px;letter-spacing:0.05em;">PEMBAYARAN BERHASIL</div>
        <h1 style="color:#fafafa;font-size:20px;margin:8px 0 0 0;">Invoice ${escapeHtml(params.invoiceNumber)}</h1>
        <p style="color:#8b8b93;font-size:14px;">
          ${params.customerName ? `Halo ${escapeHtml(params.customerName)}, ` : ""}pesananmu sudah kami proses. Berikut detail akun/lisensimu.
        </p>
      </div>
      <table style="width:100%;border-collapse:collapse;padding:0 24px;margin:0 24px;width:calc(100% - 48px);">
        ${itemsHtml}
      </table>
      <div style="padding:16px 24px;display:flex;justify-content:space-between;border-top:1px solid #2a2a2e;">
        <span style="color:#8b8b93;">Total dibayar</span>
        <strong style="color:#fafafa;">${formatIDR(params.totalAmount)}</strong>
      </div>
      <div style="padding:0 24px 24px 24px;color:#65656b;font-size:12px;">
        Dibayar pada ${params.paidAt.toLocaleString("id-ID")}. Simpan email ini sebagai bukti pembelian.
        Jangan bagikan kredensial di atas ke siapa pun.
      </div>
    </div>
  </div>`;

  const fromName = process.env.EMAIL_FROM_NAME || "AkunStore";

  await transporter.sendMail({
    from: `"${fromName}" <${process.env.GMAIL_USER}>`,
    to: params.to,
    subject: `Invoice ${params.invoiceNumber} — Pembayaran berhasil`,
    html,
  });
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
