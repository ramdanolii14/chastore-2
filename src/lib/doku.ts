import crypto from "crypto";

// Integrasi DOKU Checkout (Jokul Checkout).
// Dokumentasi: https://developers.doku.com/accept-payments/doku-checkout
//
// Alur signature request (dihitung merchant -> DOKU):
//   Digest        = base64(sha256(rawJsonBody))
//   Signature raw = "Client-Id:{id}\nRequest-Id:{id}\nRequest-Timestamp:{ts}\nRequest-Target:{path}\nDigest:{digest}"
//   Signature     = "HMACSHA256=" + base64(hmac_sha256(raw, secretKey))
//
// Alur signature notifikasi (dihitung DOKU -> merchant, kita verifikasi):
//   sama seperti di atas tapi Request-Target = path notification URL kita,
//   dan header yang dipakai adalah yang dikirim DOKU di request notifikasi.

const DOKU_BASE_URL = process.env.DOKU_IS_PRODUCTION === "true"
  ? "https://api.doku.com"
  : "https://api-sandbox.doku.com";

const CHECKOUT_PATH = "/checkout/v1/payment";

function getEnv() {
  const clientId = process.env.DOKU_CLIENT_ID;
  const secretKey = process.env.DOKU_SECRET_KEY;
  if (!clientId || !secretKey) {
    throw new Error("DOKU_CLIENT_ID / DOKU_SECRET_KEY belum di-set");
  }
  return { clientId, secretKey };
}

function sha256Base64(input: string) {
  return crypto.createHash("sha256").update(input, "utf8").digest("base64");
}

function hmacSha256Base64(input: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(input, "utf8").digest("base64");
}

function buildSignatureString(opts: {
  clientId: string;
  requestId: string;
  timestamp: string;
  requestTarget: string;
  digest: string;
}) {
  return (
    `Client-Id:${opts.clientId}\n` +
    `Request-Id:${opts.requestId}\n` +
    `Request-Timestamp:${opts.timestamp}\n` +
    `Request-Target:${opts.requestTarget}\n` +
    `Digest:${opts.digest}`
  );
}

export interface CreatePaymentParams {
  invoiceNumber: string;
  amount: number; // IDR, tanpa desimal
  customerName?: string;
  customerEmail?: string;
  lineItems: { name: string; quantity: number; price: number; sku?: string }[];
  callbackUrl: string;
  callbackUrlCancel?: string;
  paymentDueMinutes?: number;
}

export interface DokuPaymentResult {
  paymentUrl: string;
  tokenId: string;
  expiredDate: string;
  raw: unknown;
}

// Membuat payment link DOKU Checkout. Dipanggil dari server (API route)
// setelah order dibuat di database dengan status "pending".
export async function createDokuPayment(params: CreatePaymentParams): Promise<DokuPaymentResult> {
  const { clientId, secretKey } = getEnv();

  const body = {
    order: {
      amount: params.amount,
      invoice_number: params.invoiceNumber,
      currency: "IDR",
      callback_url: params.callbackUrl,
      callback_url_cancel: params.callbackUrlCancel || params.callbackUrl,
      auto_redirect: true,
      line_items: params.lineItems,
    },
    payment: {
      payment_due_date: params.paymentDueMinutes ?? 60,
    },
    customer: {
      name: params.customerName,
      email: params.customerEmail,
    },
  };

  const rawBody = JSON.stringify(body);
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString().split(".")[0] + "Z"; // ISO8601 tanpa milidetik
  const digest = sha256Base64(rawBody);
  const signatureRaw = buildSignatureString({
    clientId,
    requestId,
    timestamp,
    requestTarget: CHECKOUT_PATH,
    digest,
  });
  const signature = "HMACSHA256=" + hmacSha256Base64(signatureRaw, secretKey);

  const res = await fetch(`${DOKU_BASE_URL}${CHECKOUT_PATH}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Client-Id": clientId,
      "Request-Id": requestId,
      "Request-Timestamp": timestamp,
      Signature: signature,
    },
    body: rawBody,
  });

  const json = await res.json();

  if (!res.ok || !json?.response?.payment?.url) {
    throw new Error(
      `DOKU gagal membuat payment link: ${res.status} ${JSON.stringify(json)}`
    );
  }

  return {
    paymentUrl: json.response.payment.url,
    tokenId: json.response.payment.token_id,
    expiredDate: json.response.payment.expired_date,
    raw: json,
  };
}

// Verifikasi signature notifikasi (webhook) dari DOKU.
// requestTarget harus sama persis dengan path Notification URL yang
// didaftarkan di DOKU Back Office, mis. "/api/doku/webhook".
export function verifyDokuNotificationSignature(opts: {
  requestId: string;
  timestamp: string;
  requestTarget: string;
  rawBody: string;
  receivedSignature: string; // isi header "Signature", contoh: "HMACSHA256=xxxx"
}) {
  const { clientId, secretKey } = getEnv();
  const digest = sha256Base64(opts.rawBody);
  const signatureRaw = buildSignatureString({
    clientId,
    requestId: opts.requestId,
    timestamp: opts.timestamp,
    requestTarget: opts.requestTarget,
    digest,
  });
  const expected = "HMACSHA256=" + hmacSha256Base64(signatureRaw, secretKey);

  // Timing-safe compare
  const a = Buffer.from(expected);
  const b = Buffer.from(opts.receivedSignature || "");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
