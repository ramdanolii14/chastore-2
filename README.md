# AkunStore

Toko akun media sosial & lisensi digital. Login Google (better-auth),
stok akun disimpan di Supabase, pembayaran via DOKU Checkout, dan
kredensial akun otomatis dikirim ke email pembeli setelah pembayaran
sukses.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind
- Supabase (Postgres) — tabel produk, stok, pesanan
- better-auth — login Google, sesi disimpan di Postgres yang sama
- DOKU Checkout — payment gateway (VA, e-wallet, kartu, dst.)
- Resend — kirim email invoice + kredensial

## 1. Setup Supabase

1. Buat project baru di https://supabase.com.
2. Buka **SQL Editor**, jalankan isi `supabase/schema.sql`.
3. Ambil `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` dari
   **Project Settings > API** (pakai **service_role**, bukan anon key).
4. Ambil connection string di **Project Settings > Database >
   Connection string > Transaction pooler** (port `6543`,
   `?pgbouncer=true`) — dipakai better-auth, WAJIB pooler kalau deploy
   ke Vercel (serverless).

## 2. Setup Google OAuth

1. Buka https://console.cloud.google.com/apis/credentials.
2. Buat OAuth Client ID tipe **Web application**.
3. Authorized redirect URI:
   - Dev: `http://localhost:3000/api/auth/callback/google`
   - Prod: `https://domainkamu.com/api/auth/callback/google`
4. Salin Client ID & Client Secret ke `.env`.

## 3. Setup DOKU

1. Login ke DOKU Back Office (sandbox: https://sandbox.doku.com/bo/login).
2. Ambil `Client Id` & `Secret Key` di menu Integration.
3. Set **Notification URL** ke:
   `https://domainkamu.com/api/doku/webhook`
   (harus persis, path ini dipakai untuk verifikasi signature).
4. Isi `DOKU_CLIENT_ID`, `DOKU_SECRET_KEY` di `.env`. `DOKU_IS_PRODUCTION=false`
   selama masih sandbox, ganti `true` setelah akun production disetujui DOKU.
5. Test pembayaran pakai simulator sandbox:
   https://sandbox.doku.com/integration/simulator/

## 4. Setup Email (pakai akun Gmail, bukan domain custom)

Email dikirim lewat SMTP Gmail biasa pakai **App Password** (bukan
password akun Gmail kamu sehari-hari).

1. Aktifkan verifikasi 2 langkah dulu di akun Gmail yang mau dipakai:
   https://myaccount.google.com/security → **Verifikasi 2 Langkah**.
   App Password cuma bisa dibuat kalau ini sudah aktif.
2. Buka https://myaccount.google.com/apppasswords
3. Buat App Password baru (nama bebas, mis. "AkunStore"), Google akan
   kasih kode 16 karakter — itu yang dipakai, bukan password Gmail asli.
4. Isi di `.env.local`:
   - `GMAIL_USER` → alamat Gmail kamu, mis. `tokokamu@gmail.com`
   - `GMAIL_APP_PASSWORD` → kode 16 karakter tadi (boleh dengan/tanpa spasi)
   - `EMAIL_FROM_NAME` → nama pengirim yang muncul di inbox pembeli

Catatan: Gmail SMTP ada limit ± 500 email/hari untuk akun biasa —
lebih dari cukup untuk toko kecil-menengah. Kalau nanti volumenya
sudah tinggi, tinggal ganti isi `src/lib/email.ts` ke provider lain
(Resend, SendGrid, dll.) tanpa mengubah bagian lain aplikasi.

## 5. Environment Variables

Salin `.env.example` ke `.env.local`, isi semua nilainya.
`BETTER_AUTH_SECRET` generate dengan: `openssl rand -base64 32`.
`ADMIN_EMAILS` diisi email Google kamu (pemisah koma) — email di daftar
ini yang bisa akses `/admin`.

## 6. Migrasi tabel better-auth

Setelah `.env.local` terisi dan `supabase/schema.sql` sudah dijalankan:

```bash
npm install
npm run auth:migrate
```

Perintah ini membuat tabel `user`, `session`, `account`, `verification`
di database Supabase yang sama (dipakai better-auth).

## 7. Jalankan lokal

```bash
npm run dev
```

Buka http://localhost:3000. Untuk test webhook DOKU secara lokal,
tunnel dulu (mis. `ngrok http 3000`) dan set Notification URL DOKU ke
URL ngrok + `/api/doku/webhook`.

## 8. Cara pakai admin

1. Login pakai email yang ada di `ADMIN_EMAILS`.
2. Buka `/admin/products` → tambah produk (nama, harga, durasi default).
3. Buka `/admin/stock` → pilih produk, isi **email, password, durasi**
   akun yang mau distok (atau tempel banyak sekaligus lewat form bulk,
   format per baris: `email;password;catatan`).
4. Stok otomatis berkurang saat ada pembayaran sukses, dan kredensial
   otomatis terkirim ke email pembeli.

## 9. Deploy ke Vercel

1. Push repo ini ke GitHub.
2. Import project di https://vercel.com/new.
3. Isi semua environment variables dari `.env.example` (pakai URL
   production untuk `NEXT_PUBLIC_APP_URL` dan `BETTER_AUTH_URL`).
4. Deploy.
5. Update redirect URI Google OAuth & Notification URL DOKU ke domain
   production.
6. Jalankan `npm run auth:migrate` sekali dari lokal (dengan `DATABASE_URL`
   production) untuk membuat tabel auth di database production.

## Catatan penting

- Semua akses ke tabel Supabase (produk/stok/pesanan) lewat
  **service role key di server** — tidak pernah lewat browser. Jangan
  taruh `SUPABASE_SERVICE_ROLE_KEY` di kode client atau env
  `NEXT_PUBLIC_*`.
- Penjatahan stok saat pembayaran sukses pakai fungsi Postgres
  `assign_stock` dengan `FOR UPDATE SKIP LOCKED`, jadi aman walau ada
  beberapa pembayaran masuk bersamaan — tidak akan ada 1 akun terjual
  ke 2 pembeli.
- Kalau stok ternyata habis pas notifikasi masuk (race sangat jarang),
  order tidak otomatis ditandai "paid" — cek log server & tambah stok
  manual, lalu proses ulang manual (fitur retry otomatis belum ada,
  bisa ditambah kalau perlu).
- Webhook DOKU mengabaikan status `FAILED` sesuai rekomendasi resmi
  DOKU Checkout (customer masih bisa ganti metode bayar di halaman
  checkout mereka).
